-- ============================================================
-- MIGRATION 001 — Perbaikan generator nomor unik, jadwal angsuran,
--                 dan integritas data pinjaman
-- ============================================================
-- Jalankan SELURUH file ini di Supabase SQL Editor (sekali jalan).
-- Aman dijalankan berulang (idempotent).
--
-- ─── MASALAH YANG DIPERBAIKI ────────────────────────────────
--
-- [1] duplicate key value violates unique constraint "loans_loan_number_key"
--
--     generate_loan_number() lama memakai `SELECT COUNT(*) + 1 FROM loans`
--     TANPA `SECURITY DEFINER`, sehingga:
--
--     a) RLS ikut berlaku saat menghitung. Anggota biasa hanya bisa SELECT
--        pinjaman miliknya sendiri (policy "loans_select"), jadi COUNT(*)
--        yang terlihat hanya 0-1 → fungsi mengembalikan 'PJM-2026-0001'
--        yang sudah dipakai anggota lain → duplicate key.
--        INI PENYEBAB UTAMA error "Gagal Mengajukan".
--     b) COUNT(*) menghitung semua tahun padahal nomor mengandung tahun,
--        jadi nomor tidak reset dan bisa bentrok saat ganti tahun.
--     c) Nomor yang barisnya dihapus dipakai ulang (COUNT turun) → bentrok.
--
--     Perbaikan: SECURITY DEFINER (abaikan RLS) + ambil MAX nomor urut yang
--     sudah terbit untuk prefix tahun berjalan, bukan COUNT(*).
--     Bug & perbaikan yang sama berlaku untuk generate_member_number() dan
--     generate_savings_account_number().
--
-- [2] Pinjaman tidak pernah jadi 'completed' walau semua angsuran lunas.
--     calculate_loan_schedule() membulatkan tiap angsuran, sehingga
--     SUM(total_amount) angsuran ≠ loans.total_payment (selisih sen).
--
-- [3] loan_payments belum punya UNIQUE(loan_id, installment_no) di DB live.
--     Akibatnya angsuran ke-N bisa terinsert ganda, dan pengecekan
--     .maybeSingle() di createLoanPayment error saat ada duplikat.
--
-- [4] loans.remaining_amount di DB live bukan kolom GENERATED, hanya kolom
--     biasa dengan DEFAULT. Nilainya dihitung sekali saat insert lalu basi:
--     sisa pinjaman tidak pernah berkurang walau anggota sudah mengangsur.
--
-- [5] paid_amount ganda karena createLoanPayment lama menambah secara
--     akumulatif (angsuran partial → paid terhitung dua kali).
-- ============================================================


-- ============================================================
-- 1. GENERATOR NOMOR UNIK
-- ============================================================

-- Nomor anggota: KMP-<tahun>-<urut 4 digit>
CREATE OR REPLACE FUNCTION public.generate_member_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT := 'KMP-' || TO_CHAR(NOW(), 'YYYY') || '-';
  v_next   INTEGER;
BEGIN
  SELECT COALESCE(MAX((SUBSTRING(member_number FROM '([0-9]+)$'))::INTEGER), 0) + 1
    INTO v_next
    FROM public.members
   WHERE member_number LIKE v_prefix || '%';

  RETURN v_prefix || LPAD(v_next::TEXT, 4, '0');
END;
$$;

-- Nomor pinjaman: PJM-<tahun>-<urut 4 digit>
CREATE OR REPLACE FUNCTION public.generate_loan_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT := 'PJM-' || TO_CHAR(NOW(), 'YYYY') || '-';
  v_next   INTEGER;
BEGIN
  SELECT COALESCE(MAX((SUBSTRING(loan_number FROM '([0-9]+)$'))::INTEGER), 0) + 1
    INTO v_next
    FROM public.loans
   WHERE loan_number LIKE v_prefix || '%';

  RETURN v_prefix || LPAD(v_next::TEXT, 4, '0');
END;
$$;

-- Nomor rekening simpanan: <SPK|SWB|SSK|SMP>-<urut 6 digit>
CREATE OR REPLACE FUNCTION public.generate_savings_account_number(p_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_next   INTEGER;
BEGIN
  v_prefix := CASE p_type
    WHEN 'pokok'    THEN 'SPK'
    WHEN 'wajib'    THEN 'SWB'
    WHEN 'sukarela' THEN 'SSK'
    ELSE 'SMP'
  END || '-';

  -- Berdasarkan prefix nomor, bukan account_type: nomor yang sudah terbit
  -- tetap dihormati walau baris lain dihapus / tipenya diubah.
  SELECT COALESCE(MAX((SUBSTRING(account_number FROM '([0-9]+)$'))::INTEGER), 0) + 1
    INTO v_next
    FROM public.savings_accounts
   WHERE account_number LIKE v_prefix || '%';

  RETURN v_prefix || LPAD(v_next::TEXT, 6, '0');
END;
$$;


-- ============================================================
-- 2. JADWAL ANGSURAN — konsisten dengan total di tabel loans
-- ============================================================
-- Angsuran terakhir menyerap sisa pembulatan sehingga:
--   SUM(principal)    = loans.amount
--   SUM(interest)     = loans.total_interest
--   SUM(total_amount) = loans.total_payment
CREATE OR REPLACE FUNCTION public.calculate_loan_schedule(p_loan_id UUID)
RETURNS TABLE (
  installment_no   INTEGER,
  due_date         DATE,
  principal        NUMERIC,
  interest         NUMERIC,
  total_amount     NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan          RECORD;
  v_start         DATE;
  v_principal     NUMERIC;
  v_interest      NUMERIC;
  v_acc_principal NUMERIC := 0;
  v_acc_interest  NUMERIC := 0;
  i               INTEGER;
BEGIN
  SELECT * INTO v_loan FROM public.loans WHERE id = p_loan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan not found: %', p_loan_id;
  END IF;

  -- disbursement_date bisa masih NULL bila dipanggil sebelum pencairan;
  -- tanpa COALESCE, due_date jadi NULL → pelanggaran NOT NULL saat insert.
  v_start := COALESCE(v_loan.disbursement_date, v_loan.approved_date, CURRENT_DATE);

  v_principal := ROUND(v_loan.amount / v_loan.term_months, 2);
  v_interest  := ROUND(v_loan.total_interest / v_loan.term_months, 2);

  FOR i IN 1..v_loan.term_months LOOP
    installment_no := i;
    -- date + interval month otomatis dijepit ke akhir bulan
    -- (31 Jan + 1 month = 28/29 Feb), tidak meluber seperti di JavaScript.
    due_date := (v_start + (i || ' months')::INTERVAL)::DATE;

    IF i < v_loan.term_months THEN
      principal := v_principal;
      interest  := v_interest;
    ELSE
      principal := ROUND(v_loan.amount - v_acc_principal, 2);
      interest  := ROUND(v_loan.total_interest - v_acc_interest, 2);
    END IF;

    v_acc_principal := v_acc_principal + principal;
    v_acc_interest  := v_acc_interest  + interest;

    total_amount := principal + interest;
    RETURN NEXT;
  END LOOP;
END;
$$;


-- ============================================================
-- 3. HAK EKSEKUSI
-- ============================================================
GRANT EXECUTE ON FUNCTION public.generate_member_number()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_loan_number()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_savings_account_number(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_loan_schedule(UUID)         TO authenticated;


-- ============================================================
-- 4. INDEX POLA PREFIX
-- ============================================================
-- Index btree default memakai collation locale sehingga tidak terpakai untuk
-- LIKE 'PJM-2026-%'. text_pattern_ops menjaga generator tetap cepat.
CREATE INDEX IF NOT EXISTS idx_loans_loan_number_pattern
  ON public.loans (loan_number text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_members_member_number_pattern
  ON public.members (member_number text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_number_pattern
  ON public.savings_accounts (account_number text_pattern_ops);


-- ============================================================
-- 5. loan_payments: bersihkan duplikat lalu pasang UNIQUE
-- ============================================================
-- Sisakan satu baris per (loan_id, installment_no): utamakan yang sudah
-- 'paid', lalu yang punya payment_date terbaru, lalu yang paling awal dibuat.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY loan_id, installment_no
           ORDER BY (status = 'paid') DESC,
                    payment_date DESC NULLS LAST,
                    created_at ASC
         ) AS rn
    FROM public.loan_payments
)
DELETE FROM public.loan_payments lp
 USING ranked r
 WHERE lp.id = r.id
   AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.loan_payments'::regclass
       AND contype  = 'u'
       AND conkey   = ARRAY[
             (SELECT attnum FROM pg_attribute
               WHERE attrelid = 'public.loan_payments'::regclass
                 AND attname = 'loan_id'),
             (SELECT attnum FROM pg_attribute
               WHERE attrelid = 'public.loan_payments'::regclass
                 AND attname = 'installment_no')
           ]::smallint[]
  ) THEN
    ALTER TABLE public.loan_payments
      ADD CONSTRAINT loan_payments_loan_id_installment_no_key
      UNIQUE (loan_id, installment_no);
  END IF;
END $$;


-- ============================================================
-- 6. loans.remaining_amount → kolom GENERATED yang benar
-- ============================================================
-- Di DB live kolom ini hanya punya DEFAULT (total_payment - paid_amount),
-- artinya dihitung sekali saat INSERT lalu tidak pernah ikut berubah saat
-- anggota mengangsur. Semua tampilan "Sisa" dan total outstanding di laporan
-- jadi salah. Ubah menjadi GENERATED ALWAYS ... STORED agar selalu akurat.
DO $$
DECLARE
  v_is_generated TEXT;
BEGIN
  SELECT is_generated
    INTO v_is_generated
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'loans'
     AND column_name  = 'remaining_amount';

  IF v_is_generated IS NULL THEN
    -- Kolom belum ada sama sekali.
    ALTER TABLE public.loans
      ADD COLUMN remaining_amount NUMERIC(15, 2)
      GENERATED ALWAYS AS (total_payment - paid_amount) STORED;

  ELSIF v_is_generated <> 'ALWAYS' THEN
    -- Kolom biasa → harus dibuang dulu. View yang memakainya ikut di-drop
    -- lalu dibuat ulang di bawah.
    DROP VIEW IF EXISTS public.v_member_summary;
    ALTER TABLE public.loans DROP COLUMN remaining_amount;
    ALTER TABLE public.loans
      ADD COLUMN remaining_amount NUMERIC(15, 2)
      GENERATED ALWAYS AS (total_payment - paid_amount) STORED;
  END IF;
END $$;

-- Buat ulang view (idempotent, dan pasti ada setelah blok di atas).
DROP VIEW IF EXISTS public.v_member_summary;
CREATE VIEW public.v_member_summary AS
SELECT
  m.id,
  m.member_number,
  m.full_name,
  m.phone,
  m.status,
  m.join_date,
  COALESCE(SUM(sa.balance), 0) AS total_savings,
  COUNT(DISTINCT sa.id) AS savings_account_count,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') AS active_loans,
  COALESCE(SUM(l.remaining_amount) FILTER (WHERE l.status = 'active'), 0) AS total_loan_outstanding
FROM public.members m
LEFT JOIN public.savings_accounts sa ON sa.member_id = m.id AND sa.status = 'active'
LEFT JOIN public.loans l ON l.member_id = m.id
GROUP BY m.id, m.member_number, m.full_name, m.phone, m.status, m.join_date;


-- ============================================================
-- 7. Sinkronkan ulang paid_amount & status pinjaman
-- ============================================================
-- createLoanPayment lama menambah paid_amount secara akumulatif, sehingga
-- angsuran yang dibayar dua kali (partial → paid) terhitung ganda.
-- Hitung ulang dari angsuran yang benar-benar tercatat dibayar.
UPDATE public.loans l
   SET paid_amount = COALESCE(s.total_paid, 0)
  FROM (
    SELECT loan_id, SUM(COALESCE(paid_amount, 0)) AS total_paid
      FROM public.loan_payments
     WHERE status IN ('paid', 'partial')
     GROUP BY loan_id
  ) s
 WHERE s.loan_id = l.id
   AND l.paid_amount <> COALESCE(s.total_paid, 0);

-- Pinjaman yang ternyata sudah lunas tapi status-nya masih jalan.
UPDATE public.loans
   SET status = 'completed'
 WHERE status IN ('active', 'overdue')
   AND paid_amount >= total_payment;

-- ============================================================
-- SELESAI
-- ============================================================
