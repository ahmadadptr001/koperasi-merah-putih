// services/userService.ts
import { createSupabaseServerClient } from "@/lib/supabase";
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
  if (params?.search)
    query = query.or(
      `full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`,
    );

  const { data, error, count } = await query;
  if (error) return { data: [], total: 0, error: error.message };
  return { data: data as User[], total: count ?? 0, error: null };
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
