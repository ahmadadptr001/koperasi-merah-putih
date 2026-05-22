import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { ok, notFound, badRequest, serverError } from "@/lib/api-response";

type Params = { params: { id: string } };

// GET /api/savings-transactions/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { data, error } = await supabase
      .from("savings_transactions")
      .select("*, members(member_code, name, phone), savings_accounts(*)")
      .eq("id", params.id)
      .single();

    if (error || !data) return notFound();
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// PUT /api/savings-transactions/[id]
// Hanya untuk update note, officer, atau status (bukan amount — amount tidak boleh diubah)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const allowed = ["note", "officer", "status"];
    const filtered = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowed.includes(k)),
    );

    if (Object.keys(filtered).length === 0) {
      return badRequest(
        "Hanya field note, officer, dan status yang dapat diubah",
      );
    }

    const { data, error } = await supabase
      .from("savings_transactions")
      .update(filtered)
      .eq("id", params.id)
      .select()
      .single();

    if (error || !data) return notFound();
    return ok(data, "Transaksi berhasil diupdate");
  } catch (err) {
    return serverError(err);
  }
}
