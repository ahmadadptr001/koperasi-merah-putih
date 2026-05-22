// app/api/approvals/route.ts
import { NextRequest } from "next/server";
import { getApprovals, createApproval } from "@/services/approvalService";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { ApprovalStatus, ApprovalReferenceType } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const result = await getApprovals({
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
    });
    if (result.error) return serverError(result.error);
    return okList(result.data, result.total);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.reference_type) return badRequest("reference_type wajib diisi");
    if (!body.reference_id) return badRequest("reference_id wajib diisi");
    if (!body.title) return badRequest("title wajib diisi");
    if (!body.requested_by) return badRequest("requested_by wajib diisi");

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
      status: "pending",
      requested_by: body.requested_by,
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
