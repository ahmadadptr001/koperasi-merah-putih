// app/api/loans/route.ts
import { NextRequest } from "next/server";
import { getLoans, createLoan } from "@/services/loanService";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { LoanStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const result = await getLoans({
      member_id: searchParams.get("member_id") || undefined,
      status: (searchParams.get("status") as LoanStatus) || undefined,
      search: searchParams.get("search") || undefined,
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

    if (!body.amount || Number(body.amount) <= 0)
      return badRequest("amount harus lebih dari 0");
    if (!body.interest_rate) return badRequest("interest_rate wajib diisi");
    if (!body.term_months || Number(body.term_months) <= 0)
      return badRequest("term_months harus lebih dari 0");

    // ── Resolve member_id ────────────────────────────────────────────────────
    let memberId: string = body.member_id;
    let requestedBy: string | null = body.requested_by || null;

    // Jika member_id tidak dikirim, coba resolve dari user yang login
    if (!memberId) {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        return badRequest(
          "member_id wajib diisi, atau login terlebih dahulu agar member_id bisa dideteksi otomatis.",
        );
      }

      // Cari member berdasarkan user_id
      const { data: member, error: memberErr } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (memberErr || !member) {
        return badRequest(
          "Akun Anda belum terdaftar sebagai anggota koperasi. " +
            "Hubungi admin untuk mendaftarkan data anggota terlebih dahulu.",
        );
      }

      memberId = member.id;
    }

    // Jika requested_by tidak dikirim, gunakan user yang login
    if (!requestedBy) {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      requestedBy = user?.id || null;
    }

    const result = await createLoan({
      member_id: memberId,
      amount: Number(body.amount),
      interest_rate: Number(body.interest_rate),
      term_months: Number(body.term_months),
      purpose: body.purpose ?? null,
      collateral: body.collateral ?? null,
      status: "pending",
      applied_date: body.applied_date ?? new Date().toISOString().slice(0, 10),
      approved_date: null,
      disbursement_date: null,
      due_date: null,
      approved_by: null,
      requested_by: requestedBy, // ← gunakan dari payload atau session
      notes: body.notes ?? null,
    });

    if (result.error) return serverError(result.error);
    return created(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}
