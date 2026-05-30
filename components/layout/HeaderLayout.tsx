"use client";

import { useEffect, useRef, useState } from "react";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  UserCircle,
  Bell,
  CheckCheck,
  ChevronDown,
  Settings,
  LogOut,
  User,
  Shield,
  CreditCard,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
} from "lucide-react";
import type { User as UserType } from "@/lib/types";
import { NotificationBell } from "@/components/layout/NotificationBell";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData extends Pick<UserType, "full_name" | "avatar_url"> {
  email?: string;
  role?: string;
}

// ─── Profile Dropdown ─────────────────────────────────────────────────────────

function ProfileDropdown({
  profile,
  colors,
  isLight,
}: {
  profile: ProfileData | null;
  colors: ReturnType<typeof useColors>;
  isLight: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url + `?t=${Date.now()}`}
            alt={profile.full_name ?? "Profil"}
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
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 280,
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            boxShadow: isLight
              ? "0 8px 32px rgba(0,0,0,0.12)"
              : "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Profile card */}
          <div
            style={{
              padding: "16px",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {/* Avatar large */}
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url + `?t=${Date.now()}`}
                  alt={profile.full_name ?? "Profil"}
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
                      color: colors.mutedGray ?? colors.textPrimary,
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
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      background: isLight ? "#EBFBEE" : "#0e2e20",
                      color: isLight ? "#2F9E44" : "#69db7c",
                      borderRadius: 999,
                      padding: "2px 8px",
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: isLight ? "#2F9E44" : "#69db7c",
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
                        background: isLight ? "#E8F4FD" : "#1a2d45",
                        color: isLight ? "#1971C2" : "#74c0fc",
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
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    colors.surface)
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "transparent")
                }
                onClick={() => {
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
                      color: colors.mutedGray ?? colors.textPrimary,
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
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  isLight ? "#FFF5F5" : "#2c1a1a")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "transparent")
              }
              onClick={() => supabaseBrowser.auth.signOut()}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${isLight ? "#FFC9C9" : "#5c2020"}`,
                  background: isLight ? "#FFF5F5" : "#2c1a1a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <LogOut size={15} color={isLight ? "#E03131" : "#ff8787"} />
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: isLight ? "#E03131" : "#ff8787",
                  }}
                >
                  Keluar
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: colors.mutedGray ?? colors.textPrimary,
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
        .select("full_name, avatar_url, email, role")
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
        <ProfileDropdown profile={profile} colors={colors} isLight={isLight} />
      </div>
    </header>
  );
}
