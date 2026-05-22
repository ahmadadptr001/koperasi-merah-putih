import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { LoanInsert } from "@/lib/types";

// GET /api/loans
// Query params: member_id, status, from, to, search
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const member_id = searchParams.get("member_id");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const search = searchParams.get("search");

    let query = supabase
      .from("loans")
      .select("*, members(id, member_code, name, phone)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (member_id) query = query.eq("member_id", member_id);
    if (status) query = query.eq("status", status);
    if (from) query = query.gte("loan_date", from);
    if (to) query = query.lte("loan_date", to);
    if (search) query = query.ilike("loan_code", `%${search}%`);

    const { data, error, count } = await query;
    if (error) return serverError(error);
    return okList(data ?? [], count ?? 0);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/loans
export async function POST(req: NextRequest) {
  try {
    const body: LoanInsert = await req.json();

    const {
      member_id,
      amount,
      interest_rate,
      tenor_months,
      purpose,
      loan_date,
    } = body;

    if (!member_id || !amount || !interest_rate || !tenor_months) {
      return badRequest(
        "Field member_id, amount, interest_rate, dan tenor_months wajib diisi",
      );
    }

    if (amount <= 0) return badRequest("Jumlah pinjaman harus lebih dari 0");
    if (tenor_months <= 0) return badRequest("Tenor harus lebih dari 0 bulan");

    // Hitung cicilan per bulan (flat rate)
    const monthlyInterest = (amount * (interest_rate / 100)) / tenor_months;
    const monthlyPrincipal = amount / tenor_months;
    const installmentAmount = Math.round(monthlyPrincipal + monthlyInterest);

    // Hitung due date
    const loanDateObj = new Date(loan_date ?? new Date());
    const dueDate = new Date(loanDateObj);
    dueDate.setMonth(dueDate.getMonth() + tenor_months);

    const loanCode = body.loan_code ?? generateLoanCode();

    const { data, error } = await supabase
      .from("loans")
      .insert({
        ...body,
        loan_code: loanCode,
        loan_date: loan_date ?? new Date().toISOString().split("T")[0],
        installment_amount: installmentAmount,
        paid_amount: 0,
        remaining_amount: amount,
        status: body.status ?? "pending",
        due_date: dueDate.toISOString().split("T")[0],
      })
      .select()
      .single();

    if (error) return serverError(error);
    return created(data, "Pengajuan pinjaman berhasil dibuat");
  } catch (err) {
    return serverError(err);
  }
}

function generateLoanCode(): string {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `LN-${yyyymm}-${rand}`;
}
