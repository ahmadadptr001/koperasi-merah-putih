"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Filter,
  PiggyBank,
  Plus,
  Printer,
  ReceiptText,
  Search,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";

const savingsHistory = [
  {
    id: "SP-001",
    date: "15 Apr 2026",
    type: "Setoran Pokok",
    amount: 500000,
    balance: 500000,
    method: "Transfer Bank",
    status: "Selesai",
    officer: "Admin Koperasi",
    note: "Setoran awal keanggotaan",
  },
  {
    id: "SP-002",
    date: "01 Mei 2026",
    type: "Setoran Wajib",
    amount: 50000,
    balance: 550000,
    method: "Kas Koperasi",
    status: "Selesai",
    officer: "Bendahara",
    note: "Iuran wajib bulan Mei",
  },
  {
    id: "SP-003",
    date: "05 Mei 2026",
    type: "Setoran Sukarela",
    amount: 200000,
    balance: 750000,
    method: "Transfer Bank",
    status: "Selesai",
    officer: "Admin Koperasi",
    note: "Tambahan simpanan sukarela",
  },
  {
    id: "SP-004",
    date: "10 Mei 2026",
    type: "Penarikan",
    amount: -100000,
    balance: 650000,
    method: "Kas Koperasi",
    status: "Diproses",
    officer: "Menunggu persetujuan",
    note: "Penarikan sebagian simpanan sukarela",
  },
];

const typeFilters = [
  "Semua",
  "Setoran Pokok",
  "Setoran Wajib",
  "Setoran Sukarela",
  "Penarikan",
];

type SavingsTransaction = (typeof savingsHistory)[number];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function HalamanSimpanan() {
  const colors = useColors();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("Semua");
  const [selectedTransaction, setSelectedTransaction] =
    useState<SavingsTransaction | null>(null);

  const filteredSavings = useMemo(() => {
    const keyword = searchTerm.toLowerCase();

    return savingsHistory.filter((transaction) => {
      const matchesSearch =
        transaction.id.toLowerCase().includes(keyword) ||
        transaction.type.toLowerCase().includes(keyword) ||
        transaction.method.toLowerCase().includes(keyword);
      const matchesType =
        selectedType === "Semua" || transaction.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [searchTerm, selectedType]);

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
            Simpanan Anggota
          </h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Kelola simpanan pokok, wajib, sukarela, dan bukti transaksi anggota.
          </p>
        </div>
        <Link href="/dashboard/simpanan/setor">
          <button
            className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus size={18} />
            Setor Simpanan
          </button>
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatCard
          label="Total Saldo"
          value="Rp 650.000"
          icon={<Wallet className="text-blue-500" />}
          subText="Saldo terkini"
        />
        <StatCard
          label="Simpanan Pokok"
          value="Rp 500.000"
          icon={<PiggyBank className="text-emerald-500" />}
          subText="Wajib dibayar"
        />
        <StatCard
          label="Simpanan Wajib"
          value="Rp 50.000"
          icon={<TrendingUp className="text-orange-500" />}
          subText="Bulanan"
        />
        <StatCard
          label="Simpanan Sukarela"
          value="Rp 100.000"
          icon={<ArrowUp className="text-purple-500" />}
          subText="Opsional"
        />
      </div>

      <div
        className="overflow-hidden rounded-xl border shadow-sm"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        <div
          className="border-b p-6"
          style={{ borderColor: colors.borderLightGray }}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="font-bold" style={{ color: colors.textPrimary }}>
                Riwayat Transaksi
              </h3>
              <p
                className="mt-1 text-sm"
                style={{ color: colors.textSecondary }}
              >
                Lihat detail transaksi dan cetak bukti simpanan.
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
                  placeholder="Cari ID / jenis transaksi..."
                  style={{
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    background: colors.background,
                  }}
                  className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none focus:border-red-300 md:w-72"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter size={16} style={{ color: colors.textSecondary }} />
                {typeFilters.map((type) => {
                  const active = selectedType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className="rounded-lg px-3 py-2 text-xs font-bold"
                      style={{
                        background: active
                          ? colors.backgroundAccent
                          : colors.background,
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
          <table className="w-full min-w-[860px] text-left">
            <thead style={{ background: colors.background }}>
              <tr
                className="border-b text-[13px] font-semibold uppercase tracking-wider"
                style={{
                  borderColor: colors.border,
                  color: colors.textSecondary,
                }}
              >
                <th className="px-6 py-4">ID / Tanggal</th>
                <th className="px-6 py-4">Jenis Transaksi</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Saldo Akhir</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredSavings.map((transaction) => (
                <tr
                  key={transaction.id}
                  style={{ borderColor: colors.border }}
                  className="border-b transition-colors hover:bg-black/5"
                >
                  <td className="px-6 py-4">
                    <p
                      className="text-sm font-bold"
                      style={{ color: colors.textPrimary }}
                    >
                      {transaction.id}
                    </p>
                    <p className="text-xs text-slate-400">{transaction.date}</p>
                  </td>
                  <td className="px-6 py-4">
                    <TransactionTypeBadge type={transaction.type} />
                    <p
                      className="mt-1 text-xs"
                      style={{ color: colors.textMuted }}
                    >
                      {transaction.method}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p
                      className={`text-sm font-bold ${transaction.amount > 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {transaction.amount > 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p
                      className="text-sm font-bold"
                      style={{ color: colors.textSecondary }}
                    >
                      {formatCurrency(transaction.balance)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={transaction.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white transition-transform hover:scale-105"
                        style={{ background: colors.primary }}
                        title="Cetak bukti transaksi"
                      >
                        <Printer size={16} /> Bukti
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSavings.length === 0 && (
          <div className="p-10 text-center">
            <p className="font-bold" style={{ color: colors.textPrimary }}>
              Transaksi tidak ditemukan
            </p>
            <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
              Coba ubah pencarian atau filter jenis transaksi.
            </p>
          </div>
        )}
      </div>

      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          colors={colors}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
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
      style={{ background: colors.surface, borderColor: colors.border }}
    >
      <div>
        <p
          style={{ color: colors.textSecondary }}
          className="mb-1 text-sm font-medium"
        >
          {label}
        </p>
        <h4
          className="mb-2 text-xl font-extrabold"
          style={{ color: colors.textPrimary }}
        >
          {value}
        </h4>
        <p className="text-xs text-slate-400">{subText}</p>
      </div>
      <div style={{ background: colors.background }} className="rounded-xl p-3">
        {icon}
      </div>
    </div>
  );
}

function TransactionTypeBadge({ type }: { type: string }) {
  const getStyle = () => {
    switch (type) {
      case "Setoran Pokok":
        return { text: "text-blue-600", icon: <ArrowUp size={12} /> };
      case "Setoran Wajib":
        return { text: "text-emerald-600", icon: <TrendingUp size={12} /> };
      case "Setoran Sukarela":
        return { text: "text-purple-600", icon: <PiggyBank size={12} /> };
      case "Penarikan":
        return { text: "text-red-600", icon: <ArrowDown size={12} /> };
      default:
        return { text: "text-gray-600", icon: <ReceiptText size={12} /> };
    }
  };

  const style = getStyle();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${style.text}`}
    >
      {style.icon}
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isDone = status === "Selesai";
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${isDone ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
    >
      {status}
    </span>
  );
}

function TransactionModal({
  transaction,
  colors,
  onClose,
}: {
  transaction: SavingsTransaction;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-xl rounded-2xl border shadow-xl"
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
              Detail Transaksi Simpanan
            </h2>
            <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
              {transaction.id} • {transaction.date}
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
          <DetailItem label="Jenis" value={transaction.type} colors={colors} />
          <DetailItem
            label="Metode"
            value={transaction.method}
            colors={colors}
          />
          <DetailItem
            label="Nominal"
            value={formatCurrency(Math.abs(transaction.amount))}
            colors={colors}
          />
          <DetailItem
            label="Saldo Akhir"
            value={formatCurrency(transaction.balance)}
            colors={colors}
          />
          <DetailItem
            label="Status"
            value={transaction.status}
            colors={colors}
          />
          <DetailItem
            label="Petugas"
            value={transaction.officer}
            colors={colors}
          />
          <div className="sm:col-span-2">
            <DetailItem
              label="Catatan"
              value={transaction.note}
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
              router.push(`/dashboard/simpanan/${transaction.id}/print`);
            }}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
            style={{ background: colors.primary }}
          >
            <Printer size={16} /> Cetak Bukti
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
