"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Filter,
  Plus,
  ReceiptText,
  Search,
  ShieldX,
  WalletCards,
  X,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";

const initialLoanHistory = [
  {
    id: "PJ-001",
    date: "12 Apr 2026",
    amount: 5000000,
    interest: "1%",
    tenor: "12 Bulan",
    status: "Aktif",
    due: "12 Mei 2026",
    installment: 455000,
    paid: 1580000,
    remaining: 3420000,
    purpose: "Modal usaha tani dan pembelian pupuk.",
  },
  {
    id: "PJ-002",
    date: "05 Jan 2026",
    amount: 2000000,
    interest: "1%",
    tenor: "6 Bulan",
    status: "Lunas",
    due: "-",
    installment: 345000,
    paid: 2070000,
    remaining: 0,
    purpose: "Pembelian alat produksi rumahan.",
  },
  {
    id: "PJ-003",
    date: "20 Mei 2026",
    amount: 10000000,
    interest: "1.2%",
    tenor: "24 Bulan",
    status: "Menunggu",
    due: "-",
    installment: 0,
    paid: 0,
    remaining: 10000000,
    purpose: "Pengajuan modal kerja UMKM kuliner.",
  },
];

const statusFilters = ["Semua", "Aktif", "Lunas", "Menunggu", "Dibatalkan"];

type Loan = (typeof initialLoanHistory)[number];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function HalamanPinjaman() {
  const router = useRouter();

  const colors = useColors();
  const [loans, setLoans] = useState(initialLoanHistory);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Semua");
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [toast, setToast] = useState("");

  const filteredLoans = useMemo(() => {
    const keyword = searchTerm.toLowerCase();

    return loans.filter((loan) => {
      const matchesSearch =
        loan.id.toLowerCase().includes(keyword) ||
        loan.status.toLowerCase().includes(keyword) ||
        loan.purpose.toLowerCase().includes(keyword);
      const matchesStatus =
        selectedStatus === "Semua" || loan.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [loans, searchTerm, selectedStatus]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const handleLoanAction = (loan: Loan) => {
    if (loan.status === "Aktif") {
      showToast(`Pembayaran cicilan ${loan.id} siap diproses.`);
      setSelectedLoan(loan);
      return;
    }

    if (loan.status === "Menunggu") {
      setLoans((currentLoans) =>
        currentLoans.map((item) =>
          item.id === loan.id ? { ...item, status: "Dibatalkan" } : item,
        ),
      );
      showToast(`Pengajuan ${loan.id} berhasil dibatalkan.`);
      return;
    }

    setSelectedLoan(loan);
  };

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: colors.background }}
    >
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.textPrimary }}
          >
            Pinjaman Anggota
          </h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Kelola pengajuan, pantau cicilan, dan tindak lanjuti status
            pinjaman.
          </p>
        </div>
        <Link href="/dashboard/pinjaman/ajukan">
          <button
            className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus size={18} />
            Ajukan Pinjaman Baru
          </button>
        </Link>
      </div>

      {toast && (
        <div
          className="mb-6 rounded-xl border px-4 py-3 text-sm font-bold shadow-sm"
          style={{
            background: colors.accentGreen,
            borderColor: colors.secondaryLight,
            color: colors.textPrimary,
          }}
        >
          {toast}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          label="Total Pinjaman Aktif"
          value="Rp 5.000.000"
          icon={<CreditCard className="text-blue-500" />}
          subText="Dari 1 Kontrak"
        />
        <StatCard
          label="Sisa Tagihan"
          value="Rp 3.420.000"
          icon={<Clock className="text-orange-500" />}
          subText="Jatuh tempo 7 hari lagi"
        />
        <StatCard
          label="Pinjaman Disetujui"
          value="Rp 17.000.000"
          icon={<CheckCircle2 className="text-emerald-500" />}
          subText="Total kumulatif"
        />
      </div>

      <div
        className="overflow-hidden rounded-xl border shadow-sm"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        <div className="border-b p-6" style={{ borderColor: colors.border }}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="font-bold" style={{ color: colors.textPrimary }}>
                Riwayat Pinjaman
              </h3>
              <p
                className="mt-1 text-sm"
                style={{ color: colors.textSecondary }}
              >
                Tombol aksi menyesuaikan status: bayar cicilan, batalkan
                pengajuan, atau lihat bukti.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative">
                <Search
                  className="absolute left-3 top-2.5"
                  style={{ color: colors.textSecondary }}
                  size={16}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  style={{
                    color: colors.textPrimary,
                    borderColor: colors.border,
                    background: colors.background,
                  }}
                  placeholder="Cari ID / tujuan pinjaman..."
                  className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none focus:border-red-300 md:w-72"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter size={16} style={{ color: colors.textSecondary }} />
                {statusFilters.map((status) => {
                  const active = selectedStatus === status;
                  return (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className="rounded-lg px-3 py-2 text-xs font-bold"
                      style={{
                        background: active
                          ? colors.backgroundAccent
                          : colors.background,
                        border: `1px solid ${active ? colors.borderAccent : colors.border}`,
                        color: active ? colors.primary : colors.textSecondary,
                      }}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left">
            <thead style={{ background: colors.background }}>
              <tr
                className="border-b text-[13px] font-semibold uppercase tracking-wider"
                style={{
                  borderColor: colors.border,
                  color: colors.textSecondary,
                }}
              >
                <th className="px-6 py-4">ID / Tanggal</th>
                <th className="px-6 py-4">Nominal Pinjaman</th>
                <th className="px-6 py-4">Bunga & Tenor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Jatuh Tempo</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map((loan) => (
                <tr
                  key={loan.id}
                  className="border-b transition-colors hover:bg-black/5"
                  style={{ borderColor: colors.border }}
                >
                  <td className="px-6 py-4">
                    <p
                      className="text-sm font-bold"
                      style={{ color: colors.textPrimary }}
                    >
                      {loan.id}
                    </p>
                    <p className="text-xs text-slate-400">{loan.date}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p
                      className="text-sm font-bold"
                      style={{ color: colors.textPrimary }}
                    >
                      {formatCurrency(loan.amount)}
                    </p>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: colors.textMuted }}
                    >
                      Sisa: {formatCurrency(loan.remaining)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p
                      className="text-sm"
                      style={{ color: colors.textSecondary }}
                    >
                      {loan.interest} <span>/ bln</span>
                    </p>
                    <p className="text-xs text-slate-500">{loan.tenor}</p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={loan.status} />
                  </td>
                  <td className="px-6 py-4">
                    <p
                      className="text-sm font-medium"
                      style={{ color: colors.textSecondary }}
                    >
                      {loan.due}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleLoanAction(loan)}
                        disabled={loan.status === "Dibatalkan"}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                        style={{
                          background:
                            loan.status === "Menunggu"
                              ? colors.primary
                              : colors.success,
                        }}
                      >
                        {getActionIcon(loan.status)}{" "}
                        {getActionLabel(loan.status)}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLoans.length === 0 && (
          <div className="p-10 text-center">
            <p className="font-bold" style={{ color: colors.textPrimary }}>
              Pinjaman tidak ditemukan
            </p>
            <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
              Coba ubah pencarian atau filter status.
            </p>
          </div>
        )}
      </div>

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

function getActionLabel(status: string) {
  if (status === "Aktif") return "Bayar";
  if (status === "Menunggu") return "Batalkan";
  if (status === "Lunas") return "Bukti";
  return "Selesai";
}

function getActionIcon(status: string) {
  if (status === "Aktif") return <WalletCards size={16} />;
  if (status === "Menunggu") return <ShieldX size={16} />;
  return <ReceiptText size={16} />;
}

function StatCard({
  label,
  value,
  icon,
  subText,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  subText: string;
}) {
  const colors = useColors();

  return (
    <div
      className="flex items-start justify-between rounded-2xl border p-6 shadow-sm"
      style={{ borderColor: colors.border, background: colors.surface }}
    >
      <div>
        <p
          className="mb-1 text-sm font-medium"
          style={{ color: colors.textSecondary }}
        >
          {label}
        </p>
        <h4
          className="mb-2 text-xl font-extrabold"
          style={{ color: colors.textPrimary }}
        >
          {value}
        </h4>
        <p className="flex items-center gap-1 text-xs text-slate-400">
          <ArrowUpRight size={12} className="text-emerald-500" /> {subText}
        </p>
      </div>
      <div style={{ background: colors.background }} className="rounded-xl p-3">
        {icon}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStyle = () => {
    switch (status) {
      case "Aktif":
        return {
          text: "text-blue-600",
          border: "border-blue-200",
          bg: "bg-blue-50",
          icon: <Clock size={12} />,
        };
      case "Lunas":
        return {
          text: "text-emerald-600",
          border: "border-emerald-200",
          bg: "bg-emerald-50",
          icon: <CheckCircle2 size={12} />,
        };
      case "Menunggu":
        return {
          text: "text-orange-600",
          border: "border-orange-200",
          bg: "bg-orange-50",
          icon: <AlertCircle size={12} />,
        };
      case "Dibatalkan":
        return {
          text: "text-red-600",
          border: "border-red-200",
          bg: "bg-red-50",
          icon: <X size={12} />,
        };
      default:
        return {
          text: "text-gray-600",
          border: "border-gray-200",
          bg: "bg-gray-50",
          icon: null,
        };
    }
  };

  const style = getStyle();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${style.bg} ${style.border} ${style.text}`}
    >
      {style.icon}
      {status}
    </span>
  );
}

function LoanModal({
  loan,
  colors,
  onClose,
}: {
  loan: Loan;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
}) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-xl"
        style={{ background: colors.surface, borderColor: colors.border }}
      >
        <div
          className="flex items-start justify-between border-b p-6"
          style={{ borderColor: colors.border }}
        >
          <div>
            <h2
              className="text-xl font-black"
              style={{ color: colors.textPrimary }}
            >
              Detail Pinjaman
            </h2>
            <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
              {loan.id} • {loan.date}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2"
            style={{ color: colors.textSecondary }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <DetailItem
            label="Nominal Pinjaman"
            value={formatCurrency(loan.amount)}
            colors={colors}
          />
          <DetailItem label="Status" value={loan.status} colors={colors} />
          <DetailItem
            label="Bunga"
            value={`${loan.interest} / bulan`}
            colors={colors}
          />
          <DetailItem label="Tenor" value={loan.tenor} colors={colors} />
          <DetailItem
            label="Cicilan Estimasi"
            value={
              loan.installment
                ? formatCurrency(loan.installment)
                : "Menunggu persetujuan"
            }
            colors={colors}
          />
          <DetailItem
            label="Sisa Tagihan"
            value={formatCurrency(loan.remaining)}
            colors={colors}
          />
          <div className="sm:col-span-2">
            <DetailItem
              label="Tujuan Pinjaman"
              value={loan.purpose}
              colors={colors}
            />
          </div>
        </div>

        <div
          className="flex justify-end gap-3 border-t p-5"
          style={{ borderColor: colors.border }}
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
          <button
            onClick={() => {
              router.push(`/dashboard/pinjaman/${loan.id}/print`);
            }}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
            style={{ background: colors.primary }}
          >
            <ReceiptText size={16} /> Cetak Ringkasan
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
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
      <p
        className="mt-1 text-sm font-black"
        style={{ color: colors.textPrimary }}
      >
        {value}
      </p>
    </div>
  );
}
