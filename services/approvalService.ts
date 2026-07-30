// services/approvalService.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Approval,
  ApprovalInsert,
  ApprovalUpdate,
  ApiResponse,
  ApiListResponse,
} from "@/lib/types";

export async function getApprovals(params?: {
  status?: Approval["status"];
  reference_type?: Approval["reference_type"];
  requested_by?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiListResponse<Approval>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("approvals")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params?.status) query = query.eq("status", params.status);
  if (params?.reference_type)
    query = query.eq("reference_type", params.reference_type);
  if (params?.requested_by)
    query = query.eq("requested_by", params.requested_by);
  // range() sudah membatasi jumlah baris, jadi cukup salah satu saja.
  // Sebelumnya offset diabaikan bila limit tidak dikirim → paginasi macet.
  if (params?.offset) {
    const limit = params.limit ?? 10;
    query = query.range(params.offset, params.offset + limit - 1);
  } else if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error, count } = await query;
  if (error) return { data: [], total: 0, error: error.message };
  return { data: (data ?? []) as Approval[], total: count ?? 0, error: null };
}

export async function getApprovalById(
  id: string,
): Promise<ApiResponse<Approval>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("approvals")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Approval, error: null };
}

export async function createApproval(
  payload: ApprovalInsert,
): Promise<ApiResponse<Approval>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("approvals")
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return {
    data: data as Approval,
    error: null,
    message: "Permohonan berhasil diajukan",
  };
}

/**
 * Review approval: approve / reject / minta revisi.
 * Otomatis set reviewed_by, reviewed_at, review_notes, dan status.
 *
 * CATATAN: Untuk tipe 'savings_withdrawal', transaksi penarikan sudah dilakukan
 * di halaman tarik saat pengajuan. Approval hanya mencatat persetujuan/penolakan.
 */
export async function reviewApproval(
  id: string,
  reviewedBy: string,
  status: Exclude<Approval["status"], "pending">,
  reviewNotes?: string,
): Promise<ApiResponse<Approval>> {
  const supabase = await createSupabaseServerClient();

  const payload: ApprovalUpdate = {
    status,
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
    review_notes: reviewNotes ?? null,
  };

  const { data, error } = await supabase
    .from("approvals")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  const approval = data as Approval;

  // Keputusan atas approval pinjaman harus ikut mengubah tabel `loans`,
  // kalau tidak pinjaman tetap 'pending' walau pengurus sudah memutuskan
  // dari daftar persetujuan / notifikasi.
  if (
    approval.reference_type === "loan" &&
    (status === "approved" || status === "rejected")
  ) {
    const { error: loanErr } = await supabase
      .from("loans")
      .update({
        status,
        approved_by: reviewedBy,
        approved_date: new Date().toISOString().slice(0, 10),
        notes: reviewNotes ?? null,
      })
      .eq("id", approval.reference_id)
      .eq("status", "pending");

    if (loanErr) return { data: null, error: loanErr.message };
  }

  const label =
    status === "approved"
      ? "disetujui"
      : status === "rejected"
        ? "ditolak"
        : "diminta revisi";

  return {
    data: data as Approval,
    error: null,
    message: `Permohonan ${label}`,
  };
}

export async function updateApproval(
  id: string,
  payload: ApprovalUpdate,
): Promise<ApiResponse<Approval>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("approvals")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return {
    data: data as Approval,
    error: null,
    message: "Persetujuan berhasil diperbarui",
  };
}

export async function getApprovalsWithReadStatus(
  params?: {
    status?: Approval["status"];
    reference_type?: Approval["reference_type"];
    requested_by?: string;
    limit?: number;
    offset?: number;
  },
  userId?: string,
): Promise<ApiListResponse<Approval & { is_read: boolean }>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("approvals")
    .select(
      `
      *,
      is_read:notification_reads!left (
        id
      )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("notification_reads.user_id", userId);
  }

  if (params?.status) query = query.eq("status", params.status);

  if (params?.reference_type)
    query = query.eq("reference_type", params.reference_type);

  if (params?.requested_by)
    query = query.eq("requested_by", params.requested_by);

  if (params?.offset) {
    const limit = params.limit ?? 10;
    query = query.range(params.offset, params.offset + limit - 1);
  } else if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error, count } = await query;

  if (error) return { data: [], total: 0, error: error.message };

  // Transformasi: jika ada notification_reads, berarti sudah dibaca
  const rows = (data ?? []) as (Approval & { is_read?: unknown })[];
  const dataWithRead = rows.map((item) => ({
    ...item,
    is_read: Array.isArray(item.is_read) // cek panjang array dengan benar
      ? item.is_read.length > 0
      : Boolean(item.is_read),
  }));

  return {
    data: dataWithRead as (Approval & { is_read: boolean })[],
    total: count ?? 0,
    error: null,
  };
}

export async function markApprovalAsRead(
  approvalId: string,
  userId: string,
): Promise<ApiResponse<null>> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("notification_reads").upsert(
    {
      user_id: userId,
      approval_id: approvalId,
      read_at: new Date().toISOString(),
    },
    // Tanpa spasi: PostgREST memecah nilai on_conflict per koma, sehingga
    // "user_id, approval_id" menghasilkan nama kolom " approval_id".
    { onConflict: "user_id,approval_id" },
  );

  if (error) return { data: null, error: error.message };
  return {
    data: null,
    error: null,
    message: "Notifikasi ditandai sudah dibaca",
  };
}

export async function markAllApprovalsAsRead(
  userId: string,
): Promise<ApiResponse<null>> {
  const supabase = await createSupabaseServerClient();

  // Ambil semua approval yang BELUM dibaca oleh user ini
  const { data: alreadyRead, error: readErr } = await supabase
    .from("notification_reads")
    .select("approval_id")
    .eq("user_id", userId);

  if (readErr) return { data: null, error: readErr.message };

  const readIds = new Set((alreadyRead ?? []).map((r) => r.approval_id));

  const { data: approvals, error: fetchError } = await supabase
    .from("approvals")
    .select("id");

  if (fetchError) return { data: null, error: fetchError.message };

  const insertData = (approvals ?? [])
    .filter((app) => !readIds.has(app.id)) // skip yang sudah dibaca
    .map((app) => ({
      user_id: userId,
      approval_id: app.id,
      read_at: new Date().toISOString(),
    }));

  if (insertData.length === 0)
    return { data: null, error: null, message: "Semua sudah dibaca" };

  const { error } = await supabase
    .from("notification_reads")
    .upsert(insertData, { onConflict: "user_id,approval_id" });

  if (error) return { data: null, error: error.message };
  return {
    data: null,
    error: null,
    message: "Semua notifikasi ditandai sudah dibaca",
  };
}
