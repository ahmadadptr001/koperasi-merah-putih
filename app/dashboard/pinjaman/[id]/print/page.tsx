"use client";

// app/dashboard/pinjaman/[id]/print/page.tsx

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { Loader2, XCircle } from "lucide-react";
import type { Loan, Member } from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// ─── Print Content ────────────────────────────────────────────────────────────

function PrintContent({
  loan,
  member,
  printRef,
}: {
  loan: Loan;
  member: Member | null;
  printRef: React.RefObject<HTMLDivElement | null>;
}) {
  const printDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const borrowerName = member?.full_name || loan.requested_by || "—";

  return (
    <div
      ref={printRef}
      className="bg-white text-gray-900"
      style={{
        width: "148mm",
        minHeight: "210mm",
        padding: "12mm",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontSize: "11px",
        lineHeight: "1.5",
      }}
    >
      {/* Kop surat */}
      <div
        style={{
          borderBottom: "2px solid #111",
          paddingBottom: "10px",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src="/logo-kabupaten-konawe.png"
            alt="Logo"
            style={{ width: "48px", height: "48px", objectFit: "contain" }}
          />
          <div>
            <p style={{ fontWeight: "900", fontSize: "14px", margin: 0 }}>
              KOPERASI MERAH PUTIH
            </p>
            <p style={{ color: "#555", margin: "2px 0 0" }}>
              Desa Tani Indah · Kab. Konawe · Sulawesi Tenggara
            </p>
          </div>
        </div>
      </div>

      {/* Judul */}
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <p
          style={{
            fontWeight: "900",
            fontSize: "13px",
            textTransform: "uppercase",
            letterSpacing: "2px",
            margin: 0,
          }}
        >
          BUKTI PINJAMAN
        </p>
        <p style={{ color: "#777", fontSize: "10px", marginTop: "4px" }}>
          No. Pinjaman: {loan.loan_number}
        </p>
      </div>

      {/* Nominal besar */}
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "16px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "#15803d",
            fontWeight: "700",
            fontSize: "10px",
            margin: "0 0 4px",
          }}
        >
          JUMLAH PINJAMAN
        </p>
        <p
          style={{
            fontWeight: "900",
            fontSize: "22px",
            color: "#14532d",
            margin: 0,
          }}
        >
          {fmtCurrency(loan.amount)}
        </p>
      </div>

      {/* Tabel detail */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "16px",
        }}
      >
        <tbody>
          {[
            ["Nama Pemohon", borrowerName],
            ["Jumlah Pinjaman", fmtCurrency(loan.amount)],
            ["Bunga / Bulan", `${loan.interest_rate}%`],
            ["Tenor", `${loan.term_months} Bulan`],
            ["Cicilan / Bulan", fmtCurrency(loan.monthly_payment)],
            ["Total Pembayaran", fmtCurrency(loan.total_payment)],
            ["Status", loan.status],
            ["Tanggal Pengajuan", fmtDate(loan.applied_date)],
            loan.approved_date
              ? ["Tanggal Disetujui", fmtDate(loan.approved_date)]
              : null,
            loan.disbursement_date
              ? ["Tanggal Cair", fmtDate(loan.disbursement_date)]
              : null,
            loan.due_date
              ? ["Jatuh Tempo Akhir", fmtDate(loan.due_date)]
              : null,
            loan.purpose ? ["Tujuan Pinjaman", loan.purpose] : null,
          ]
            .filter(Boolean)
            .map(([label, value]: any, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "6px 8px", color: "#555", width: "45%" }}>
                  {label}
                </td>
                <td style={{ padding: "6px 8px", fontWeight: "600" }}>
                  {value}
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {/* Tanda tangan */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "32px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 48px", fontSize: "10px" }}>Nasabah,</p>
          <div
            style={{
              borderBottom: "1px solid #333",
              width: "120px",
              margin: "0 auto 4px",
            }}
          />
          <p style={{ margin: 0, fontSize: "10px", color: "#555" }}>
            {borrowerName}
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 48px", fontSize: "10px" }}>Petugas,</p>
          <div
            style={{
              borderBottom: "1px solid #333",
              width: "120px",
              margin: "0 auto 4px",
            }}
          />
          <p style={{ margin: 0, fontSize: "10px", color: "#555" }}>
            Tanda Tangan
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "20px",
          paddingTop: "10px",
          borderTop: "1px solid #e5e7eb",
          textAlign: "center",
          color: "#999",
          fontSize: "9px",
        }}
      >
        <p style={{ margin: 0 }}>Dicetak pada {printDate}</p>
        <p style={{ margin: "2px 0 0" }}>
          Bukti ini sah sebagai tanda terima transaksi pinjaman.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PinjamanPrintPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const printRef = useRef<HTMLDivElement>(null);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasPrinted = useRef(false);

  // Setup react-to-print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => {
      setTimeout(() => router.back(), 300);
    },
  });

  // 1. Fetch data pinjaman
  useEffect(() => {
    if (!id) return;

    fetch(`/api/loans/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || json.error)
          throw new Error(json.error ?? "Data pinjaman tidak ditemukan");
        return json.data as Loan;
      })
      .then((data) => {
        setLoan(data);
        // 2. Setelah pinjaman didapat, fetch data anggota (member)
        if (data.member_id) {
          return fetch(`/api/members/${data.member_id}`)
            .then(async (memberRes) => {
              const memberJson = await memberRes.json();
              if (!memberRes.ok || memberJson.error) {
                // Jika anggota tidak ditemukan, tidak masalah, kita tetap bisa print dengan requested_by
                console.warn("Anggota tidak ditemukan:", memberJson.error);
                return null;
              }
              return memberJson.data as Member;
            })
            .then((memberData) => {
              setMember(memberData);
            });
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-print saat data siap
  useEffect(() => {
    if (!loan || hasPrinted.current || loading) return;
    hasPrinted.current = true;

    const timeout = setTimeout(() => {
      handlePrint();
    }, 300);

    return () => clearTimeout(timeout);
  }, [loan, loading, handlePrint]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <Loader2 size={36} className="animate-spin text-red-600" />
        <p className="text-sm font-semibold text-gray-600">
          Menyiapkan dokumen cetak...
        </p>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error || !loan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <XCircle size={36} className="text-red-500" />
        <p className="text-sm font-semibold text-gray-600">
          {error ?? "Transaksi tidak ditemukan"}
        </p>
        <button
          onClick={() => router.back()}
          className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          Kembali
        </button>
      </div>
    );
  }

  // ─── Render (tersembunyi, hanya untuk print) ──────────────────────────────
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <button
          onClick={() => {
            handlePrint();
          }}
          className="mt-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          Cetak Sekarang
        </button>
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:underline"
        >
          Batal, kembali
        </button>
      </div>

      <div style={{ position: "fixed", top: "-9999px", left: "-9999px" }}>
        <PrintContent loan={loan} member={member} printRef={printRef} />
      </div>
    </>
  );
}
