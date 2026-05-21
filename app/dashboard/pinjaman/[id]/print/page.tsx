"use client";

import { notFound, useRouter } from "next/navigation";
import PrintLayout from "@/components/print/PrintLayout";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

type PinjamanTransaction = {
  id: string;
  date: string;
  amount: number;
  interest: string;
  tenor: string;
  status: string;
  due: string;
  installment: number;
  paid: number;
  remaining: number;
  purpose: string;
  nik: string;
  name: string;
};

// Mock data - in a real app, you would fetch this from an API or context
const mockPinjamanData = {
  "PJ-001": {
    id: "PJ-001",
    date: "12 Apr 2026",
    amount: 5000000,
    interest: "1%",
    tenor: "12 Bulan",
    status: "Aktif",
    due: "12 Mei 2026",
    installment: 455000,
    paid: 1580000,
    remaining: 3420000,
    purpose: "Modal usaha tani dan pembelian pupuk.",
    nik: "7203000000000001",
    name: "Siti Aminah",
  },
  "PJ-002": {
    id: "PJ-002",
    date: "05 Jan 2026",
    amount: 2000000,
    interest: "1%",
    tenor: "6 Bulan",
    status: "Lunas",
    due: "-",
    installment: 345000,
    paid: 2070000,
    remaining: 0,
    purpose: "Pembelian alat produksi rumahan.",
    nik: "7203000000000002",
    name: "Ahmad Subagyo",
  },
  // Add more as needed
};

export default function PinjamanPrintPage() {
  const router = useRouter();
  const params = useParams();
  const elementPrintRef = useRef(null);
  const id = params.id as keyof typeof mockPinjamanData;
  const [pinjaman, setPinjaman] = useState<PinjamanTransaction | null>(null);
  const [loading, setLoading] = useState(true);

  const handlePrint = useReactToPrint({ contentRef: elementPrintRef });
  
  let current = 0;
  useEffect(() => {
    if (current > 0) return;
    if (!pinjaman) return;
    handlePrint();
    current++;
    router.back();
  }, [pinjaman]);

  useEffect(() => {
    // Simulate data fetching
    setTimeout(() => {
      const data = mockPinjamanData[id];
      if (data) {
        setPinjaman(data);
      } else {
        // If not found, we'll handle with notFound() in render
      }
      setLoading(false);
    }, 100);
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[210mm] w-[148mm] items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!pinjaman) {
    notFound();
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <PrintLayout
      elementPrintRef={elementPrintRef}
      title="BUKTI PINJAMAN"
      subtitle="Koperasi Merah Putih"
      logoSrc="/logo-kabupaten-konawe.png"
    >
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-lg font-bold">Data Pemohon</h2>
          <div className="grid gap-2 mt-2 text-sm">
            <div>NIK: {pinjaman.nik}</div>
            <div>Nama: {pinjaman.name}</div>
          </div>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-bold">Detail Pinjaman</h2>
          <div className="grid gap-2 mt-2 text-sm">
            <div>ID Pinjaman: {pinjaman.id}</div>
            <div>Tanggal Pinjaman: {pinjaman.date}</div>
            <div>Jumlah Pinjaman: {formatCurrency(pinjaman.amount)}</div>
            <div>Tenor: {pinjaman.tenor}</div>
            <div>Bunga per Bulan: {pinjaman.interest}</div>
            <div>Cicilan per Bulan: {formatCurrency(pinjaman.installment)}</div>
            <div>Total Dibayar: {formatCurrency(pinjaman.paid)}</div>
            <div>Sisa Pinjaman: {formatCurrency(pinjaman.remaining)}</div>
            <div>Status: {pinjaman.status}</div>
            <div>Jatuh Tempo: {pinjaman.due}</div>
          </div>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-bold">Keterangan</h2>
          <p className="mt-2 text-sm">{pinjaman.purpose}</p>
        </div>

        <div className="mt-6">
          <p className="text-sm">
            Cetak ini sebagai bukti transaksi pinjaman. Simpan dengan baik.
          </p>
        </div>
      </div>
    </PrintLayout>
  );
}
