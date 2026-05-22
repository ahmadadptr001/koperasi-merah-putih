import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { UserNotificationPrefInsert } from "@/lib/types";

// GET /api/notification-prefs
// Query params: user_id
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    let query = supabase
      .from("user_notification_prefs")
      .select("*, users(name, email)", { count: "exact" });

    if (user_id) query = query.eq("user_id", user_id);

    const { data, error, count } = await query;
    if (error) return serverError(error);
    return okList(data ?? [], count ?? 0);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/notification-prefs
export async function POST(req: NextRequest) {
  try {
    const body: UserNotificationPrefInsert = await req.json();

    if (!body.user_id) return badRequest("user_id wajib diisi");

    // Cek duplikasi
    const { data: existing } = await supabase
      .from("user_notification_prefs")
      .select("id")
      .eq("user_id", body.user_id)
      .single();

    if (existing)
      return badRequest("Preferensi notifikasi untuk user ini sudah ada");

    const { data, error } = await supabase
      .from("user_notification_prefs")
      .insert({
        user_id: body.user_id,
        email_enabled: body.email_enabled ?? true,
        sms_enabled: body.sms_enabled ?? false,
        push_enabled: body.push_enabled ?? true,
        approval_enabled: body.approval_enabled ?? true,
      })
      .select()
      .single();

    if (error) return serverError(error);
    return created(data, "Preferensi notifikasi berhasil dibuat");
  } catch (err) {
    return serverError(err);
  }
}
