"use client";

// app/dashboard/tambah-akun/page.tsx
import { useState, useRef, useCallback } from "react";
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
  Phone,
  UploadCloud,
  X,
  ImageIcon,
} from "lucide-react";
import Swal from "sweetalert2";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import type { UserRole } from "@/lib/types";

// ── Schema ────────────────────────────────────────────────────────────────────
const schema = z
  .object({
    namaLengkap: z.string().min(3, "Nama lengkap minimal 3 karakter"),
    email: z.string().email("Format email tidak valid"),
    phone: z
      .string()
      .regex(/^(\+62|08)\d{8,12}$/, "Format tidak valid (contoh: 08123456789)")
      .optional()
      .or(z.literal("")),
    role: z.enum(["admin", "pengurus", "anggota"] as const, {
      message: "Pilih role yang valid",
    }),
    password: z.string().min(8, "Password minimal 8 karakter"),
    konfirmasiPassword: z.string(),
  })
  .refine((d) => d.password === d.konfirmasiPassword, {
    message: "Password tidak cocok",
    path: ["konfirmasiPassword"],
  });

type FormData = z.infer<typeof schema>;

const roleOptions: { value: UserRole; label: string; desc: string }[] = [
  { value: "admin", label: "Admin", desc: "Akses penuh ke seluruh sistem" },
  {
    value: "pengurus",
    label: "Pengurus",
    desc: "Kelola anggota, simpanan & keuangan",
  },
  {
    value: "anggota",
    label: "Anggota",
    desc: "Akses terbatas, lihat data sendiri",
  },
];

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 2;

export default function TambahAkunPage() {
  const colors = useColors();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [showPassword, setShowPassword] = useState(false);
  const [showKonfirmasi, setShowKonfirmasi] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const passwordValue = watch("password", "");

  const getPasswordStrength = (pw: string) => {
    if (!pw) return { level: 0, label: "", color: "" };
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^a-zA-Z0-9]/.test(pw)) s++;
    if (s <= 1) return { level: 1, label: "Lemah", color: "#ef4444" };
    if (s === 2) return { level: 2, label: "Sedang", color: "#f59e0b" };
    if (s === 3) return { level: 3, label: "Kuat", color: "#3b82f6" };
    return { level: 4, label: "Sangat Kuat", color: "#10b981" };
  };

  const strength = getPasswordStrength(passwordValue);

  // ── Avatar helpers ────────────────────────────────────────────────────────
  const processAvatarFile = useCallback(
    (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        Swal.fire({
          icon: "error",
          title: "Format tidak didukung",
          text: "Gunakan JPG, PNG, atau WebP.",
          confirmButtonColor: colors.primary,
        });
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        Swal.fire({
          icon: "error",
          title: "File terlalu besar",
          text: `Maksimal ${MAX_SIZE_MB} MB.`,
          confirmButtonColor: colors.primary,
        });
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    },
    [colors.primary],
  );

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Drag handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processAvatarFile(file);
  };

  // ── Submit — satu FormData, satu request, atomik di server ───────────────
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append("email", data.email);
      fd.append("full_name", data.namaLengkap);
      fd.append("password", data.password);
      fd.append("role", data.role);
      if (data.phone) fd.append("phone", data.phone);
      if (avatarFile) fd.append("avatar", avatarFile);
      // Tidak perlu Content-Type — browser set sendiri dengan boundary

      const res = await fetch("/api/users", { method: "POST", body: fd });
      const result = await res.json();

      if (!res.ok || result.error)
        throw new Error(result.error ?? "Gagal membuat akun");

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
      removeAvatar();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat membuat akun.",
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
    if (result.isConfirmed) {
      reset();
      removeAvatar();
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const cardBg = isDark ? "#1e2433" : "#ffffff";
  const pageBg = isDark ? "#111827" : "#f3f4f6";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";
  const inputBg = isDark ? "#2d3748" : "#f9fafb";
  const inputBorder = isDark ? "#4b5563" : "#e5e7eb";
  const inputText = isDark ? "#f9fafb" : "#111827";

  const inputClass =
    "w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:border-transparent";
  const inputStyle = {
    backgroundColor: inputBg,
    borderColor: inputBorder,
    color: inputText,
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: pageBg }}>
      {/* Header */}
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

      {/* Form Card */}
      <div
        className="max-w-2xl mx-auto rounded-2xl shadow-sm border p-8"
        style={{ backgroundColor: cardBg, borderColor: inputBorder }}
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-5">
            {/* ── Avatar Upload — Drag & Drop ── */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: textPrimary }}
              >
                Foto Profil{" "}
                <span className="font-normal" style={{ color: textSecondary }}>
                  (opsional)
                </span>
              </label>

              {avatarPreview ? (
                /* ── Preview mode ── */
                <div className="flex items-center gap-4">
                  <div
                    className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2"
                    style={{ borderColor: colors.primary }}
                  >
                    <img
                      src={avatarPreview}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center shadow"
                      style={{ backgroundColor: "#ef4444" }}
                    >
                      <X size={10} color="white" />
                    </button>
                  </div>
                  <div>
                    <p
                      className="text-sm font-medium truncate max-w-[200px]"
                      style={{ color: textPrimary }}
                    >
                      {avatarFile?.name}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: textSecondary }}
                    >
                      {avatarFile ? (avatarFile.size / 1024).toFixed(0) : 0} KB
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs mt-2 font-semibold underline underline-offset-2"
                      style={{ color: colors.primary }}
                    >
                      Ganti foto
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Dropzone mode ── */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 py-8"
                  style={{
                    borderColor: isDragging ? colors.primary : inputBorder,
                    backgroundColor: isDragging
                      ? `${colors.primary}10`
                      : inputBg,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200"
                    style={{
                      backgroundColor: isDragging
                        ? `${colors.primary}25`
                        : `${colors.primary}15`,
                    }}
                  >
                    {isDragging ? (
                      <UploadCloud
                        size={22}
                        style={{ color: colors.primary }}
                      />
                    ) : (
                      <ImageIcon size={22} style={{ color: colors.primary }} />
                    )}
                  </div>
                  <div className="text-center">
                    <p
                      className="text-sm font-semibold"
                      style={{
                        color: isDragging ? colors.primary : textPrimary,
                      }}
                    >
                      {isDragging
                        ? "Lepaskan untuk upload"
                        : "Drag & drop foto di sini"}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: textSecondary }}
                    >
                      atau{" "}
                      <span
                        className="font-semibold underline underline-offset-2"
                        style={{ color: colors.primary }}
                      >
                        klik untuk memilih
                      </span>
                    </p>
                  </div>
                  <p className="text-xs" style={{ color: textSecondary }}>
                    JPG, PNG, WebP · Maks. {MAX_SIZE_MB} MB
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processAvatarFile(f);
                }}
              />
            </div>

            {/* ── Nama Lengkap ── */}
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

            {/* ── Email ── */}
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

            {/* ── Phone ── */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: textPrimary }}
              >
                Nomor HP{" "}
                <span className="font-normal" style={{ color: textSecondary }}>
                  (opsional)
                </span>
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: textSecondary }}
                />
                <input
                  {...register("phone")}
                  type="tel"
                  placeholder="Contoh: 08123456789"
                  className={inputClass}
                  style={{
                    ...inputStyle,
                    ...(errors.phone ? { borderColor: "#ef4444" } : {}),
                  }}
                />
              </div>
              {errors.phone && (
                <p className="text-xs mt-1.5 text-red-500">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* ── Role ── */}
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

            {/* ── Divider ── */}
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

            {/* ── Password ── */}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: textSecondary }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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

            {/* ── Konfirmasi Password ── */}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2"
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
