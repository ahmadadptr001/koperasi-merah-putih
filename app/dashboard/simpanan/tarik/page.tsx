"use client";

// app/dashboard/simpanan/tarik/page.tsx

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Wallet,
  Info,
  Plus,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import type { SavingsAccount, Member } from "@/lib/types";
import Swal from "sweetalert2";

// ─── Schema ───────────────────────────────────────────────────────────────────

const tarikSchema = z.object({
  member_id: z.string().min(1, "Pilih anggota terlebih dahulu"),
  savings_account_id: z.string().min(1, "Pilih rekening simpanan"),
  amount: z
    .number({ error: "Masukkan jumlah yang valid" })
    .min(10000, "Minimal penarikan Rp 10.000"),
  description: z.string().optional(),
  withdrawal_date: z.string().min(1, "Tanggal wajib diisi"),
});

type TarikForm = z.infer<typeof tarikSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  pokok: "Simpanan Pokok",
  wajib: "Simpanan Wajib",
  sukarela: "Simpanan Sukarela",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function AccountInfoCard({
  account,
  colors,
}: {
  account: SavingsAccount | null;
  colors: ReturnType<typeof useColors>;
}) {
  if (!account) return null;

  return (
    <div
      className="rounded-xl border p-4 flex items-center gap-4"
      style={{ borderColor: colors.border, background: colors.background }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${colors.primary}15`, color: colors.primary }}
      >
        <Wallet size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: colors.textMuted }}
        >
          {ACCOUNT_TYPE_LABEL[account.account_type] || account.account_type}
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

export default function HalamanTarikSimpanan() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();

  // State members
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // State rekening
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SavingsAccount | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TarikForm>({
    resolver: zodResolver(tarikSchema),
    defaultValues: {
      withdrawal_date: new Date().toISOString().slice(0, 10),
      amount: undefined,
    },
  });

  const watchedMemberId = watch("member_id");
  const watchedAccountId = watch("savings_account_id");
  const watchedAmount = watch("amount");

  // ── Validasi saldo real-time ──────────────────────────────────────────────
  const [saldoError, setSaldoError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAccount || !watchedAmount || watchedAmount <= 0) {
      setSaldoError(null);
      return;
    }
    if (watchedAmount > Number(selectedAccount.balance)) {
      setSaldoError(
        `Saldo tidak mencukupi. Maksimal penarikan: ${fmtCurrency(Number(selectedAccount.balance))}`,
      );
    } else {
      setSaldoError(null);
    }
  }, [watchedAmount, selectedAccount]);

  // Fetch members (admin/pengurus)
  useEffect(() => {
    setMembersLoading(true);
    fetch("/api/members?status=active&limit=200")
      .then((r) => r.json())
      .then((json) => setMembers(json.data ?? []))
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }, []);

  // ── Fetch rekening saat member_id berubah (hanya sukarela) ──────────────
  const fetchAccounts = useCallback(
    async (memberId: string) => {
      if (!memberId) {
        setAccounts([]);
        setSelectedAccount(null);
        return;
      }

      setAccountsLoading(true);
      try {
        // 🔁 PERUBAHAN: filter hanya sukarela
        const params = new URLSearchParams({
          member_id: memberId,
          status: "active",
          account_type: "sukarela", // ← hanya sukarela yang boleh ditarik
        });
        const res = await fetch(`/api/savings-acoounts?${params}`);
        const json = await res.json();
        const data: SavingsAccount[] = json.data ?? [];
        setAccounts(data);
        if (data.length > 0) {
          setValue("savings_account_id", data[0].id);
          setSelectedAccount(data[0]);
        } else {
          setValue("savings_account_id", "");
          setSelectedAccount(null);
        }
      } catch {
        setAccounts([]);
        setSelectedAccount(null);
      } finally {
        setAccountsLoading(false);
      }
    },
    [setValue],
  );

  useEffect(() => {
    if (!watchedMemberId) return;
    fetchAccounts(watchedMemberId);
  }, [watchedMemberId, fetchAccounts]);

  // Update selectedAccount saat account_id berubah
  useEffect(() => {
    if (watchedAccountId) {
      const acc = accounts.find((a) => a.id === watchedAccountId) || null;
      setSelectedAccount(acc);
    } else {
      setSelectedAccount(null);
    }
  }, [watchedAccountId, accounts]);

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = async (data: TarikForm) => {
    if (!selectedAccount) {
      await Swal.fire({
        icon: "warning",
        title: "Rekening Tidak Ditemukan",
        text: "Pilih rekening simpanan yang akan ditarik.",
        confirmButtonColor: colors.primary,
      });
      return;
    }

    // Validasi saldo
    if (data.amount > Number(selectedAccount.balance)) {
      await Swal.fire({
        icon: "error",
        title: "Saldo Tidak Mencukupi",
        text: `Saldo rekening hanya ${fmtCurrency(Number(selectedAccount.balance))}`,
        confirmButtonColor: colors.primary,
      });
      return;
    }

    const confirmed = await Swal.fire({
      title: "Ajukan Penarikan?",
      html: `
        <div style="text-align:left;font-size:14px;line-height:1.8">
          <div><b>Jenis:</b> ${ACCOUNT_TYPE_LABEL[selectedAccount.account_type]}</div>
          <div><b>Jumlah:</b> ${fmtCurrency(data.amount)}</div>
          <div><b>Saldo Tersedia:</b> ${fmtCurrency(Number(selectedAccount.balance))}</div>
          <div><b>Tanggal:</b> ${new Date(data.withdrawal_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
          ${data.description ? `<div><b>Keterangan:</b> ${data.description}</div>` : ""}
        </div>
        <p style="margin-top:12px;font-size:12px;color:#64748b">Penarikan akan diproses setelah disetujui oleh pengurus.</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: colors.primary,
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Ajukan",
      cancelButtonText: "Batal",
    });

    if (!confirmed.isConfirmed) return;

    try {
      // 1. Transaksi penarikan (langsung kurangi saldo)
      const txnRes = await fetch("/api/savings-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: data.member_id,
          savings_account_id: data.savings_account_id,
          transaction_type: "penarikan",
          amount: data.amount,
          description: data.description || null,
          transaction_date: data.withdrawal_date,
          created_by: user?.id,
        }),
      });

      const txnJson = await txnRes.json();
      if (!txnRes.ok || txnJson.error) {
        throw new Error(txnJson.error || "Gagal transaksi");
      }

      // 2. Buat approval sebagai catatan
      const approvalRes = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference_type: "savings_withdrawal",
          reference_id: data.savings_account_id,
          title: `Penarikan Simpanan ${selectedAccount.account_number}`,
          description: `Jumlah: ${data.amount} | Jenis: ${ACCOUNT_TYPE_LABEL[selectedAccount.account_type]}`,
          requested_by: user?.id,
        }),
      });

      if (!approvalRes.ok) {
        console.warn("Approval gagal:", await approvalRes.json());
      }

      await Swal.fire({
        icon: "success",
        title: "Penarikan Berhasil!",
        html: `
          <div style="font-size:14px;line-height:1.8">
            <div>Penarikan <b>${fmtCurrency(data.amount)}</b> berhasil.</div>
            <div style="margin-top:4px;color:#6b7280">Saldo tersisa: ${fmtCurrency(Number(selectedAccount.balance) - data.amount)}</div>
          </div>
        `,
        confirmButtonColor: colors.primary,
        confirmButtonText: "Kembali ke Simpanan",
      });

      reset();
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
          Tarik Simpanan
        </h1>
        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          Ajukan penarikan simpanan sukarela. Pengajuan akan diproses setelah
          disetujui oleh pengurus.
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
            {/* Pilih Anggota */}
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

            {/* Pilih Rekening Simpanan */}
            <div>
              <label
                className="block text-sm font-bold mb-2"
                style={{ color: colors.textPrimary }}
              >
                Rekening Simpanan{" "}
                <span style={{ color: colors.primary }}>*</span>
              </label>
              {accountsLoading ? (
                <div
                  className="flex items-center gap-2 py-3"
                  style={{ color: colors.textMuted }}
                >
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Memuat rekening...</span>
                </div>
              ) : accounts.length === 0 ? (
                <div
                  className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
                  style={{ borderColor: "#fde68a", background: "#fef3c7" }}
                >
                  <AlertCircle
                    size={16}
                    className="shrink-0 mt-0.5 text-amber-600"
                  />
                  <p className="text-amber-800">
                    Anggota ini belum memiliki rekening simpanan sukarela yang
                    aktif. Hubungi admin.
                  </p>
                </div>
              ) : (
                <select
                  {...register("savings_account_id")}
                  className={fieldClass}
                  style={fieldStyle(!!errors.savings_account_id)}
                >
                  <option value="">-- Pilih Rekening --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {ACCOUNT_TYPE_LABEL[acc.account_type]} —{" "}
                      {acc.account_number} (Saldo:{" "}
                      {fmtCurrency(Number(acc.balance))})
                    </option>
                  ))}
                </select>
              )}
              {errors.savings_account_id && (
                <p className="mt-1.5 text-xs font-semibold text-red-500">
                  {errors.savings_account_id.message}
                </p>
              )}
            </div>

            {/* Info rekening terpilih */}
            {!accountsLoading && selectedAccount && (
              <AccountInfoCard account={selectedAccount} colors={colors} />
            )}

            {/* Jumlah Penarikan */}
            <div>
              <label
                className="block text-sm font-bold mb-2"
                style={{ color: colors.textPrimary }}
              >
                Jumlah Penarikan (Rp){" "}
                <span style={{ color: colors.primary }}>*</span>
              </label>
              <input
                type="number"
                min={10000}
                step={10000}
                {...register("amount", { valueAsNumber: true })}
                placeholder="Contoh: 500000"
                className={fieldClass}
                style={fieldStyle(!!errors.amount || !!saldoError)}
              />
              {watchedAmount > 0 && selectedAccount && (
                <div className="mt-1.5">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: colors.textPrimary }}
                  >
                    Saldo tersedia:{" "}
                    {fmtCurrency(Number(selectedAccount.balance))}
                  </p>
                  {saldoError ? (
                    <p className="text-xs font-semibold text-red-500">
                      {saldoError}
                    </p>
                  ) : (
                    <p
                      className="text-xs font-semibold"
                      style={{ color: colors.primary }}
                    >
                      Saldo setelah penarikan:{" "}
                      {fmtCurrency(
                        Number(selectedAccount.balance) - watchedAmount,
                      )}
                    </p>
                  )}
                </div>
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
                Tanggal Pengajuan{" "}
                <span style={{ color: colors.primary }}>*</span>
              </label>
              <input
                type="date"
                {...register("withdrawal_date")}
                max={new Date().toISOString().slice(0, 10)}
                className={fieldClass}
                style={fieldStyle(!!errors.withdrawal_date)}
              />
              {errors.withdrawal_date && (
                <p className="mt-1.5 text-xs font-semibold text-red-500">
                  {errors.withdrawal_date.message}
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
                placeholder="Alasan penarikan (opsional)..."
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
                    Mengajukan...
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    Ajukan Penarikan
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ─── SIDEBAR INFO ─────────────────────────────────────────────────── */}
        <aside className="space-y-5">
          <div
            className="rounded-xl border p-5 shadow-sm"
            style={{ borderColor: colors.border, background: colors.surface }}
          >
            <h3
              className="font-black mb-4"
              style={{ color: colors.textPrimary }}
            >
              Ringkasan Pengajuan
            </h3>
            <div className="space-y-3">
              <SummaryRow
                label="Jenis"
                value={
                  selectedAccount
                    ? ACCOUNT_TYPE_LABEL[selectedAccount.account_type]
                    : "—"
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
                label="Saldo Tersedia"
                value={
                  selectedAccount
                    ? fmtCurrency(Number(selectedAccount.balance))
                    : "—"
                }
                colors={colors}
              />
              <SummaryRow
                label="Saldo Setelah"
                value={
                  selectedAccount && watchedAmount > 0
                    ? fmtCurrency(
                        Number(selectedAccount.balance) - watchedAmount,
                      )
                    : "—"
                }
                colors={colors}
              />
            </div>
          </div>

          <div
            className="rounded-xl border p-5 shadow-sm"
            style={{
              borderColor: colors.border,
              background: colors.backgroundAccent,
              borderLeftColor: colors.primary,
              borderLeftWidth: "3px",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Info size={15} style={{ color: colors.primary }} />
              <p
                className="text-sm font-black"
                style={{ color: colors.primary }}
              >
                Perhatikan
              </p>
            </div>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Penarikan hanya dapat dilakukan untuk rekening Simpanan Sukarela.
              Simpanan Pokok dan Wajib tidak dapat ditarik.
            </p>
          </div>
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
