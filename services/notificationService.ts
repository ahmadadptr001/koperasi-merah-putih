// services/notificationService.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  // Siapkan payload dengan default values
  const data = {
    user_id: payload.user_id,
    email_notifications: payload.email_notifications ?? true,
    sms_notifications: payload.sms_notifications ?? false,
    push_notifications: payload.push_notifications ?? false,
    loan_due_reminder: payload.loan_due_reminder ?? true,
    payment_confirmation: payload.payment_confirmation ?? true,
    new_member_notification: payload.new_member_notification ?? false,
    loan_approval_update: payload.loan_approval_update ?? true,
    monthly_report: payload.monthly_report ?? false,
    reminder_days_before: payload.reminder_days_before ?? 3,
  };

  const { data: result, error } = await supabase
    .from("notification_prefs")
    .upsert(data, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return {
    data: result as NotificationPref,
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
