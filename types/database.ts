// ============================================================
// types/database.ts
// Definisi tipe TypeScript untuk semua tabel Supabase
// ============================================================

export type UserRole = "admin" | "pengurus" | "anggota";
export type MemberStatus = "active" | "inactive" | "suspended";
export type SavingsAccountType = "pokok" | "wajib" | "sukarela";
export type SavingsAccountStatus = "active" | "inactive" | "closed";
export type SavingsTransactionType = "setoran" | "penarikan";
export type LoanStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "completed"
  | "overdue";
export type LoanPaymentStatus = "pending" | "paid" | "partial" | "overdue";
export type ApprovalReferenceType =
  | "loan"
  | "savings_withdrawal"
  | "member_registration"
  | "member_update";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "revision";
export type FinancialTransactionType = "pemasukan" | "pengeluaran" | "transfer";

// ---- USERS ----
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserInsert {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role?: UserRole;
  avatar_url?: string;
  is_active?: boolean;
}

export interface UserUpdate {
  full_name?: string;
  phone?: string;
  role?: UserRole;
  avatar_url?: string;
  is_active?: boolean;
}

// ---- MEMBERS ----
export interface Member {
  id: string;
  user_id?: string;
  member_number: string;
  full_name: string;
  nik?: string;
  birth_date?: string;
  gender?: "L" | "P";
  address?: string;
  phone?: string;
  email?: string;
  occupation?: string;
  join_date: string;
  status: MemberStatus;
  photo_url?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // relasi (join)
  user?: User;
}

export interface MemberInsert {
  user_id?: string;
  member_number?: string; // auto-generated jika tidak diisi
  full_name: string;
  nik?: string;
  birth_date?: string;
  gender?: "L" | "P";
  address?: string;
  phone?: string;
  email?: string;
  occupation?: string;
  join_date?: string;
  status?: MemberStatus;
  photo_url?: string;
  notes?: string;
  created_by?: string;
}

export interface MemberUpdate {
  full_name?: string;
  nik?: string;
  birth_date?: string;
  gender?: "L" | "P";
  address?: string;
  phone?: string;
  email?: string;
  occupation?: string;
  status?: MemberStatus;
  photo_url?: string;
  notes?: string;
}

// ---- SAVINGS_ACCOUNTS ----
export interface SavingsAccount {
  id: string;
  member_id: string;
  account_number: string;
  account_type: SavingsAccountType;
  balance: number;
  status: SavingsAccountStatus;
  opened_date: string;
  closed_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // relasi
  member?: Member;
}

export interface SavingsAccountInsert {
  member_id: string;
  account_number?: string; // auto-generated
  account_type: SavingsAccountType;
  balance?: number;
  status?: SavingsAccountStatus;
  opened_date?: string;
  notes?: string;
}

export interface SavingsAccountUpdate {
  status?: SavingsAccountStatus;
  closed_date?: string;
  notes?: string;
}

// ---- SAVINGS_TRANSACTIONS ----
export interface SavingsTransaction {
  id: string;
  savings_account_id: string;
  member_id: string;
  transaction_type: SavingsTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string;
  reference_number?: string;
  transaction_date: string;
  created_by?: string;
  created_at: string;
  // relasi
  savings_account?: SavingsAccount;
  member?: Member;
}

export interface SavingsTransactionInsert {
  savings_account_id: string;
  member_id: string;
  transaction_type: SavingsTransactionType;
  amount: number;
  description?: string;
  reference_number?: string;
  transaction_date?: string;
  created_by?: string;
}

// ---- LOANS ----
export interface Loan {
  id: string;
  member_id: string;
  loan_number: string;
  amount: number;
  interest_rate: number;
  term_months: number;
  monthly_payment: number;
  total_interest: number;
  total_payment: number;
  paid_amount: number;
  remaining_amount: number;
  purpose?: string;
  collateral?: string;
  status: LoanStatus;
  applied_date: string;
  approved_date?: string;
  disbursement_date?: string;
  due_date?: string;
  approved_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // relasi
  member?: Member;
  approver?: User;
  loan_payments?: LoanPayment[];
}

export interface LoanInsert {
  member_id: string;
  loan_number?: string; // auto-generated
  amount: number;
  interest_rate?: number;
  term_months: number;
  monthly_payment: number;
  total_interest: number;
  total_payment: number;
  purpose?: string;
  collateral?: string;
  status?: LoanStatus;
  applied_date?: string;
  notes?: string;
}

export interface LoanUpdate {
  status?: LoanStatus;
  approved_date?: string;
  disbursement_date?: string;
  due_date?: string;
  approved_by?: string;
  paid_amount?: number;
  notes?: string;
}

// ---- LOAN_PAYMENTS ----
export interface LoanPayment {
  id: string;
  loan_id: string;
  installment_no: number;
  due_date: string;
  payment_date?: string;
  principal: number;
  interest: number;
  penalty: number;
  total_amount: number;
  paid_amount?: number;
  status: LoanPaymentStatus;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // relasi
  loan?: Loan;
}

export interface LoanPaymentInsert {
  loan_id: string;
  installment_no: number;
  due_date: string;
  principal: number;
  interest: number;
  penalty?: number;
  total_amount: number;
  paid_amount?: number;
  status?: LoanPaymentStatus;
  reference_number?: string;
  notes?: string;
  created_by?: string;
}

export interface LoanPaymentUpdate {
  payment_date?: string;
  paid_amount?: number;
  penalty?: number;
  status?: LoanPaymentStatus;
  reference_number?: string;
  notes?: string;
}

// ---- APPROVALS ----
export interface Approval {
  id: string;
  reference_type: ApprovalReferenceType;
  reference_id: string;
  title: string;
  description?: string;
  status: ApprovalStatus;
  requested_by: string;
  reviewed_by?: string;
  review_notes?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  // relasi
  requester?: User;
  reviewer?: User;
}

export interface ApprovalInsert {
  reference_type: ApprovalReferenceType;
  reference_id: string;
  title: string;
  description?: string;
  requested_by: string;
}

export interface ApprovalUpdate {
  status?: ApprovalStatus;
  reviewed_by?: string;
  review_notes?: string;
  reviewed_at?: string;
}

// ---- FINANCIAL_TRANSACTIONS ----
export interface FinancialTransaction {
  id: string;
  transaction_type: FinancialTransactionType;
  category: string;
  amount: number;
  description?: string;
  reference_type?: string;
  reference_id?: string;
  transaction_date: string;
  created_by?: string;
  created_at: string;
}

export interface FinancialTransactionInsert {
  transaction_type: FinancialTransactionType;
  category: string;
  amount: number;
  description?: string;
  reference_type?: string;
  reference_id?: string;
  transaction_date?: string;
  created_by?: string;
}

// ---- NOTIFICATION_PREFS ----
export interface NotificationPrefs {
  id: string;
  user_id: string;
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

export interface NotificationPrefsInsert {
  user_id: string;
  email_notifications?: boolean;
  sms_notifications?: boolean;
  loan_due_reminder?: boolean;
  payment_confirmation?: boolean;
  new_member_notification?: boolean;
  loan_approval_update?: boolean;
  monthly_report?: boolean;
  reminder_days_before?: number;
}

export interface NotificationPrefsUpdate {
  email_notifications?: boolean;
  sms_notifications?: boolean;
  loan_due_reminder?: boolean;
  payment_confirmation?: boolean;
  new_member_notification?: boolean;
  loan_approval_update?: boolean;
  monthly_report?: boolean;
  reminder_days_before?: number;
}

// ---- API RESPONSE TYPES ----
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---- QUERY PARAMS ----
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface MemberQueryParams extends PaginationParams {
  status?: MemberStatus;
}

export interface LoanQueryParams extends PaginationParams {
  status?: LoanStatus;
  memberId?: string;
}

export interface SavingsQueryParams extends PaginationParams {
  accountType?: SavingsAccountType;
  memberId?: string;
}
