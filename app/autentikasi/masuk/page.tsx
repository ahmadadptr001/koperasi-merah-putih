"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Eye,
  EyeOff,
  Building,
  LogIn,
  ArrowRight,
  Network, // Mewakili Google
} from "lucide-react";
// Pastikan path ini sesuai dengan project kamu
import Link from "next/link";
import { useColors } from "@/hooks/useColors";
import Swal from "sweetalert2";

// --- SCHEMA VALIDASI LOGIN ---
const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, { message: "Email atau Username minimal 3 karakter" }),
  password: z.string().min(1, { message: "Kata sandi wajib diisi" }),
  rememberMe: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function Masuk() {
  const colors = useColors();
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      rememberMe: false,
    },
  });

  const onLogin = async (data: LoginValues) => {
    setIsLoading(true);
    console.log("Proses Login:", data);

    // Simulasi delay API
    setTimeout(() => {
      setIsLoading(false);
      Swal.fire({
        title: "Selamat Datang Kembali!",
        text: "Anda berhasil masuk ke sistem.",
        icon: "success",
        confirmButtonText: "OK",
      });
    }, 2000);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* KIRI: Branding (Sama dengan Halaman Daftar untuk konsistensi) */}
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

        {/* Dekorasi Aksesoris (Opsional) */}
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* KANAN: Form Area */}
      <div className="w-full lg:w-[60%] p-4 md:p-8 lg:p-12 flex items-center justify-center">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-red-400">
          {/* HEADER JUDUL */}
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-800">
              Selamat Datang!
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Silakan masukkan kredensial Anda untuk mengakses akun.
            </p>
          </div>

          <form onSubmit={handleSubmit(onLogin)} className="space-y-6">
            <InputGroup
              label="Email atau Username"
              type="text"
              placeholder="Masukkan email atau username"
              error={errors.identifier?.message}
              {...register("identifier")}
            />

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-gray-700">
                  Kata Sandi
                </label>
                <Link
                  href="/lupa-password"
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
                  className={`w-full p-3 rounded-lg border outline-none transition-all text-sm ${errors.password ? "border-red-400 bg-red-50 focus:border-red-500" : "border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-100"}`}
                  style={{ color: colors.textPrimary }}
                  {...register("password")}
                />
                <div className="absolute right-3 top-3">
                  {showPass ? (
                    <EyeOff
                      size={18}
                      onClick={() => setShowPass(!showPass)}
                      className="cursor-pointer text-gray-400 hover:text-gray-600"
                    />
                  ) : (
                    <Eye
                      size={18}
                      onClick={() => setShowPass(!showPass)}
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Memproses...
                </span>
              ) : (
                <>Masuk Sekarang</>
              )}
            </button>
          </form>

          {/* FOOTER NAVIGASI */}
          <p className="text-center text-sm text-gray-500 mt-10">
            Belum punya akun?{" "}
            <Link
              href="/autentikasi/daftar"
              className="font-bold hover:underline"
              style={{ color: colors.primary }}
            >
              Daftar Jadi Anggota
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// --- SUB-KOMPONEN BANTUAN (REUSABLE) ---

interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightIcon?: React.ReactNode;
}

const InputGroup = React.forwardRef<HTMLInputElement, InputGroupProps>(
  ({ label, error, rightIcon, ...props }, ref) => {
    const colors = useColors();

    return (
      <div className="space-y-1">
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            className={`w-full p-3 rounded-lg border outline-none transition-all text-sm ${error ? "border-red-400 bg-red-50 focus:border-red-500" : "border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-100"}`}
            style={{ color: colors.textPrimary }}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-3">{rightIcon}</div>
          )}
        </div>
        {error && <p className="text-red-500 text-[11px] mt-1 ml-1">{error}</p>}
      </div>
    );
  },
);
InputGroup.displayName = "InputGroup";
