import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { ok, notFound, badRequest, serverError } from "@/lib/api-response";
import type { ApprovalUpdate } from "@/lib/types";

type Params = { params: { id: string } };

// GET /api/approvals/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { data, error } = await supabase
      .from("approvals")
      .select(
        `
        *,
        members(id, member_code, name, phone, address),
        users!approvals_reviewed_by_fkey(id, name, role)
      `,
      )
      .eq("id", params.id)
      .single();

    if (error || !data) return notFound();
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// PUT /api/approvals/[id]
// Untuk review (approve/reject/revision) maupun update dokumen
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body: ApprovalUpdate = await req.json();
    if (Object.keys(body).length === 0)
      return badRequest("Tidak ada field yang diupdate");

    // Jika status berubah ke approved/rejected/revision → set reviewed_at otomatis
    const isReviewed =
      body.status && ["approved", "rejected", "revision"].includes(body.status);

    const updateData: ApprovalUpdate = {
      ...body,
      ...(isReviewed && !body.reviewed_at
        ? { reviewed_at: new Date().toISOString() }
        : {}),
    };

    const { data, error } = await supabase
      .from("approvals")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error || !data) return notFound();

    // Jika approved dan category adalah pinjaman → otomatis update status loan
    if (
      body.status === "approved" &&
      data.category === "pinjaman" &&
      data.reference_id
    ) {
      await supabase
        .from("loans")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", data.reference_id);
    }

    return ok(data, "Status persetujuan berhasil diupdate");
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/approvals/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { data: approval } = await supabase
      .from("approvals")
      .select("status")
      .eq("id", params.id)
      .single();

    if (!approval) return notFound();
    if (approval.status !== "pending") {
      return badRequest("Hanya approval berstatus pending yang dapat dihapus");
    }

    const { error } = await supabase
      .from("approvals")
      .delete()
      .eq("id", params.id);
    if (error) return serverError(error);
    return ok(null, "Pengajuan berhasil dihapus");
  } catch (err) {
    return serverError(err);
  }
}
