import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  ok,
  okList,
  created,
  badRequest,
  serverError,
} from "@/lib/api-response";
import type { MemberInsert } from "@/lib/types";

// GET /api/members
// Query params: status, member_type, area, search, user_id
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const member_type = searchParams.get("member_type");
    const area = searchParams.get("area");
    const search = searchParams.get("search");
    const user_id = searchParams.get("user_id");

    let query = supabase
      .from("members")
      .select("*, savings_accounts(total_balance)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (member_type) query = query.eq("member_type", member_type);
    if (area) query = query.eq("area", area);
    if (user_id) query = query.eq("user_id", user_id);
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,member_code.ilike.%${search}%,nik.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) return serverError(error);
    return okList(data ?? [], count ?? 0);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/members
export async function POST(req: NextRequest) {
  try {
    const body: MemberInsert = await req.json();

    if (!body.member_code || !body.nik || !body.name) {
      return badRequest("Field member_code, nik, dan name wajib diisi");
    }

    // Insert member
    const { data: member, error: memberErr } = await supabase
      .from("members")
      .insert(body)
      .select()
      .single();

    if (memberErr || !member) return serverError(memberErr);

    // Auto-create savings account untuk member baru
    const { error: savErr } = await supabase.from("savings_accounts").insert({
      member_id: member.id,
      balance_pokok: 0,
      balance_wajib: 0,
      balance_sukarela: 0,
      total_balance: 0,
    });

    if (savErr) {
      console.error("[Auto savings account] Failed:", savErr.message);
    }

    return created(member, "Anggota berhasil didaftarkan");
  } catch (err) {
    return serverError(err);
  }
}
