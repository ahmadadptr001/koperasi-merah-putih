"use client";

import { useTheme } from "@/hooks/useTheme";

export const useColors = () => {
  const { theme } = useTheme();
  // useTheme sudah menormalkan nilainya jadi "light" | "dark",
  // jadi tidak perlu lagi menebak nilai "auto"/""/null.
  const isLight = theme !== "dark";

  return {
    // ─── BRAND ───────────────────────────────────────────────
    // Light: merah tua korporat | Dark: sedikit lebih cerah agar kontras di bg gelap
    primary: isLight ? "#b7102a" : "#d42b42",
    primaryLight: isLight ? "#c9202f" : "#e04f62", // selalu aman pakai teks putih

    // Hijau emerald untuk aksen positif (success, income, dsb)
    secondary: isLight ? "#065f46" : "#34d399",
    secondaryLight: isLight ? "#a7f3d0" : "#064e3b", // border/bg hijau tipis

    // ─── BACKGROUND ──────────────────────────────────────────
    // Page: abu-abu sangat terang | Dark: biru-hitam ala GitHub dark
    background: isLight ? "#f6f8fa" : "#0d1117",
    backgroundAccent: isLight ? "#fff1f2" : "#1c0d10", // merah-tint tipis

    // ─── SURFACE (Card) ──────────────────────────────────────
    // Kontras jelas terhadap background agar card "mengambang"
    surface: isLight ? "#ffffff" : "#161b22",
    surfaceHover: isLight ? "#f3f4f6" : "#1c2128",

    // ─── BORDER ──────────────────────────────────────────────
    border: isLight ? "#d0d7de" : "#30363d",
    borderAccent: isLight ? "#fecdd3" : "#6b1a28", // FIX: "#pe4bebc" -> valid hex
    borderLightGray: isLight ? "#eaeef2" : "#21262d",

    // ─── SHADOW ──────────────────────────────────────────────
    shadow: isLight
      ? "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)"
      : "0 4px 16px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)",

    // ─── NEUTRAL GRAYS ───────────────────────────────────────
    bgGrayDark: isLight ? "#eaeef2" : "#1c2128",
    mutedGray: isLight ? "#6e7781" : "#8b949e",

    // ─── TEXT ────────────────────────────────────────────────
    textPrimary: isLight ? "#1f2328" : "#e6edf3",
    textSecondary: isLight ? "#57606a" : "#8b949e", // FIX: trailing whitespace dihapus
    textMuted: isLight ? "#9ea5ad" : "#6e7781",
    textOnColor: "#ffffff", // selalu putih di atas warna brand

    // ─── STATUS ──────────────────────────────────────────────
    error: isLight ? "#b7102a" : "#f85149",
    errorLight: isLight ? "#fff1f2" : "#3d0c0f",

    success: isLight ? "#1a7f4b" : "#3fb950",
    info: isLight ? "#0969da" : "#58a6ff",
    warning: isLight ? "#9a6700" : "#d29922",

    // ─── ACCENT FILLS ────────────────────────────────────────
    accentRed: isLight ? "#fff1f2" : "#1c0d10",
    accentGreen: isLight ? "#f0fdf4" : "#0d2b1a", // FIX: "#8cf5e4" terlalu teal
    accentBlue: isLight ? "#ddf4ff" : "#0d1e35",
  } as const;
};
