// app/api/approvals/route.ts

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
  getUserProfile,
  requireAdminOrPengurus,
  parsePagination,
} from "@/lib/api-helpers";

// GET /api/approvals
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth();
    const profile = await getUserProfile(authUser.id);

    const url = new URL(req.url);
    const { page, pageSize, from, to } = parsePagination(url);
    const status = url.searchParams.get("status");
    const referenceType = url.searchParams.get("referenceType");

    const supabase = await createSupabaseServerClient();
    let query = supabase.from("approvals").select(
      `
        *,
        requester:users!approvals_requested_by_fkey(id, full_name, email),
        reviewer:users!approvals_reviewed_by_fkey(id, full_name)
      `,
      { count: "exact" },
    );

    // Anggota hanya lihat pengajuan miliknya
    if (profile?.role === "anggota") {
      query = query.eq("requested_by", authUser.id);
    }

    if (status) query = query.eq("status", status);
    if (referenceType) query = query.eq("reference_type", referenceType);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return errorResponse(error.message);

    return successResponse({
      data,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// app/api/approvals/[id]/route.ts content (also usable standalone)

// GET /api/approvals/[id]
export async function getApprovalById(id: string, authUserId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("approvals")
    .select(
      `
      *,
      requester:users!approvals_requested_by_fkey(id, full_name, email, role),
      reviewer:users!approvals_reviewed_by_fkey(id, full_name)
    `,
    )
    .eq("id", id)
    .single();
  return { data, error };
}
