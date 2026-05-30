"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  Wallet,
  LayoutDashboard,
  Settings,
  HelpCircle,
  LogOut,
  Check,
  UserPlus,
  BarChart3,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useState } from "react";
import Swal from "sweetalert2";
import { useAuth } from "@/hooks/useAuth";

// ─── Definisi menu dengan role yang diizinkan ──────────────────────────────
const navItems = [
  {
    label: "Beranda",
    href: "/dashboard",
    icon: Home,
    roles: ["admin", "pengurus", "anggota"],
  },
  {
    label: "Data Anggota",
    href: "/dashboard/anggota",
    icon: Users,
    roles: ["admin", "pengurus"],
  },
  {
    label: "Simpanan",
    href: "/dashboard/simpanan",
    icon: Wallet,
    roles: ["admin", "pengurus"],
  },
  {
    label: "Pinjaman",
    href: "/dashboard/pinjaman",
    icon: LayoutDashboard,
    roles: ["admin", "pengurus", "anggota"],
  },
  {
    label: "Persetujuan",
    href: "/dashboard/persetujuan",
    icon: Check,
    roles: ["admin", "pengurus"],
  },
  {
    label: "Laporan Keuangan",
    href: "/dashboard/laporan",
    icon: BarChart3,
    roles: ["admin", "pengurus"],
  },
  {
    label: "Tambah Akun",
    href: "/dashboard/tambah-akun",
    icon: UserPlus,
    roles: ["admin", "pengurus"],
  },
  {
    label: "Pengaturan",
    href: "/dashboard/pengaturan",
    icon: Settings,
    roles: ["admin", "pengurus", "anggota"],
  },
];

interface SidebarLayoutProps {
  showSidebarMobile: boolean;
}

export default function SidebarLayout({
  showSidebarMobile,
}: SidebarLayoutProps) {
  const colors = useColors();
  const pathname = usePathname() || "/dashboard";
  const { theme } = useTheme();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ── Filter menu berdasarkan role user ──────────────────────────────────────
  const filteredNavItems = navItems.filter((item) => {
    // Jika user belum login atau loading, jangan tampilkan menu (atau tampilkan semua untuk sementara)
    if (loading || !user) return false;
    return item.roles.includes(user.role);
  });

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Keluar?",
      text: "Kamu akan keluar dari sesi ini.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    setIsLoggingOut(true);
    try {
      const { error } = await supabaseBrowser.auth.signOut();
      if (error) throw error;
      router.replace("/autentikasi/masuk");
    } catch (err) {
      setIsLoggingOut(false);
      Swal.fire({
        icon: "error",
        title: "Gagal Keluar",
        text: err instanceof Error ? err.message : "Terjadi kesalahan.",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  // ── Jika loading, tampilkan skeleton atau spinner ──────────────────────────
  if (loading) {
    return (
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r shadow-xl transition-transform duration-300 lg:translate-x-0 lg:shadow-none lg:h-screen lg:sticky lg:top-0 ${
          showSidebarMobile ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: colors.primary, borderColor: colors.primary }}
        aria-hidden={!showSidebarMobile}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-white text-sm">Memuat...</div>
        </div>
      </aside>
    );
  }

  // ── Jika tidak ada user, jangan tampilkan sidebar (redirect akan terjadi di halaman lain) ──
  if (!user) {
    return null;
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r shadow-xl transition-transform duration-300 lg:translate-x-0 lg:shadow-none lg:h-screen lg:sticky lg:top-0 ${
        showSidebarMobile ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ backgroundColor: colors.primary, borderColor: colors.primary }}
      aria-hidden={!showSidebarMobile}
    >
      {/* ── Logo ── */}
      <div className="p-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
          <img
            src="/logo-kabupaten-konawe.png"
            className="w-full h-full bg-white rounded-md p-1 object-contain"
            alt="logo kabupaten konawe"
          />
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-bold text-white">Desa Tani Indah</p>
          <p className="text-[9px] mt-0.5 font-bold text-white/70">
            Sistem Koperasi Terpadu
          </p>
        </div>
      </div>

      {/* ── Navigasi utama ── */}
      <nav className="flex-1 mt-1">
        <ul className="space-y-0.5">
          {filteredNavItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group relative flex items-center gap-3 py-2.5 px-6 text-[13px] font-medium transition-all ${
                    active
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.5 : 2}
                    className={
                      active
                        ? "text-white"
                        : "text-white/70 group-hover:text-white"
                    }
                  />
                  <span className="font-semibold">{item.label}</span>
                  {active && (
                    <div className="absolute right-0 top-0 h-full w-1 rounded-l-full bg-white" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Navigasi bawah ── */}
      <div className="mt-auto p-4 space-y-1">
        <Link
          href="/dashboard/bantuan"
          className="flex items-center gap-3 py-2.5 px-2 text-[13px] font-medium text-white/70 hover:text-white transition-colors"
        >
          <HelpCircle size={18} className="text-white/50" />
          <span>Bantuan</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 py-2.5 px-2 text-[13px] font-medium text-white/70 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoggingOut ? (
            <>
              <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white/70 rounded-full animate-spin shrink-0" />
              <span>Keluar...</span>
            </>
          ) : (
            <>
              <LogOut size={18} className="text-white/50" />
              <span>Keluar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
