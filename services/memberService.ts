// services/memberService.ts
import { createSupabaseServerClient } from "@/lib/supabase";
import type {
  Member,
  MemberInsert,
  MemberUpdate,
  ApiResponse,
  ApiListResponse,
} from "@/lib/types";

// ─── LIST ────────────────────────────────────────────────────────────────────

export async function getMembers(params?: {
  status?: Member["status"];
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiListResponse<Member>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("members")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  if (params?.search) {
    query = query.or(
      `full_name.ilike.%${params.search}%,member_number.ilike.%${params.search}%,nik.ilike.%${params.search}%,phone.ilike.%${params.search}%`,
    );
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  if (params?.offset) {
    query = query.range(
      params.offset,
      params.offset + (params.limit ?? 10) - 1,
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return { data: [], total: 0, error: error.message };
  }

  return { data: data as Member[], total: count ?? 0, error: null };
}

// ─── GET BY ID ────────────────────────────────────────────────────────────────

export async function getMemberById(id: string): Promise<ApiResponse<Member>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Member, error: null };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createMember(
  payload: Omit<MemberInsert, "member_number">,
): Promise<ApiResponse<Member>> {
  const supabase = await createSupabaseServerClient();

  // Generate nomor anggota via DB function
  const { data: memberNumber, error: genError } = await supabase.rpc(
    "generate_member_number",
  );

  if (genError) return { data: null, error: genError.message };

  const { data, error } = await supabase
    .from("members")
    .insert({ ...payload, member_number: memberNumber as string })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return {
    data: data as Member,
    error: null,
    message: "Anggota berhasil ditambahkan",
  };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateMember(
  id: string,
  payload: MemberUpdate,
): Promise<ApiResponse<Member>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("members")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return {
    data: data as Member,
    error: null,
    message: "Anggota berhasil diperbarui",
  };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteMember(id: string): Promise<ApiResponse<null>> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("members").delete().eq("id", id);

  if (error) return { data: null, error: error.message };
  return { data: null, error: null, message: "Anggota berhasil dihapus" };
}

// ─── SUMMARY VIEW ─────────────────────────────────────────────────────────────

export async function getMemberSummary(memberId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("v_member_summary")
    .select("*")
    .eq("id", memberId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
