// services/financialService.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  FinancialTransaction,
  FinancialTransactionInsert,
  FinancialTransactionType,
  ApiResponse,
  ApiListResponse,
} from "@/lib/types";

export async function getFinancialTransactions(params?: {
  transaction_type?: FinancialTransactionType;
  category?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiListResponse<FinancialTransaction>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("financial_transactions")
    .select("*", { count: "exact" })
    .order("transaction_date", { ascending: false });

  if (params?.transaction_type)
    query = query.eq("transaction_type", params.transaction_type);
  if (params?.category) query = query.eq("category", params.category);
  if (params?.from_date)
    query = query.gte("transaction_date", params.from_date);
  if (params?.to_date) query = query.lte("transaction_date", params.to_date);
  // range() sudah membatasi jumlah baris, jadi cukup salah satu saja.
  // Sebelumnya offset diabaikan bila limit tidak dikirim → paginasi macet.
  if (params?.offset) {
    const limit = params.limit ?? 10;
    query = query.range(params.offset, params.offset + limit - 1);
  } else if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error, count } = await query;
  if (error) return { data: [], total: 0, error: error.message };
  return {
    data: (data ?? []) as FinancialTransaction[],
    total: count ?? 0,
    error: null,
  };
}

export async function getFinancialTransactionById(
  id: string,
): Promise<ApiResponse<FinancialTransaction>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as FinancialTransaction, error: null };
}

export async function createFinancialTransaction(
  payload: FinancialTransactionInsert,
): Promise<ApiResponse<FinancialTransaction>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("financial_transactions")
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return {
    data: data as FinancialTransaction,
    error: null,
    message: "Transaksi keuangan berhasil dicatat",
  };
}

// ─── LAPORAN / REKAP ─────────────────────────────────────────────────────────

export interface LaporanRingkasan {
  total_pemasukan: number;
  total_pengeluaran: number;
  saldo: number;
  total_transaksi: number;
}

/**
 * Ringkasan keuangan untuk periode tertentu.
 */
export async function getLaporanRingkasan(
  from_date: string,
  to_date: string,
): Promise<ApiResponse<LaporanRingkasan>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("financial_transactions")
    .select("transaction_type, amount")
    .gte("transaction_date", from_date)
    .lte("transaction_date", to_date);

  if (error) return { data: null, error: error.message };

  const ringkasan = ((data ?? []) as Pick<
    FinancialTransaction,
    "transaction_type" | "amount"
  >[]).reduce(
    (acc, row) => {
      if (row.transaction_type === "pemasukan") {
        acc.total_pemasukan += Number(row.amount);
      } else if (row.transaction_type === "pengeluaran") {
        acc.total_pengeluaran += Number(row.amount);
      }
      acc.total_transaksi += 1;
      return acc;
    },
    { total_pemasukan: 0, total_pengeluaran: 0, saldo: 0, total_transaksi: 0 },
  );

  ringkasan.saldo = ringkasan.total_pemasukan - ringkasan.total_pengeluaran;

  return { data: ringkasan, error: null };
}
