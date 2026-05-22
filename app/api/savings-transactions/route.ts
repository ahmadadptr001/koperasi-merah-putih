// app/api/savings-transactions/route.ts
import { NextRequest } from "next/server";
import {
  getSavingsTransactions,
  createSavingsTransaction,
} from "@/services/savingsService";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { SavingsTransactionType } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const result = await getSavingsTransactions({
      savings_account_id: searchParams.get("savings_account_id") || undefined,
      member_id: searchParams.get("member_id") || undefined,
      transaction_type:
        (searchParams.get("transaction_type") as SavingsTransactionType) ||
        undefined,
      from_date: searchParams.get("from_date") || undefined,
      to_date: searchParams.get("to_date") || undefined,
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

    if (!body.savings_account_id)
      return badRequest("savings_account_id wajib diisi");
    if (!body.member_id) return badRequest("member_id wajib diisi");
    if (!body.transaction_type)
      return badRequest("transaction_type wajib diisi");
    if (!body.amount || Number(body.amount) <= 0)
      return badRequest("amount harus lebih dari 0");

    const validTypes: SavingsTransactionType[] = ["setoran", "penarikan"];
    if (!validTypes.includes(body.transaction_type)) {
      return badRequest(`transaction_type harus: ${validTypes.join(" atau ")}`);
    }

    const result = await createSavingsTransaction({
      savings_account_id: body.savings_account_id,
      member_id: body.member_id,
      transaction_type: body.transaction_type as SavingsTransactionType,
      amount: Number(body.amount),
      description: body.description ?? null,
      transaction_date:
        body.transaction_date ?? new Date().toISOString().slice(0, 10),
      created_by: body.created_by ?? null,
    });

    if (result.error) return serverError(result.error);
    return created(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}
