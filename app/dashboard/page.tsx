"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  Users,
  Wallet,
  ClipboardList,
  Calendar,
  Landmark,
  CircleAlert,
  FileUp,
  Check,
  Eye,
  Settings,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { useColors } from "@/hooks/useColors";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export default function Beranda() {
  const colors = useColors();

  // Warna Cerah & Kontras
  const colorIncome = colors.success; // Hijau cerah
  const colorExpense = colors.primary; // Merah muda/rose cerah
  const colorNeutral = colors.info; // Biru cerah

  // 1. Konfigurasi Line Chart (Arus Keuangan)
  const lineChartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"],
    datasets: [
      {
        fill: true,
        label: "Pemasukan",
        data: [45, 55, 70, 65, 85, 95],
        borderColor: colorIncome,
        backgroundColor: `${colorIncome}15`,
        tension: 0.4,
        pointRadius: 3,
      },
      {
        fill: true,
        label: "Pengeluaran",
        data: [25, 30, 40, 35, 50, 45],
        borderColor: colorExpense,
        backgroundColor: `${colorExpense}15`,
        tension: 0.4,
        pointRadius: 3,
      },
    ],
  };

  // 2. Konfigurasi Bar Chart (Kualitas Pinjaman)
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      x: { grid: { display: false }, ticks: { font: { size: 12 } } },
    },
  };

  const barChartData = {
    labels: ["Lancar", "Terlambat", "Bermasalah"],
    datasets: [
      {
        data: [75, 15, 10],
        backgroundColor: [colorIncome, "#fbbf24", colorExpense],
        borderRadius: 6,
        barThickness: 40,
      },
    ],
  };

  // Data Tabel Persetujuan
  const persetujuanData = [
    {
      label: "Dana",
      color: "text-blue-600",
      name: "Ahmad Subagyo",
      desc: "Pinjaman Tani - Rp 15.000.000",
      time: "2 jam lalu",
    },
    {
      label: "Daftar",
      color: "text-emerald-600",
      name: "Siti Aminah",
      desc: "Verifikasi KTP Anggota Baru",
      time: "5 jam lalu",
    },
    {
      label: "Tarik",
      color: "text-amber-600",
      name: "Budi Santoso",
      desc: "Simpanan Sukarela - Rp 2.500.000",
      time: "1 hari lalu",
    },
  ];

  return (
    <div
      style={{
        background: colors.background,
      }}
      className="min-h-screen overflow-auto p-6 pb-20 font-sans text-slate-800"
    >
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-end md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.surface,
              color: colors.textPrimary,
            }}
            className="hover:scale-105  rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm"
          >
            <FileUp size={16} />
            <span className="font-medium text-sm">Import</span>
          </button>
          <button
            style={{
              background: colors.backgroundAccent,
              border: `1px solid ${colors.borderAccent}`,
              color: colors.primary,
            }}
            className="hover:scale-105 rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm"
          >
            <ArrowDownToLine size={16} />
            <span className="font-medium text-sm">Export</span>
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          {
            title: "Kekayaan Koperasi",
            val: "Rp 12.4 M",
            trend: "+4.2%",
            icon: Landmark,
            color: colorIncome,
          },
          {
            title: "Total Anggota",
            val: "1.248",
            trend: "+12",
            icon: Users,
            color: colorNeutral,
          },
          {
            title: "Pinjaman Cair",
            val: "Rp 4.2 M",
            trend: "342 orang",
            icon: Wallet,
            color: "#f59e0b",
          },
          {
            title: "Tugas Tertunda",
            val: "18",
            trend: "Perlu proses",
            icon: ClipboardList,
            color: colorExpense,
          },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              background: colors.surface,
              border: "1px solid " + colors.border,
            }}
            className="p-5 rounded-md shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  {card.title}
                </p>
                <h3
                  className="text-2xl font-bold"
                  style={{ color: colors.textSecondary }}
                >
                  {card.val}
                </h3>
              </div>
              <div
                style={{
                  backgroundColor: `${card.color}15`,
                  color: card.color,
                }}
                className="p-2.5 rounded-xl"
              >
                <card.icon size={22} />
              </div>
            </div>
            <p className="text-sm flex items-center gap-1.5">
              <span
                style={{ color: card.color, background: colors.background }}
                className="font-semibold px-2 py-0.5 rounded"
              >
                {card.trend}
              </span>
              {i < 2 && <span className="text-slate-400">dari bulan lalu</span>}
            </p>
          </div>
        ))}
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Line Chart: Arus Keuangan */}
        <div
          style={{
            background: colors.surface,
            border: "1px solid " + colors.border,
          }}
          className="lg:col-span-2 rounded-md p-6 shadow-sm"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2
                className="text-lg font-bold"
                style={{ color: colors.textPrimary }}
              >
                Arus Keuangan
              </h2>
              <p
                className="text-sm mt-1"
                style={{ color: colors.textSecondary }}
              >
                Statistik pendapatan semester ini
              </p>
            </div>
            <div
              style={{
                background: colors.secondary + "50",
                color: colors.textPrimary,
              }}
              className="text-sm font-medium flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-600 border border-emerald-400"
            >
              <Calendar size={14} /> Jan - Jun 2024
            </div>
          </div>
          <div className="h-72">
            <Line
              data={{ ...lineChartData }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: {
                      usePointStyle: true,
                      boxWidth: 8,
                      font: { size: 12 },
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Bar Chart: Kualitas Pinjaman */}
        <div
          style={{
            background: colors.surface,
            border: "1px solid " + colors.border,
          }}
          className="rounded-md p-6 shadow-sm"
        >
          <div>
            <h2
              style={{ color: colors.textPrimary }}
              className="text-lg font-bold"
            >
              Kualitas Pinjaman
            </h2>
            <p
              style={{ color: colors.textSecondary }}
              className="text-sm mt-1 mb-6"
            >
              Status kesehatan cicilan anggota aktif
            </p>
          </div>
          <div className="h-72">
            <Bar options={barChartOptions} data={barChartData} />
          </div>
        </div>
      </div>

      {/* TABLE SECTION: Persetujuan */}
      <div
        style={{
          background: colors.surface,
          border: "1px solid " + colors.border,
        }}
        className="rounded-md shadow-sm overflow-hidden"
      >
        {/* Table Header */}
        <div
          className="p-5 border-b flex justify-between items-center"
          style={{
            background: colors.surface,
            borderColor: colors.border + 90,
          }}
        >
          <div>
            <h2
              style={{ color: colors.textPrimary }}
              className="text-lg font-bold"
            >
              Antrean Persetujuan
            </h2>
            <p
              className="text-sm mt-0.5"
              style={{ color: colors.textSecondary }}
            >
              Tugas yang membutuhkan tinjauan Anda
            </p>
          </div>
          <div
            style={{
              background: colors.backgroundAccent,
              border: "1px solid " + colors.borderAccent,
            }}
            className="text-rose-600 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-rose-100 shadow-sm"
          >
            <CircleAlert size={16} />
            <span className="text-sm font-bold">18 Tertunda</span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                style={{
                  background: colors.background,
                  color: colors.textSecondary,
                  borderColor: colors.border,
                }}
                className="text-sm border-b"
              >
                <th className="py-4 px-6 font-semibold w-1/4">Nama Pemohon</th>
                <th className="py-4 px-6 font-semibold w-1/6">Kategori</th>
                <th className="py-4 px-6 font-semibold w-1/3">Keterangan</th>
                <th className="py-4 px-6 font-semibold">Waktu Masuk</th>
                <th className="py-4 px-6 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: colors.border }}>
              {persetujuanData.map((item, i) => (
                <tr
                  key={i}
                  style={{ borderColor: colors.border }}
                  className="hover:bg-black/5 border-b transition-colors group"
                >
                  <td
                    className="py-4 px-6"
                    style={{ color: colors.textSecondary }}
                  >
                    <p className="font-bold">{item.name}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md border ${item.color}`}
                    >
                      {item.label}
                    </span>
                  </td>
                  <td
                    className="py-4 px-6"
                    style={{ color: colors.textSecondary }}
                  >
                    <p className="text-sm font-medium">{item.desc}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      {item.time}
                    </p>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="px-4 py-2 bg-emerald-500 text-white font-semibold text-sm rounded-lg hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-1.5">
                        <Check size={16} /> Setujui
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div
          style={{ borderColor: colors.border, background: colors.background }}
          className="p-4 border-t  flex justify-center"
        >
          <Link
            href="/dashboard/persetujuan"
            className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors px-4 py-2 rounded-lg hover:bg-emerald-50"
          >
            Lihat Semua Antrean (18)
          </Link>
        </div>
      </div>
    </div>
  );
}
