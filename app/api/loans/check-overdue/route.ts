// app/api/loans/check-overdue/route.ts
import { NextRequest } from "next/server";
import { checkOverduePayments } from "@/services/loanService";
import { ok, serverError } from "@/lib/api-response";

export async function POST(_req: NextRequest) {
  try {
    const result = await checkOverduePayments();
    if (result.error) return serverError(result.error);
    return ok(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}
