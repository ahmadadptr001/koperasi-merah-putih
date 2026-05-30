"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Check, AlertCircle } from "lucide-react";
import { useColors } from "@/hooks/useColors";
import type { Member } from "@/lib/types";
import Swal from "sweetalert2";

export default function HalamanEditAnggota() {
  const colors = useColors();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch data anggota ───────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/members/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error ?? "Gagal memuat data");
        }
        setMember(json.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ─── Handle submit ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!member) return;

    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const data: Record<string, any> = {};
      formData.forEach((value, key) => {
        if (value !== "") {
          data[key] = value;
        }
      });

      // Hapus field yang tidak boleh diupdate
      delete data.id;
      delete data.member_number;
      delete data.created_at;
      delete data.updated_at;
      delete data.created_by;

      const res = await fetch(`/api/members/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Gagal memperbarui");
      }

      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Data anggota berhasil diperbarui.",
        timer: 1500,
        showConfirmButton: false,
      });

      router.push("/dashboard/anggota");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen p-8">
        <Link
          href="/dashboard/anggota"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold"
          style={{ color: colors.primary }}
        >
          <ArrowLeft size={16} /> Kembali
        </Link>
        <div className="max-w-md mx-auto rounded-xl border p-8 text-center shadow-sm">
          <AlertCircle size={40} className="mx-auto mb-4 text-red-500" />
          <h2 className="font-bold">Data tidak ditemukan</h2>
          <p className="mt-2 text-sm">{error ?? "Anggota tidak ditemukan"}</p>
          <Link
            href="/dashboard/anggota"
            className="mt-4 inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white"
            style={{ background: colors.primary }}
          >
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6 md:p-8 md:px-20"
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/anggota"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold"
          style={{ color: colors.primary }}
        >
          <ArrowLeft size={16} /> Kembali ke Data Anggota
        </Link>
        <h1
          className="text-2xl font-bold"
          style={{ color: colors.textPrimary }}
        >
          Edit Anggota
        </h1>
        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          {member.member_number} — {member.full_name}
        </p>
      </div>

      {/* Form */}
      <div
        className="rounded-xl border p-6 shadow-sm max-w-2xl"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField
              label="Nama Lengkap"
              name="full_name"
              defaultValue={member.full_name}
              required
              colors={colors}
            />
            <TextField
              label="NIK"
              name="nik"
              defaultValue={member.nik || ""}
              maxLength={16}
              colors={colors}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              defaultValue={member.email || ""}
              colors={colors}
            />
            <TextField
              label="Nomor HP"
              name="phone"
              defaultValue={member.phone || ""}
              colors={colors}
            />
            <TextField
              label="Tanggal Lahir"
              name="birth_date"
              type="date"
              defaultValue={member.birth_date?.slice(0, 10) || ""}
              colors={colors}
            />
            <SelectField
              label="Jenis Kelamin"
              name="gender"
              defaultValue={member.gender || ""}
              options={[
                { value: "", label: "Pilih jenis kelamin" },
                { value: "L", label: "Laki-laki" },
                { value: "P", label: "Perempuan" },
              ]}
              colors={colors}
            />
            <TextField
              label="Pekerjaan"
              name="occupation"
              defaultValue={member.occupation || ""}
              colors={colors}
            />
            <TextField
              label="Wilayah / Dusun"
              name="area"
              defaultValue={member.area || ""}
              colors={colors}
            />
            <div className="md:col-span-2">
              <TextField
                label="Alamat Lengkap"
                name="address"
                defaultValue={member.address || ""}
                colors={colors}
              />
            </div>
            <div className="md:col-span-2">
              <SelectField
                label="Status"
                name="status"
                defaultValue={member.status}
                options={[
                  { value: "active", label: "Aktif" },
                  { value: "inactive", label: "Nonaktif" },
                  { value: "suspended", label: "Menunggu" },
                ]}
                colors={colors}
              />
            </div>
            <div className="md:col-span-2">
              <TextField
                label="Catatan"
                name="notes"
                defaultValue={member.notes || ""}
                colors={colors}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-2">
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
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm transition-transform active:scale-95 disabled:opacity-60"
              style={{ background: colors.primary }}
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {saving ? "Menyimpan…" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TextField({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  maxLength,
  colors,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: React.HTMLInputTypeAttribute;
  required?: boolean;
  maxLength?: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <label className="block">
      <span
        className="mb-2 block text-sm font-bold"
        style={{ color: colors.textSecondary }}
      >
        {label} {required && <span style={{ color: colors.primary }}>*</span>}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        maxLength={maxLength}
        className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
        style={{
          borderColor: colors.border,
          background: colors.background,
          color: colors.textPrimary,
        }}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  colors,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  colors: ReturnType<typeof useColors>;
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
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
        style={{
          borderColor: colors.border,
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
    </label>
  );
}
