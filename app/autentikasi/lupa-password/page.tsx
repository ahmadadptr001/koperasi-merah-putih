"use client";

// app/autentikasi/lupa-password/page.tsx

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

// ── Schema ────────────────────────────────────────────────────────────────────
const schema = z.object({
  email: z.string().email("Format email tidak valid"),
});

type FormData = z.infer<typeof schema>;

// ── State tampilan ────────────────────────────────────────────────────────────
type PageState = "idle" | "loading" | "success" | "error";

export default function LupaPasswordPage() {
  const colors = useColors();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [sentEmail, setSentEmail] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setPageState("loading");
    setErrorMsg("");

    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(
      data.email,
      {
        // Setelah klik link di email, user diarahkan ke halaman reset password
        redirectTo: `${window.location.origin}/autentikasi/reset-password`,
      },
    );

    if (error) {
      setErrorMsg(error.message);
      setPageState("error");
      return;
    }

    setSentEmail(data.email);
    setPageState("success");
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const pageBg = isDark ? "#0f1623" : "#f1f5f9";
  const cardBg = isDark ? "#1e2433" : "#ffffff";
  const textPrimary = isDark ? "#f9fafb" : "#0f172a";
  const textSecondary = isDark ? "#9ca3af" : "#64748b";
  const inputBg = isDark ? "#2d3748" : "#f8fafc";
  const inputBorder = isDark ? "#374151" : "#e2e8f0";
  const inputText = isDark ? "#f9fafb" : "#0f172a";

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
        {/* ── Logo + judul ── */}
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
          {pageState === "success" ? (
            /* ── Success state ── */
            <div className="text-center space-y-4">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto"
                style={{ backgroundColor: `${colors.primary}15` }}
              >
                <CheckCircle2 size={32} style={{ color: colors.primary }} />
              </div>
              <div>
                <h2
                  className="text-xl font-bold"
                  style={{ color: textPrimary }}
                >
                  Email Terkirim!
                </h2>
                <p
                  className="text-sm mt-2 leading-relaxed"
                  style={{ color: textSecondary }}
                >
                  Kami telah mengirim link reset password ke{" "}
                  <span
                    className="font-semibold"
                    style={{ color: textPrimary }}
                  >
                    {sentEmail}
                  </span>
                  . Silakan cek inbox atau folder spam kamu.
                </p>
              </div>

              <div
                className="rounded-xl p-4 text-left space-y-2"
                style={{
                  backgroundColor: isDark ? "#2d3748" : "#f8fafc",
                  border: `1px solid ${inputBorder}`,
                }}
              >
                <p
                  className="text-xs font-semibold"
                  style={{ color: textSecondary }}
                >
                  Yang perlu dilakukan:
                </p>
                {[
                  "Buka akun email kamu",
                  'Klik tombol "Reset Password"',
                  "Masukkan password baru kamu",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                      style={{ backgroundColor: colors.primary }}
                    >
                      {i + 1}
                    </span>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: textSecondary }}
                    >
                      {step}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-xs" style={{ color: textSecondary }}>
                Link berlaku selama{" "}
                <span className="font-semibold" style={{ color: textPrimary }}>
                  1 jam
                </span>
                . Tidak menerima email?{" "}
                <button
                  type="button"
                  onClick={() => setPageState("idle")}
                  className="font-semibold underline underline-offset-2"
                  style={{ color: colors.primary }}
                >
                  Kirim ulang
                </button>
              </p>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-6">
                <h2
                  className="text-xl font-bold"
                  style={{ color: textPrimary }}
                >
                  Lupa Password?
                </h2>
                <p
                  className="text-sm mt-1.5 leading-relaxed"
                  style={{ color: textSecondary }}
                >
                  Masukkan email akunmu, kami akan mengirim link untuk membuat
                  password baru.
                </p>
              </div>

              {/* Error banner */}
              {pageState === "error" && errorMsg && (
                <div
                  className="flex items-start gap-2.5 rounded-xl p-3.5 mb-5 border"
                  style={{
                    backgroundColor: "#fef2f2",
                    borderColor: "#fecaca",
                  }}
                >
                  <AlertCircle
                    size={16}
                    className="shrink-0 mt-0.5 text-red-500"
                  />
                  <p className="text-xs text-red-600 leading-relaxed">
                    {errorMsg}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="space-y-5">
                  {/* ── Email ── */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: textPrimary }}
                    >
                      Alamat Email{" "}
                      <span style={{ color: colors.primary }}>*</span>
                    </label>
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: textSecondary }}
                      />
                      <input
                        {...register("email")}
                        id="email"
                        type="email"
                        placeholder="contoh@email.com"
                        autoComplete="email"
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:border-transparent"
                        style={{
                          backgroundColor: inputBg,
                          borderColor: errors.email ? "#ef4444" : inputBorder,
                          color: inputText,
                        }}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs mt-1.5 text-red-500">
                        {errors.email.message}
                      </p>
                    )}
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
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        Kirim Link Reset
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Kembali ke login ── */}
          <div
            className="mt-6 pt-5"
            style={{ borderTop: `1px solid ${inputBorder}` }}
          >
            <Link
              href="/autentikasi/login"
              className="flex items-center justify-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ color: textSecondary }}
            >
              <ArrowLeft size={15} />
              Kembali ke halaman Login
            </Link>
          </div>
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
