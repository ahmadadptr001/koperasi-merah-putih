// app/api/loans/route.ts
import { NextRequest } from "next/server";
import { getLoans, createLoan } from "@/services/loanService";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { LoanStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const result = await getLoans({
      member_id: searchParams.get("member_id") || undefined,
      status: (searchParams.get("status") as LoanStatus) || undefined,
      search: searchParams.get("search") || undefined,
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

    if (!body.member_id) return badRequest("member_id wajib diisi");
    if (!body.amount || Number(body.amount) <= 0)
      return badRequest("amount harus lebih dari 0");
    if (!body.interest_rate) return badRequest("interest_rate wajib diisi");
    if (!body.term_months || Number(body.term_months) <= 0)
      return badRequest("term_months harus lebih dari 0");

    const result = await createLoan({
      member_id: body.member_id,
      amount: Number(body.amount),
      interest_rate: Number(body.interest_rate),
      term_months: Number(body.term_months),
      purpose: body.purpose ?? null,
      collateral: body.collateral ?? null,
      status: "pending",
      applied_date: body.applied_date ?? new Date().toISOString().slice(0, 10),
      approved_date: null,
      disbursement_date: null,
      due_date: null,
      approved_by: null,
      notes: body.notes ?? null,
    });

    if (result.error) return serverError(result.error);
    return created(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}
