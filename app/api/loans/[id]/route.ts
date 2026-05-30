// app/api/loans/[id]/route.ts
import { NextRequest } from "next/server";
import {
  getLoanById,
  updateLoan,
  approveLoan,
  disburseLoan,
  deleteLoan,
} from "@/services/loanService";
import { ok, notFound, badRequest, serverError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await getLoanById(id);
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

    // Shortcut untuk approve
    if (body.action === "approve") {
      if (!body.approved_by)
        return badRequest("approved_by wajib untuk approval");
      const result = await approveLoan(id, body.approved_by, body.notes);
      if (result.error) return serverError(result.error);
      return ok(result.data, result.message);
    }

    // Shortcut untuk pencairan
    if (body.action === "disburse") {
      if (!body.disbursement_date)
        return badRequest("disbursement_date wajib untuk pencairan");
      if (!body.term_months)
        return badRequest("term_months wajib untuk pencairan");
      const result = await disburseLoan(
        id,
        body.disbursement_date,
        Number(body.term_months),
      );
      if (result.error) return serverError(result.error);
      return ok(result.data, result.message);
    }

    // Update biasa
    const result = await updateLoan(id, body);
    if (result.error) return serverError(result.error);
    return ok(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) return badRequest("ID tidak valid");

    const result = await deleteLoan(id);
    if (result.error) return serverError(result.error);
    return ok(null, result.message);
  } catch (e) {
    return serverError(e);
  }
}
