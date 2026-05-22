// app/api/notification-prefs/route.ts
import { NextRequest } from "next/server";
import { createOrUpdateNotificationPref } from "@/services/notificationService";
import { created, badRequest, serverError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.user_id) return badRequest("user_id wajib diisi");

    const result = await createOrUpdateNotificationPref({
      user_id: body.user_id,
      email_notifications: body.email_notifications ?? true,
      sms_notifications: body.sms_notifications ?? false,
      loan_due_reminder: body.loan_due_reminder ?? true,
      payment_confirmation: body.payment_confirmation ?? true,
      new_member_notification: body.new_member_notification ?? false,
      loan_approval_update: body.loan_approval_update ?? true,
      monthly_report: body.monthly_report ?? false,
      reminder_days_before: body.reminder_days_before ?? 3,
    });

    if (result.error) return serverError(result.error);
    return created(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}
