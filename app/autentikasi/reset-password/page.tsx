"use client";

// app/autentikasi/reset-password/page.tsx

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Loader2,
  XCircle,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

// ── Schema ────────────────────────────────────────────────────────────────────
const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .regex(/[A-Z]/, "Harus mengandung minimal 1 huruf kapital")
      .regex(/[0-9]/, "Harus mengandung minimal 1 angka"),
    konfirmasi: z.string(),
  })
  .refine((d) => d.password === d.konfirmasi, {
    message: "Password tidak cocok",
    path: ["konfirmasi"],
  });

type FormData = z.infer<typeof schema>;

type PageState =
  | "verifying" // sedang parse token dari hash
  | "ready" // token valid, tampilkan form
  | "invalid" // token expired / tidak valid
  | "loading" // sedang update password
  | "success"; // password berhasil diubah

export default function ResetPasswordPage() {
  const colors = useColors();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showKonfirmasi, setShowKonfirmasi] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const passwordValue = watch("password", "");

  // ── Verifikasi token dari URL hash ────────────────────────────────────────
  // Supabase akan emit PASSWORD_RECOVERY via onAuthStateChange
  // ketika mendeteksi ?type=recovery di hash fragment
  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPageState("ready");
      }
    });

    // Timeout fallback — jika 5 detik tidak ada event, anggap token invalid
    const timeout = setTimeout(() => {
      setPageState((prev) => (prev === "verifying" ? "invalid" : prev));
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // ── Submit password baru ──────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setPageState("loading");
    setErrorMsg("");

    const { error } = await supabaseBrowser.auth.updateUser({
      password: data.password,
    });

    if (error) {
      setErrorMsg(error.message);
      setPageState("ready");
      return;
    }

    setPageState("success");

    // Sign out agar user login ulang dengan password baru
    await supabaseBrowser.auth.signOut();

    setTimeout(() => router.replace("/autentikasi/masuk"), 3000);
  };

  // ── Password strength ─────────────────────────────────────────────────────
  const getStrength = (pw: string) => {
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

  const strength = getStrength(passwordValue);

  // ── Styles ────────────────────────────────────────────────────────────────
  const pageBg = isDark ? "#0f1623" : "#f1f5f9";
  const cardBg = isDark ? "#1e2433" : "#ffffff";
  const textPrimary = isDark ? "#f9fafb" : "#0f172a";
  const textSecondary = isDark ? "#9ca3af" : "#64748b";
  const inputBg = isDark ? "#2d3748" : "#f8fafc";
  const inputBorder = isDark ? "#374151" : "#e2e8f0";
  const inputText = isDark ? "#f9fafb" : "#0f172a";

  const inputClass =
    "w-full pl-10 pr-11 py-3 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:border-transparent";
  const inputStyle = {
    backgroundColor: inputBg,
    borderColor: inputBorder,
    color: inputText,
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: pageBg }}
    >
      {/* Background decoration */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden
      >
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: colors.primary }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: colors.primary }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* ── Logo ── */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg"
            style={{ backgroundColor: colors.primary }}
          >
            <img
              src="/logo-kabupaten-konawe.png"
              alt="Logo"
              className="w-8 h-8 object-contain brightness-0 invert"
            />
          </div>
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ color: textPrimary }}
          >
            Koperasi Merah Putih
          </h1>
          <p
            className="text-xs mt-1 font-medium"
            style={{ color: textSecondary }}
          >
            Desa Tani Indah · Sistem Koperasi Terpadu
          </p>
        </div>

        {/* ── Card ── */}
        <div
          className="rounded-2xl shadow-xl border p-8"
          style={{ backgroundColor: cardBg, borderColor: inputBorder }}
        >
          {/* ════ VERIFYING ════ */}
          {pageState === "verifying" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.primary}15` }}
              >
                <Loader2
                  size={28}
                  className="animate-spin"
                  style={{ color: colors.primary }}
                />
              </div>
              <div className="text-center">
                <h2
                  className="text-lg font-bold"
                  style={{ color: textPrimary }}
                >
                  Memverifikasi Link
                </h2>
                <p className="text-sm mt-1.5" style={{ color: textSecondary }}>
                  Sedang memeriksa kevalidan link reset password...
                </p>
              </div>
            </div>
          )}

          {/* ════ INVALID ════ */}
          {pageState === "invalid" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-red-50">
                <XCircle size={28} className="text-red-500" />
              </div>
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ color: textPrimary }}
                >
                  Link Tidak Valid
                </h2>
                <p
                  className="text-sm mt-1.5 leading-relaxed"
                  style={{ color: textSecondary }}
                >
                  Link reset password sudah{" "}
                  <span className="font-semibold text-red-500">
                    kedaluwarsa
                  </span>{" "}
                  atau tidak valid. Silakan minta link baru.
                </p>
              </div>
              <Link
                href="/autentikasi/lupa-password"
                className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ backgroundColor: colors.primary }}
              >
                Minta Link Baru
              </Link>
            </div>
          )}

          {/* ════ SUCCESS ════ */}
          {pageState === "success" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.primary}15` }}
              >
                <CheckCircle2 size={28} style={{ color: colors.primary }} />
              </div>
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ color: textPrimary }}
                >
                  Password Berhasil Diubah!
                </h2>
                <p
                  className="text-sm mt-1.5 leading-relaxed"
                  style={{ color: textSecondary }}
                >
                  Password baru kamu sudah aktif. Kamu akan diarahkan ke halaman
                  login dalam beberapa detik...
                </p>
              </div>
              <div
                className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl w-full justify-center"
                style={{
                  backgroundColor: isDark ? "#2d3748" : "#f8fafc",
                  border: `1px solid ${inputBorder}`,
                }}
              >
                <Loader2
                  size={13}
                  className="animate-spin shrink-0"
                  style={{ color: colors.primary }}
                />
                <span style={{ color: textSecondary }}>
                  Mengarahkan ke halaman login...
                </span>
              </div>
            </div>
          )}

          {/* ════ READY / LOADING — Form ════ */}
          {(pageState === "ready" || pageState === "loading") && (
            <>
              <div className="mb-6">
                <div
                  className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4"
                  style={{ backgroundColor: `${colors.primary}15` }}
                >
                  <ShieldCheck size={20} style={{ color: colors.primary }} />
                </div>
                <h2
                  className="text-xl font-bold"
                  style={{ color: textPrimary }}
                >
                  Buat Password Baru
                </h2>
                <p
                  className="text-sm mt-1.5 leading-relaxed"
                  style={{ color: textSecondary }}
                >
                  Pastikan password baru kamu kuat dan mudah diingat.
                </p>
              </div>

              {/* Error banner */}
              {errorMsg && (
                <div
                  className="flex items-start gap-2.5 rounded-xl p-3.5 mb-5 border"
                  style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
                >
                  <AlertCircle
                    size={15}
                    className="shrink-0 mt-0.5 text-red-500"
                  />
                  <p className="text-xs text-red-600 leading-relaxed">
                    {errorMsg}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="space-y-5">
                  {/* ── Password Baru ── */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: textPrimary }}
                    >
                      Password Baru{" "}
                      <span style={{ color: colors.primary }}>*</span>
                    </label>
                    <div className="relative">
                      <Lock
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: textSecondary }}
                      />
                      <input
                        {...register("password")}
                        type={showPw ? "text" : "password"}
                        placeholder="Minimal 8 karakter"
                        autoComplete="new-password"
                        autoFocus
                        className={inputClass}
                        style={{
                          ...inputStyle,
                          ...(errors.password
                            ? { borderColor: "#ef4444" }
                            : {}),
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: textSecondary }}
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Strength bar */}
                    {passwordValue && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="h-1.5 flex-1 rounded-full transition-all duration-300"
                              style={{
                                backgroundColor:
                                  i <= strength.level
                                    ? strength.color
                                    : inputBorder,
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
                        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: textSecondary }}
                      />
                      <input
                        {...register("konfirmasi")}
                        type={showKonfirmasi ? "text" : "password"}
                        placeholder="Ulangi password baru"
                        autoComplete="new-password"
                        className={inputClass}
                        style={{
                          ...inputStyle,
                          ...(errors.konfirmasi
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
                        {showKonfirmasi ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    {errors.konfirmasi && (
                      <p className="text-xs mt-1.5 text-red-500">
                        {errors.konfirmasi.message}
                      </p>
                    )}
                  </div>

                  {/* ── Syarat password ── */}
                  <div
                    className="rounded-xl p-3.5 space-y-1.5"
                    style={{
                      backgroundColor: isDark ? "#2d3748" : "#f8fafc",
                      border: `1px solid ${inputBorder}`,
                    }}
                  >
                    <p
                      className="text-xs font-semibold mb-2"
                      style={{ color: textSecondary }}
                    >
                      Syarat password:
                    </p>
                    {[
                      {
                        label: "Minimal 8 karakter",
                        met: passwordValue.length >= 8,
                      },
                      {
                        label: "Mengandung huruf kapital (A-Z)",
                        met: /[A-Z]/.test(passwordValue),
                      },
                      {
                        label: "Mengandung angka (0-9)",
                        met: /[0-9]/.test(passwordValue),
                      },
                    ].map((req) => (
                      <div key={req.label} className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all"
                          style={{
                            backgroundColor: req.met
                              ? `${colors.primary}20`
                              : inputBorder,
                          }}
                        >
                          {req.met && (
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 8 8"
                              fill="none"
                            >
                              <path
                                d="M1.5 4L3 5.5L6.5 2"
                                stroke={colors.primary}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <p
                          className="text-xs transition-colors"
                          style={{
                            color: req.met ? textPrimary : textSecondary,
                          }}
                        >
                          {req.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* ── Submit ── */}
                  <button
                    type="submit"
                    disabled={pageState === "loading"}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: colors.primary }}
                  >
                    {pageState === "loading" ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={15} />
                        Simpan Password Baru
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Footer link ── */}
          {pageState !== "success" && (
            <div
              className="mt-6 pt-5 text-center"
              style={{ borderTop: `1px solid ${inputBorder}` }}
            >
              <Link
                href="/autentikasi/login"
                className="text-sm font-semibold transition-opacity hover:opacity-70"
                style={{ color: textSecondary }}
              >
                Kembali ke halaman Login
              </Link>
            </div>
          )}
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: textSecondary }}
        >
          © {new Date().getFullYear()} Koperasi Merah Putih · Desa Tani Indah
        </p>
      </div>
    </div>
  );
}
