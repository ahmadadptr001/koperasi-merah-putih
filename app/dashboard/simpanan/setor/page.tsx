"use client";

// app/dashboard/simpanan/setor/page.tsx
// Modifikasi: Tambahkan fitur buat rekening otomatis jika belum ada

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Send,
  PiggyBank,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Wallet,
  TrendingUp,
  Info,
  Plus,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import type { SavingsAccount, Member } from "@/lib/types";
import Swal from "sweetalert2";

// ─── Schema ───────────────────────────────────────────────────────────────────

const accountsTypes = ["pokok", "wajib", "sukarela"] as const;
const setoranSchema = z.object({
  member_id: z.string().min(1, "Pilih anggota terlebih dahulu"),
  account_type: z.enum(accountsTypes, {
    error: (iss) =>
      iss.input === undefined
        ? "Pilih jenis simpanan"
        : "Jenis simpanan tidak valid",
  }),

  amount: z
    .number({
      error: (iss) =>
        iss.input === undefined
          ? "Masukkan jumlah"
          : "Masukkan jumlah yang valid",
    })
    .min(1000, "Minimal setoran Rp 1.000"),

  description: z.string().optional(),
  transaction_date: z.string().min(1, "Tanggal wajib diisi"),
});

type SetoranForm = z.infer<typeof setoranSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

const ACCOUNT_TYPE_CONFIG = {
  pokok: {
    label: "Simpanan Pokok",
    desc: "Simpanan dasar wajib dibayar saat pertama bergabung",
    icon: PiggyBank,
    color: "#2563eb",
  },
  wajib: {
    label: "Simpanan Wajib",
    desc: "Iuran rutin bulanan yang wajib dibayar setiap anggota",
    icon: TrendingUp,
    color: "#f59e0b",
  },
  sukarela: {
    label: "Simpanan Sukarela",
    desc: "Tabungan opsional yang bisa disetor kapan saja",
    icon: Wallet,
    color: "#7c3aed",
  },
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccountInfoCard({
  account,
  colors,
}: {
  account: SavingsAccount | null;
  colors: ReturnType<typeof useColors>;
}) {
  if (!account) return null;
  const cfg = ACCOUNT_TYPE_CONFIG[account.account_type];
  const Icon = cfg.icon;

  return (
    <div
      className="rounded-xl border p-4 flex items-center gap-4"
      style={{ borderColor: colors.border, background: colors.background }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${cfg.color}15`, color: cfg.color }}
      >
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: colors.textMuted }}
        >
          {cfg.label}
        </p>
        <p
          className="text-xl font-black mt-0.5"
          style={{ color: colors.textPrimary }}
        >
          {fmtCurrency(Number(account.balance))}
        </p>
        <p
          className="text-xs font-mono mt-0.5"
          style={{ color: colors.textMuted }}
        >
          {account.account_number}
        </p>
      </div>
      <div>
        <span
          className="text-xs font-black px-2.5 py-1 rounded-full"
          style={{
            background: account.status === "active" ? "#dcfce7" : "#fee2e2",
            color: account.status === "active" ? "#15803d" : "#b91c1c",
          }}
        >
          {account.status === "active" ? "Aktif" : account.status}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HalamanSetorSimpanan() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();

  // ✅ Semua role fetch daftar members
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // State rekening berdasarkan member + type yang dipilih
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [activeAccount, setActiveAccount] = useState<SavingsAccount | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SetoranForm>({
    resolver: zodResolver(setoranSchema),
    defaultValues: {
      transaction_date: new Date().toISOString().slice(0, 10),
      amount: undefined,
    },
  });

  const watchedType = watch("account_type");
  const watchedAmount = watch("amount");
  const watchedMemberId = watch("member_id");

  // ✅ Fetch daftar anggota aktif untuk semua role
  useEffect(() => {
    setMembersLoading(true);
    fetch("/api/members?status=active&limit=200")
      .then((r) => r.json())
      .then((json) => setMembers(json.data ?? []))
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }, []);

  // ─── Fetch rekening saat member_id atau type berubah ──────────────────────
  const fetchAccounts = useCallback(async (memberId: string, type?: string) => {
    if (!memberId) {
      setAccounts([]);
      setActiveAccount(null);
      return;
    }

    setAccountsLoading(true);
    try {
      const params = new URLSearchParams({
        member_id: memberId,
        status: "active",
      });
      if (type) params.set("account_type", type);

      const res = await fetch(`/api/savings-acoounts?${params}`);
      const json = await res.json();
      const data: SavingsAccount[] = json.data ?? [];
      setAccounts(data);
      setActiveAccount(type ? (data[0] ?? null) : null);
    } catch {
      setAccounts([]);
      setActiveAccount(null);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!watchedMemberId) return;
    void fetchAccounts(watchedMemberId, watchedType);
  }, [watchedMemberId, watchedType, fetchAccounts]);

  // ─── Fungsi untuk membuat rekening baru ──────────────────────────────────
  const handleCreateAccount = async () => {
    if (!watchedMemberId || !watchedType) {
      await Swal.fire({
        icon: "warning",
        title: "Data Tidak Lengkap",
        text: "Pilih anggota dan jenis simpanan terlebih dahulu.",
        confirmButtonColor: colors.primary,
      });
      return;
    }

    const confirmed = await Swal.fire({
      title: "Buat Rekening Baru?",
      html: `
        <div style="text-align:left;font-size:14px;line-height:1.8">
          <div>Anggota: <b>${members.find((m) => m.id === watchedMemberId)?.full_name ?? "—"}</b></div>
          <div>Jenis: <b>${ACCOUNT_TYPE_CONFIG[watchedType].label}</b></div>
        </div>
        <p style="margin-top:12px;font-size:12px;color:#64748b">Rekening akan dibuat dengan saldo awal 0.</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: colors.primary,
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Buat Rekening",
      cancelButtonText: "Batal",
    });

    if (!confirmed.isConfirmed) return;

    try {
      const res = await fetch("/api/savings-acoounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: watchedMemberId,
          account_type: watchedType,
          balance: 0,
          status: "active",
          opened_date: new Date().toISOString().slice(0, 10),
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Gagal membuat rekening");
      }

      await Swal.fire({
        icon: "success",
        title: "Rekening Berhasil Dibuat!",
        text: `Rekening ${ACCOUNT_TYPE_CONFIG[watchedType].label} untuk anggota ini telah aktif. Silakan setor sekarang.`,
        confirmButtonColor: colors.primary,
        confirmButtonText: "Oke",
      });

      // Refresh data rekening
      await fetchAccounts(watchedMemberId, watchedType);
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal Membuat Rekening",
        text: err instanceof Error ? err.message : "Terjadi kesalahan.",
        confirmButtonColor: colors.primary,
      });
    }
  };

  // ─── Submit setoran ────────────────────────────────────────────────────────
  const onSubmit = async (data: SetoranForm) => {
    if (!activeAccount && !accountsLoading) {
      // Tawarkan untuk membuat rekening
      const result = await Swal.fire({
        title: "Rekening Tidak Ditemukan",
        html: `
          <div style="font-size:14px;line-height:1.6">
            Rekening <b>${ACCOUNT_TYPE_CONFIG[data.account_type].label}</b> belum tersedia untuk anggota ini.
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Buat Rekening Sekarang",
        cancelButtonText: "Batal",
        confirmButtonColor: colors.primary,
        cancelButtonColor: "#6b7280",
      });

      if (result.isConfirmed) {
        await handleCreateAccount();
        // Setelah rekening dibuat, user bisa submit ulang (tapi tidak otomatis)
        // Untuk memudahkan, kita bisa set nilai form dan submit ulang? Biarkan user klik setor lagi.
      }
      return;
    }

    const confirmed = await Swal.fire({
      title: "Konfirmasi Setoran",
      html: `
        <div style="text-align:left;font-size:14px;line-height:1.8">
          <div><b>Jenis:</b> ${ACCOUNT_TYPE_CONFIG[data.account_type].label}</div>
          <div><b>Jumlah:</b> ${fmtCurrency(data.amount)}</div>
          <div><b>Tanggal:</b> ${new Date(data.transaction_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
          ${data.description ? `<div><b>Keterangan:</b> ${data.description}</div>` : ""}
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: colors.primary,
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Setor!",
      cancelButtonText: "Batal",
    });

    if (!confirmed.isConfirmed) return;

    try {
      const res = await fetch("/api/savings-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: data.member_id,
          account_type: data.account_type,
          transaction_type: "setoran",
          amount: data.amount,
          description: data.description || null,
          transaction_date: data.transaction_date,
          user_id: user?.id,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Gagal memproses setoran");
      }

      await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference_type: "savings_withdrawal", // atau "savings_deposit" kalau mau, tapi schema hanya terima yg ada. Karena hanya untuk catatan, pakai "savings_withdrawal" pun bisa.
          reference_id: activeAccount?.id,
          title: `Setoran Simpanan`,
          description: `Jumlah: ${data.amount} | Jenis: ${ACCOUNT_TYPE_CONFIG[data.account_type].label}`,
          requested_by: user?.id,
        }),
      });

      await Swal.fire({
        icon: "success",
        title: "Setoran Berhasil!",
        html: `
          <div style="font-size:14px;line-height:1.8">
            <div>Setoran <b>${fmtCurrency(data.amount)}</b> berhasil dicatat.</div>
            <div style="margin-top:4px;color:#6b7280">No. Ref: <b>${json.data?.reference_number ?? "—"}</b></div>
          </div>
        `,
        confirmButtonColor: colors.primary,
        confirmButtonText: "Lihat Riwayat",
      });

      router.push("/dashboard/simpanan");
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan.",
        confirmButtonColor: colors.primary,
      });
    }
  };

  // ─── Field styles ─────────────────────────────────────────────────────────
  const fieldClass =
    "w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100";
  const fieldStyle = (hasError?: boolean) => ({
    borderColor: hasError ? "#ef4444" : colors.border,
    background: colors.background,
    color: colors.textPrimary,
  });

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
        <p
          className="mb-2 text-sm font-semibold"
          style={{ color: colors.primary }}
        >
          Transaksi Simpanan
        </p>
        <h1
          className="text-2xl font-bold"
          style={{ color: colors.textPrimary }}
        >
          Setor Simpanan
        </h1>
        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          Catat setoran simpanan anggota ke rekening yang sesuai.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        {/* ─── FORM ──────────────────────────────────────────────────────────── */}
        <div
          className="rounded-xl border p-6 shadow-sm"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-6"
          >
            {/* ✅ Pilih Anggota — semua role pakai dropdown */}
            <div>
              <label
                className="block text-sm font-bold mb-2"
                style={{ color: colors.textPrimary }}
              >
                Anggota <span style={{ color: colors.primary }}>*</span>
              </label>
              {membersLoading ? (
                <div
                  className="flex items-center gap-2 py-3"
                  style={{ color: colors.textMuted }}
                >
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Memuat daftar anggota...</span>
                </div>
              ) : (
                <select
                  {...register("member_id")}
                  className={fieldClass}
                  style={fieldStyle(!!errors.member_id)}
                >
                  <option value="">-- Pilih Anggota --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} — {m.member_number}
                    </option>
                  ))}
                </select>
              )}
              {errors.member_id && (
                <p className="mt-1.5 text-xs font-semibold text-red-500">
                  {errors.member_id.message}
                </p>
              )}
            </div>

            {/* Jenis Simpanan */}
            <div>
              <label
                className="block text-sm font-bold mb-3"
                style={{ color: colors.textPrimary }}
              >
                Jenis Simpanan <span style={{ color: colors.primary }}>*</span>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(
                  Object.keys(ACCOUNT_TYPE_CONFIG) as Array<
                    keyof typeof ACCOUNT_TYPE_CONFIG
                  >
                ).map((type) => {
                  const cfg = ACCOUNT_TYPE_CONFIG[type];
                  const Icon = cfg.icon;
                  const isSelected = watchedType === type;
                  const account = accounts.find((a) => a.account_type === type);
                  const hasAccount = !!account;

                  return (
                    <label
                      key={type}
                      className="relative flex flex-col gap-2 rounded-xl border p-4 cursor-pointer transition-all hover:border-current"
                      style={{
                        borderColor: isSelected ? cfg.color : colors.border,
                        background: isSelected
                          ? `${cfg.color}08`
                          : colors.background,
                        boxShadow: isSelected
                          ? `0 0 0 2px ${cfg.color}30`
                          : "none",
                      }}
                    >
                      <input
                        type="radio"
                        value={type}
                        {...register("account_type")}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{
                            background: `${cfg.color}15`,
                            color: cfg.color,
                          }}
                        >
                          <Icon size={18} />
                        </div>
                        {isSelected && (
                          <CheckCircle2
                            size={18}
                            style={{ color: cfg.color }}
                          />
                        )}
                      </div>
                      <div>
                        <p
                          className="text-sm font-black"
                          style={{ color: colors.textPrimary }}
                        >
                          {cfg.label}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: colors.textMuted }}
                        >
                          {cfg.desc}
                        </p>
                      </div>
                      {hasAccount && !accountsLoading && (
                        <p
                          className="text-xs font-bold"
                          style={{ color: cfg.color }}
                        >
                          Saldo: {fmtCurrency(Number(account.balance))}
                        </p>
                      )}
                      {!hasAccount && watchedMemberId && !accountsLoading && (
                        <p
                          className="text-xs"
                          style={{ color: colors.textMuted }}
                        >
                          Rekening belum dibuat
                        </p>
                      )}
                    </label>
                  );
                })}
              </div>
              {errors.account_type && (
                <p className="mt-2 text-xs font-semibold text-red-500">
                  {errors.account_type.message}
                </p>
              )}
            </div>

            {/* Info rekening aktif + tombol buat rekening */}
            {accountsLoading && (
              <div
                className="flex items-center gap-2"
                style={{ color: colors.textMuted }}
              >
                <Loader2 size={15} className="animate-spin" />
                <span className="text-sm">Memeriksa rekening...</span>
              </div>
            )}
            {!accountsLoading && activeAccount && (
              <AccountInfoCard account={activeAccount} colors={colors} />
            )}
            {!accountsLoading &&
              watchedType &&
              watchedMemberId &&
              !activeAccount && (
                <div className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm">
                  <div
                    style={{
                      borderColor: "#fde68a",
                      background: "#fef3c7",
                    }}
                    className="flex-1 flex items-start gap-2"
                  >
                    <AlertCircle
                      size={16}
                      className="shrink-0 mt-0.5 text-amber-600"
                    />
                    <p className="text-amber-800">
                      Rekening <b>{ACCOUNT_TYPE_CONFIG[watchedType]?.label}</b>{" "}
                      belum tersedia untuk anggota ini.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateAccount}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-white whitespace-nowrap"
                    style={{ background: colors.primary }}
                  >
                    <Plus size={15} /> Buat Rekening
                  </button>
                </div>
              )}

            {/* Jumlah Setoran */}
            <div>
              <label
                className="block text-sm font-bold mb-2"
                style={{ color: colors.textPrimary }}
              >
                Jumlah Setoran (Rp){" "}
                <span style={{ color: colors.primary }}>*</span>
              </label>
              <input
                type="number"
                min={1000}
                step={1000}
                {...register("amount", { valueAsNumber: true })}
                placeholder="Contoh: 100000"
                className={fieldClass}
                style={fieldStyle(!!errors.amount)}
              />
              {watchedAmount > 0 && (
                <p
                  className="mt-1.5 text-xs font-semibold"
                  style={{ color: colors.primary }}
                >
                  {fmtCurrency(watchedAmount)}
                </p>
              )}
              {errors.amount && (
                <p className="mt-1.5 text-xs font-semibold text-red-500">
                  {errors.amount.message}
                </p>
              )}
            </div>

            {/* Tanggal Transaksi */}
            <div>
              <label
                className="block text-sm font-bold mb-2"
                style={{ color: colors.textPrimary }}
              >
                Tanggal Transaksi{" "}
                <span style={{ color: colors.primary }}>*</span>
              </label>
              <input
                type="date"
                {...register("transaction_date")}
                max={new Date().toISOString().slice(0, 10)}
                className={fieldClass}
                style={fieldStyle(!!errors.transaction_date)}
              />
              {errors.transaction_date && (
                <p className="mt-1.5 text-xs font-semibold text-red-500">
                  {errors.transaction_date.message}
                </p>
              )}
            </div>

            {/* Keterangan */}
            <div>
              <label
                className="block text-sm font-bold mb-2"
                style={{ color: colors.textPrimary }}
              >
                Keterangan{" "}
                <span
                  className="font-normal text-xs"
                  style={{ color: colors.textMuted }}
                >
                  (opsional)
                </span>
              </label>
              <textarea
                {...register("description")}
                rows={3}
                placeholder="Catatan tambahan untuk transaksi ini..."
                className={fieldClass}
                style={{ ...fieldStyle(), resize: "none" }}
              />
            </div>

            {/* Tombol */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-2">
              <Link
                href="/dashboard/simpanan"
                className="flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black transition-colors"
                style={{
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                }}
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white shadow-sm transition-transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: colors.primary }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    Setor Simpanan
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ─── SIDEBAR INFO ─────────────────────────────────────────────────── */}
        <aside className="space-y-5">
          {/* Ringkasan setoran */}
          <div
            className="rounded-xl border p-5 shadow-sm"
            style={{ borderColor: colors.border, background: colors.surface }}
          >
            <h3
              className="font-black mb-4"
              style={{ color: colors.textPrimary }}
            >
              Ringkasan Setoran
            </h3>
            <div className="space-y-3">
              <SummaryRow
                label="Jenis"
                value={
                  watchedType ? ACCOUNT_TYPE_CONFIG[watchedType]?.label : "—"
                }
                colors={colors}
              />
              <SummaryRow
                label="Jumlah"
                value={watchedAmount > 0 ? fmtCurrency(watchedAmount) : "—"}
                colors={colors}
                highlight={watchedAmount > 0}
              />
              <SummaryRow
                label="Saldo Setelah"
                value={
                  activeAccount && watchedAmount > 0
                    ? fmtCurrency(Number(activeAccount.balance) + watchedAmount)
                    : "—"
                }
                colors={colors}
              />
            </div>
          </div>

          {/* Info jenis simpanan */}
          {watchedType && (
            <div
              className="rounded-xl border p-5 shadow-sm"
              style={{
                borderColor: colors.border,
                background: `${ACCOUNT_TYPE_CONFIG[watchedType].color}08`,
                borderLeftColor: ACCOUNT_TYPE_CONFIG[watchedType].color,
                borderLeftWidth: "3px",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Info
                  size={15}
                  style={{ color: ACCOUNT_TYPE_CONFIG[watchedType].color }}
                />
                <p
                  className="text-sm font-black"
                  style={{ color: ACCOUNT_TYPE_CONFIG[watchedType].color }}
                >
                  {ACCOUNT_TYPE_CONFIG[watchedType].label}
                </p>
              </div>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                {ACCOUNT_TYPE_CONFIG[watchedType].desc}
              </p>
            </div>
          )}

          {/* Rekening tersedia */}
          {accounts.length > 0 && !accountsLoading && (
            <div
              className="rounded-xl border p-5 shadow-sm"
              style={{ borderColor: colors.border, background: colors.surface }}
            >
              <h3
                className="text-sm font-black mb-3"
                style={{ color: colors.textPrimary }}
              >
                Rekening Anggota
              </h3>
              <div className="space-y-2">
                {accounts.map((acc) => {
                  const cfg = ACCOUNT_TYPE_CONFIG[acc.account_type];
                  return (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between rounded-lg p-3"
                      style={{ background: colors.background }}
                    >
                      <div>
                        <p
                          className="text-xs font-bold"
                          style={{ color: colors.textPrimary }}
                        >
                          {cfg.label}
                        </p>
                        <p
                          className="text-xs font-mono mt-0.5"
                          style={{ color: colors.textMuted }}
                        >
                          {acc.account_number}
                        </p>
                      </div>
                      <p
                        className="text-sm font-black"
                        style={{ color: cfg.color }}
                      >
                        {fmtCurrency(Number(acc.balance))}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  colors,
  highlight,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: colors.textSecondary }}>
        {label}
      </span>
      <span
        className="text-sm font-black"
        style={{ color: highlight ? colors.primary : colors.textPrimary }}
      >
        {value}
      </span>
    </div>
  );
}
