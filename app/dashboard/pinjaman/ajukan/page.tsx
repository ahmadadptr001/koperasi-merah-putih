"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Send } from "lucide-react";
import { useColors } from "@/hooks/useColors";
import Link from "next/link";
import { color } from "chart.js/helpers";
import Swal from "sweetalert2";

// Schema validasi menggunakan Zod
const loanApplicationSchema = z.object({
  amount: z
    .number()
    .min(1000000, "Minimal pinjaman Rp 1.000.000")
    .max(50000000, "Maksimal pinjaman Rp 50.000.000"),
  tenor: z
    .number()
    .min(3, "Minimal tenor 3 bulan")
    .max(24, "Maksimal tenor 24 bulan"),
  purpose: z.string().min(10, "Jelaskan tujuan pinjaman minimal 10 karakter"),
  collateral: z.string().optional(),
});

type LoanApplicationForm = z.infer<typeof loanApplicationSchema>;

export default function HalamanAjukanPinjaman() {
  const colors = useColors();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LoanApplicationForm>({
    resolver: zodResolver(loanApplicationSchema),
  });

  const onSubmit = async (data: LoanApplicationForm) => {
    // Konfirmasi sebelum mengajukan pinjaman
    const result = await Swal.fire({
      title: "Ajukan Pinjaman?",
      text: "Apakah Anda yakin ingin mengajukan pinjaman dengan data yang telah diisi?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Ajukan!",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      // Simulasi submit (dalam implementasi nyata, kirim ke API)
      console.log("Data pengajuan pinjaman:", data);
      
      // Tampilkan sukses dengan SweetAlert2
      await Swal.fire({
        title: "Berhasil!",
        text: "Pengajuan pinjaman berhasil dikirim! Menunggu persetujuan.",
        icon: "success",
        confirmButtonText: "OK"
      });
      
      reset();
    }
  };

  return (
    <div
      className="min-h-screen p-8"
      style={{ backgroundColor: colors.background }}
    >
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/pinjaman"
          className="p-2 rounded-lg hover:bg-white transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.textPrimary }}
          >
            Ajukan Pinjaman Baru
          </h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Isi formulir di bawah untuk mengajukan pinjaman.
          </p>
        </div>
      </div>

      {/* FORM CARD */}
      <div
        className="max-w-2xl mx-auto rounded-xl border shadow-sm p-8"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* JUMLAH PINJAMAN */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: colors.textSecondary }}
            >
              Jumlah Pinjaman (Rp)
            </label>
            <input
              type="number"
              {...register("amount", { valueAsNumber: true })}
              style={{ color: colors.textPrimary, borderColor: colors.border }}
              className="w-full px-4 py-3 border  rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Masukkan jumlah pinjaman"
            />
            {errors.amount && (
              <p className="text-red-500 text-sm mt-1">
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* TENOR */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: colors.textSecondary }}
            >
              Tenor (Bulan)
            </label>
            <select
              {...register("tenor", { valueAsNumber: true })}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              style={{ borderColor: colors.border, color: colors.textPrimary }}
            >
              <option className="text-black" value="">
                Pilih tenor
              </option>
              <option className="text-black" value={3}>
                3 Bulan
              </option>
              <option className="text-black" value={6}>
                6 Bulan
              </option>
              <option className="text-black" value={12}>
                12 Bulan
              </option>
              <option className="text-black" value={18}>
                18 Bulan
              </option>
              <option className="text-black" value={24}>
                24 Bulan
              </option>
            </select>
            {errors.tenor && (
              <p className="text-red-500 text-sm mt-1">
                {errors.tenor.message}
              </p>
            )}
          </div>

          {/* TUJUAN PINJAMAN */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: colors.textSecondary }}
            >
              Tujuan Pinjaman
            </label>
            <textarea
              {...register("purpose")}
              rows={4}
              style={{ color: colors.textPrimary, borderColor: colors.border }}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              placeholder="Jelaskan tujuan penggunaan pinjaman..."
            />
            {errors.purpose && (
              <p className="text-red-500 text-sm mt-1">
                {errors.purpose.message}
              </p>
            )}
          </div>

          {/* JAMINAN (OPSIONAL) */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: colors.textSecondary }}
            >
              Jaminan (Opsional)
            </label>
            <input
              type="text"
              {...register("collateral")}
              style={{ color: colors.textPrimary, borderColor: colors.border }}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Jenis jaminan yang disediakan"
            />
            {errors.collateral && (
              <p className="text-red-500 text-sm mt-1">
                {errors.collateral.message}
              </p>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: colors.primary }}
          >
            <Send size={18} />
            {isSubmitting ? "Mengirim..." : "Ajukan Pinjaman"}
          </button>
        </form>
      </div>
    </div>
  );
}
