// services/notificationService.ts
import { createSupabaseServerClient } from "@/lib/supabase";
import type {
  NotificationPref,
  NotificationPrefInsert,
  NotificationPrefUpdate,
  ApiResponse,
} from "@/lib/types";

export async function getNotificationPrefByUserId(
  userId: string,
): Promise<ApiResponse<NotificationPref>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as NotificationPref, error: null };
}

export async function getNotificationPrefById(
  id: string,
): Promise<ApiResponse<NotificationPref>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as NotificationPref, error: null };
}

/**
 * Buat preferensi notifikasi untuk user baru.
 * Jika sudah ada (conflict), upsert saja.
 */
export async function createOrUpdateNotificationPref(
  payload: NotificationPrefInsert,
): Promise<ApiResponse<NotificationPref>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("notification_prefs")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return {
    data: data as NotificationPref,
    error: null,
    message: "Preferensi notifikasi berhasil disimpan",
  };
}

export async function updateNotificationPref(
  id: string,
  payload: NotificationPrefUpdate,
): Promise<ApiResponse<NotificationPref>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("notification_prefs")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return {
    data: data as NotificationPref,
    error: null,
    message: "Preferensi notifikasi berhasil diperbarui",
  };
}
