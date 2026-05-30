"use client";

// app/dashboard/pinjaman/page.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Filter,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  TrendingDown,
  Wallet,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Check,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import type { Loan, LoanScheduleItem, LoanPayment } from "@/lib/types";
import Swal from "sweetalert2";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  "Semua",
  "pending",
  "approved",
  "active",
  "completed",
  "overdue",
  "rejected",
] as const;

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  active: "Aktif",
  completed: "Lunas",
  overdue: "Terlambat",
  rejected: "Ditolak",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const fmtPct = (v: number) => `${v}%`;

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<
    string,
    { bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    pending: {
      bg: "#fef3c7",
      text: "#b45309",
      border: "#fde68a",
      icon: <Clock size={11} />,
    },
    approved: {
      bg: "#dbeafe",
      text: "#1d4ed8",
      border: "#bfdbfe",
      icon: <CheckCircle2 size={11} />,
    },
    active: {
      bg: "#dcfce7",
      text: "#15803d",
      border: "#bbf7d0",
      icon: <CreditCard size={11} />,
    },
    completed: {
      bg: "#f0fdf4",
      text: "#15803d",
      border: "#bbf7d0",
      icon: <CheckCircle2 size={11} />,
    },
    overdue: {
      bg: "#fee2e2",
      text: "#b91c1c",
      border: "#fecaca",
      icon: <AlertCircle size={11} />,
    },
    rejected: {
      bg: "#fee2e2",
      text: "#b91c1c",
      border: "#fecaca",
      icon: <X size={11} />,
    },
  };
  const s = cfg[status] ?? {
    bg: "#f3f4f6",
    text: "#6b7280",
    border: "#e5e7eb",
    icon: null,
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {s.icon}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  subText,
  loading,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  subText: string;
  loading?: boolean;
  accent?: string;
}) {
  const colors = useColors();
  return (
    <div
      className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md"
      style={{ borderColor: colors.border, background: colors.surface }}
    >
      {accent && (
        <div
          className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
          style={{ background: accent }}
        />
      )}
      <div className="flex items-center justify-between pl-1">
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: colors.textSecondary }}
        >
          {label}
        </p>
        <div
          className="rounded-xl p-2.5"
          style={{ background: colors.background }}
        >
          {icon}
        </div>
      </div>
      <div className="pl-1">
        {loading ? (
          <div
            className="mt-1 h-7 w-32 animate-pulse rounded-lg"
            style={{ background: colors.border }}
          />
        ) : (
          <h4
            className="text-xl font-extrabold tracking-tight"
            style={{ color: colors.textPrimary }}
          >
            {value}
          </h4>
        )}
        <p className="mt-1 text-xs" style={{ color: colors.textMuted }}>
          {subText}
        </p>
      </div>
    </div>
  );
}

// ─── Jadwal Angsuran ──────────────────────────────────────────────────────────

function JadwalAngsuran({
  loanId,
  colors,
  onPay,
  loanStatus,
  paymentStatus,
}: {
  loanId: string;
  colors: ReturnType<typeof useColors>;
  onPay?: (schedule: LoanScheduleItem) => void;
  loanStatus: Loan["status"];
  paymentStatus: Record<number, string>;
}) {
  const [schedule, setSchedule] = useState<LoanScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/loans/${loanId}/schedule`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setSchedule(json.data ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [loanId]);

  if (loading)
    return (
      <div
        className="flex items-center justify-center gap-2 py-8"
        style={{ color: colors.textMuted }}
      >
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Memuat jadwal...</span>
      </div>
    );

  if (error)
    return (
      <p
        className="py-4 text-center text-sm"
        style={{ color: colors.textMuted }}
      >
        {error.includes("not found") || error.includes("belum")
          ? "Jadwal tersedia setelah pinjaman dicairkan."
          : error}
      </p>
    );

  if (!schedule.length)
    return (
      <p
        className="py-4 text-center text-sm"
        style={{ color: colors.textMuted }}
      >
        Jadwal tersedia setelah pinjaman dicairkan.
      </p>
    );

  return (
    <div
      className="overflow-x-auto rounded-xl border"
      style={{ borderColor: colors.border }}
    >
      <table className="w-full text-left text-sm">
        <thead style={{ background: colors.background }}>
          <tr
            className="border-b text-[11px] font-black uppercase tracking-wider"
            style={{ borderColor: colors.border, color: colors.textSecondary }}
          >
            <th className="px-4 py-3">Ke-</th>
            <th className="px-4 py-3">Jatuh Tempo</th>
            <th className="px-4 py-3">Pokok</th>
            <th className="px-4 py-3">Bunga</th>
            <th className="px-4 py-3 text-right">Total</th>
            {onPay && loanStatus !== "completed" && (
              <th className="px-4 py-3 text-right">Aksi</th>
            )}
          </tr>
        </thead>
        <tbody>
          {schedule.map((s) => {
            const isPaid = paymentStatus[s.installment_no] === "paid";
            return (
              <tr
                key={s.installment_no}
                className="border-b transition-colors hover:bg-black/5"
                style={{ borderColor: colors.border }}
              >
                <td
                  className="px-4 py-3 font-bold"
                  style={{ color: colors.textPrimary }}
                >
                  {s.installment_no}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: colors.textSecondary }}
                >
                  {fmtDate(s.due_date)}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: colors.textSecondary }}
                >
                  {fmtCurrency(s.principal)}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: colors.textSecondary }}
                >
                  {fmtCurrency(s.interest)}
                </td>
                <td
                  className="px-4 py-3 text-right font-black"
                  style={{ color: colors.textPrimary }}
                >
                  {fmtCurrency(s.total_amount)}
                </td>
                {onPay && loanStatus !== "completed" && (
                  <td className="px-4 py-3 text-right">
                    {isPaid ? (
                      <span className="text-xs font-bold text-emerald-600">
                        Lunas
                      </span>
                    ) : (
                      <button
                        onClick={() => onPay(s)}
                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-transform hover:scale-105"
                        style={{ background: colors.primary }}
                      >
                        Bayar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Detail Item ──────────────────────────────────────────────────────────────

function DetailItem({
  label,
  value,
  colors,
  icon,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-4 transition-colors"
      style={{ background: colors.background, borderColor: colors.border }}
    >
      <p
        className="mb-1 flex items-center gap-1.5 text-xs font-medium"
        style={{ color: colors.textMuted }}
      >
        {icon}
        {label}
      </p>
      <p
        className="break-words text-sm font-bold"
        style={{ color: colors.textPrimary }}
      >
        {value || "—"}
      </p>
    </div>
  );
}

// ─── Modal Detail Pinjaman ────────────────────────────────────────────────────

function LoanModal({
  loan,
  colors,
  onClose,
  isAdmin,
  isPengurus,
  paymentStatus,
}: {
  loan: Loan;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
  isAdmin: boolean;
  isPengurus: boolean;
  paymentStatus: Record<number, string>;
  onPaymentSuccess: (updatedLoan: Loan) => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [showSchedule, setShowSchedule] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] =
    useState<LoanScheduleItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  // ── Fetch nama user dari requested_by ────────────────────────────────────
  const [requesterName, setRequesterName] = useState<string | null>(null);
  const [requesterLoading, setRequesterLoading] = useState(false);

  useEffect(() => {
    if (!loan.requested_by) return;
    setRequesterLoading(true);
    fetch(`/api/members?limit=1&user_id=${loan.requested_by}`)
      .then((r) => r.json())
      .then((json) => {
        const members = json.data ?? [];
        if (members.length > 0) {
          setRequesterName(members[0].full_name ?? members[0].name ?? null);
        } else {
          return fetch(`/api/users/${loan.requested_by}`)
            .then((r) => r.json())
            .then((u) => {
              setRequesterName(
                u.data?.full_name ?? u.data?.name ?? loan.requested_by,
              );
            });
        }
      })
      .catch(() => setRequesterName(loan.requested_by))
      .finally(() => setRequesterLoading(false));
  }, [loan.requested_by]);

  const paidPct =
    loan.total_payment > 0
      ? Math.min(100, Math.round((loan.paid_amount / loan.total_payment) * 100))
      : 0;

  const canPay = (isAdmin || isPengurus) && loan.status !== "completed";

  const handleOpenPayment = (schedule: LoanScheduleItem) => {
    setSelectedPayment(schedule);
    setPaymentAmount(schedule.total_amount);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentNote("");
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPayment) return;
    if (paymentAmount <= 0) {
      await Swal.fire({
        icon: "error",
        title: "Jumlah tidak valid",
        text: "Masukkan jumlah pembayaran yang valid.",
        confirmButtonColor: colors.primary,
      });
      return;
    }

    const confirmed = await Swal.fire({
      title: "Konfirmasi Pembayaran",
      html: `
        <div style="text-align:left;font-size:14px;line-height:1.8">
          <p><b>Angsuran ke-${selectedPayment.installment_no}</b></p>
          <p><b>Jatuh Tempo:</b> ${fmtDate(selectedPayment.due_date)}</p>
          <p><b>Jumlah Dibayar:</b> ${fmtCurrency(paymentAmount)}</p>
          ${paymentNote ? `<p><b>Keterangan:</b> ${paymentNote}</p>` : ""}
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: colors.primary,
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Bayar",
      cancelButtonText: "Batal",
    });

    if (!confirmed.isConfirmed) return;

    try {
      const dueDate = new Date(selectedPayment.due_date);
      const paidDate = new Date(paymentDate);
      let penalty = 0;
      if (paidDate > dueDate) {
        const daysLate = Math.floor(
          (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        penalty = daysLate * 1000;
      }

      const res = await fetch("/api/loan-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loan_id: loan.id,
          installment_no: selectedPayment.installment_no,
          due_date: selectedPayment.due_date,
          payment_date: paymentDate,
          principal: Math.round(selectedPayment.principal),
          interest: Math.round(selectedPayment.interest),
          penalty,
          total_amount: selectedPayment.total_amount,
          paid_amount: paymentAmount,
          status: "paid",
          notes: paymentNote || null,
          created_by: user?.id || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error)
        throw new Error(json.error || "Gagal mencatat pembayaran");

      await Swal.fire({
        icon: "success",
        title: "Pembayaran Berhasil!",
        text: `Angsuran ke-${selectedPayment.installment_no} berhasil dicatat.${penalty > 0 ? ` Denda: ${fmtCurrency(penalty)}` : ""}`,
        timer: 1500,
        showConfirmButton: false,
      });

      setShowPaymentModal(false);
      setSelectedPayment(null);
      onClose();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan",
        confirmButtonColor: colors.primary,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border shadow-2xl"
        style={{ background: colors.surface, borderColor: colors.border }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-start justify-between border-b px-6 py-5"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <div>
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge status={loan.status} />
            </div>
            <h2
              className="text-xl font-black"
              style={{ color: colors.textPrimary }}
            >
              Detail Pinjaman
            </h2>
            <p
              className="mt-0.5 font-mono text-sm"
              style={{ color: colors.textSecondary }}
            >
              {loan.loan_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-black/10"
            style={{ color: colors.textSecondary }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        {(loan.status === "active" || loan.status === "completed") && (
          <div
            className="border-b px-6 py-4"
            style={{ borderColor: colors.border }}
          >
            <div className="mb-2 flex justify-between">
              <span
                className="text-xs font-bold"
                style={{ color: colors.textSecondary }}
              >
                Progress Pembayaran
              </span>
              <span
                className="text-xs font-black"
                style={{ color: colors.primary }}
              >
                {paidPct}%
              </span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full"
              style={{ background: colors.border }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${paidPct}%`,
                  background: paidPct === 100 ? "#15803d" : colors.primary,
                }}
              />
            </div>
            <div
              className="mt-1.5 flex justify-between text-xs"
              style={{ color: colors.textMuted }}
            >
              <span>Dibayar: {fmtCurrency(loan.paid_amount)}</span>
              <span>Sisa: {fmtCurrency(loan.remaining_amount)}</span>
            </div>
          </div>
        )}

        {/* Grid detail */}
        <div className="grid gap-3 p-6 sm:grid-cols-2">
          <DetailItem
            label="Jumlah Pinjaman"
            value={fmtCurrency(loan.amount)}
            colors={colors}
          />
          <DetailItem
            label="Bunga / Bulan"
            value={fmtPct(loan.interest_rate)}
            colors={colors}
          />
          <DetailItem
            label="Tenor"
            value={`${loan.term_months} Bulan`}
            colors={colors}
          />
          <DetailItem
            label="Cicilan / Bulan"
            value={fmtCurrency(loan.monthly_payment)}
            colors={colors}
          />
          <DetailItem
            label="Total Pembayaran"
            value={fmtCurrency(loan.total_payment)}
            colors={colors}
          />
          <DetailItem
            label="Total Bunga"
            value={fmtCurrency(loan.total_interest)}
            colors={colors}
          />
          <DetailItem
            label="Tanggal Pengajuan"
            value={fmtDate(loan.applied_date)}
            colors={colors}
          />
          <DetailItem
            label="Tanggal Disetujui"
            value={fmtDate(loan.approved_date)}
            colors={colors}
          />
          <DetailItem
            label="Tanggal Cair"
            value={fmtDate(loan.disbursement_date)}
            colors={colors}
          />
          <DetailItem
            label="Jatuh Tempo Akhir"
            value={fmtDate(loan.due_date)}
            colors={colors}
          />

          <DetailItem
            label="Diajukan oleh"
            value={
              requesterLoading
                ? "Memuat..."
                : (requesterName ?? loan.requested_by ?? "—")
            }
            colors={colors}
            icon={<User size={11} />}
          />

          {loan.purpose && (
            <div className="sm:col-span-2">
              <DetailItem
                label="Tujuan Pinjaman"
                value={loan.purpose}
                colors={colors}
              />
            </div>
          )}
          {loan.collateral && (
            <div className="sm:col-span-2">
              <DetailItem
                label="Jaminan"
                value={loan.collateral}
                colors={colors}
              />
            </div>
          )}
          {loan.notes && (
            <div className="sm:col-span-2">
              <DetailItem label="Catatan" value={loan.notes} colors={colors} />
            </div>
          )}
        </div>

        {/* Jadwal angsuran (toggle) */}
        {(loan.status === "active" ||
          loan.status === "completed" ||
          loan.status === "overdue") && (
          <div className="px-6 pb-4">
            <button
              onClick={() => setShowSchedule((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition-colors hover:bg-black/5"
              style={{ borderColor: colors.border, color: colors.textPrimary }}
            >
              <span className="flex items-center gap-2">
                <CalendarDays size={16} style={{ color: colors.primary }} />
                Jadwal Angsuran
              </span>
              {showSchedule ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
            {showSchedule && (
              <div className="mt-3">
                <JadwalAngsuran
                  loanId={loan.id}
                  colors={colors}
                  onPay={
                    canPay &&
                    (loan.status === "active" || loan.status === "overdue")
                      ? handleOpenPayment
                      : undefined
                  }
                  loanStatus={loan.status}
                  paymentStatus={paymentStatus}
                />
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div
          className="sticky bottom-0 flex justify-end gap-3 border-t p-5"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-bold transition-colors hover:bg-black/5"
            style={{
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
            }}
          >
            Tutup
          </button>
          <button
            onClick={() => router.push(`/dashboard/pinjaman/${loan.id}/print`)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-95"
            style={{ background: colors.primary }}
          >
            <ReceiptText size={16} /> Cetak Ringkasan
          </button>
        </div>
      </div>

      {/* ─── Modal Pembayaran ──────────────────────────────────────────────── */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border shadow-xl"
            style={{ background: colors.surface, borderColor: colors.border }}
          >
            <div
              className="flex items-start justify-between border-b px-6 py-5"
              style={{ borderColor: colors.border }}
            >
              <div>
                <h2
                  className="text-xl font-black"
                  style={{ color: colors.textPrimary }}
                >
                  Pembayaran Angsuran
                </h2>
                <p
                  className="mt-1 text-sm"
                  style={{ color: colors.textSecondary }}
                >
                  Angsuran ke-{selectedPayment.installment_no} •{" "}
                  {loan.loan_number}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="rounded-lg p-2 hover:bg-black/5"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label
                  className="mb-2 block text-sm font-bold"
                  style={{ color: colors.textPrimary }}
                >
                  Jumlah Pembayaran (Rp){" "}
                  <span style={{ color: colors.primary }}>*</span>
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
                  style={{
                    borderColor: colors.border,
                    background: colors.background,
                    color: colors.textPrimary,
                  }}
                />
                <p className="mt-1 text-xs" style={{ color: colors.textMuted }}>
                  Total angsuran: {fmtCurrency(selectedPayment.total_amount)}
                </p>
              </div>
              <div>
                <label
                  className="mb-2 block text-sm font-bold"
                  style={{ color: colors.textPrimary }}
                >
                  Tanggal Pembayaran{" "}
                  <span style={{ color: colors.primary }}>*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
                  style={{
                    borderColor: colors.border,
                    background: colors.background,
                    color: colors.textPrimary,
                  }}
                />
              </div>
              <div>
                <label
                  className="mb-2 block text-sm font-bold"
                  style={{ color: colors.textPrimary }}
                >
                  Keterangan
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Opsional"
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
                  style={{
                    borderColor: colors.border,
                    background: colors.background,
                    color: colors.textPrimary,
                  }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-colors hover:bg-black/5"
                  style={{
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={handlePaymentSubmit}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-transform active:scale-95"
                  style={{ background: colors.primary }}
                >
                  <Check size={16} /> Bayar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mobile Loan Card ─────────────────────────────────────────────────────────

function LoanCard({
  loan,
  colors,
  isAdmin,
  isPengurus,
  onView,
  onPay,
  onDisburse,
  onDelete,
  hasUnpaidInstallments,
}: {
  loan: Loan;
  colors: ReturnType<typeof useColors>;
  isAdmin: boolean;
  isPengurus: boolean;
  onView: () => void;
  onPay: () => void;
  onDisburse: () => void;
  onDelete: () => void;
  hasUnpaidInstallments: boolean;
}) {
  const paidPct =
    loan.total_payment > 0
      ? Math.min(100, Math.round((loan.paid_amount / loan.total_payment) * 100))
      : 0;

  return (
    <div
      className="rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md"
      style={{ background: colors.surface, borderColor: colors.border }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p
            className="font-mono text-sm font-bold"
            style={{ color: colors.textPrimary }}
          >
            {loan.loan_number}
          </p>
          <p
            className="mt-0.5 flex items-center gap-1 text-xs"
            style={{ color: colors.textMuted }}
          >
            <CalendarDays size={10} />
            {fmtDate(loan.applied_date)}
          </p>
        </div>
        <StatusBadge status={loan.status} />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div
          className="rounded-lg p-2.5"
          style={{ background: colors.background }}
        >
          <p className="text-xs" style={{ color: colors.textMuted }}>
            Jumlah
          </p>
          <p
            className="text-sm font-black"
            style={{ color: colors.textPrimary }}
          >
            {fmtCurrency(loan.amount)}
          </p>
        </div>
        <div
          className="rounded-lg p-2.5"
          style={{ background: colors.background }}
        >
          <p className="text-xs" style={{ color: colors.textMuted }}>
            Sisa
          </p>
          <p
            className="text-sm font-black"
            style={{ color: colors.textPrimary }}
          >
            {fmtCurrency(loan.remaining_amount)}
          </p>
        </div>
        <div
          className="rounded-lg p-2.5"
          style={{ background: colors.background }}
        >
          <p className="text-xs" style={{ color: colors.textMuted }}>
            Bunga
          </p>
          <p
            className="text-sm font-bold"
            style={{ color: colors.textSecondary }}
          >
            {fmtPct(loan.interest_rate)}/bln
          </p>
        </div>
        <div
          className="rounded-lg p-2.5"
          style={{ background: colors.background }}
        >
          <p className="text-xs" style={{ color: colors.textMuted }}>
            Tenor
          </p>
          <p
            className="text-sm font-bold"
            style={{ color: colors.textSecondary }}
          >
            {loan.term_months} bulan
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {(loan.status === "active" ||
        loan.status === "completed" ||
        loan.status === "overdue") && (
        <div className="mb-3">
          <div
            className="mb-1 flex justify-between text-xs"
            style={{ color: colors.textMuted }}
          >
            <span>Progress</span>
            <span className="font-bold" style={{ color: colors.primary }}>
              {paidPct}%
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full"
            style={{ background: colors.border }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${paidPct}%`,
                background:
                  paidPct === 100
                    ? "#15803d"
                    : loan.status === "overdue"
                      ? "#ef4444"
                      : colors.primary,
              }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={onView}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-transform hover:scale-105"
          style={{
            background: colors.backgroundAccent,
            color: colors.primary,
            border: `1px solid ${colors.borderAccent}`,
          }}
        >
          <Eye size={13} /> Detail
        </button>

        {(loan.status === "pending" ||
          loan.status === "completed" ||
          loan.status === "rejected") && (
          <button
            onClick={onDelete}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition-transform hover:scale-105"
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
            }}
          >
            <X size={13} /> Hapus
          </button>
        )}

        {loan.status === "approved" && (isAdmin || isPengurus) && (
          <button
            onClick={onDisburse}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-transform hover:scale-105"
            style={{
              background: "#dbeafe",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
            }}
          >
            <Wallet size={13} /> Cairkan
          </button>
        )}

        {loan.status !== "completed" &&
          loan.status !== "approved" &&
          loan.status !== "rejected" &&
          (isAdmin || isPengurus) &&
          hasUnpaidInstallments && (
            <button
              onClick={onPay}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white transition-transform hover:scale-105"
              style={{ background: colors.primary }}
            >
              <Check size={13} /> Bayar
            </button>
          )}

        {loan.status === "overdue" && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black"
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              borderColor: "#fecaca",
            }}
          >
            <AlertCircle size={11} /> Terlambat
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HalamanPinjaman() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAdmin, isPengurus, loading: authLoading } = useAuth();

  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberLoading, setMemberLoading] = useState(true);

  const [loans, setLoans] = useState<Loan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [globalStats, setGlobalStats] = useState({
    totalPengajuan: 0,
    totalPokokSemua: 0,
    totalBungaSemua: 0,
    totalPembayaranSemua: 0,
    sisaTagihanSemua: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua");
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // State pinjaman yang dipilih (dengan data terbaru)
  const [selectedLoanData, setSelectedLoanData] = useState<Loan | null>(null);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] =
    useState<Loan | null>(null);
  const [selectedScheduleForPayment, setSelectedScheduleForPayment] =
    useState<LoanScheduleItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  // ── Status pembayaran untuk semua pinjaman ──────────────────────────────
  const [paymentStatusMap, setPaymentStatusMap] = useState<
    Record<string, Record<number, string>>
  >({});

  // ── Resolve member_id ──────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user || isAdmin || isPengurus) {
      setMemberId(null);
      setMemberLoading(false);
      return;
    }
    const fetchMemberId = async () => {
      try {
        const res = await fetch(`/api/members?limit=1&user_id=${user.id}`);
        const json = await res.json();
        const members = json.data ?? [];
        setMemberId(members.length > 0 ? members[0].id : null);
      } catch {
        setMemberId(null);
      } finally {
        setMemberLoading(false);
      }
    };
    fetchMemberId();
  }, [authLoading, user, isAdmin, isPengurus]);

  // ─── Debounce search ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(0);
  }, [selectedStatus]);

  // ─── Fetch loans ──────────────────────────────────────────────────────────────
  const fetchLoans = useCallback(async () => {
    if (memberLoading) return;
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (memberId) params.set("member_id", memberId);
      if (selectedStatus !== "Semua") params.set("status", selectedStatus);
      if (debouncedSearch) params.set("search", debouncedSearch);

      params.set("user_id", user?.id || "");
      const res = await fetch(`/api/loans?${params}`);
      if (!res.ok) throw new Error(`Gagal memuat data (${res.status})`);
      const json = await res.json();
      setLoans(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, debouncedSearch, memberId, memberLoading]);

  // ─── Fetch global stats ──────────────────────────────────────────────────────
  const fetchGlobalStats = useCallback(async () => {
    if (memberLoading) return;
    setStatsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "1000" });
      if (memberId) params.set("member_id", memberId);
      const res = await fetch(`/api/loans?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      const allLoans: Loan[] = (json.data ?? []).filter(
        (l: Loan) => l.status !== "rejected",
      );
      setGlobalStats({
        totalPengajuan: allLoans.length,
        totalPokokSemua: allLoans.reduce((s, l) => s + Number(l.amount), 0),
        totalBungaSemua: allLoans.reduce(
          (s, l) => s + Number(l.total_interest),
          0,
        ),
        totalPembayaranSemua: allLoans.reduce(
          (s, l) => s + Number(l.total_payment),
          0,
        ),
        sisaTagihanSemua: allLoans.reduce(
          (s, l) => s + Number(l.remaining_amount),
          0,
        ),
      });
    } catch {
      // silent
    } finally {
      setStatsLoading(false);
    }
  }, [memberId, memberLoading]);

  // ─── Fetch status pembayaran untuk semua loan ───────────────────────────
  const fetchAllPaymentStatus = useCallback(async () => {
    if (loans.length === 0) return;
    try {
      const promises = loans.map(async (loan) => {
        const res = await fetch(`/api/loan-payments?loan_id=${loan.id}`);
        const json = await res.json();
        const statusMap: Record<number, string> = {};
        (json.data ?? []).forEach((p: LoanPayment) => {
          statusMap[p.installment_no] = p.status;
        });
        return { loanId: loan.id, statusMap };
      });
      const results = await Promise.all(promises);
      const map: Record<string, Record<number, string>> = {};
      results.forEach(({ loanId, statusMap }) => {
        map[loanId] = statusMap;
      });
      setPaymentStatusMap(map);
    } catch (err) {
      console.error("Gagal fetch payment status:", err);
    }
  }, [loans]);

  useEffect(() => {
    void fetchLoans();
    void fetchGlobalStats();
  }, [fetchLoans, fetchGlobalStats]);

  useEffect(() => {
    void fetchAllPaymentStatus();
  }, [fetchAllPaymentStatus]);

  // ─── Handle delete ────────────────────────────────────────────────────────────
  const handleDeleteLoan = async (loan: Loan) => {
    const result = await Swal.fire({
      title: "Hapus Pinjaman?",
      text: `Pinjaman ${loan.loan_number} akan dihapus secara permanen.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/loans/${loan.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.error)
        throw new Error(json.error ?? "Gagal menghapus");
      await Swal.fire({
        icon: "success",
        title: "Pinjaman Dihapus",
        timer: 1500,
        showConfirmButton: false,
      });
      void fetchLoans();
      void fetchGlobalStats();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan",
        confirmButtonColor: colors.primary,
      });
    }
  };

  // ─── Handle disburse ─────────────────────────────────────────────────────────
  const handleDisburse = async (loan: Loan) => {
    if (!isAdmin && !isPengurus) return;
    const { value: date } = await Swal.fire({
      title: "Tanggal Pencairan",
      input: "date",
      inputLabel: "Tanggal cair",
      inputValue: new Date().toISOString().slice(0, 10),
      showCancelButton: true,
      confirmButtonColor: colors.primary,
      confirmButtonText: "Selanjutnya",
    });
    if (!date) return;
    const { value: term } = await Swal.fire({
      title: "Tenor (bulan)",
      input: "number",
      inputLabel: "Jangka waktu (bulan)",
      inputValue: loan.term_months || 12,
      showCancelButton: true,
      confirmButtonColor: colors.primary,
      confirmButtonText: "Cairkan!",
    });
    if (!term) return;
    const confirmed = await Swal.fire({
      title: "Cairkan Pinjaman?",
      html: `<div style="text-align:left;font-size:14px;line-height:1.8">
        <p><b>No. Pinjaman:</b> ${loan.loan_number}</p>
        <p><b>Jumlah:</b> ${fmtCurrency(loan.amount)}</p>
        <p><b>Tanggal Cair:</b> ${date}</p>
        <p><b>Tenor:</b> ${term} bulan</p>
      </div>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: colors.primary,
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Cairkan",
      cancelButtonText: "Batal",
    });
    if (!confirmed.isConfirmed) return;
    try {
      const res = await fetch(`/api/loans/${loan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disburse",
          disbursement_date: date,
          term_months: Number(term),
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error)
        throw new Error(json.error ?? "Gagal mencairkan");
      await Swal.fire({
        icon: "success",
        title: "Pinjaman Dicairkan!",
        timer: 1500,
        showConfirmButton: false,
      });
      void fetchLoans();
      void fetchGlobalStats();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan",
        confirmButtonColor: colors.primary,
      });
    }
  };

  // ─── Handle payment from table ──────────────────────────────────────────────
  const handleOpenPayment = async (loan: Loan) => {
    const res = await fetch(`/api/loans/${loan.id}/schedule`);
    const json = await res.json();
    const schedule = json.data ?? [];
    // Filter angsuran yang belum dibayar
    const paymentStatus = paymentStatusMap[loan.id] ?? {};
    const unpaidSchedule = schedule.filter(
      (s: LoanScheduleItem) => paymentStatus[s.installment_no] !== "paid",
    );
    if (unpaidSchedule.length === 0) {
      await Swal.fire({
        icon: "info",
        title: "Semua Angsuran Lunas",
        text: "Pinjaman ini sudah lunas.",
        confirmButtonColor: colors.primary,
      });
      return;
    }
    setSelectedLoanForPayment(loan);
    setSelectedScheduleForPayment(unpaidSchedule[0]);
    setPaymentAmount(unpaidSchedule[0].total_amount);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentNote("");
    setShowPaymentModal(true);
  };

  const handlePaymentSubmitFromTable = async () => {
    if (!selectedLoanForPayment || !selectedScheduleForPayment) return;
    if (paymentAmount <= 0) {
      await Swal.fire({
        icon: "error",
        title: "Jumlah tidak valid",
        text: "Masukkan jumlah yang valid.",
        confirmButtonColor: colors.primary,
      });
      return;
    }

    const confirmed = await Swal.fire({
      title: "Konfirmasi Pembayaran",
      html: `<div style="text-align:left;font-size:14px;line-height:1.8">
      <p><b>Angsuran ke-${selectedScheduleForPayment.installment_no}</b></p>
      <p><b>Jatuh Tempo:</b> ${fmtDate(selectedScheduleForPayment.due_date)}</p>
      <p><b>Jumlah Dibayar:</b> ${fmtCurrency(paymentAmount)}</p>
      ${paymentNote ? `<p><b>Keterangan:</b> ${paymentNote}</p>` : ""}
    </div>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: colors.primary,
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Bayar",
      cancelButtonText: "Batal",
    });

    if (!confirmed.isConfirmed) return;

    try {
      // Hitung denda jika terlambat
      const dueDate = new Date(selectedScheduleForPayment.due_date);
      const paidDate = new Date(paymentDate);
      let penalty = 0;
      if (paidDate > dueDate) {
        const daysLate = Math.floor(
          (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        penalty = daysLate * 1000;
      }

      // 1. Kirim request pembayaran
      const res = await fetch("/api/loan-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loan_id: selectedLoanForPayment.id,
          installment_no: selectedScheduleForPayment.installment_no,
          due_date: selectedScheduleForPayment.due_date,
          payment_date: paymentDate,
          principal: Math.round(selectedScheduleForPayment.principal),
          interest: Math.round(selectedScheduleForPayment.interest),
          penalty,
          total_amount: selectedScheduleForPayment.total_amount,
          paid_amount: paymentAmount,
          status: "paid",
          notes: paymentNote || null,
          created_by: user?.id || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error)
        throw new Error(json.error || "Gagal mencatat pembayaran");

      // 🔔 2. BUAT NOTIFIKASI (APPROVAL) AGAR MUNCUL DI BELL
      await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference_type: "loan",
          reference_id: selectedLoanForPayment.id,
          title: "Pembayaran Angsuran Pinjaman",
          description: `Angsuran ke-${selectedScheduleForPayment.installment_no} dari pinjaman ${selectedLoanForPayment.loan_number} sebesar ${fmtCurrency(paymentAmount)}`,
          requested_by: user?.id,
          amount: paymentAmount,
        }),
      }).catch((err) => console.error("Gagal membuat approval:", err));

      // 3. Ambil data loan terbaru (jika API belum mengembalikan updated_loan)
      let updatedLoan: Loan | null = null;
      if (json.data?.updated_loan) {
        updatedLoan = json.data.updated_loan;
      } else {
        const fetchRes = await fetch(`/api/loans/${selectedLoanForPayment.id}`);
        const fetchJson = await fetchRes.json();
        if (fetchJson.error) throw new Error(fetchJson.error);
        updatedLoan = fetchJson.data;
      }

      // 4. Update state dengan data terbaru
      if (updatedLoan) {
        handlePaymentSuccess(updatedLoan);
      }

      // 5. Tutup modal pembayaran
      setShowPaymentModal(false);
      setSelectedLoanForPayment(null);
      setSelectedScheduleForPayment(null);

      // 6. Tampilkan notifikasi sukses
      await Swal.fire({
        icon: "success",
        title: "Pembayaran Berhasil!",
        text: `Angsuran ke-${selectedScheduleForPayment.installment_no} berhasil dicatat.${
          penalty > 0 ? ` Denda: ${fmtCurrency(penalty)}` : ""
        }`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan",
        confirmButtonColor: colors.primary,
      });
    }
  };

  const handlePaymentSuccess = (updatedLoan: Loan) => {
    // Update list loans
    setLoans((prev) =>
      prev.map((l) => (l.id === updatedLoan.id ? updatedLoan : l)),
    );
    // Update selected loan data
    setSelectedLoanData(updatedLoan);
    // Refresh stats & payment status
    void fetchGlobalStats();
    void fetchAllPaymentStatus();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (authLoading || memberLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: colors.primary }}
          />
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Memuat data...
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen p-4 md:p-6 lg:p-8"
      style={{ backgroundColor: colors.background }}
    >
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            className="mb-1 text-xs font-bold uppercase tracking-widest"
            style={{ color: colors.primary }}
          >
            Keuangan Anggota
          </p>
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: colors.textPrimary }}
          >
            Pinjaman
          </h1>
          <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
            {isAdmin || isPengurus
              ? "Kelola semua pengajuan, cicilan, dan riwayat pinjaman seluruh anggota koperasi."
              : "Pantau pengajuan dan riwayat pinjaman Anda."}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => {
              void fetchLoans();
              void fetchGlobalStats();
              void fetchAllPaymentStatus();
            }}
            className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold shadow-sm transition-all hover:shadow-md active:scale-95"
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.surface,
              color: colors.textPrimary,
            }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link href="/dashboard/pinjaman/ajukan">
            <button
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md hover:opacity-90 active:scale-95"
              style={{ backgroundColor: colors.primary }}
            >
              <Plus size={16} />
              <span>Ajukan Pinjaman</span>
            </button>
          </Link>
        </div>
      </div>

      {/* STATS */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Total Pengajuan"
          value={String(globalStats.totalPengajuan)}
          icon={<CreditCard className="text-blue-500" size={20} />}
          subText="Kecuali ditolak"
          loading={statsLoading}
          accent="#3b82f6"
        />
        <StatCard
          label="Total Pokok"
          value={fmtCurrency(globalStats.totalPokokSemua)}
          icon={<Wallet className="text-orange-500" size={20} />}
          subText="Nilai semua pinjaman"
          loading={statsLoading}
          accent="#f97316"
        />
        <StatCard
          label="Total Bunga"
          value={fmtCurrency(globalStats.totalBungaSemua)}
          icon={<TrendingDown className="text-red-500" size={20} />}
          subText="Akumulasi bunga"
          loading={statsLoading}
          accent="#ef4444"
        />
        <StatCard
          label="Total Pembayaran"
          value={fmtCurrency(globalStats.totalPembayaranSemua)}
          icon={<CheckCircle2 className="text-emerald-500" size={20} />}
          subText="Semua pinjaman"
          loading={statsLoading}
          accent="#10b981"
        />
      </div>

      {/* TABEL */}
      <div
        className="overflow-hidden rounded-2xl border shadow-sm"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        {/* Filter bar */}
        <div
          className="border-b p-4 md:p-5"
          style={{ borderColor: colors.border }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold" style={{ color: colors.textPrimary }}>
                  Daftar Pinjaman
                </h3>
                <p
                  className="mt-0.5 text-sm"
                  style={{ color: colors.textSecondary }}
                >
                  {total > 0
                    ? `${total.toLocaleString("id-ID")} data ditemukan`
                    : "Belum ada pinjaman"}
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: colors.textSecondary }}
                  size={15}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    color: colors.textPrimary,
                    borderColor: colors.border,
                    background: colors.background,
                  }}
                  placeholder="Cari no. pinjaman / tujuan..."
                  className="w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-offset-0"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Filter
                size={14}
                style={{ color: colors.textSecondary }}
                className="shrink-0"
              />
              {STATUS_FILTERS.map((s) => {
                const active = selectedStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSelectedStatus(s)}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
                    style={{
                      background: active
                        ? colors.backgroundAccent
                        : colors.background,
                      border: `1px solid ${active ? colors.borderAccent : colors.border}`,
                      color: active ? colors.primary : colors.textSecondary,
                    }}
                  >
                    {s === "Semua" ? "Semua" : (STATUS_LABEL[s] ?? s)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Error */}
        {fetchError && (
          <div
            className="flex items-center gap-3 border-b px-5 py-3.5 text-sm text-red-700"
            style={{ background: "#fff1f2", borderColor: colors.border }}
          >
            <AlertCircle size={15} className="shrink-0" />
            {fetchError}
          </div>
        )}

        {/* ─── DESKTOP TABLE (hidden on mobile) ─── */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] text-left">
            <thead style={{ background: colors.background }}>
              <tr
                className="border-b text-[11px] font-black uppercase tracking-wider"
                style={{
                  borderColor: colors.border,
                  color: colors.textSecondary,
                }}
              >
                <th className="px-5 py-4">No. Pinjaman</th>
                <th className="px-5 py-4">Jumlah</th>
                <th className="px-5 py-4">Bunga & Tenor</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Progress</th>
                <th className="px-5 py-4">Jatuh Tempo</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {/* Loading skeleton */}
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={`sk-${i}`}
                    className="border-b"
                    style={{ borderColor: colors.border }}
                  >
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div
                          className="h-4 animate-pulse rounded"
                          style={{
                            background: colors.border,
                            width: j === 0 ? "80%" : "60%",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading &&
                loans.map((loan) => {
                  const paidPct =
                    loan.total_payment > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (loan.paid_amount / loan.total_payment) * 100,
                          ),
                        )
                      : 0;
                  const paymentStatus = paymentStatusMap[loan.id] ?? {};

                  return (
                    <tr
                      key={loan.id}
                      className="border-b transition-colors hover:bg-black/[0.02]"
                      style={{ borderColor: colors.border }}
                    >
                      <td className="px-5 py-4">
                        <p
                          className="font-mono text-sm font-bold"
                          style={{ color: colors.textPrimary }}
                        >
                          {loan.loan_number}
                        </p>
                        <p
                          className="mt-0.5 flex items-center gap-1 text-xs"
                          style={{ color: colors.textMuted }}
                        >
                          <CalendarDays size={10} />
                          {fmtDate(loan.applied_date)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p
                          className="text-sm font-black"
                          style={{ color: colors.textPrimary }}
                        >
                          {fmtCurrency(loan.amount)}
                        </p>
                        <p
                          className="mt-0.5 text-xs"
                          style={{ color: colors.textMuted }}
                        >
                          Sisa: {fmtCurrency(loan.remaining_amount)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p
                          className="text-sm"
                          style={{ color: colors.textSecondary }}
                        >
                          {fmtPct(loan.interest_rate)}/bln
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: colors.textMuted }}
                        >
                          {loan.term_months} bulan
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={loan.status} />
                      </td>
                      <td className="px-5 py-4">
                        {loan.status === "active" ||
                        loan.status === "completed" ||
                        loan.status === "overdue" ? (
                          <div className="min-w-[80px]">
                            <div className="mb-1 flex justify-between">
                              <span
                                className="text-xs"
                                style={{ color: colors.textMuted }}
                              >
                                {paidPct}%
                              </span>
                            </div>
                            <div
                              className="h-1.5 overflow-hidden rounded-full"
                              style={{ background: colors.border }}
                            >
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${paidPct}%`,
                                  background:
                                    paidPct === 100
                                      ? "#15803d"
                                      : loan.status === "overdue"
                                        ? "#ef4444"
                                        : colors.primary,
                                }}
                              />
                            </div>
                          </div>
                        ) : loan.status === "approved" ? (
                          <span
                            className="text-xs"
                            style={{ color: colors.textSecondary }}
                          >
                            Menunggu pencairan
                          </span>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: colors.textMuted }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {loan.status === "active" ||
                        loan.status === "completed" ||
                        loan.status === "overdue" ? (
                          <p
                            className="text-sm font-medium"
                            style={{ color: colors.textSecondary }}
                          >
                            {fmtDate(loan.due_date)}
                          </p>
                        ) : loan.status === "approved" ? (
                          <p
                            className="text-sm"
                            style={{ color: colors.textMuted }}
                          >
                            Menunggu pencairan
                          </p>
                        ) : (
                          <p
                            className="text-sm"
                            style={{ color: colors.textMuted }}
                          >
                            —
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedLoan(loan)}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-transform hover:scale-105"
                            style={{
                              background: colors.backgroundAccent,
                              color: colors.primary,
                              border: `1px solid ${colors.borderAccent}`,
                            }}
                          >
                            <Eye size={13} /> Detail
                          </button>

                          {(loan.status === "pending" ||
                            loan.status === "completed" ||
                            loan.status === "rejected") && (
                            <button
                              onClick={() => handleDeleteLoan(loan)}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-transform hover:scale-105"
                              style={{
                                background: "#fee2e2",
                                color: "#b91c1c",
                                border: "1px solid #fecaca",
                              }}
                            >
                              <X size={13} /> Hapus
                            </button>
                          )}

                          {loan.status === "approved" &&
                            (isAdmin || isPengurus) && (
                              <button
                                onClick={() => handleDisburse(loan)}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-transform hover:scale-105"
                                style={{
                                  background: "#dbeafe",
                                  color: "#1d4ed8",
                                  border: "1px solid #bfdbfe",
                                }}
                              >
                                <Wallet size={13} /> Cairkan
                              </button>
                            )}

                          {loan.status !== "completed" &&
                            loan.status !== "approved" &&
                            loan.status !== "rejected" &&
                            (isAdmin || isPengurus) &&
                            Object.values(paymentStatus).some(
                              (status) => status !== "paid",
                            ) && (
                              <button
                                onClick={() => handleOpenPayment(loan)}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-transform hover:scale-105"
                                style={{ background: colors.primary }}
                              >
                                <Check size={13} /> Bayar
                              </button>
                            )}

                          {loan.status === "overdue" && (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black"
                              style={{
                                background: "#fee2e2",
                                color: "#b91c1c",
                                borderColor: "#fecaca",
                              }}
                            >
                              <AlertCircle size={11} /> Terlambat
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* ─── MOBILE CARD LIST (hidden on desktop) ─── */}
        <div className="block space-y-3 p-4 md:hidden">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border p-4 animate-pulse"
                style={{ borderColor: colors.border }}
              >
                <div className="mb-3 flex justify-between">
                  <div
                    className="h-4 w-32 rounded"
                    style={{ background: colors.border }}
                  />
                  <div
                    className="h-5 w-16 rounded-full"
                    style={{ background: colors.border }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((j) => (
                    <div
                      key={j}
                      className="h-14 rounded-lg"
                      style={{ background: colors.border }}
                    />
                  ))}
                </div>
              </div>
            ))}

          {!loading &&
            loans.map((loan) => {
              const paymentStatus = paymentStatusMap[loan.id] ?? {};
              const hasUnpaidInstallments = Object.values(paymentStatus).some(
                (status) => status !== "paid",
              );

              return (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  colors={colors}
                  isAdmin={isAdmin}
                  isPengurus={isPengurus}
                  onView={() => setSelectedLoan(loan)}
                  onPay={() => handleOpenPayment(loan)}
                  onDisburse={() => handleDisburse(loan)}
                  onDelete={() => handleDeleteLoan(loan)}
                  hasUnpaidInstallments={hasUnpaidInstallments}
                />
              );
            })}
        </div>

        {/* Empty state */}
        {!loading && loans.length === 0 && !fetchError && (
          <div className="p-12 text-center">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: colors.background }}
            >
              <CreditCard
                size={32}
                className="opacity-30"
                style={{ color: colors.textMuted }}
              />
            </div>
            <p className="font-bold" style={{ color: colors.textPrimary }}>
              Belum ada pinjaman
            </p>
            <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
              {debouncedSearch || selectedStatus !== "Semua"
                ? "Coba ubah filter atau kata kunci pencarian."
                : "Mulai dengan mengajukan pinjaman baru."}
            </p>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div
            className="flex flex-col items-center justify-between gap-3 border-t px-5 py-4 sm:flex-row"
            style={{ borderColor: colors.border }}
          >
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)}{" "}
              dari {total.toLocaleString("id-ID")} data
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40 transition-colors hover:bg-black/5"
                style={{
                  border: `1px solid ${colors.border}`,
                  background: colors.background,
                  color: colors.textPrimary,
                }}
              >
                ← Sebelumnya
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40 transition-colors hover:bg-black/5"
                style={{
                  border: `1px solid ${colors.border}`,
                  background: colors.background,
                  color: colors.textPrimary,
                }}
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modal Pembayaran (dari tabel) ─────────────────────────────────── */}
      {showPaymentModal &&
        selectedLoanForPayment &&
        selectedScheduleForPayment && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div
              className="w-full max-w-md rounded-2xl border shadow-2xl"
              style={{ background: colors.surface, borderColor: colors.border }}
            >
              <div
                className="flex items-start justify-between border-b px-6 py-5"
                style={{ borderColor: colors.border }}
              >
                <div>
                  <h2
                    className="text-xl font-black"
                    style={{ color: colors.textPrimary }}
                  >
                    Pembayaran Angsuran
                  </h2>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: colors.textSecondary }}
                  >
                    Angsuran ke-{selectedScheduleForPayment.installment_no} •{" "}
                    {selectedLoanForPayment.loan_number}
                  </p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-lg p-2 hover:bg-black/5"
                  style={{ color: colors.textSecondary }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 p-6">
                <div>
                  <label
                    className="mb-2 block text-sm font-bold"
                    style={{ color: colors.textPrimary }}
                  >
                    Jumlah Pembayaran (Rp){" "}
                    <span style={{ color: colors.primary }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-100"
                    style={{
                      borderColor: colors.border,
                      background: colors.background,
                      color: colors.textPrimary,
                    }}
                  />
                  <p
                    className="mt-1 text-xs"
                    style={{ color: colors.textMuted }}
                  >
                    Total angsuran:{" "}
                    {fmtCurrency(selectedScheduleForPayment.total_amount)}
                  </p>
                </div>
                <div>
                  <label
                    className="mb-2 block text-sm font-bold"
                    style={{ color: colors.textPrimary }}
                  >
                    Tanggal Pembayaran{" "}
                    <span style={{ color: colors.primary }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-100"
                    style={{
                      borderColor: colors.border,
                      background: colors.background,
                      color: colors.textPrimary,
                    }}
                  />
                </div>
                <div>
                  <label
                    className="mb-2 block text-sm font-bold"
                    style={{ color: colors.textPrimary }}
                  >
                    Keterangan
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Opsional"
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-100"
                    style={{
                      borderColor: colors.border,
                      background: colors.background,
                      color: colors.textPrimary,
                    }}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 rounded-xl px-4 py-3 text-sm font-bold hover:bg-black/5"
                    style={{
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handlePaymentSubmitFromTable}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-transform active:scale-95"
                    style={{ background: colors.primary }}
                  >
                    <Check size={16} /> Bayar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* ─── Modal Detail ────────────────────────────────────────────────────── */}
      {selectedLoan && (
        <LoanModal
          loan={selectedLoanData ?? selectedLoan}
          colors={colors}
          onClose={() => {
            setSelectedLoan(null);
            setSelectedLoanData(null);
            void fetchLoans();
            void fetchGlobalStats();
          }}
          isAdmin={isAdmin}
          isPengurus={isPengurus}
          paymentStatus={paymentStatusMap[selectedLoan.id] ?? {}}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
