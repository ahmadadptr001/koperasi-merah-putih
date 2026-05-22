// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

export type UserRole =
  | "admin"
  | "ketua"
  | "bendahara"
  | "sekretaris"
  | "anggota";
export type UserStatus = "active" | "inactive";

export type MemberType = "biasa" | "luar_biasa" | "kehormatan";
export type MemberStatus = "active" | "inactive" | "suspended";

export type SavingsTransactionType = "setor" | "tarik";
export type PaymentMethod = "tunai" | "transfer" | "auto_debit";
export type TransactionStatus = "pending" | "success" | "failed" | "cancelled";

export type LoanStatus =
  | "draft"
  | "pending"
  | "approved"
  | "active"
  | "lunas"
  | "rejected"
  | "macet";

export type ApprovalCategory = "pinjaman" | "simpanan" | "anggota" | "lainnya";
export type ApprovalPriority = "low" | "medium" | "high" | "urgent";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "revision";
export type DocumentStatus = "incomplete" | "complete" | "verified";

export type FinancialTransactionType = "income" | "expense";
export type FinancialTransactionStatus = "pending" | "posted" | "void";

// ─────────────────────────────────────────────
// TABLE TYPES
// ─────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  member_code: string;
  nik: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  area: string | null;
  joined_at: string;
  status: MemberStatus;
  member_type: MemberType;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavingsAccount {
  id: string;
  member_id: string;
  balance_pokok: number;
  balance_wajib: number;
  balance_sukarela: number;
  total_balance: number;
  updated_at: string;
}

export interface SavingsTransaction {
  id: string;
  transaction_code: string;
  member_id: string;
  savings_account_id: string;
  transaction_date: string;
  transaction_type: SavingsTransactionType;
  amount: number;
  balance_after: number;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  officer: string | null;
  note: string | null;
  created_at: string;
}

export interface Loan {
  id: string;
  loan_code: string;
  member_id: string;
  loan_date: string;
  amount: number;
  interest_rate: number;
  tenor_months: number;
  status: LoanStatus;
  due_date: string | null;
  installment_amount: number;
  paid_amount: number;
  remaining_amount: number;
  purpose: string | null;
  collateral: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  payment_date: string;
  amount: number;
  principal_paid: number;
  interest_paid: number;
  remaining_after: number;
  officer: string | null;
  created_at: string;
}

export interface Approval {
  id: string;
  approval_code: string;
  member_id: string;
  category: ApprovalCategory;
  description: string | null;
  amount: number | null;
  priority: ApprovalPriority;
  status: ApprovalStatus;
  document_status: DocumentStatus;
  reference_id: string | null;
  reference_type: string | null;
  reviewed_by: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  transaction_code: string;
  transaction_date: string;
  category: string;
  description: string | null;
  transaction_type: FinancialTransactionType;
  amount: number;
  status: FinancialTransactionStatus;
  created_by: string | null;
  created_at: string;
}

export interface UserNotificationPref {
  id: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  approval_enabled: boolean;
  updated_at: string;
}

// ─────────────────────────────────────────────
// INSERT / UPDATE PAYLOADS
// ─────────────────────────────────────────────

export type UserInsert = Omit<User, "id" | "created_at" | "updated_at">;
export type UserUpdate = Partial<UserInsert>;

export type MemberInsert = Omit<Member, "id" | "created_at" | "updated_at">;
export type MemberUpdate = Partial<MemberInsert>;

export type SavingsAccountInsert = Omit<SavingsAccount, "id" | "updated_at">;
export type SavingsAccountUpdate = Partial<SavingsAccountInsert>;

export type SavingsTransactionInsert = Omit<
  SavingsTransaction,
  "id" | "created_at"
>;
export type SavingsTransactionUpdate = Partial<SavingsTransactionInsert>;

export type LoanInsert = Omit<Loan, "id" | "created_at" | "updated_at">;
export type LoanUpdate = Partial<LoanInsert>;

export type LoanPaymentInsert = Omit<LoanPayment, "id" | "created_at">;
export type LoanPaymentUpdate = Partial<LoanPaymentInsert>;

export type ApprovalInsert = Omit<Approval, "id" | "created_at">;
export type ApprovalUpdate = Partial<ApprovalInsert>;

export type FinancialTransactionInsert = Omit<
  FinancialTransaction,
  "id" | "created_at"
>;
export type FinancialTransactionUpdate = Partial<FinancialTransactionInsert>;

export type UserNotificationPrefInsert = Omit<
  UserNotificationPref,
  "id" | "updated_at"
>;
export type UserNotificationPrefUpdate = Partial<UserNotificationPrefInsert>;

// ─────────────────────────────────────────────
// API RESPONSE WRAPPER
// ─────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  message?: string;
}

export interface ApiListResponse<T> {
  data: T[];
  total: number;
  error: string | null;
}

// ─────────────────────────────────────────────
// DATABASE TYPE MAP (for supabase createClient generic)
// ─────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      members: {
        Row: Member;
        Insert: MemberInsert;
        Update: MemberUpdate;
      };
      savings_accounts: {
        Row: SavingsAccount;
        Insert: SavingsAccountInsert;
        Update: SavingsAccountUpdate;
      };
      savings_transactions: {
        Row: SavingsTransaction;
        Insert: SavingsTransactionInsert;
        Update: SavingsTransactionUpdate;
      };
      loans: {
        Row: Loan;
        Insert: LoanInsert;
        Update: LoanUpdate;
      };
      loan_payments: {
        Row: LoanPayment;
        Insert: LoanPaymentInsert;
        Update: LoanPaymentUpdate;
      };
      approvals: {
        Row: Approval;
        Insert: ApprovalInsert;
        Update: ApprovalUpdate;
      };
      financial_transactions: {
        Row: FinancialTransaction;
        Insert: FinancialTransactionInsert;
        Update: FinancialTransactionUpdate;
      };
      user_notification_prefs: {
        Row: UserNotificationPref;
        Insert: UserNotificationPrefInsert;
        Update: UserNotificationPrefUpdate;
      };
    };
  };
}
