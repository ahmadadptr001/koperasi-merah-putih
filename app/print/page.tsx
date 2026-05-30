"use client";

// app/print/page.tsx
// CATATAN: Halaman ini butuh "use client" karena pakai useColors (hook React)
// dan window.print()

import Link from "next/link";
import { Users, Wallet, ClipboardList, Landmark, Printer } from "lucide-react";
import { useColors } from "@/hooks/useColors";

export default function PrintPage() {
  const colors = useColors();

  const colorIncome = colors.success;
  const colorExpense = colors.primary;
  const colorNeutral = colors.info;

  const stats = [
    {
      title: "Kekayaan Koperasi",
      val: "Rp 12.4 M",
      trend: "+4.2%",
      icon: Landmark,
      color: colorIncome,
      showFromLastMonth: true,
    },
    {
      title: "Total Anggota",
      val: "1.248",
      trend: "+12",
      icon: Users,
      color: colorNeutral,
      showFromLastMonth: true,
    },
    {
      title: "Pinjaman Cair",
      val: "Rp 4.2 M",
      trend: "342 orang",
      icon: Wallet,
      color: "#f59e0b",
      showFromLastMonth: false,
    },
    {
      title: "Tugas Tertunda",
      val: "18",
      trend: "Perlu proses",
      icon: ClipboardList,
      color: colorExpense,
      showFromLastMonth: false,
    },
  ];

  return (
    <div
      style={{
        background: colors.background,
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: colors.textPrimary,
      }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1
          style={{
            color: colors.textPrimary,
            fontSize: "2.5rem",
            fontWeight: "bold",
            marginBottom: "1rem",
          }}
        >
          Laporan Koperasi
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: "1.125rem" }}>
          Cetak laporan ini untuk dokumentasi atau pertemuan
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((card, i) => (
          <div
            key={i}
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
            className="shadow-sm"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p
                  style={{
                    color: colors.textSecondary,
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    marginBottom: "0.25rem",
                  }}
                >
                  {card.title}
                </p>
                <h2
                  style={{
                    color: colors.textPrimary,
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                  }}
                >
                  {card.val}
                </h2>
              </div>
              <div
                style={{
                  backgroundColor: `${card.color}20`,
                  color: card.color,
                  width: "2.5rem",
                  height: "2.5rem",
                  borderRadius: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <card.icon size={20} />
              </div>
            </div>
            <p
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: "600",
              }}
            >
              <span
                style={{
                  backgroundColor: `${card.color}20`,
                  color: card.color,
                  padding: "0.25rem 0.5rem",
                  borderRadius: "0.25rem",
                }}
              >
                {card.trend}
              </span>
              {card.showFromLastMonth && (
                <span
                  style={{
                    color: colors.textSecondary,
                    fontSize: "0.75rem",
                  }}
                >
                  dari bulan lalu
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Catatan */}
      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: "0.5rem",
          padding: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <h2
          style={{
            color: colors.textPrimary,
            fontSize: "1.25rem",
            fontWeight: "bold",
            marginBottom: "1rem",
          }}
        >
          Catatan Laporan
        </h2>
        <p style={{ color: colors.textSecondary, lineHeight: "1.6" }}>
          Laporan ini mencakup informasi terkini tentang kekayaan koperasi,
          jumlah anggota, pinjaman yang masih dalam proses cair, dan jumlah
          tugas yang masih menunggu persetujuan. Data diperbarui secara
          real-time dari sistem koperasi.
        </p>
      </div>

      {/* Tombol Aksi */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 no-print">
        <button
          onClick={() => window.print()}
          style={{
            background: colors.backgroundAccent,
            border: `1px solid ${colors.borderAccent}`,
            color: colors.primary,
            borderRadius: "0.5rem",
            padding: "0.75rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Printer size={20} />
          Cetak Laporan
        </button>

        <Link
          href="/dashboard"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            color: colors.textPrimary,
            borderRadius: "0.5rem",
            padding: "0.75rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
          }}
        >
          Kembali ke Dashboard
        </Link>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          * { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
