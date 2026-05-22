// app/api/loans/[id]/route.ts

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  handleApiError,
  requireAuth,
  getUserProfile,
  requireAdminOrPengurus,
} from "@/lib/api-helpers";

// GET /api/loans/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authUser = await requireAuth();

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("loans")
      .select(
        `
        *,
        member:members(
          id, member_number, full_name, phone, address,
          savings_accounts(id, account_type, balance, status)
        ),
        approver:users!loans_approved_by_fkey(id, full_name),
        loan_payments(
          id, installment_no, due_date, payment_date,
          principal, interest, penalty, total_amount, paid_amount, status
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error || !data) return notFoundResponse("Pinjaman");

    // Anggota biasa hanya boleh lihat pinjaman miliknya
    const profile = await getUserProfile(authUser.id);
    if (profile?.role === "anggota") {
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", authUser.id)
        .single();
      if (!member || data.member_id !== member.id) {
        return errorResponse("Akses ditolak", 403);
      }
    }

    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}

// PUT /api/loans/[id]
// Digunakan untuk: approve, reject, update status, catat pencairan
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { profile } = await requireAdminOrPengurus();

    const body = await req.json();
    const supabase = await createSupabaseServerClient();

    // Ambil data pinjaman saat ini
    const { data: currentLoan } = await supabase
      .from("loans")
      .select("*")
      .eq("id", id)
      .single();
    if (!currentLoan) return notFoundResponse("Pinjaman");

    // Handle aksi khusus berdasarkan field `action`
    const action = body.action as string | undefined;

    if (action === "approve") {
      // Approve pinjaman
      if (!["pending"].includes(currentLoan.status)) {
        return errorResponse(
          `Pinjaman dengan status ${currentLoan.status} tidak dapat disetujui`,
          422,
        );
      }

      const { data, error } = await supabase
        .from("loans")
        .update({
          status: "approved",
          approved_by: profile.id,
          approved_date: new Date().toISOString().split("T")[0],
          notes: body.notes || currentLoan.notes,
        })
        .eq("id", id)
        .select("*, member:members(id, full_name, member_number)")
        .single();

      if (error) return errorResponse(error.message);

      // Update approval record
      await supabase
        .from("approvals")
        .update({
          status: "approved",
          reviewed_by: profile.id,
          review_notes: body.review_notes || body.notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("reference_type", "loan")
        .eq("reference_id", id);

      return successResponse(data, "Pinjaman berhasil disetujui");
    }

    if (action === "reject") {
      if (!["pending", "approved"].includes(currentLoan.status)) {
        return errorResponse(
          `Pinjaman dengan status ${currentLoan.status} tidak dapat ditolak`,
          422,
        );
      }

      const { data, error } = await supabase
        .from("loans")
        .update({
          status: "rejected",
          approved_by: profile.id,
          notes: body.notes || currentLoan.notes,
        })
        .eq("id", id)
        .select("*, member:members(id, full_name, member_number)")
        .single();

      if (error) return errorResponse(error.message);

      await supabase
        .from("approvals")
        .update({
          status: "rejected",
          reviewed_by: profile.id,
          review_notes: body.review_notes || body.notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("reference_type", "loan")
        .eq("reference_id", id);

      return successResponse(data, "Pinjaman berhasil ditolak");
    }

    if (action === "disburse") {
      // Cairkan pinjaman: ubah ke active, buat jadwal angsuran
      if (currentLoan.status !== "approved") {
        return errorResponse(
          "Hanya pinjaman yang sudah disetujui yang dapat dicairkan",
          422,
        );
      }

      const disbursementDate =
        body.disbursement_date || new Date().toISOString().split("T")[0];
      const dueDate = new Date(disbursementDate);
      dueDate.setMonth(dueDate.getMonth() + currentLoan.term_months);

      const { data, error } = await supabase
        .from("loans")
        .update({
          status: "active",
          disbursement_date: disbursementDate,
          due_date: dueDate.toISOString().split("T")[0],
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) return errorResponse(error.message);

      // Generate jadwal angsuran
      const payments = [];
      const monthlyPrincipal = Math.round(
        currentLoan.amount / currentLoan.term_months,
      );
      const monthlyInterest = Math.round(
        currentLoan.amount * (currentLoan.interest_rate / 100),
      );

      for (let i = 1; i <= currentLoan.term_months; i++) {
        const paymentDue = new Date(disbursementDate);
        paymentDue.setMonth(paymentDue.getMonth() + i);
        payments.push({
          loan_id: id,
          installment_no: i,
          due_date: paymentDue.toISOString().split("T")[0],
          principal: monthlyPrincipal,
          interest: monthlyInterest,
          penalty: 0,
          total_amount: monthlyPrincipal + monthlyInterest,
          status: "pending",
          created_by: profile.id,
        });
      }

      const { error: paymentError } = await supabase
        .from("loan_payments")
        .insert(payments);
      if (paymentError) return errorResponse(paymentError.message);

      // Catat ke financial_transactions
      await supabase.from("financial_transactions").insert({
        transaction_type: "pengeluaran",
        category: "pinjaman",
        amount: currentLoan.amount,
        description: `Pencairan pinjaman ${currentLoan.loan_number}`,
        reference_type: "loan",
        reference_id: id,
        transaction_date: disbursementDate,
        created_by: profile.id,
      });

      return successResponse(
        data,
        `Pinjaman berhasil dicairkan. ${currentLoan.term_months} jadwal angsuran dibuat.`,
      );
    }

    // Update umum
    const allowedFields = ["notes", "purpose", "collateral"];
    const updateData = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowedFields.includes(k)),
    );

    const { data, error } = await supabase
      .from("loans")
      .update(updateData)
      .eq("id", id)
      .select("*, member:members(id, full_name, member_number)")
      .single();

    if (error) return errorResponse(error.message);

    return successResponse(data, "Pinjaman berhasil diperbarui");
  } catch (err) {
    return handleApiError(err);
  }
}
