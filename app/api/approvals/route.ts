// app/api/approvals/route.ts
import { NextRequest } from "next/server";
import {
  getApprovalsWithReadStatus,
  createApproval,
  markApprovalAsRead,
  markAllApprovalsAsRead,
} from "@/services/approvalService";
import {
  okList,
  created,
  ok,
  badRequest,
  serverError,
} from "@/lib/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApprovalStatus, ApprovalReferenceType } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("user_id");
    if (!userId) return badRequest("user_id wajib diisi");

    const result = await getApprovalsWithReadStatus(
      {
        status: (searchParams.get("status") as ApprovalStatus) || undefined,
        reference_type:
          (searchParams.get("reference_type") as ApprovalReferenceType) ||
          undefined,
        requested_by: searchParams.get("requested_by") || undefined,
        limit: searchParams.get("limit")
          ? Number(searchParams.get("limit"))
          : undefined,
        offset: searchParams.get("offset")
          ? Number(searchParams.get("offset"))
          : undefined,
      },
      userId,
    );
    if (result.error) return serverError(result.error);
    return okList(result.data, result.total);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await req.json();
    const user_id = body.requested_by || null;
    if (!user_id) return badRequest("User ID wajib diisi");

    if (!body.reference_type) return badRequest("reference_type wajib diisi");
    if (!body.reference_id) return badRequest("reference_id wajib diisi");
    if (!body.title) return badRequest("title wajib diisi");
    if (!body.requested_by) return badRequest("requested_by wajib diisi");
    const requested_by = body.requested_by || user_id;

    const validRefTypes: ApprovalReferenceType[] = [
      "loan",
      "savings_withdrawal",
      "member_registration",
      "member_update",
    ];
    if (!validRefTypes.includes(body.reference_type)) {
      return badRequest(`reference_type tidak valid`);
    }

    const result = await createApproval({
      reference_type: body.reference_type as ApprovalReferenceType,
      reference_id: body.reference_id,
      title: body.title,
      description: body.description ?? null,
      amount: body.amount ?? null,
      status: "approved",
      requested_by: requested_by,
      reviewed_by: null,
      review_notes: null,
      reviewed_at: null,
    });

    if (result.error) return serverError(result.error);
    return created(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, approval_id, user_id } = body;

    // ✅ Validasi user_id dari client, tidak perlu getUser()
    if (!user_id || typeof user_id !== "string") {
      return badRequest("user_id wajib diisi");
    }

    if (action === "mark_read") {
      if (!approval_id || typeof approval_id !== "string") {
        return badRequest("approval_id wajib diisi");
      }
      const result = await markApprovalAsRead(approval_id, user_id);
      if (result.error) return serverError(result.error);
      return ok(null, result.message);
    }

    if (action === "mark_all_read") {
      const result = await markAllApprovalsAsRead(user_id);
      if (result.error) return serverError(result.error);
      return ok(null, result.message);
    }

    return badRequest("Action tidak valid");
  } catch (e) {
    return serverError(e);
  }
}
