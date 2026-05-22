import type {
  FinancialTransaction,
  FinancialTransactionInsert,
  FinancialTransactionUpdate,
  ApiResponse,
  ApiListResponse,
  FinancialTransactionType,
  FinancialTransactionStatus,
} from "@/lib/types";

const BASE = "/api/financial-transactions";

interface GetFinancialTransactionsParams {
  transaction_type?: FinancialTransactionType;
  category?: string;
  status?: FinancialTransactionStatus;
  created_by?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface RangkumanKeuangan {
  totalIncome: number;
  totalExpense: number;
  saldo: number;
  totalTransaksi: number;
}

export const financialService = {
  // GET /api/financial-transactions
  async getAll(
    params?: GetFinancialTransactionsParams,
  ): Promise<ApiListResponse<FinancialTransaction>> {
    const url = new URL(BASE, window.location.origin);
    if (params?.transaction_type)
      url.searchParams.set("transaction_type", params.transaction_type);
    if (params?.category) url.searchParams.set("category", params.category);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.created_by)
      url.searchParams.set("created_by", params.created_by);
    if (params?.from) url.searchParams.set("from", params.from);
    if (params?.to) url.searchParams.set("to", params.to);
    if (params?.search) url.searchParams.set("search", params.search);

    const res = await fetch(url.toString());
    return res.json();
  },

  // GET /api/financial-transactions/[id]
  async getById(id: string): Promise<ApiResponse<FinancialTransaction>> {
    const res = await fetch(`${BASE}/${id}`);
    return res.json();
  },

  // POST /api/financial-transactions
  async create(
    payload: FinancialTransactionInsert,
  ): Promise<ApiResponse<FinancialTransaction>> {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // PUT /api/financial-transactions/[id]
  async update(
    id: string,
    payload: FinancialTransactionUpdate,
  ): Promise<ApiResponse<FinancialTransaction>> {
    const res = await fetch(`${BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // DELETE /api/financial-transactions/[id] (soft delete → void)
  async void(id: string): Promise<ApiResponse<FinancialTransaction>> {
    const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
    return res.json();
  },

  // Shorthand: catat pemasukan
  async catatIncome(
    payload: Omit<FinancialTransactionInsert, "transaction_type">,
  ): Promise<ApiResponse<FinancialTransaction>> {
    return financialService.create({ ...payload, transaction_type: "income" });
  },

  // Shorthand: catat pengeluaran
  async catatExpense(
    payload: Omit<FinancialTransactionInsert, "transaction_type">,
  ): Promise<ApiResponse<FinancialTransaction>> {
    return financialService.create({ ...payload, transaction_type: "expense" });
  },

  // Helper: filter hanya income dalam rentang tanggal
  async getIncome(
    from?: string,
    to?: string,
  ): Promise<ApiListResponse<FinancialTransaction>> {
    return financialService.getAll({ transaction_type: "income", from, to });
  },

  // Helper: filter hanya expense dalam rentang tanggal
  async getExpense(
    from?: string,
    to?: string,
  ): Promise<ApiListResponse<FinancialTransaction>> {
    return financialService.getAll({ transaction_type: "expense", from, to });
  },

  // Helper: hitung rangkuman keuangan dari data yang sudah di-fetch (client-side)
  hitungRangkuman(transactions: FinancialTransaction[]): RangkumanKeuangan {
    const posted = transactions.filter((t) => t.status === "posted");
    const totalIncome = posted
      .filter((t) => t.transaction_type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = posted
      .filter((t) => t.transaction_type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpense,
      saldo: totalIncome - totalExpense,
      totalTransaksi: posted.length,
    };
  },

  // Helper: ambil ringkasan bulan ini
  async getRangkumanBulanIni(): Promise<RangkumanKeuangan> {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const result = await financialService.getAll({
      from,
      to,
      status: "posted",
    });
    if (result.error || !result.data) {
      return { totalIncome: 0, totalExpense: 0, saldo: 0, totalTransaksi: 0 };
    }
    return financialService.hitungRangkuman(result.data);
  },
};
