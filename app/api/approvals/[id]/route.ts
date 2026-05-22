// app/api/approvals/[id]/route.ts

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  handleApiError,
  requireAuth,
  getUserProfile,
  requireAdminOrPengurus,
} from "@/lib/api-helpers";

// GET /api/approvals/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authUser = await requireAuth();
    const profile = await getUserProfile(authUser.id);

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

    if (error || !data) return notFoundResponse("Permohonan");

    // Anggota hanya lihat pengajuan miliknya
    if (profile?.role === "anggota" && data.requested_by !== authUser.id) {
      return errorResponse("Akses ditolak", 403);
    }

    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}

// PUT /api/approvals/[id] — Review (approve/reject)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { profile } = await requireAdminOrPengurus();

    const body = await req.json();
    const { status, review_notes } = body;

    if (!status || !["approved", "rejected", "revision"].includes(status)) {
      return errorResponse("Status tidak valid", 400);
    }

    const supabase = await createSupabaseServerClient();

    // Cek approval ada dan masih pending
    const { data: existing } = await supabase
      .from("approvals")
      .select("*")
      .eq("id", id)
      .single();

    if (!existing) return notFoundResponse("Permohonan");
    if (existing.status !== "pending") {
      return errorResponse(`Permohonan ini sudah ${existing.status}`, 422);
    }

    const { data, error } = await supabase
      .from("approvals")
      .update({
        status,
        reviewed_by: profile.id,
        review_notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        requester:users!approvals_requested_by_fkey(id, full_name),
        reviewer:users!approvals_reviewed_by_fkey(id, full_name)
      `,
      )
      .single();

    if (error) return errorResponse(error.message);

    // Jika persetujuan untuk pinjaman, update status pinjaman
    if (existing.reference_type === "loan") {
      const loanStatus = status === "approved" ? "approved" : "rejected";
      await supabase
        .from("loans")
        .update({
          status: loanStatus,
          approved_by: profile.id,
          approved_date: new Date().toISOString().split("T")[0],
          notes: review_notes,
        })
        .eq("id", existing.reference_id);
    }

    const statusLabel =
      {
        approved: "disetujui",
        rejected: "ditolak",
        revision: "dikembalikan untuk revisi",
      }[status] || status;

    return successResponse(data, `Permohonan berhasil ${statusLabel}`);
  } catch (err) {
    return handleApiError(err);
  }
}
