// app/api/loan-payments/route.ts

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

// GET /api/loan-payments
// Query: page, pageSize, loanId, memberId, status
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth();
    const profile = await getUserProfile(authUser.id);

    const url = new URL(req.url);
    const { page, pageSize, from, to } = parsePagination(url);
    const loanId = url.searchParams.get("loanId");
    const status = url.searchParams.get("status");
    const memberId = url.searchParams.get("memberId");
    const sortBy = url.searchParams.get("sortBy") || "due_date";
    const sortOrder = url.searchParams.get("sortOrder") !== "asc";

    const supabase = await createSupabaseServerClient();

    let query = supabase.from("loan_payments").select(
      `
        *,
        loan:loans(
          id, loan_number, amount, member_id,
          member:members(id, member_number, full_name, phone)
        )
      `,
      { count: "exact" },
    );

    if (loanId) query = query.eq("loan_id", loanId);
    if (status) query = query.eq("status", status);
    if (memberId) {
      // Filter via join
      query = query.eq("loan.member_id", memberId);
    }

    // Anggota hanya lihat angsuran miliknya
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
      query = query.eq("loan.member_id", member.id);
    }

    const { data, error, count } = await query
      .order(sortBy, { ascending: !sortOrder })
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

// POST /api/loan-payments — Catat pembayaran angsuran
export async function POST(req: NextRequest) {
  try {
    const { profile } = await requireAdminOrPengurus();

    const body = await req.json();
    const { loan_payment_id, paid_amount, payment_date, notes } = body;

    if (!loan_payment_id) return errorResponse("ID angsuran wajib diisi", 400);
    if (!paid_amount || paid_amount <= 0)
      return errorResponse("Jumlah pembayaran tidak valid", 400);

    const supabase = await createSupabaseServerClient();

    // Ambil data angsuran + pinjaman
    const { data: payment } = await supabase
      .from("loan_payments")
      .select(`*, loan:loans(*)`)
      .eq("id", loan_payment_id)
      .single();

    if (!payment) return errorResponse("Data angsuran tidak ditemukan", 404);
    if (payment.status === "paid")
      return errorResponse("Angsuran ini sudah lunas", 422);

    const today = payment_date || new Date().toISOString().split("T")[0];

    // Hitung denda jika telat
    let penalty = 0;
    if (new Date(today) > new Date(payment.due_date)) {
      const daysLate = Math.floor(
        (new Date(today).getTime() - new Date(payment.due_date).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      penalty = Math.round(payment.total_amount * 0.001 * daysLate); // 0.1% per hari
    }

    const totalWithPenalty = payment.total_amount + penalty;
    const newStatus = paid_amount >= totalWithPenalty ? "paid" : "partial";

    // Update pembayaran
    const { data: updatedPayment, error: updateError } = await supabase
      .from("loan_payments")
      .update({
        payment_date,
        paid_amount,
        penalty,
        total_amount: totalWithPenalty,
        status: newStatus,
        notes,
      })
      .eq("id", loan_payment_id)
      .select(
        "*, loan:loans(id, loan_number, member_id, paid_amount, total_payment, status)",
      )
      .single();

    if (updateError) return errorResponse(updateError.message);

    // Update total paid_amount di tabel loans
    const loan = updatedPayment.loan as {
      id: string;
      paid_amount: number;
      total_payment: number;
      loan_number: string;
      member_id: string;
    };
    const newLoanPaidAmount = (loan.paid_amount || 0) + paid_amount;
    let loanStatus = "active";
    if (newLoanPaidAmount >= loan.total_payment) loanStatus = "completed";

    await supabase
      .from("loans")
      .update({
        paid_amount: newLoanPaidAmount,
        status: loanStatus,
      })
      .eq("id", payment.loan_id);

    // Catat transaksi keuangan
    await supabase.from("financial_transactions").insert({
      transaction_type: "pemasukan",
      category: "pinjaman",
      amount: paid_amount,
      description: `Pembayaran angsuran ke-${payment.installment_no} - ${loan.loan_number}`,
      reference_type: "loan_payment",
      reference_id: loan_payment_id,
      transaction_date: today,
      created_by: profile.id,
    });

    return successResponse(
      updatedPayment,
      `Angsuran ke-${payment.installment_no} berhasil dicatat${loanStatus === "completed" ? ". PINJAMAN LUNAS!" : ""}`,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
