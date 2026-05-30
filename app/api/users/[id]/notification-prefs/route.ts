import { NextRequest } from "next/server";
import {
  getNotificationPrefByUserId,
  createOrUpdateNotificationPref,
} from "@/services/notificationService";
import { ok, notFound, badRequest, serverError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await getNotificationPrefByUserId(id);
    if (result.error) return notFound(result.error);
    return ok(result.data);
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!id) return badRequest("user_id wajib diisi");

    const result = await createOrUpdateNotificationPref({
      user_id: id,
      email_notifications: body.email_notifications ?? true,
      sms_notifications: body.sms_notifications ?? false,
      push_notifications: body.push_notifications ?? false,
      loan_due_reminder: body.loan_due_reminder ?? true,
      payment_confirmation: body.payment_confirmation ?? true,
      new_member_notification: body.new_member_notification ?? false,
      loan_approval_update: body.loan_approval_update ?? true,
      monthly_report: body.monthly_report ?? false,
      reminder_days_before: body.reminder_days_before ?? 3,
    });
    if (result.error) return serverError(result.error);
    return ok(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}
