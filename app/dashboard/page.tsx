"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Wallet,
  ClipboardList,
  Calendar,
  Landmark,
  CircleAlert,
  Check,
  Eye,
  Loader2,
  RefreshCw,
  X,
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
import { useAuth } from "@/hooks/useAuth";
import type { Loan, FinancialTransaction, Approval } from "@/lib/types";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

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
    month: "short",
    year: "numeric",
  });

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Beranda() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAdmin, isPengurus, loading: authLoading } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────

  // Statistik
  const [stats, setStats] = useState({
    totalKekayaan: 0,
    totalAnggota: 0,
    pinjamanCair: 0,
    tugasTertunda: 0,
    jumlahPinjamanAktif: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Saldo bersih (tambahan)
  const [netBalance, setNetBalance] = useState({
    total6Bulan: 0,
    rataPerBulan: 0,
    bulanIni: 0,
  });

  // Chart data
  const [lineChartData, setLineChartData] = useState<any>(null);
  const [barChartData, setBarChartData] = useState<any>(null);
  const [chartLoading, setChartLoading] = useState(true);

  // Tabel persetujuan (hanya pinjaman)
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);

  // ─── Fetch semua data ──────────────────────────────────────────────────────

  const fetchAllData = useCallback(async () => {
    if (authLoading) return;

    setStatsLoading(true);
    setChartLoading(true);
    setApprovalsLoading(true);

    try {
      // ── 1. Statistik ──────────────────────────────────────────────────────

      // Total Anggota
      const membersRes = await fetch(
        `/api/members?limit=1&user_id=${user?.id}`,
      );
      const membersJson = await membersRes.json();
      const totalAnggota = membersJson.total || 0;

      // Total pinjaman cair (status active)
      const loansRes = await fetch("/api/loans?limit=1000");
      const loansJson = await loansRes.json();
      const allLoans: Loan[] = loansJson.data || [];

      const pinjamanAktif = allLoans.filter((l) => l.status === "active");
      const totalPokokAktif = pinjamanAktif.reduce(
        (s, l) => s + Number(l.amount),
        0,
      );
      const jumlahPinjamanAktif = pinjamanAktif.length;

      // Tugas tertunda (approvals pinjaman dengan status pending)
      const approvalsRes = await fetch(
        "/api/approvals?limit=1000&status=pending&reference_type=loan",
      );
      const approvalsJson = await approvalsRes.json();
      const pendingApprovals: Approval[] = approvalsJson.data || [];

      // Total kekayaan koperasi (total saldo simpanan + modal)
      const savingsRes = await fetch("/api/savings-acoounts?limit=1000");
      const savingsJson = await savingsRes.json();
      const allSavings = savingsJson.data || [];
      const totalSaldoSimpanan = allSavings.reduce(
        (s: number, a: any) => s + Number(a.balance),
        0,
      );

      const totalKekayaan = totalSaldoSimpanan + totalPokokAktif;

      setStats({
        totalKekayaan,
        totalAnggota,
        pinjamanCair: totalPokokAktif,
        tugasTertunda: pendingApprovals.length,
        jumlahPinjamanAktif,
      });

      // ── 2. Chart Data ──────────────────────────────────────────────────────

      // Ambil financial transactions untuk line chart
      const finRes = await fetch("/api/financial-transactions?limit=1000");
      const finJson = await finRes.json();
      const transactions: FinancialTransaction[] = finJson.data || [];

      // Kelompokkan per bulan (6 bulan terakhir)
      const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"];
      const incomeData = [0, 0, 0, 0, 0, 0];
      const expenseData = [0, 0, 0, 0, 0, 0];

      const now = new Date();
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(now.getMonth() - 6);

      transactions.forEach((t) => {
        const date = new Date(t.transaction_date);
        if (date < sixMonthsAgo) return;

        const monthDiff = now.getMonth() - date.getMonth();
        const idx = 5 - monthDiff; // index di array (0=Jan, 5=Jun)

        if (idx >= 0 && idx < 6) {
          if (t.transaction_type === "pemasukan") {
            incomeData[idx] += Number(t.amount);
          } else if (t.transaction_type === "pengeluaran") {
            expenseData[idx] += Number(t.amount);
          }
        }
      });

      setLineChartData({
        labels: months,
        datasets: [
          {
            fill: true,
            label: "Pemasukan",
            data: incomeData,
            borderColor: colors.success,
            backgroundColor: `${colors.success}15`,
            tension: 0.4,
            pointRadius: 3,
          },
          {
            fill: true,
            label: "Pengeluaran",
            data: expenseData,
            borderColor: colors.primary,
            backgroundColor: `${colors.primary}15`,
            tension: 0.4,
            pointRadius: 3,
          },
        ],
      });

      // ── Hitung saldo bersih (tambahan) ──────────────────────────────────
      const netData = incomeData.map((inc, i) => inc - expenseData[i]);
      const totalNet6Bulan = netData.reduce((a, b) => a + b, 0);
      const rataNetPerBulan = totalNet6Bulan / 6;

      // Bulan ini (index 5 = Juni)
      const idxBulanIni = 5; // karena array 0=Jan, 5=Jun
      const saldoBulanIni = netData[idxBulanIni] ?? 0;

      setNetBalance({
        total6Bulan: totalNet6Bulan,
        rataPerBulan: rataNetPerBulan,
        bulanIni: saldoBulanIni,
      });

      // ── Bar chart - Kualitas Pinjaman (Diperbaiki) ─────────────────────
      const activeLoans = allLoans.filter((l) => l.status === "active");
      const overdueLoans = allLoans.filter((l) => l.status === "overdue");
      const pendingLoans = allLoans.filter((l) => l.status === "pending");
      const approvedLoans = allLoans.filter((l) => l.status === "approved");
      const completedLoans = allLoans.filter((l) => l.status === "completed");

      setBarChartData({
        labels: ["Lancar", "Terlambat", "Belum Cair", "Lunas"],
        datasets: [
          {
            data: [
              activeLoans.length - overdueLoans.length,
              overdueLoans.length,
              pendingLoans.length + approvedLoans.length,
              completedLoans.length,
            ],
            backgroundColor: [colors.success, "#fbbf24", "#3b82f6", "#10b981"],
            borderRadius: 6,
            barThickness: 30,
          },
        ],
      });

      // ── 3. Tabel Persetujuan (HANYA PINJAMAN) ──────────────────────────────

      // Ambil 5 approval pinjaman terbaru dengan status pending
      const pendingRes = await fetch(
        "/api/approvals?limit=5&status=pending&reference_type=loan&order=created_at&direction=desc",
      );
      const pendingJson = await pendingRes.json();
      const data = pendingJson.data || [];
      setApprovals(data);
      setApprovalsLoading(false);
    } catch (err) {
      console.error("Gagal fetch data dashboard:", err);
      setApprovalsLoading(false);
    } finally {
      setStatsLoading(false);
      setChartLoading(false);
    }
  }, [authLoading]);

  // ─── Auto-refresh saat komponen mount dan saat user kembali ke tab ──────

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    const handleFocus = () => {
      fetchAllData();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchAllData]);

  // ─── Handle approve/reject dari tabel ──────────────────────────────────────

  const handleApprove = async (approval: Approval) => {
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
      title: "Setujui Permohonan?",
      text: `Anda akan menyetujui permohonan: ${approval.title}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: colors.primary,
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Setujui",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/approvals/${approval.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          status: "approved",
          reviewed_by: user.id,
          review_notes: "Disetujui",
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Gagal menyetujui");
      }

      await Swal.fire({
        icon: "success",
        title: "Disetujui!",
        text: `Permohonan ${approval.title} berhasil disetujui.`,
        timer: 1500,
        showConfirmButton: false,
      });

      fetchAllData();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan",
        confirmButtonColor: colors.primary,
      });
    }
  };

  const handleReject = async (approval: Approval) => {
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
      title: "Tolak Permohonan?",
      text: `Anda akan menolak permohonan: ${approval.title}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Tolak",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/approvals/${approval.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          status: "rejected",
          reviewed_by: user.id,
          review_notes: "Ditolak",
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Gagal menolak");
      }

      await Swal.fire({
        icon: "success",
        title: "Ditolak!",
        text: `Permohonan ${approval.title} berhasil ditolak.`,
        timer: 1500,
        showConfirmButton: false,
      });

      fetchAllData();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan",
        confirmButtonColor: colors.primary,
      });
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
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

  // ─── Render ────────────────────────────────────────────────────────────────

  const colorIncome = colors.success;
  const colorExpense = colors.primary;
  const colorNeutral = colors.info;

  const lineChartOptions = {
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
  };

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
            onClick={() => fetchAllData()}
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.surface,
              color: colors.textPrimary,
            }}
            className="hover:scale-105 rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm"
          >
            <RefreshCw
              size={16}
              className={statsLoading ? "animate-spin" : ""}
            />
            <span className="font-medium text-sm">Refresh</span>
          </button>
        </div>
      </div>

      {/* STATS CARDS (5 kartu) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        <StatCard
          title="Kekayaan Koperasi"
          value={fmtCurrency(stats.totalKekayaan)}
          trend={`${stats.jumlahPinjamanAktif} pinjaman aktif`}
          icon={Landmark}
          color={colorIncome}
          loading={statsLoading}
        />
        <StatCard
          title="Total Anggota"
          value={stats.totalAnggota.toLocaleString("id-ID")}
          trend={`${stats.totalAnggota} terdaftar`}
          icon={Users}
          color={colorNeutral}
          loading={statsLoading}
        />
        <StatCard
          title="Pinjaman Cair"
          value={fmtCurrency(stats.pinjamanCair)}
          trend={`${stats.jumlahPinjamanAktif} orang`}
          icon={Wallet}
          color="#f59e0b"
          loading={statsLoading}
        />
        <StatCard
          title="Tugas Tertunda"
          value={String(stats.tugasTertunda)}
          trend="Perlu proses"
          icon={ClipboardList}
          color={colorExpense}
          loading={statsLoading}
        />
        <StatCard
          title="Saldo Bersih (6 Bulan)"
          value={fmtCurrency(netBalance.total6Bulan)}
          trend={`Rata-rata ${fmtCurrency(netBalance.rataPerBulan)}/bulan`}
          icon={Calendar}
          color={netBalance.total6Bulan >= 0 ? colors.success : colors.error}
          loading={statsLoading}
        />
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
                Statistik pendapatan 6 bulan terakhir
              </p>
            </div>
            <div
              style={{
                background: colors.secondary + "50",
                color: colors.textPrimary,
              }}
              className="text-sm font-medium flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-600 border border-emerald-400"
            >
              <Calendar size={14} /> 6 Bulan
            </div>
          </div>
          <div className="h-72">
            {lineChartData ? (
              <Line data={lineChartData} options={lineChartOptions as any} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                Memuat data...
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart: Kualitas Pinjaman (Diperbaiki) */}
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
              Distribusi status pinjaman anggota
            </p>
          </div>
          <div className="h-72">
            {barChartData ? (
              <Bar options={barChartOptions} data={barChartData} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                Memuat data...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLE SECTION: Persetujuan (Hanya Pinjaman) */}
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
              Antrean Persetujuan Pinjaman
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
            <span className="text-sm font-bold">
              {stats.tugasTertunda} Tertunda
            </span>
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
                <th className="py-4 px-6 font-semibold w-1/4">Judul</th>
                <th className="py-4 px-6 font-semibold w-1/6">Tipe</th>
                <th className="py-4 px-6 font-semibold w-1/3">Deskripsi</th>
                <th className="py-4 px-6 font-semibold">Waktu Masuk</th>
                <th className="py-4 px-6 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: colors.border }}>
              {approvalsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr
                    key={`sk-${i}`}
                    style={{ borderColor: colors.border }}
                    className="border-b"
                  >
                    <td className="py-4 px-6">
                      <div className="h-4 animate-pulse rounded bg-gray-200 w-3/4" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 animate-pulse rounded bg-gray-200 w-1/2" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 animate-pulse rounded bg-gray-200 w-full" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 animate-pulse rounded bg-gray-200 w-1/2" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="h-4 animate-pulse rounded bg-gray-200 w-1/2 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : approvals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Tidak ada antrean persetujuan pinjaman
                  </td>
                </tr>
              ) : (
                approvals.map((item) => (
                  <tr
                    key={item.id}
                    style={{ borderColor: colors.border }}
                    className="hover:bg-black/5 border-b transition-colors group"
                  >
                    <td
                      className="py-4 px-6"
                      style={{ color: colors.textSecondary }}
                    >
                      <p className="font-bold">{item.title}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md border text-blue-600 border-blue-200 bg-blue-50`}
                      >
                        Pinjaman
                      </span>
                    </td>
                    <td
                      className="py-4 px-6"
                      style={{ color: colors.textSecondary }}
                    >
                      <p className="text-sm font-medium">
                        {item.description || "-"}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <p
                        className="text-sm"
                        style={{ color: colors.textMuted }}
                      >
                        {fmtDate(item.created_at)}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleApprove(item)}
                          className="px-4 py-2 bg-emerald-500 text-white font-semibold text-sm rounded-lg hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <Check size={16} /> Setujui
                        </button>
                        <button
                          onClick={() => handleReject(item)}
                          className="px-4 py-2 bg-red-500 text-white font-semibold text-sm rounded-lg hover:bg-red-600 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <X size={16} /> Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div
          style={{ borderColor: colors.border, background: colors.background }}
          className="p-4 border-t flex justify-center"
        >
          <Link
            href="/dashboard/persetujuan"
            className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors px-4 py-2 rounded-lg hover:bg-emerald-50"
          >
            Lihat Semua Antrean ({stats.tugasTertunda})
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── StatCard Component ──────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: string;
  trend: string;
  icon: any;
  color: string;
  loading: boolean;
}) {
  const colors = useColors();
  return (
    <div
      style={{
        background: colors.surface,
        border: "1px solid " + colors.border,
      }}
      className="p-5 rounded-md shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
          ) : (
            <h3
              className="text-2xl font-bold"
              style={{ color: colors.textPrimary }}
            >
              {value}
            </h3>
          )}
        </div>
        <div
          style={{
            backgroundColor: `${color}15`,
            color: color,
          }}
          className="p-2.5 rounded-xl"
        >
          <Icon size={22} />
        </div>
      </div>
      <p className="text-sm flex items-center gap-1.5">
        <span
          style={{ color: color, background: colors.background }}
          className="font-semibold px-2 py-0.5 rounded"
        >
          {trend}
        </span>
      </p>
    </div>
  );
}
