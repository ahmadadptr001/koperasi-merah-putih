"use client";

// app/dashboard/simpanan/page.tsx
// Modifikasi: Hanya admin/pengurus yang dapat melihat total seluruh anggota
// - Menampilkan nama pemilik rekening (bukan pembuat)
// - Fitur hapus rekening dengan konfirmasi dan penghapusan saldo
// - Daftar rekening ditampilkan sebagai tabel kompak (bukan card grid)

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
  X,
  AlertCircle,
  Loader2,
  CalendarDays,
  Hash,
  User,
  BookOpen,
  History,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import type { SavingsTransaction, SavingsAccount } from "@/lib/types";
import Swal from "sweetalert2";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const TYPE_FILTERS = ["Semua", "setoran", "penarikan"] as const;
const TYPE_LABEL: Record<string, string> = {
  setoran: "Setoran",
  penarikan: "Penarikan",
};

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function TransactionTypeBadge({ type }: { type: string }) {
  const isSetoran = type === "setoran";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
        isSetoran ? "text-emerald-600" : "text-red-600"
      }`}
    >
      {isSetoran ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {TYPE_LABEL[type] ?? type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isDone = status === "active" || status === "Selesai";
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
        isDone
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {isDone ? "Selesai" : "Diproses"}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  subText,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  subText: string;
  loading?: boolean;
}) {
  const colors = useColors();
  return (
    <div
      className="flex items-start justify-between rounded-2xl border p-5 shadow-sm"
      style={{ background: colors.surface, borderColor: colors.border }}
    >
      <div className="min-w-0">
        <p
          className="mb-1 text-sm font-medium truncate"
          style={{ color: colors.textSecondary }}
        >
          {label}
        </p>
        {loading ? (
          <div
            className="h-7 w-28 animate-pulse rounded-lg mt-1"
            style={{ background: colors.border }}
          />
        ) : (
          <h4
            className="mb-1 text-xl font-extrabold"
            style={{ color: colors.textPrimary }}
          >
            {value}
          </h4>
        )}
        <p className="text-xs" style={{ color: colors.textMuted }}>
          {subText}
        </p>
      </div>
      <div
        style={{ background: colors.background }}
        className="rounded-xl p-3 shrink-0 ml-3"
      >
        {icon}
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
        className="mt-1 text-sm font-black break-all"
        style={{ color: colors.textPrimary }}
      >
        {value || "—"}
      </p>
    </div>
  );
}

// ─── Modal Detail ─────────────────────────────────────────────────────────────

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
  const isSetoran = transaction.transaction_type === "setoran";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-xl rounded-2xl border shadow-xl overflow-hidden"
        style={{ background: colors.surface, borderColor: colors.border }}
      >
        <div
          className="flex items-start justify-between border-b p-6"
          style={{ borderColor: colors.border }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TransactionTypeBadge type={transaction.transaction_type} />
            </div>
            <h2
              className="text-xl font-black"
              style={{ color: colors.textPrimary }}
            >
              Detail Transaksi Simpanan
            </h2>
            <p
              className="mt-1 text-sm font-mono"
              style={{ color: colors.textSecondary }}
            >
              {transaction.reference_number ??
                transaction.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-black/5"
            style={{ color: colors.textSecondary }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-3 p-6 sm:grid-cols-2">
          <DetailItem
            label="Jenis Transaksi"
            value={
              TYPE_LABEL[transaction.transaction_type] ??
              transaction.transaction_type
            }
            colors={colors}
          />
          <DetailItem
            label="Tanggal"
            value={fmtDate(transaction.transaction_date)}
            colors={colors}
          />
          <DetailItem
            label="Nominal"
            value={fmtCurrency(transaction.amount)}
            colors={colors}
          />
          <DetailItem
            label="Saldo Sebelum"
            value={fmtCurrency(transaction.balance_before)}
            colors={colors}
          />
          <DetailItem
            label="Saldo Sesudah"
            value={fmtCurrency(transaction.balance_after)}
            colors={colors}
          />
          <DetailItem
            label="No. Referensi"
            value={transaction.reference_number ?? "—"}
            colors={colors}
          />
          {transaction.description && (
            <div className="sm:col-span-2">
              <DetailItem
                label="Keterangan"
                value={transaction.description}
                colors={colors}
              />
            </div>
          )}
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

// ─── Accounts Table ───────────────────────────────────────────────────────────

function AccountsTable({
  accounts,
  membersMap,
  accountsLoading,
  colors,
  onDelete,
}: {
  accounts: SavingsAccount[];
  membersMap: Record<string, { full_name: string; member_number: string }>;
  accountsLoading: boolean;
  colors: ReturnType<typeof useColors>;
  onDelete: (account: SavingsAccount) => void;
}) {
  const accountTypeLabel: Record<string, string> = {
    pokok: "Pokok",
    wajib: "Wajib",
    sukarela: "Sukarela",
  };

  const accountTypeBadgeStyle: Record<string, { bg: string; text: string }> = {
    pokok: { bg: "#eff6ff", text: "#1d4ed8" },
    wajib: { bg: "#fff7ed", text: "#c2410c" },
    sukarela: { bg: "#f5f3ff", text: "#7c3aed" },
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead style={{ background: colors.background }}>
          <tr
            className="border-b text-[11px] font-black uppercase tracking-wider"
            style={{
              borderColor: colors.border,
              color: colors.textSecondary,
            }}
          >
            <th className="px-5 py-3">No. Rekening</th>
            <th className="px-5 py-3">Pemilik</th>
            <th className="px-5 py-3">Jenis</th>
            <th className="px-5 py-3">Saldo</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Dibuka</th>
            <th className="px-5 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {/* Loading skeleton */}
          {accountsLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <tr
                key={`sk-acc-${i}`}
                className="border-b"
                style={{ borderColor: colors.border }}
              >
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-5 py-3.5">
                    <div
                      className="h-3.5 animate-pulse rounded"
                      style={{
                        background: colors.border,
                        width: j === 0 ? "75%" : "55%",
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}

          {/* Data rows */}
          {!accountsLoading &&
            accounts.map((acc) => {
              const owner = membersMap[acc.member_id];
              const typeStyle = accountTypeBadgeStyle[acc.account_type] ?? {
                bg: colors.background,
                text: colors.textSecondary,
              };
              return (
                <tr
                  key={acc.id}
                  className="border-b transition-colors hover:bg-black/[0.02]"
                  style={{ borderColor: colors.border }}
                >
                  <td className="px-5 py-3.5">
                    <p
                      className="text-xs font-mono font-bold"
                      style={{ color: colors.textPrimary }}
                    >
                      {acc.account_number}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: colors.textPrimary }}
                    >
                      {owner ? (
                        owner.full_name
                      ) : (
                        <span
                          className="animate-pulse"
                          style={{ color: colors.textMuted }}
                        >
                          Memuat...
                        </span>
                      )}
                    </p>
                    {owner?.member_number && (
                      <p
                        className="text-xs font-mono"
                        style={{ color: colors.textMuted }}
                      >
                        {owner.member_number}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                      style={{
                        background: typeStyle.bg,
                        color: typeStyle.text,
                      }}
                    >
                      {accountTypeLabel[acc.account_type] ?? acc.account_type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p
                      className="text-sm font-black"
                      style={{ color: colors.textPrimary }}
                    >
                      {fmtCurrency(Number(acc.balance))}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        acc.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {acc.status === "active" ? "Aktif" : acc.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p
                      className="text-xs"
                      style={{ color: colors.textSecondary }}
                    >
                      {fmtDate(acc.opened_date)}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => onDelete(acc)}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              );
            })}

          {/* Empty */}
          {!accountsLoading && accounts.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-8 text-center">
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  Belum ada rekening simpanan.
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HalamanSimpanan() {
  const colors = useColors();
  const { user, isAdmin, isPengurus, loading: authLoading } = useAuth();
  const router = useRouter();

  // ── Proteksi akses: hanya admin/pengurus ──────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin && !isPengurus) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAdmin, isPengurus, router]);

  // State: transaksi
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // State: rekening simpanan (seluruh anggota)
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // State: data pemilik rekening (member)
  const [membersMap, setMembersMap] = useState<
    Record<string, { full_name: string; member_number: string }>
  >({});

  // State: filter & search
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("Semua");

  // State: modal
  const [selectedTransaction, setSelectedTransaction] =
    useState<SavingsTransaction | null>(null);

  // State: tab aktif
  const [activeTab, setActiveTab] = useState<"rekening" | "transaksi">(
    "rekening",
  );

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset page saat filter berubah
  useEffect(() => {
    setPage(0);
  }, [selectedType]);

  // ── Fetch semua rekening simpanan dan data pemilik ──────────────────────
  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
    setFetchError(null);
    try {
      // 1. Fetch rekening
      const res = await fetch(`/api/savings-acoounts?user_id=${user?.id}`);
      if (!res.ok) {
        throw new Error(`Gagal memuat rekening: ${res.status}`);
      }
      const text = await res.text();
      if (!text) {
        throw new Error("Response kosong dari endpoint rekening");
      }
      const json = JSON.parse(text);
      const data: SavingsAccount[] = json.data ?? [];
      setAccounts(data);

      // 2. Fetch data anggota untuk semua pemilik rekening
      const memberIds = [...new Set(data.map((a) => a.member_id))];
      if (memberIds.length > 0) {
        const memberPromises = memberIds.map(async (id) => {
          const mRes = await fetch(`/api/members/${id}`);
          if (!mRes.ok) {
            console.warn(`Gagal memuat anggota ${id}: ${mRes.status}`);
            return { id, data: null };
          }
          const mText = await mRes.text();
          if (!mText) {
            console.warn(`Response kosong untuk anggota ${id}`);
            return { id, data: null };
          }
          const mJson = JSON.parse(mText);
          return { id, data: mJson.data };
        });
        const memberResults = await Promise.all(memberPromises);
        const map: Record<
          string,
          { full_name: string; member_number: string }
        > = {};
        memberResults.forEach(({ id, data }) => {
          if (data) {
            map[id] = {
              full_name: data.full_name,
              member_number: data.member_number,
            };
          }
        });
        setMembersMap(map);
      }
    } catch (err) {
      console.error("Error di fetchAccounts:", err);
      setFetchError(
        err instanceof Error ? err.message : "Gagal memuat data rekening",
      );
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  // ── Fetch transaksi (global) ──────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (selectedType !== "Semua")
        params.set("transaction_type", selectedType);

      const res = await fetch(
        `/api/savings-transactions?user_id=${user?.id}&${params}`,
      );
      if (!res.ok) {
        throw new Error(`Gagal memuat transaksi: ${res.status}`);
      }
      const text = await res.text();
      if (!text) {
        throw new Error("Response kosong dari endpoint transaksi");
      }
      const json = JSON.parse(text);

      setTransactions(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (err) {
      console.error("Error di fetchTransactions:", err);
      setFetchError(
        err instanceof Error ? err.message : "Gagal memuat data transaksi",
      );
    } finally {
      setLoading(false);
    }
  }, [page, selectedType]);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  // Filter client-side untuk search
  const filteredTransactions = useMemo(() => {
    if (!debouncedSearch) return transactions;
    const kw = debouncedSearch.toLowerCase();
    return transactions.filter(
      (t) =>
        t.id.toLowerCase().includes(kw) ||
        (t.reference_number?.toLowerCase().includes(kw) ?? false) ||
        (t.description?.toLowerCase().includes(kw) ?? false) ||
        t.transaction_type.toLowerCase().includes(kw),
    );
  }, [transactions, debouncedSearch]);

  // Hitung stats dari seluruh rekening (global)
  const stats = useMemo(() => {
    const totalSaldo = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
    const pokok = accounts
      .filter((a) => a.account_type === "pokok")
      .reduce((s, a) => s + Number(a.balance), 0);
    const wajib = accounts
      .filter((a) => a.account_type === "wajib")
      .reduce((s, a) => s + Number(a.balance), 0);
    const sukarela = accounts
      .filter((a) => a.account_type === "sukarela")
      .reduce((s, a) => s + Number(a.balance), 0);
    return { totalSaldo, pokok, wajib, sukarela };
  }, [accounts]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Handle penghapusan rekening ────────────────────────────────────────────
  const handleDeleteAccount = async (account: SavingsAccount) => {
    const balance = Number(account.balance);
    const ownerName = membersMap[account.member_id]?.full_name || "Anggota";

    let message = `Anda akan menghapus rekening ${account.account_number} milik ${ownerName}.`;
    if (balance > 0) {
      message += `\n\nRekening ini masih memiliki saldo sebesar ${fmtCurrency(balance)}. Saldo tersebut akan dihapus juga.`;
    }

    const result = await Swal.fire({
      title: "Hapus Rekening?",
      text: message,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/savings-acoounts/${account.id}`, {
        method: "DELETE",
      });

      // Cek response
      if (!res.ok) {
        const errorText = await res.text();
        let errorMsg = `Gagal menghapus rekening (${res.status})`;
        try {
          const json = JSON.parse(errorText);
          errorMsg = json.error || errorMsg;
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }

      // Jika response ok, parse JSON
      const json = await res.json();
      if (json.error) {
        throw new Error(json.error);
      }

      await Swal.fire({
        icon: "success",
        title: "Rekening Dihapus",
        timer: 1500,
        showConfirmButton: false,
      });

      void fetchAccounts();
      void fetchTransactions();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    }
  };

  // Jika belum siap auth atau bukan admin/pengurus, tampilkan loading
  if (authLoading || (!isAdmin && !isPengurus)) {
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

  // ─── Render ─────────────────────────────────────────────────────────────────

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
            Keuangan Anggota
          </p>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.textPrimary }}
          >
            Simpanan (Seluruh Anggota)
          </h1>
          <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
            Total saldo dan rekening simpanan seluruh anggota koperasi.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              void fetchTransactions();
              void fetchAccounts();
            }}
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
          <Link href="/dashboard/simpanan/setor">
            <button
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
              style={{ backgroundColor: colors.primary }}
            >
              <Plus size={18} />
              Setor Simpanan
            </button>
          </Link>
          <Link href="/dashboard/simpanan/tarik">
            <button
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
              style={{ backgroundColor: colors.primary }}
            >
              <ArrowDown size={18} />
              Tarik Simpanan
            </button>
          </Link>
        </div>
      </div>

      {/* STAT CARDS (Global) */}
      <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Saldo Seluruh Anggota"
          value={fmtCurrency(stats.totalSaldo)}
          icon={<Wallet className="text-blue-500" size={22} />}
          subText={`${accounts.length} rekening aktif`}
          loading={accountsLoading}
        />
        <StatCard
          label="Total Simpanan Pokok"
          value={fmtCurrency(stats.pokok)}
          icon={<PiggyBank className="text-emerald-500" size={22} />}
          subText="Simpanan dasar keanggotaan"
          loading={accountsLoading}
        />
        <StatCard
          label="Total Simpanan Wajib"
          value={fmtCurrency(stats.wajib)}
          icon={<TrendingUp className="text-orange-500" size={22} />}
          subText="Iuran wajib bulanan"
          loading={accountsLoading}
        />
        <StatCard
          label="Total Simpanan Sukarela"
          value={fmtCurrency(stats.sukarela)}
          icon={<ArrowUp className="text-purple-500" size={22} />}
          subText="Tabungan opsional"
          loading={accountsLoading}
        />
      </div>

      {/* TAB SWITCHER + CONTENT */}
      <div
        className="overflow-hidden rounded-xl border shadow-sm"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        {/* ── Tab header ── */}
        <div
          className="flex items-center gap-1 border-b px-5 py-3"
          style={{ borderColor: colors.border, background: colors.background }}
        >
          {/* Pill slider container */}
          <div
            className="relative flex rounded-xl p-1 gap-1"
            style={{ background: colors.border + "55" }}
          >
            {/* Sliding indicator */}
            <div
              className="absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-in-out shadow-sm"
              style={{
                background: colors.surface,
                width: "calc(50% - 2px)",
                left: activeTab === "rekening" ? "4px" : "calc(50% + 2px)",
              }}
            />
            <button
              onClick={() => setActiveTab("rekening")}
              className="relative z-10 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-200"
              style={{
                color:
                  activeTab === "rekening"
                    ? colors.primary
                    : colors.textSecondary,
                minWidth: 160,
                justifyContent: "center",
              }}
            >
              <BookOpen size={15} />
              Rekening Simpanan
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-black"
                style={{
                  background:
                    activeTab === "rekening"
                      ? colors.backgroundAccent
                      : colors.border,
                  color:
                    activeTab === "rekening"
                      ? colors.primary
                      : colors.textMuted,
                }}
              >
                {accounts.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("transaksi")}
              className="relative z-10 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-200"
              style={{
                color:
                  activeTab === "transaksi"
                    ? colors.primary
                    : colors.textSecondary,
                minWidth: 160,
                justifyContent: "center",
              }}
            >
              <History size={15} />
              Riwayat Transaksi
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-black"
                style={{
                  background:
                    activeTab === "transaksi"
                      ? colors.backgroundAccent
                      : colors.border,
                  color:
                    activeTab === "transaksi"
                      ? colors.primary
                      : colors.textMuted,
                }}
              >
                {total}
              </span>
            </button>
          </div>
        </div>

        {/* ── Tab: Rekening ── */}
        {activeTab === "rekening" && (
          <>
            <div
              className="flex items-center justify-between border-b px-5 py-3"
              style={{ borderColor: colors.border }}
            >
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                {accountsLoading
                  ? "Memuat data rekening..."
                  : `${accounts.length} rekening ditemukan`}
              </p>
            </div>
            <AccountsTable
              accounts={accounts}
              membersMap={membersMap}
              accountsLoading={accountsLoading}
              colors={colors}
              onDelete={handleDeleteAccount}
            />
          </>
        )}

        {/* ── Tab: Transaksi ── */}
        {activeTab === "transaksi" && (
          <>
            <div
              className="border-b p-5"
              style={{ borderColor: colors.border }}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  {total > 0
                    ? `${total.toLocaleString("id-ID")} transaksi ditemukan`
                    : "Belum ada transaksi"}
                </p>
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
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari referensi / keterangan..."
                      style={{
                        color: colors.textPrimary,
                        borderColor: colors.border,
                        background: colors.background,
                      }}
                      className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-red-100 md:w-72"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter size={16} style={{ color: colors.textSecondary }} />
                    {TYPE_FILTERS.map((f) => {
                      const active = selectedType === f;
                      return (
                        <button
                          key={f}
                          onClick={() => setSelectedType(f)}
                          className="rounded-lg px-3 py-2 text-xs font-bold transition-colors"
                          style={{
                            background: active
                              ? colors.backgroundAccent
                              : colors.background,
                            border: `1px solid ${active ? colors.borderAccent : colors.border}`,
                            color: active
                              ? colors.primary
                              : colors.textSecondary,
                          }}
                        >
                          {f === "Semua" ? "Semua" : (TYPE_LABEL[f] ?? f)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {fetchError && (
              <div
                className="flex items-center gap-3 px-6 py-4 border-b text-sm text-red-700 bg-red-50"
                style={{ borderColor: colors.border }}
              >
                <AlertCircle size={16} />
                {fetchError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead style={{ background: colors.background }}>
                  <tr
                    className="border-b text-[12px] font-black uppercase tracking-wider"
                    style={{
                      borderColor: colors.border,
                      color: colors.textSecondary,
                    }}
                  >
                    <th className="px-6 py-4">Referensi / Tanggal</th>
                    <th className="px-6 py-4">Jenis</th>
                    <th className="px-6 py-4">Nama</th>
                    <th className="px-6 py-4">Nominal</th>
                    <th className="px-6 py-4">Saldo Sebelum</th>
                    <th className="px-6 py-4">Saldo Sesudah</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr
                        key={`sk-${i}`}
                        className="border-b"
                        style={{ borderColor: colors.border }}
                      >
                        {Array.from({ length: 7 }).map((_, j) => (
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

                  {!loading &&
                    filteredTransactions.map((trx) => {
                      const isSetoran = trx.transaction_type === "setoran";
                      const owner = membersMap[trx.member_id];
                      return (
                        <tr
                          key={trx.id}
                          className="border-b transition-colors hover:bg-black/5"
                          style={{ borderColor: colors.border }}
                        >
                          <td className="px-6 py-4">
                            <p
                              className="text-sm font-bold font-mono"
                              style={{ color: colors.textPrimary }}
                            >
                              {trx.reference_number ??
                                trx.id.slice(0, 8).toUpperCase()}
                            </p>
                            <p
                              className="mt-0.5 flex items-center gap-1 text-xs"
                              style={{ color: colors.textMuted }}
                            >
                              <CalendarDays size={11} />
                              {fmtDate(trx.transaction_date)}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <TransactionTypeBadge type={trx.transaction_type} />
                            {trx.description && (
                              <p
                                className="mt-0.5 text-xs max-w-[160px] truncate"
                                style={{ color: colors.textMuted }}
                              >
                                {trx.description}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p
                              className="text-sm font-bold"
                              style={{ color: colors.textPrimary }}
                            >
                              {owner ? owner.full_name : "—"}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p
                              className="text-sm font-black"
                              style={{
                                color: isSetoran ? "#15803d" : "#b91c1c",
                              }}
                            >
                              {isSetoran ? "+" : "-"}
                              {fmtCurrency(trx.amount)}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p
                              className="text-sm"
                              style={{ color: colors.textSecondary }}
                            >
                              {fmtCurrency(trx.balance_before)}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p
                              className="text-sm font-bold"
                              style={{ color: colors.textPrimary }}
                            >
                              {fmtCurrency(trx.balance_after)}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setSelectedTransaction(trx)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white transition-transform hover:scale-105"
                                style={{ background: colors.primary }}
                              >
                                <Printer size={15} /> Bukti
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {!loading && filteredTransactions.length === 0 && !fetchError && (
              <div className="p-12 text-center">
                <PiggyBank
                  size={40}
                  className="mx-auto mb-3 opacity-30"
                  style={{ color: colors.textMuted }}
                />
                <p className="font-bold" style={{ color: colors.textPrimary }}>
                  Belum ada transaksi
                </p>
                <p
                  className="mt-1 text-sm"
                  style={{ color: colors.textSecondary }}
                >
                  {debouncedSearch || selectedType !== "Semua"
                    ? "Coba ubah filter atau kata kunci pencarian."
                    : "Mulai dengan melakukan setoran simpanan."}
                </p>
              </div>
            )}

            {!loading && totalPages > 1 && (
              <div
                className="flex items-center justify-between border-t px-6 py-4"
                style={{ borderColor: colors.border }}
              >
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  Menampilkan {page * PAGE_SIZE + 1}–
                  {Math.min((page + 1) * PAGE_SIZE, total)} dari{" "}
                  {total.toLocaleString("id-ID")} transaksi
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-lg px-3 py-1.5 text-sm font-bold transition-colors disabled:opacity-40"
                    style={{
                      border: `1px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.textPrimary,
                    }}
                  >
                    ← Sebelumnya
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    className="rounded-lg px-3 py-1.5 text-sm font-bold transition-colors disabled:opacity-40"
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
          </>
        )}
      </div>

      {/* Modal */}
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
