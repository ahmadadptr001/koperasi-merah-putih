// app/api/loans/route.ts

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
import type { LoanInsert } from "@/types/database";

// Hitung detail angsuran (flat rate)
function calculateLoanDetails(
  amount: number,
  interestRate: number,
  termMonths: number,
) {
  const monthlyInterest = amount * (interestRate / 100);
  const monthlyPrincipal = amount / termMonths;
  const monthlyPayment = monthlyPrincipal + monthlyInterest;
  const totalInterest = monthlyInterest * termMonths;
  const totalPayment = amount + totalInterest;
  return {
    monthly_payment: Math.round(monthlyPayment),
    total_interest: Math.round(totalInterest),
    total_payment: Math.round(totalPayment),
  };
}

// GET /api/loans
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth();
    const profile = await getUserProfile(authUser.id);

    const url = new URL(req.url);
    const { page, pageSize, from, to } = parsePagination(url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status");
    const memberId = url.searchParams.get("memberId");
    const sortBy = url.searchParams.get("sortBy") || "created_at";
    const sortOrder = url.searchParams.get("sortOrder") !== "asc";

    const supabase = await createSupabaseServerClient();

    let query = supabase.from("loans").select(
      `
        *,
        member:members(id, member_number, full_name, phone),
        approver:users!loans_approved_by_fkey(id, full_name)
      `,
      { count: "exact" },
    );

    // Anggota hanya lihat pinjaman miliknya
    if (profile?.role === "anggota") {
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", authUser.id)
        .single();
      if (member) query = query.eq("member_id", member.id);
      else
        return successResponse({
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        });
    }

    if (memberId) query = query.eq("member_id", memberId);
    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(
        `loan_number.ilike.%${search}%,purpose.ilike.%${search}%`,
      );
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

// POST /api/loans  — Pengajuan pinjaman baru
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth();
    const profile = await getUserProfile(authUser.id);
    if (!profile) return errorResponse("Profil pengguna tidak ditemukan", 404);

    const body = await req.json();
    const { member_id, amount, term_months, purpose, collateral, notes } = body;

    // Validasi
    if (!member_id) return errorResponse("ID anggota wajib diisi", 400);
    if (!amount || amount <= 0)
      return errorResponse("Jumlah pinjaman tidak valid", 400);
    if (!term_months || term_months <= 0)
      return errorResponse("Jangka waktu tidak valid", 400);

    const supabase = await createSupabaseServerClient();

    // Verifikasi anggota ada dan aktif
    const { data: member } = await supabase
      .from("members")
      .select("id, status, full_name")
      .eq("id", member_id)
      .single();

    if (!member) return errorResponse("Anggota tidak ditemukan", 404);
    if (member.status !== "active")
      return errorResponse("Anggota tidak aktif", 422);

    // Cek apakah sudah ada pinjaman aktif/pending
    const { data: activeLoan } = await supabase
      .from("loans")
      .select("id, loan_number")
      .eq("member_id", member_id)
      .in("status", ["pending", "approved", "active"])
      .single();

    if (activeLoan) {
      return errorResponse(
        `Anggota masih memiliki pinjaman aktif (${activeLoan.loan_number})`,
        422,
      );
    }

    // Hitung detail pinjaman
    const interest_rate = parseFloat(body.interest_rate) || 1.5;
    const loanCalc = calculateLoanDetails(amount, interest_rate, term_months);

    // Generate nomor pinjaman
    const { data: loanNumber } = await supabase.rpc("generate_loan_number");

    const loanData: LoanInsert = {
      member_id,
      loan_number: loanNumber as string,
      amount,
      interest_rate,
      term_months,
      monthly_payment: loanCalc.monthly_payment,
      total_interest: loanCalc.total_interest,
      total_payment: loanCalc.total_payment,
      purpose,
      collateral,
      notes,
      status: "pending",
    };

    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .insert(loanData)
      .select(
        `
        *,
        member:members(id, member_number, full_name, phone)
      `,
      )
      .single();

    if (loanError) return errorResponse(loanError.message);

    // Buat approval otomatis
    await supabase.from("approvals").insert({
      reference_type: "loan",
      reference_id: loan.id,
      title: `Pengajuan Pinjaman ${loanNumber} - ${member.full_name}`,
      description: `Jumlah: Rp ${amount.toLocaleString("id-ID")}, Jangka: ${term_months} bulan`,
      requested_by: authUser.id,
    });

    return successResponse(loan, "Pengajuan pinjaman berhasil disubmit", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
