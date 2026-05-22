import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { ok, notFound, badRequest, serverError } from "@/lib/api-response";
import type { FinancialTransactionUpdate } from "@/lib/types";

type Params = { params: { id: string } };

// GET /api/financial-transactions/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { data, error } = await supabase
      .from("financial_transactions")
      .select("*, users!financial_transactions_created_by_fkey(id, name, role)")
      .eq("id", params.id)
      .single();

    if (error || !data) return notFound();
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// PUT /api/financial-transactions/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body: FinancialTransactionUpdate = await req.json();
    if (Object.keys(body).length === 0)
      return badRequest("Tidak ada field yang diupdate");

    // Transaksi void tidak bisa diubah
    const { data: existing } = await supabase
      .from("financial_transactions")
      .select("status")
      .eq("id", params.id)
      .single();

    if (existing?.status === "void") {
      return badRequest("Transaksi yang sudah void tidak dapat diubah");
    }

    const { data, error } = await supabase
      .from("financial_transactions")
      .update(body)
      .eq("id", params.id)
      .select()
      .single();

    if (error || !data) return notFound();
    return ok(data, "Transaksi berhasil diupdate");
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/financial-transactions/[id]
// Soft delete: set status ke void
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { data, error } = await supabase
      .from("financial_transactions")
      .update({ status: "void" })
      .eq("id", params.id)
      .select()
      .single();

    if (error || !data) return notFound();
    return ok(data, "Transaksi berhasil dibatalkan (void)");
  } catch (err) {
    return serverError(err);
  }
}
