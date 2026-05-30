"use client";

// app/dashboard/simpanan/[id]/print/page.tsx
// Fetch data real dari API, auto-print saat data siap, lalu kembali.

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { Loader2, XCircle } from "lucide-react";
import type { SavingsTransaction, SavingsAccount, Member } from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  pokok: "Simpanan Pokok",
  wajib: "Simpanan Wajib",
  sukarela: "Simpanan Sukarela",
};

// ─── Print Content ────────────────────────────────────────────────────────────

function PrintContent({
  transaction,
  account,
  printRef,
}: {
  transaction: SavingsTransaction;
  account: SavingsAccount | null;
  printRef: React.RefObject<HTMLDivElement | null>;
}) {
  const isSetoran = transaction.transaction_type === "setoran";
  const printDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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
          BUKTI {isSetoran ? "SETORAN" : "PENARIKAN"} SIMPANAN
        </p>
        <p style={{ color: "#777", fontSize: "10px", marginTop: "4px" }}>
          No. Ref:{" "}
          {transaction.reference_number ??
            transaction.id.slice(0, 12).toUpperCase()}
        </p>
      </div>

      {/* Nominal besar */}
      <div
        style={{
          background: isSetoran ? "#f0fdf4" : "#fff1f2",
          border: `1px solid ${isSetoran ? "#bbf7d0" : "#fecaca"}`,
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "16px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: isSetoran ? "#15803d" : "#b91c1c",
            fontWeight: "700",
            fontSize: "10px",
            margin: "0 0 4px",
          }}
        >
          JUMLAH {isSetoran ? "SETORAN" : "PENARIKAN"}
        </p>
        <p
          style={{
            fontWeight: "900",
            fontSize: "22px",
            color: isSetoran ? "#14532d" : "#7f1d1d",
            margin: 0,
          }}
        >
          {fmtCurrency(transaction.amount)}
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
            ["Jenis Transaksi", isSetoran ? "Setoran" : "Penarikan"],
            ["Tanggal Transaksi", fmtDate(transaction.transaction_date)],
            account
              ? [
                  "Jenis Simpanan",
                  ACCOUNT_TYPE_LABEL[account.account_type] ??
                    account.account_type,
                ]
              : null,
            account ? ["No. Rekening", account.account_number] : null,
            ["Saldo Sebelum", fmtCurrency(transaction.balance_before)],
            ["Saldo Sesudah", fmtCurrency(transaction.balance_after)],
            transaction.description
              ? ["Keterangan", transaction.description]
              : null,
            ["Dicatat Pada", fmtDateTime(transaction.created_at)],
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

      {/* Perubahan saldo */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "24px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: "9px",
              color: "#888",
              margin: "0 0 3px",
              fontWeight: "700",
            }}
          >
            SALDO SEBELUM
          </p>
          <p style={{ fontWeight: "800", margin: 0 }}>
            {fmtCurrency(transaction.balance_before)}
          </p>
        </div>
        <div style={{ fontSize: "18px", color: "#ccc" }}>→</div>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: "9px",
              color: "#888",
              margin: "0 0 3px",
              fontWeight: "700",
            }}
          >
            SALDO SESUDAH
          </p>
          <p
            style={{
              fontWeight: "800",
              margin: 0,
              color: isSetoran ? "#15803d" : "#b91c1c",
            }}
          >
            {fmtCurrency(transaction.balance_after)}
          </p>
        </div>
      </div>

      {/* Tanda tangan */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "16px",
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
            Tanda Tangan
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
          Bukti ini sah sebagai tanda terima transaksi simpanan.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SimpananPrintPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const printRef = useRef<HTMLDivElement>(null);
  const [transaction, setTransaction] = useState<SavingsTransaction | null>(
    null,
  );
  const [account, setAccount] = useState<SavingsAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasPrinted = useRef(false);

  // Setup react-to-print
  const handlePrint = useReactToPrint({ contentRef: printRef });

  // Fetch data
  useEffect(() => {
    if (!id) return;

    fetch(`/api/savings-transactions/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || json.error)
          throw new Error(json.error ?? "Data tidak ditemukan");
        return json.data as SavingsTransaction;
      })
      .then(async (trx) => {
        setTransaction(trx);
        if (trx.savings_account_id) {
          const accRes = await fetch(
            `/api/savings-acoounts/${trx.savings_account_id}`,
          );
          const accJson = await accRes.json();
          if (accRes.ok && !accJson.error) setAccount(accJson.data);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-print saat data siap
  useEffect(() => {
    if (!transaction || hasPrinted.current || loading) return;
    hasPrinted.current = true;

    // Delay sedikit untuk memastikan DOM ter-render
    const timeout = setTimeout(() => {
      handlePrint();
      // Kembali ke halaman detail setelah print dialog muncul
      setTimeout(() => router.back(), 800);
    }, 300);

    return () => clearTimeout(timeout);
  }, [transaction, loading, handlePrint, router]);

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
  if (error || !transaction) {
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
      {/* Loading overlay */}
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <Loader2 size={36} className="animate-spin text-red-600" />
        <p className="text-sm font-semibold text-gray-600">
          Membuka dialog cetak...
        </p>
        <button
          onClick={() => {
            handlePrint();
            setTimeout(() => router.back(), 500);
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

      {/* Print content — offscreen */}
      <div style={{ position: "fixed", top: "-9999px", left: "-9999px" }}>
        <PrintContent
          transaction={transaction}
          account={account}
          printRef={printRef}
        />
      </div>
    </>
  );
}
