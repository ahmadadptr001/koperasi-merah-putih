// app/api/savings-transactions/route.ts
import { NextRequest } from "next/server";
import {
  getSavingsTransactions,
  createSavingsTransaction,
} from "@/services/savingsService";
import { getSavingsAccounts } from "@/services/savingsService";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { SavingsTransactionType, SavingsAccountType } from "@/lib/types";

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

    if (!body.member_id) return badRequest("member_id wajib diisi");
    if (!body.transaction_type)
      return badRequest("transaction_type wajib diisi");
    if (!body.amount || Number(body.amount) <= 0)
      return badRequest("amount harus lebih dari 0");

    const validTransactionTypes: SavingsTransactionType[] = [
      "setoran",
      "penarikan",
    ];
    if (!validTransactionTypes.includes(body.transaction_type)) {
      return badRequest(
        `transaction_type harus: ${validTransactionTypes.join(" atau ")}`,
      );
    }

    // ── Resolve savings_account_id ──────────────────────────────────────────
    // Page bisa kirim salah satu dari dua cara:
    // 1. Kirim savings_account_id langsung (cara lama/eksplisit)
    // 2. Kirim account_type ("pokok"|"wajib"|"sukarela") → resolve ke savings_account_id
    //    yang aktif milik member tersebut
    let savingsAccountId: string | undefined = body.savings_account_id;

    if (!savingsAccountId && body.account_type) {
      const validAccountTypes: SavingsAccountType[] = [
        "pokok",
        "wajib",
        "sukarela",
      ];
      if (!validAccountTypes.includes(body.account_type)) {
        return badRequest(
          `account_type harus: ${validAccountTypes.join(", ")}`,
        );
      }

      // Cari savings_account yang cocok untuk member + account_type ini
      const accounts = await getSavingsAccounts({
        member_id: body.member_id,
        account_type: body.account_type as SavingsAccountType,
        status: "active",
      });

      if (accounts.error) return serverError(accounts.error);
      if (accounts.data.length === 0) {
        return badRequest(
          `Rekening simpanan ${body.account_type} tidak ditemukan atau tidak aktif untuk anggota ini. ` +
            `Buat rekening ${body.account_type} terlebih dahulu melalui POST /api/savings-accounts.`,
        );
      }

      // Ambil rekening pertama yang aktif (per member+type harusnya hanya 1)
      savingsAccountId = accounts.data[0].id;
    }

    if (!savingsAccountId) {
      return badRequest(
        "Sediakan savings_account_id atau account_type (pokok/wajib/sukarela) untuk mengidentifikasi rekening.",
      );
    }

    const result = await createSavingsTransaction({
      savings_account_id: savingsAccountId,
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
    console.log("Error di POST /api/savings-transactions:", e);
    return serverError(e);
  }
}
