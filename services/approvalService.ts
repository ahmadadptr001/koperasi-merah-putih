// services/approvalService.ts
import { createSupabaseServerClient } from "@/lib/supabase";
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
  if (params?.limit) query = query.limit(params.limit);
  if (params?.offset && params?.limit)
    query = query.range(params.offset, params.offset + params.limit - 1);

  const { data, error, count } = await query;
  if (error) return { data: [], total: 0, error: error.message };
  return { data: data as Approval[], total: count ?? 0, error: null };
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
