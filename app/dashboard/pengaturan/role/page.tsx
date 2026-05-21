"use client";

import React, { useState, useMemo } from "react";
import { Search, ShieldCheck, AlertCircle, Save } from "lucide-react";
import { useColors } from "@/hooks/useColors";
import Swal from "sweetalert2";

// Mock Data User (Nanti ini akan dipanggil dari API/Supabase)
const initialUsers = [
  {
    id: "U-001",
    name: "Bagas",
    email: "bagas@admin.com",
    role: "superadmin",
    status: "aktif",
  },
  {
    id: "U-002",
    name: "Siti Aminah",
    email: "siti.aminah@mail.com",
    role: "pengurus",
    status: "aktif",
  },
  {
    id: "U-003",
    name: "Ahmad Subagyo",
    email: "ahmad.subagyo@mail.com",
    role: "anggota",
    status: "aktif",
  },
  {
    id: "U-004",
    name: "Budi Santoso",
    email: "budi.santoso@mail.com",
    role: "anggota",
    status: "ditangguhkan",
  },
];

const ROLES = [
  {
    id: "superadmin",
    label: "Super Admin",
    desc: "Akses penuh seluruh sistem",
  },
  { id: "pengurus", label: "Pengurus", desc: "Kelola anggota & keuangan" },
  { id: "anggota", label: "Anggota", desc: "Akses terbatas profil sendiri" },
];

export default function HalamanPengaturanRole() {
  const colors = useColors();
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser] = useState({ id: "U-001", name: "Bagas" }); // Simulasi user yang login

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(keyword) ||
        u.email.toLowerCase().includes(keyword) ||
        u.id.toLowerCase().includes(keyword),
    );
  }, [searchTerm, users]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === currentUser.id) {
      Swal.fire({
        icon: "error",
        title: "Akses Ditolak",
        text: "Anda tidak dapat mengubah role milik sendiri untuk menjaga keamanan sistem.",
        confirmButtonColor: colors.primary,
      });
      return;
    }

    const user = users.find((u) => u.id === userId);
    if (user?.role === newRole) return;

    Swal.fire({
      title: "Konfirmasi Perubahan",
      text: `Ubah role ${user?.name} menjadi ${ROLES.find((r) => r.id === newRole)?.label}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Ubah!",
      cancelButtonText: "Batal",
      confirmButtonColor: colors.primary,
    });

    // Simulasi update data
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
    );
  };

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: colors.background }}
    >
      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={20} style={{ color: colors.primary }} />
          <p
            className="text-sm font-semibold"
            style={{ color: colors.primary }}
          >
            Keamanan & Akses
          </p>
        </div>
        <h1
          className="text-2xl font-bold"
          style={{ color: colors.textPrimary }}
        >
          Pengaturan Role Pengguna
        </h1>
        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          Kelola hak akses pengguna untuk memastikan keamanan data koperasi.
        </p>
      </div>

      {/* INFO ALERT */}
      <div
        className="mb-6 p-4 rounded-xl border flex gap-3 items-start"
        style={{
          backgroundColor: `${colors.primary}10`,
          borderColor: colors.primary,
          color: colors.primary,
        }}
      >
        <AlertCircle size={20} className="shrink-0 mt-0.5" />
        <p className="text-xs font-medium">
          Perhatian: Perubahan role akan mempengaruhi akses menu di dashboard.
          Anda tidak dapat mengubah role akun Anda sendiri.
        </p>
      </div>

      {/* FILTER & SEARCH */}
      <div
        className="mb-6 rounded-xl border p-4 shadow-sm"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        <div className="relative w-full max-w-md">
          <Search
            className="absolute left-3 top-3"
            size={18}
            style={{ color: colors.textSecondary }}
          />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari pengguna via nama, email, atau ID..."
            className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-red-100"
            style={{
              borderColor: colors.border,
              background: colors.background,
              color: colors.textPrimary,
            }}
          />
        </div>
      </div>

      {/* USER LIST TABLE */}
      <div
        className="overflow-hidden rounded-xl border shadow-sm"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead style={{ background: colors.background }}>
              <tr
                className="border-b text-[12px] font-black uppercase tracking-wider"
                style={{
                  borderColor: colors.border,
                  color: colors.textSecondary,
                }}
              >
                <th className="px-6 py-4">Pengguna</th>
                <th className="px-6 py-4">Role Saat Ini</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody style={{ color: colors.textPrimary }}>
              {filteredUsers.map((user) => {
                const isSelf = user.id === currentUser.id;
                return (
                  <tr
                    key={user.id}
                    className="border-b transition-colors hover:bg-black/5"
                    style={{ borderColor: colors.border }}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                          style={{ background: colors.primary }}
                        >
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p
                            className="font-bold"
                            style={{ color: colors.textPrimary }}
                          >
                            {user.name}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: colors.textMuted }}
                          >
                            {user.email} • {user.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: colors.primary }}
                        />
                        <p
                          className="text-sm font-medium"
                          style={{ color: colors.textPrimary }}
                        >
                          {user.role.toUpperCase()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                          user.status === "aktif"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }`}
                      >
                        {user.status.charAt(0).toUpperCase() +
                          user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-3">
                        {isSelf ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 bg-slate-100">
                            <ShieldCheck size={14} />
                            Terproteksi
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              value={user.role}
                              onChange={(e) =>
                                handleRoleChange(user.id, e.target.value)
                              }
                              className="rounded-lg border px-3 py-1.5 text-xs font-bold outline-none transition-all hover:border-red-400"
                              style={{
                                borderColor: colors.border,
                                background: colors.background,
                                color: colors.textPrimary,
                              }}
                            >
                              {ROLES.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                            <button
                              className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                              style={{ color: colors.primary }}
                            >
                              <Save size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div
          className="rounded-xl border p-10 text-center shadow-sm"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <p className="font-bold" style={{ color: colors.textPrimary }}>
            Pengguna tidak ditemukan
          </p>
          <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
            Coba ubah kata kunci pencarian.
          </p>
        </div>
      )}
      {/* </div> */}
    </div>
  );
}
