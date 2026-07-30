import { createFinancialTransaction } from "./financialService"; // services/loanService.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildReferenceNumber } from "@/lib/reference-number";
import type {
  Loan,
  LoanInsert,
  LoanUpdate,
  LoanPayment,
  LoanPaymentInsert,
  LoanPaymentUpdate,
  LoanScheduleItem,
  ApprovalUpdate,
  ApiResponse,
  ApiListResponse,
} from "@/lib/types";

// ════════════════════════════════════════════════════════
// LOANS
// ════════════════════════════════════════════════════════

/**
 * Nomor pinjaman digenerate lewat RPC lalu dipakai pada INSERT terpisah,
 * jadi dua pengajuan yang berbarengan masih bisa mendapat nomor yang sama.
 * Batas percobaan ulang saat terjadi tabrakan unique constraint.
 */
const MAX_LOAN_NUMBER_RETRY = 5;

/** Kode error Postgres untuk unique_violation */
const PG_UNIQUE_VIOLATION = "23505";

/**
 * PostgREST menerima filter `.or()` sebagai string, sehingga karakter seperti
 * koma dan tanda kurung pada input pencarian bisa mengubah struktur filter.
 * Buang karakter yang punya makna khusus (termasuk wildcard LIKE).
 */
function sanitizeSearch(value: string): string {
  return value.replace(/[,()\\%_*"']/g, " ").trim();
}

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
  if (params?.search) {
    const term = sanitizeSearch(params.search);
    if (term)
      query = query.or(`loan_number.ilike.%${term}%,purpose.ilike.%${term}%`);
  }
  // range() sudah membatasi jumlah baris, jadi cukup salah satu saja.
  // Sebelumnya offset diabaikan bila limit tidak dikirim → paginasi macet.
  if (params?.offset) {
    const limit = params.limit ?? 10;
    query = query.range(params.offset, params.offset + limit - 1);
  } else if (params?.limit) {
    query = query.limit(params.limit);
  }

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

/** Tambah bulan tanpa meluber ke bulan berikutnya (31 Jan + 1 bln = 28/29 Feb) */
function addMonths(isoDate: string, months: number): string {
  const base = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  const day = base.getUTCDate();
  // Set ke tanggal 1 dulu supaya setUTCMonth tidak menggeser bulan.
  base.setUTCDate(1);
  base.setUTCMonth(base.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0),
  ).getUTCDate();
  base.setUTCDate(Math.min(day, lastDay));
  return base.toISOString().slice(0, 10);
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

  if (!Number.isFinite(payload.amount) || payload.amount <= 0)
    return { data: null, error: "Jumlah pinjaman tidak valid" };
  if (!Number.isInteger(payload.term_months) || payload.term_months <= 0)
    return { data: null, error: "Tenor pinjaman tidak valid" };

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

  // Nomor pinjaman dibuat lewat RPC lalu dipakai pada INSERT terpisah, jadi
  // dua pengajuan yang berbarengan bisa mendapat nomor yang sama. Saat unique
  // constraint menolak, ambil nomor berikutnya dan coba lagi — jangan langsung
  // menampilkan "duplicate key ..." ke anggota.
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= MAX_LOAN_NUMBER_RETRY; attempt++) {
    const { data: loanNumber, error: genError } = await supabase.rpc(
      "generate_loan_number",
    );
    if (genError) return { data: null, error: genError.message };

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

    if (!error) {
      return {
        data: data as Loan,
        error: null,
        message: "Pinjaman berhasil diajukan",
      };
    }

    lastError = error.message;

    const isLoanNumberClash =
      error.code === PG_UNIQUE_VIOLATION && error.message.includes("loan_number");
    if (!isLoanNumberClash) return { data: null, error: error.message };
  }

  return {
    data: null,
    error:
      "Nomor pinjaman sedang dipakai pengajuan lain. Silakan coba ajukan kembali dalam beberapa saat." +
      (lastError ? ` (${lastError})` : ""),
  };
}

/**
 * Selaraskan baris `approvals` milik sebuah pinjaman.
 *
 * Persetujuan/penolakan pinjaman dilakukan lewat tabel `loans`, sementara
 * notifikasi pengurus dibaca dari tabel `approvals`. Tanpa sinkronisasi ini
 * baris approval tetap 'pending' selamanya, sehingga badge notifikasi dan
 * hitungan "menunggu persetujuan" di dashboard tidak pernah berkurang.
 */
async function syncLoanApproval(
  loanId: string,
  status: "approved" | "rejected",
  reviewedBy?: string | null,
  notes?: string | null,
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const update: ApprovalUpdate = {
    status,
    reviewed_at: new Date().toISOString(),
  };
  if (reviewedBy) update.reviewed_by = reviewedBy;
  if (notes) update.review_notes = notes;

  // Hanya baris yang masih pending — jangan menimpa keputusan yang sudah ada.
  await supabase
    .from("approvals")
    .update(update)
    .eq("reference_type", "loan")
    .eq("reference_id", loanId)
    .eq("status", "pending");
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

  // Keputusan atas pinjaman harus tercermin di baris approval-nya.
  if (payload.status === "approved" || payload.status === "rejected") {
    await syncLoanApproval(
      id,
      payload.status,
      payload.approved_by ?? null,
      payload.notes ?? null,
    );
  }

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
 * Tolak pinjaman: ubah status → 'rejected' dan catat siapa yang menolak.
 * Sebelumnya penolakan dikirim sebagai update biasa tanpa reviewer, sehingga
 * tidak ada jejak siapa yang menolak.
 */
export async function rejectLoan(
  id: string,
  rejectedBy: string,
  notes?: string,
): Promise<ApiResponse<Loan>> {
  const result = await updateLoan(id, {
    status: "rejected",
    approved_by: rejectedBy,
    approved_date: new Date().toISOString().slice(0, 10),
    notes,
  });

  if (result.error) return result;
  return { ...result, message: "Pinjaman berhasil ditolak" };
}

/**
 * Cairkan pinjaman: ubah status → 'active', set disbursement_date & due_date
 */
export async function disburseLoan(
  id: string,
  disbursementDate: string,
  termMonths: number,
): Promise<ApiResponse<Loan>> {
  const supabase = await createSupabaseServerClient();

  // Cegah pencairan ganda: jadwal angsuran akan terbentuk dua kali.
  const existing = await getLoanById(id);
  if (existing.error) return { data: null, error: existing.error };
  if (existing.data && existing.data.status !== "approved") {
    return {
      data: null,
      error: `Pinjaman tidak bisa dicairkan karena statusnya "${existing.data.status}". Hanya pinjaman berstatus "approved" yang bisa dicairkan.`,
    };
  }

  // Hitung due_date = disbursementDate + term_months.
  // addMonths dipakai agar tanggal akhir bulan tidak meluber
  // (31 Jan + 1 bulan ≠ 3 Maret seperti perilaku Date#setMonth bawaan).
  const dueDate = addMonths(disbursementDate, termMonths);

  // Update loan status
  const updateResult = await updateLoan(id, {
    status: "active",
    disbursement_date: disbursementDate,
    due_date: dueDate,
  });

  if (updateResult.error) return updateResult;

  // Generate jadwal angsuran
  const scheduleResult = await createLoanSchedule(id);
  if (scheduleResult.error) {
    // Rollback: buang angsuran yang mungkin sudah masuk sebagian, lalu
    // kembalikan status & tanggal pinjaman ke kondisi sebelum pencairan.
    await supabase.from("loan_payments").delete().eq("loan_id", id);
    await updateLoan(id, {
      status: "approved",
      disbursement_date: null,
      due_date: null,
    });
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

  // Jumlah yang benar-benar dibayar; fallback ke tagihan angsuran.
  const amountPaid = payload.paid_amount ?? payload.total_amount;

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
        payment_date:
          payload.payment_date || new Date().toISOString().slice(0, 10),
        // Sebelumnya memakai payload.paid_amount langsung, sehingga kolom
        // ter-set NULL saat pemanggil hanya mengirim total_amount.
        paid_amount: amountPaid,
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
    const { data, error } = await supabase
      .from("loan_payments")
      .insert({
        ...payload,
        paid_amount: amountPaid,
        payment_date:
          payload.payment_date || new Date().toISOString().slice(0, 10),
        reference_number: buildReferenceNumber("ANG"),
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    paymentResult = data as LoanPayment;
  }

  // ── 3. Update loan paid_amount & status ─────────────────────────────────
  const { data: loan, error: loanErr } = await supabase
    .from("loans")
    .select("id, total_payment, status")
    .eq("id", payload.loan_id)
    .single();

  if (loanErr || !loan)
    return { data: null, error: loanErr?.message || "Loan not found" };

  // Hitung ulang dari seluruh angsuran, JANGAN akumulasi ke nilai lama.
  // Versi sebelumnya menambahkan `paid_amount` ke nilai tersimpan, sehingga
  // angsuran yang sebelumnya 'partial' lalu dilunasi terhitung dua kali.
  const { data: paidRows, error: sumErr } = await supabase
    .from("loan_payments")
    .select("paid_amount, status, due_date")
    .eq("loan_id", payload.loan_id);

  if (sumErr) return { data: null, error: sumErr.message };

  const rows = paidRows ?? [];
  const newPaid = rows
    .filter((r) => r.status === "paid" || r.status === "partial")
    .reduce((sum, r) => sum + Number(r.paid_amount ?? 0), 0);

  const totalPayment = Number(loan.total_payment);

  // Toleransi pembulatan setengah sen; `>=` saja tidak cukup karena
  // penjumlahan floating point bisa kurang tipis dari total.
  const isCompleted = newPaid >= totalPayment - 0.005;

  // Masih ada angsuran yang lewat jatuh tempo → jangan turunkan status
  // 'overdue' menjadi 'active' hanya karena ada satu pembayaran masuk.
  const today = new Date().toISOString().slice(0, 10);
  const hasOverdue = rows.some(
    (r) =>
      r.status !== "paid" &&
      (r.status === "overdue" || (r.due_date ?? "9999-12-31") < today),
  );

  const nextStatus: Loan["status"] = isCompleted
    ? "completed"
    : hasOverdue
      ? "overdue"
      : "active";

  const { data: updatedLoan, error: updateLoanErr } = await supabase
    .from("loans")
    .update({
      paid_amount: newPaid,
      status: nextStatus,
    })
    .eq("id", payload.loan_id)
    .select()
    .single();

  if (updateLoanErr) return { data: null, error: updateLoanErr.message };

  // ─── 4. Catat ke financial_transactions ──────────────────────────
  // updatedLoan sudah memuat loan_number, tidak perlu query ulang.
  const loanData = updatedLoan as Loan | null;

  if (loanData) {
    await createFinancialTransaction({
      transaction_type: "pemasukan",
      category: "angsuran_pinjaman",
      amount: amountPaid,
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

  // 1. Ambil dulu id angsuran — dibutuhkan untuk membersihkan
  //    financial_transactions, dan harus dibaca SEBELUM baris angsurannya
  //    dihapus.
  const { data: paymentIds, error: paymentIdsErr } = await supabase
    .from("loan_payments")
    .select("id")
    .eq("loan_id", id);

  if (paymentIdsErr) return { data: null, error: paymentIdsErr.message };

  // 2. Hapus catatan keuangan terkait — pencairan & angsuran pinjaman ini.
  //    Sebelumnya tertinggal sebagai baris yatim yang tetap terhitung di
  //    laporan keuangan padahal pinjamannya sudah tidak ada.
  const { error: loanTxnErr } = await supabase
    .from("financial_transactions")
    .delete()
    .eq("reference_type", "loan")
    .eq("reference_id", id);

  if (loanTxnErr) return { data: null, error: loanTxnErr.message };

  if (paymentIds && paymentIds.length > 0) {
    const { error: paymentTxnErr } = await supabase
      .from("financial_transactions")
      .delete()
      .eq("reference_type", "loan_payment")
      .in(
        "reference_id",
        paymentIds.map((p) => p.id),
      );

    if (paymentTxnErr) return { data: null, error: paymentTxnErr.message };
  }

  // 3. Hapus loan_payments terkait
  const { error: paymentsErr } = await supabase
    .from("loan_payments")
    .delete()
    .eq("loan_id", id);

  if (paymentsErr) return { data: null, error: paymentsErr.message };

  // 4. Hapus approvals terkait (reference_type = 'loan')
  const { error: approvalsErr } = await supabase
    .from("approvals")
    .delete()
    .eq("reference_type", "loan")
    .eq("reference_id", id);

  if (approvalsErr) return { data: null, error: approvalsErr.message };

  // 5. Hapus loan
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
): Promise<ApiResponse<null>> {
  const supabase = await createSupabaseServerClient();

  // Panggil DB function calculate_loan_schedule.
  // Fungsi ini sudah membaca amount/interest_rate/term_months dari tabel
  // loans, jadi tidak perlu query terpisah lagi di sini.
  const { data: schedule, error: scheduleErr } = await supabase.rpc(
    "calculate_loan_schedule",
    { p_loan_id: loanId },
  );

  if (scheduleErr) return { data: null, error: scheduleErr.message };

  if (!schedule || schedule.length === 0)
    return {
      data: null,
      error: "Jadwal angsuran kosong — periksa tenor dan tanggal pencairan.",
    };

  // Insert ke loan_payments
  const payments = (schedule as LoanScheduleItem[]).map((s) => ({
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

  // data bisa null saat query gagal tanpa error eksplisit → jangan akses
  // .length langsung (sebelumnya melempar TypeError).
  const overdue = overduePayments ?? [];

  if (overdue.length === 0) {
    return { data: null, error: null, message: "Tidak ada angsuran terlambat" };
  }

  // 2. Update status angsuran menjadi overdue
  const paymentIds = overdue.map((p) => p.id);
  const { error: updatePaymentsErr } = await supabase
    .from("loan_payments")
    .update({ status: "overdue" })
    .in("id", paymentIds);

  if (updatePaymentsErr)
    return { data: null, error: updatePaymentsErr.message };

  // 3. Update status loan menjadi overdue.
  //    Hanya pinjaman yang sedang berjalan. Sebelumnya `.neq("completed")`
  //    ikut menyeret pinjaman 'pending'/'approved'/'rejected' menjadi
  //    'overdue' — padahal dananya belum pernah dicairkan.
  const loanIds = [...new Set(overdue.map((p) => p.loan_id))];
  const { error: updateLoansErr } = await supabase
    .from("loans")
    .update({ status: "overdue" })
    .in("id", loanIds)
    .eq("status", "active");

  if (updateLoansErr) return { data: null, error: updateLoansErr.message };

  return {
    data: null,
    error: null,
    message: `Berhasil update ${overdue.length} angsuran menjadi overdue`,
  };
}
