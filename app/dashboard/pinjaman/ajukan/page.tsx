"use client";

// app/dashboard/pinjaman/ajukan/page.tsx

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Send,
  Calculator,
  Info,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import type { Member } from "@/lib/types";
import Swal from "sweetalert2";

// ─── Konstanta koperasi ───────────────────────────────────────────────────────

const DEFAULT_INTEREST_RATE = 1; // % per bulan (flat)
const MIN_PINJAMAN = 1_000_000;
const MAX_PINJAMAN = 50_000_000;
const TENOR_OPTIONS = [3, 6, 12, 18, 24] as const;

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  member_id: z.string().optional(),
  amount: z.coerce
    .number({ error: "Masukkan jumlah yang valid" })
    .min(MIN_PINJAMAN, `Minimal pinjaman ${fmtCurrency(MIN_PINJAMAN)}`)
    .max(MAX_PINJAMAN, `Maksimal pinjaman ${fmtCurrency(MAX_PINJAMAN)}`),
  tenor: z.coerce
    .number({ error: "Masukkan tenor yang valid" })
    .min(3, "Minimal tenor 3 bulan")
    .max(24, "Maksimal tenor 24 bulan"),
  purpose: z
    .string()
    .min(10, "Jelaskan tujuan pinjaman minimal 10 karakter")
    .max(500, "Maksimal 500 karakter"),
  collateral: z.string().max(200, "Maksimal 200 karakter").optional(),
});

type FormData = z.output<typeof schema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
}

function calcLoan(amount: number, rate: number, termMonths: number) {
  const monthlyInterest = amount * (rate / 100);
  const monthlyPrincipal = amount / termMonths;
  const monthly = Math.round(monthlyPrincipal + monthlyInterest);
  const totalInterest = Math.round(monthlyInterest * termMonths);
  const totalPayment = amount + totalInterest;
  return { monthly, totalInterest, totalPayment };
}

// ─── Preview Card ─────────────────────────────────────────────────────────────

function PreviewCard({
  amount,
  tenor,
  colors,
}: {
  amount: number;
  tenor: number;
  colors: ReturnType<typeof useColors>;
}) {
  if (!amount || !tenor) return null;

  const { monthly, totalInterest, totalPayment } = calcLoan(
    amount,
    DEFAULT_INTEREST_RATE,
    tenor,
  );

  return (
    <div
      className="rounded-xl border p-5 space-y-3"
      style={{
        borderColor: colors.borderAccent,
        background: colors.backgroundAccent,
      }}
    >
      <div className="flex items-center gap-2">
        <Calculator size={16} style={{ color: colors.primary }} />
        <p className="text-sm font-bold" style={{ color: colors.primary }}>
          Estimasi Cicilan
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs" style={{ color: colors.textMuted }}>
            Cicilan / Bulan
          </p>
          <p
            className="text-lg font-black"
            style={{ color: colors.textPrimary }}
          >
            {fmtCurrency(monthly)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: colors.textMuted }}>
            Total Bunga
          </p>
          <p
            className="text-lg font-black"
            style={{ color: colors.textPrimary }}
          >
            {fmtCurrency(totalInterest)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: colors.textMuted }}>
            Pokok Pinjaman
          </p>
          <p
            className="text-sm font-bold"
            style={{ color: colors.textSecondary }}
          >
            {fmtCurrency(amount)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: colors.textMuted }}>
            Total Dibayar
          </p>
          <p
            className="text-sm font-bold"
            style={{ color: colors.textSecondary }}
          >
            {fmtCurrency(totalPayment)}
          </p>
        </div>
      </div>
      <p
        className="text-[11px] flex items-center gap-1.5"
        style={{ color: colors.textMuted }}
      >
        <Info size={11} />
        Bunga flat {DEFAULT_INTEREST_RATE}% / bulan · {tenor} kali cicilan
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HalamanAjukanPinjaman() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAdmin, isPengurus, loading: authLoading } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberIdResolved, setMemberIdResolved] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.input<typeof schema>, any, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: undefined,
      tenor: undefined,
      purpose: "",
      collateral: "",
    },
  });

  const watchedAmount = Number(watch("amount"));
  const watchedTenor = Number(watch("tenor"));

  // ── Jika admin/pengurus → fetch daftar anggota aktif ──────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin && !isPengurus) return;

    setMembersLoading(true);
    fetch("/api/members?status=active&limit=200")
      .then((r) => r.json())
      .then((json) => {
        setMembers(json.data ?? []);
        // Jika ada anggota, pilih yang pertama secara default
        if (json.data?.length > 0) {
          setValue("member_id", json.data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }, [authLoading, isAdmin, isPengurus, setValue]);

  // ── Jika anggota biasa → resolve member_id ──────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (isAdmin || isPengurus) return; // admin/pengurus pilih manual
    if (!user) {
      setMemberIdResolved(null);
      return;
    }

    const fetchMemberId = async () => {
      try {
        const res = await fetch(`/api/members?limit=1&user_id=${user.id}`);
        const json = await res.json();
        const data = json.data ?? [];
        if (data.length > 0) {
          setMemberIdResolved(data[0].id);
          setValue("member_id", data[0].id);
        } else {
          setMemberIdResolved(null);
        }
      } catch {
        setMemberIdResolved(null);
      }
    };

    fetchMemberId();
  }, [authLoading, user, isAdmin, isPengurus, setValue]);

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormData) => {
    // Validasi: pastikan member_id terisi
    let finalMemberId = data.member_id;

    if (!finalMemberId) {
      if (isAdmin || isPengurus) {
        await Swal.fire({
          icon: "error",
          title: "Pilih Anggota",
          text: "Anda harus memilih anggota yang akan mengajukan pinjaman.",
          confirmButtonColor: colors.primary,
        });
        return;
      } else {
        // Anggota biasa: fallback ke resolve
        if (!memberIdResolved) {
          await Swal.fire({
            icon: "error",
            title: "Anggota Tidak Ditemukan",
            text: "Akun Anda belum terdaftar sebagai anggota koperasi. Silakan hubungi admin.",
            confirmButtonColor: colors.primary,
          });
          return;
        }
        finalMemberId = memberIdResolved;
      }
    }

    setSubmitError(null);

    const { monthly, totalInterest, totalPayment } = calcLoan(
      data.amount,
      DEFAULT_INTEREST_RATE,
      data.tenor,
    );

    // Konfirmasi dengan ringkasan cicilan
    const confirm = await Swal.fire({
      title: "Ajukan Pinjaman?",
      html: `
        <div style="text-align:left; font-size:14px; line-height:1.8">
          <p><b>Jumlah:</b> ${fmtCurrency(data.amount)}</p>
          <p><b>Tenor:</b> ${data.tenor} bulan</p>
          <p><b>Cicilan/Bulan:</b> ${fmtCurrency(monthly)}</p>
          <p><b>Total Bayar:</b> ${fmtCurrency(totalPayment)}</p>
          <p style="margin-top:8px; font-size:12px; color:#64748b">
            Pengajuan akan diproses dalam 1–3 hari kerja.
          </p>
        </div>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: colors.primary,
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Ajukan",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    try {
      // Kirim requested_by dari user yang login (useAuth)
      const payload: Record<string, unknown> = {
        member_id: finalMemberId,
        amount: data.amount,
        interest_rate: DEFAULT_INTEREST_RATE,
        term_months: data.tenor,
        monthly_payment: monthly,
        total_interest: totalInterest,
        total_payment: totalPayment,
        purpose: data.purpose,
        collateral: data.collateral || null,
        status: "pending",
        applied_date: new Date().toISOString().slice(0, 10),
        user_id: user?.id,
      };

      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error ?? `Server error (${res.status})`);
      }

      await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference_type: "loan",
          reference_id: json.data.id,
          title: `Pengajuan Pinjaman ${json.data.loan_number}`,
          description: `Jumlah: ${data.amount}, Tenor: ${data.tenor} bulan`,
          requested_by: user?.id,
        }),
      });

      await Swal.fire({
        icon: "success",
        title: "Pengajuan Berhasil!",
        text: `Nomor pinjaman: ${json.data?.loan_number ?? ""}. Menunggu persetujuan pengurus.`,
        confirmButtonColor: colors.primary,
        confirmButtonText: "Lihat Daftar Pinjaman",
      });

      reset();
      router.push("/dashboard/pinjaman");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan, coba lagi.";
      setSubmitError(msg);
      await Swal.fire({
        icon: "error",
        title: "Gagal Mengajukan",
        text: msg,
        confirmButtonColor: colors.primary,
      });
    }
  };

  // ─── Auth loading guard ───────────────────────────────────────────────────

  if (authLoading) {
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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: colors.background }}
    >
      {/* HEADER */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard/pinjaman">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border transition-colors hover:bg-black/5"
            style={{ borderColor: colors.border, background: colors.surface }}
          >
            <ArrowLeft size={18} style={{ color: colors.textSecondary }} />
          </button>
        </Link>
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: colors.primary }}
          >
            Keuangan Anggota
          </p>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.textPrimary }}
          >
            Ajukan Pinjaman Baru
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: colors.textSecondary }}>
            Isi formulir berikut. Pengajuan akan diproses dalam 1–3 hari kerja.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-5">
        {/* Error global */}
        {submitError && (
          <div
            className="flex items-start gap-3 rounded-xl border p-4"
            style={{ background: "#fff1f2", borderColor: "#fecaca" }}
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Info bunga */}
        <div
          className="flex items-start gap-3 rounded-xl border p-4"
          style={{
            background: colors.backgroundAccent,
            borderColor: colors.borderAccent,
          }}
        >
          <Info
            size={16}
            className="mt-0.5 shrink-0"
            style={{ color: colors.primary }}
          />
          <div>
            <p
              className="text-sm font-bold"
              style={{ color: colors.textPrimary }}
            >
              Bunga Flat {DEFAULT_INTEREST_RATE}% / Bulan
            </p>
            <p
              className="mt-0.5 text-xs"
              style={{ color: colors.textSecondary }}
            >
              Plafon Rp {(MIN_PINJAMAN / 1e6).toFixed(0)}jt – Rp{" "}
              {(MAX_PINJAMAN / 1e6).toFixed(0)}jt · Tenor 3–24 bulan
            </p>
          </div>
        </div>

        {/* FORM CARD */}
        <div
          className="rounded-2xl border shadow-sm"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <div className="border-b p-6" style={{ borderColor: colors.border }}>
            <h2 className="font-bold" style={{ color: colors.textPrimary }}>
              Detail Pengajuan
            </h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
            {/* ── Pilih Anggota (hanya untuk admin/pengurus) ── */}
            {(isAdmin || isPengurus) && (
              <div>
                <label
                  className="mb-2 block text-sm font-semibold"
                  style={{ color: colors.textSecondary }}
                >
                  Pilih Anggota <span style={{ color: colors.primary }}>*</span>
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
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
                    style={{
                      borderColor: errors.member_id ? "#ef4444" : colors.border,
                      background: colors.background,
                      color: colors.textPrimary,
                    }}
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
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.member_id.message}
                  </p>
                )}
              </div>
            )}

            {/* ── Jika anggota biasa, tampilkan info anggota ── */}
            {!isAdmin && !isPengurus && (
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: colors.borderAccent,
                  background: colors.backgroundAccent,
                }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: colors.textPrimary }}
                >
                  Mengajukan atas nama anggota Anda sendiri.
                </p>
                {memberIdResolved ? (
                  <p
                    className="text-xs mt-1"
                    style={{ color: colors.textSecondary }}
                  >
                    ✓ Terverifikasi sebagai anggota aktif.
                  </p>
                ) : (
                  <p className="text-xs mt-1 text-red-500">
                    ⚠️ Akun Anda belum terdaftar sebagai anggota. Hubungi admin.
                  </p>
                )}
              </div>
            )}

            {/* JUMLAH PINJAMAN */}
            <div>
              <label
                className="mb-2 block text-sm font-semibold"
                style={{ color: colors.textSecondary }}
              >
                Jumlah Pinjaman (Rp){" "}
                <span style={{ color: colors.primary }}>*</span>
              </label>
              <input
                type="number"
                min={MIN_PINJAMAN}
                max={MAX_PINJAMAN}
                step={100_000}
                {...register("amount", { valueAsNumber: true })}
                style={{
                  color: colors.textPrimary,
                  borderColor: errors.amount ? "#ef4444" : colors.border,
                  background: colors.background,
                }}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
                placeholder="Contoh: 5000000"
              />
              {errors.amount && (
                <p className="mt-1.5 text-xs text-red-500">
                  {errors.amount.message}
                </p>
              )}
            </div>

            {/* TENOR */}
            <div>
              <label
                className="mb-2 block text-sm font-semibold"
                style={{ color: colors.textSecondary }}
              >
                Tenor (Bulan) <span style={{ color: colors.primary }}>*</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {TENOR_OPTIONS.map((t) => {
                  const isSelected = Number(watchedTenor) === t;
                  return (
                    <label
                      key={t}
                      className="cursor-pointer rounded-xl border py-3 text-center text-sm font-bold transition-all"
                      style={{
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                        background: isSelected
                          ? colors.backgroundAccent
                          : colors.background,
                        color: isSelected
                          ? colors.primary
                          : colors.textSecondary,
                      }}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        value={t}
                        {...register("tenor", { valueAsNumber: true })}
                      />
                      {t} bln
                    </label>
                  );
                })}
              </div>
              {errors.tenor && (
                <p className="mt-1.5 text-xs text-red-500">
                  {errors.tenor.message}
                </p>
              )}
            </div>

            {/* PREVIEW CICILAN */}
            {watchedAmount >= MIN_PINJAMAN && watchedTenor > 0 && (
              <PreviewCard
                amount={watchedAmount}
                tenor={Number(watchedTenor)}
                colors={colors}
              />
            )}

            {/* TUJUAN PINJAMAN */}
            <div>
              <label
                className="mb-2 block text-sm font-semibold"
                style={{ color: colors.textSecondary }}
              >
                Tujuan Pinjaman <span style={{ color: colors.primary }}>*</span>
              </label>
              <textarea
                {...register("purpose")}
                rows={4}
                style={{
                  color: colors.textPrimary,
                  borderColor: errors.purpose ? "#ef4444" : colors.border,
                  background: colors.background,
                }}
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
                placeholder="Jelaskan tujuan penggunaan dana pinjaman secara singkat dan jelas..."
              />
              {errors.purpose && (
                <p className="mt-1.5 text-xs text-red-500">
                  {errors.purpose.message}
                </p>
              )}
            </div>

            {/* JAMINAN */}
            <div>
              <label
                className="mb-2 block text-sm font-semibold"
                style={{ color: colors.textSecondary }}
              >
                Jaminan{" "}
                <span
                  className="font-normal text-xs"
                  style={{ color: colors.textMuted }}
                >
                  (opsional)
                </span>
              </label>
              <input
                type="text"
                {...register("collateral")}
                style={{
                  color: colors.textPrimary,
                  borderColor: errors.collateral ? "#ef4444" : colors.border,
                  background: colors.background,
                }}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
                placeholder="Contoh: BPKB motor, sertifikat tanah..."
              />
              {errors.collateral && (
                <p className="mt-1.5 text-xs text-red-500">
                  {errors.collateral.message}
                </p>
              )}
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Link href="/dashboard/pinjaman" className="sm:flex-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-bold transition-colors"
                  style={{
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                    background: colors.surface,
                  }}
                >
                  Batal
                </button>
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: colors.primary }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Ajukan Pinjaman
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info proses */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <h3
            className="mb-3 text-sm font-bold"
            style={{ color: colors.textPrimary }}
          >
            Alur Pengajuan
          </h3>
          <div className="space-y-3">
            {[
              {
                step: "1",
                label: "Pengajuan Dikirim",
                desc: "Status: Menunggu persetujuan",
              },
              { step: "2", label: "Review Pengurus", desc: "1–3 hari kerja" },
              {
                step: "3",
                label: "Disetujui & Dicairkan",
                desc: "Dana masuk ke rekening anggota",
              },
            ].map(({ step, label, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                  style={{ background: colors.primary }}
                >
                  {step}
                </div>
                <div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: colors.textPrimary }}
                  >
                    {label}
                  </p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
