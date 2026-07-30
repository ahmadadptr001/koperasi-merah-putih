// services/userService.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import type {
  User,
  UserInsert,
  UserUpdate,
  ApiResponse,
  ApiListResponse,
} from "@/lib/types";

export async function getUsers(params?: {
  role?: User["role"];
  is_active?: boolean;
  search?: string;
}): Promise<ApiListResponse<User>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("users")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params?.role) query = query.eq("role", params.role);
  if (params?.is_active !== undefined)
    query = query.eq("is_active", params.is_active);
  if (params?.search) {
    // Filter .or() dikirim sebagai string; koma/kurung pada input bisa
    // mengubah struktur filter, jadi karakter khusus dibuang lebih dulu.
    const term = params.search.replace(/[,()\\%_*"']/g, " ").trim();
    if (term)
      query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) return { data: [], total: 0, error: error.message };
  return { data: (data ?? []) as User[], total: count ?? 0, error: null };
}

export async function getUserById(id: string): Promise<ApiResponse<User>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as User, error: null };
}

/**
 * Buat akun penuh:
 * 1. supabaseAdmin.auth.admin.createUser() → auth.users
 * 2. Trigger handle_new_user() otomatis insert row minimal ke public.users
 * 3. Update public.users dengan field lengkap (phone, role, avatar_url, is_active)
 *
 * Kenapa tidak langsung insert ke public.users?
 * Karena public.users.id adalah FK → auth.users(id).
 * Kalau insert langsung tanpa auth user dulu, akan gagal constraint.
 */
export async function createUserWithAuth(payload: {
  email: string;
  full_name: string;
  password: string;
  phone?: string | null;
  role: User["role"];
  avatar_url?: string | null;
  is_active?: boolean;
}): Promise<ApiResponse<User>> {
  // ── Step 1: Buat di auth.users via service role ──────────────────────────
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true, // langsung aktif, tidak perlu verifikasi email
      user_metadata: {
        full_name: payload.full_name,
        role: payload.role,
      },
    });

  if (authError) {
    const msg = authError.message.includes("already registered")
      ? "Email sudah terdaftar di sistem"
      : authError.message;
    return { data: null, error: msg };
  }

  const userId = authData.user.id;

  // ── Step 2: Update public.users dengan data lengkap ──────────────────────
  // Trigger handle_new_user() sudah insert row dengan id, email, full_name, role.
  // Kita update untuk mengisi phone, avatar_url, is_active.
  const { data, error: updateError } = await supabaseAdmin
    .from("users")
    .update({
      phone: payload.phone ?? null,
      role: payload.role,
      avatar_url: payload.avatar_url ?? null,
      is_active: payload.is_active ?? true,
    })
    .eq("id", userId)
    .select()
    .single();

  if (updateError) {
    // Rollback: akun auth sudah terbentuk tapi profilnya gagal dilengkapi.
    // Tanpa ini akun yatim tetap tertinggal di auth.users — emailnya
    // "terpakai" sehingga admin tidak bisa membuat ulang akun tersebut.
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { data: null, error: updateError.message };
  }

  return {
    data: data as User,
    error: null,
    message: `Akun ${payload.full_name} berhasil dibuat`,
  };
}

// Tetap ada untuk keperluan lain (misal trigger sudah bikin row, tinggal update)
export async function createUser(
  payload: UserInsert,
): Promise<ApiResponse<User>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("users")
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return {
    data: data as User,
    error: null,
    message: "Pengguna berhasil ditambahkan",
  };
}

export async function updateUser(
  id: string,
  payload: UserUpdate,
): Promise<ApiResponse<User>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return {
    data: data as User,
    error: null,
    message: "Profil berhasil diperbarui",
  };
}

export async function setUserRole(
  id: string,
  role: User["role"],
): Promise<ApiResponse<User>> {
  return updateUser(id, { role });
}

export async function toggleUserActive(
  id: string,
  is_active: boolean,
): Promise<ApiResponse<User>> {
  return updateUser(id, { is_active });
}

export async function deleteUserWithAuth(
  id: string,
): Promise<ApiResponse<null>> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

  if (error) {
    // loans.approved_by / requested_by menahan penghapusan (FK tanpa
    // ON DELETE), jadi ubah pesan teknis menjadi keterangan yang berguna.
    const isReferenced =
      error.message.includes("foreign key") ||
      error.message.includes("violates");
    return {
      data: null,
      error: isReferenced
        ? "Akun tidak bisa dihapus karena masih tercatat pada data pinjaman atau transaksi. Nonaktifkan akun ini saja."
        : error.message,
    };
  }

  return { data: null, error: null, message: "Akun berhasil dihapus" };
}
