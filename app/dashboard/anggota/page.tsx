"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  CreditCard,
  Download,
  Eye,
  Filter,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";

const memberStats = [
  {
    label: "Total Anggota",
    value: "1.248",
    trend: "+32 bulan ini",
    icon: Users,
    color: "#2563eb",
  },
  {
    label: "Anggota Aktif",
    value: "1.126",
    trend: "90,2% aktif",
    icon: BadgeCheck,
    color: "#10b981",
  },
  {
    label: "Menunggu Verifikasi",
    value: "42",
    trend: "Perlu ditinjau",
    icon: ShieldCheck,
    color: "#f59e0b",
  },
  {
    label: "Saldo Simpanan",
    value: "Rp 8,4 M",
    trend: "+6,8%",
    icon: Wallet,
    color: "#b7102a",
  },
];

const members = [
  {
    id: "AGT-2401",
    name: "Siti Aminah",
    nik: "7203••••••••1124",
    email: "siti.aminah@mail.com",
    phone: "0812-3456-7890",
    area: "Dusun Melati",
    joinedAt: "12 Jan 2026",
    status: "Aktif",
    type: "Reguler",
    savings: 2750000,
    loan: 0,
  },
  {
    id: "AGT-2402",
    name: "Ahmad Subagyo",
    nik: "7203••••••••8942",
    email: "ahmad.subagyo@mail.com",
    phone: "0821-9087-6543",
    area: "Dusun Tani Indah",
    joinedAt: "20 Jan 2026",
    status: "Aktif",
    type: "Prioritas",
    savings: 4250000,
    loan: 15000000,
  },
  {
    id: "AGT-2403",
    name: "Budi Santoso",
    nik: "7203••••••••3321",
    email: "budi.santoso@mail.com",
    phone: "0852-1112-3344",
    area: "Dusun Mawar",
    joinedAt: "02 Feb 2026",
    status: "Aktif",
    type: "Reguler",
    savings: 1850000,
    loan: 2500000,
  },
  {
    id: "AGT-2404",
    name: "Nurhayati",
    nik: "7203••••••••6789",
    email: "nurhayati@mail.com",
    phone: "0813-7000-9201",
    area: "Dusun Cempaka",
    joinedAt: "14 Feb 2026",
    status: "Menunggu",
    type: "Baru",
    savings: 500000,
    loan: 0,
  },
  {
    id: "AGT-2405",
    name: "Rahmat Hidayat",
    nik: "7203••••••••4509",
    email: "rahmat.h@mail.com",
    phone: "0878-2234-5566",
    area: "Dusun Kenanga",
    joinedAt: "25 Feb 2026",
    status: "Nonaktif",
    type: "Reguler",
    savings: 950000,
    loan: 0,
  },
  {
    id: "AGT-2406",
    name: "Dewi Lestari",
    nik: "7203••••••••7710",
    email: "dewi.lestari@mail.com",
    phone: "0822-8877-6633",
    area: "Dusun Melati",
    joinedAt: "03 Mar 2026",
    status: "Aktif",
    type: "Prioritas",
    savings: 6100000,
    loan: 10000000,
  },
];

const filters = ["Semua", "Aktif", "Menunggu", "Nonaktif"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const getStatusStyle = (status: string) => {
  switch (status) {
    case "Aktif":
      return {
        background: "#dcfce7",
        color: "#15803d",
        border: "#bbf7d0",
      };
    case "Menunggu":
      return {
        background: "#fef3c7",
        color: "#b45309",
        border: "#fde68a",
      };
    default:
      return {
        background: "#fee2e2",
        color: "#b91c1c",
        border: "#fecaca",
      };
  }
};

export default function HalamanDataAnggota() {
  const colors = useColors();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("Semua");

  const filteredMembers = useMemo(() => {
    const keyword = searchTerm.toLowerCase();

    return members.filter((member) => {
      const matchesFilter =
        selectedFilter === "Semua" || member.status === selectedFilter;
      const matchesSearch =
        member.name.toLowerCase().includes(keyword) ||
        member.id.toLowerCase().includes(keyword) ||
        member.area.toLowerCase().includes(keyword) ||
        member.email.toLowerCase().includes(keyword);

      return matchesFilter && matchesSearch;
    });
  }, [searchTerm, selectedFilter]);

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: colors.background }}
    >
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p
            className="mb-2 text-sm font-semibold"
            style={{ color: colors.primary }}
          >
            Manajemen Anggota
          </p>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.textPrimary }}
          >
            Data Anggota
          </h1>
          <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
            Pantau profil, status keanggotaan, simpanan, dan pinjaman anggota
            koperasi.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-transform active:scale-95"
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.surface,
              color: colors.textPrimary,
            }}
          >
            <Download size={17} />
            Export Data
          </button>
          <Link
            href="/dashboard/anggota/tambah"
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
            style={{ background: colors.primary }}
          >
            <UserPlus size={17} />
            Tambah Anggota
          </Link>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {memberStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md"
              style={{ borderColor: colors.border, background: colors.surface }}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: colors.textSecondary }}
                  >
                    {stat.label}
                  </p>
                  <h3
                    className="mt-1 text-2xl font-black"
                    style={{ color: colors.textPrimary }}
                  >
                    {stat.value}
                  </h3>
                </div>
                <div
                  className="rounded-xl p-3"
                  style={{
                    backgroundColor: `${stat.color}16`,
                    color: stat.color,
                  }}
                >
                  <Icon size={22} />
                </div>
              </div>
              <p
                className="text-sm font-semibold"
                style={{ color: stat.color }}
              >
                {stat.trend}
              </p>
            </div>
          );
        })}
      </div>

      {/* FILTER BAR */}
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
              placeholder="Cari nama, ID, wilayah, atau email..."
              className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
              style={{
                borderColor: colors.border,
                background: colors.background,
                color: colors.textPrimary,
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="mr-1 flex items-center gap-2 text-sm font-semibold"
              style={{ color: colors.textSecondary }}
            >
              <Filter size={16} />
              Status
            </div>
            {filters.map((filter) => {
              const active = selectedFilter === filter;

              return (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className="rounded-lg px-3.5 py-2 text-sm font-bold transition-colors"
                  style={{
                    background: active
                      ? colors.backgroundAccent
                      : colors.background,
                    border: `1px solid ${active ? colors.borderAccent : colors.border}`,
                    color: active ? colors.primary : colors.textSecondary,
                  }}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TABLE DESKTOP */}
      <div
        className="hidden overflow-hidden rounded-xl border shadow-sm lg:block"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead style={{ background: colors.background }}>
              <tr
                className="border-b text-[12px] font-black uppercase tracking-wider"
                style={{
                  borderColor: colors.border,
                  color: colors.textSecondary,
                }}
              >
                <th className="px-6 py-4">Anggota</th>
                <th className="px-6 py-4">Kontak</th>
                <th className="px-6 py-4">Wilayah</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Simpanan</th>
                <th className="px-6 py-4">Pinjaman</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => {
                const statusStyle = getStatusStyle(member.status);

                return (
                  <tr
                    key={member.id}
                    className="border-b transition-colors hover:bg-black/5"
                    style={{ borderColor: colors.border }}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                          style={{ background: colors.primary }}
                        >
                          {member.name
                            .split(" ")
                            .map((word) => word[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p
                            className="font-bold"
                            style={{ color: colors.textPrimary }}
                          >
                            {member.name}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: colors.textMuted }}
                          >
                            {member.id} • NIK {member.nik}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div
                        className="space-y-1 text-sm"
                        style={{ color: colors.textSecondary }}
                      >
                        <p className="flex items-center gap-2">
                          <Mail size={14} /> {member.email}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone size={14} /> {member.phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p
                        className="flex items-center gap-2 text-sm font-semibold"
                        style={{ color: colors.textSecondary }}
                      >
                        <MapPin size={15} />
                        {member.area}
                      </p>
                      <p
                        className="mt-1 flex items-center gap-2 text-xs"
                        style={{ color: colors.textMuted }}
                      >
                        <CalendarDays size={13} />
                        Bergabung {member.joinedAt}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className="inline-flex rounded-full border px-3 py-1 text-xs font-black"
                        style={{
                          background: statusStyle.background,
                          borderColor: statusStyle.border,
                          color: statusStyle.color,
                        }}
                      >
                        {member.status}
                      </span>
                      <p
                        className="mt-2 text-xs"
                        style={{ color: colors.textMuted }}
                      >
                        {member.type}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p
                        className="font-bold"
                        style={{ color: colors.textPrimary }}
                      >
                        {formatCurrency(member.savings)}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p
                        className="flex items-center gap-2 font-bold"
                        style={{
                          color:
                            member.loan > 0 ? colors.primary : colors.textMuted,
                        }}
                      >
                        <CreditCard size={16} />
                        {member.loan > 0
                          ? formatCurrency(member.loan)
                          : "Tidak ada"}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-lg p-2 transition-transform hover:scale-105"
                          style={{
                            background: colors.background,
                            border: `1px solid ${colors.border}`,
                            color: colors.textPrimary,
                          }}
                          title="Lihat detail anggota"
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          className="rounded-lg p-2 transition-transform hover:scale-105"
                          style={{
                            background: colors.background,
                            border: `1px solid ${colors.border}`,
                            color: colors.textSecondary,
                          }}
                          title="Menu lainnya"
                        >
                          <MoreVertical size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CARD MOBILE/TABLET */}
      <div className="grid gap-4 lg:hidden">
        {filteredMembers.map((member) => {
          const statusStyle = getStatusStyle(member.status);

          return (
            <div
              key={member.id}
              className="rounded-xl border p-5 shadow-sm"
              style={{ borderColor: colors.border, background: colors.surface }}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                    style={{ background: colors.primary }}
                  >
                    {member.name
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <h3
                      className="font-bold"
                      style={{ color: colors.textPrimary }}
                    >
                      {member.name}
                    </h3>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      {member.id} • {member.type}
                    </p>
                  </div>
                </div>
                <span
                  className="rounded-full border px-3 py-1 text-xs font-black"
                  style={{
                    background: statusStyle.background,
                    borderColor: statusStyle.border,
                    color: statusStyle.color,
                  }}
                >
                  {member.status}
                </span>
              </div>

              <div
                className="grid gap-3 text-sm"
                style={{ color: colors.textSecondary }}
              >
                <p className="flex items-center gap-2">
                  <Mail size={15} /> {member.email}
                </p>
                <p className="flex items-center gap-2">
                  <Phone size={15} /> {member.phone}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin size={15} /> {member.area}
                </p>
              </div>

              <div
                className="mt-5 grid grid-cols-2 gap-3 rounded-xl p-4"
                style={{ background: colors.background }}
              >
                <div>
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    Simpanan
                  </p>
                  <p
                    className="mt-1 font-bold"
                    style={{ color: colors.textPrimary }}
                  >
                    {formatCurrency(member.savings)}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    Pinjaman
                  </p>
                  <p
                    className="mt-1 font-bold"
                    style={{ color: colors.primary }}
                  >
                    {member.loan > 0 ? formatCurrency(member.loan) : "-"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div
          className="rounded-xl border p-10 text-center shadow-sm"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <p className="font-bold" style={{ color: colors.textPrimary }}>
            Data anggota tidak ditemukan
          </p>
          <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
            Coba ubah kata kunci pencarian atau filter status.
          </p>
        </div>
      )}
    </div>
  );
}
