"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { z } from "zod";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";

// ─── Validation Schema ────────────────────────────────────────────────────────

const memberSchema = z.object({
  full_name: z.string().min(3, "Nama minimal 3 karakter"),
  nik: z
    .string()
    .regex(/^\d{16}$/, "NIK wajib 16 digit angka")
    .or(z.literal(""))
    .optional(),
  email: z
    .string()
    .email("Format email tidak valid")
    .or(z.literal(""))
    .optional(),
  phone: z
    .string()
    .min(10, "Nomor HP minimal 10 digit")
    .or(z.literal(""))
    .optional(),
  area: z.string().min(3, "Wilayah wajib diisi"),
  address: z.string().optional(),
  gender: z.enum(["L", "P", ""]).optional(),
  birth_date: z.string().optional(),
  occupation: z.string().optional(),
  created_by: z.string(),
  initialDeposit: z.number().min(500000, "Setoran awal minimal Rp 500.000"),
  notes: z.string().optional(),
});

type MemberForm = z.infer<typeof memberSchema>;

const DEFAULT_FORM: MemberForm = {
  full_name: "",
  nik: "",
  email: "",
  phone: "",
  area: "",
  address: "",
  gender: "",
  birth_date: "",
  occupation: "",
  initialDeposit: 500000,
  notes: "",
  created_by: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

// ─── Component ───────────────────────────────────────────────────────────────

export default function HalamanTambahAnggota() {
  const { user } = useAuth();
  const colors = useColors();
  const router = useRouter();

  const [createdById, setCreatedById] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof MemberForm, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  // get id user now
  useEffect(() => {
    const authKey = Object.keys(localStorage).find((key) =>
      key.endsWith("-auth-token"),
    );

    const raw = authKey ? localStorage.getItem(authKey) : null;
    const session = raw ? JSON.parse(raw) : null;
    const userId = session?.user?.id || null;
    setCreatedById(userId);
    setForm((prev) => ({ ...prev, created_by: userId ?? "" }));
  }, []);
  console.log(form);

  // Shorthand setter
  const set = <K extends keyof MemberForm>(key: K, value: MemberForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const parsed = memberSchema.safeParse(form);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fe).map(([k, v]) => [k, v?.[0]]),
        ) as Partial<Record<keyof MemberForm, string>>,
      );
      return;
    }

    setErrors({});
    setSubmitting(true);
    setSubmitError(null);

    try {
      const {
        full_name,
        nik,
        email,
        phone,
        area,
        address,
        gender,
        birth_date,
        occupation,
        notes,
        created_by: createdById,
      } = parsed.data;

      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name,
          nik: nik || null,
          email: email || null,
          phone: phone || null,
          area: area || null,
          address: address || null,
          gender: (gender as "L" | "P") || null,
          birth_date: birth_date || null,
          occupation: occupation || null,
          notes: notes || null,
          join_date: new Date().toISOString().split("T")[0],
          status: "active",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menyimpan data anggota");
      }

      setSuccessMsg(
        json.message ??
          `${full_name} berhasil didaftarkan sebagai anggota baru.`,
      );

      // Redirect setelah 1.5 detik agar user melihat pesan sukses
      setTimeout(() => router.push("/dashboard/anggota"), 1500);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Terjadi kesalahan, coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: colors.background }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link
            href="/dashboard/anggota"
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold"
            style={{ color: colors.primary }}
          >
            <ArrowLeft size={16} />
            Kembali ke Data Anggota
          </Link>
          <p
            className="mb-2 text-sm font-semibold"
            style={{ color: colors.primary }}
          >
            Registrasi Anggota
          </p>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.textPrimary }}
          >
            Tambah Anggota
          </h1>
          <p
            className="mt-1 max-w-2xl text-sm"
            style={{ color: colors.textSecondary }}
          >
            Lengkapi data identitas, kontak, wilayah, dan setoran awal untuk
            mendaftarkan anggota koperasi baru.
          </p>
        </div>

        <div
          className="flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            color: colors.textSecondary,
          }}
        >
          <ShieldCheck size={17} style={{ color: colors.success }} />
          Validasi data aktif
        </div>
      </div>

      {/* ── SUCCESS ─────────────────────────────────────────────────────────── */}
      {successMsg && (
        <div
          className="mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm"
          style={{
            background: colors.accentGreen,
            borderColor: colors.secondaryLight,
            color: colors.textPrimary,
          }}
        >
          <Check size={18} style={{ color: colors.success }} />
          {successMsg} Mengalihkan ke halaman anggota…
        </div>
      )}

      {/* ── SUBMIT ERROR ────────────────────────────────────────────────────── */}
      {submitError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        {/* ── FORM ─────────────────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border p-6 shadow-sm"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          {/* Section 1: Informasi Pribadi */}
          <SectionTitle
            icon={Users}
            title="Informasi Pribadi"
            description="Data dasar calon anggota sesuai identitas resmi."
            colors={colors}
          />

          <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField
              label="NIK"
              value={form.nik ?? ""}
              error={errors.nik}
              colors={colors}
              maxLength={16}
              onChange={(v) => set("nik", v.replace(/\D/g, ""))}
            />
            <TextField
              label="Nama Lengkap"
              value={form.full_name}
              error={errors.full_name}
              colors={colors}
              onChange={(v) => set("full_name", v)}
            />
            <TextField
              label="Email"
              type="email"
              value={form.email ?? ""}
              error={errors.email}
              colors={colors}
              onChange={(v) => set("email", v)}
            />
            <TextField
              label="Nomor HP"
              value={form.phone ?? ""}
              error={errors.phone}
              colors={colors}
              onChange={(v) => set("phone", v)}
            />
            <TextField
              label="Tanggal Lahir"
              type="date"
              value={form.birth_date ?? ""}
              error={errors.birth_date}
              colors={colors}
              onChange={(v) => set("birth_date", v)}
            />
            <SelectField
              label="Jenis Kelamin"
              value={form.gender ?? ""}
              error={errors.gender}
              colors={colors}
              options={[
                { value: "", label: "Pilih jenis kelamin" },
                { value: "L", label: "Laki-laki" },
                { value: "P", label: "Perempuan" },
              ]}
              onChange={(v) => set("gender", v as MemberForm["gender"])}
            />
            <TextField
              label="Pekerjaan"
              value={form.occupation ?? ""}
              error={errors.occupation}
              colors={colors}
              onChange={(v) => set("occupation", v)}
            />
            <TextField
              label="Wilayah / Dusun"
              value={form.area}
              error={errors.area}
              colors={colors}
              onChange={(v) => set("area", v)}
            />
            <div className="md:col-span-2">
              <TextField
                label="Alamat Lengkap"
                value={form.address ?? ""}
                error={errors.address}
                colors={colors}
                onChange={(v) => set("address", v)}
              />
            </div>
          </div>

          {/* Section 2: Keanggotaan & Setoran */}
          <SectionTitle
            icon={BadgeCheck}
            title="Keanggotaan & Setoran Awal"
            description="Setoran awal diproses terpisah melalui menu Simpanan setelah pendaftaran berhasil."
            colors={colors}
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField
              label="Setoran Awal (Rp)"
              type="number"
              value={String(form.initialDeposit)}
              error={errors.initialDeposit}
              colors={colors}
              onChange={(v) => set("initialDeposit", Number(v))}
            />
            <TextField
              label="Catatan Opsional"
              value={form.notes ?? ""}
              error={errors.notes}
              colors={colors}
              onChange={(v) => set("notes", v)}
            />
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/anggota"
              className="flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black"
              style={{
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              }}
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={submitting || !!successMsg}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: colors.primary }}
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {submitting ? "Menyimpan…" : "Simpan Anggota"}
            </button>
          </div>
        </form>

        {/* ── SIDEBAR ───────────────────────────────────────────────────────── */}
        <aside className="space-y-6">
          {/* Ringkasan */}
          <div
            className="rounded-xl border p-6 shadow-sm"
            style={{ borderColor: colors.border, background: colors.surface }}
          >
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white"
              style={{ background: colors.primary }}
            >
              <UserPlus size={24} />
            </div>
            <h2
              className="text-lg font-black"
              style={{ color: colors.textPrimary }}
            >
              Ringkasan Pendaftaran
            </h2>
            <div className="mt-5 space-y-3">
              <SummaryItem
                icon={FileText}
                label="NIK"
                value={form.nik || "Belum diisi"}
                colors={colors}
              />
              <SummaryItem
                icon={Mail}
                label="Email"
                value={form.email || "Belum diisi"}
                colors={colors}
              />
              <SummaryItem
                icon={Phone}
                label="Kontak"
                value={form.phone || "Belum diisi"}
                colors={colors}
              />
              <SummaryItem
                icon={MapPin}
                label="Wilayah"
                value={form.area || "Belum diisi"}
                colors={colors}
              />
              <SummaryItem
                icon={Building2}
                label="Setoran Awal"
                value={formatCurrency(form.initialDeposit || 0)}
                colors={colors}
              />
            </div>
          </div>

          {/* Catatan */}
          <div
            className="rounded-xl border p-5 shadow-sm"
            style={{
              borderColor: colors.border,
              background: colors.backgroundAccent,
            }}
          >
            <p className="text-sm font-black" style={{ color: colors.primary }}>
              Catatan
            </p>
            <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
              Setoran awal <strong>tidak langsung diproses</strong> di sini.
              Setelah anggota tersimpan, buka menu{" "}
              <strong>Simpanan → Tambah Setoran</strong> untuk mencatat simpanan
              pokok anggota.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({
  icon: Icon,
  title,
  description,
  colors,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div
        className="rounded-xl p-3"
        style={{ background: colors.backgroundAccent, color: colors.primary }}
      >
        <Icon size={20} />
      </div>
      <div>
        <h2 className="font-black" style={{ color: colors.textPrimary }}>
          {title}
        </h2>
        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          {description}
        </p>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  error,
  colors,
  onChange,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  error?: string;
  colors: ReturnType<typeof useColors>;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span
        className="mb-2 block text-sm font-bold"
        style={{ color: colors.textSecondary }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
        style={{
          borderColor: error ? colors.error : colors.border,
          background: colors.background,
          color: colors.textPrimary,
        }}
      />
      {error && (
        <p className="mt-1.5 text-xs font-semibold text-red-500">{error}</p>
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  error,
  colors,
  options,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  colors: ReturnType<typeof useColors>;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span
        className="mb-2 block text-sm font-bold"
        style={{ color: colors.textSecondary }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
        style={{
          borderColor: error ? colors.error : colors.border,
          background: colors.background,
          color: colors.textPrimary,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 text-xs font-semibold text-red-500">{error}</p>
      )}
    </label>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  colors,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl p-3"
      style={{ background: colors.background }}
    >
      <Icon size={17} style={{ color: colors.primary }} />
      <div className="min-w-0">
        <p className="text-xs" style={{ color: colors.textMuted }}>
          {label}
        </p>
        <p
          className="truncate text-sm font-black"
          style={{ color: colors.textPrimary }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
