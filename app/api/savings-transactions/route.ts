// app/api/savings-transactions/route.ts

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
  getUserProfile,
  requireAdminOrPengurus,
  parsePagination,
} from "@/lib/api-helpers";

// GET /api/savings-transactions
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth();
    const profile = await getUserProfile(authUser.id);

    const url = new URL(req.url);
    const { page, pageSize, from, to } = parsePagination(url);
    const accountId = url.searchParams.get("accountId");
    const memberId = url.searchParams.get("memberId");
    const transactionType = url.searchParams.get("transactionType");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    const supabase = await createSupabaseServerClient();
    let query = supabase.from("savings_transactions").select(
      `
        *,
        savings_account:savings_accounts(
          id, account_number, account_type
        ),
        member:members(id, member_number, full_name)
      `,
      { count: "exact" },
    );

    // Anggota hanya lihat transaksi miliknya
    if (profile?.role === "anggota") {
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", authUser.id)
        .single();
      if (!member)
        return successResponse({
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        });
      query = query.eq("member_id", member.id);
    }

    if (accountId) query = query.eq("savings_account_id", accountId);
    if (memberId) query = query.eq("member_id", memberId);
    if (transactionType) query = query.eq("transaction_type", transactionType);
    if (dateFrom) query = query.gte("transaction_date", dateFrom);
    if (dateTo) query = query.lte("transaction_date", dateTo);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return errorResponse(error.message);

    return successResponse({
      data,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/savings-transactions — Setoran atau Penarikan
export async function POST(req: NextRequest) {
  try {
    const { profile } = await requireAdminOrPengurus();

    const body = await req.json();
    const {
      savings_account_id,
      transaction_type,
      amount,
      description,
      transaction_date,
    } = body;

    if (!savings_account_id)
      return errorResponse("ID rekening wajib diisi", 400);
    if (!transaction_type)
      return errorResponse("Jenis transaksi wajib dipilih", 400);
    if (!["setoran", "penarikan"].includes(transaction_type)) {
      return errorResponse("Jenis transaksi tidak valid", 400);
    }
    if (!amount || amount <= 0)
      return errorResponse("Jumlah transaksi tidak valid", 400);

    const supabase = await createSupabaseServerClient();

    // Ambil data rekening + lock (pakai select for update via RPC atau supabase transaction)
    const { data: account } = await supabase
      .from("savings_accounts")
      .select("*, member:members(id, full_name, member_number)")
      .eq("id", savings_account_id)
      .single();

    if (!account) return errorResponse("Rekening tidak ditemukan", 404);
    if (account.status !== "active")
      return errorResponse("Rekening tidak aktif", 422);

    // Cek saldo cukup untuk penarikan
    if (transaction_type === "penarikan") {
      if (amount > account.balance) {
        return errorResponse(
          `Saldo tidak mencukupi. Saldo saat ini: Rp ${account.balance.toLocaleString("id-ID")}`,
          422,
        );
      }
      // Simpanan wajib & pokok: saldo minimum Rp 0
      if (account.account_type !== "sukarela") {
        return errorResponse(
          "Simpanan pokok dan wajib tidak dapat ditarik",
          422,
        );
      }
    }

    const balanceBefore = account.balance;
    const balanceAfter =
      transaction_type === "setoran"
        ? balanceBefore + amount
        : balanceBefore - amount;

    // Generate nomor referensi
    const refNumber = `TRX-${Date.now()}`;

    // Insert transaksi
    const { data: transaction, error: txnError } = await supabase
      .from("savings_transactions")
      .insert({
        savings_account_id,
        member_id: account.member_id,
        transaction_type,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description:
          description ||
          (transaction_type === "setoran" ? "Setoran" : "Penarikan"),
        reference_number: refNumber,
        transaction_date:
          transaction_date || new Date().toISOString().split("T")[0],
        created_by: profile.id,
      })
      .select()
      .single();

    if (txnError) return errorResponse(txnError.message);

    // Update saldo rekening
    const { error: balanceError } = await supabase
      .from("savings_accounts")
      .update({ balance: balanceAfter })
      .eq("id", savings_account_id);

    if (balanceError) return errorResponse(balanceError.message);

    // Catat financial transaction
    await supabase.from("financial_transactions").insert({
      transaction_type:
        transaction_type === "setoran" ? "pemasukan" : "pengeluaran",
      category: "simpanan",
      amount,
      description: `${transaction_type === "setoran" ? "Setoran" : "Penarikan"} simpanan ${account.account_type} - ${(account.member as { full_name: string }).full_name}`,
      reference_type: "savings_transaction",
      reference_id: transaction.id,
      transaction_date: transaction.transaction_date,
      created_by: profile.id,
    });

    return successResponse(
      { ...transaction, balance_after: balanceAfter },
      `${transaction_type === "setoran" ? "Setoran" : "Penarikan"} berhasil dicatat`,
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
