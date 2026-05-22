import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { LoanPaymentInsert } from "@/lib/types";

// GET /api/loan-payments
// Query params: loan_id, from, to
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const loan_id = searchParams.get("loan_id");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = supabase
      .from("loan_payments")
      .select("*, loans(loan_code, member_id, members(name, member_code))", {
        count: "exact",
      })
      .order("payment_date", { ascending: false });

    if (loan_id) query = query.eq("loan_id", loan_id);
    if (from) query = query.gte("payment_date", from);
    if (to) query = query.lte("payment_date", to);

    const { data, error, count } = await query;
    if (error) return serverError(error);
    return okList(data ?? [], count ?? 0);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/loan-payments
// Handles cicilan dengan otomatis update saldo pinjaman
export async function POST(req: NextRequest) {
  try {
    const body: LoanPaymentInsert = await req.json();

    const {
      loan_id,
      amount,
      principal_paid,
      interest_paid,
      payment_date,
      officer,
    } = body;

    if (!loan_id || !amount) {
      return badRequest("Field loan_id dan amount wajib diisi");
    }

    if (amount <= 0) return badRequest("Jumlah pembayaran harus lebih dari 0");

    // Ambil data pinjaman
    const { data: loan, error: loanErr } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loan_id)
      .single();

    if (loanErr || !loan) return badRequest("Pinjaman tidak ditemukan");
    if (!["active", "approved"].includes(loan.status)) {
      return badRequest("Pinjaman tidak dalam status aktif");
    }
    if (loan.remaining_amount <= 0) {
      return badRequest("Pinjaman sudah lunas");
    }
    if (amount > loan.remaining_amount) {
      return badRequest(
        `Jumlah pembayaran melebihi sisa pinjaman (Rp ${loan.remaining_amount.toLocaleString("id-ID")})`,
      );
    }

    // Kalkulasi principal & interest jika tidak dikirim
    const interestPaid =
      interest_paid ??
      Math.round(
        (loan.amount * (loan.interest_rate / 100)) / loan.tenor_months,
      );
    const principalPaid = principal_paid ?? amount - interestPaid;
    const remainingAfter = loan.remaining_amount - principalPaid;

    // Insert payment record
    const { data: payment, error: payErr } = await supabase
      .from("loan_payments")
      .insert({
        loan_id,
        payment_date: payment_date ?? new Date().toISOString().split("T")[0],
        amount,
        principal_paid: principalPaid,
        interest_paid: interestPaid,
        remaining_after: Math.max(0, remainingAfter),
        officer: officer ?? null,
      })
      .select()
      .single();

    if (payErr) return serverError(payErr);

    // Update saldo pinjaman
    const isLunas = remainingAfter <= 0;
    const { error: loanUpdErr } = await supabase
      .from("loans")
      .update({
        paid_amount: loan.paid_amount + amount,
        remaining_amount: Math.max(0, remainingAfter),
        status: isLunas ? "lunas" : "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", loan_id);

    if (loanUpdErr)
      console.error("[Loan balance update] Failed:", loanUpdErr.message);

    return created(
      { ...payment, is_lunas: isLunas },
      isLunas ? "Pinjaman telah lunas!" : "Cicilan berhasil dicatat",
    );
  } catch (err) {
    return serverError(err);
  }
}
