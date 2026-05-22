import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { SavingsTransactionInsert } from "@/lib/types";

// GET /api/savings-transactions
// Query params: member_id, savings_account_id, transaction_type, status, from, to
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const member_id = searchParams.get("member_id");
    const savings_account_id = searchParams.get("savings_account_id");
    const transaction_type = searchParams.get("transaction_type");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = supabase
      .from("savings_transactions")
      .select("*, members(member_code, name)", { count: "exact" })
      .order("transaction_date", { ascending: false });

    if (member_id) query = query.eq("member_id", member_id);
    if (savings_account_id)
      query = query.eq("savings_account_id", savings_account_id);
    if (transaction_type)
      query = query.eq("transaction_type", transaction_type);
    if (status) query = query.eq("status", status);
    if (from) query = query.gte("transaction_date", from);
    if (to) query = query.lte("transaction_date", to);

    const { data, error, count } = await query;
    if (error) return serverError(error);
    return okList(data ?? [], count ?? 0);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/savings-transactions
// Handles setor & tarik dengan update otomatis ke savings_accounts
export async function POST(req: NextRequest) {
  try {
    const body: SavingsTransactionInsert = await req.json();

    const {
      member_id,
      savings_account_id,
      transaction_type,
      amount,
      payment_method,
      officer,
      note,
      transaction_date,
      transaction_code,
    } = body;

    if (
      !member_id ||
      !savings_account_id ||
      !transaction_type ||
      !amount ||
      !payment_method
    ) {
      return badRequest(
        "Field member_id, savings_account_id, transaction_type, amount, dan payment_method wajib diisi",
      );
    }

    if (amount <= 0) return badRequest("Jumlah transaksi harus lebih dari 0");

    // Ambil saldo rekening saat ini
    const { data: account, error: accErr } = await supabase
      .from("savings_accounts")
      .select("balance_pokok, balance_wajib, balance_sukarela, total_balance")
      .eq("id", savings_account_id)
      .single();

    if (accErr || !account)
      return badRequest("Rekening simpanan tidak ditemukan");

    // Validasi saldo cukup untuk penarikan
    if (transaction_type === "tarik" && account.total_balance < amount) {
      return badRequest(
        `Saldo tidak mencukupi. Saldo tersedia: Rp ${account.total_balance.toLocaleString("id-ID")}`,
      );
    }

    // Hitung balance_after (menggunakan sukarela sebagai basis utama transaksi)
    const balanceAfter =
      transaction_type === "setor"
        ? account.total_balance + amount
        : account.total_balance - amount;

    // Insert transaksi
    const { data: trx, error: trxErr } = await supabase
      .from("savings_transactions")
      .insert({
        transaction_code: transaction_code ?? generateTrxCode("ST"),
        member_id,
        savings_account_id,
        transaction_date:
          transaction_date ?? new Date().toISOString().split("T")[0],
        transaction_type,
        amount,
        balance_after: balanceAfter,
        payment_method,
        status: "success",
        officer: officer ?? null,
        note: note ?? null,
      })
      .select()
      .single();

    if (trxErr) return serverError(trxErr);

    // Update saldo rekening
    const newSukarela =
      transaction_type === "setor"
        ? account.balance_sukarela + amount
        : account.balance_sukarela - amount;

    const { error: updErr } = await supabase
      .from("savings_accounts")
      .update({
        balance_sukarela: Math.max(0, newSukarela),
        total_balance: balanceAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", savings_account_id);

    if (updErr)
      console.error("[Savings balance update] Failed:", updErr.message);

    return created(trx, `Transaksi ${transaction_type} berhasil`);
  } catch (err) {
    return serverError(err);
  }
}

function generateTrxCode(prefix: string): string {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}-${yyyymm}-${rand}`;
}
