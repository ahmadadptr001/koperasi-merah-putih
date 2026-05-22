// app/api/savings-transactions/[id]/route.ts
import { NextRequest } from "next/server";
import { getSavingsTransactionById } from "@/services/savingsService";
import { ok, notFound, serverError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

// Transaksi simpanan bersifat immutable — hanya GET
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await getSavingsTransactionById(id);
    if (result.error) return notFound(result.error);
    return ok(result.data);
  } catch (e) {
    return serverError(e);
  }
}
