// app/api/approvals/[id]/route.ts
import { NextRequest } from "next/server";
import {
  getApprovalById,
  reviewApproval,
  updateApproval,
} from "@/services/approvalService";
import { ok, notFound, badRequest, serverError } from "@/lib/api-response";
import type { ApprovalStatus } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await getApprovalById(id);
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
    if (!id) return badRequest("ID tidak valid");

    // Shortcut untuk review (approve/reject/revision)
    if (body.action === "review") {
      if (!body.reviewed_by) return badRequest("reviewed_by wajib diisi");
      if (!body.status) return badRequest("status wajib diisi");

      const validStatuses: ApprovalStatus[] = [
        "approved",
        "rejected",
        "revision",
      ];
      if (!validStatuses.includes(body.status)) {
        return badRequest(
          `status untuk review harus: ${validStatuses.join(", ")}`,
        );
      }

      const result = await reviewApproval(
        id,
        body.reviewed_by,
        body.status as Exclude<ApprovalStatus, "pending">,
        body.review_notes,
      );
      if (result.error) return serverError(result.error);
      return ok(result.data, result.message);
    }

    // Update biasa
    const result = await updateApproval(id, body);
    if (result.error) return serverError(result.error);
    return ok(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}
