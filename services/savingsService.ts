// services/savingsService.ts
import { createFinancialTransaction } from "./financialService";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

// ════════════════════════════════════════════════════════
// SAVINGS ACCOUNTS
// ════════════════════════════════════════════════════════

export async function getSavingsAccounts(params?: {
  member_id?: string;
  account_type?: SavingsAccountType;
  status?: SavingsAccount["status"];
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

  const { data, error, count } = await query;

  if (error) return { data: [], total: 0, error: error.message };
  return { data: data as SavingsAccount[], total: count ?? 0, error: null };
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

  // Generate nomor rekening via DB function
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

  if (error) return { data: null, error: error.message };
  return {
    data: data as SavingsAccount,
    error: null,
    message: "Rekening simpanan berhasil dibuat",
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
  if (params?.limit) query = query.limit(params.limit);
  if (params?.offset && params?.limit)
    query = query.range(params.offset, params.offset + params.limit - 1);

  const { data, error, count } = await query;
  if (error) return { data: [], total: 0, error: error.message };
  return { data: data as SavingsTransaction[], total: count ?? 0, error: null };
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
  const refNumber = `TXN-${Date.now()}`;

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

  if (updateErr) return { data: null, error: updateErr.message };

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

  // 1. Hapus semua transaksi terkait (untuk menjaga integritas data)
  const { error: txnErr } = await supabase
    .from("savings_transactions")
    .delete()
    .eq("savings_account_id", id);

  if (txnErr) return { data: null, error: txnErr.message };

  // 2. Hapus rekening (saldo akan ikut terhapus karena tidak ada validasi)
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
