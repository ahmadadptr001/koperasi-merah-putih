// app/api/loan-payments/route.ts
import { NextRequest } from "next/server";
import { getLoanPayments, createLoanPayment } from "@/services/loanService";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { LoanPaymentStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const result = await getLoanPayments({
      loan_id: searchParams.get("loan_id") || undefined,
      status: (searchParams.get("status") as LoanPaymentStatus) || undefined,
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

    if (!body.loan_id) return badRequest("loan_id wajib diisi");
    if (!body.installment_no) return badRequest("installment_no wajib diisi");
    if (!body.due_date) return badRequest("due_date wajib diisi");
    if (body.principal === undefined)
      return badRequest("principal wajib diisi");
    if (body.interest === undefined) return badRequest("interest wajib diisi");
    if (!body.total_amount) return badRequest("total_amount wajib diisi");

    const result = await createLoanPayment({
      loan_id: body.loan_id,
      installment_no: Number(body.installment_no),
      due_date: body.due_date,
      payment_date: body.payment_date ?? new Date().toISOString().slice(0, 10),
      principal: Number(body.principal),
      interest: Number(body.interest),
      penalty: Number(body.penalty ?? 0),
      total_amount: Number(body.total_amount),
      paid_amount:
        body.paid_amount !== undefined
          ? Number(body.paid_amount)
          : Number(body.total_amount),
      status: body.status ?? "paid",
      notes: body.notes ?? null,
      created_by: body.created_by ?? null,
    });

    if (result.error) return serverError(result.error);
    return created(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}
