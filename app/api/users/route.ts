import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  ok,
  okList,
  created,
  badRequest,
  serverError,
} from "@/lib/api-response";
import type { UserInsert } from "@/lib/types";

// GET /api/users
// Query params: role, status, search
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabase
      .from("users")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (role) query = query.eq("role", role);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error, count } = await query;

    if (error) return serverError(error);
    return okList(data ?? [], count ?? 0);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/users
export async function POST(req: NextRequest) {
  try {
    const body: UserInsert = await req.json();

    if (!body.name || !body.email || !body.role) {
      return badRequest("Field name, email, dan role wajib diisi");
    }

    const { data, error } = await supabase
      .from("users")
      .insert(body)
      .select()
      .single();

    if (error) return serverError(error);
    return created(data, "User berhasil dibuat");
  } catch (err) {
    return serverError(err);
  }
}
