// ─────────────────────────────────────────────────────────────────────────────
// lib/types.ts
// Semua tipe disinkronkan langsung dari schema.sql
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────
// ENUMS  (sesuai CHECK constraints di schema.sql)
// ─────────────────────────────────────────────

/** public.users.role */
export type UserRole = "admin" | "pengurus" | "anggota";

/** public.members.status */
export type MemberStatus = "active" | "inactive" | "suspended";

/** public.members.gender */
export type MemberGender = "L" | "P";

/** public.savings_accounts.account_type */
export type SavingsAccountType = "pokok" | "wajib" | "sukarela";

/** public.savings_accounts.status */
export type SavingsAccountStatus = "active" | "inactive" | "closed";

/** public.savings_transactions.transaction_type */
export type SavingsTransactionType = "setoran" | "penarikan";

/** public.loans.status */
export type LoanStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "completed"
  | "overdue";

/** public.loan_payments.status */
export type LoanPaymentStatus = "pending" | "paid" | "partial" | "overdue";

/** public.approvals.reference_type */
export type ApprovalReferenceType =
  | "loan"
  | "savings_withdrawal"
  | "member_registration"
  | "member_update";

/** public.approvals.status */
export type ApprovalStatus = "pending" | "approved" | "rejected" | "revision";

/** public.financial_transactions.transaction_type */
export type FinancialTransactionType = "pemasukan" | "pengeluaran" | "transfer";

// ─────────────────────────────────────────────
// TABLE ROW TYPES  (sesuai kolom di schema.sql)
// ─────────────────────────────────────────────

/** public.users */
export interface User {
  id: string; // UUID, FK → auth.users
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string; // TIMESTAMPTZ → string ISO
  updated_at: string;
}

/** public.members */
export interface Member {
  id: string;
  user_id: string | null; // FK → public.users
  member_number: string; // e.g. "KMP-2025-0001"
  full_name: string;
  nik: string | null;
  birth_date: string | null; // DATE → string "YYYY-MM-DD"
  gender: MemberGender | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  join_date: string; // DATE → string "YYYY-MM-DD"
  status: MemberStatus;
  photo_url: string | null;
  notes: string | null;
  created_by: string | null; // FK → public.users
  created_at: string;
  updated_at: string;
}

/** public.savings_accounts */
export interface SavingsAccount {
  id: string;
  member_id: string; // FK → public.members
  account_number: string; // e.g. "SPK-000001"
  account_type: SavingsAccountType;
  balance: number; // NUMERIC(15,2)
  status: SavingsAccountStatus;
  opened_date: string; // DATE → string
  closed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** public.savings_transactions */
export interface SavingsTransaction {
  id: string;
  savings_account_id: string; // FK → public.savings_accounts
  member_id: string; // FK → public.members
  transaction_type: SavingsTransactionType;
  amount: number; // NUMERIC(15,2)
  balance_before: number;
  balance_after: number;
  description: string | null;
  reference_number: string | null;
  transaction_date: string; // DATE → string
  created_by: string | null; // FK → public.users
  created_at: string;
}

/** public.loans */
export interface Loan {
  id: string;
  member_id: string; // FK → public.members
  loan_number: string; // e.g. "PJM-2025-0001"
  amount: number; // Pokok pinjaman
  interest_rate: number; // % per bulan
  term_months: number;
  monthly_payment: number;
  total_interest: number;
  total_payment: number;
  paid_amount: number;
  remaining_amount: number; // GENERATED ALWAYS AS (total_payment - paid_amount)
  purpose: string | null;
  collateral: string | null;
  status: LoanStatus;
  applied_date: string; // DATE → string
  approved_date: string | null;
  disbursement_date: string | null;
  due_date: string | null;
  approved_by: string | null; // FK → public.users
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** public.loan_payments */
export interface LoanPayment {
  id: string;
  loan_id: string; // FK → public.loans
  installment_no: number; // Angsuran ke-N
  due_date: string; // DATE → string
  payment_date: string | null;
  principal: number; // Pokok angsuran
  interest: number; // Bunga angsuran
  penalty: number; // Denda (default 0)
  total_amount: number;
  paid_amount: number | null;
  status: LoanPaymentStatus;
  reference_number: string | null;
  notes: string | null;
  created_by: string | null; // FK → public.users
  created_at: string;
  updated_at: string;
}

/** public.approvals */
export interface Approval {
  id: string;
  reference_type: ApprovalReferenceType;
  reference_id: string; // UUID referensi ke tabel lain
  title: string;
  description: string | null;
  status: ApprovalStatus;
  requested_by: string; // FK → public.users
  reviewed_by: string | null; // FK → public.users
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** public.financial_transactions */
export interface FinancialTransaction {
  id: string;
  transaction_type: FinancialTransactionType;
  category: string; // 'simpanan' | 'pinjaman' | 'operasional' | 'bunga' dll
  amount: number;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  transaction_date: string; // DATE → string
  created_by: string | null; // FK → public.users
  created_at: string;
}

/** public.notification_prefs */
export interface NotificationPref {
  id: string;
  user_id: string; // FK → public.users (UNIQUE)
  email_notifications: boolean;
  sms_notifications: boolean;
  loan_due_reminder: boolean;
  payment_confirmation: boolean;
  new_member_notification: boolean;
  loan_approval_update: boolean;
  monthly_report: boolean;
  reminder_days_before: number;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// INSERT PAYLOADS  (kolom auto-generate dibuang)
// ─────────────────────────────────────────────

export type UserInsert = Omit<User, "id" | "created_at" | "updated_at">;
export type UserUpdate = Partial<UserInsert>;

export type MemberInsert = Omit<Member, "id" | "created_at" | "updated_at">;
export type MemberUpdate = Partial<MemberInsert>;

export type SavingsAccountInsert = Omit<
  SavingsAccount,
  "id" | "created_at" | "updated_at"
>;
export type SavingsAccountUpdate = Partial<SavingsAccountInsert>;

/** remaining_amount adalah GENERATED ALWAYS — tidak boleh di-insert/update */
export type SavingsTransactionInsert = Omit<
  SavingsTransaction,
  "id" | "created_at"
>;
export type SavingsTransactionUpdate = Partial<SavingsTransactionInsert>;

export type LoanInsert = Omit<
  Loan,
  "id" | "remaining_amount" | "created_at" | "updated_at"
>;
export type LoanUpdate = Partial<LoanInsert>;

export type LoanPaymentInsert = Omit<
  LoanPayment,
  "id" | "created_at" | "updated_at"
>;
export type LoanPaymentUpdate = Partial<LoanPaymentInsert>;

export type ApprovalInsert = Omit<Approval, "id" | "created_at" | "updated_at">;
export type ApprovalUpdate = Partial<ApprovalInsert>;

export type FinancialTransactionInsert = Omit<
  FinancialTransaction,
  "id" | "created_at"
>;
export type FinancialTransactionUpdate = Partial<FinancialTransactionInsert>;

export type NotificationPrefInsert = Omit<
  NotificationPref,
  "id" | "created_at" | "updated_at"
>;
export type NotificationPrefUpdate = Partial<NotificationPrefInsert>;

// ─────────────────────────────────────────────
// API RESPONSE WRAPPERS
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
// DATABASE TYPE MAP  (untuk createClient<Database>)
// Nama tabel harus sama persis dengan schema.sql
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
      notification_prefs: {
        Row: NotificationPref;
        Insert: NotificationPrefInsert;
        Update: NotificationPrefUpdate;
      };
    };
    Views: {
      v_member_summary: {
        Row: {
          id: string;
          member_number: string;
          full_name: string;
          phone: string | null;
          status: MemberStatus;
          join_date: string;
          total_savings: number;
          savings_account_count: number;
          active_loans: number;
          total_loan_outstanding: number;
        };
      };
      v_upcoming_payments: {
        Row: LoanPayment & {
          loan_number: string;
          member_id: string;
          member_name: string;
          member_phone: string | null;
        };
      };
    };
    Functions: {
      generate_member_number: { Returns: string };
      generate_loan_number: { Returns: string };
      generate_savings_account_number: {
        Args: { p_type: SavingsAccountType };
        Returns: string;
      };
      calculate_loan_schedule: {
        Args: { p_loan_id: string };
        Returns: {
          installment_no: number;
          due_date: string;
          principal: number;
          interest: number;
          total_amount: number;
        }[];
      };
    };
  };
}
