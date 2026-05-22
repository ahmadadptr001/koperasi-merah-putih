import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { ok, notFound, badRequest, serverError } from "@/lib/api-response";
import type { MemberUpdate } from "@/lib/types";

type Params = { params: { id: string } };

// GET /api/members/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { data, error } = await supabase
      .from("members")
      .select(
        `
        *,
        savings_accounts(*),
        loans(id, loan_code, amount, status, remaining_amount),
        approvals(id, approval_code, category, status, submitted_at)
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

// PUT /api/members/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body: MemberUpdate = await req.json();
    if (Object.keys(body).length === 0)
      return badRequest("Tidak ada field yang diupdate");

    const { data, error } = await supabase
      .from("members")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select()
      .single();

    if (error || !data) return notFound();
    return ok(data, "Data anggota berhasil diupdate");
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/members/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    // Cek apakah anggota masih punya pinjaman aktif
    const { data: activeLoans } = await supabase
      .from("loans")
      .select("id")
      .eq("member_id", params.id)
      .eq("status", "active")
      .limit(1);

    if (activeLoans && activeLoans.length > 0) {
      return badRequest(
        "Anggota masih memiliki pinjaman aktif, tidak bisa dihapus",
      );
    }

    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", params.id);
    if (error) return serverError(error);
    return ok(null, "Anggota berhasil dihapus");
  } catch (err) {
    return serverError(err);
  }
}
