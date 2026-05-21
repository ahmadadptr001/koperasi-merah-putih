"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Cpu, Send } from "lucide-react";
import { useColors } from "@/hooks/useColors";
import Link from "next/link";
import { color } from "chart.js/helpers";
import Swal from "sweetalert2";

// Schema validasi menggunakan Zod
const savingsDepositSchema = z.object({
  type: z.enum(["pokok", "wajib", "sukarela"], {
    message: "Pilih jenis simpanan",
  }),
  amount: z
    .number()
    .min(10000, "Minimal setor Rp 500.000")
    .max(10000000, "Maksimal setor Rp 10.000.000"),
  notes: z.string().optional(),
});

type SavingsDepositForm = z.infer<typeof savingsDepositSchema>;

export default function HalamanSetorSimpanan() {
  const colors = useColors();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SavingsDepositForm>({
    resolver: zodResolver(savingsDepositSchema),
  });

  const selectedType = watch("type");

  const onSubmit = async (data: SavingsDepositForm) => {
    // Simulasi submit (dalam implementasi nyata, kirim ke API)
    console.log("Data setor simpanan:", data);
    await Swal.fire({
      title: "Berhasil!",
      text: "Setoran simpanan berhasil diproses!",
      icon: "success",
      confirmButtonText: "OK"
    });
    reset();
  };

  const getMinAmount = (type: string) => {
    switch (type) {
      case "pokok":
        return 500000; // Contoh minimal simpanan pokok
      case "wajib":
        return 50000; // Contoh simpanan wajib bulanan
      case "sukarela":
        return 10000; // Minimal sukarela
      default:
        return 10000;
    }
  };

  const getMaxAmount = (type: string) => {
    switch (type) {
      case "pokok":
        return 1000000; // Maksimal simpanan pokok
      case "wajib":
        return 100000; // Maksimal wajib
      case "sukarela":
        return 10000000; // Maksimal sukarela
      default:
        return 10000000;
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
          href="/dashboard/simpanan"
          className="p-2 rounded-lg hover:bg-white transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.textPrimary }}
          >
            Setor Simpanan
          </h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Tambahkan saldo simpanan Anda.
          </p>
        </div>
      </div>

      {/* FORM CARD */}
      <div
        className="max-w-2xl mx-auto rounded-xl border shadow-sm p-8"
        style={{
          borderColor: colors.border,
          background: colors.surface,
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* JENIS SIMPANAN */}
          <div>
            <label
              style={{ color: colors.textSecondary }}
              className="block text-sm font-medium mb-2"
            >
              Jenis Simpanan
            </label>
            <select
              {...register("type")}
              style={{ borderColor: colors.border, color: colors.textPrimary }}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option style={{ color: "black" }} value="">
                Pilih jenis simpanan
              </option>
              <option style={{ color: "black" }} value="pokok">
                Simpanan Pokok
              </option>
              <option style={{ color: "black" }} value="wajib">
                Simpanan Wajib
              </option>
              <option style={{ color: "black" }} value="sukarela">
                Simpanan Sukarela
              </option>
            </select>
            {errors.type && (
              <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
            )}
          </div>

          {/* JUMLAH SETORAN */}
          <div>
            <label
              style={{ color: colors.textSecondary }}
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Jumlah Setoran (Rp)
            </label>
            <input
              type="number"
              style={{ color: colors.textPrimary, borderColor: colors.border }}
              {...register("amount", { valueAsNumber: true })}
              className="w-full px-4 py-3 border  rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Masukkan jumlah setoran"
              min={selectedType ? getMinAmount(selectedType) : 10000}
              max={selectedType ? getMaxAmount(selectedType) : 10000000}
            />
            {selectedType && (
              <p className="text-xs text-slate-500 mt-1">
                Minimal: Rp {getMinAmount(selectedType).toLocaleString()} |
                Maksimal: Rp {getMaxAmount(selectedType).toLocaleString()}
              </p>
            )}
            {errors.amount && (
              <p className="text-red-500 text-sm mt-1">
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* CATATAN (OPSIONAL) */}
          <div>
            <label
              style={{ color: colors.textSecondary }}
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Catatan (Opsional)
            </label>
            <textarea
              {...register("notes")}
              rows={3}
              style={{ color: colors.textPrimary, borderColor: colors.border }}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              placeholder="Tambahkan catatan jika diperlukan..."
            />
            {errors.notes && (
              <p className="text-red-500 text-sm mt-1">
                {errors.notes.message}
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
            {isSubmitting ? "Memproses..." : "Setor Simpanan"}
          </button>
        </form>
      </div>
    </div>
  );
}
