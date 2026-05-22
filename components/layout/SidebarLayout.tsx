"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Wallet,
  LayoutDashboard, // Digunakan untuk ikon Pinjaman agar lebih mirip
  BarChart3, // Digunakan untuk Laporan agar lebih mirip
  Settings,
  HelpCircle,
  LogOut,
  UserPlus,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

const navItems = [
  { label: "Beranda", href: "/dashboard", icon: Home },
  { label: "Data Anggota", href: "/dashboard/anggota", icon: Users },
  { label: "Simpanan", href: "/dashboard/simpanan", icon: Wallet },
  { label: "Pinjaman", href: "/dashboard/pinjaman", icon: LayoutDashboard },
  { label: "Laporan Keuangan", href: "/dashboard/laporan", icon: BarChart3 },
  { label: "Tambah Akun", href: "/dashboard/tambah-akun", icon: UserPlus }, // ← tambah ini
  { label: "Pengaturan", href: "/dashboard/pengaturan", icon: Settings },
];

interface sidebarLayoutProps {
  showSidebarMobile: boolean;
}

export default function SidebarLayout({
  showSidebarMobile,
}: sidebarLayoutProps) {
  const colors = useColors();
  const pathname = usePathname() || "/dashboard";

  const { theme } = useTheme();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r shadow-xl transition-transform duration-300 lg:translate-x-0 lg:shadow-none lg:h-screen lg:sticky lg:top-0 ${
        showSidebarMobile ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{
        backgroundColor: colors.primary,
        borderColor: colors.primary,
      }}
      aria-hidden={!showSidebarMobile}
    >
      {/* HEADER LOGO */}
      <div className="p-5 flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          style={{ background: "transparent" }}
        >
          <img
            src="/logo-kabupaten-konawe.png"
            className="w-full h-full bg-white rounded-md p-1 object-contain"
            alt="logo kabupaten konawe transparan"
          />
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-bold text-white">Desa Tani Indah</p>
          <p className="text-[9px] mt-0.5 font-bold text-white/70">
            Sistem Koperasi Terpadu
          </p>
        </div>
      </div>

      {/* NAVIGASI UTAMA */}
      <nav className="flex-1 mt-1">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
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

                  {/* INDICATOR GARIS KANAN (Sesuai Gambar) */}
                  {active && (
                    <div
                      className="absolute right-0 top-0 h-full w-1 rounded-l-full"
                      style={{ backgroundColor: "white" }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* NAVIGASI BAWAH (Bantuan & Keluar) */}
      <div className="mt-auto p-4 space-y-1">
        <Link
          href="/dashboard/bantuan"
          className="flex items-center gap-3 py-2.5 px-2 text-[13px] font-medium text-white/70 hover:text-white transition-colors"
        >
          <HelpCircle
            size={18}
            className="text-white/50"
            style={{ color: "rgba(255,255,255,0.5)" }}
          />
          <span>Bantuan</span>
        </Link>

        <button
          type="button"
          className="w-full flex items-center gap-3 py-2.5 px-2 text-[13px] font-medium text-white/70 hover:text-white transition-colors"
        >
          <LogOut size={18} className="text-white/50" />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
