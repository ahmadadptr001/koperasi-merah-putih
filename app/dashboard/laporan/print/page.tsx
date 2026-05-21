import { notFound } from 'next/navigation';
import PrintLayout from '@/components/print/PrintLayout';

// We'll reuse the same data and helper functions from the laporan page for simplicity.
// In a real app, you might want to fetch this data from an API or a shared utility.

const summaryCards = [
  {
    label: "Total Pemasukan",
    value: "Rp 1,82 M",
    trend: "+12,4% dari bulan lalu",
    icon: "ArrowUpRight", // We'll use lucide icons, but for simplicity in this mock we'll just use text or import later.
    color: "#10b981",
  },
  {
    label: "Total Pengeluaran",
    value: "Rp 724 Jt",
    trend: "+4,1% operasional",
    icon: "ArrowDownRight",
    color: "#ef4444",
  },
  {
    label: "Saldo Bersih",
    value: "Rp 1,09 M",
    trend: "Margin sehat 59,9%",
    icon: "Wallet",
    color: "#2563eb",
  },
  {
    label: "Dana Cadangan",
    value: "Rp 318 Jt",
    trend: "+8,7% bertumbuh",
    icon: "PiggyBank",
    color: "#f59e0b",
  },
];

const monthlyReports = [
  { month: "Jan", income: 245, expense: 98, net: 147 },
  { month: "Feb", income: 286, expense: 112, net: 174 },
  { month: "Mar", income: 318, expense: 124, net: 194 },
  { month: "Apr", income: 301, expense: 141, net: 160 },
  { month: "Mei", income: 356, expense: 132, net: 224 },
  { month: "Jun", income: 418, expense: 117, net: 301 },
];

const categoryReports = [
  { label: "Simpanan Pokok", value: 34, amount: "Rp 410 Jt", color: "#b7102a" },
  { label: "Simpanan Wajib", value: 28, amount: "Rp 338 Jt", color: "#2563eb" },
  { label: "Simpanan Sukarela", value: 22, amount: "Rp 265 Jt", color: "#10b981" },
  { label: "Jasa Pinjaman", value: 16, amount: "Rp 193 Jt", color: "#f59e0b" },
];

const transactionReports = [
  {
    id: "LKP-260601",
    date: "01 Jun 2026",
    category: "Simpanan Wajib",
    description: "Setoran wajib anggota periode Juni",
    type: "Pemasukan",
    amount: 128500000,
    status: "Terverifikasi",
  },
  {
    id: "LKP-260602",
    date: "03 Jun 2026",
    category: "Pencairan Pinjaman",
    description: "Pencairan pinjaman produktif UMKM",
    type: "Pengeluaran",
    amount: 85000000,
    status: "Terverifikasi",
  },
  {
    id: "LKP-260603",
    date: "05 Jun 2026",
    category: "Jasa Pinjaman",
    description: "Pendapatan jasa pinjaman aktif",
    type: "Pemasukan",
    amount: 47500000,
    status: "Terverifikasi",
  },
  {
    id: "LKP-260604",
    date: "08 Jun 2026",
    category: "Operasional",
    description: "Biaya administrasi dan operasional kantor",
    type: "Pengeluaran",
    amount: 18500000,
    status: "Menunggu",
  },
  {
    id: "LKP-260605",
    date: "12 Jun 2026",
    category: "Simpanan Sukarela",
    description: "Akumulasi setoran sukarela anggota",
    type: "Pemasukan",
    amount: 72250000,
    status: "Terverifikasi",
  },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const getStatusStyle = (status: string) => {
  if (status === "Terverifikasi") {
    return {
      background: "#dcfce7",
      color: "#15803d",
      border: "#bbf7d0",
    };
  }

  return {
    background: "#fef3c7",
    color: "#b45309",
    border: "#fde68a",
  };
};

// Mock data for the print page - we are not using any parameters for now.
// In the future, we could pass filters via URL or state, but for simplicity we show the full report.

export default function LaporanPrintPage() {
  // We are not loading any dynamic data, so we can just render.
  // But to simulate loading, we can use a small timeout.
  // Since we don't use hooks, we can just render directly.

  return (
    <PrintLayout
      title="LAPORAN KEUANGAN"
      subtitle="Koperasi Merah Putih"
      logoSrc="/konawe-logo.png"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="border p-4 rounded-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <h3 className="mt-1 text-2xl font-bold text-gray-900">{card.value}</h3>
                </div>
                <div className="rounded-lg p-2" style={{ backgroundColor: `${card.color}20` }}>
                  {/* We are not using the icon in this mock for simplicity, but you can add it if you import the icons */}
                  {/* <Icon size={22} /> -->*/
                </div>
              </div>
              <p className="text-sm font-semibold" style={{ color: card.color }}>
                {card.trend}
              </p>
            </div>
          ))}
        </div>

        {/* Monthly Reports (as a simple table) */}
        <div className="border-t pt-4">
          <h2 className="text-lg font-bold mb-2">Laporan Bulanan</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b font-bold text-gray-600">
                  <th className="px-4 py-2">Bulan</th>
                  <th className="px-4 py-2">Pemasukan</th>
                  <th className="px-4 py-2">Pengeluaran</th>
                  <th className="px-4 py-2">Netto</th>
                </tr>
              </thead>
              <tbody>
                {monthlyReports.map((item) => (
                  <tr key={item.month} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{item.month}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.income)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.expense)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Reports */}
        <div className="border-t pt-4">
          <h2 className="text-lg font-bold mb-2">Komposisi Pemasukan</h2>
          <div className="space-y-2">
            {categoryReports.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                  <p className="text-sm font-bold text-gray-900">{item.label}</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{item.amount}</p>
                <div className="h-2 w-24 rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.value}%`, background: item.color }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Table */}
        <div className="border-t pt-4">
          <h2 className="text-lg font-bold mb-2">Ringkasan Transaksi</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b font-bold text-gray-600">
                  <th className="px-4 py-2">ID / Tanggal</th>
                  <th className="px-4 py-2">Kategori</th>
                  <th className="px-4 py-2">Keterangan</th>
                  <th className="px-4 py-2">Jenis</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {transactionReports.map((item) => {
                  const statusStyle = getStatusStyle(item.status);
                  const isIncome = item.type === "Pemasukan";

                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <p className="font-bold text-gray-900">{item.id}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.date}</p>
                      </td>
                      <td className="px-4 py-2">
                        <p className="flex items-center gap-1 text-sm font-bold text-gray-600">
                          {/* <ReceiptText size={13} /> -->} {item.category}
                        </p>
                      </td>
                      <td className="px-4 py-2">
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
                          style={{
                            background: isIncome ? "#dcfce7" : "#fee2e2",
                            color: isIncome ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {isIncome ? "↑" : "↓"} {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className="inline-flex rounded-full border px-2 py-0.5 text-xs font-bold"
                          style={{
                            background: statusStyle.background,
                            borderColor: statusStyle.border,
                            color: statusStyle.color,
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <p className="font-bold" style={{ color: isIncome ? "#15803d" : "#b91c1c" }}>
                          {isIncome ? "+" : "-"} {formatCurrency(item.amount)}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-500">
            Cetak ini sebagai laporan keuangan lengkap. Simpan dengan baik.
          </p>
        </div>
      </div>
    </PrintLayout>
  );
}