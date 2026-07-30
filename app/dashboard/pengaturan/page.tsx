"use client";

import { z } from "zod";
import React, { useEffect, useState, useRef, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  CheckCircle2,
  KeyRound,
  Moon,
  Pencil,
  Phone,
  Save,
  Shield,
  ShieldCheck,
  Sun,
  User as UserIcon,
  UserCircle,
  Loader2,
  Send,
  UploadCloud,
  ImageIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { User } from "@/lib/types";
import Swal from "sweetalert2";

// ─── Schema ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().min(10, "Nomor telepon minimal 10 digit"),
});

type ProfileForm = z.infer<typeof profileSchema>;
type ThemeMode = "light" | "dark";
type TabId = "profile" | "security" | "theme" | "role";

type TabItem = {
  id: TabId;
  label: string;
  description: string;
  icon: LucideIcon;
};

const tabs: TabItem[] = [
  {
    id: "profile",
    label: "Profil",
    description: "Identitas dan kontak akun",
    icon: UserIcon,
  },
  {
    id: "security",
    label: "Keamanan",
    description: "Reset password via email",
    icon: Shield,
  },
  {
    id: "role",
    label: "Hak Akses",
    description: "Kelola role dan izin pengguna",
    icon: ShieldCheck,
  },
];

// ─── Constants ──────────────────────────────────────────────────────────────

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 2;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HalamanPengaturan() {
  const colors = useColors();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [profile, setProfile] = useState<ProfileForm>({
    name: "",
    email: "",
    phone: "",
  });
  const [profileErrors, setProfileErrors] = useState<
    Partial<Record<keyof ProfileForm, string>>
  >({});
  // Tema dibaca dari store bersama, bukan state lokal — supaya header,
  // sidebar, dan popup profil ikut berubah tanpa reload halaman.
  const { theme, setTheme } = useTheme();
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // ── Avatar state ────────────────────────────────────────────────────────
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTabData = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  // ── Fetch data dari API ────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const userRes = await fetch(`/api/users/${user.id}`);
        if (!userRes.ok) {
          throw new Error(`Gagal memuat profil (${userRes.status})`);
        }
        const userJson = await userRes.json();
        if (userJson.error) throw new Error(userJson.error);
        const userData = userJson.data as User;
        setProfile({
          name: userData.full_name,
          email: userData.email,
          phone: userData.phone || "",
        });
        setCurrentAvatarUrl(userData.avatar_url || null);
        // Tema tidak perlu dibaca ulang di sini — useTheme sudah membacanya
        // dari localStorage dan membagikannya ke seluruh aplikasi.
      } catch (err) {
        console.error("Error fetching settings:", err);
        await Swal.fire({
          icon: "error",
          title: "Gagal Memuat Data",
          text: err instanceof Error ? err.message : "Terjadi kesalahan",
          confirmButtonColor: colors.primary,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, user, colors.primary]);

  // ── Avatar helpers ──────────────────────────────────────────────────────
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

  // ── Drag handlers ────────────────────────────────────────────────────────
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

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(""), 2600);
  };

  // ── Submit Profil ──────────────────────────────────────────────────────────

  const handleProfileSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!user) return;

    setIsUploading(true);

    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setProfileErrors({
        name: errors.name?.[0],
        email: errors.email?.[0],
        phone: errors.phone?.[0],
      });
      setIsUploading(false);
      return;
    }

    setProfileErrors({});

    try {
      let newAvatarUrl: string | null = currentAvatarUrl;

      // ── Upload avatar baru jika ada ────────────────────────────────────
      if (avatarFile) {
        // Hapus avatar lama dari storage jika ada
        if (currentAvatarUrl) {
          const oldPath = currentAvatarUrl.split("/").pop();
          if (oldPath) {
            await supabaseBrowser.storage.from("users").remove([oldPath]);
          }
        }

        // Upload avatar baru
        const ext = avatarFile.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabaseBrowser.storage
          .from("users")
          .upload(path, avatarFile, {
            contentType: avatarFile.type,
            upsert: true,
          });

        if (uploadError) throw new Error(uploadError.message);

        const { data: urlData } = supabaseBrowser.storage
          .from("users")
          .getPublicUrl(path);
        newAvatarUrl = urlData.publicUrl;
      }

      // ── Update profil user ──────────────────────────────────────────────
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          avatar_url: newAvatarUrl,
          user_id: user?.id,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error)
        throw new Error(json.error || "Gagal memperbarui profil");

      setCurrentAvatarUrl(newAvatarUrl);
      removeAvatar();
      showSuccess("Profil berhasil diperbarui.");
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan",
        confirmButtonColor: colors.primary,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // ── Reset Password via Email ──────────────────────────────────────────────

  const handleResetPassword = async () => {
    if (!user) return;

    const result = await Swal.fire({
      title: "Reset Password",
      text: `Kami akan mengirim link reset password ke ${user.email}. Buka email Anda dan ikuti instruksi untuk membuat password baru.`,
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: colors.primary,
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Kirim Email",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(
        user.email,
        {
          redirectTo: `${window.location.origin}/autentikasi/reset-password`,
        },
      );

      if (error) throw new Error(error.message);

      await Swal.fire({
        icon: "success",
        title: "Email Terkirim!",
        text: `Link reset password telah dikirim ke ${user.email}. Silakan cek inbox Anda.`,
        confirmButtonColor: colors.primary,
        confirmButtonText: "Oke",
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan",
        confirmButtonColor: colors.primary,
      });
    }
  };

  // ── Theme ──────────────────────────────────────────────────────────────────

  const handleThemeChange = (newTheme: ThemeMode) => {
    // setTheme sudah menyimpan ke localStorage dan menandai elemen <html>.
    // Reload paksa yang lama tidak diperlukan lagi: seluruh komponen yang
    // memakai useTheme/useColors langsung ikut berubah.
    setTheme(newTheme);
    showSuccess(
      `Tema ${newTheme === "light" ? "terang" : "gelap"} diterapkan.`,
    );
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (authLoading || loading) {
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p
            className="mb-2 text-sm font-semibold"
            style={{ color: colors.primary }}
          >
            Preferensi Sistem
          </p>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.textPrimary }}
          >
            Pengaturan
          </h1>
          <p
            className="mt-1 max-w-2xl text-sm"
            style={{ color: colors.textSecondary }}
          >
            Kelola profil, keamanan akun, dan tampilan dashboard koperasi dalam
            satu tempat.
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
          <CheckCircle2 size={17} style={{ color: colors.success }} />
          Tersimpan di database
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
        {/* Sidebar navigasi */}
        <aside
          className="h-fit overflow-hidden rounded-xl border shadow-sm"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <div
            className="border-b p-5"
            style={{
              borderColor: colors.border,
              background: colors.background,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-white"
                style={{ background: colors.primary }}
              >
                {currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl + `?t=${Date.now()}`}
                    alt="Avatar"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <UserCircle size={26} />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className="truncate font-black"
                  style={{ color: colors.textPrimary }}
                >
                  {profile.name}
                </p>
                <p
                  className="truncate text-xs"
                  style={{ color: colors.textMuted }}
                >
                  {user?.role || "Anggota"}
                </p>
              </div>
            </div>
          </div>

          <nav className="p-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="cursor-pointer mb-2 flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors last:mb-0"
                  style={{
                    background: active
                      ? colors.backgroundAccent
                      : "transparent",
                    border: `1px solid ${active ? colors.borderAccent : "transparent"}`,
                  }}
                >
                  <div
                    className="rounded-lg p-2"
                    style={{
                      background: active ? colors.primary : colors.background,
                      color: active ? "#ffffff" : colors.textSecondary,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <p
                      className="text-sm font-black"
                      style={{
                        color: active ? colors.primary : colors.textPrimary,
                      }}
                    >
                      {tab.label}
                    </p>
                    <p
                      className="mt-0.5 text-xs"
                      style={{ color: colors.textMuted }}
                    >
                      {tab.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <section className="space-y-6">
          <div
            className="rounded-xl border p-5 shadow-sm"
            style={{ borderColor: colors.border, background: colors.surface }}
          >
            <div className="flex items-start gap-3">
              <div
                className="rounded-xl p-3"
                style={{
                  background: colors.backgroundAccent,
                  color: colors.primary,
                }}
              >
                <activeTabData.icon size={22} />
              </div>
              <div>
                <h2
                  className="text-xl font-black"
                  style={{ color: colors.textPrimary }}
                >
                  {activeTabData.label}
                </h2>
                <p
                  className="mt-1 text-sm"
                  style={{ color: colors.textSecondary }}
                >
                  {activeTabData.description}
                </p>
              </div>
            </div>
          </div>

          {/* ── Profil ── */}
          {activeTab === "profile" && (
            <SectionCard
              title="Informasi Profil"
              description="Data ini digunakan sebagai identitas utama pengelola dashboard."
              colors={colors}
            >
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {/* ── Avatar Upload ──────────────────────────────────────── */}
                <div>
                  <label
                    className="block text-sm font-bold mb-2"
                    style={{ color: colors.textPrimary }}
                  >
                    Foto Profil{" "}
                    <span
                      className="font-normal"
                      style={{ color: colors.textMuted }}
                    >
                      (opsional)
                    </span>
                  </label>

                  {avatarPreview ? (
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
                          style={{ color: colors.textPrimary }}
                        >
                          {avatarFile?.name}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: colors.textSecondary }}
                        >
                          {(avatarFile?.size ?? 0) / 1024} KB
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
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 py-8"
                      style={{
                        borderColor: isDragging
                          ? colors.primary
                          : colors.border,
                        backgroundColor: isDragging
                          ? `${colors.primary}10`
                          : colors.background,
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
                          <ImageIcon
                            size={22}
                            style={{ color: colors.primary }}
                          />
                        )}
                      </div>
                      <div className="text-center">
                        <p
                          className="text-sm font-semibold"
                          style={{
                            color: isDragging
                              ? colors.primary
                              : colors.textPrimary,
                          }}
                        >
                          {isDragging
                            ? "Lepaskan untuk upload"
                            : "Drag & drop foto di sini"}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: colors.textSecondary }}
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
                      <p
                        className="text-xs"
                        style={{ color: colors.textSecondary }}
                      >
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

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <TextField
                    label="Nama Lengkap"
                    value={profile.name}
                    error={profileErrors.name}
                    colors={colors}
                    onChange={(value) =>
                      setProfile({ ...profile, name: value })
                    }
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={profile.email}
                    error={profileErrors.email}
                    colors={colors}
                    onChange={(value) =>
                      setProfile({ ...profile, email: value })
                    }
                  />
                  <TextField
                    label="Nomor Telepon"
                    value={profile.phone}
                    error={profileErrors.phone}
                    colors={colors}
                    onChange={(value) =>
                      setProfile({ ...profile, phone: value })
                    }
                  />
                </div>

                <div
                  className="rounded-xl p-4"
                  style={{ background: colors.background }}
                >
                  <p
                    className="text-sm font-bold"
                    style={{ color: colors.textPrimary }}
                  >
                    Status Akun
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <InfoPill
                      label="Role"
                      value={user?.role || "Anggota"}
                      colors={colors}
                    />
                    <InfoPill
                      label="Verifikasi"
                      value="Aktif"
                      colors={colors}
                    />
                    <InfoPill
                      label="Login Terakhir"
                      value="Hari ini"
                      colors={colors}
                    />
                  </div>
                </div>

                <PrimaryButton
                  icon={Save}
                  colors={colors}
                  loading={isUploading}
                >
                  {isUploading ? "Menyimpan..." : "Simpan Profil"}
                </PrimaryButton>
              </form>
            </SectionCard>
          )}

          {/* ── Keamanan ── */}
          {activeTab === "security" && (
            <SectionCard
              title="Reset Password"
              description="Kirim link reset password ke email Anda."
              colors={colors}
            >
              <div className="space-y-4">
                <div
                  className="rounded-xl border p-4"
                  style={{
                    background: colors.background,
                    borderColor: colors.border,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <KeyRound size={18} style={{ color: colors.primary }} />
                    <div>
                      <p
                        className="text-sm font-bold"
                        style={{ color: colors.textPrimary }}
                      >
                        Email terdaftar
                      </p>
                      <p
                        className="mt-1 text-sm"
                        style={{ color: colors.textSecondary }}
                      >
                        {user?.email || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleResetPassword}
                  className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
                  style={{ background: colors.primary }}
                >
                  <Send size={18} /> Kirim Link Reset Password
                </button>
              </div>
            </SectionCard>
          )}

          {/* ── Role ── */}
          {activeTab === "role" && (
            <SectionCard
              title="Halaman Hak Akses"
              description="Atur role user sesuai kebutuhan"
              colors={colors}
            >
              <div className="p-4">
                <Link
                  href="/dashboard/pengaturan/role"
                  style={{
                    backgroundColor: colors.primaryLight,
                    color: colors.textOnColor,
                  }}
                  className="flex w-fit items-center gap-2 hover:scale-105 px-4 py-3 rounded-full"
                >
                  <Pencil size={17} />
                  <span>Atur Sekarang</span>
                </Link>
              </div>
            </SectionCard>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  colors,
  children,
}: {
  title: string;
  description: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-6 shadow-sm"
      style={{ borderColor: colors.border, background: colors.surface }}
    >
      <div className="mb-6">
        <h3
          className="text-lg font-black"
          style={{ color: colors.textPrimary }}
        >
          {title}
        </h3>
        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          {description}
        </p>
      </div>
      {children}
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
}: {
  label: string;
  value: string;
  error?: string;
  colors: ReturnType<typeof useColors>;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
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
        onChange={(event) => onChange(event.target.value)}
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

function PrimaryButton({
  icon: Icon,
  colors,
  children,
  loading = false,
}: {
  icon: LucideIcon;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm transition-transform active:scale-95 disabled:opacity-60"
      style={{ background: colors.primary }}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <Icon size={18} />
      )}
      {children}
    </button>
  );
}

function InfoPill({
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
      className="rounded-xl border p-3"
      style={{ borderColor: colors.border, background: colors.surface }}
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
