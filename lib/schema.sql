-- ============================================================
-- KOPERASI MERAH PUTIH - SUPABASE DATABASE SCHEMA
-- ============================================================
-- Jalankan script ini di Supabase SQL Editor secara berurutan.
-- Pastikan Supabase Auth sudah aktif sebelum menjalankan ini.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABEL USERS (Profil pengguna, extend auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'anggota'
                CHECK (role IN ('admin', 'pengurus', 'anggota')),
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger otomatis update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: buat row di public.users otomatis saat user daftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'anggota')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. TABEL MEMBERS (Anggota Koperasi)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.members (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  member_number  TEXT NOT NULL UNIQUE,  -- Nomor anggota, e.g. "KMP-001"
  full_name      TEXT NOT NULL,
  nik            TEXT UNIQUE,           -- Nomor KTP
  birth_date     DATE,
  gender         TEXT CHECK (gender IN ('L', 'P')),
  address        TEXT,
  phone          TEXT,
  email          TEXT,
  occupation     TEXT,                  -- Pekerjaan
  join_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive', 'suspended')),
  photo_url      TEXT,
  notes          TEXT,
  area           TEXT,
  created_by     UUID REFERENCES public.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_member_number ON public.members(member_number);

-- ============================================================
-- 3. TABEL SAVINGS_ACCOUNTS (Akun Simpanan)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.savings_accounts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id      UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  account_number TEXT NOT NULL UNIQUE,  -- Nomor rekening simpanan
  account_type   TEXT NOT NULL
                   CHECK (account_type IN ('pokok', 'wajib', 'sukarela')),
  balance        NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive', 'closed')),
  opened_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_date    DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER savings_accounts_updated_at
  BEFORE UPDATE ON public.savings_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_savings_accounts_member_id ON public.savings_accounts(member_id);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_type ON public.savings_accounts(account_type);

-- ============================================================
-- 4. TABEL SAVINGS_TRANSACTIONS (Transaksi Simpanan)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.savings_transactions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  savings_account_id   UUID NOT NULL REFERENCES public.savings_accounts(id) ON DELETE RESTRICT,
  member_id            UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  transaction_type     TEXT NOT NULL
                         CHECK (transaction_type IN ('setoran', 'penarikan')),
  amount               NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  balance_before       NUMERIC(15, 2) NOT NULL,
  balance_after        NUMERIC(15, 2) NOT NULL,
  description          TEXT,
  reference_number     TEXT UNIQUE,      -- Nomor referensi transaksi
  transaction_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by           UUID REFERENCES public.users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_txn_account ON public.savings_transactions(savings_account_id);
CREATE INDEX IF NOT EXISTS idx_savings_txn_member ON public.savings_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_savings_txn_date ON public.savings_transactions(transaction_date);

-- ============================================================
-- 5. TABEL LOANS (Pinjaman)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loans (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id         UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  loan_number       TEXT NOT NULL UNIQUE,
  amount            NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  interest_rate     NUMERIC(5, 2) NOT NULL DEFAULT 1.5,
  term_months       INTEGER NOT NULL CHECK (term_months > 0),
  monthly_payment   NUMERIC(15, 2) NOT NULL,
  total_interest    NUMERIC(15, 2) NOT NULL,
  total_payment     NUMERIC(15, 2) NOT NULL,
  paid_amount       NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  remaining_amount  NUMERIC(15, 2) GENERATED ALWAYS AS (total_payment - paid_amount) STORED,
  purpose           TEXT,
  collateral        TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'completed', 'overdue')),
  applied_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_date     DATE,
  disbursement_date DATE,
  due_date          DATE,
  approved_by       UUID REFERENCES public.users(id),
  requested_by      UUID REFERENCES public.users(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_loans_member_id ON public.loans(member_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_loan_number ON public.loans(loan_number);

-- ============================================================
-- 6. TABEL LOAN_PAYMENTS (Angsuran / Pembayaran Pinjaman)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loan_payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id          UUID NOT NULL REFERENCES public.loans(id) ON DELETE RESTRICT,
  installment_no   INTEGER NOT NULL CHECK (installment_no > 0),  -- Angsuran ke-
  due_date         DATE NOT NULL,                                -- Jatuh tempo angsuran
  payment_date     DATE,                                         -- Tanggal dibayar
  principal        NUMERIC(15, 2) NOT NULL,  -- Pokok angsuran
  interest         NUMERIC(15, 2) NOT NULL,  -- Bunga angsuran
  penalty          NUMERIC(15, 2) NOT NULL DEFAULT 0.00,  -- Denda keterlambatan
  total_amount     NUMERIC(15, 2) NOT NULL,  -- Total yang harus dibayar
  paid_amount      NUMERIC(15, 2),           -- Yang sudah dibayar
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid', 'partial', 'overdue')),
  reference_number TEXT UNIQUE,
  notes            TEXT,
  created_by       UUID REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(loan_id, installment_no)
);

CREATE TRIGGER loan_payments_updated_at
  BEFORE UPDATE ON public.loan_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_status ON public.loan_payments(status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_due_date ON public.loan_payments(due_date);

-- ============================================================
-- 7. TABEL APPROVALS (Persetujuan)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.approvals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_type   TEXT NOT NULL
                     CHECK (reference_type IN ('loan', 'savings_withdrawal',
                                               'member_registration', 'member_update')),
  reference_id     UUID NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  amount           NUMERIC(15, 2),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected', 'revision')),
  requested_by     UUID NOT NULL REFERENCES public.users(id),
  reviewed_by      UUID REFERENCES public.users(id),
  review_notes     TEXT,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER approvals_updated_at
  BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_type ON public.approvals(reference_type);
CREATE INDEX IF NOT EXISTS idx_approvals_requested_by ON public.approvals(requested_by);

-- ============================================================
-- 8. TABEL FINANCIAL_TRANSACTIONS (Transaksi Keuangan Umum)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_type  TEXT NOT NULL
                      CHECK (transaction_type IN ('pemasukan', 'pengeluaran', 'transfer')),
  category          TEXT NOT NULL,     -- e.g. 'simpanan', 'pinjaman', 'operasional', 'bunga'
  amount            NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description       TEXT,
  reference_type    TEXT,             -- 'loan_payment', 'savings_transaction', dll
  reference_id      UUID,             -- ID referensi ke tabel lain
  transaction_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by        UUID REFERENCES public.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_txn_type ON public.financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_txn_date ON public.financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_txn_category ON public.financial_transactions(category);

-- ============================================================
-- 9. TABEL NOTIFICATION_PREFS (Preferensi Notifikasi)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  email_notifications       BOOLEAN NOT NULL DEFAULT TRUE,
  sms_notifications         BOOLEAN NOT NULL DEFAULT FALSE,
  loan_due_reminder         BOOLEAN NOT NULL DEFAULT TRUE,
  payment_confirmation      BOOLEAN NOT NULL DEFAULT TRUE,
  new_member_notification   BOOLEAN NOT NULL DEFAULT FALSE,
  loan_approval_update      BOOLEAN NOT NULL DEFAULT TRUE,
  monthly_report            BOOLEAN NOT NULL DEFAULT FALSE,
  push_notifications        BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_days_before      INTEGER NOT NULL DEFAULT 3,  -- Hari pengingat sebelum jatuh tempo
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER notification_prefs_updated_at
  BEFORE UPDATE ON public.notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 10. TABEL NOTIFICATION_READS (Status Baca Notifikasi - BARU)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  approval_id  UUID NOT NULL REFERENCES public.approvals(id) ON DELETE CASCADE,
  read_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, approval_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON public.notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_approval_id ON public.notification_reads(approval_id);

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS pada semua tabel
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Helper function: ambil role user saat ini
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: cek apakah admin/pengurus
CREATE OR REPLACE FUNCTION public.is_admin_or_pengurus()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'pengurus')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- USERS policies ----
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid() OR public.is_admin_or_pengurus());
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid() OR public.current_user_role() = 'admin');
CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT WITH CHECK (public.current_user_role() = 'admin' OR id = auth.uid());

-- ---- MEMBERS policies ----
CREATE POLICY "members_select" ON public.members
  FOR SELECT USING (
    public.is_admin_or_pengurus()
    OR user_id = auth.uid()
  );
CREATE POLICY "members_insert" ON public.members
  FOR INSERT WITH CHECK (public.is_admin_or_pengurus());
CREATE POLICY "members_update" ON public.members
  FOR UPDATE USING (public.is_admin_or_pengurus());
CREATE POLICY "members_delete" ON public.members
  FOR DELETE USING (public.current_user_role() = 'admin');

-- ---- SAVINGS_ACCOUNTS policies ----
CREATE POLICY "savings_accounts_select" ON public.savings_accounts
  FOR SELECT USING (
    public.is_admin_or_pengurus()
    OR member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );
CREATE POLICY "savings_accounts_insert" ON public.savings_accounts
  FOR INSERT WITH CHECK (public.is_admin_or_pengurus());
CREATE POLICY "savings_accounts_update" ON public.savings_accounts
  FOR UPDATE USING (public.is_admin_or_pengurus());

-- ---- SAVINGS_TRANSACTIONS policies ----
CREATE POLICY "savings_txn_select" ON public.savings_transactions
  FOR SELECT USING (
    public.is_admin_or_pengurus()
    OR member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );
CREATE POLICY "savings_txn_insert" ON public.savings_transactions
  FOR INSERT WITH CHECK (public.is_admin_or_pengurus());

-- ---- LOANS policies ----
CREATE POLICY "loans_select" ON public.loans
  FOR SELECT USING (
    public.is_admin_or_pengurus()
    OR member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );
CREATE POLICY "loans_insert" ON public.loans
  FOR INSERT WITH CHECK (
    public.is_admin_or_pengurus()
    OR member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );
CREATE POLICY "loans_update" ON public.loans
  FOR UPDATE USING (public.is_admin_or_pengurus());

-- ---- LOAN_PAYMENTS policies ----
CREATE POLICY "loan_payments_select" ON public.loan_payments
  FOR SELECT USING (
    public.is_admin_or_pengurus()
    OR loan_id IN (
      SELECT l.id FROM public.loans l
      JOIN public.members m ON m.id = l.member_id
      WHERE m.user_id = auth.uid()
    )
  );
CREATE POLICY "loan_payments_insert" ON public.loan_payments
  FOR INSERT WITH CHECK (public.is_admin_or_pengurus());
CREATE POLICY "loan_payments_update" ON public.loan_payments
  FOR UPDATE USING (public.is_admin_or_pengurus());

-- ---- APPROVALS policies ----
CREATE POLICY "approvals_select" ON public.approvals
  FOR SELECT USING (
    public.is_admin_or_pengurus()
    OR requested_by = auth.uid()
  );
CREATE POLICY "approvals_insert" ON public.approvals
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "approvals_update" ON public.approvals
  FOR UPDATE USING (public.is_admin_or_pengurus());

-- ---- FINANCIAL_TRANSACTIONS policies ----
CREATE POLICY "financial_txn_select" ON public.financial_transactions
  FOR SELECT USING (public.is_admin_or_pengurus());
CREATE POLICY "financial_txn_insert" ON public.financial_transactions
  FOR INSERT WITH CHECK (public.is_admin_or_pengurus());

-- ---- NOTIFICATION_PREFS policies ----
CREATE POLICY "notif_prefs_select" ON public.notification_prefs
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin_or_pengurus());
CREATE POLICY "notif_prefs_insert" ON public.notification_prefs
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_prefs_update" ON public.notification_prefs
  FOR UPDATE USING (user_id = auth.uid());

-- ---- NOTIFICATION_READS policies ----
CREATE POLICY "notification_reads_select" ON public.notification_reads
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notification_reads_insert" ON public.notification_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "notification_reads_delete" ON public.notification_reads
  FOR DELETE USING (user_id = auth.uid());


-- ============================================================
-- 12. VIEWS BERGUNA (Optional)
-- ============================================================

-- View: ringkasan anggota + total simpanan
CREATE OR REPLACE VIEW public.v_member_summary AS
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

-- View: angsuran mendekati jatuh tempo (7 hari ke depan)
CREATE OR REPLACE VIEW public.v_upcoming_payments AS
SELECT
  lp.*,
  l.loan_number,
  l.member_id,
  m.full_name AS member_name,
  m.phone AS member_phone
FROM public.loan_payments lp
JOIN public.loans l ON l.id = lp.loan_id
JOIN public.members m ON m.id = l.member_id
WHERE lp.status IN ('pending', 'overdue')
  AND lp.due_date <= CURRENT_DATE + INTERVAL '7 days';

-- ============================================================
-- 13. FUNGSI HELPER BISNIS
-- ============================================================

-- Auto-generate nomor anggota
--
-- PENTING: SECURITY DEFINER wajib. Fungsi ini membaca tabel yang ber-RLS;
-- tanpa SECURITY DEFINER, anggota biasa hanya "melihat" barisnya sendiri
-- sehingga nomor urut yang dihasilkan bentrok dengan nomor milik orang lain.
-- Nomor urut diambil dari MAX nomor terbit (bukan COUNT) agar penghapusan
-- baris tidak menyebabkan nomor dipakai ulang.
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

-- Auto-generate nomor pinjaman
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

-- Auto-generate nomor rekening simpanan
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

  SELECT COALESCE(MAX((SUBSTRING(account_number FROM '([0-9]+)$'))::INTEGER), 0) + 1
    INTO v_next
    FROM public.savings_accounts
   WHERE account_number LIKE v_prefix || '%';

  RETURN v_prefix || LPAD(v_next::TEXT, 6, '0');
END;
$$;

-- Hitung jadwal angsuran pinjaman (mengembalikan tabel)
--
-- Angsuran terakhir menyerap sisa pembulatan sehingga:
--   SUM(principal)    = loans.amount
--   SUM(interest)     = loans.total_interest
--   SUM(total_amount) = loans.total_payment
-- Tanpa ini, pembayaran angsuran terakhir menyisakan selisih sen dan status
-- pinjaman tidak pernah berubah menjadi 'completed'.
CREATE OR REPLACE FUNCTION public.calculate_loan_schedule(
  p_loan_id UUID
)
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
  -- tanpa COALESCE due_date jadi NULL → pelanggaran NOT NULL saat insert.
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

GRANT EXECUTE ON FUNCTION public.generate_member_number()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_loan_number()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_savings_account_number(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_loan_schedule(UUID)         TO authenticated;

-- Index pola prefix: btree default memakai collation locale sehingga tidak
-- terpakai untuk LIKE 'PJM-2026-%'. text_pattern_ops menjaga generator tetap
-- cepat saat data sudah banyak.
CREATE INDEX IF NOT EXISTS idx_loans_loan_number_pattern
  ON public.loans (loan_number text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_members_member_number_pattern
  ON public.members (member_number text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_number_pattern
  ON public.savings_accounts (account_number text_pattern_ops);

-- ============================================================
-- SELESAI
-- ============================================================
-- Tabel yang telah dibuat:
-- 1. users
-- 2. members
-- 3. savings_accounts
-- 4. savings_transactions
-- 5. loans
-- 6. loan_payments
-- 7. approvals
-- 8. financial_transactions
-- 9. notification_prefs
-- 10. notification_reads (BARU)
-- ============================================================