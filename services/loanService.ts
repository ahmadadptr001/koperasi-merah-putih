// services/loanService.ts
import { createSupabaseServerClient } from "@/lib/supabase";
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

  // Generate nomor pinjaman via DB function
  const { data: loanNumber, error: genError } = await supabase.rpc(
    "generate_loan_number",
  );
  if (genError) return { data: null, error: genError.message };

  const derived = calcLoanFields(
    payload.amount,
    payload.interest_rate,
    payload.term_months,
  );

  const { data, error } = await supabase
    .from("loans")
    .insert({
      ...payload,
      loan_number: loanNumber as string,
      ...derived,
      paid_amount: 0,
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

  const { data, error } = await supabase
    .from("loans")
    .update(payload)
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

  return updateLoan(id, {
    status: "active",
    disbursement_date: disbursementDate,
    due_date: due.toISOString().slice(0, 10),
  });
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
): Promise<ApiResponse<LoanPayment>> {
  const supabase = await createSupabaseServerClient();

  const refNumber = `ANG-${Date.now()}`;

  const { data, error } = await supabase
    .from("loan_payments")
    .insert({ ...payload, reference_number: refNumber })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  // Update paid_amount di tabel loans
  const { data: loan } = await supabase
    .from("loans")
    .select("paid_amount, total_payment")
    .eq("id", payload.loan_id)
    .single();

  if (loan) {
    const newPaid =
      Number(loan.paid_amount) + (payload.paid_amount ?? payload.total_amount);
    const isCompleted = newPaid >= Number(loan.total_payment);
    await supabase
      .from("loans")
      .update({
        paid_amount: newPaid,
        status: isCompleted ? "completed" : "active",
      })
      .eq("id", payload.loan_id);
  }

  return {
    data: data as LoanPayment,
    error: null,
    message: "Pembayaran angsuran berhasil dicatat",
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
