"use client";

// app/dashboard/simpanan/[id]/page.tsx
// Detail satu transaksi simpanan berdasarkan ID
// Fetch dari GET /api/savings-transactions/[id]

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Hash,
  Printer,
  AlertCircle,
  Loader2,
  Wallet,
  PiggyBank,
  TrendingUp,
  CheckCircle2,
  XCircle,
  User,
  FileText,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";
import type { SavingsTransaction, SavingsAccount } from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  pokok: "Simpanan Pokok",
  wajib: "Simpanan Wajib",
  sukarela: "Simpanan Sukarela",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function DetailCard({
  label,
  value,
  colors,
  mono,
  full,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${full ? "col-span-full" : ""}`}
      style={{ background: colors.background, borderColor: colors.border }}
    >
      <p className="text-xs mb-1" style={{ color: colors.textMuted }}>
        {label}
      </p>
      <p
        className={`text-sm font-black break-all ${mono ? "font-mono" : ""}`}
        style={{ color: colors.textPrimary }}
      >
        {value || "—"}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HalamanDetailSimpanan() {
  const colors = useColors();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [transaction, setTransaction] = useState<SavingsTransaction | null>(
    null,
  );
  const [account, setAccount] = useState<SavingsAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch transaksi
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    fetch(`/api/savings-transactions/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || json.error)
          throw new Error(json.error ?? "Data tidak ditemukan");
        return json.data as SavingsTransaction;
      })
      .then(async (trx) => {
        setTransaction(trx);

        // Fetch detail rekening juga
        if (trx.savings_account_id) {
          const accRes = await fetch(
            `/api/savings-acoounts/${trx.savings_account_id}`,
          );
          const accJson = await accRes.json();
          if (!accRes.ok || accJson.error) return;
          setAccount(accJson.data as SavingsAccount);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const isSetoran = transaction?.transaction_type === "setoran";

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: colors.background }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: colors.primary }}
          />
          <p
            className="text-sm font-semibold"
            style={{ color: colors.textSecondary }}
          >
            Memuat data transaksi...
          </p>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────

  if (error || !transaction) {
    return (
      <div
        className="min-h-screen p-6 md:p-8"
        style={{ background: colors.background }}
      >
        <Link
          href="/dashboard/simpanan"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold"
          style={{ color: colors.primary }}
        >
          <ArrowLeft size={16} /> Kembali
        </Link>
        <div
          className="max-w-md mx-auto rounded-2xl border p-10 text-center shadow-sm"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <XCircle size={40} className="mx-auto mb-4 text-red-400" />
          <h2
            className="text-lg font-black mb-2"
            style={{ color: colors.textPrimary }}
          >
            Transaksi Tidak Ditemukan
          </h2>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            {error ?? "Data transaksi tidak ditemukan atau telah dihapus."}
          </p>
          <Link href="/dashboard/simpanan">
            <button
              className="mt-6 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: colors.primary }}
            >
              Kembali ke Simpanan
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: colors.background }}
    >
      {/* HEADER */}
      <div className="mb-8">
        <Link
          href="/dashboard/simpanan"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold transition-opacity hover:opacity-70"
          style={{ color: colors.primary }}
        >
          <ArrowLeft size={16} />
          Kembali ke Simpanan
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p
              className="mb-2 text-sm font-semibold"
              style={{ color: colors.primary }}
            >
              Detail Transaksi
            </p>
            <h1
              className="text-2xl font-bold"
              style={{ color: colors.textPrimary }}
            >
              {isSetoran ? "Setoran Simpanan" : "Penarikan Simpanan"}
            </h1>
            <p
              className="mt-1 text-sm font-mono"
              style={{ color: colors.textSecondary }}
            >
              {transaction.reference_number ?? id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/simpanan/${id}/print`)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-transform active:scale-95 self-start"
            style={{ background: colors.primary }}
          >
            <Printer size={17} />
            Cetak Bukti
          </button>
        </div>
      </div>

      {/* HERO CARD - Nominal */}
      <div
        className="mb-6 rounded-2xl p-6 shadow-sm"
        style={{
          background: isSetoran
            ? "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)"
            : "linear-gradient(135deg, #fee2e2 0%, #fff1f2 100%)",
          border: `1px solid ${isSetoran ? "#bbf7d0" : "#fecaca"}`,
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm"
            style={{
              background: isSetoran ? "#15803d" : "#b91c1c",
            }}
          >
            {isSetoran ? (
              <ArrowUp size={28} className="text-white" />
            ) : (
              <ArrowDown size={28} className="text-white" />
            )}
          </div>
          <div>
            <p
              className="text-sm font-bold mb-1"
              style={{ color: isSetoran ? "#15803d" : "#b91c1c" }}
            >
              {isSetoran ? "SETORAN" : "PENARIKAN"}
            </p>
            <p
              className="text-3xl font-black"
              style={{ color: isSetoran ? "#14532d" : "#7f1d1d" }}
            >
              {isSetoran ? "+" : "-"}
              {fmtCurrency(transaction.amount)}
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: isSetoran ? "#166534" : "#991b1b" }}
            >
              {fmtDate(transaction.transaction_date)}
            </p>
          </div>
        </div>

        {/* Saldo sebelum → sesudah */}
        <div
          className="mt-5 flex items-center gap-3 rounded-xl p-4"
          style={{ background: "rgba(255,255,255,0.6)" }}
        >
          <div className="text-center">
            <p
              className="text-xs font-bold mb-1"
              style={{ color: colors.textMuted }}
            >
              Saldo Sebelum
            </p>
            <p
              className="text-base font-black"
              style={{ color: colors.textPrimary }}
            >
              {fmtCurrency(transaction.balance_before)}
            </p>
          </div>
          <div className="flex-1 h-px" style={{ background: colors.border }} />
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"
            style={{ background: isSetoran ? "#15803d" : "#b91c1c" }}
          >
            {isSetoran ? "+" : "−"}
          </div>
          <div className="flex-1 h-px" style={{ background: colors.border }} />
          <div className="text-center">
            <p
              className="text-xs font-bold mb-1"
              style={{ color: colors.textMuted }}
            >
              Saldo Sesudah
            </p>
            <p
              className="text-base font-black"
              style={{ color: colors.textPrimary }}
            >
              {fmtCurrency(transaction.balance_after)}
            </p>
          </div>
        </div>
      </div>

      {/* DETAIL GRID */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div
          className="rounded-xl border p-6 shadow-sm"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <h2 className="font-black mb-5" style={{ color: colors.textPrimary }}>
            Informasi Transaksi
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailCard
              label="No. Referensi"
              value={transaction.reference_number ?? "—"}
              colors={colors}
              mono
            />
            <DetailCard
              label="Tanggal Transaksi"
              value={fmtDate(transaction.transaction_date)}
              colors={colors}
            />
            <DetailCard
              label="Jenis Transaksi"
              value={isSetoran ? "Setoran" : "Penarikan"}
              colors={colors}
            />
            <DetailCard
              label="Nominal"
              value={fmtCurrency(transaction.amount)}
              colors={colors}
            />
            <DetailCard
              label="Saldo Sebelum"
              value={fmtCurrency(transaction.balance_before)}
              colors={colors}
            />
            <DetailCard
              label="Saldo Sesudah"
              value={fmtCurrency(transaction.balance_after)}
              colors={colors}
            />
            <DetailCard
              label="Dicatat Pada"
              value={fmtDateTime(transaction.created_at)}
              colors={colors}
            />
            <DetailCard
              label="ID Transaksi"
              value={transaction.id}
              colors={colors}
              mono
            />
            {transaction.description && (
              <DetailCard
                label="Keterangan"
                value={transaction.description}
                colors={colors}
                full
              />
            )}
          </div>
        </div>

        {/* Sidebar: info rekening */}
        <aside className="space-y-5">
          {account && (
            <div
              className="rounded-xl border p-5 shadow-sm"
              style={{ borderColor: colors.border, background: colors.surface }}
            >
              <h3
                className="text-sm font-black mb-4 flex items-center gap-2"
                style={{ color: colors.textPrimary }}
              >
                <Wallet size={17} style={{ color: colors.primary }} />
                Rekening Simpanan
              </h3>
              <div className="space-y-3">
                <InfoRow
                  label="No. Rekening"
                  value={account.account_number}
                  colors={colors}
                  mono
                />
                <InfoRow
                  label="Jenis"
                  value={
                    ACCOUNT_TYPE_LABEL[account.account_type] ??
                    account.account_type
                  }
                  colors={colors}
                />
                <InfoRow
                  label="Saldo Saat Ini"
                  value={fmtCurrency(Number(account.balance))}
                  colors={colors}
                />
                <InfoRow
                  label="Status"
                  value={account.status === "active" ? "Aktif" : account.status}
                  colors={colors}
                />
                <InfoRow
                  label="Dibuka"
                  value={fmtDate(account.opened_date)}
                  colors={colors}
                />
              </div>
            </div>
          )}

          {/* Status verifikasi */}
          <div
            className="rounded-xl border p-5 shadow-sm"
            style={{ borderColor: colors.border, background: colors.surface }}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
              <div>
                <p
                  className="text-sm font-black"
                  style={{ color: colors.textPrimary }}
                >
                  Transaksi Terverifikasi
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: colors.textMuted }}
                >
                  Dicatat pada {fmtDateTime(transaction.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Tombol cetak */}
          <button
            onClick={() => router.push(`/dashboard/simpanan/${id}/print`)}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-transform active:scale-95"
            style={{ background: colors.primary }}
          >
            <Printer size={17} />
            Cetak Bukti Transaksi
          </button>

          <Link href="/dashboard/simpanan">
            <button
              className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition-colors"
              style={{
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
                background: colors.surface,
              }}
            >
              Kembali ke Daftar
            </button>
          </Link>
        </aside>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  colors,
  mono,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs shrink-0" style={{ color: colors.textMuted }}>
        {label}
      </span>
      <span
        className={`text-xs font-bold text-right break-all ${mono ? "font-mono" : ""}`}
        style={{ color: colors.textPrimary }}
      >
        {value}
      </span>
    </div>
  );
}
