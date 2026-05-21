import { useColors } from "@/hooks/useColors";
import { color } from "chart.js/helpers";
import { Search, UserCircle } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface headerLayoutProps {
  showSidebarMobile: boolean;
  setShowSidebarMobile: any;
}

export default function HeaderLayout({
  showSidebarMobile,
  setShowSidebarMobile,
}: headerLayoutProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <header
      style={{ borderColor: colors.border, background: colors.background }}
      className="flex flex-col  gap-4 border-b p-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex items-center gap-4">
        {/* button pembuka sidebar dalam ukuran mobile */}
        <button
          onClick={() => setShowSidebarMobile(!showSidebarMobile)}
          aria-expanded={showSidebarMobile}
          className="lg:hidden flex h-9 w-9 flex-col gap-2 items-center justify-center rounded-xl "
        >
          <span
            style={{
              backgroundColor: showSidebarMobile
                ? colors.primary
                : colors.textPrimary,
              transform: showSidebarMobile ? "rotate(45deg)" : "none",
            }}
            className="block h-0.5 w-5 transition-transform duration-200"
          />
          <span
            style={{
              backgroundColor: showSidebarMobile
                ? colors.primary
                : colors.textPrimary,
              transform: showSidebarMobile ? "rotate(45deg)" : "none",
            }}
            className="block h-0.5 w-5 transition-transform duration-200"
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4 w-full lg:w-auto">
        <form className="w-full sm:w-auto">
          <div
            className="flex min-w-0 items-center gap-2 rounded-xl px-3 py-2"
            style={{
              background: colors.background,
              border: "1px solid " + colors.border,
            }}
          >
            <Search size={18} color={colors.mutedGray} />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              id="cari-laproan"
              type="text"
              placeholder="Cari Laporan"
            />
          </div>
        </form>

        {/* profil */}
        <div
          style={{
            background: colors.surface,
            border: "1px solid " + colors.border,
          }}
          className="flex items-center gap-2 rounded-xl px-3 py-2 "
        >
          <img
            src="https://i.pinimg.com/736x/15/83/ab/1583ab6561d2b1202e761976458237eb.jpg"
            alt="Profile"
            className="w-5 h-5 rounded-full object-cover"
          />
          <p style={{ color: colors.mutedGray }} className="truncate text-sm">
            User340492374097
          </p>
        </div>
      </div>
    </header>
  );
}
