import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { ok, notFound, serverError } from "@/lib/api-response";

type Params = { params: { id: string } };

// GET /api/loan-payments/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { data, error } = await supabase
      .from("loan_payments")
      .select(
        `
        *,
        loans(
          loan_code, amount, interest_rate, tenor_months, status,
          members(member_code, name, phone)
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
