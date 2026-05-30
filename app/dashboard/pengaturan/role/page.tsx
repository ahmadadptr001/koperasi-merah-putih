"use client";

// app/dashboard/pengaturan/role/page.tsx

import React, { useState, useEffect, useMemo } from "react";
import { Search, ShieldCheck, AlertCircle, Save, Loader2 } from "lucide-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import Swal from "sweetalert2";
import type { User, UserRole } from "@/lib/types";

const ROLES: { id: UserRole; label: string; desc: string }[] = [
  { id: "admin", label: "Admin", desc: "Akses penuh seluruh sistem" },
  { id: "pengurus", label: "Pengurus", desc: "Kelola anggota & keuangan" },
  { id: "anggota", label: "Anggota", desc: "Akses terbatas profil sendiri" },
];

export default function HalamanPengaturanRole() {
  const colors = useColors();
  const { user: currentUser, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error(`Gagal memuat data (${res.status})`);
      const json = await res.json();
      setUsers(json.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(keyword) ||
        u.email.toLowerCase().includes(keyword),
    );
  }, [searchTerm, users]);

  // ── Simpan Role & Status sekaligus ──────────────────────────────────────
  const handleSave = async (userId: string) => {
    if (userId === currentUser?.id) {
      await Swal.fire({
        icon: "error",
        title: "Akses Ditolak",
        text: "Anda tidak dapat mengubah role atau status akun Anda sendiri.",
        confirmButtonColor: colors.primary,
      });
      return;
    }

    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const roleLabel = ROLES.find((r) => r.id === user.role)?.label ?? user.role;
    const statusLabel = user.is_active ? "Aktif" : "Ditangguhkan";

    const confirmed = await Swal.fire({
      title: "Konfirmasi Perubahan",
      html: `
        <div style="text-align:left; font-size:14px; line-height:1.8">
          <p><b>Pengguna:</b> ${user.full_name}</p>
          <p><b>Role:</b> ${roleLabel}</p>
          <p><b>Status:</b> ${statusLabel}</p>
        </div>
        <p style="margin-top:8px; font-size:12px; color:#64748b">
          Perubahan akan disimpan ke database.
        </p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Simpan!",
      cancelButtonText: "Batal",
      confirmButtonColor: colors.primary,
    });

    if (!confirmed.isConfirmed) return;

    setSavingId(userId);
    try {
      // Kirim request update role
      const roleRes = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_role", role: user.role }),
      });
      if (!roleRes.ok) {
        const err = await roleRes.json();
        throw new Error(err.error ?? "Gagal menyimpan role");
      }

      // Kirim request update status
      const statusRes = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_active",
          is_active: user.is_active,
        }),
      });
      if (!statusRes.ok) {
        const err = await statusRes.json();
        throw new Error(err.error ?? "Gagal menyimpan status");
      }

      await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference_type: "member_update",
          reference_id: userId,
          title: `Perubahan Role/Status User`,
          description: `User ${user.full_name} diubah role menjadi ${user.role} dan status ${user.is_active ? "Aktif" : "Ditangguhkan"}`,
          requested_by: currentUser?.id,
        }),
      });

      await Swal.fire({
        icon: "success",
        title: "Perubahan Tersimpan!",
        text: `Role dan status ${user.full_name} berhasil diperbarui.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setSavingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
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
          Pengaturan Role & Status Pengguna
        </h1>
        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          Kelola role dan status aktif/nonaktif pengguna.
        </p>
      </div>

      {/* Info Alert */}
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
          Anda tidak dapat mengubah role atau status akun Anda sendiri.
        </p>
      </div>

      {/* Search */}
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
            placeholder="Cari pengguna..."
            className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-red-100"
            style={{
              borderColor: colors.border,
              background: colors.background,
              color: colors.textPrimary,
            }}
          />
        </div>
      </div>

      {/* Tabel */}
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
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr
                    key={`sk-${i}`}
                    className="border-b"
                    style={{ borderColor: colors.border }}
                  >
                    <td className="px-6 py-5">
                      <div className="h-4 animate-pulse rounded bg-gray-200 w-3/4" />
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-4 animate-pulse rounded bg-gray-200 w-1/2" />
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-4 animate-pulse rounded bg-gray-200 w-1/3" />
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-4 animate-pulse rounded bg-gray-200 w-1/2 ml-auto" />
                    </td>
                  </tr>
                ))}

              {!loading &&
                filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  const isSaving = savingId === user.id;
                  const fullname = user.full_name.toLowerCase();

                  return (
                    <tr
                      key={user.id}
                      className="border-b transition-colors hover:bg-black/5"
                      style={{ borderColor: colors.border }}
                    >
                      <td className="px-6 py-5">
                        <p
                          className="font-bold capitalize"
                          style={{ color: colors.textPrimary }}
                        >
                          {fullname}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: colors.textMuted }}
                        >
                          {user.email}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: colors.primary }}
                          />
                          {isSelf ? (
                            <p
                              className="text-sm font-medium capitalize"
                              style={{ color: colors.textPrimary }}
                            >
                              {ROLES.find((r) => r.id === user.role)?.label ??
                                user.role}
                            </p>
                          ) : (
                            <select
                              value={user.role}
                              onChange={(e) => {
                                setUsers((prev) =>
                                  prev.map((u) =>
                                    u.id === user.id
                                      ? {
                                          ...u,
                                          role: e.target.value as UserRole,
                                        }
                                      : u,
                                  ),
                                );
                              }}
                              className="rounded-lg border px-3 py-1.5 text-xs font-bold outline-none"
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
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {isSelf ? (
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${user.is_active ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}`}
                          >
                            {user.is_active ? "Aktif" : "Ditangguhkan"}
                          </span>
                        ) : (
                          <select
                            value={user.is_active ? "active" : "inactive"}
                            onChange={(e) => {
                              setUsers((prev) =>
                                prev.map((u) =>
                                  u.id === user.id
                                    ? {
                                        ...u,
                                        is_active: e.target.value === "active",
                                      }
                                    : u,
                                ),
                              );
                            }}
                            className="rounded-lg border px-3 py-1.5 text-xs font-bold outline-none"
                            style={{
                              borderColor: colors.border,
                              background: colors.background,
                              color: colors.textPrimary,
                            }}
                          >
                            <option value="active">Aktif</option>
                            <option value="inactive">Ditangguhkan</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          {isSelf ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 bg-slate-100">
                              <ShieldCheck size={14} /> Terproteksi
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSave(user.id)}
                              disabled={isSaving}
                              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors hover:bg-red-50 disabled:opacity-50"
                              style={{ color: colors.primary }}
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  Menyimpan...
                                </>
                              ) : (
                                <>
                                  <Save size={16} />
                                  Simpan
                                </>
                              )}
                            </button>
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
    </div>
  );
}
