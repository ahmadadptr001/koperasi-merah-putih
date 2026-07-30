"use client";

// app/dashboard/persetujuan/page.tsx
// Halaman untuk approve/reject pinjaman (status pending)

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  X,
  Eye,
  User,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import type { Loan } from "@/lib/types";
import Swal from "sweetalert2";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  active: "Aktif",
  completed: "Lunas",
  overdue: "Terlambat",
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
    rejected: {
      bg: "#fee2e2",
      text: "#b91c1c",
      border: "#fecaca",
      icon: <X size={11} />,
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
  };
  const s = cfg[status] ?? {
    bg: "#f3f4f6",
    text: "#6b7280",
    border: "#e5e7eb",
    icon: null,
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {s.icon}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ─── Detail Item ──────────────────────────────────────────────────────────────

function DetailItem({
  label,
  value,
  colors,
}: {
  label: string;
  value: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: colors.background, borderColor: colors.border }}
    >
      <p className="text-xs" style={{ color: colors.textMuted }}>
        {label}
      </p>
      <div
        className="mt-1 break-words text-sm font-black"
        style={{ color: colors.textPrimary }}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

// ─── Modal Detail Pinjaman ────────────────────────────────────────────────────

function LoanModal({
  loan,
  colors,
  onClose,
}: {
  loan: Loan;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
}) {
  const [userData, setUserData] = useState<{
    full_name: string;
    email: string;
    role: string;
  } | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    if (!loan.requested_by) {
      setUserData(null);
      return;
    }

    setUserLoading(true);
    fetch(`/api/users/${loan.requested_by}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) {
          setUserData({
            full_name: json.data.full_name || "Unknown",
            email: json.data.email || "-",
            role: json.data.role || "-",
          });
        } else {
          setUserData(null);
        }
      })
      .catch(() => setUserData(null))
      .finally(() => setUserLoading(false));
  }, [loan.requested_by]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border shadow-xl"
        style={{ background: colors.surface, borderColor: colors.border }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-start justify-between border-b p-6"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <div>
            <div className="mb-1 flex items-center gap-2">
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
            className="rounded-lg p-2 hover:bg-black/5"
            style={{ color: colors.textSecondary }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Grid detail */}
        <div className="grid gap-3 p-6 sm:grid-cols-2">
          <DetailItem
            label="Jumlah Pinjaman"
            value={fmtCurrency(loan.amount)}
            colors={colors}
          />
          <DetailItem
            label="Bunga / Bulan"
            value={`${loan.interest_rate}%`}
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
            label="Tanggal Pengajuan"
            value={fmtDate(loan.applied_date)}
            colors={colors}
          />
          <DetailItem
            label="Diajukan oleh"
            value={
              userLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Memuat...</span>
                </span>
              ) : userData ? (
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold">{userData.full_name}</span>
                  <span className="text-xs text-muted">{userData.email}</span>
                  <span className="text-xs text-muted">
                    Role: {userData.role}
                  </span>
                </div>
              ) : (
                loan.requested_by || "—"
              )
            }
            colors={colors}
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
        </div>

        {/* Actions */}
        <div
          className="sticky bottom-0 flex justify-end gap-3 border-t p-5"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-bold"
            style={{
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HalamanPersetujuan() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAdmin, isPengurus, loading: authLoading } = useAuth();

  // ── Proteksi akses: hanya admin/pengurus ──────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin && !isPengurus) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAdmin, isPengurus, router]);

  // Data pinjaman pending
  const [loans, setLoans] = useState<Loan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modal
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // ─── Debounce search ─────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ─── Fetch pinjaman pending ─────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin && !isPengurus) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAdmin, isPengurus, router]);

  const fetchPendingLoans = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // Endpoint /api/loans hanya mengenal member_id/status/search/limit/offset.
      // `reference_type` dan `user_id` sebelumnya dikirim ke sini padahal itu
      // parameter tabel approvals — diabaikan server dan menyesatkan pembaca.
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        status: "pending",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

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
  }, [page, debouncedSearch]);

  useEffect(() => {
    void fetchPendingLoans();
  }, [fetchPendingLoans]);

  // ─── Handle Approve ──────────────────────────────────────────────────────────

  const handleApprove = async (loan: Loan) => {
    if (!user) {
      await Swal.fire({
        icon: "error",
        title: "Anda belum login",
        text: "Silakan login kembali.",
        confirmButtonColor: colors.primary,
      });
      return;
    }

    const result = await Swal.fire({
      title: "Setujui Pinjaman?",
      html: `
        <div style="text-align:left; font-size:14px; line-height:1.8">
          <p><b>No. Pinjaman:</b> ${loan.loan_number}</p>
          <p><b>Jumlah:</b> ${fmtCurrency(loan.amount)}</p>
          <p><b>Tenor:</b> ${loan.term_months} bulan</p>
        </div>
        <p style="margin-top:8px; font-size:12px; color:#64748b">
          Pinjaman akan disetujui dan status berubah menjadi 'approved'.
        </p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: colors.primary,
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Setujui",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/loans/${loan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          approved_by: user.id,
          notes: "Disetujui oleh pengurus",
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error)
        throw new Error(json.error ?? "Gagal menyetujui pinjaman");

      await Swal.fire({
        icon: "success",
        title: "Pinjaman Disetujui",
        text: `Pinjaman ${loan.loan_number} berhasil disetujui.`,
        timer: 1500,
        showConfirmButton: false,
      });

      void fetchPendingLoans();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan",
        confirmButtonColor: colors.primary,
      });
    }
  };

  // ─── Handle Reject ───────────────────────────────────────────────────────────

  const handleReject = async (loan: Loan) => {
    if (!user) {
      await Swal.fire({
        icon: "error",
        title: "Anda belum login",
        text: "Silakan login kembali.",
        confirmButtonColor: colors.primary,
      });
      return;
    }

    const result = await Swal.fire({
      title: "Tolak Pinjaman?",
      html: `
        <div style="text-align:left; font-size:14px; line-height:1.8">
          <p><b>No. Pinjaman:</b> ${loan.loan_number}</p>
          <p><b>Jumlah:</b> ${fmtCurrency(loan.amount)}</p>
        </div>
        <p style="margin-top:8px; font-size:12px; color:#64748b">
          Pinjaman akan ditolak dan status berubah menjadi 'rejected'.
        </p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Tolak",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/loans/${loan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          reviewed_by: user.id,
          notes: "Ditolak oleh pengurus",
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error)
        throw new Error(json.error ?? "Gagal menolak pinjaman");

      await Swal.fire({
        icon: "success",
        title: "Pinjaman Ditolak",
        text: `Pinjaman ${loan.loan_number} berhasil ditolak.`,
        timer: 1500,
        showConfirmButton: false,
      });

      void fetchPendingLoans();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan",
        confirmButtonColor: colors.primary,
      });
    }
  };

  // ─── Loading awal ─────────────────────────────────────────────────────────────

  if (authLoading || (!isAdmin && !isPengurus)) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: colors.primary }}
        />
      </div>
    );
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: colors.background }}
    >
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p
            className="mb-2 text-sm font-semibold"
            style={{ color: colors.primary }}
          >
            Workflow Persetujuan
          </p>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.textPrimary }}
          >
            Persetujuan Pinjaman
          </h1>
          <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
            Kelola pengajuan pinjaman yang perlu disetujui oleh pengurus.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => void fetchPendingLoans()}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-transform active:scale-95"
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.surface,
              color: colors.textPrimary,
            }}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* FILTER */}
      <div
        className="mb-6 rounded-xl border p-4 shadow-sm"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search
              className="absolute left-3 top-2.5"
              size={16}
              style={{ color: colors.textSecondary }}
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari no. pinjaman / tujuan..."
              className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-red-100"
              style={{
                borderColor: colors.border,
                background: colors.background,
                color: colors.textPrimary,
              }}
            />
          </div>
        </div>
      </div>

      {/* TABEL */}
      <div
        className="overflow-hidden rounded-xl border shadow-sm"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead style={{ background: colors.background }}>
              <tr
                className="border-b text-[12px] font-black uppercase tracking-wider"
                style={{
                  borderColor: colors.border,
                  color: colors.textSecondary,
                }}
              >
                <th className="px-6 py-4">No. Pinjaman</th>
                <th className="px-6 py-4">Jumlah</th>
                <th className="px-6 py-4">Tenor</th>
                <th className="px-6 py-4">Diajukan oleh</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4 text-right">Aksi</th>
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
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-5">
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

              {/* Data rows */}
              {!loading &&
                loans.map((loan) => (
                  <tr
                    key={loan.id}
                    className="border-b transition-colors hover:bg-black/5"
                    style={{ borderColor: colors.border }}
                  >
                    <td className="px-6 py-4">
                      <p
                        className="font-mono text-sm font-bold"
                        style={{ color: colors.textPrimary }}
                      >
                        {loan.loan_number}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className="text-sm font-black"
                        style={{ color: colors.textPrimary }}
                      >
                        {fmtCurrency(loan.amount)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className="text-sm"
                        style={{ color: colors.textSecondary }}
                      >
                        {loan.term_months} bulan
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className="text-sm"
                        style={{ color: colors.textSecondary }}
                      >
                        {loan.requested_by || "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className="text-sm"
                        style={{ color: colors.textSecondary }}
                      >
                        {fmtDate(loan.applied_date)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedLoan(loan)}
                          className="rounded-lg p-2 transition-transform hover:scale-105"
                          style={{
                            background: colors.background,
                            border: `1px solid ${colors.border}`,
                            color: colors.textPrimary,
                          }}
                          title="Lihat detail"
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          onClick={() => handleApprove(loan)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-transform hover:scale-105"
                          style={{
                            background: "#dcfce7",
                            color: "#15803d",
                            border: "1px solid #bbf7d0",
                          }}
                        >
                          <Check size={15} /> Setujui
                        </button>
                        <button
                          onClick={() => handleReject(loan)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-transform hover:scale-105"
                          style={{
                            background: "#fee2e2",
                            color: "#b91c1c",
                            border: "1px solid #fecaca",
                          }}
                        >
                          <X size={15} /> Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {!loading && loans.length === 0 && !fetchError && (
          <div className="p-12 text-center">
            <Clock
              size={40}
              className="mx-auto mb-3 opacity-30"
              style={{ color: colors.textMuted }}
            />
            <p className="font-bold" style={{ color: colors.textPrimary }}>
              Tidak ada pengajuan pinjaman yang perlu disetujui.
            </p>
            <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
              {debouncedSearch
                ? "Coba ubah kata kunci pencarian."
                : "Semua pengajuan sudah diproses."}
            </p>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div
            className="flex items-center justify-between border-t px-6 py-4"
            style={{ borderColor: colors.border }}
          >
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Menampilkan {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, total)} dari{" "}
              {total.toLocaleString("id-ID")} pengajuan
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg px-3 py-1.5 text-sm font-bold disabled:opacity-40"
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
                className="rounded-lg px-3 py-1.5 text-sm font-bold disabled:opacity-40"
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

      {/* Modal */}
      {selectedLoan && (
        <LoanModal
          loan={selectedLoan}
          colors={colors}
          onClose={() => setSelectedLoan(null)}
        />
      )}
    </div>
  );
}
