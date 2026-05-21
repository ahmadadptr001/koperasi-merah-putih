"use client";

import { notFound, useRouter } from "next/navigation";
import PrintLayout from "@/components/print/PrintLayout";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MockedRequest } from "next/dist/server/lib/mock-request";
import { useReactToPrint } from "react-to-print";

type SimpananTransaction = {
  id: string;
  date: string;
  type: string;
  amount: number;
  balance: number;
  method: string;
  status: string;
  officer: string;
  note: string;
  nik: string;
  name: string;
};

// Mock data - in a real app, you would fetch this from an API or context
const mockSimpananData = {
  "SP-001": {
    id: "SP-001",
    date: "15 Apr 2026",
    type: "Setoran Pokok",
    amount: 500000,
    balance: 500000,
    method: "Transfer Bank",
    status: "Selesai",
    officer: "Admin Koperasi",
    note: "Setoran awal keanggotaan",
    nik: "7203000000000001",
    name: "Siti Aminah",
  },
  "SP-002": {
    id: "SP-002",
    date: "01 Mei 2026",
    type: "Setoran Wajib",
    amount: 50000,
    balance: 550000,
    method: "Kas Koperasi",
    status: "Selesai",
    officer: "Bendahara",
    note: "Iuran wajib bulan Mei",
    nik: "7203000000000002",
    name: "Ahmad Subagyo",
  },
  "SP-003": {
    id: "SP-003",
    date: "05 Mei 2026",
    type: "Setoran Sukarela",
    amount: 200000,
    balance: 750000,
    method: "Transfer Bank",
    status: "Selesai",
    officer: "Admin Koperasi",
    note: "Tambahan simpanan sukarela",
    nik: "7203000000000003",
    name: "Budi Santoso",
  },
  "SP-004": {
    id: "SP-004",
    date: "10 Mei 2026",
    type: "Penarikan",
    amount: -100000,
    balance: 650000,
    method: "Kas Koperasi",
    status: "Diproses",
    officer: "Menunggu persetujuan",
    note: "Penarikan sebagian simpanan sukarela",
    nik: "7203000000000001",
    name: "Siti Aminah",
  },
  // Add more as needed
};

export default function SimpananPrintPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as keyof typeof mockSimpananData;

  const elementPrintRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<SimpananTransaction | null>(
    null,
  );

  const handlePrint = useReactToPrint({ contentRef: elementPrintRef });

  let current = 0;
  useEffect(() => {
    if (current > 0) return;
    if (!transaction) return;
    handlePrint();
    current++;
    router.back();
  }, [transaction]);

  useEffect(() => {
    // Simulate data fetching
    setTimeout(() => {
      const data = mockSimpananData[id];
      if (data) {
        setTransaction(data as any);
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

  if (!transaction) {
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
      title="BUKTI SETORAN SIMPANAN"
      subtitle="Koperasi Merah Putih"
      logoSrc="/logo-kabupaten-konawe.png"
    >
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-lg font-bold">Data Nasabah</h2>
          <div className="grid gap-2 mt-2 text-sm">
            <div>NIK: {transaction.nik}</div>
            <div>Nama: {transaction.name}</div>
          </div>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-bold">Detail Transaksi</h2>
          <div className="grid gap-2 mt-2 text-sm">
            <div>ID Transaksi: {transaction.id}</div>
            <div>Tanggal: {transaction.date}</div>
            <div>Jenis Transaksi: {transaction.type}</div>
            <div>Metode: {transaction.method}</div>
            <div>
              Nominal: {transaction.amount >= 0 ? "+" : "-"}
              {formatCurrency(Math.abs(transaction.amount))}
            </div>
            <div>Saldo Akhir: {formatCurrency(transaction.balance)}</div>
            <div>Status: {transaction.status}</div>
            <div>Petugas: {transaction.officer}</div>
          </div>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-bold">Keterangan</h2>
          <p className="mt-2 text-sm">{transaction.note}</p>
        </div>

        <div className="mt-6">
          <p className="text-sm">
            Cetak ini sebagai bukti transaksi simpanan. Simpan dengan baik.
          </p>
        </div>
      </div>
    </PrintLayout>
  );
}
