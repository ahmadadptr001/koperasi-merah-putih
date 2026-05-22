"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  UserPlus,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  ShieldCheck,
} from "lucide-react";
import Swal from "sweetalert2";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

// ── Schema Validasi ────────────────────────────────────────────────
const schema = z
  .object({
    namaLengkap: z.string().min(3, "Nama lengkap minimal 3 karakter"),
    username: z
      .string()
      .min(4, "Username minimal 4 karakter")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username hanya boleh huruf, angka, dan underscore",
      ),
    email: z.string().email("Format email tidak valid"),
    role: z.enum(["admin", "bendahara", "pengurus", "anggota"], {
       message: "Pilih role yang valid" ,
    }),
    password: z.string().min(8, "Password minimal 8 karakter"),
    konfirmasiPassword: z.string(),
  })
  .refine((data) => data.password === data.konfirmasiPassword, {
    message: "Password tidak cocok",
    path: ["konfirmasiPassword"],
  });

type FormData = z.infer<typeof schema>;

// ── Role Options ───────────────────────────────────────────────────
const roleOptions = [
  { value: "admin", label: "Admin", desc: "Akses penuh ke seluruh sistem" },
  { value: "bendahara", label: "Bendahara", desc: "Kelola keuangan & laporan" },
  {
    value: "pengurus",
    label: "Pengurus",
    desc: "Kelola data anggota & transaksi",
  },
  {
    value: "anggota",
    label: "Anggota",
    desc: "Akses terbatas, lihat data sendiri",
  },
];

// ── Komponen Utama ─────────────────────────────────────────────────
export default function TambahAkunPage() {
  const colors = useColors();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [showPassword, setShowPassword] = useState(false);
  const [showKonfirmasi, setShowKonfirmasi] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const passwordValue = watch("password", "");

  // Indikator kekuatan password
  const getPasswordStrength = (pw: string) => {
    if (!pw) return { level: 0, label: "", color: "" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: "Lemah", color: "#ef4444" };
    if (score === 2) return { level: 2, label: "Sedang", color: "#f59e0b" };
    if (score === 3) return { level: 3, label: "Kuat", color: "#3b82f6" };
    return { level: 4, label: "Sangat Kuat", color: "#10b981" };
  };

  const strength = getPasswordStrength(passwordValue);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      // Simulasi proses simpan (ganti dengan API call jika sudah ada backend)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      await Swal.fire({
        icon: "success",
        title: "Akun Berhasil Dibuat!",
        html: `Akun <b>${data.namaLengkap}</b> dengan role <b>${
          roleOptions.find((r) => r.value === data.role)?.label
        }</b> berhasil ditambahkan.`,
        confirmButtonColor: colors.primary,
        confirmButtonText: "Oke",
      });

      reset();
    } catch {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan saat membuat akun. Coba lagi.",
        confirmButtonColor: colors.primary,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    const result = await Swal.fire({
      title: "Reset Form?",
      text: "Semua data yang sudah diisi akan dihapus.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: colors.primary,
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Reset",
      cancelButtonText: "Batal",
    });
    if (result.isConfirmed) reset();
  };

  // ── Styles Dinamis ───────────────────────────────────────────────
  const cardBg = isDark ? "#1e2433" : "#ffffff";
  const pageBg = isDark ? "#111827" : "#f3f4f6";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";
  const inputBg = isDark ? "#2d3748" : "#f9fafb";
  const inputBorder = isDark ? "#4b5563" : "#e5e7eb";
  const inputText = isDark ? "#f9fafb" : "#111827";

  const inputClass = `
    w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none border transition-all
    focus:ring-2 focus:border-transparent
  `;

  const inputStyle = {
    backgroundColor: inputBg,
    borderColor: inputBorder,
    color: inputText,
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: pageBg }}>
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="p-2 rounded-xl"
            style={{ backgroundColor: `${colors.primary}20` }}
          >
            <UserPlus size={22} style={{ color: colors.primary }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: textPrimary }}>
            Tambah Akun
          </h1>
        </div>
        <p className="text-sm ml-14" style={{ color: textSecondary }}>
          Buat akun baru untuk pengguna sistem koperasi
        </p>
      </div>

      {/* ── Form Card ── */}
      <div
        className="max-w-2xl mx-auto rounded-2xl shadow-sm border p-8"
        style={{ backgroundColor: cardBg, borderColor: inputBorder }}
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-5">
            {/* Nama Lengkap */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: textPrimary }}
              >
                Nama Lengkap <span style={{ color: colors.primary }}>*</span>
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: textSecondary }}
                />
                <input
                  {...register("namaLengkap")}
                  type="text"
                  placeholder="Contoh: Ahmad Adiputra"
                  className={inputClass}
                  style={{
                    ...inputStyle,
                    ...(errors.namaLengkap ? { borderColor: "#ef4444" } : {}),
                  }}
                />
              </div>
              {errors.namaLengkap && (
                <p className="text-xs mt-1.5 text-red-500">
                  {errors.namaLengkap.message}
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: textPrimary }}
              >
                Username <span style={{ color: colors.primary }}>*</span>
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                  style={{ color: textSecondary }}
                >
                  @
                </span>
                <input
                  {...register("username")}
                  type="text"
                  placeholder="ahmad_adi"
                  className={inputClass}
                  style={{
                    ...inputStyle,
                    ...(errors.username ? { borderColor: "#ef4444" } : {}),
                  }}
                />
              </div>
              {errors.username && (
                <p className="text-xs mt-1.5 text-red-500">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: textPrimary }}
              >
                Email <span style={{ color: colors.primary }}>*</span>
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: textSecondary }}
                />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="contoh@email.com"
                  className={inputClass}
                  style={{
                    ...inputStyle,
                    ...(errors.email ? { borderColor: "#ef4444" } : {}),
                  }}
                />
              </div>
              {errors.email && (
                <p className="text-xs mt-1.5 text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Role */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: textPrimary }}
              >
                Role / Jabatan <span style={{ color: colors.primary }}>*</span>
              </label>
              <div className="relative">
                <ShieldCheck
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: textSecondary }}
                />
                <select
                  {...register("role")}
                  className={inputClass}
                  style={{
                    ...inputStyle,
                    ...(errors.role ? { borderColor: "#ef4444" } : {}),
                  }}
                >
                  <option value="">-- Pilih Role --</option>
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} — {r.desc}
                    </option>
                  ))}
                </select>
              </div>
              {errors.role && (
                <p className="text-xs mt-1.5 text-red-500">
                  {errors.role.message}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="pt-1 pb-1">
              <div className="flex items-center gap-3">
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: inputBorder }}
                />
                <span
                  className="text-xs font-semibold"
                  style={{ color: textSecondary }}
                >
                  KEAMANAN AKUN
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: inputBorder }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: textPrimary }}
              >
                Password <span style={{ color: colors.primary }}>*</span>
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: textSecondary }}
                />
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimal 8 karakter"
                  className={`${inputClass} pr-11`}
                  style={{
                    ...inputStyle,
                    ...(errors.password ? { borderColor: "#ef4444" } : {}),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: textSecondary }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength */}
              {passwordValue && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor:
                            i <= strength.level ? strength.color : inputBorder,
                        }}
                      />
                    ))}
                  </div>
                  <p
                    className="text-xs font-medium"
                    style={{ color: strength.color }}
                  >
                    Kekuatan: {strength.label}
                  </p>
                </div>
              )}

              {errors.password && (
                <p className="text-xs mt-1.5 text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Konfirmasi Password */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: textPrimary }}
              >
                Konfirmasi Password{" "}
                <span style={{ color: colors.primary }}>*</span>
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: textSecondary }}
                />
                <input
                  {...register("konfirmasiPassword")}
                  type={showKonfirmasi ? "text" : "password"}
                  placeholder="Ulangi password"
                  className={`${inputClass} pr-11`}
                  style={{
                    ...inputStyle,
                    ...(errors.konfirmasiPassword
                      ? { borderColor: "#ef4444" }
                      : {}),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKonfirmasi((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: textSecondary }}
                >
                  {showKonfirmasi ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.konfirmasiPassword && (
                <p className="text-xs mt-1.5 text-red-500">
                  {errors.konfirmasiPassword.message}
                </p>
              )}
            </div>
          </div>

          {/* ── Tombol Aksi ── */}
          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
              style={{
                borderColor: inputBorder,
                color: textSecondary,
                backgroundColor: "transparent",
              }}
            >
              Reset Form
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.primary }}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Buat Akun
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
