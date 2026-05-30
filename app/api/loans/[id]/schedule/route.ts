// app/api/loans/[id]/schedule/route.ts
// Mengembalikan jadwal angsuran lengkap menggunakan DB function calculate_loan_schedule

import { NextRequest } from "next/server";
import { generateLoanSchedule } from "@/services/loanService";
import { ok, badRequest, notFound, serverError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/loans/[id]/schedule
 *
 * Mengembalikan jadwal angsuran per bulan untuk pinjaman tertentu.
 * Menggunakan DB function calculate_loan_schedule(p_loan_id).
 *
 * Syarat: loan harus sudah memiliki disbursement_date (sudah dicairkan).
 *
 * Response:
 * {
 *   data: [
 *     { installment_no, due_date, principal, interest, total_amount },
 *     ...
 *   ],
 *   error: null
 * }
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    if (!id) return badRequest("ID pinjaman tidak valid");

    const result = await generateLoanSchedule(id);

    if (result.error) {
      // DB function melempar exception jika loan tidak ditemukan
      if (result.error.includes("not found")) return notFound(result.error);
      return serverError(result.error);
    }

    if (!result.data || result.data.length === 0) {
      return notFound(
        "Jadwal angsuran belum tersedia. Pastikan pinjaman sudah dicairkan (status: active) dan disbursement_date sudah diisi.",
      );
    }

    return ok(result.data, `${result.data.length} jadwal angsuran ditemukan`);
  } catch (e) {
    return serverError(e);
  }
}
