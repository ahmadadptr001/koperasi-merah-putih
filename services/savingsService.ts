// services/savingsService.ts
import { createFinancialTransaction } from "./financialService";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildReferenceNumber } from "@/lib/reference-number";
import type {
  SavingsAccount,
  SavingsAccountInsert,
  SavingsAccountUpdate,
  SavingsTransaction,
  SavingsTransactionInsert,
  SavingsAccountType,
  ApiResponse,
  ApiListResponse,
} from "@/lib/types";

/** Batas percobaan ulang saat nomor rekening bentrok dengan unique constraint */
const MAX_NUMBER_RETRY = 5;

/** Kode error Postgres untuk unique_violation */
const PG_UNIQUE_VIOLATION = "23505";

// ════════════════════════════════════════════════════════
// SAVINGS ACCOUNTS
// ════════════════════════════════════════════════════════

export async function getSavingsAccounts(params?: {
  member_id?: string;
  account_type?: SavingsAccountType;
  status?: SavingsAccount["status"];
  user_id?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiListResponse<SavingsAccount>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("savings_accounts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params?.member_id) query = query.eq("member_id", params.member_id);
  if (params?.account_type)
    query = query.eq("account_type", params.account_type);
  if (params?.status) query = query.eq("status", params.status);

  // savings_accounts tidak punya kolom user_id — tautannya lewat members.
  // Parameter ini sudah lama dikirim oleh halaman Simpanan dan Laporan tetapi
  // diabaikan di sini, sehingga admin/pengurus melihat rekening SEMUA anggota
  // padahal yang diminta hanya rekening miliknya sendiri.
  if (params?.user_id) {
    const { data: ownMembers, error: memberErr } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", params.user_id);

    if (memberErr) return { data: [], total: 0, error: memberErr.message };

    const memberIds = (ownMembers ?? []).map((m) => m.id);
    if (memberIds.length === 0) return { data: [], total: 0, error: null };

    query = query.in("member_id", memberIds);
  }

  if (params?.offset) {
    const limit = params.limit ?? 10;
    query = query.range(params.offset, params.offset + limit - 1);
  } else if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error, count } = await query;

  if (error) return { data: [], total: 0, error: error.message };
  return {
    data: (data ?? []) as SavingsAccount[],
    total: count ?? 0,
    error: null,
  };
}

export async function getSavingsAccountById(
  id: string,
): Promise<ApiResponse<SavingsAccount>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("savings_accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as SavingsAccount, error: null };
}

export async function createSavingsAccount(
  payload: Omit<SavingsAccountInsert, "account_number">,
): Promise<ApiResponse<SavingsAccount>> {
  const supabase = await createSupabaseServerClient();

  // Nomor rekening dibuat lewat RPC lalu dipakai pada INSERT terpisah, jadi
  // dua pembuatan rekening berbarengan bisa mendapat nomor yang sama. Coba
  // ulang beberapa kali saat unique constraint menolak.
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= MAX_NUMBER_RETRY; attempt++) {
    const { data: accountNumber, error: genError } = await supabase.rpc(
      "generate_savings_account_number",
      { p_type: payload.account_type },
    );

    if (genError) return { data: null, error: genError.message };

    const { data, error } = await supabase
      .from("savings_accounts")
      .insert({ ...payload, account_number: accountNumber as string })
      .select()
      .single();

    if (!error) {
      return {
        data: data as SavingsAccount,
        error: null,
        message: "Rekening simpanan berhasil dibuat",
      };
    }

    lastError = error.message;

    const isNumberClash =
      error.code === PG_UNIQUE_VIOLATION &&
      error.message.includes("account_number");
    if (!isNumberClash) return { data: null, error: error.message };
  }

  return {
    data: null,
    error:
      "Nomor rekening sedang dipakai proses lain. Silakan coba simpan kembali." +
      (lastError ? ` (${lastError})` : ""),
  };
}

export async function updateSavingsAccount(
  id: string,
  payload: SavingsAccountUpdate,
): Promise<ApiResponse<SavingsAccount>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("savings_accounts")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return {
    data: data as SavingsAccount,
    error: null,
    message: "Rekening berhasil diperbarui",
  };
}

// ════════════════════════════════════════════════════════
// SAVINGS TRANSACTIONS
// ════════════════════════════════════════════════════════

export async function getSavingsTransactions(params?: {
  savings_account_id?: string;
  member_id?: string;
  transaction_type?: SavingsTransaction["transaction_type"];
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiListResponse<SavingsTransaction>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("savings_transactions")
    .select("*", { count: "exact" })
    .order("transaction_date", { ascending: false });

  if (params?.savings_account_id)
    query = query.eq("savings_account_id", params.savings_account_id);
  if (params?.member_id) query = query.eq("member_id", params.member_id);
  if (params?.transaction_type)
    query = query.eq("transaction_type", params.transaction_type);
  if (params?.from_date)
    query = query.gte("transaction_date", params.from_date);
  if (params?.to_date) query = query.lte("transaction_date", params.to_date);
  // range() sudah membatasi jumlah baris, jadi cukup salah satu saja.
  // Sebelumnya offset diabaikan bila limit tidak dikirim → paginasi macet.
  if (params?.offset) {
    const limit = params.limit ?? 10;
    query = query.range(params.offset, params.offset + limit - 1);
  } else if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error, count } = await query;
  if (error) return { data: [], total: 0, error: error.message };
  return {
    data: (data ?? []) as SavingsTransaction[],
    total: count ?? 0,
    error: null,
  };
}

export async function getSavingsTransactionById(
  id: string,
): Promise<ApiResponse<SavingsTransaction>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("savings_transactions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as SavingsTransaction, error: null };
}

/**
 * Setor / Tarik simpanan.
 * Mengupdate balance savings_account secara atomik di dalam transaksi DB.
 */
export async function createSavingsTransaction(
  payload: Omit<
    SavingsTransactionInsert,
    "balance_before" | "balance_after" | "reference_number"
  >,
): Promise<ApiResponse<SavingsTransaction>> {
  const supabase = await createSupabaseServerClient();

  // 1. Ambil balance sekarang dan account_type
  const { data: account, error: accErr } = await supabase
    .from("savings_accounts")
    .select("balance, status, account_type")
    .eq("id", payload.savings_account_id)
    .single();

  if (accErr) return { data: null, error: accErr.message };
  if (!account) return { data: null, error: "Rekening tidak ditemukan" };
  if (account.status !== "active")
    return { data: null, error: "Rekening tidak aktif" };

  // Nominal divalidasi di sini agar pesannya jelas, bukan sebagai error
  // constraint mentah dari Postgres (CHECK amount > 0).
  if (!Number.isFinite(payload.amount) || payload.amount <= 0)
    return { data: null, error: "Nominal transaksi harus lebih dari 0" };

  // ── Validasi penarikan hanya untuk sukarela ──────────────────────────────
  if (payload.transaction_type === "penarikan") {
    if (account.account_type !== "sukarela") {
      return {
        data: null,
        error: "Penarikan hanya diperbolehkan untuk Simpanan Sukarela",
      };
    }
  }

  const balanceBefore = Number(account.balance);

  // 2. Validasi saldo cukup untuk penarikan
  if (payload.transaction_type === "penarikan") {
    if (payload.amount > balanceBefore) {
      return { data: null, error: "Saldo tidak mencukupi" };
    }
  }

  const balanceAfter =
    payload.transaction_type === "setoran"
      ? balanceBefore + payload.amount
      : balanceBefore - payload.amount;

  // 3. Generate reference number
  // Date.now() saja tidak cukup: dua transaksi dalam milidetik yang sama
  // menghasilkan nomor identik dan ditolak unique constraint.
  const refNumber = buildReferenceNumber("TXN");

  // 4. Insert transaksi
  const { data: txn, error: txnErr } = await supabase
    .from("savings_transactions")
    .insert({
      ...payload,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reference_number: refNumber,
    })
    .select()
    .single();

  if (txnErr) return { data: null, error: txnErr.message };

  // 5. Update balance di savings_account
  const { error: updateErr } = await supabase
    .from("savings_accounts")
    .update({ balance: balanceAfter })
    .eq("id", payload.savings_account_id);

  if (updateErr) {
    // Rollback: mutasi sudah tercatat tapi saldo gagal diperbarui. Tanpa ini
    // buku transaksi dan saldo rekening jadi tidak sinkron secara permanen.
    await supabase.from("savings_transactions").delete().eq("id", txn.id);
    return { data: null, error: updateErr.message };
  }

  // ─── TAMBAHAN: Catat ke financial_transactions ──────────────────────────
  await createFinancialTransaction({
    transaction_type:
      payload.transaction_type === "setoran" ? "pemasukan" : "pengeluaran",
    category:
      payload.transaction_type === "setoran"
        ? "simpanan"
        : "penarikan_simpanan",
    amount: payload.amount,
    description:
      payload.description ??
      `${payload.transaction_type === "setoran" ? "Setoran" : "Penarikan"} simpanan`,
    reference_type: "savings_transaction",
    reference_id: txn.id,
    transaction_date:
      payload.transaction_date ?? new Date().toISOString().slice(0, 10),
    created_by: payload.created_by ?? null,
  });

  return {
    data: txn as SavingsTransaction,
    error: null,
    message: `${payload.transaction_type === "setoran" ? "Setoran" : "Penarikan"} berhasil`,
  };
}

export async function deleteSavingsAccount(
  id: string,
): Promise<ApiResponse<null>> {
  const supabase = await createSupabaseServerClient();

  // 1. Ambil id mutasi lebih dulu — dibutuhkan untuk membersihkan
  //    financial_transactions, dan harus dibaca SEBELUM barisnya dihapus.
  const { data: txnIds, error: txnIdsErr } = await supabase
    .from("savings_transactions")
    .select("id")
    .eq("savings_account_id", id);

  if (txnIdsErr) return { data: null, error: txnIdsErr.message };

  // 2. Hapus catatan keuangan yang menunjuk mutasi tersebut. Sebelumnya baris
  //    ini tertinggal sebagai data yatim dan tetap terhitung di laporan
  //    keuangan padahal rekeningnya sudah dihapus.
  if (txnIds && txnIds.length > 0) {
    const { error: finErr } = await supabase
      .from("financial_transactions")
      .delete()
      .eq("reference_type", "savings_transaction")
      .in(
        "reference_id",
        txnIds.map((t) => t.id),
      );

    if (finErr) return { data: null, error: finErr.message };
  }

  // 3. Hapus semua transaksi terkait (untuk menjaga integritas data)
  const { error: txnErr } = await supabase
    .from("savings_transactions")
    .delete()
    .eq("savings_account_id", id);

  if (txnErr) return { data: null, error: txnErr.message };

  // 4. Hapus rekening (saldo akan ikut terhapus karena tidak ada validasi)
  const { error } = await supabase
    .from("savings_accounts")
    .delete()
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  return {
    data: null,
    error: null,
    message: "Rekening berhasil dihapus",
  };
}
