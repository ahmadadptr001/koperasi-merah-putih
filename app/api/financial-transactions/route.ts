import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { FinancialTransactionInsert } from "@/lib/types";

// GET /api/financial-transactions
// Query params: transaction_type, category, status, created_by, from, to, search
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const transaction_type = searchParams.get("transaction_type");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const created_by = searchParams.get("created_by");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const search = searchParams.get("search");

    let query = supabase
      .from("financial_transactions")
      .select("*, users!financial_transactions_created_by_fkey(name)", {
        count: "exact",
      })
      .order("transaction_date", { ascending: false });

    if (transaction_type)
      query = query.eq("transaction_type", transaction_type);
    if (category) query = query.eq("category", category);
    if (status) query = query.eq("status", status);
    if (created_by) query = query.eq("created_by", created_by);
    if (from) query = query.gte("transaction_date", from);
    if (to) query = query.lte("transaction_date", to);
    if (search) {
      query = query.or(
        `description.ilike.%${search}%,transaction_code.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) return serverError(error);
    return okList(data ?? [], count ?? 0);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/financial-transactions
export async function POST(req: NextRequest) {
  try {
    const body: FinancialTransactionInsert = await req.json();

    const { transaction_type, category, amount, description, created_by } =
      body;

    if (!transaction_type || !category || !amount) {
      return badRequest(
        "Field transaction_type, category, dan amount wajib diisi",
      );
    }

    if (amount <= 0) return badRequest("Jumlah transaksi harus lebih dari 0");

    const { data, error } = await supabase
      .from("financial_transactions")
      .insert({
        ...body,
        transaction_code:
          body.transaction_code ?? generateFinTrxCode(transaction_type),
        transaction_date:
          body.transaction_date ?? new Date().toISOString().split("T")[0],
        status: body.status ?? "posted",
        created_by: created_by ?? null,
      })
      .select()
      .single();

    if (error) return serverError(error);
    return created(data, "Transaksi keuangan berhasil dicatat");
  } catch (err) {
    return serverError(err);
  }
}

function generateFinTrxCode(type: string): string {
  const prefix = type === "income" ? "INC" : "EXP";
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}-${yyyymm}-${rand}`;
}
