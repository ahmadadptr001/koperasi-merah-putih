"use client";

// app/dashboard/anggota/page.tsx
// Disempurnakan: fetch real API, stats akurat, detail per anggota via modal,
// export CSV, filter wilayah, dan tampilan yang lebih informatif.

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
  X,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Hash,
  User,
  Building2,
  Pencil,
  Trash2,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";
import type { Member } from "@/lib/types";
import Swal from "sweetalert2";
import { useAuth } from "@/hooks/useAuth";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const STATUS_FILTERS = ["Semua", "Aktif", "Menunggu", "Nonaktif"] as const;

const DB_TO_LABEL: Record<Member["status"], string> = {
  active: "Aktif",
  inactive: "Nonaktif",
  suspended: "Menunggu",
};

const FILTER_TO_STATUS: Record<string, Member["status"] | undefined> = {
  Semua: undefined,
  Aktif: "active",
  Menunggu: "suspended",
  Nonaktif: "inactive",
};

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
    month: "short",
    year: "numeric",
  });

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

const getStatusStyle = (status: Member["status"]) => {
  if (status === "active")
    return { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" };
  if (status === "suspended")
    return { bg: "#fef3c7", text: "#b45309", border: "#fde68a" };
  return { bg: "#fee2e2", text: "#b91c1c", border: "#fecaca" };
};

// ─── Export CSV ──────────────────────────────────────────────────────────────

function exportCSV(members: Member[]) {
  const headers = [
    "No. Anggota",
    "Nama",
    "NIK",
    "Email",
    "Telepon",
    "Wilayah",
    "Status",
    "Bergabung",
  ];
  const rows = members.map((m) => [
    m.member_number,
    m.full_name,
    m.nik ?? "",
    m.email ?? "",
    m.phone ?? "",
    m.area ?? m.address ?? "",
    DB_TO_LABEL[m.status],
    fmtDate(m.join_date),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${c}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `anggota_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Member Detail Modal ──────────────────────────────────────────────────────

function MemberModal({
  member,
  colors,
  onClose,
  onDelete,
}: {
  member: Member;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const ss = getStatusStyle(member.status);
  const wilayah = (member as any).area ?? member.address;

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Hapus Anggota?",
      text: `${member.full_name} akan dihapus dari sistem. Tindakan ini tidak bisa dibatalkan.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || json.error)
        throw new Error(json.error ?? "Gagal menghapus");
      await Swal.fire({
        icon: "success",
        title: "Dihapus",
        timer: 1500,
        showConfirmButton: false,
      });
      onDelete(member.id);
      onClose();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-2xl border shadow-xl max-h-[90vh] overflow-y-auto"
        style={{ background: colors.surface, borderColor: colors.border }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-start justify-between border-b p-6 z-10"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white"
              style={{ background: colors.primary }}
            >
              {initials(member.full_name)}
            </div>
            <div>
              <h2
                className="text-xl font-black"
                style={{ color: colors.textPrimary }}
              >
                {member.full_name}
              </h2>
              <p
                className="text-sm font-mono mt-0.5"
                style={{ color: colors.textSecondary }}
              >
                {member.member_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-black/5"
            style={{ color: colors.textSecondary }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Status + Badge */}
        <div
          className="px-6 py-4 flex items-center gap-3 border-b"
          style={{ borderColor: colors.border }}
        >
          <span
            className="inline-flex rounded-full border px-3 py-1 text-xs font-black"
            style={{
              background: ss.bg,
              borderColor: ss.border,
              color: ss.text,
            }}
          >
            {DB_TO_LABEL[member.status]}
          </span>
          <span className="text-xs" style={{ color: colors.textMuted }}>
            Bergabung {fmtDate(member.join_date)}
          </span>
        </div>

        {/* Info grid */}
        <div className="p-6 space-y-4">
          {/* Identitas */}
          <div>
            <p
              className="text-xs font-black uppercase tracking-wider mb-3"
              style={{ color: colors.textMuted }}
            >
              Identitas
            </p>
            <div className="grid grid-cols-2 gap-3">
              {member.nik && (
                <InfoPill
                  icon={Hash}
                  label="NIK"
                  value={member.nik}
                  colors={colors}
                />
              )}
              {member.gender && (
                <InfoPill
                  icon={User}
                  label="Jenis Kelamin"
                  value={member.gender === "L" ? "Laki-laki" : "Perempuan"}
                  colors={colors}
                />
              )}
              {member.birth_date && (
                <InfoPill
                  icon={CalendarDays}
                  label="Tgl Lahir"
                  value={fmtDate(member.birth_date)}
                  colors={colors}
                />
              )}
              {member.occupation && (
                <InfoPill
                  icon={Building2}
                  label="Pekerjaan"
                  value={member.occupation}
                  colors={colors}
                />
              )}
            </div>
          </div>

          {/* Kontak */}
          {(member.email || member.phone || wilayah) && (
            <div>
              <p
                className="text-xs font-black uppercase tracking-wider mb-3"
                style={{ color: colors.textMuted }}
              >
                Kontak
              </p>
              <div className="space-y-2">
                {member.email && (
                  <InfoRow icon={Mail} value={member.email} colors={colors} />
                )}
                {member.phone && (
                  <InfoRow icon={Phone} value={member.phone} colors={colors} />
                )}
                {wilayah && (
                  <InfoRow icon={MapPin} value={wilayah} colors={colors} />
                )}
              </div>
            </div>
          )}

          {/* Catatan */}
          {member.notes && (
            <div>
              <p
                className="text-xs font-black uppercase tracking-wider mb-2"
                style={{ color: colors.textMuted }}
              >
                Catatan
              </p>
              <p
                className="text-sm rounded-xl p-3"
                style={{
                  color: colors.textSecondary,
                  background: colors.background,
                }}
              >
                {member.notes}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className="sticky bottom-0 flex justify-between gap-3 border-t p-5"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
            }}
          >
            <Trash2 size={15} /> Hapus
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-bold"
              style={{
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              }}
            >
              Tutup
            </button>
            <Link href={`/dashboard/anggota/${member.id}/edit`}>
              <button
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
                style={{ background: colors.primary }}
              >
                <Pencil size={15} /> Edit
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoPill({
  icon: Icon,
  label,
  value,
  colors,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{ background: colors.background, borderColor: colors.border }}
    >
      <p className="text-xs mb-1" style={{ color: colors.textMuted }}>
        {label}
      </p>
      <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  value,
  colors,
}: {
  icon: typeof Mail;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <div
      className="flex items-center gap-2.5 text-sm"
      style={{ color: colors.textSecondary }}
    >
      <Icon size={15} style={{ color: colors.primary }} className="shrink-0" />
      <span className="break-all">{value}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface MemberStats {
  total: number;
  active: number;
  suspended: number;
  inactive: number;
}

export default function HalamanDataAnggota() {
  const { user } = useAuth();
  const colors = useColors();

  // Data
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<MemberStats>({
    total: 0,
    active: 0,
    suspended: 0,
    inactive: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("Semua");

  // Modal
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(0);
  }, [selectedFilter]);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const statusFilter = FILTER_TO_STATUS[selectedFilter];
      if (statusFilter) params.set("status", statusFilter);

      params.set("user_id", user?.id || "");
      const res = await fetch(`/api/members?${params}`);
      if (!res.ok) throw new Error(`Gagal memuat data (${res.status})`);
      const json = await res.json();
      setMembers(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedFilter, page]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [allRes, activeRes, suspendedRes, inactiveRes] = await Promise.all([
        fetch(`/api/members?limit=1&user_id=${user?.id}`),
        fetch(`/api/members?status=active&limit=1&user_id=${user?.id}`),
        fetch(`/api/members?status=suspended&limit=1&user_id=${user?.id}`),
        fetch(`/api/members?status=inactive&limit=1&user_id=${user?.id}`),
      ]);
      const [all, active, suspended, inactive] = await Promise.all([
        allRes.json(),
        activeRes.json(),
        suspendedRes.json(),
        inactiveRes.json(),
      ]);
      setStats({
        total: all.total ?? 0,
        active: active.total ?? 0,
        suspended: suspended.total ?? 0,
        inactive: inactive.total ?? 0,
      });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // Handle delete (dari modal)
  const handleDeleteMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setTotal((t) => t - 1);
    setStats((s) => ({ ...s, total: s.total - 1 }));
    void fetchStats();
  };

  const handleDelete = async (id: string) => {
    // 1. Cek apakah anggota memiliki rekening simpanan aktif
    const savingsRes = await fetch(
      `/api/savings-acoounts?member_id=${id}&status=active`,
    );
    const savingsJson = await savingsRes.json();
    const activeSavings = savingsJson.data || [];

    if (activeSavings.length > 0) {
      // 2. Jika ada rekening aktif, tampilkan notifikasi dan batalkan penghapusan
      await Swal.fire({
        title: "Tidak Dapat Menghapus",
        html: `
        <div style="text-align:left; font-size:14px; line-height:1.8">
          <p>Anggota ini masih memiliki <b>${activeSavings.length}</b> rekening simpanan aktif:</p>
          <ul style="padding-left:20px; margin-top:8px;">
            ${activeSavings
              .map(
                (acc: any) => `
              <li>${
                acc.account_type === "pokok"
                  ? "Simpanan Pokok"
                  : acc.account_type === "wajib"
                    ? "Simpanan Wajib"
                    : "Simpanan Sukarela"
              } 
                  — No. Rek: ${acc.account_number} (Saldo: ${fmtCurrency(Number(acc.balance))})</li>
            `,
              )
              .join("")}
          </ul>
          <p style="margin-top:12px; color:#64748b">
            Tutup atau alihkan rekening terlebih dahulu sebelum menghapus anggota.
          </p>
        </div>
      `,
        icon: "error",
        confirmButtonColor: colors.primary,
        confirmButtonText: "Tutup",
      });
      return;
    }

    // 3. Jika tidak ada rekening aktif, lanjutkan ke konfirmasi penghapusan
    const result = await Swal.fire({
      title: "Hapus Anggota?",
      text: "Data anggota akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Gagal menghapus");
      }
      await Swal.fire({
        icon: "success",
        title: "Dihapus",
        timer: 1500,
        showConfirmButton: false,
      });
      void fetchMembers();
      void fetchStats();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    }
  };

  // Export CSV dari data yang sudah difetch
  const handleExport = () => {
    if (members.length === 0) return;
    exportCSV(members);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const sl = statsLoading;

  const statCards = [
    {
      label: "Total Anggota",
      value: sl ? "…" : stats.total.toLocaleString("id-ID"),
      trend: "Terdaftar di koperasi",
      icon: Users,
      color: "#2563eb",
    },
    {
      label: "Anggota Aktif",
      value: sl ? "…" : stats.active.toLocaleString("id-ID"),
      trend:
        stats.total > 0
          ? `${((stats.active / stats.total) * 100).toFixed(1)}% dari total`
          : "—",
      icon: BadgeCheck,
      color: "#10b981",
    },
    {
      label: "Menunggu Verifikasi",
      value: sl ? "…" : stats.suspended.toLocaleString("id-ID"),
      trend: "Perlu ditinjau admin",
      icon: ShieldCheck,
      color: "#f59e0b",
    },
    {
      label: "Nonaktif",
      value: sl ? "…" : stats.inactive.toLocaleString("id-ID"),
      trend: "Keanggotaan tidak aktif",
      icon: Wallet,
      color: "#b7102a",
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────

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
            onClick={handleExport}
            disabled={members.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-transform active:scale-95 disabled:opacity-50"
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.surface,
              color: colors.textPrimary,
            }}
          >
            <Download size={17} />
            Export CSV
          </button>
          <button
            onClick={() => {
              void fetchMembers();
              void fetchStats();
            }}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-transform active:scale-95"
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.surface,
              color: colors.textPrimary,
            }}
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Refresh
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

      {/* STATS CARDS */}
      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
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
                  {sl ? (
                    <div
                      className="h-8 w-20 mt-1 animate-pulse rounded"
                      style={{ background: colors.border }}
                    />
                  ) : (
                    <h3
                      className="mt-1 text-2xl font-black"
                      style={{ color: colors.textPrimary }}
                    >
                      {stat.value}
                    </h3>
                  )}
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
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, no. anggota, NIK, telepon, wilayah..."
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
              className="flex items-center gap-2 text-sm font-semibold mr-1"
              style={{ color: colors.textSecondary }}
            >
              <Filter size={16} />
              Status
            </div>
            {STATUS_FILTERS.map((f) => {
              const active = selectedFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f)}
                  className="rounded-lg px-3.5 py-2 text-sm font-bold transition-colors"
                  style={{
                    background: active
                      ? colors.backgroundAccent
                      : colors.background,
                    border: `1px solid ${active ? colors.borderAccent : colors.border}`,
                    color: active ? colors.primary : colors.textSecondary,
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ERROR */}
      {fetchError && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle size={16} />
          {fetchError}
        </div>
      )}

      {/* TABLE (DESKTOP) */}
      <div
        className="hidden overflow-hidden rounded-xl border shadow-sm lg:block"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
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
                <th className="px-6 py-4">Bergabung</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {/* Skeleton */}
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={`sk-${i}`}
                    className="border-b"
                    style={{ borderColor: colors.border }}
                  >
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-5">
                        <div
                          className="h-4 animate-pulse rounded"
                          style={{
                            background: colors.border,
                            width: j === 0 ? "80%" : "60%",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}

              {/* Rows */}
              {!loading &&
                members.map((m) => {
                  const ss = getStatusStyle(m.status);
                  const wilayah = (m as any).area ?? m.address;

                  return (
                    <tr
                      key={m.id}
                      className="border-b transition-colors hover:bg-black/5 cursor-pointer"
                      style={{ borderColor: colors.border }}
                      onClick={() => setSelectedMember(m)}
                    >
                      {/* Anggota */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                            style={{ background: colors.primary }}
                          >
                            {initials(m.full_name)}
                          </div>
                          <div>
                            <p
                              className="font-bold"
                              style={{ color: colors.textPrimary }}
                            >
                              {m.full_name}
                            </p>
                            <p
                              className="text-xs font-mono"
                              style={{ color: colors.textMuted }}
                            >
                              {m.member_number}
                              {m.nik ? ` · ${m.nik.slice(0, 6)}···` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Kontak */}
                      <td className="px-6 py-5">
                        <div
                          className="space-y-1 text-sm"
                          style={{ color: colors.textSecondary }}
                        >
                          {m.email && (
                            <p className="flex items-center gap-2 truncate max-w-[180px]">
                              <Mail size={13} className="shrink-0" />
                              {m.email}
                            </p>
                          )}
                          {m.phone && (
                            <p className="flex items-center gap-2">
                              <Phone size={13} className="shrink-0" />
                              {m.phone}
                            </p>
                          )}
                          {!m.email && !m.phone && (
                            <p style={{ color: colors.textMuted }}>—</p>
                          )}
                        </div>
                      </td>

                      {/* Wilayah */}
                      <td className="px-6 py-5">
                        {wilayah ? (
                          <p
                            className="flex items-center gap-2 text-sm"
                            style={{ color: colors.textSecondary }}
                          >
                            <MapPin size={13} className="shrink-0" />
                            <span className="max-w-[140px] truncate">
                              {wilayah}
                            </span>
                          </p>
                        ) : (
                          <p
                            className="text-sm"
                            style={{ color: colors.textMuted }}
                          >
                            —
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        <span
                          className="inline-flex rounded-full border px-3 py-1 text-xs font-black"
                          style={{
                            background: ss.bg,
                            borderColor: ss.border,
                            color: ss.text,
                          }}
                        >
                          {DB_TO_LABEL[m.status]}
                        </span>
                      </td>

                      {/* Bergabung */}
                      <td className="px-6 py-5">
                        <p
                          className="flex items-center gap-1.5 text-sm"
                          style={{ color: colors.textSecondary }}
                        >
                          <CalendarDays size={13} />
                          {fmtDate(m.join_date)}
                        </p>
                      </td>

                      {/* Aksi */}
                      <td
                        className="px-6 py-5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedMember(m)}
                            className="rounded-lg p-2 transition-transform hover:scale-105"
                            style={{
                              background: colors.background,
                              border: `1px solid ${colors.border}`,
                              color: colors.textPrimary,
                            }}
                            title="Lihat detail"
                          >
                            <Eye size={17} />
                          </button>
                          <Link href={`/dashboard/anggota/${m.id}/edit`}>
                            <button
                              className="rounded-lg p-2 transition-transform hover:scale-105"
                              style={{
                                background: colors.background,
                                border: `1px solid ${colors.border}`,
                                color: colors.textSecondary,
                              }}
                              title="Edit anggota"
                            >
                              <Pencil size={17} />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="rounded-lg p-2 transition-transform hover:scale-105"
                            style={{
                              background: "#fee2e2",
                              border: "1px solid #fecaca",
                              color: "#b91c1c",
                            }}
                            title="Hapus anggota"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div
            className="flex items-center justify-between border-t px-6 py-4"
            style={{ borderColor: colors.border }}
          >
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              {total > 0
                ? `Menampilkan ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} dari ${total.toLocaleString("id-ID")} anggota`
                : "Tidak ada data"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg px-3 py-1.5 text-sm font-bold transition-colors disabled:opacity-40"
                style={{
                  border: `1px solid ${colors.border}`,
                  background: colors.background,
                  color: colors.textPrimary,
                }}
              >
                ← Sebelumnya
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg px-3 py-1.5 text-sm font-bold transition-colors disabled:opacity-40"
                style={{
                  border: `1px solid ${colors.border}`,
                  background: colors.background,
                  color: colors.textPrimary,
                }}
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CARDS (MOBILE) */}
      <div className="grid gap-4 lg:hidden">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`msk-${i}`}
              className="rounded-xl border p-5 shadow-sm"
              style={{ borderColor: colors.border, background: colors.surface }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-11 w-11 animate-pulse rounded-full"
                  style={{ background: colors.border }}
                />
                <div className="flex-1 space-y-2">
                  <div
                    className="h-4 animate-pulse rounded"
                    style={{ background: colors.border, width: "60%" }}
                  />
                  <div
                    className="h-3 animate-pulse rounded"
                    style={{ background: colors.border, width: "40%" }}
                  />
                </div>
              </div>
            </div>
          ))}

        {!loading &&
          members.map((m) => {
            const ss = getStatusStyle(m.status);
            const wilayah = (m as any).area ?? m.address;
            return (
              <div
                key={m.id}
                className="rounded-xl border p-5 shadow-sm cursor-pointer"
                style={{
                  borderColor: colors.border,
                  background: colors.surface,
                }}
                onClick={() => setSelectedMember(m)}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                      style={{ background: colors.primary }}
                    >
                      {initials(m.full_name)}
                    </div>
                    <div>
                      <h3
                        className="font-bold"
                        style={{ color: colors.textPrimary }}
                      >
                        {m.full_name}
                      </h3>
                      <p
                        className="text-xs font-mono"
                        style={{ color: colors.textMuted }}
                      >
                        {m.member_number}
                      </p>
                    </div>
                  </div>
                  <span
                    className="rounded-full border px-3 py-1 text-xs font-black shrink-0"
                    style={{
                      background: ss.bg,
                      borderColor: ss.border,
                      color: ss.text,
                    }}
                  >
                    {DB_TO_LABEL[m.status]}
                  </span>
                </div>
                <div
                  className="grid gap-2 text-sm"
                  style={{ color: colors.textSecondary }}
                >
                  {m.email && (
                    <p className="flex items-center gap-2">
                      <Mail size={14} />
                      {m.email}
                    </p>
                  )}
                  {m.phone && (
                    <p className="flex items-center gap-2">
                      <Phone size={14} />
                      {m.phone}
                    </p>
                  )}
                  {wilayah && (
                    <p className="flex items-center gap-2">
                      <MapPin size={14} />
                      {wilayah}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMember(m);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
                    style={{
                      border: `1px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.textPrimary,
                    }}
                  >
                    <Eye size={15} /> Detail
                  </button>
                  <Link
                    href={`/dashboard/anggota/${m.id}/edit`}
                    className="flex flex-1"
                  >
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
                      style={{ background: colors.primary }}
                    >
                      <Pencil size={15} /> Edit
                    </button>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(m.id);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
                    style={{
                      background: "#fee2e2",
                      color: "#b91c1c",
                      border: "1px solid #fecaca",
                    }}
                  >
                    <Trash2 size={15} /> Hapus
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* EMPTY STATE */}
      {!loading && members.length === 0 && !fetchError && (
        <div
          className="rounded-xl border p-10 text-center shadow-sm"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <Users
            size={40}
            className="mx-auto mb-3 opacity-30"
            style={{ color: colors.textMuted }}
          />
          <p className="font-bold" style={{ color: colors.textPrimary }}>
            Data anggota tidak ditemukan
          </p>
          <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
            Coba ubah kata kunci pencarian atau filter status.
          </p>
        </div>
      )}

      {/* MODAL */}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          colors={colors}
          onClose={() => setSelectedMember(null)}
          onDelete={handleDeleteMember}
        />
      )}
    </div>
  );
}
