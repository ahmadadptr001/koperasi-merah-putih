"use client";

// app/autentikasi/masuk/page.tsx

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Building, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useColors } from "@/hooks/useColors";
import { supabaseBrowser, setRememberMe } from "@/lib/supabase/client";
import Swal from "sweetalert2";

const loginSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid" }),
  password: z.string().min(1, { message: "Kata sandi wajib diisi" }),
  rememberMe: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function Masuk() {
  const colors = useColors();
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onLogin = async (data: LoginValues) => {
    setIsLoading(true);
    try {
      // 0. Terapkan pilihan "Ingat saya di perangkat ini" SEBELUM login.
      //    Preferensi ini menentukan apakah cookie sesi diberi Max-Age
      //    (bertahan setelah browser ditutup) atau menjadi cookie sesi biasa.
      //    Sebelumnya nilai checkbox ini sama sekali tidak dipakai, sehingga
      //    fiturnya tidak berpengaruh apa pun.
      setRememberMe(Boolean(data.rememberMe));

      // 1. Login ke Supabase Auth
      const { error, data: authData } =
        await supabaseBrowser.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (error) {
        await Swal.fire({
          title: "Login Gagal",
          text:
            error.message === "Invalid login credentials"
              ? "Email atau kata sandi salah."
              : error.message,
          icon: "error",
          confirmButtonText: "Coba Lagi",
          confirmButtonColor: colors.primary,
        });
        return;
      }

      // 2. Ambil data user dari tabel public.users
      const { data: userData, error: userError } = await supabaseBrowser
        .from("users")
        .select("is_active")
        .eq("id", authData.user.id)
        .single();

      if (userError || !userData) {
        await Swal.fire({
          title: "Login Gagal",
          text: "Data akun tidak ditemukan. Silakan hubungi admin.",
          icon: "error",
          confirmButtonColor: colors.primary,
        });
        return;
      }

      // 3. Cek apakah user aktif
      if (!userData.is_active) {
        // Logout user
        await supabaseBrowser.auth.signOut();
        await Swal.fire({
          title: "Akun Ditangguhkan",
          text: "Akun Anda telah ditangguhkan oleh admin. Silakan hubungi admin untuk informasi lebih lanjut.",
          icon: "error",
          confirmButtonColor: colors.primary,
        });
        return;
      }

      // 4. Login berhasil. Lanjutkan ke halaman tujuan awal bila pengguna
      //    tadi diarahkan ke sini oleh proxy (?next=...).
      //    refresh() membuang Router Cache agar Server Component membaca
      //    cookie sesi yang baru, bukan versi anonim yang sudah ter-cache.
      // Dibaca dari window (bukan useSearchParams) agar halaman ini tetap
      // bisa di-prerender statis tanpa perlu Suspense boundary.
      const next = new URLSearchParams(window.location.search).get("next");
      // Hanya terima path internal dashboard — cegah open redirect.
      const target = next?.startsWith("/dashboard") ? next : "/dashboard";
      router.replace(target);
      router.refresh();
    } catch (err) {
      await Swal.fire({
        title: "Terjadi Kesalahan",
        text:
          err instanceof Error
            ? err.message
            : "Tidak dapat terhubung ke server. Silakan coba lagi.",
        icon: "error",
        confirmButtonColor: colors.primary,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Kiri: Branding */}
      <div
        className="hidden lg:flex lg:w-[40%] flex-col justify-center px-12 py-12 text-white relative overflow-hidden"
        style={{ backgroundColor: colors.primary }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6 font-bold text-xl">
            <Building size={24} />
            <span>Koperasi Merah Putih</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
            Kelola Finansial
            <br />
            Dalam Genggaman.
          </h1>
          <p className="opacity-90 text-sm md:text-base leading-relaxed max-w-sm">
            Masuk untuk mengakses layanan simpanan, pinjaman, dan pantau
            pertumbuhan ekonomi Anda secara real-time.
          </p>
        </div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Kanan: Form */}
      <div className="w-full lg:w-[60%] p-4 md:p-8 lg:p-12 flex items-center justify-center">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-red-400">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-800">
              Selamat Datang!
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Silakan masukkan kredensial Anda untuk mengakses akun.
            </p>
          </div>

          <form onSubmit={handleSubmit(onLogin)} className="space-y-6">
            {/* Email */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">
                Email
              </label>
              <input
                type="email"
                placeholder="nama@email.com"
                className={`w-full p-3 rounded-lg border outline-none transition-all text-sm ${
                  errors.email
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-100"
                }`}
                style={{ color: colors.textPrimary }}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-red-500 text-[11px] mt-1 ml-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-gray-700">
                  Kata Sandi
                </label>
                <Link
                  href="/autentikasi/lupa-password"
                  className="text-xs font-medium hover:underline"
                  style={{ color: colors.primary }}
                >
                  Lupa kata sandi?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  className={`w-full p-3 rounded-lg border outline-none transition-all text-sm ${
                    errors.password
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-100"
                  }`}
                  style={{ color: colors.textPrimary }}
                  {...register("password")}
                />
                <div className="absolute right-3 top-3">
                  {showPass ? (
                    <EyeOff
                      size={18}
                      onClick={() => setShowPass(false)}
                      className="cursor-pointer text-gray-400 hover:text-gray-600"
                    />
                  ) : (
                    <Eye
                      size={18}
                      onClick={() => setShowPass(true)}
                      className="cursor-pointer text-gray-400 hover:text-gray-600"
                    />
                  )}
                </div>
              </div>
              {errors.password && (
                <p className="text-red-500 text-[11px] mt-1 ml-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-gray-300 accent-red-600 cursor-pointer"
                {...register("rememberMe")}
              />
              <label
                htmlFor="remember"
                className="text-sm text-gray-600 cursor-pointer select-none"
              >
                Ingat saya di perangkat ini
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-lg text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-70"
              style={{
                backgroundColor: colors.primary,
                boxShadow: `0 4px 12px ${colors.primary}40`,
              }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Memproses...
                </span>
              ) : (
                <>
                  <LogIn size={18} />
                  Masuk Sekarang
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
