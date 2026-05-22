import type {
  SavingsAccount,
  SavingsAccountUpdate,
  SavingsTransaction,
  SavingsTransactionInsert,
  ApiResponse,
  ApiListResponse,
  SavingsTransactionType,
  TransactionStatus,
} from "@/lib/types";

const ACCOUNTS_BASE = "/api/savings-accounts";
const TRANSACTIONS_BASE = "/api/savings-transactions";

// ─── Savings Accounts ────────────────────────

interface GetAccountsParams {
  member_id?: string;
}

// ─── Savings Transactions ────────────────────

interface GetTransactionsParams {
  member_id?: string;
  savings_account_id?: string;
  transaction_type?: SavingsTransactionType;
  status?: TransactionStatus;
  from?: string;
  to?: string;
}

export interface SetorPayload {
  member_id: string;
  savings_account_id: string;
  transaction_type: "setor";
  amount: number;
  payment_method: string;
  officer?: string;
  note?: string;
  transaction_date?: string;
  transaction_code?: string;
}

export interface TarikPayload extends Omit<SetorPayload, "transaction_type"> {
  transaction_type: "tarik";
}

export const savingsService = {
  // ─── Accounts ───

  async getAccounts(
    params?: GetAccountsParams,
  ): Promise<ApiListResponse<SavingsAccount>> {
    const url = new URL(ACCOUNTS_BASE, window.location.origin);
    if (params?.member_id) url.searchParams.set("member_id", params.member_id);
    const res = await fetch(url.toString());
    return res.json();
  },

  async getAccountById(id: string): Promise<ApiResponse<SavingsAccount>> {
    const res = await fetch(`${ACCOUNTS_BASE}/${id}`);
    return res.json();
  },

  async getAccountByMemberId(
    memberId: string,
  ): Promise<ApiResponse<SavingsAccount | null>> {
    const result = await savingsService.getAccounts({ member_id: memberId });
    if (result.error) return { data: null, error: result.error };
    return { data: result.data[0] ?? null, error: null };
  },

  async updateAccount(
    id: string,
    payload: SavingsAccountUpdate,
  ): Promise<ApiResponse<SavingsAccount>> {
    const res = await fetch(`${ACCOUNTS_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // ─── Transactions ───

  async getTransactions(
    params?: GetTransactionsParams,
  ): Promise<ApiListResponse<SavingsTransaction>> {
    const url = new URL(TRANSACTIONS_BASE, window.location.origin);
    if (params?.member_id) url.searchParams.set("member_id", params.member_id);
    if (params?.savings_account_id)
      url.searchParams.set("savings_account_id", params.savings_account_id);
    if (params?.transaction_type)
      url.searchParams.set("transaction_type", params.transaction_type);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.from) url.searchParams.set("from", params.from);
    if (params?.to) url.searchParams.set("to", params.to);
    const res = await fetch(url.toString());
    return res.json();
  },

  async getTransactionById(
    id: string,
  ): Promise<ApiResponse<SavingsTransaction>> {
    const res = await fetch(`${TRANSACTIONS_BASE}/${id}`);
    return res.json();
  },

  async setor(payload: SetorPayload): Promise<ApiResponse<SavingsTransaction>> {
    const res = await fetch(TRANSACTIONS_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, transaction_type: "setor" }),
    });
    return res.json();
  },

  async tarik(payload: TarikPayload): Promise<ApiResponse<SavingsTransaction>> {
    const res = await fetch(TRANSACTIONS_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, transaction_type: "tarik" }),
    });
    return res.json();
  },

  async updateTransaction(
    id: string,
    payload: { note?: string; officer?: string; status?: TransactionStatus },
  ): Promise<ApiResponse<SavingsTransaction>> {
    const res = await fetch(`${TRANSACTIONS_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};
