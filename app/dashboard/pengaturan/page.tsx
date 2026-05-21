"use client";

import { z } from "zod";
import React, { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  Mail,
  Moon,
  Palette,
  Pencil,
  Phone,
  Save,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  Sun,
  User,
  UserCircle,
} from "lucide-react";
import HalamanPengaturanRole from "./role/page";
import { useColors } from "@/hooks/useColors";

const profileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().min(10, "Nomor telepon minimal 10 digit"),
  address: z.string().min(6, "Alamat minimal 6 karakter"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
    newPassword: z
      .string()
      .min(8, "Password baru minimal 8 karakter")
      .regex(/[A-Z]/, "Tambahkan minimal 1 huruf kapital")
      .regex(/[0-9]/, "Tambahkan minimal 1 angka"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type NotificationKey = "email" | "sms" | "push" | "approval";
type NotificationPreferences = Record<NotificationKey, boolean>;
type ThemeMode = "light" | "dark";
type TabId = "profile" | "security" | "notifications" | "theme" | "role";

type TabItem = {
  id: TabId;
  label: string;
  description: string;
  icon: LucideIcon;
};

const defaultProfile: ProfileForm = {
  name: "Ahmad Bagas Adiputra",
  email: "ahmadadptr@gmail.com",
  phone: "0812-3456-7890",
  address: "Desa Tani Indah, Indonesia",
};

const defaultNotifications: NotificationPreferences = {
  email: true,
  sms: false,
  push: true,
  approval: true,
};

const tabs: TabItem[] = [
  {
    id: "profile",
    label: "Profil",
    description: "Identitas dan kontak akun",
    icon: User,
  },
  {
    id: "security",
    label: "Keamanan",
    description: "Password dan proteksi akses",
    icon: Shield,
  },
  {
    id: "notifications",
    label: "Notifikasi",
    description: "Preferensi kanal pemberitahuan",
    icon: Bell,
  },
  {
    id: "theme",
    label: "Tampilan",
    description: "Tema dan preferensi visual",
    icon: Palette,
  },
  {
    id: "role",
    label: "Hak Akses",
    description: "Kelola role dan izin pengguna",
    icon: ShieldCheck,
  },
];

const notificationOptions: Array<{
  key: NotificationKey;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    key: "email",
    title: "Email Keuangan",
    description:
      "Kirim ringkasan transaksi, laporan, dan perubahan saldo ke email.",
    icon: Mail,
  },
  {
    key: "sms",
    title: "SMS Prioritas",
    description: "Gunakan SMS untuk status pinjaman dan aktivitas penting.",
    icon: Phone,
  },
  {
    key: "push",
    title: "Push Notification",
    description: "Tampilkan notifikasi cepat dari aplikasi dashboard.",
    icon: Smartphone,
  },
  {
    key: "approval",
    title: "Persetujuan Admin",
    description:
      "Beritahu saat ada anggota, simpanan, atau pinjaman yang perlu ditinjau.",
    icon: ShieldCheck,
  },
];

const readJsonStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;

  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "light";

  const savedTheme = localStorage.getItem("theme");
  return savedTheme === "dark" ? "dark" : "light";
};

export default function HalamanPengaturan() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [profile, setProfile] = useState<ProfileForm>(() =>
    readJsonStorage("userProfile", defaultProfile),
  );
  const [profileErrors, setProfileErrors] = useState<
    Partial<Record<keyof ProfileForm, string>>
  >({});
  const [password, setPassword] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<
    Partial<Record<keyof PasswordForm, string>>
  >({});
  const [showPassword, setShowPassword] = useState<
    Record<keyof PasswordForm, boolean>
  >({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [notifications, setNotifications] = useState<NotificationPreferences>(
    () => readJsonStorage("notifications", defaultNotifications),
  );
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [successMessage, setSuccessMessage] = useState("");

  const activeTabData = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(""), 2600);
  };

  const handleProfileSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = profileSchema.safeParse(profile);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setProfileErrors({
        name: errors.name?.[0],
        email: errors.email?.[0],
        phone: errors.phone?.[0],
        address: errors.address?.[0],
      });
      return;
    }

    setProfileErrors({});
    localStorage.setItem("userProfile", JSON.stringify(parsed.data));
    showSuccess("Profil berhasil diperbarui.");
  };

  const handlePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = passwordSchema.safeParse(password);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setPasswordErrors({
        currentPassword: errors.currentPassword?.[0],
        newPassword: errors.newPassword?.[0],
        confirmPassword: errors.confirmPassword?.[0],
      });
      return;
    }

    if (parsed.data.currentPassword !== "password123") {
      setPasswordErrors({ currentPassword: "Password saat ini belum sesuai" });
      return;
    }

    setPasswordErrors({});
    setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    showSuccess("Password berhasil diperbarui.");
  };

  const handleNotificationToggle = (key: NotificationKey) => {
    const updatedNotifications = {
      ...notifications,
      [key]: !notifications[key],
    };

    setNotifications(updatedNotifications);
    localStorage.setItem("notifications", JSON.stringify(updatedNotifications));
    showSuccess("Preferensi notifikasi tersimpan.");
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.className = newTheme;
    showSuccess(
      `Tema ${newTheme === "light" ? "terang" : "gelap"} diterapkan.`,
    );

    window.setTimeout(() => {
      window.location.reload();
    }, 450);
  };

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: colors.background }}
    >
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
            Kelola profil, keamanan akun, notifikasi, dan tampilan dashboard
            koperasi dalam satu tempat.
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
          Sinkron lokal aktif
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
                className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
                style={{ background: colors.primary }}
              >
                <UserCircle size={26} />
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
                  Administrator Koperasi
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

          {activeTab === "profile" && (
            <SectionCard
              title="Informasi Profil"
              description="Data ini digunakan sebagai identitas utama pengelola dashboard."
              colors={colors}
            >
              <form onSubmit={handleProfileSubmit} className="space-y-6">
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
                  <TextField
                    label="Alamat / Wilayah"
                    value={profile.address}
                    error={profileErrors.address}
                    colors={colors}
                    onChange={(value) =>
                      setProfile({ ...profile, address: value })
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
                      value="Administrator"
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

                <PrimaryButton icon={Save} colors={colors}>
                  Simpan Profil
                </PrimaryButton>
              </form>
            </SectionCard>
          )}

          {activeTab === "security" && (
            <SectionCard
              title="Keamanan Akun"
              description="Gunakan password kuat untuk menjaga akses data koperasi."
              colors={colors}
            >
              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <PasswordField
                  label="Password Saat Ini"
                  value={password.currentPassword}
                  visible={showPassword.currentPassword}
                  error={passwordErrors.currentPassword}
                  colors={colors}
                  onChange={(value) =>
                    setPassword({ ...password, currentPassword: value })
                  }
                  onToggle={() =>
                    setShowPassword({
                      ...showPassword,
                      currentPassword: !showPassword.currentPassword,
                    })
                  }
                />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <PasswordField
                    label="Password Baru"
                    value={password.newPassword}
                    visible={showPassword.newPassword}
                    error={passwordErrors.newPassword}
                    colors={colors}
                    onChange={(value) =>
                      setPassword({ ...password, newPassword: value })
                    }
                    onToggle={() =>
                      setShowPassword({
                        ...showPassword,
                        newPassword: !showPassword.newPassword,
                      })
                    }
                  />
                  <PasswordField
                    label="Konfirmasi Password"
                    value={password.confirmPassword}
                    visible={showPassword.confirmPassword}
                    error={passwordErrors.confirmPassword}
                    colors={colors}
                    onChange={(value) =>
                      setPassword({ ...password, confirmPassword: value })
                    }
                    onToggle={() =>
                      setShowPassword({
                        ...showPassword,
                        confirmPassword: !showPassword.confirmPassword,
                      })
                    }
                  />
                </div>

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
                        Rekomendasi keamanan
                      </p>
                      <p
                        className="mt-1 text-sm"
                        style={{ color: colors.textSecondary }}
                      >
                        Pakai minimal 8 karakter, huruf kapital, angka, dan
                        jangan gunakan password yang sama dengan aplikasi lain.
                      </p>
                    </div>
                  </div>
                </div>

                <PrimaryButton icon={Shield} colors={colors}>
                  Perbarui Password
                </PrimaryButton>
              </form>
            </SectionCard>
          )}

          {activeTab === "notifications" && (
            <SectionCard
              title="Preferensi Notifikasi"
              description="Atur informasi apa saja yang perlu dikirim ke pengelola koperasi."
              colors={colors}
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {notificationOptions.map((option) => (
                  <NotificationCard
                    key={option.key}
                    title={option.title}
                    description={option.description}
                    enabled={notifications[option.key]}
                    icon={option.icon}
                    colors={colors}
                    onToggle={() => handleNotificationToggle(option.key)}
                  />
                ))}
              </div>
            </SectionCard>
          )}

          {activeTab === "theme" && (
            <SectionCard
              title="Tampilan Dashboard"
              description="Pilih tema yang paling nyaman untuk membaca data koperasi."
              colors={colors}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ThemeOption
                  title="Mode Terang"
                  description="Cocok untuk penggunaan siang hari dan ruangan terang."
                  icon={Sun}
                  active={theme === "light"}
                  colors={colors}
                  onClick={() => handleThemeChange("light")}
                />
                <ThemeOption
                  title="Mode Gelap"
                  description="Lebih nyaman untuk penggunaan malam atau layar redup."
                  icon={Moon}
                  active={theme === "dark"}
                  colors={colors}
                  onClick={() => handleThemeChange("dark")}
                />
              </div>

              <div
                className="mt-5 rounded-xl border p-4"
                style={{
                  borderColor: colors.border,
                  background: colors.background,
                }}
              >
                <div className="flex items-start gap-3">
                  <Laptop size={19} style={{ color: colors.info }} />
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: colors.textPrimary }}
                    >
                      Tema aktif: {theme === "light" ? "Terang" : "Gelap"}
                    </p>
                    <p
                      className="mt-1 text-sm"
                      style={{ color: colors.textSecondary }}
                    >
                      Perubahan tema disimpan di perangkat ini dan diterapkan
                      ulang saat dashboard dibuka.
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === "role" && (
            <SectionCard
              title="Halaman Hak Akses"
              description="Atur role user sesuai kebutuhan"
              colors={colors}
            >
              <div className="p-4">
                <a
                  href="/dashboard/pengaturan/role"
                  style={{
                    backgroundColor: colors.primaryLight,
                    color: colors.textOnColor,
                  }}
                  className="flex w-fit items-center gap-2 hover:scale-105 px-4 py-3 rounded-full"
                >
                  <Pencil size={17} />
                  <span>Atur Sekarang</span>
                </a>
              </div>
            </SectionCard>
          )}
        </section>
      </div>
    </div>
  );
}

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

function PasswordField({
  label,
  value,
  visible,
  error,
  colors,
  onChange,
  onToggle,
}: {
  label: string;
  value: string;
  visible: boolean;
  error?: string;
  colors: ReturnType<typeof useColors>;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label className="block">
      <span
        className="mb-2 block text-sm font-bold"
        style={{ color: colors.textSecondary }}
      >
        {label}
      </span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border px-4 py-3 pr-12 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
          style={{
            borderColor: error ? colors.error : colors.border,
            background: colors.background,
            color: colors.textPrimary,
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-3"
          style={{ color: colors.textSecondary }}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
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
}: {
  icon: LucideIcon;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm transition-transform active:scale-95"
      style={{ background: colors.primary }}
    >
      <Icon size={18} />
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

function NotificationCard({
  title,
  description,
  enabled,
  icon: Icon,
  colors,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  icon: LucideIcon;
  colors: ReturnType<typeof useColors>;
  onToggle: () => void;
}) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: colors.border, background: colors.background }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="rounded-xl p-3"
            style={{
              background: enabled ? colors.backgroundAccent : colors.surface,
              color: enabled ? colors.primary : colors.textSecondary,
            }}
          >
            <Icon size={20} />
          </div>
          <div>
            <p className="font-black" style={{ color: colors.textPrimary }}>
              {title}
            </p>
            <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
              {description}
            </p>
          </div>
        </div>
        <Switch enabled={enabled} colors={colors} onToggle={onToggle} />
      </div>
    </div>
  );
}

function Switch({
  enabled,
  colors,
  onToggle,
}: {
  enabled: boolean;
  colors: ReturnType<typeof useColors>;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
      style={{ background: enabled ? colors.primary : colors.border }}
      aria-pressed={enabled}
    >
      <span
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all"
        style={{ left: enabled ? "24px" : "4px" }}
      />
    </button>
  );
}

function ThemeOption({
  title,
  description,
  icon: Icon,
  active,
  colors,
  onClick,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  active: boolean;
  colors: ReturnType<typeof useColors>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border p-5 text-left transition-transform hover:-translate-y-0.5"
      style={{
        borderColor: active ? colors.primary : colors.border,
        background: active ? colors.backgroundAccent : colors.background,
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div
          className="rounded-xl p-3"
          style={{
            background: active ? colors.primary : colors.surface,
            color: active ? "#ffffff" : colors.textSecondary,
          }}
        >
          <Icon size={22} />
        </div>
        {active && <CheckCircle2 size={20} style={{ color: colors.primary }} />}
      </div>
      <p className="font-black" style={{ color: colors.textPrimary }}>
        {title}
      </p>
      <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
        {description}
      </p>
    </button>
  );
}
