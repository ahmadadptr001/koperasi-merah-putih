import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { SavingsAccountInsert } from "@/lib/types";

// GET /api/savings-accounts
// Query params: member_id
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const member_id = searchParams.get("member_id");

    let query = supabase
      .from("savings_accounts")
      .select("*, members(id, member_code, name)", { count: "exact" })
      .order("updated_at", { ascending: false });

    if (member_id) query = query.eq("member_id", member_id);

    const { data, error, count } = await query;
    if (error) return serverError(error);
    return okList(data ?? [], count ?? 0);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/savings-accounts
export async function POST(req: NextRequest) {
  try {
    const body: SavingsAccountInsert = await req.json();

    if (!body.member_id) return badRequest("member_id wajib diisi");

    // Cek duplikasi — 1 member hanya boleh punya 1 rekening
    const { data: existing } = await supabase
      .from("savings_accounts")
      .select("id")
      .eq("member_id", body.member_id)
      .single();

    if (existing) return badRequest("Anggota sudah memiliki rekening simpanan");

    const { data, error } = await supabase
      .from("savings_accounts")
      .insert({
        ...body,
        balance_pokok: body.balance_pokok ?? 0,
        balance_wajib: body.balance_wajib ?? 0,
        balance_sukarela: body.balance_sukarela ?? 0,
        total_balance: body.total_balance ?? 0,
      })
      .select()
      .single();

    if (error) return serverError(error);
    return created(data, "Rekening simpanan berhasil dibuat");
  } catch (err) {
    return serverError(err);
  }
}
