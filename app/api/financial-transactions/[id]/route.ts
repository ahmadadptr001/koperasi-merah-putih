// app/api/financial-transactions/[id]/route.ts
import { NextRequest } from "next/server";
import { getFinancialTransactionById } from "@/services/financialService";
import { ok, notFound, serverError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

// Transaksi keuangan bersifat immutable (jurnal) — hanya GET
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await getFinancialTransactionById(id);
    if (result.error) return notFound(result.error);
    return ok(result.data);
  } catch (e) {
    return serverError(e);
  }
}
