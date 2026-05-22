import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { ok, notFound, badRequest, serverError } from "@/lib/api-response";
import type { UserUpdate } from "@/lib/types";

type Params = { params: { id: string } };

// GET /api/users/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*, user_notification_prefs(*)")
      .eq("id", params.id)
      .single();

    if (error || !data) return notFound();
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// PUT /api/users/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body: UserUpdate = await req.json();

    if (Object.keys(body).length === 0)
      return badRequest("Tidak ada field yang diupdate");

    const { data, error } = await supabase
      .from("users")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select()
      .single();

    if (error || !data) return notFound();
    return ok(data, "User berhasil diupdate");
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/users/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { error } = await supabase.from("users").delete().eq("id", params.id);
    if (error) return serverError(error);
    return ok(null, "User berhasil dihapus");
  } catch (err) {
    return serverError(err);
  }
}
