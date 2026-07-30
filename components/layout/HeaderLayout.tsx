"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import Swal from "sweetalert2";
// Ikon notifikasi sudah pindah ke NotificationBell; sisanya tidak terpakai.
import {
  UserCircle,
  ChevronDown,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";
import type { User as UserType } from "@/lib/types";
import { NotificationBell } from "@/components/layout/NotificationBell";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData extends Pick<UserType, "full_name" | "avatar_url"> {
  email?: string;
  role?: string;
  /** Dipakai sebagai cache-buster avatar; berubah setiap profil disimpan. */
  updated_at?: string;
}

// ─── Profile Dropdown ─────────────────────────────────────────────────────────

function ProfileDropdown({
  profile,
  colors,
}: {
  profile: ProfileData | null;
  colors: ReturnType<typeof useColors>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /**
   * URL avatar + cache-buster.
   *
   * Sebelumnya `Date.now()` dipanggil langsung di dalam JSX, sehingga setiap
   * render menghasilkan URL baru: browser mengunduh ulang gambar terus-terusan
   * dan avatar berkedip. Sekarang penanda diambil dari `updated_at` profil —
   * nilainya berubah tepat ketika profil (termasuk foto) disimpan ulang, jadi
   * cache tetap terpakai selama foto tidak diganti.
   */
  const avatarSrc = useMemo(() => {
    if (!profile?.avatar_url) return null;
    const sep = profile.avatar_url.includes("?") ? "&" : "?";
    const version = profile.updated_at ?? "";
    return version
      ? `${profile.avatar_url}${sep}v=${encodeURIComponent(version)}`
      : profile.avatar_url;
  }, [profile?.avatar_url, profile?.updated_at]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Tutup dropdown dengan Escape — sebelumnya hanya bisa lewat klik di luar.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /**
   * Logout.
   *
   * Sebelumnya hanya `supabaseBrowser.auth.signOut()` tanpa await dan tanpa
   * navigasi: sesi terhapus di background tapi pengguna tetap berada di
   * dashboard dengan data lama di layar, sehingga tombol "Keluar" terlihat
   * seperti tidak berfungsi. Selain itu kegagalan signOut tidak terlihat.
   */
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const { error } = await supabaseBrowser.auth.signOut();
      if (error) throw error;

      setOpen(false);
      // replace agar tombol "back" tidak mengembalikan ke dashboard.
      router.replace("/autentikasi/masuk");
      // Buang cache Router Cache milik segmen dashboard.
      router.refresh();
    } catch (err) {
      setSigningOut(false);
      await Swal.fire({
        icon: "error",
        title: "Gagal Keluar",
        text:
          err instanceof Error
            ? err.message
            : "Tidak dapat mengakhiri sesi. Coba lagi.",
        confirmButtonColor: colors.primary,
      });
    }
  };

  const menuItems = [
    {
      icon: Settings,
      label: "Pengaturan",
      sublabel: "Preferensi tampilan",
      path: "/dashboard/pengaturan",
    },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px 6px 8px",
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          background: open ? colors.surface : colors.background,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
      >
        {/* Avatar */}
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={profile?.full_name ?? "Profil"}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: colors.primary + "22",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <UserCircle size={20} color={colors.primary} />
          </div>
        )}

        {/* Name + role */}
        <div style={{ textAlign: "left", lineHeight: 1.2 }}>
          {profile ? (
            <>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  color: colors.textPrimary,
                  maxWidth: 120,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile.full_name}
              </p>
            </>
          ) : (
            <div
              style={{
                height: 12,
                width: 90,
                borderRadius: 6,
                background: colors.border,
                animation: "pulse 1.5s infinite",
              }}
            />
          )}
        </div>

        <ChevronDown
          size={14}
          color={colors.mutedGray ?? colors.textPrimary}
          style={{
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "none",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 280,
            // surface, bukan background: panel harus terbaca mengambang di
            // atas halaman. Sebelumnya sewarna dengan latar halaman sehingga
            // popup terlihat menyatu / rata di kedua tema.
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            boxShadow: colors.shadow,
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Profile card */}
          <div
            style={{
              padding: "16px",
              // Sedikit tint merah brand agar kepala popup punya hierarki
              // visual, konsisten di tema terang maupun gelap.
              background: colors.backgroundAccent,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {/* Avatar large */}
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={profile?.full_name ?? "Profil"}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                    border: `2px solid ${colors.primary}33`,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: colors.primary + "22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: `2px solid ${colors.primary}33`,
                  }}
                >
                  <UserCircle size={28} color={colors.primary} />
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: 14,
                    color: colors.textPrimary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {profile?.full_name ?? "—"}
                </p>
                {profile?.email && (
                  <p
                    style={{
                      margin: "1px 0 0",
                      fontSize: 12,
                      color: colors.textSecondary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {profile.email}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 5,
                  }}
                >
                  {/* Online badge */}
                  {/* Warna badge diambil dari token tema, bukan hex manual,
                      supaya konsisten dengan komponen lain di kedua tema. */}
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      background: colors.accentGreen,
                      color: colors.success,
                      border: `1px solid ${colors.success}33`,
                      borderRadius: 999,
                      padding: "2px 8px",
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: colors.success,
                      }}
                    />
                    Online
                  </span>

                  {/* Role badge */}
                  {profile?.role && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "capitalize",
                        background: colors.accentBlue,
                        color: colors.info,
                        border: `1px solid ${colors.info}33`,
                        borderRadius: 999,
                        padding: "2px 8px",
                      }}
                    >
                      {profile.role}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: "6px 0" }}>
            {menuItems.map(({ icon: Icon, label, sublabel, path }) => (
              <button
                key={label}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s",
                }}
                // surfaceHover: sebelumnya memakai colors.surface yang kini
                // sewarna panel, jadi hover tidak terlihat sama sekali.
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    colors.surfaceHover)
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "transparent")
                }
                onClick={() => {
                  setOpen(false);
                  router.push(path);
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={15} color={colors.primary} />
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: colors.textSecondary,
                    }}
                  >
                    {sublabel}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Divider + Logout */}
          <div
            style={{
              borderTop: `1px solid ${colors.border}`,
              padding: "6px 0",
            }}
          >
            <button
              type="button"
              disabled={signingOut}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 16px",
                background: "transparent",
                border: "none",
                cursor: signingOut ? "wait" : "pointer",
                opacity: signingOut ? 0.7 : 1,
                textAlign: "left",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  colors.errorLight)
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "transparent")
              }
              onClick={handleSignOut}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${colors.error}55`,
                  background: colors.errorLight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {signingOut ? (
                  <Loader2
                    size={15}
                    color={colors.error}
                    className="animate-spin"
                  />
                ) : (
                  <LogOut size={15} color={colors.error} />
                )}
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.error,
                  }}
                >
                  {signingOut ? "Mengeluarkan…" : "Keluar"}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: colors.textSecondary,
                  }}
                >
                  Akhiri sesi aktif
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Header ──────────────────────────────────────────────────────────────

interface HeaderLayoutProps {
  showSidebarMobile: boolean;
  setShowSidebarMobile: (val: boolean) => void;
}

export default function HeaderLayout({
  showSidebarMobile,
  setShowSidebarMobile,
}: HeaderLayoutProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user: authUser },
      } = await supabaseBrowser.auth.getUser();
      if (!authUser) return;

      const { data } = await supabaseBrowser
        .from("users")
        .select("full_name, avatar_url, email, role, updated_at")
        .eq("id", authUser.id)
        .single();

      if (data) setProfile(data as ProfileData);
    };

    fetchProfile();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(() => {
      fetchProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header
      style={{ borderColor: colors.border, background: colors.background }}
      className="flex flex-col gap-4 border-b p-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
    >
      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowSidebarMobile(!showSidebarMobile)}
          aria-label={showSidebarMobile ? "Tutup sidebar" : "Buka sidebar"}
          aria-expanded={showSidebarMobile}
          className="lg:hidden flex h-9 w-9 flex-col gap-1.5 items-center justify-center rounded-xl"
        >
          <span
            className="block h-0.5 w-5 transition-all duration-200"
            style={{
              backgroundColor: showSidebarMobile
                ? colors.primary
                : colors.textPrimary,
              transform: showSidebarMobile
                ? "translateY(4px) rotate(45deg)"
                : "none",
            }}
          />
          <span
            style={{
              backgroundColor: showSidebarMobile
                ? colors.primary
                : colors.textPrimary,
              transform: showSidebarMobile
                ? "translateY(-4px) rotate(-45deg)"
                : "none",
            }}
            className="block h-0.5 w-5 transition-all duration-200"
          />
        </button>

        <h1 className="font-black text-2xl" style={{ color: colors.primary }}>
          Koperasi Merah{" "}
          <span
            style={{ color: isLight ? colors.primary : colors.textPrimary }}
          >
            Putih
          </span>
        </h1>
      </div>

      {/* Right: Notification Bell + Profile Dropdown (tanpa Search) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 w-full lg:w-auto">
        {/* Notification Bell */}
        <NotificationBell />

        {/* Profile Dropdown */}
        <ProfileDropdown profile={profile} colors={colors} />
      </div>
    </header>
  );
}
