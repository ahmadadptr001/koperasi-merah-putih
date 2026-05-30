import { createFinancialTransaction } from "./financialService"; // services/loanService.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Loan,
  LoanInsert,
  LoanUpdate,
  LoanPayment,
  LoanPaymentInsert,
  LoanPaymentUpdate,
  ApiResponse,
  ApiListResponse,
} from "@/lib/types";

// ════════════════════════════════════════════════════════
// LOANS
// ════════════════════════════════════════════════════════

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

export async function getLoans(params?: {
  member_id?: string;
  status?: Loan["status"];
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiListResponse<Loan>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("loans")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params?.member_id) query = query.eq("member_id", params.member_id);
  if (params?.status) query = query.eq("status", params.status);
  if (params?.search)
    query = query.or(
      `loan_number.ilike.%${params.search}%,purpose.ilike.%${params.search}%`,
    );
  if (params?.limit) query = query.limit(params.limit);
  if (params?.offset && params?.limit)
    query = query.range(params.offset, params.offset + params.limit - 1);

  const { data, error, count } = await query;
  if (error) return { data: [], total: 0, error: error.message };
  return { data: data as Loan[], total: count ?? 0, error: null };
}

export async function getLoanById(id: string): Promise<ApiResponse<Loan>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Loan, error: null };
}

/**
 * Hitung field turunan sebelum insert:
 * monthly_payment, total_interest, total_payment
 */
function calcLoanFields(
  amount: number,
  interest_rate: number,
  term_months: number,
) {
  const monthlyInterest = amount * (interest_rate / 100);
  const monthlyPrincipal = amount / term_months;
  const monthlyPayment = Math.round(monthlyPrincipal + monthlyInterest);
  const totalInterest = Math.round(monthlyInterest * term_months);
  const totalPayment = amount + totalInterest;
  return {
    monthly_payment: monthlyPayment,
    total_interest: totalInterest,
    total_payment: totalPayment,
  };
}

export async function createLoan(
  payload: Omit<
    LoanInsert,
    | "loan_number"
    | "monthly_payment"
    | "total_interest"
    | "total_payment"
    | "paid_amount"
  >,
): Promise<ApiResponse<Loan>> {
  const supabase = await createSupabaseServerClient();

  const { data: loanNumber, error: genError } = await supabase.rpc(
    "generate_loan_number",
  );
  if (genError) return { data: null, error: genError.message };

  const derived = calcLoanFields(
    payload.amount,
    payload.interest_rate,
    payload.term_months,
  );

  // pastikan requested_by diisi (jika tidak ada, gunakan user yang login)
  let requestedBy = payload.requested_by;
  if (!requestedBy) {
    // Ambil user dari session (harus ada karena route API sudah auth)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    requestedBy = user?.id ?? null;
  }

  const { data, error } = await supabase
    .from("loans")
    .insert({
      ...payload,
      loan_number: loanNumber as string,
      ...derived,
      paid_amount: 0,
      requested_by: requestedBy,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return {
    data: data as Loan,
    error: null,
    message: "Pinjaman berhasil diajukan",
  };
}

export async function updateLoan(
  id: string,
  payload: LoanUpdate,
): Promise<ApiResponse<Loan>> {
  const supabase = await createSupabaseServerClient();

  // Hapus field yang tidak boleh di-update jika perlu
  const updatePayload = { ...payload };
  // requested_by bisa diupdate jika diperlukan, tapi biasanya tidak

  const { data, error } = await supabase
    .from("loans")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return {
    data: data as Loan,
    error: null,
    message: "Pinjaman berhasil diperbarui",
  };
}

/**
 * Approve pinjaman: ubah status → 'approved', set approved_by & approved_date
 */
export async function approveLoan(
  id: string,
  approvedBy: string,
  notes?: string,
): Promise<ApiResponse<Loan>> {
  return updateLoan(id, {
    status: "approved",
    approved_by: approvedBy,
    approved_date: new Date().toISOString().slice(0, 10),
    notes,
  });
}

/**
 * Cairkan pinjaman: ubah status → 'active', set disbursement_date & due_date
 */
export async function disburseLoan(
  id: string,
  disbursementDate: string,
  termMonths: number,
): Promise<ApiResponse<Loan>> {
  // Hitung due_date = disbursementDate + term_months
  const due = new Date(disbursementDate);
  due.setMonth(due.getMonth() + termMonths);

  // Update loan status
  const updateResult = await updateLoan(id, {
    status: "active",
    disbursement_date: disbursementDate,
    due_date: due.toISOString().slice(0, 10),
  });

  if (updateResult.error) return updateResult;

  // Generate jadwal angsuran
  const scheduleResult = await createLoanSchedule(
    id,
    disbursementDate,
    termMonths,
  );
  if (scheduleResult.error) {
    // Rollback loan status jika schedule gagal
    await updateLoan(id, { status: "approved" });
    return { data: null, error: scheduleResult.error };
  }
  // ───  Catat ke financial_transactions ──────────────────────────
  if (updateResult.data) {
    const loan = updateResult.data;
    await createFinancialTransaction({
      transaction_type: "pengeluaran",
      category: "pencairan_pinjaman",
      amount: loan.amount,
      description: `Pencairan pinjaman ${loan.loan_number} untuk anggota`,
      reference_type: "loan",
      reference_id: loan.id,
      transaction_date: disbursementDate,
      created_by: loan.approved_by ?? null,
    });
  }

  return updateResult;
}

// ════════════════════════════════════════════════════════
// LOAN PAYMENTS
// ════════════════════════════════════════════════════════

export async function getLoanPayments(params?: {
  loan_id?: string;
  status?: LoanPayment["status"];
}): Promise<ApiListResponse<LoanPayment>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("loan_payments")
    .select("*", { count: "exact" })
    .order("installment_no", { ascending: true });

  if (params?.loan_id) query = query.eq("loan_id", params.loan_id);
  if (params?.status) query = query.eq("status", params.status);

  const { data, error, count } = await query;
  if (error) return { data: [], total: 0, error: error.message };
  return { data: data as LoanPayment[], total: count ?? 0, error: null };
}

export async function getLoanPaymentById(
  id: string,
): Promise<ApiResponse<LoanPayment>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("loan_payments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as LoanPayment, error: null };
}

export async function createLoanPayment(
  payload: Omit<LoanPaymentInsert, "reference_number">,
): Promise<ApiResponse<LoanPayment & { updated_loan: Loan }>> {
  const supabase = await createSupabaseServerClient();

  // ── 1. Cek existing payment ──────────────────────────────────────────────
  const { data: existing, error: checkErr } = await supabase
    .from("loan_payments")
    .select("id, status")
    .eq("loan_id", payload.loan_id)
    .eq("installment_no", payload.installment_no)
    .maybeSingle();

  if (checkErr) return { data: null, error: checkErr.message };

  let paymentResult: LoanPayment | null = null;

  // ── 2. Insert or update payment ──────────────────────────────────────────
  if (existing) {
    if (existing.status === "paid") {
      return {
        data: null,
        error: `Angsuran ke-${payload.installment_no} sudah dibayar sebelumnya.`,
      };
    }
    const { data: updated, error: updateErr } = await supabase
      .from("loan_payments")
      .update({
        payment_date: payload.payment_date,
        paid_amount: payload.paid_amount,
        penalty: payload.penalty || 0,
        status: "paid",
        notes: payload.notes,
        created_by: payload.created_by,
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (updateErr) return { data: null, error: updateErr.message };
    paymentResult = updated as LoanPayment;
  } else {
    const refNumber = `ANG-${Date.now()}`;
    const { data, error } = await supabase
      .from("loan_payments")
      .insert({
        ...payload,
        payment_date:
          payload.payment_date || new Date().toISOString().slice(0, 10),
        reference_number: refNumber,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    paymentResult = data as LoanPayment;
  }

  // ── 3. Update loan paid_amount & status ─────────────────────────────────
  const { data: loan, error: loanErr } = await supabase
    .from("loans")
    .select("id, paid_amount, total_payment, status")
    .eq("id", payload.loan_id)
    .single();

  if (loanErr || !loan)
    return { data: null, error: loanErr?.message || "Loan not found" };

  const paidAmount = Number(loan.paid_amount);
  const totalPayment = Number(loan.total_payment);
  const newPaid = paidAmount + (payload.paid_amount ?? payload.total_amount);

  // Rounding tolerance (0.01 IDR) untuk menghindari floating point error
  const isCompleted =
    Math.abs(newPaid - totalPayment) < 0.01 || newPaid >= totalPayment;

  const { data: updatedLoan, error: updateLoanErr } = await supabase
    .from("loans")
    .update({
      paid_amount: newPaid,
      status: isCompleted ? "completed" : "active",
    })
    .eq("id", payload.loan_id)
    .select()
    .single();

  if (updateLoanErr) return { data: null, error: updateLoanErr.message };

  // ─── 4. Catat ke financial_transactions ──────────────────────────
  const { data: loanData } = await supabase
    .from("loans")
    .select("loan_number")
    .eq("id", payload.loan_id)
    .single();

  if (loanData) {
    await createFinancialTransaction({
      transaction_type: "pemasukan",
      category: "angsuran_pinjaman",
      amount: payload.paid_amount ?? payload.total_amount,
      description: `Angsuran ke-${payload.installment_no} pinjaman ${loanData.loan_number}`,
      reference_type: "loan_payment",
      reference_id: paymentResult.id,
      transaction_date:
        payload.payment_date ?? new Date().toISOString().slice(0, 10),
      created_by: payload.created_by ?? null,
    });
  }

  // ── 5. Return payment + updated loan ─────────────────────────────────────
  return {
    data: {
      ...paymentResult,
      updated_loan: updatedLoan as Loan,
    },
    error: null,
    message: isCompleted
      ? "Pembayaran berhasil! Pinjaman telah lunas."
      : "Pembayaran angsuran berhasil dicatat.",
  };
}

export async function updateLoanPayment(
  id: string,
  payload: LoanPaymentUpdate,
): Promise<ApiResponse<LoanPayment>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("loan_payments")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return {
    data: data as LoanPayment,
    error: null,
    message: "Angsuran berhasil diperbarui",
  };
}

/**
 * Generate jadwal angsuran menggunakan DB function calculate_loan_schedule
 */
export async function generateLoanSchedule(loanId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("calculate_loan_schedule", {
    p_loan_id: loanId,
  });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function deleteLoan(id: string): Promise<ApiResponse<null>> {
  const supabase = await createSupabaseServerClient();

  // 1. Hapus loan_payments terkait
  const { error: paymentsErr } = await supabase
    .from("loan_payments")
    .delete()
    .eq("loan_id", id);

  if (paymentsErr) return { data: null, error: paymentsErr.message };

  // 2. Hapus approvals terkait (reference_type = 'loan')
  const { error: approvalsErr } = await supabase
    .from("approvals")
    .delete()
    .eq("reference_type", "loan")
    .eq("reference_id", id);

  if (approvalsErr) return { data: null, error: approvalsErr.message };

  // 3. Hapus loan
  const { error } = await supabase.from("loans").delete().eq("id", id);

  if (error) return { data: null, error: error.message };

  return {
    data: null,
    error: null,
    message: "Pinjaman berhasil dihapus",
  };
}

// ── Generate jadwal angsuran (dipanggil saat disburse) ────────────────────
export async function createLoanSchedule(
  loanId: string,
  disbursementDate: string,
  termMonths: number,
): Promise<ApiResponse<null>> {
  const supabase = await createSupabaseServerClient();

  // Ambil data loan
  const { data: loan, error: loanErr } = await supabase
    .from("loans")
    .select("amount, interest_rate")
    .eq("id", loanId)
    .single();

  if (loanErr) return { data: null, error: loanErr.message };

  // Panggil DB function calculate_loan_schedule
  const { data: schedule, error: scheduleErr } = await supabase.rpc(
    "calculate_loan_schedule",
    { p_loan_id: loanId },
  );

  if (scheduleErr) return { data: null, error: scheduleErr.message };

  // Insert ke loan_payments
  const payments = schedule.map((s: any) => ({
    loan_id: loanId,
    installment_no: s.installment_no,
    due_date: s.due_date,
    principal: s.principal,
    interest: s.interest,
    total_amount: s.total_amount,
    status: "pending",
  }));

  const { error: insertErr } = await supabase
    .from("loan_payments")
    .insert(payments);

  if (insertErr) return { data: null, error: insertErr.message };

  return {
    data: null,
    error: null,
    message: "Jadwal angsuran berhasil dibuat",
  };
}

// ── Cek keterlambatan (dipanggil via cron / manual) ──────────────────────
export async function checkOverduePayments(): Promise<ApiResponse<null>> {
  const supabase = await createSupabaseServerClient();

  // 1. Cari angsuran yang sudah lewat jatuh tempo tapi masih pending
  const { data: overduePayments, error: fetchErr } = await supabase
    .from("loan_payments")
    .select("loan_id, id")
    .lt("due_date", new Date().toISOString().slice(0, 10))
    .eq("status", "pending");

  if (fetchErr) return { data: null, error: fetchErr.message };

  if (overduePayments.length === 0) {
    return { data: null, error: null, message: "Tidak ada angsuran terlambat" };
  }

  // 2. Update status angsuran menjadi overdue
  const paymentIds = overduePayments.map((p) => p.id);
  const { error: updatePaymentsErr } = await supabase
    .from("loan_payments")
    .update({ status: "overdue" })
    .in("id", paymentIds);

  if (updatePaymentsErr)
    return { data: null, error: updatePaymentsErr.message };

  // 3. Update status loan menjadi overdue (jika belum)
  const loanIds = [...new Set(overduePayments.map((p) => p.loan_id))];
  const { error: updateLoansErr } = await supabase
    .from("loans")
    .update({ status: "overdue" })
    .in("id", loanIds)
    .neq("status", "completed");

  if (updateLoansErr) return { data: null, error: updateLoansErr.message };

  return {
    data: null,
    error: null,
    message: `Berhasil update ${overduePayments.length} angsuran menjadi overdue`,
  };
}
