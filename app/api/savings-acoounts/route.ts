// app/api/savings-accounts/route.ts
import { NextRequest } from "next/server";
import {
  getSavingsAccounts,
  createSavingsAccount,
} from "@/services/savingsService";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { SavingsAccountType } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const result = await getSavingsAccounts({
      member_id: searchParams.get("member_id") || undefined,
      account_type:
        (searchParams.get("account_type") as SavingsAccountType) || undefined,
      status:
        (searchParams.get("status") as "active" | "inactive" | "closed") ||
        undefined,
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
    if (!body.account_type) return badRequest("account_type wajib diisi");

    const validTypes: SavingsAccountType[] = ["pokok", "wajib", "sukarela"];
    if (!validTypes.includes(body.account_type)) {
      return badRequest(
        `account_type harus salah satu dari: ${validTypes.join(", ")}`,
      );
    }

    const result = await createSavingsAccount({
      member_id: body.member_id,
      account_type: body.account_type as SavingsAccountType,
      balance: body.balance ?? 0,
      status: body.status ?? "active",
      opened_date: body.opened_date ?? new Date().toISOString().slice(0, 10),
      closed_date: body.closed_date ?? null,
      notes: body.notes ?? null,
    });

    if (result.error) return serverError(result.error);
    return created(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}
