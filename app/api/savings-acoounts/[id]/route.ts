import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { ok, notFound, serverError } from "@/lib/api-response";
import type { SavingsAccountUpdate } from "@/lib/types";

type Params = { params: { id: string } };

// GET /api/savings-accounts/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { data, error } = await supabase
      .from("savings_accounts")
      .select(
        `
        *,
        members(id, member_code, name, phone),
        savings_transactions(
          id, transaction_code, transaction_date, transaction_type,
          amount, balance_after, payment_method, status, officer, note
        )
      `,
      )
      .eq("id", params.id)
      .single();

    if (error || !data) return notFound();
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// PUT /api/savings-accounts/[id]
// Digunakan untuk manual adjustment (jika diperlukan)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body: SavingsAccountUpdate = await req.json();

    // Recalculate total_balance otomatis dari ketiga komponen
    const pokok = body.balance_pokok;
    const wajib = body.balance_wajib;
    const sukarela = body.balance_sukarela;

    const updateData: SavingsAccountUpdate = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    if (pokok !== undefined && wajib !== undefined && sukarela !== undefined) {
      updateData.total_balance = pokok + wajib + sukarela;
    }

    const { data, error } = await supabase
      .from("savings_accounts")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error || !data) return notFound();
    return ok(data, "Rekening berhasil diupdate");
  } catch (err) {
    return serverError(err);
  }
}
