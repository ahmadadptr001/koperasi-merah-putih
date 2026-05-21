"use client";

import React, { useMemo, useState } from "react";
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

const summaryCards = [
  {
    label: "Total Pemasukan",
    value: "Rp 1,82 M",
    trend: "+12,4% dari bulan lalu",
    icon: ArrowUpRight,
    color: "#10b981",
  },
  {
    label: "Total Pengeluaran",
    value: "Rp 724 Jt",
    trend: "+4,1% operasional",
    icon: ArrowDownRight,
    color: "#ef4444",
  },
  {
    label: "Saldo Bersih",
    value: "Rp 1,09 M",
    trend: "Margin sehat 59,9%",
    icon: Wallet,
    color: "#2563eb",
  },
  {
    label: "Dana Cadangan",
    value: "Rp 318 Jt",
    trend: "+8,7% bertumbuh",
    icon: PiggyBank,
    color: "#f59e0b",
  },
];

const monthlyReports = [
  { month: "Jan", income: 245, expense: 98, net: 147 },
  { month: "Feb", income: 286, expense: 112, net: 174 },
  { month: "Mar", income: 318, expense: 124, net: 194 },
  { month: "Apr", income: 301, expense: 141, net: 160 },
  { month: "Mei", income: 356, expense: 132, net: 224 },
  { month: "Jun", income: 418, expense: 117, net: 301 },
];

const categoryReports = [
  { label: "Simpanan Pokok", value: 34, amount: "Rp 410 Jt", color: "#b7102a" },
  { label: "Simpanan Wajib", value: 28, amount: "Rp 338 Jt", color: "#2563eb" },
  { label: "Simpanan Sukarela", value: 22, amount: "Rp 265 Jt", color: "#10b981" },
  { label: "Jasa Pinjaman", value: 16, amount: "Rp 193 Jt", color: "#f59e0b" },
];

const transactionReports = [
  {
    id: "LKP-260601",
    date: "01 Jun 2026",
    category: "Simpanan Wajib",
    description: "Setoran wajib anggota periode Juni",
    type: "Pemasukan",
    amount: 128500000,
    status: "Terverifikasi",
  },
  {
    id: "LKP-260602",
    date: "03 Jun 2026",
    category: "Pencairan Pinjaman",
    description: "Pencairan pinjaman produktif UMKM",
    type: "Pengeluaran",
    amount: 85000000,
    status: "Terverifikasi",
  },
  {
    id: "LKP-260603",
    date: "05 Jun 2026",
    category: "Jasa Pinjaman",
    description: "Pendapatan jasa pinjaman aktif",
    type: "Pemasukan",
    amount: 47500000,
    status: "Terverifikasi",
  },
  {
    id: "LKP-260604",
    date: "08 Jun 2026",
    category: "Operasional",
    description: "Biaya administrasi dan operasional kantor",
    type: "Pengeluaran",
    amount: 18500000,
    status: "Menunggu",
  },
  {
    id: "LKP-260605",
    date: "12 Jun 2026",
    category: "Simpanan Sukarela",
    description: "Akumulasi setoran sukarela anggota",
    type: "Pemasukan",
    amount: 72250000,
    status: "Terverifikasi",
  },
];

const periodFilters = ["Bulanan", "Triwulan", "Semester", "Tahunan"];
const typeFilters = ["Semua", "Pemasukan", "Pengeluaran"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const getStatusStyle = (status: string) => {
  if (status === "Terverifikasi") {
    return {
      background: "#dcfce7",
      color: "#15803d",
      border: "#bbf7d0",
    };
  }

  return {
    background: "#fef3c7",
    color: "#b45309",
    border: "#fde68a",
  };
};

export default function HalamanLaporanKeuangan() {
  const colors = useColors();
  const [selectedPeriod, setSelectedPeriod] = useState("Semester");
  const [selectedType, setSelectedType] = useState("Semua");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTransactions = useMemo(() => {
    const keyword = searchTerm.toLowerCase();

    return transactionReports.filter((item) => {
      const matchesType = selectedType === "Semua" || item.type === selectedType;
      const matchesSearch =
        item.id.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword);

      return matchesType && matchesSearch;
    });
  }, [searchTerm, selectedType]);

  const lineChartData = {
    labels: monthlyReports.map((item) => item.month),
    datasets: [
      {
        fill: true,
        label: "Pemasukan",
        data: monthlyReports.map((item) => item.income),
        borderColor: colors.success,
        backgroundColor: `${colors.success}18`,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        fill: true,
        label: "Pengeluaran",
        data: monthlyReports.map((item) => item.expense),
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}14`,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const barChartData = {
    labels: monthlyReports.map((item) => item.month),
    datasets: [
      {
        label: "Saldo Bersih",
        data: monthlyReports.map((item) => item.net),
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
          label: (context) => `${context.dataset.label}: Rp ${context.parsed.y} Jt`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: `${colors.border}70` },
        ticks: {
          color: colors.textSecondary,
          callback: (value) => `Rp ${value} Jt`,
        },
      },
      x: {
        grid: { display: false },
        ticks: { color: colors.textSecondary },
      },
    },
  };

  const barChartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Saldo bersih: Rp ${context.parsed.y} Jt`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: false },
        ticks: {
          color: colors.textSecondary,
          callback: (value) => `Rp ${value} Jt`,
        },
      },
      x: {
        grid: { display: false },
        ticks: { color: colors.textSecondary },
      },
    },
  };

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: colors.background }}
    >
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p
            className="mb-2 text-sm font-semibold"
            style={{ color: colors.primary }}
          >
            Rekap & Analitik
          </p>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.textPrimary }}
          >
            Laporan Keuangan
          </h1>
          <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
            Pantau arus kas, saldo bersih, sumber pemasukan, dan transaksi utama
            koperasi secara ringkas.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-transform active:scale-95"
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.surface,
              color: colors.textPrimary,
            }}
          >
            <CalendarDays size={17} />
            Jan - Jun 2026
            <ChevronDown size={16} />
          </button>
          <button
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
            style={{ background: colors.primary }}
          >
            <Download size={17} />
            Unduh Laporan
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md"
              style={{ borderColor: colors.border, background: colors.surface }}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: colors.textSecondary }}
                  >
                    {card.label}
                  </p>
                  <h3
                    className="mt-1 text-2xl font-black"
                    style={{ color: colors.textPrimary }}
                  >
                    {card.value}
                  </h3>
                </div>
                <div
                  className="rounded-xl p-3"
                  style={{ backgroundColor: `${card.color}16`, color: card.color }}
                >
                  <Icon size={22} />
                </div>
              </div>
              <p className="text-sm font-semibold" style={{ color: card.color }}>
                {card.trend}
              </p>
            </div>
          );
        })}
      </div>

      {/* PERIOD FILTER */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {periodFilters.map((period) => {
          const active = selectedPeriod === period;

          return (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className="rounded-lg px-4 py-2 text-sm font-bold transition-colors"
              style={{
                background: active ? colors.backgroundAccent : colors.surface,
                border: `1px solid ${active ? colors.borderAccent : colors.border}`,
                color: active ? colors.primary : colors.textSecondary,
              }}
            >
              {period}
            </button>
          );
        })}
      </div>

      {/* CHARTS */}
      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div
          className="rounded-xl border p-6 shadow-sm xl:col-span-2"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                Arus Kas Koperasi
              </h2>
              <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                Perbandingan pemasukan dan pengeluaran dalam jutaan rupiah.
              </p>
            </div>
            <div
              className="flex w-fit items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold"
              style={{
                background: colors.backgroundAccent,
                color: colors.primary,
                border: `1px solid ${colors.borderAccent}`,
              }}
            >
              <TrendingUp size={16} />
              Tren positif
            </div>
          </div>
          <div className="h-80">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        <div
          className="rounded-xl border p-6 shadow-sm"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <div className="mb-6">
            <h2 className="text-lg font-bold" style={{ color: colors.textPrimary }}>
              Saldo Bersih
            </h2>
            <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
              Selisih pemasukan dan pengeluaran per bulan.
            </p>
          </div>
          <div className="h-80">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>
      </div>

      {/* CATEGORY + HEALTH */}
      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div
          className="rounded-xl border p-6 shadow-sm xl:col-span-2"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                Komposisi Pemasukan
              </h2>
              <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                Sumber pemasukan terbesar koperasi pada periode aktif.
              </p>
            </div>
            <FileSpreadsheet size={22} style={{ color: colors.primary }} />
          </div>

          <div className="space-y-5">
            {categoryReports.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: item.color }}
                    />
                    <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                      {item.label}
                    </p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: colors.textSecondary }}>
                    {item.amount}
                  </p>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full"
                  style={{ background: colors.background }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.value}%`, background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-xl border p-6 shadow-sm"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <h2 className="text-lg font-bold" style={{ color: colors.textPrimary }}>
            Kesehatan Keuangan
          </h2>
          <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
            Indikator cepat untuk membaca kondisi koperasi.
          </p>

          <div className="mt-6 space-y-4">
            <div
              className="rounded-xl p-4"
              style={{ background: colors.background }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Landmark size={18} style={{ color: colors.success }} />
                <p className="font-bold" style={{ color: colors.textPrimary }}>
                  Likuiditas Aman
                </p>
              </div>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Kas tersedia mampu menutup kebutuhan operasional 4,8 bulan.
              </p>
            </div>

            <div
              className="rounded-xl p-4"
              style={{ background: colors.background }}
            >
              <div className="mb-2 flex items-center gap-2">
                <TrendingDown size={18} style={{ color: "#f59e0b" }} />
                <p className="font-bold" style={{ color: colors.textPrimary }}>
                  Beban Operasional Stabil
                </p>
              </div>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Rasio pengeluaran berada di 39,8% dari total pemasukan.
              </p>
            </div>

            <div
              className="rounded-xl p-4"
              style={{ background: colors.background }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Banknote size={18} style={{ color: colors.info }} />
                <p className="font-bold" style={{ color: colors.textPrimary }}>
                  Cadangan Bertambah
                </p>
              </div>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Dana cadangan naik konsisten dari kontribusi simpanan anggota.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TRANSACTION TABLE */}
      <div
        className="rounded-xl border shadow-sm"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        <div
          className="border-b p-5"
          style={{ borderColor: colors.border }}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                Ringkasan Transaksi
              </h2>
              <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                Daftar transaksi keuangan utama yang masuk dalam laporan ini.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative w-full md:w-72">
                <Search
                  className="absolute left-3 top-3"
                  size={17}
                  style={{ color: colors.textSecondary }}
                />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Cari transaksi..."
                  className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-red-100"
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
                  <Filter size={16} />
                  Jenis
                </div>
                {typeFilters.map((type) => {
                  const active = selectedType === type;

                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className="rounded-lg px-3 py-2 text-sm font-bold"
                      style={{
                        background: active ? colors.backgroundAccent : colors.background,
                        border: `1px solid ${active ? colors.borderAccent : colors.border}`,
                        color: active ? colors.primary : colors.textSecondary,
                      }}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead style={{ background: colors.background }}>
              <tr
                className="border-b text-[12px] font-black uppercase tracking-wider"
                style={{ borderColor: colors.border, color: colors.textSecondary }}
              >
                <th className="px-6 py-4">ID / Tanggal</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4">Jenis</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((item) => {
                const statusStyle = getStatusStyle(item.status);
                const isIncome = item.type === "Pemasukan";

                return (
                  <tr
                    key={item.id}
                    className="border-b transition-colors hover:bg-black/5"
                    style={{ borderColor: colors.border }}
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold" style={{ color: colors.textPrimary }}>
                        {item.id}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: colors.textMuted }}>
                        {item.date}
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
                      <p className="text-sm" style={{ color: colors.textSecondary }}>
                        {item.description}
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
                        {isIncome ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex rounded-full border px-3 py-1 text-xs font-black"
                        style={{
                          background: statusStyle.background,
                          borderColor: statusStyle.border,
                          color: statusStyle.color,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p
                        className="font-black"
                        style={{ color: isIncome ? colors.success : colors.primary }}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(item.amount)}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="p-10 text-center">
            <p className="font-bold" style={{ color: colors.textPrimary }}>
              Transaksi tidak ditemukan
            </p>
            <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
              Coba ubah kata kunci pencarian atau filter jenis transaksi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
