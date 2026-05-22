import type {
  Loan,
  LoanInsert,
  LoanUpdate,
  LoanPayment,
  LoanPaymentInsert,
  ApiResponse,
  ApiListResponse,
  LoanStatus,
} from "@/lib/types";

const LOANS_BASE = "/api/loans";
const PAYMENTS_BASE = "/api/loan-payments";

interface GetLoansParams {
  member_id?: string;
  status?: LoanStatus;
  from?: string;
  to?: string;
  search?: string;
}

interface GetPaymentsParams {
  loan_id?: string;
  from?: string;
  to?: string;
}

export interface BayarCicilanPayload {
  loan_id: string;
  amount: number;
  principal_paid?: number;
  interest_paid?: number;
  payment_date?: string;
  officer?: string;
}

export const loanService = {
  // ─── Loans ───

  async getAll(params?: GetLoansParams): Promise<ApiListResponse<Loan>> {
    const url = new URL(LOANS_BASE, window.location.origin);
    if (params?.member_id) url.searchParams.set("member_id", params.member_id);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.from) url.searchParams.set("from", params.from);
    if (params?.to) url.searchParams.set("to", params.to);
    if (params?.search) url.searchParams.set("search", params.search);
    const res = await fetch(url.toString());
    return res.json();
  },

  async getById(id: string): Promise<ApiResponse<Loan>> {
    const res = await fetch(`${LOANS_BASE}/${id}`);
    return res.json();
  },

  async create(payload: LoanInsert): Promise<ApiResponse<Loan>> {
    const res = await fetch(LOANS_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async update(id: string, payload: LoanUpdate): Promise<ApiResponse<Loan>> {
    const res = await fetch(`${LOANS_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async remove(id: string): Promise<ApiResponse<null>> {
    const res = await fetch(`${LOANS_BASE}/${id}`, { method: "DELETE" });
    return res.json();
  },

  // Shorthand untuk update status pinjaman
  async updateStatus(
    id: string,
    status: LoanStatus,
  ): Promise<ApiResponse<Loan>> {
    return loanService.update(id, { status });
  },

  // ─── Payments ───

  async getPayments(
    params?: GetPaymentsParams,
  ): Promise<ApiListResponse<LoanPayment>> {
    const url = new URL(PAYMENTS_BASE, window.location.origin);
    if (params?.loan_id) url.searchParams.set("loan_id", params.loan_id);
    if (params?.from) url.searchParams.set("from", params.from);
    if (params?.to) url.searchParams.set("to", params.to);
    const res = await fetch(url.toString());
    return res.json();
  },

  async getPaymentById(id: string): Promise<ApiResponse<LoanPayment>> {
    const res = await fetch(`${PAYMENTS_BASE}/${id}`);
    return res.json();
  },

  async bayarCicilan(
    payload: BayarCicilanPayload,
  ): Promise<ApiResponse<LoanPayment & { is_lunas: boolean }>> {
    const res = await fetch(PAYMENTS_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Hitung simulasi cicilan (flat rate)
  simulasiCicilan(
    amount: number,
    interestRate: number,
    tenorMonths: number,
  ): {
    installmentAmount: number;
    totalInterest: number;
    totalPayment: number;
  } {
    const monthlyInterest = (amount * (interestRate / 100)) / tenorMonths;
    const monthlyPrincipal = amount / tenorMonths;
    const installmentAmount = Math.round(monthlyPrincipal + monthlyInterest);
    const totalInterest = Math.round(monthlyInterest * tenorMonths);
    return {
      installmentAmount,
      totalInterest,
      totalPayment: amount + totalInterest,
    };
  },
};
