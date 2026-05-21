"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  FileText,
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

const memberSchema = z.object({
  nik: z.string().min(16, "NIK wajib 16 digit").max(16, "NIK wajib 16 digit"),
  name: z.string().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().min(10, "Nomor HP minimal 10 digit"),
  address: z.string().min(8, "Alamat minimal 8 karakter"),
  area: z.string().min(3, "Wilayah wajib diisi"),
  memberType: z.enum(["Reguler", "Prioritas"], {
    message: "Pilih tipe anggota",
  }),
  initialDeposit: z.number().min(500000, "Setoran awal minimal Rp 500.000"),
  notes: z.string().optional(),
});

type MemberForm = z.infer<typeof memberSchema>;

const defaultForm: MemberForm = {
  nik: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  area: "",
  memberType: "Reguler",
  initialDeposit: 500000,
  notes: "",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function HalamanTambahAnggota() {
  const colors = useColors();
  const [form, setForm] = useState<MemberForm>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof MemberForm, string>>>({});
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = memberSchema.safeParse(form);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        nik: fieldErrors.nik?.[0],
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        phone: fieldErrors.phone?.[0],
        address: fieldErrors.address?.[0],
        area: fieldErrors.area?.[0],
        memberType: fieldErrors.memberType?.[0],
        initialDeposit: fieldErrors.initialDeposit?.[0],
        notes: fieldErrors.notes?.[0],
      });
      return;
    }

    setErrors({});
    setSuccessMessage(
      `Data ${parsed.data.name} siap disimpan sebagai anggota baru.`,
    );
    window.setTimeout(() => setSuccessMessage(""), 3000);
  };

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: colors.background }}
    >
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
          <p className="mb-2 text-sm font-semibold" style={{ color: colors.primary }}>
            Registrasi Anggota
          </p>
          <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            Tambah Anggota
          </h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: colors.textSecondary }}>
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

      {successMessage && (
        <div
          className="mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm"
          style={{
            background: colors.accentGreen,
            borderColor: colors.secondaryLight,
            color: colors.textPrimary,
          }}
        >
          <Check size={18} style={{ color: colors.success }} />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border p-6 shadow-sm"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <SectionTitle
            icon={Users}
            title="Informasi Pribadi"
            description="Data dasar calon anggota sesuai identitas resmi."
            colors={colors}
          />

          <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField label="NIK" value={form.nik} error={errors.nik} colors={colors} maxLength={16} onChange={(value) => setForm({ ...form, nik: value.replace(/\D/g, "") })} />
            <TextField label="Nama Lengkap" value={form.name} error={errors.name} colors={colors} onChange={(value) => setForm({ ...form, name: value })} />
            <TextField label="Email" type="email" value={form.email} error={errors.email} colors={colors} onChange={(value) => setForm({ ...form, email: value })} />
            <TextField label="Nomor HP" value={form.phone} error={errors.phone} colors={colors} onChange={(value) => setForm({ ...form, phone: value })} />
            <TextField label="Wilayah / Dusun" value={form.area} error={errors.area} colors={colors} onChange={(value) => setForm({ ...form, area: value })} />
            <SelectField
              label="Tipe Anggota"
              value={form.memberType}
              error={errors.memberType}
              colors={colors}
              options={["Reguler", "Prioritas"]}
              onChange={(value) => setForm({ ...form, memberType: value as MemberForm["memberType"] })}
            />
            <div className="md:col-span-2">
              <TextField label="Alamat Lengkap" value={form.address} error={errors.address} colors={colors} onChange={(value) => setForm({ ...form, address: value })} />
            </div>
          </div>

          <SectionTitle
            icon={BadgeCheck}
            title="Keanggotaan & Setoran Awal"
            description="Setoran awal akan dicatat sebagai simpanan pokok anggota."
            colors={colors}
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField
              label="Setoran Awal"
              type="number"
              value={String(form.initialDeposit)}
              error={errors.initialDeposit}
              colors={colors}
              onChange={(value) => setForm({ ...form, initialDeposit: Number(value) })}
            />
            <TextField label="Catatan Opsional" value={form.notes ?? ""} error={errors.notes} colors={colors} onChange={(value) => setForm({ ...form, notes: value })} />
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/anggota"
              className="flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black"
              style={{ border: `1px solid ${colors.border}`, color: colors.textPrimary }}
            >
              Batal
            </Link>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm transition-transform active:scale-95"
              style={{ background: colors.primary }}
            >
              <Save size={18} />
              Simpan Anggota
            </button>
          </div>
        </form>

        <aside className="space-y-6">
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
            <h2 className="text-lg font-black" style={{ color: colors.textPrimary }}>
              Ringkasan Pendaftaran
            </h2>
            <div className="mt-5 space-y-3">
              <SummaryItem icon={FileText} label="NIK" value={form.nik || "Belum diisi"} colors={colors} />
              <SummaryItem icon={Mail} label="Email" value={form.email || "Belum diisi"} colors={colors} />
              <SummaryItem icon={Phone} label="Kontak" value={form.phone || "Belum diisi"} colors={colors} />
              <SummaryItem icon={MapPin} label="Wilayah" value={form.area || "Belum diisi"} colors={colors} />
              <SummaryItem icon={Building2} label="Setoran Awal" value={formatCurrency(form.initialDeposit || 0)} colors={colors} />
            </div>
          </div>

          <div
            className="rounded-xl border p-5 shadow-sm"
            style={{ borderColor: colors.border, background: colors.backgroundAccent }}
          >
            <p className="text-sm font-black" style={{ color: colors.primary }}>
              Catatan
            </p>
            <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
              Halaman ini masih menyimpan secara simulasi frontend. Nanti bisa
              disambungkan ke API/database koperasi saat backend sudah siap.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, description, colors }: { icon: typeof Users; title: string; description: string; colors: ReturnType<typeof useColors> }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-xl p-3" style={{ background: colors.backgroundAccent, color: colors.primary }}>
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

function TextField({ label, value, error, colors, onChange, type = "text", maxLength }: { label: string; value: string; error?: string; colors: ReturnType<typeof useColors>; onChange: (value: string) => void; type?: React.HTMLInputTypeAttribute; maxLength?: number }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold" style={{ color: colors.textSecondary }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
        style={{ borderColor: error ? colors.error : colors.border, background: colors.background, color: colors.textPrimary }}
      />
      {error && <p className="mt-1.5 text-xs font-semibold text-red-500">{error}</p>}
    </label>
  );
}

function SelectField({ label, value, error, colors, options, onChange }: { label: string; value: string; error?: string; colors: ReturnType<typeof useColors>; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold" style={{ color: colors.textSecondary }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
        style={{ borderColor: error ? colors.error : colors.border, background: colors.background, color: colors.textPrimary }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-500">{error}</p>}
    </label>
  );
}

function SummaryItem({ icon: Icon, label, value, colors }: { icon: typeof Mail; label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: colors.background }}>
      <Icon size={17} style={{ color: colors.primary }} />
      <div className="min-w-0">
        <p className="text-xs" style={{ color: colors.textMuted }}>
          {label}
        </p>
        <p className="truncate text-sm font-black" style={{ color: colors.textPrimary }}>
          {value}
        </p>
      </div>
    </div>
  );
}
