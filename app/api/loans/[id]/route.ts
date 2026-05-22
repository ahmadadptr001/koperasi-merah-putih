import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { ok, notFound, badRequest, serverError } from "@/lib/api-response";
import type { LoanUpdate } from "@/lib/types";

type Params = { params: { id: string } };

// GET /api/loans/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { data, error } = await supabase
      .from("loans")
      .select(
        `
        *,
        members(id, member_code, name, phone, address),
        loan_payments(
          id, payment_date, amount, principal_paid,
          interest_paid, remaining_after, officer, created_at
        )
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

// PUT /api/loans/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body: LoanUpdate = await req.json();
    if (Object.keys(body).length === 0)
      return badRequest("Tidak ada field yang diupdate");

    const { data, error } = await supabase
      .from("loans")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select()
      .single();

    if (error || !data) return notFound();
    return ok(data, "Data pinjaman berhasil diupdate");
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/loans/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    // Hanya pinjaman draft/rejected yang bisa dihapus
    const { data: loan } = await supabase
      .from("loans")
      .select("status")
      .eq("id", params.id)
      .single();

    if (!loan) return notFound();

    if (!["draft", "rejected"].includes(loan.status)) {
      return badRequest(
        "Hanya pinjaman berstatus draft atau rejected yang dapat dihapus",
      );
    }

    const { error } = await supabase.from("loans").delete().eq("id", params.id);
    if (error) return serverError(error);
    return ok(null, "Pinjaman berhasil dihapus");
  } catch (err) {
    return serverError(err);
  }
}
