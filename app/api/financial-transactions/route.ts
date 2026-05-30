// app/api/financial-transactions/route.ts
import { NextRequest } from "next/server";
import {
  getFinancialTransactions,
  createFinancialTransaction,
  getLaporanRingkasan,
} from "@/services/financialService";
import {
  ok,
  okList,
  created,
  badRequest,
  serverError,
} from "@/lib/api-response";
import type { FinancialTransactionType } from "@/lib/types";
import { getLaporanRingkasanPeriode } from "@/services/laporanService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    // Mode ringkasan/laporan
    if (searchParams.get("mode") === "ringkasan") {
      const from_date = searchParams.get("from_date");
      const to_date = searchParams.get("to_date");
      if (!from_date || !to_date)
        return badRequest("from_date dan to_date wajib untuk mode ringkasan");

      const result = await getLaporanRingkasanPeriode(from_date, to_date);
      if (result.error) return serverError(result.error);
      return ok(result.data);
    }

    // Mode list biasa
    const result = await getFinancialTransactions({
      transaction_type:
        (searchParams.get("transaction_type") as FinancialTransactionType) ||
        undefined,
      category: searchParams.get("category") || undefined,
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

    if (!body.transaction_type)
      return badRequest("transaction_type wajib diisi");
    if (!body.category) return badRequest("category wajib diisi");
    if (!body.amount || Number(body.amount) <= 0)
      return badRequest("amount harus lebih dari 0");

    const validTypes: FinancialTransactionType[] = [
      "pemasukan",
      "pengeluaran",
      "transfer",
    ];
    if (!validTypes.includes(body.transaction_type)) {
      return badRequest(`transaction_type harus: ${validTypes.join(", ")}`);
    }

    const result = await createFinancialTransaction({
      transaction_type: body.transaction_type as FinancialTransactionType,
      category: body.category,
      amount: Number(body.amount),
      description: body.description ?? null,
      reference_type: body.reference_type ?? null,
      reference_id: body.reference_id ?? null,
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
