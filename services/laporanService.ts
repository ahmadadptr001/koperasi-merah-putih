// services/laporanService.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ApiResponse } from "@/lib/types";

export interface LaporanRingkasan {
  total_pemasukan: number;
  total_pengeluaran: number;
  saldo_bersih: number;
  total_transaksi: number;
  periode: string;
}

export interface LaporanBulanan {
  bulan: string;
  pemasukan: number;
  pengeluaran: number;
  saldo_bersih: number;
}

export async function getLaporanBulanan(
  tahun: number,
  bulan?: number,
): Promise<ApiResponse<LaporanBulanan[]>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("financial_transactions")
    .select("transaction_type, amount, transaction_date");

  if (bulan) {
    // Query untuk satu bulan tertentu
    const startDate = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
    const endDate = new Date(tahun, bulan, 0).toISOString().slice(0, 10);
    query = query
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);
  } else {
    // Query untuk semua bulan dalam setahun
    const startDate = `${tahun}-01-01`;
    const endDate = `${tahun}-12-31`;
    query = query
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);
  }

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };

  // Kelompokkan per bulan
  const monthlyData: Record<
    string,
    { pemasukan: number; pengeluaran: number }
  > = {};

  data.forEach((tx: any) => {
    const month = tx.transaction_date.slice(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { pemasukan: 0, pengeluaran: 0 };
    }
    if (tx.transaction_type === "pemasukan") {
      monthlyData[month].pemasukan += Number(tx.amount);
    } else if (tx.transaction_type === "pengeluaran") {
      monthlyData[month].pengeluaran += Number(tx.amount);
    }
  });

  const result: LaporanBulanan[] = Object.keys(monthlyData)
    .sort()
    .map((month) => ({
      bulan: month,
      pemasukan: monthlyData[month].pemasukan,
      pengeluaran: monthlyData[month].pengeluaran,
      saldo_bersih:
        monthlyData[month].pemasukan - monthlyData[month].pengeluaran,
    }));

  return { data: result, error: null };
}

export async function getLaporanRingkasanPeriode(
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

  const ringkasan = data.reduce(
    (acc, tx) => {
      if (tx.transaction_type === "pemasukan") {
        acc.total_pemasukan += Number(tx.amount);
      } else if (tx.transaction_type === "pengeluaran") {
        acc.total_pengeluaran += Number(tx.amount);
      }
      acc.total_transaksi += 1;
      return acc;
    },
    {
      total_pemasukan: 0,
      total_pengeluaran: 0,
      saldo_bersih: 0,
      total_transaksi: 0,
      periode: `${from_date} s/d ${to_date}`,
    },
  );

  ringkasan.saldo_bersih =
    ringkasan.total_pemasukan - ringkasan.total_pengeluaran;

  return { data: ringkasan, error: null };
}
