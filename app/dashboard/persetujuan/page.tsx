"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  BadgeCheck,
  Banknote,
  CalendarClock,
  Check,
  CircleAlert,
  Clock3,
  Eye,
  Filter,
  Landmark,
  Search,
  UserCheck,
  UserPlus,
  WalletCards,
  X,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";

const approvalStats = [
  {
    label: "Total Antrean",
    value: "18",
    trend: "Perlu diproses",
    icon: CircleAlert,
    color: "#b7102a",
  },
  {
    label: "Prioritas Tinggi",
    value: "5",
    trend: "Butuh hari ini",
    icon: Clock3,
    color: "#f59e0b",
  },
  {
    label: "Disetujui Bulan Ini",
    value: "126",
    trend: "+18 dari bulan lalu",
    icon: BadgeCheck,
    color: "#10b981",
  },
  {
    label: "Nilai Pengajuan",
    value: "Rp 326 Jt",
    trend: "Dalam peninjauan",
    icon: Banknote,
    color: "#2563eb",
  },
];

const approvals = [
  {
    id: "APR-260501",
    applicant: "Ahmad Subagyo",
    memberId: "AGT-2402",
    category: "Pinjaman",
    description: "Pengajuan Pinjaman Tani untuk pembelian bibit dan pupuk.",
    amount: 15000000,
    submittedAt: "2 jam lalu",
    date: "07 Mei 2026",
    priority: "Tinggi",
    status: "Menunggu",
    document: "Lengkap",
    icon: Landmark,
  },
  {
    id: "APR-260502",
    applicant: "Siti Aminah",
    memberId: "CAL-1042",
    category: "Anggota Baru",
    description: "Verifikasi KTP, KK, dan data awal calon anggota koperasi.",
    amount: 500000,
    submittedAt: "5 jam lalu",
    date: "07 Mei 2026",
    priority: "Sedang",
    status: "Menunggu",
    document: "Lengkap",
    icon: UserPlus,
  },
  {
    id: "APR-260503",
    applicant: "Budi Santoso",
    memberId: "AGT-2403",
    category: "Penarikan",
    description: "Penarikan simpanan sukarela untuk kebutuhan operasional usaha.",
    amount: 2500000,
    submittedAt: "1 hari lalu",
    date: "06 Mei 2026",
    priority: "Sedang",
    status: "Menunggu",
    document: "Perlu cek",
    icon: WalletCards,
  },
  {
    id: "APR-260504",
    applicant: "Nurhayati",
    memberId: "CAL-1043",
    category: "Anggota Baru",
    description: "Pendaftaran anggota baru dari Dusun Cempaka.",
    amount: 500000,
    submittedAt: "1 hari lalu",
    date: "06 Mei 2026",
    priority: "Rendah",
    status: "Menunggu",
    document: "Lengkap",
    icon: UserPlus,
  },
  {
    id: "APR-260505",
    applicant: "Dewi Lestari",
    memberId: "AGT-2406",
    category: "Pinjaman",
    description: "Pengajuan modal kerja UMKM kuliner dengan tenor 12 bulan.",
    amount: 10000000,
    submittedAt: "2 hari lalu",
    date: "05 Mei 2026",
    priority: "Tinggi",
    status: "Ditinjau",
    document: "Lengkap",
    icon: Landmark,
  },
  {
    id: "APR-260506",
    applicant: "Rahmat Hidayat",
    memberId: "AGT-2405",
    category: "Perubahan Data",
    description: "Pembaruan nomor telepon dan alamat domisili anggota.",
    amount: 0,
    submittedAt: "2 hari lalu",
    date: "05 Mei 2026",
    priority: "Rendah",
    status: "Ditinjau",
    document: "Lengkap",
    icon: UserCheck,
  },
  {
    id: "APR-260507",
    applicant: "Sri Wahyuni",
    memberId: "AGT-2411",
    category: "Penarikan",
    description: "Penarikan sebagian simpanan sukarela melalui kas koperasi.",
    amount: 4000000,
    submittedAt: "3 hari lalu",
    date: "04 Mei 2026",
    priority: "Tinggi",
    status: "Menunggu",
    document: "Perlu cek",
    icon: WalletCards,
  },
  {
    id: "APR-260508",
    applicant: "Hendra Wijaya",
    memberId: "AGT-2412",
    category: "Simpanan",
    description: "Koreksi setoran simpanan wajib periode April.",
    amount: 750000,
    submittedAt: "3 hari lalu",
    date: "04 Mei 2026",
    priority: "Sedang",
    status: "Menunggu",
    document: "Lengkap",
    icon: ArrowLeftRight,
  },
];

const statusFilters = ["Semua", "Menunggu", "Ditinjau"];
const categoryFilters = [
  "Semua Kategori",
  "Pinjaman",
  "Anggota Baru",
  "Penarikan",
  "Simpanan",
  "Perubahan Data",
];

const formatCurrency = (value: number) =>
  value === 0
    ? "-"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(value);

const getPriorityStyle = (priority: string) => {
  if (priority === "Tinggi") {
    return { background: "#fee2e2", color: "#b91c1c", border: "#fecaca" };
  }

  if (priority === "Sedang") {
    return { background: "#fef3c7", color: "#b45309", border: "#fde68a" };
  }

  return { background: "#e0f2fe", color: "#0369a1", border: "#bae6fd" };
};

const getDocumentStyle = (document: string) => {
  if (document === "Lengkap") {
    return { background: "#dcfce7", color: "#15803d", border: "#bbf7d0" };
  }

  return { background: "#fef3c7", color: "#b45309", border: "#fde68a" };
};

export default function HalamanAntreanPersetujuan() {
  const colors = useColors();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Semua");
  const [selectedCategory, setSelectedCategory] = useState("Semua Kategori");

  const filteredApprovals = useMemo(() => {
    const keyword = searchTerm.toLowerCase();

    return approvals.filter((approval) => {
      const matchesSearch =
        approval.id.toLowerCase().includes(keyword) ||
        approval.applicant.toLowerCase().includes(keyword) ||
        approval.memberId.toLowerCase().includes(keyword) ||
        approval.description.toLowerCase().includes(keyword);
      const matchesStatus =
        selectedStatus === "Semua" || approval.status === selectedStatus;
      const matchesCategory =
        selectedCategory === "Semua Kategori" ||
        approval.category === selectedCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [searchTerm, selectedCategory, selectedStatus]);

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: colors.background }}
    >
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p
            className="mb-2 text-sm font-semibold"
            style={{ color: colors.primary }}
          >
            Workflow Persetujuan
          </p>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.textPrimary }}
          >
            Antrean Persetujuan
          </h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: colors.textSecondary }}>
            Kelola pengajuan anggota, pinjaman, penarikan, dan perubahan data
            yang membutuhkan tinjauan admin koperasi.
          </p>
        </div>

        <div
          className="flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            color: colors.textSecondary,
          }}
        >
          <CalendarClock size={17} style={{ color: colors.primary }} />
          Diperbarui 5 menit lalu
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {approvalStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md"
              style={{ borderColor: colors.border, background: colors.surface }}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                    {stat.label}
                  </p>
                  <h3 className="mt-1 text-2xl font-black" style={{ color: colors.textPrimary }}>
                    {stat.value}
                  </h3>
                </div>
                <div
                  className="rounded-xl p-3"
                  style={{ backgroundColor: `${stat.color}16`, color: stat.color }}
                >
                  <Icon size={22} />
                </div>
              </div>
              <p className="text-sm font-semibold" style={{ color: stat.color }}>
                {stat.trend}
              </p>
            </div>
          );
        })}
      </div>

      <div
        className="mb-6 rounded-xl border p-4 shadow-sm"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search
              className="absolute left-3 top-3"
              size={18}
              style={{ color: colors.textSecondary }}
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Cari ID, nama pemohon, atau keterangan..."
              className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
              style={{
                borderColor: colors.border,
                background: colors.background,
                color: colors.textPrimary,
              }}
            />
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <FilterGroup
              label="Status"
              options={statusFilters}
              selected={selectedStatus}
              colors={colors}
              onSelect={setSelectedStatus}
            />
            <FilterGroup
              label="Kategori"
              options={categoryFilters}
              selected={selectedCategory}
              colors={colors}
              onSelect={setSelectedCategory}
            />
          </div>
        </div>
      </div>

      <div
        className="hidden overflow-hidden rounded-xl border shadow-sm lg:block"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead style={{ background: colors.background }}>
              <tr
                className="border-b text-[12px] font-black uppercase tracking-wider"
                style={{ borderColor: colors.border, color: colors.textSecondary }}
              >
                <th className="px-6 py-4">Pemohon</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Prioritas</th>
                <th className="px-6 py-4">Dokumen</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredApprovals.map((approval) => (
                <ApprovalTableRow
                  key={approval.id}
                  approval={approval}
                  colors={colors}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:hidden">
        {filteredApprovals.map((approval) => (
          <ApprovalCard key={approval.id} approval={approval} colors={colors} />
        ))}
      </div>

      {filteredApprovals.length === 0 && (
        <div
          className="rounded-xl border p-10 text-center shadow-sm"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <p className="font-bold" style={{ color: colors.textPrimary }}>
            Antrean tidak ditemukan
          </p>
          <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
            Coba ubah kata kunci pencarian, status, atau kategori.
          </p>
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  colors,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string;
  colors: ReturnType<typeof useColors>;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="flex items-center gap-2 text-sm font-semibold"
        style={{ color: colors.textSecondary }}
      >
        <Filter size={16} />
        {label}
      </div>
      {options.map((option) => {
        const active = selected === option;

        return (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className="rounded-lg px-3.5 py-2 text-sm font-bold transition-colors"
            style={{
              background: active ? colors.backgroundAccent : colors.background,
              border: `1px solid ${active ? colors.borderAccent : colors.border}`,
              color: active ? colors.primary : colors.textSecondary,
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function ApprovalTableRow({
  approval,
  colors,
}: {
  approval: (typeof approvals)[number];
  colors: ReturnType<typeof useColors>;
}) {
  const Icon = approval.icon;
  const priorityStyle = getPriorityStyle(approval.priority);
  const documentStyle = getDocumentStyle(approval.document);

  return (
    <tr
      className="border-b transition-colors hover:bg-black/5"
      style={{ borderColor: colors.border }}
    >
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: colors.backgroundAccent, color: colors.primary }}
          >
            <Icon size={21} />
          </div>
          <div>
            <p className="font-bold" style={{ color: colors.textPrimary }}>
              {approval.applicant}
            </p>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              {approval.id} • {approval.memberId}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <p className="font-bold" style={{ color: colors.textPrimary }}>
          {approval.category}
        </p>
        <p className="mt-1 text-xs" style={{ color: colors.textMuted }}>
          {approval.date} • {approval.submittedAt}
        </p>
      </td>
      <td className="px-6 py-5">
        <p className="max-w-sm text-sm" style={{ color: colors.textSecondary }}>
          {approval.description}
        </p>
      </td>
      <td className="px-6 py-5">
        <p className="font-black" style={{ color: colors.textPrimary }}>
          {formatCurrency(approval.amount)}
        </p>
      </td>
      <td className="px-6 py-5">
        <Badge value={approval.priority} styleConfig={priorityStyle} />
      </td>
      <td className="px-6 py-5">
        <Badge value={approval.document} styleConfig={documentStyle} />
      </td>
      <td className="px-6 py-5">
        <ActionButtons colors={colors} />
      </td>
    </tr>
  );
}

function ApprovalCard({
  approval,
  colors,
}: {
  approval: (typeof approvals)[number];
  colors: ReturnType<typeof useColors>;
}) {
  const Icon = approval.icon;
  const priorityStyle = getPriorityStyle(approval.priority);
  const documentStyle = getDocumentStyle(approval.document);

  return (
    <div
      className="rounded-xl border p-5 shadow-sm"
      style={{ borderColor: colors.border, background: colors.surface }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: colors.backgroundAccent, color: colors.primary }}
          >
            <Icon size={21} />
          </div>
          <div>
            <h3 className="font-bold" style={{ color: colors.textPrimary }}>
              {approval.applicant}
            </h3>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              {approval.id} • {approval.memberId}
            </p>
          </div>
        </div>
        <Badge value={approval.priority} styleConfig={priorityStyle} />
      </div>

      <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
        {approval.category}
      </p>
      <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
        {approval.description}
      </p>

      <div
        className="mt-5 grid grid-cols-2 gap-3 rounded-xl p-4"
        style={{ background: colors.background }}
      >
        <InfoItem label="Nominal" value={formatCurrency(approval.amount)} colors={colors} />
        <InfoItem label="Masuk" value={approval.submittedAt} colors={colors} />
        <InfoItem label="Status" value={approval.status} colors={colors} />
        <div>
          <p className="text-xs" style={{ color: colors.textMuted }}>
            Dokumen
          </p>
          <div className="mt-1">
            <Badge value={approval.document} styleConfig={documentStyle} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <ActionButtons colors={colors} mobile />
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <div>
      <p className="text-xs" style={{ color: colors.textMuted }}>
        {label}
      </p>
      <p className="mt-1 text-sm font-black" style={{ color: colors.textPrimary }}>
        {value}
      </p>
    </div>
  );
}

function Badge({
  value,
  styleConfig,
}: {
  value: string;
  styleConfig: { background: string; color: string; border: string };
}) {
  return (
    <span
      className="inline-flex rounded-full border px-3 py-1 text-xs font-black"
      style={{
        background: styleConfig.background,
        borderColor: styleConfig.border,
        color: styleConfig.color,
      }}
    >
      {value}
    </span>
  );
}

function ActionButtons({
  colors,
  mobile = false,
}: {
  colors: ReturnType<typeof useColors>;
  mobile?: boolean;
}) {
  const buttonBase = mobile
    ? "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-transform active:scale-95"
    : "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-transform hover:scale-105";

  return (
    <div className={`flex ${mobile ? "gap-2" : "justify-end gap-2"}`}>
      <button
        className={buttonBase}
        style={{
          background: colors.background,
          border: `1px solid ${colors.border}`,
          color: colors.textPrimary,
        }}
        title="Lihat detail"
      >
        <Eye size={17} />
        {mobile && "Detail"}
      </button>
      <button
        className={buttonBase}
        style={{ background: colors.success, color: "#ffffff" }}
        title="Setujui"
      >
        <Check size={17} />
        {mobile && "Setujui"}
      </button>
      <button
        className={buttonBase}
        style={{ background: colors.primary, color: "#ffffff" }}
        title="Tolak"
      >
        <X size={17} />
        {mobile && "Tolak"}
      </button>
    </div>
  );
}
