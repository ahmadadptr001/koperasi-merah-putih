"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Filter,
  Landmark,
  PiggyBank,
  ReceiptText,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
  Loader2,
  AlertCircle,
  Printer,
  FileText,
  RefreshCw,
  X,
} from "lucide-react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import type { FinancialTransaction, Loan, SavingsAccount } from "@/lib/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatMonth = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
};

const formatCurrencyRaw = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

// ─────────────────────────────────────────────────────────────────────────────
// Fungsi untuk mendapatkan range tanggal berdasarkan periode
// ─────────────────────────────────────────────────────────────────────────────

function getDateRange(
  period: string,
  customStart?: string,
  customEnd?: string,
): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let from = new Date(to);

  if (customStart && customEnd) {
    return { from: new Date(customStart), to: new Date(customEnd) };
  }

  switch (period) {
    case "Bulanan":
      from.setMonth(to.getMonth() - 1);
      break;
    case "Triwulan":
      from.setMonth(to.getMonth() - 3);
      break;
    case "Semester":
      from.setMonth(to.getMonth() - 6);
      break;
    case "Tahunan":
      from.setFullYear(to.getFullYear() - 1);
      break;
    default:
      from.setMonth(to.getMonth() - 6);
  }
  return { from, to };
}

// ─────────────────────────────────────────────────────────────────────────────
// Group transaksi per bulan untuk chart
// ─────────────────────────────────────────────────────────────────────────────

function groupByMonth(transactions: FinancialTransaction[]): {
  labels: string[];
  pemasukan: number[];
  pengeluaran: number[];
  netto: number[];
} {
  const months: Record<string, { pemasukan: number; pengeluaran: number }> = {};
  transactions.forEach((tx) => {
    const month = tx.transaction_date.slice(0, 7);
    if (!months[month]) months[month] = { pemasukan: 0, pengeluaran: 0 };
    if (tx.transaction_type === "pemasukan")
      months[month].pemasukan += Number(tx.amount);
    else if (tx.transaction_type === "pengeluaran")
      months[month].pengeluaran += Number(tx.amount);
  });
  const sorted = Object.keys(months).sort();
  return {
    labels: sorted.map((m) => formatMonth(m + "-01")),
    pemasukan: sorted.map((m) => months[m].pemasukan),
    pengeluaran: sorted.map((m) => months[m].pengeluaran),
    netto: sorted.map((m) => months[m].pemasukan - months[m].pengeluaran),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Komposisi pemasukan berdasarkan kategori
// ─────────────────────────────────────────────────────────────────────────────

function getCategoryComposition(transactions: FinancialTransaction[]) {
  const categories: Record<string, number> = {};
  transactions
    .filter((t) => t.transaction_type === "pemasukan")
    .forEach((t) => {
      const cat = t.category;
      categories[cat] = (categories[cat] || 0) + Number(t.amount);
    });
  const total = Object.values(categories).reduce((a, b) => a + b, 0);
  const categoryMap: Record<string, { label: string; color: string }> = {
    simpanan_pokok: { label: "Simpanan Pokok", color: "#b7102a" },
    simpanan_wajib: { label: "Simpanan Wajib", color: "#2563eb" },
    simpanan_sukarela: { label: "Simpanan Sukarela", color: "#10b981" },
    angsuran_pinjaman: { label: "Jasa Pinjaman", color: "#f59e0b" },
    lain_lain: { label: "Lain-lain", color: "#6b7280" },
  };
  return Object.entries(categories).map(([key, amount]) => ({
    label: categoryMap[key]?.label || key,
    value: total > 0 ? Math.round((amount / total) * 100) : 0,
    amount: formatCurrency(amount),
    color: categoryMap[key]?.color || "#6b7280",
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Escape value CSV — pastikan aman untuk Excel/spreadsheet
// ─────────────────────────────────────────────────────────────────────────────

function escapeCSV(value: string | number): string {
  const str = String(value ?? "");
  // Jika mengandung koma, newline, atau tanda kutip — bungkus dengan kutip ganda
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─────────────────────────────────────────────────────────────────────────────
// Komponen StatCard
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  trend: string;
  icon: any;
  color: string;
}) {
  const colors = useColors();
  return (
    <div
      className="rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md"
      style={{ borderColor: colors.border, background: colors.surface }}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p
            className="text-sm font-medium"
            style={{ color: colors.textSecondary }}
          >
            {label}
          </p>
          <h3
            className="mt-1 text-2xl font-black"
            style={{ color: colors.textPrimary }}
          >
            {value}
          </h3>
        </div>
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: `${color}16`, color }}
        >
          <Icon size={22} />
        </div>
      </div>
      <p className="text-sm font-semibold" style={{ color }}>
        {trend}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Print Preview Modal — Gaya Pemerintah / Instansi Resmi
// ─────────────────────────────────────────────────────────────────────────────

interface PrintData {
  periodeLabel: string;
  tanggalCetak: string;
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoBersih: number;
  danaCadangan: number;
  loanStats: {
    totalPinjaman: number;
    totalPokokPinjaman: number;
    totalBunga: number;
    totalTerbayar: number;
    sisaTagihan: number;
    aktif: number;
    lunas: number;
    overdue: number;
    pending: number;
  };
  savingsStats: {
    totalSaldo: number;
    pokok: number;
    wajib: number;
    sukarela: number;
    jumlahRekening: number;
  };
  transactions: FinancialTransaction[];
}

function PrintPreviewModal({
  data,
  onClose,
}: {
  data: PrintData;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Laporan Keuangan Koperasi</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      color: #000;
      background: #fff;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 20mm 20mm 15mm 25mm;
    }
    /* Kop surat */
    .kop { display: flex; align-items: center; gap: 16px; padding-bottom: 10px; border-bottom: 3px double #000; margin-bottom: 4px; }
    .kop-logo { width: 70px; height: 70px; border: 2px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; flex-shrink: 0; }
    .kop-text { flex: 1; text-align: center; }
    .kop-text .instansi { font-size: 15pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .kop-text .alamat { font-size: 9pt; margin-top: 2px; }
    .kop-sub { border-bottom: 1.5px solid #000; margin-bottom: 18px; padding-bottom: 3px; }
    /* Judul laporan */
    .judul-wrapper { text-align: center; margin-bottom: 16px; }
    .judul { font-size: 14pt; font-weight: bold; text-transform: uppercase; text-decoration: underline; letter-spacing: 0.5px; }
    .sub-judul { font-size: 11pt; margin-top: 4px; }
    .nomor-surat { font-size: 10pt; margin-top: 2px; }
    /* Section header */
    .section-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 18px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px; }
    /* Tabel standar */
    table { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-bottom: 14px; }
    th { background: #e8e8e8; font-weight: bold; text-align: left; padding: 5px 8px; border: 1px solid #555; }
    td { padding: 4px 8px; border: 1px solid #aaa; vertical-align: top; }
    td.num { text-align: right; }
    td.center { text-align: center; }
    tr.total-row td { font-weight: bold; background: #f5f5f5; }
    /* Ringkasan keuangan */
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
    .summary-item { display: flex; justify-content: space-between; padding: 4px 8px; border: 1px solid #aaa; font-size: 10.5pt; }
    .summary-item:nth-child(odd) { background: #fafafa; }
    .summary-label { font-weight: normal; }
    .summary-value { font-weight: bold; }
    /* Status badge (text only untuk print) */
    .badge-aktif::before { content: "Aktif"; }
    .badge-lunas::before { content: "Lunas"; }
    .badge-overdue::before { content: "Terlambat"; font-weight: bold; }
    .badge-pending::before { content: "Menunggu"; }
    /* TTD section */
    .ttd-section { margin-top: 32px; display: flex; justify-content: flex-end; }
    .ttd-box { text-align: center; width: 200px; }
    .ttd-box .ttd-place { font-size: 11pt; }
    .ttd-box .ttd-space { height: 64px; }
    .ttd-box .ttd-name { font-weight: bold; font-size: 11pt; text-decoration: underline; }
    .ttd-box .ttd-jabatan { font-size: 10pt; }
    /* Footer */
    .footer { margin-top: 24px; border-top: 1px solid #aaa; padding-top: 8px; font-size: 9pt; color: #555; text-align: center; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { margin: 0; padding: 15mm 18mm 12mm 22mm; }
    }
  </style>
</head>
<body>
  ${printContent}
</body>
</html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

  const today = new Date();
  const todayStr = today.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const nomorSurat = `${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}/KOP/LAP-KEU`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-8 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="fixed left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-gray-100 px-6 py-3 shadow">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-gray-600" />
          <span className="font-semibold text-gray-700">
            Pratinjau Cetak — Gaya Dokumen Resmi
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-800 active:scale-95"
          >
            <Printer size={16} /> Cetak / Simpan PDF
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            <X size={16} /> Tutup
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div
        className="mt-16 w-full max-w-4xl rounded-lg bg-white shadow-2xl ring-1 ring-black/10"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <div ref={printRef}>
          {/* ── KOP SURAT ─────────────────────────────────────────────── */}
          <div className="page" style={{ padding: "40px 48px 32px 56px" }}>
            {/* Kop */}
            <div
              className="kop"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                paddingBottom: 10,
                borderBottom: "3px double #000",
                marginBottom: 3,
              }}
            >
              <div
                style={{
                  width: 70,
                  height: 70,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: "bold",
                  flexShrink: 0,
                  color: "#000",
                }}
              >
                <img
                  src="/logo-kabupaten-konawe.png"
                  alt="logo kabupaten konawe"
                  style={{
                    width: "60px",
                    height: "auto",
                    objectFit: "contain",
                  }}
                />
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  KOPERASI SIMPAN PINJAM SEJAHTERA BERSAMA
                </div>
                <div style={{ fontSize: 9, marginTop: 2, color: "#333" }}>
                  Jl. Raya Koperasi No. 01, Kecamatan Sejahtera, Kabupaten
                  Makmur — Telp. (021) 000-0000
                </div>
                <div style={{ fontSize: 9, color: "#333" }}>
                  Email: kopsejahtera@example.co.id — NPWP: 00.000.000.0-000.000
                </div>
              </div>
            </div>
            <div
              style={{ borderBottom: "1.5px solid #000", marginBottom: 18 }}
            />

            {/* Judul */}
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  textDecoration: "underline",
                  letterSpacing: 0.5,
                }}
              >
                LAPORAN KEUANGAN KOPERASI
              </div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                Periode: {data.periodeLabel}
              </div>
              <div style={{ fontSize: 10, marginTop: 2, color: "#555" }}>
                Nomor: {nomorSurat}
              </div>
            </div>

            {/* ── I. RINGKASAN KEUANGAN ─────────────────────────────── */}
            <div
              style={{
                fontSize: 12,
                fontWeight: "bold",
                textTransform: "uppercase",
                marginTop: 18,
                marginBottom: 8,
                borderBottom: "1px solid #000",
                paddingBottom: 3,
              }}
            >
              I. Ringkasan Keuangan
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "10.5pt",
                marginBottom: 14,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      background: "#e8e8e8",
                      fontWeight: "bold",
                      textAlign: "left",
                      padding: "5px 8px",
                      border: "1px solid #555",
                      width: "5%",
                    }}
                  >
                    No.
                  </th>
                  <th
                    style={{
                      background: "#e8e8e8",
                      fontWeight: "bold",
                      textAlign: "left",
                      padding: "5px 8px",
                      border: "1px solid #555",
                    }}
                  >
                    Uraian
                  </th>
                  <th
                    style={{
                      background: "#e8e8e8",
                      fontWeight: "bold",
                      textAlign: "right",
                      padding: "5px 8px",
                      border: "1px solid #555",
                    }}
                  >
                    Jumlah (Rp)
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["1", "Total Pemasukan", data.totalPemasukan],
                  ["2", "Total Pengeluaran", data.totalPengeluaran],
                  ["3", "Saldo Bersih (Surplus/Defisit)", data.saldoBersih],
                  [
                    "4",
                    "Dana Cadangan (Total Simpanan Anggota)",
                    data.danaCadangan,
                  ],
                ].map(([no, label, val]) => (
                  <tr key={String(no)}>
                    <td
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #aaa",
                        textAlign: "center",
                      }}
                    >
                      {no}
                    </td>
                    <td
                      style={{ padding: "4px 8px", border: "1px solid #aaa" }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #aaa",
                        textAlign: "right",
                      }}
                    >
                      {formatCurrency(Number(val))}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "#f0f0f0" }}>
                  <td
                    colSpan={2}
                    style={{
                      padding: "5px 8px",
                      border: "1px solid #555",
                      fontWeight: "bold",
                    }}
                  >
                    TOTAL ASET KOPERASI (Saldo + Dana Cadangan)
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      border: "1px solid #555",
                      fontWeight: "bold",
                      textAlign: "right",
                    }}
                  >
                    {formatCurrency(data.saldoBersih + data.danaCadangan)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ── II. LAPORAN PINJAMAN ─────────────────────────────── */}
            <div
              style={{
                fontSize: 12,
                fontWeight: "bold",
                textTransform: "uppercase",
                marginTop: 18,
                marginBottom: 8,
                borderBottom: "1px solid #000",
                paddingBottom: 3,
              }}
            >
              II. Laporan Pinjaman
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "10.5pt",
                marginBottom: 14,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      background: "#e8e8e8",
                      fontWeight: "bold",
                      textAlign: "left",
                      padding: "5px 8px",
                      border: "1px solid #555",
                      width: "5%",
                    }}
                  >
                    No.
                  </th>
                  <th
                    style={{
                      background: "#e8e8e8",
                      fontWeight: "bold",
                      textAlign: "left",
                      padding: "5px 8px",
                      border: "1px solid #555",
                    }}
                  >
                    Uraian
                  </th>
                  <th
                    style={{
                      background: "#e8e8e8",
                      fontWeight: "bold",
                      textAlign: "right",
                      padding: "5px 8px",
                      border: "1px solid #555",
                    }}
                  >
                    Nilai
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "1",
                    "Jumlah Pinjaman (Total Akad)",
                    `${data.loanStats.totalPinjaman} pinjaman`,
                  ],
                  [
                    "2",
                    "Total Pokok Pinjaman",
                    formatCurrency(data.loanStats.totalPokokPinjaman),
                  ],
                  [
                    "3",
                    "Total Bunga/Jasa",
                    formatCurrency(data.loanStats.totalBunga),
                  ],
                  [
                    "4",
                    "Total Sudah Terbayar",
                    formatCurrency(data.loanStats.totalTerbayar),
                  ],
                  [
                    "5",
                    "Sisa Tagihan",
                    formatCurrency(data.loanStats.sisaTagihan),
                  ],
                  ["6", "Pinjaman Aktif", `${data.loanStats.aktif} pinjaman`],
                  ["7", "Pinjaman Lunas", `${data.loanStats.lunas} pinjaman`],
                  [
                    "8",
                    "Pinjaman Terlambat (Overdue)",
                    `${data.loanStats.overdue} pinjaman`,
                  ],
                  [
                    "9",
                    "Pinjaman Menunggu Persetujuan",
                    `${data.loanStats.pending} pinjaman`,
                  ],
                ].map(([no, label, val]) => (
                  <tr
                    key={String(no)}
                    style={{
                      background: Number(no) % 2 === 0 ? "#fafafa" : "#fff",
                    }}
                  >
                    <td
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #aaa",
                        textAlign: "center",
                      }}
                    >
                      {no}
                    </td>
                    <td
                      style={{ padding: "4px 8px", border: "1px solid #aaa" }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #aaa",
                        textAlign: "right",
                      }}
                    >
                      {val}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── III. LAPORAN SIMPANAN ─────────────────────────────── */}
            <div
              style={{
                fontSize: 12,
                fontWeight: "bold",
                textTransform: "uppercase",
                marginTop: 18,
                marginBottom: 8,
                borderBottom: "1px solid #000",
                paddingBottom: 3,
              }}
            >
              III. Laporan Simpanan Anggota
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "10.5pt",
                marginBottom: 14,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      background: "#e8e8e8",
                      fontWeight: "bold",
                      textAlign: "left",
                      padding: "5px 8px",
                      border: "1px solid #555",
                      width: "5%",
                    }}
                  >
                    No.
                  </th>
                  <th
                    style={{
                      background: "#e8e8e8",
                      fontWeight: "bold",
                      textAlign: "left",
                      padding: "5px 8px",
                      border: "1px solid #555",
                    }}
                  >
                    Jenis Simpanan
                  </th>
                  <th
                    style={{
                      background: "#e8e8e8",
                      fontWeight: "bold",
                      textAlign: "right",
                      padding: "5px 8px",
                      border: "1px solid #555",
                    }}
                  >
                    Total Saldo (Rp)
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["1", "Simpanan Pokok", data.savingsStats.pokok],
                  ["2", "Simpanan Wajib", data.savingsStats.wajib],
                  ["3", "Simpanan Sukarela", data.savingsStats.sukarela],
                ].map(([no, label, val]) => (
                  <tr
                    key={String(no)}
                    style={{
                      background: Number(no) % 2 === 0 ? "#fafafa" : "#fff",
                    }}
                  >
                    <td
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #aaa",
                        textAlign: "center",
                      }}
                    >
                      {no}
                    </td>
                    <td
                      style={{ padding: "4px 8px", border: "1px solid #aaa" }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #aaa",
                        textAlign: "right",
                      }}
                    >
                      {formatCurrency(Number(val))}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "#f0f0f0" }}>
                  <td
                    colSpan={2}
                    style={{
                      padding: "5px 8px",
                      border: "1px solid #555",
                      fontWeight: "bold",
                    }}
                  >
                    TOTAL SIMPANAN SELURUH ANGGOTA
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      border: "1px solid #555",
                      fontWeight: "bold",
                      textAlign: "right",
                    }}
                  >
                    {formatCurrency(data.savingsStats.totalSaldo)}
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={2}
                    style={{ padding: "4px 8px", border: "1px solid #aaa" }}
                  >
                    Jumlah Rekening Aktif
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      border: "1px solid #aaa",
                      textAlign: "right",
                    }}
                  >
                    {data.savingsStats.jumlahRekening} rekening
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ── IV. DETAIL TRANSAKSI (max 20 baris) ────────────────── */}
            <div
              style={{
                fontSize: 12,
                fontWeight: "bold",
                textTransform: "uppercase",
                marginTop: 18,
                marginBottom: 8,
                borderBottom: "1px solid #000",
                paddingBottom: 3,
              }}
            >
              IV. Detail Transaksi (20 Terbaru)
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "9.5pt",
                marginBottom: 14,
              }}
            >
              <thead>
                <tr>
                  {[
                    "No.",
                    "ID Transaksi",
                    "Tanggal",
                    "Kategori",
                    "Keterangan",
                    "Jenis",
                    "Nominal (Rp)",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        background: "#e8e8e8",
                        fontWeight: "bold",
                        textAlign: "left",
                        padding: "4px 6px",
                        border: "1px solid #555",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.transactions.slice(0, 20).map((tx, idx) => (
                  <tr
                    key={tx.id}
                    style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}
                  >
                    <td
                      style={{
                        padding: "3px 6px",
                        border: "1px solid #ccc",
                        textAlign: "center",
                      }}
                    >
                      {idx + 1}
                    </td>
                    <td
                      style={{
                        padding: "3px 6px",
                        border: "1px solid #ccc",
                        fontFamily: "monospace",
                        fontSize: "8.5pt",
                      }}
                    >
                      {tx.id.slice(0, 8)}
                    </td>
                    <td
                      style={{
                        padding: "3px 6px",
                        border: "1px solid #ccc",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(tx.transaction_date)}
                    </td>
                    <td
                      style={{ padding: "3px 6px", border: "1px solid #ccc" }}
                    >
                      {tx.category}
                    </td>
                    <td
                      style={{ padding: "3px 6px", border: "1px solid #ccc" }}
                    >
                      {tx.description || "-"}
                    </td>
                    <td
                      style={{
                        padding: "3px 6px",
                        border: "1px solid #ccc",
                        textAlign: "center",
                        fontWeight: "bold",
                        color:
                          tx.transaction_type === "pemasukan"
                            ? "#166534"
                            : "#991b1b",
                      }}
                    >
                      {tx.transaction_type === "pemasukan"
                        ? "Pemasukan"
                        : "Pengeluaran"}
                    </td>
                    <td
                      style={{
                        padding: "3px 6px",
                        border: "1px solid #ccc",
                        textAlign: "right",
                        fontWeight: "bold",
                      }}
                    >
                      {tx.transaction_type === "pemasukan" ? "+" : "-"}
                      {formatCurrency(Number(tx.amount))}
                    </td>
                  </tr>
                ))}
                {data.transactions.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: "8px",
                        border: "1px solid #ccc",
                        textAlign: "center",
                        color: "#888",
                      }}
                    >
                      Tidak ada data transaksi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {data.transactions.length > 20 && (
              <p
                style={{
                  fontSize: "9pt",
                  color: "#666",
                  marginBottom: 14,
                  fontStyle: "italic",
                }}
              >
                * Menampilkan 20 dari {data.transactions.length} transaksi.
                Unduh CSV untuk data lengkap.
              </p>
            )}

            {/* ── Catatan ─────────────────────────────────────────────── */}
            <div
              style={{
                fontSize: 10,
                border: "1px solid #ccc",
                padding: "8px 12px",
                marginBottom: 24,
                background: "#fafafa",
              }}
            >
              <strong>Catatan:</strong> Laporan ini dibuat secara otomatis
              berdasarkan data sistem pada tanggal {todayStr}. Laporan ini
              bersifat resmi dan dapat digunakan sebagai dokumen
              pertanggungjawaban keuangan koperasi. Untuk keperluan audit, harap
              lampirkan bukti transaksi pendukung.
            </div>

            {/* ── TTD ─────────────────────────────────────────────────── */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 16,
              }}
            >
              <div style={{ width: 200, textAlign: "center" }}>
                <div style={{ fontSize: 11 }}>Dibuat oleh,</div>
                <div style={{ height: 56 }} />
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: 11,
                    borderBottom: "1px solid #000",
                    paddingBottom: 2,
                  }}
                >
                  _______________________
                </div>
                <div style={{ fontSize: 10, marginTop: 3 }}>
                  Bendahara Koperasi
                </div>
              </div>
              <div style={{ width: 200, textAlign: "center" }}>
                <div style={{ fontSize: 11 }}>Mengetahui,</div>
                <div style={{ height: 56 }} />
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: 11,
                    borderBottom: "1px solid #000",
                    paddingBottom: 2,
                  }}
                >
                  _______________________
                </div>
                <div style={{ fontSize: 10, marginTop: 3 }}>Ketua Koperasi</div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: 28,
                borderTop: "1px solid #aaa",
                paddingTop: 6,
                fontSize: 9,
                color: "#666",
                textAlign: "center",
              }}
            >
              Dokumen ini dicetak pada {todayStr} | Sistem Informasi Manajemen
              Koperasi | Halaman 1 dari 1
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Halaman Utama
// ─────────────────────────────────────────────────────────────────────────────

export default function HalamanLaporanSuperLengkap() {
  const colors = useColors();
  const { user, isAdmin, isPengurus, loading: authLoading } = useAuth();

  // ── Proteksi akses ────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin && !isPengurus) {
      window.location.href = "/dashboard";
    }
  }, [authLoading, isAdmin, isPengurus]);

  // ── State filter ──────────────────────────────────────────────────────────
  const [selectedPeriod, setSelectedPeriod] = useState("Semester");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [selectedType, setSelectedType] = useState("Semua");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // ── Data state ────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);

  // ── Ringkasan keuangan ────────────────────────────────────────────────────
  const [totalPemasukan, setTotalPemasukan] = useState(0);
  const [totalPengeluaran, setTotalPengeluaran] = useState(0);
  const [saldoBersih, setSaldoBersih] = useState(0);
  const [danaCadangan, setDanaCadangan] = useState(0);
  const [monthlyData, setMonthlyData] = useState<{
    labels: string[];
    pemasukan: number[];
    pengeluaran: number[];
    netto: number[];
  }>({ labels: [], pemasukan: [], pengeluaran: [], netto: [] });
  const [categoryData, setCategoryData] = useState<
    { label: string; value: number; amount: string; color: string }[]
  >([]);

  // ── Laporan Pinjaman ──────────────────────────────────────────────────────
  const [loanStats, setLoanStats] = useState({
    totalPinjaman: 0,
    totalPokokPinjaman: 0,
    totalBunga: 0,
    totalTerbayar: 0,
    sisaTagihan: 0,
    aktif: 0,
    lunas: 0,
    overdue: 0,
    pending: 0,
  });

  // ── Laporan Simpanan ──────────────────────────────────────────────────────
  const [savingsStats, setSavingsStats] = useState({
    totalSaldo: 0,
    pokok: 0,
    wajib: 0,
    sukarela: 0,
    jumlahRekening: 0,
  });

  // ── Fetch semua data ──────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    if (!user || (!isAdmin && !isPengurus)) return;
    setLoading(true);
    setError(null);
    try {
      let from: Date, to: Date;
      if (useCustomRange && customStartDate && customEndDate) {
        from = new Date(customStartDate);
        to = new Date(customEndDate);
      } else {
        const range = getDateRange(selectedPeriod);
        from = range.from;
        to = range.to;
      }
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);

      const finRes = await fetch(
        `/api/financial-transactions?user_id=${user.id}&from_date=${fromStr}&to_date=${toStr}&limit=5000`,
      );
      if (!finRes.ok) throw new Error("Gagal memuat transaksi keuangan");
      const finJson = await finRes.json();
      const data: FinancialTransaction[] = finJson.data || [];
      setTransactions(data);

      const totalIn = data
        .filter((t) => t.transaction_type === "pemasukan")
        .reduce((s, t) => s + Number(t.amount), 0);
      const totalOut = data
        .filter((t) => t.transaction_type === "pengeluaran")
        .reduce((s, t) => s + Number(t.amount), 0);
      setTotalPemasukan(totalIn);
      setTotalPengeluaran(totalOut);
      setSaldoBersih(totalIn - totalOut);

      const grouped = groupByMonth(data);
      setMonthlyData(grouped);
      setCategoryData(getCategoryComposition(data));

      const savRes = await fetch(
        `/api/savings-acoounts?user_id=${user.id}&limit=5000`,
      );
      if (savRes.ok) {
        const savJson = await savRes.json();
        const accounts: SavingsAccount[] = savJson.data || [];
        setSavingsAccounts(accounts);
        const totalSaldo = accounts.reduce((s, a) => s + Number(a.balance), 0);
        setDanaCadangan(totalSaldo);
        const pokok = accounts
          .filter((a) => a.account_type === "pokok")
          .reduce((s, a) => s + Number(a.balance), 0);
        const wajib = accounts
          .filter((a) => a.account_type === "wajib")
          .reduce((s, a) => s + Number(a.balance), 0);
        const sukarela = accounts
          .filter((a) => a.account_type === "sukarela")
          .reduce((s, a) => s + Number(a.balance), 0);
        setSavingsStats({
          totalSaldo,
          pokok,
          wajib,
          sukarela,
          jumlahRekening: accounts.length,
        });
      }

      const loanRes = await fetch(`/api/loans?user_id=${user.id}&limit=5000`);
      if (loanRes.ok) {
        const loanJson = await loanRes.json();
        const allLoans: Loan[] = loanJson.data || [];
        setLoans(allLoans);
        const totalPokok = allLoans.reduce((s, l) => s + Number(l.amount), 0);
        const totalBunga = allLoans.reduce(
          (s, l) => s + Number(l.total_interest),
          0,
        );
        const totalTerbayar = allLoans.reduce(
          (s, l) => s + Number(l.paid_amount),
          0,
        );
        const sisaTagihan = allLoans.reduce(
          (s, l) => s + Number(l.remaining_amount),
          0,
        );
        const aktif = allLoans.filter((l) => l.status === "active").length;
        const lunas = allLoans.filter((l) => l.status === "completed").length;
        const overdue = allLoans.filter((l) => l.status === "overdue").length;
        const pending = allLoans.filter((l) => l.status === "pending").length;
        setLoanStats({
          totalPinjaman: allLoans.length,
          totalPokokPinjaman: totalPokok,
          totalBunga,
          totalTerbayar,
          sisaTagihan,
          aktif,
          lunas,
          overdue,
          pending,
        });
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [
    user,
    isAdmin,
    isPengurus,
    selectedPeriod,
    useCustomRange,
    customStartDate,
    customEndDate,
  ]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── Filter transaksi untuk tabel ──────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (selectedType !== "Semua") {
      filtered = filtered.filter((t) => t.transaction_type === selectedType);
    }
    if (searchTerm) {
      const kw = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.id.toLowerCase().includes(kw) ||
          t.category.toLowerCase().includes(kw) ||
          (t.description?.toLowerCase().includes(kw) ?? false),
      );
    }
    return filtered.sort((a, b) =>
      a.transaction_date > b.transaction_date ? -1 : 1,
    );
  }, [transactions, selectedType, searchTerm]);

  // ── Label periode ─────────────────────────────────────────────────────────
  const periodeLabel = useMemo(() => {
    if (useCustomRange && customStartDate && customEndDate) {
      return `${formatDate(customStartDate)} s.d. ${formatDate(customEndDate)}`;
    }
    const map: Record<string, string> = {
      Bulanan: "1 Bulan Terakhir",
      Triwulan: "3 Bulan Terakhir",
      Semester: "6 Bulan Terakhir",
      Tahunan: "1 Tahun Terakhir",
    };
    return map[selectedPeriod] ?? selectedPeriod;
  }, [useCustomRange, customStartDate, customEndDate, selectedPeriod]);

  // ── Data untuk chart ──────────────────────────────────────────────────────
  const lineChartData = {
    labels: monthlyData.labels,
    datasets: [
      {
        fill: true,
        label: "Pemasukan",
        data: monthlyData.pemasukan,
        borderColor: colors.success,
        backgroundColor: `${colors.success}18`,
        tension: 0.4,
        pointRadius: 4,
      },
      {
        fill: true,
        label: "Pengeluaran",
        data: monthlyData.pengeluaran,
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}14`,
        tension: 0.4,
        pointRadius: 4,
      },
    ],
  };

  const barChartData = {
    labels: monthlyData.labels,
    datasets: [
      {
        label: "Saldo Bersih",
        data: monthlyData.netto,
        backgroundColor: colors.info,
        borderRadius: 8,
        barThickness: 30,
      },
    ],
  };

  const lineChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          color: colors.textSecondary,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: ${formatCurrency(Number(ctx.parsed.y))}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: `${colors.border}70` },
        ticks: {
          color: colors.textSecondary,
          callback: (v) => formatCurrency(Number(v)),
        },
      },
      x: { grid: { display: false }, ticks: { color: colors.textSecondary } },
    },
  };

  const barChartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `Saldo bersih: ${formatCurrency(Number(ctx.parsed.y))}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: false },
        ticks: {
          color: colors.textSecondary,
          callback: (v) => formatCurrency(Number(v)),
        },
      },
      x: { grid: { display: false }, ticks: { color: colors.textSecondary } },
    },
  };

  // ── Export CSV — fixed: BOM UTF-8 + proper escaping + angka tanpa simbol ──
  const handleExportCSV = () => {
    const today = new Date().toISOString().slice(0, 10);

    // ── Sheet 1: Ringkasan ──────────────────────────────────────────────────
    const summaryRows = [
      ["LAPORAN KEUANGAN KOPERASI"],
      [`Periode: ${periodeLabel}`],
      [`Dicetak: ${formatDate(today)}`],
      [],
      ["=== RINGKASAN KEUANGAN ==="],
      ["Uraian", "Jumlah (IDR)"],
      ["Total Pemasukan", totalPemasukan],
      ["Total Pengeluaran", totalPengeluaran],
      ["Saldo Bersih", saldoBersih],
      ["Dana Cadangan (Total Simpanan)", danaCadangan],
      [],
      ["=== LAPORAN PINJAMAN ==="],
      ["Uraian", "Nilai"],
      ["Total Pinjaman (Akad)", loanStats.totalPinjaman],
      ["Total Pokok Pinjaman (IDR)", loanStats.totalPokokPinjaman],
      ["Total Bunga/Jasa (IDR)", loanStats.totalBunga],
      ["Total Terbayar (IDR)", loanStats.totalTerbayar],
      ["Sisa Tagihan (IDR)", loanStats.sisaTagihan],
      ["Pinjaman Aktif", loanStats.aktif],
      ["Pinjaman Lunas", loanStats.lunas],
      ["Pinjaman Terlambat", loanStats.overdue],
      ["Pinjaman Menunggu", loanStats.pending],
      [],
      ["=== LAPORAN SIMPANAN ==="],
      ["Jenis Simpanan", "Saldo (IDR)"],
      ["Simpanan Pokok", savingsStats.pokok],
      ["Simpanan Wajib", savingsStats.wajib],
      ["Simpanan Sukarela", savingsStats.sukarela],
      ["Total Saldo Simpanan", savingsStats.totalSaldo],
      ["Jumlah Rekening Aktif", savingsStats.jumlahRekening],
      [],
      ["=== DETAIL TRANSAKSI ==="],
      [
        "No.",
        "ID Transaksi",
        "Tanggal",
        "Kategori",
        "Keterangan",
        "Jenis",
        "Nominal (IDR)",
      ],
      ...filteredTransactions.map((t, i) => [
        i + 1,
        t.id.slice(0, 8),
        t.transaction_date,
        t.category,
        t.description || "",
        t.transaction_type === "pemasukan" ? "Pemasukan" : "Pengeluaran",
        // Angka murni tanpa simbol mata uang agar bisa dihitung di Excel
        Number(t.amount),
      ]),
    ];

    // Konversi ke CSV dengan escaping yang benar
    const csvContent = summaryRows
      .map((row) =>
        Array.isArray(row)
          ? row.map((cell) => escapeCSV(cell)).join(";") // pakai semicolon — default Excel ID
          : "",
      )
      .join("\r\n");

    // BOM UTF-8 agar Excel membaca karakter Indonesia dengan benar
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan_keuangan_koperasi_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Print data ────────────────────────────────────────────────────────────
  const printData: PrintData = {
    periodeLabel,
    tanggalCetak: new Date().toISOString().slice(0, 10),
    totalPemasukan,
    totalPengeluaran,
    saldoBersih,
    danaCadangan,
    loanStats,
    savingsStats,
    transactions: filteredTransactions,
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (authLoading || loading) {
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {showPrintPreview && (
        <PrintPreviewModal
          data={printData}
          onClose={() => setShowPrintPreview(false)}
        />
      )}

      <div
        className="min-h-screen p-6 md:p-8"
        style={{ backgroundColor: colors.background }}
      >
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p
              className="mb-2 text-sm font-semibold"
              style={{ color: colors.primary }}
            >
              Analitik & Rekap
            </p>
            <h1
              className="text-2xl font-bold"
              style={{ color: colors.textPrimary }}
            >
              Laporan Keuangan
            </h1>
            <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
              Data keuangan, pinjaman, dan simpanan secara real-time.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-transform active:scale-95"
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.surface,
                color: colors.textPrimary,
              }}
              title="Export ke CSV — dapat dibuka di Excel, Google Sheets, dll."
            >
              <Download size={17} /> Export CSV
            </button>
            <button
              onClick={() => setShowPrintPreview(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-transform active:scale-95"
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.surface,
                color: colors.textPrimary,
              }}
            >
              <Printer size={17} /> Cetak
            </button>
            <button
              onClick={() => fetchAllData()}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-transform active:scale-95"
              style={{ background: colors.primary, color: "#fff" }}
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />{" "}
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Filter periode */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {["Bulanan", "Triwulan", "Semester", "Tahunan"].map((period) => (
              <button
                key={period}
                onClick={() => {
                  setUseCustomRange(false);
                  setSelectedPeriod(period);
                }}
                className="rounded-lg px-4 py-2 text-sm font-bold transition-colors"
                style={{
                  background:
                    !useCustomRange && selectedPeriod === period
                      ? colors.primary
                      : colors.surface,
                  border: `1px solid ${colors.border}`,
                  color:
                    !useCustomRange && selectedPeriod === period
                      ? "#fff"
                      : colors.textPrimary,
                }}
              >
                {period}
              </button>
            ))}
          </div>
          <button
            onClick={() => setUseCustomRange(!useCustomRange)}
            className="rounded-lg px-4 py-2 text-sm font-bold"
            style={{
              background: useCustomRange ? colors.primary : colors.surface,
              border: `1px solid ${colors.border}`,
              color: useCustomRange ? "#fff" : colors.textPrimary,
            }}
          >
            Custom Range
          </button>
          {useCustomRange && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: colors.border,
                  background: colors.background,
                  color: colors.textPrimary,
                }}
              />
              <span>s.d.</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: colors.border,
                  background: colors.background,
                  color: colors.textPrimary,
                }}
              />
              <button
                onClick={fetchAllData}
                className="rounded-lg px-4 py-2 text-sm font-bold text-white"
                style={{ background: colors.primary }}
              >
                Terapkan
              </button>
            </div>
          )}
        </div>

        {/* Stat Cards */}
        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Pemasukan"
            value={formatCurrency(totalPemasukan)}
            trend={`${((totalPemasukan / (totalPemasukan + totalPengeluaran || 1)) * 100).toFixed(1)}% dari total`}
            icon={ArrowUpRight}
            color="#10b981"
          />
          <StatCard
            label="Total Pengeluaran"
            value={formatCurrency(totalPengeluaran)}
            trend={`${((totalPengeluaran / (totalPemasukan + totalPengeluaran || 1)) * 100).toFixed(1)}% dari total`}
            icon={ArrowDownRight}
            color="#ef4444"
          />
          <StatCard
            label="Saldo Bersih"
            value={formatCurrency(saldoBersih)}
            trend={saldoBersih >= 0 ? "Positif" : "Negatif"}
            icon={Wallet}
            color={saldoBersih >= 0 ? "#10b981" : "#ef4444"}
          />
          <StatCard
            label="Dana Cadangan"
            value={formatCurrency(danaCadangan)}
            trend="Total saldo simpanan anggota"
            icon={PiggyBank}
            color="#f59e0b"
          />
        </div>

        {/* Grafik */}
        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div
            className="rounded-xl border p-6 shadow-sm xl:col-span-2"
            style={{ borderColor: colors.border, background: colors.surface }}
          >
            <div className="mb-6 flex flex-col sm:flex-row sm:justify-between">
              <h2
                className="text-lg font-bold"
                style={{ color: colors.textPrimary }}
              >
                Arus Kas Koperasi
              </h2>
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold"
                style={{
                  background: colors.backgroundAccent,
                  color: colors.primary,
                }}
              >
                <TrendingUp size={16} /> Tren berdasarkan transaksi riil
              </div>
            </div>
            <div className="h-80">
              {monthlyData.labels.length ? (
                <Line data={lineChartData} options={lineChartOptions} />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  Tidak ada data untuk periode ini
                </div>
              )}
            </div>
          </div>
          <div
            className="rounded-xl border p-6 shadow-sm"
            style={{ borderColor: colors.border, background: colors.surface }}
          >
            <h2
              className="mb-6 text-lg font-bold"
              style={{ color: colors.textPrimary }}
            >
              Saldo Bersih per Bulan
            </h2>
            <div className="h-80">
              {monthlyData.labels.length ? (
                <Bar data={barChartData} options={barChartOptions} />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  Tidak ada data
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Komposisi Pemasukan + Kesehatan */}
        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div
            className="rounded-xl border p-6 shadow-sm xl:col-span-2"
            style={{ borderColor: colors.border, background: colors.surface }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2
                className="text-lg font-bold"
                style={{ color: colors.textPrimary }}
              >
                Komposisi Pemasukan
              </h2>
              <FileSpreadsheet size={22} style={{ color: colors.primary }} />
            </div>
            <div className="space-y-5">
              {categoryData.length ? (
                categoryData.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: item.color }}
                        />
                        <p
                          className="text-sm font-bold"
                          style={{ color: colors.textPrimary }}
                        >
                          {item.label}
                        </p>
                      </div>
                      <p
                        className="text-sm font-bold"
                        style={{ color: colors.textSecondary }}
                      >
                        {item.amount}
                      </p>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full"
                      style={{ background: colors.background }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.value}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Belum ada data pemasukan
                </p>
              )}
            </div>
          </div>
          <div
            className="rounded-xl border p-6 shadow-sm"
            style={{ borderColor: colors.border, background: colors.surface }}
          >
            <h2
              className="text-lg font-bold"
              style={{ color: colors.textPrimary }}
            >
              Kesehatan Keuangan
            </h2>
            <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
              Indikator berdasarkan data riil
            </p>
            <div className="mt-6 space-y-4">
              {[
                {
                  icon: (
                    <Landmark size={18} style={{ color: colors.success }} />
                  ),
                  title: "Likuiditas",
                  desc: `Saldo bersih ${saldoBersih >= 0 ? "positif" : "negatif"} menunjukkan kondisi keuangan ${saldoBersih >= 0 ? "sehat" : "perlu perhatian"}.`,
                },
                {
                  icon: <TrendingDown size={18} style={{ color: "#f59e0b" }} />,
                  title: "Rasio Beban",
                  desc: `Pengeluaran ${((totalPengeluaran / (totalPemasukan || 1)) * 100).toFixed(1)}% dari pemasukan.`,
                },
                {
                  icon: <Banknote size={18} style={{ color: colors.info }} />,
                  title: "Cadangan",
                  desc: `Dana cadangan ${formatCurrency(danaCadangan)} dari total simpanan anggota.`,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl p-4"
                  style={{ background: colors.background }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {item.icon}
                    <p
                      className="font-bold"
                      style={{ color: colors.textPrimary }}
                    >
                      {item.title}
                    </p>
                  </div>
                  <p
                    className="text-sm"
                    style={{ color: colors.textSecondary }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Laporan Pinjaman & Simpanan */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div
            className="rounded-xl border p-6 shadow-sm"
            style={{ borderColor: colors.border, background: colors.surface }}
          >
            <h2
              className="mb-4 text-lg font-bold"
              style={{ color: colors.textPrimary }}
            >
              Laporan Pinjaman
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Total Pinjaman", `${loanStats.totalPinjaman} pinjaman`],
                ["Total Pokok", formatCurrency(loanStats.totalPokokPinjaman)],
                ["Total Bunga", formatCurrency(loanStats.totalBunga)],
                ["Total Terbayar", formatCurrency(loanStats.totalTerbayar)],
                ["Sisa Tagihan", formatCurrency(loanStats.sisaTagihan)],
              ].map(([label, val]) => (
                <div key={label}>
                  <p
                    className="text-sm"
                    style={{ color: colors.textSecondary }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-xl font-bold"
                    style={{ color: colors.textPrimary }}
                  >
                    {val}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {[
                {
                  label: "Aktif",
                  val: loanStats.aktif,
                  bg: "#dcfce7",
                  color: "#166534",
                },
                {
                  label: "Lunas",
                  val: loanStats.lunas,
                  bg: "#dbeafe",
                  color: "#1e40af",
                },
                {
                  label: "Terlambat",
                  val: loanStats.overdue,
                  bg: "#fee2e2",
                  color: "#991b1b",
                },
                {
                  label: "Menunggu",
                  val: loanStats.pending,
                  bg: "#fef9c3",
                  color: "#854d0e",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg p-2"
                  style={{ background: s.bg }}
                >
                  <p className="text-xs" style={{ color: s.color }}>
                    {s.label}
                  </p>
                  <p className="font-bold" style={{ color: s.color }}>
                    {s.val}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl border p-6 shadow-sm"
            style={{ borderColor: colors.border, background: colors.surface }}
          >
            <h2
              className="mb-4 text-lg font-bold"
              style={{ color: colors.textPrimary }}
            >
              💰 Laporan Simpanan
            </h2>
            <div className="space-y-2">
              {[
                [
                  "Total Saldo Seluruh Rekening",
                  formatCurrency(savingsStats.totalSaldo),
                ],
                ["Simpanan Pokok", formatCurrency(savingsStats.pokok)],
                ["Simpanan Wajib", formatCurrency(savingsStats.wajib)],
                ["Simpanan Sukarela", formatCurrency(savingsStats.sukarela)],
                [
                  "Jumlah Rekening Aktif",
                  `${savingsStats.jumlahRekening} rekening`,
                ],
              ].map(([label, val]) => (
                <div
                  key={label}
                  className="flex justify-between border-b pb-1 last:border-0"
                  style={{ borderColor: colors.border }}
                >
                  <span
                    className="text-sm"
                    style={{ color: colors.textSecondary }}
                  >
                    {label}
                  </span>
                  <span
                    className="font-bold text-sm"
                    style={{ color: colors.textPrimary }}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabel Transaksi */}
        <div
          className="rounded-xl border shadow-sm"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <div className="border-b p-5" style={{ borderColor: colors.border }}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ color: colors.textPrimary }}
                >
                  Ringkasan Transaksi
                </h2>
                <p
                  className="mt-1 text-sm"
                  style={{ color: colors.textSecondary }}
                >
                  {filteredTransactions.length} transaksi dalam periode
                  terpilih.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative w-full md:w-72">
                  <Search
                    className="absolute left-3 top-3"
                    size={17}
                    style={{ color: colors.textSecondary }}
                  />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari transaksi..."
                    className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2"
                    style={{
                      borderColor: colors.border,
                      background: colors.background,
                      color: colors.textPrimary,
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: colors.textSecondary }}
                  >
                    <Filter size={16} /> Jenis
                  </div>
                  {["Semua", "pemasukan", "pengeluaran"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className="rounded-lg px-3 py-2 text-sm font-bold"
                      style={{
                        background:
                          selectedType === type
                            ? colors.backgroundAccent
                            : colors.background,
                        border: `1px solid ${selectedType === type ? colors.borderAccent : colors.border}`,
                        color:
                          selectedType === type
                            ? colors.primary
                            : colors.textSecondary,
                      }}
                    >
                      {type === "pemasukan"
                        ? "Pemasukan"
                        : type === "pengeluaran"
                          ? "Pengeluaran"
                          : "Semua"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead style={{ background: colors.background }}>
                <tr
                  className="border-b text-[12px] font-black uppercase tracking-wider"
                  style={{
                    borderColor: colors.border,
                    color: colors.textSecondary,
                  }}
                >
                  <th className="px-6 py-4">ID / Tanggal</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Keterangan</th>
                  <th className="px-6 py-4">Jenis</th>
                  <th className="px-6 py-4 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((item) => {
                  const isIncome = item.transaction_type === "pemasukan";
                  return (
                    <tr
                      key={item.id}
                      className="border-b transition-colors hover:bg-black/5"
                      style={{ borderColor: colors.border }}
                    >
                      <td className="px-6 py-4">
                        <p
                          className="font-bold"
                          style={{ color: colors.textPrimary }}
                        >
                          {item.id.slice(0, 8)}
                        </p>
                        <p
                          className="mt-1 text-xs"
                          style={{ color: colors.textMuted }}
                        >
                          {formatDate(item.transaction_date)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p
                          className="flex items-center gap-2 text-sm font-bold"
                          style={{ color: colors.textSecondary }}
                        >
                          <ReceiptText size={15} />
                          {item.category}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p
                          className="text-sm"
                          style={{ color: colors.textSecondary }}
                        >
                          {item.description || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black"
                          style={{
                            background: isIncome ? "#dcfce7" : "#fee2e2",
                            color: isIncome ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {isIncome ? (
                            <ArrowUpRight size={13} />
                          ) : (
                            <ArrowDownRight size={13} />
                          )}
                          {isIncome ? "Pemasukan" : "Pengeluaran"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p
                          className="font-black"
                          style={{
                            color: isIncome ? colors.success : colors.primary,
                          }}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(item.amount)}
                        </p>
                      </td>
                    </tr>
                  );
                })}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center">
                      <p
                        className="font-bold"
                        style={{ color: colors.textPrimary }}
                      >
                        Tidak ada transaksi
                      </p>
                      <p
                        className="mt-1 text-sm"
                        style={{ color: colors.textSecondary }}
                      >
                        Ubah filter atau periode.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
