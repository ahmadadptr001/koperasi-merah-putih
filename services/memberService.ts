// services/memberService.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Member,
  MemberInsert,
  MemberUpdate,
  ApiResponse,
  ApiListResponse,
} from "@/lib/types";

/** Batas percobaan ulang saat nomor anggota bentrok dengan unique constraint */
const MAX_NUMBER_RETRY = 5;

/** Kode error Postgres untuk unique_violation */
const PG_UNIQUE_VIOLATION = "23505";

/**
 * PostgREST menerima filter `.or()` sebagai string, sehingga koma dan tanda
 * kurung pada input pencarian bisa mengubah struktur filter. Buang karakter
 * yang punya makna khusus (termasuk wildcard LIKE).
 */
function sanitizeSearch(value: string): string {
  return value.replace(/[,()\\%_*"']/g, " ").trim();
}

// ─── LIST ────────────────────────────────────────────────────────────────────

export async function getMembers(params?: {
  status?: Member["status"];
  search?: string;
  user_id?: string;
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

  // Dipakai halaman "Ajukan Pinjaman" untuk mencari data anggota milik user
  // yang login. Sebelumnya parameter ini dikirim dari client tapi diabaikan
  // di sini, sehingga filternya hilang tanpa peringatan.
  if (params?.user_id) {
    query = query.eq("user_id", params.user_id);
  }

  if (params?.search) {
    // NOTE: Setelah menjalankan migration add_area_to_members.sql,
    // kolom `area` sudah tersedia untuk pencarian.
    const term = sanitizeSearch(params.search);
    if (term) {
      query = query.or(
        `full_name.ilike.%${term}%,member_number.ilike.%${term}%,nik.ilike.%${term}%,phone.ilike.%${term}%,area.ilike.%${term}%`,
      );
    }
  }

  // range() sudah membatasi jumlah baris, jadi cukup salah satu saja —
  // memakai limit() dan range() bersamaan membuat hasil terpotong dua kali.
  if (params?.offset) {
    const limit = params.limit ?? 10;
    query = query.range(params.offset, params.offset + limit - 1);
  } else if (params?.limit) {
    query = query.limit(params.limit);
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

  // Nomor anggota dibuat lewat RPC lalu dipakai pada INSERT terpisah, jadi dua
  // pendaftaran berbarengan bisa mendapat nomor yang sama. Coba ulang beberapa
  // kali saat unique constraint menolak.
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= MAX_NUMBER_RETRY; attempt++) {
    const { data: memberNumber, error: genError } = await supabase.rpc(
      "generate_member_number",
    );

    if (genError) return { data: null, error: genError.message };

    const { data, error } = await supabase
      .from("members")
      .insert({ ...payload, member_number: memberNumber as string })
      .select()
      .single();

    if (!error) {
      return {
        data: data as Member,
        error: null,
        message: "Anggota berhasil ditambahkan",
      };
    }

    lastError = error.message;

    const isNumberClash =
      error.code === PG_UNIQUE_VIOLATION &&
      error.message.includes("member_number");
    if (!isNumberClash) return { data: null, error: error.message };
  }

  return {
    data: null,
    error:
      "Nomor anggota sedang dipakai pendaftaran lain. Silakan coba simpan kembali." +
      (lastError ? ` (${lastError})` : ""),
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
