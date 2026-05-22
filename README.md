This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or# 📦 Koperasi Merah Putih — Database & API Documentation

## 🗄️ Struktur Database Supabase

### Ringkasan Tabel

| # | Tabel | Deskripsi |
|---|-------|-----------|
| 1 | `users` | Profil pengguna (extend auth.users) |
| 2 | `members` | Data anggota koperasi |
| 3 | `savings_accounts` | Rekening simpanan (pokok/wajib/sukarela) |
| 4 | `savings_transactions` | Setoran & penarikan simpanan |
| 5 | `loans` | Data pinjaman anggota |
| 6 | `loan_payments` | Jadwal & catatan angsuran |
| 7 | `approvals` | Alur persetujuan (pinjaman, dll) |
| 8 | `financial_transactions` | Buku kas umum koperasi |
| 9 | `notification_prefs` | Preferensi notifikasi per user |

---

## 📐 Detail Kolom Per Tabel

### 1. `users`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | UUID PK | Sama dengan auth.users.id |
| `email` | TEXT UNIQUE | Email login |
| `full_name` | TEXT | Nama lengkap |
| `phone` | TEXT | Nomor HP |
| `role` | TEXT | `admin` / `pengurus` / `anggota` |
| `avatar_url` | TEXT | URL foto profil |
| `is_active` | BOOLEAN | Status aktif user |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-update via trigger |

### 2. `members`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | UUID PK | |
| `user_id` | UUID FK→users | Akun login terkait |
| `member_number` | TEXT UNIQUE | Nomor anggota (e.g. KMP-2025-0001) |
| `full_name` | TEXT | Nama lengkap |
| `nik` | TEXT UNIQUE | Nomor KTP |
| `birth_date` | DATE | Tanggal lahir |
| `gender` | TEXT | `L` / `P` |
| `address` | TEXT | Alamat lengkap |
| `phone` | TEXT | Nomor HP |
| `email` | TEXT | Email anggota |
| `occupation` | TEXT | Pekerjaan |
| `join_date` | DATE | Tanggal bergabung |
| `status` | TEXT | `active` / `inactive` / `suspended` |
| `photo_url` | TEXT | Foto anggota |
| `notes` | TEXT | Catatan tambahan |
| `created_by` | UUID FK→users | Ditambahkan oleh |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 3. `savings_accounts`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | UUID PK | |
| `member_id` | UUID FK→members | Pemilik rekening |
| `account_number` | TEXT UNIQUE | Nomor rekening (e.g. SPK-000001) |
| `account_type` | TEXT | `pokok` / `wajib` / `sukarela` |
| `balance` | NUMERIC(15,2) | Saldo saat ini |
| `status` | TEXT | `active` / `inactive` / `closed` |
| `opened_date` | DATE | Tanggal buka rekening |
| `closed_date` | DATE | Tanggal tutup rekening |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 4. `savings_transactions`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | UUID PK | |
| `savings_account_id` | UUID FK→savings_accounts | Rekening terkait |
| `member_id` | UUID FK→members | Pemilik |
| `transaction_type` | TEXT | `setoran` / `penarikan` |
| `amount` | NUMERIC(15,2) | Jumlah transaksi |
| `balance_before` | NUMERIC(15,2) | Saldo sebelum |
| `balance_after` | NUMERIC(15,2) | Saldo sesudah |
| `description` | TEXT | Keterangan |
| `reference_number` | TEXT UNIQUE | Nomor referensi |
| `transaction_date` | DATE | Tanggal transaksi |
| `created_by` | UUID FK→users | Dicatat oleh |
| `created_at` | TIMESTAMPTZ | |

### 5. `loans`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | UUID PK | |
| `member_id` | UUID FK→members | Peminjam |
| `loan_number` | TEXT UNIQUE | Nomor pinjaman (e.g. PJM-2025-0001) |
| `amount` | NUMERIC(15,2) | Pokok pinjaman |
| `interest_rate` | NUMERIC(5,2) | Bunga % per bulan (default 1.5%) |
| `term_months` | INTEGER | Jangka waktu (bulan) |
| `monthly_payment` | NUMERIC(15,2) | Angsuran per bulan |
| `total_interest` | NUMERIC(15,2) | Total bunga |
| `total_payment` | NUMERIC(15,2) | Total yang harus dibayar |
| `paid_amount` | NUMERIC(15,2) | Sudah terbayar |
| `remaining_amount` | NUMERIC (generated) | Sisa = total_payment - paid_amount |
| `purpose` | TEXT | Tujuan pinjaman |
| `collateral` | TEXT | Jaminan |
| `status` | TEXT | `pending`/`approved`/`rejected`/`active`/`completed`/`overdue` |
| `applied_date` | DATE | Tanggal pengajuan |
| `approved_date` | DATE | Tanggal disetujui |
| `disbursement_date` | DATE | Tanggal pencairan |
| `due_date` | DATE | Jatuh tempo akhir |
| `approved_by` | UUID FK→users | Disetujui oleh |
| `notes` | TEXT | Catatan |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 6. `loan_payments`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | UUID PK | |
| `loan_id` | UUID FK→loans | Pinjaman terkait |
| `installment_no` | INTEGER | Angsuran ke- |
| `due_date` | DATE | Jatuh tempo angsuran |
| `payment_date` | DATE | Tanggal bayar (nullable) |
| `principal` | NUMERIC(15,2) | Pokok angsuran |
| `interest` | NUMERIC(15,2) | Bunga angsuran |
| `penalty` | NUMERIC(15,2) | Denda keterlambatan |
| `total_amount` | NUMERIC(15,2) | Total tagihan |
| `paid_amount` | NUMERIC(15,2) | Yang dibayar |
| `status` | TEXT | `pending`/`paid`/`partial`/`overdue` |
| `reference_number` | TEXT UNIQUE | Nomor bukti bayar |
| `notes` | TEXT | |
| `created_by` | UUID FK→users | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 7. `approvals`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | UUID PK | |
| `reference_type` | TEXT | `loan`/`savings_withdrawal`/`member_registration`/`member_update` |
| `reference_id` | UUID | ID di tabel referensi |
| `title` | TEXT | Judul permohonan |
| `description` | TEXT | Deskripsi |
| `status` | TEXT | `pending`/`approved`/`rejected`/`revision` |
| `requested_by` | UUID FK→users | Pemohon |
| `reviewed_by` | UUID FK→users | Reviewer |
| `review_notes` | TEXT | Catatan reviewer |
| `reviewed_at` | TIMESTAMPTZ | Waktu review |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 8. `financial_transactions`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | UUID PK | |
| `transaction_type` | TEXT | `pemasukan`/`pengeluaran`/`transfer` |
| `category` | TEXT | `simpanan`/`pinjaman`/`operasional`/`bunga` |
| `amount` | NUMERIC(15,2) | Nominal |
| `description` | TEXT | Keterangan |
| `reference_type` | TEXT | Referensi asal (opsional) |
| `reference_id` | UUID | ID referensi (opsional) |
| `transaction_date` | DATE | Tanggal |
| `created_by` | UUID FK→users | |
| `created_at` | TIMESTAMPTZ | |

### 9. `notification_prefs`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | UUID PK | |
| `user_id` | UUID UNIQUE FK→users | |
| `email_notifications` | BOOLEAN | Notif via email |
| `sms_notifications` | BOOLEAN | Notif via SMS |
| `loan_due_reminder` | BOOLEAN | Pengingat jatuh tempo |
| `payment_confirmation` | BOOLEAN | Konfirmasi pembayaran |
| `new_member_notification` | BOOLEAN | Ada anggota baru |
| `loan_approval_update` | BOOLEAN | Update status pinjaman |
| `monthly_report` | BOOLEAN | Laporan bulanan |
| `reminder_days_before` | INTEGER | Hari sebelum jatuh tempo |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 🔗 Relasi Antar Tabel

```

auth.users (Supabase Auth)
└── users (profil)
└── members (1 user → 1 member)
├── savings_accounts (1 member → banyak rekening)
│ └── savings_transactions (1 rekening → banyak transaksi)
└── loans (1 member → banyak pinjaman)
└── loan_payments (1 pinjaman → banyak angsuran)

users ←── approvals (requested_by, reviewed_by)
users ←── notification_prefs (1 user → 1 preferensi)
financial_transactions ← dicatat otomatis dari savings_transactions & loan_payments

````

---

## 🌐 API Endpoints

### Members
| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/members` | Daftar anggota (paginasi, search, filter) | admin, pengurus |
| POST | `/api/members` | Tambah anggota baru | admin, pengurus |
| GET | `/api/members/[id]` | Detail anggota | admin, pengurus, anggota (diri sendiri) |
| PUT | `/api/members/[id]` | Update data anggota | admin, pengurus |
| DELETE | `/api/members/[id]` | Nonaktifkan anggota | admin |

### Loans
| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/loans` | Daftar pinjaman | admin, pengurus, anggota (milik sendiri) |
| POST | `/api/loans` | Ajukan pinjaman baru | semua (auto-create approval) |
| GET | `/api/loans/[id]` | Detail pinjaman + jadwal angsuran | |
| PUT | `/api/loans/[id]` | Update / approve / reject / disburse | admin, pengurus |

**Aksi PUT Loans (`action` field):**
- `approve` — Setujui pinjaman
- `reject` — Tolak pinjaman
- `disburse` — Cairkan pinjaman (otomatis buat jadwal angsuran)

### Loan Payments
| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/loan-payments` | Daftar angsuran (filter by loanId, status) | |
| POST | `/api/loan-payments` | Catat pembayaran angsuran (auto-hitung denda) | admin, pengurus |
| GET | `/api/loan-payments/[id]` | Detail angsuran | |
| PUT | `/api/loan-payments/[id]` | Update angsuran | admin, pengurus |

### Savings Accounts
| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/savings-accounts` | Daftar rekening simpanan | |
| POST | `/api/savings-accounts` | Buka rekening baru | admin, pengurus |
| GET | `/api/savings-accounts/[id]` | Detail rekening + riwayat transaksi | |
| PUT | `/api/savings-accounts/[id]` | Ubah status rekening | admin, pengurus |

### Savings Transactions
| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/savings-transactions` | Riwayat transaksi simpanan | |
| POST | `/api/savings-transactions` | Setoran / Penarikan | admin, pengurus |
| GET | `/api/savings-transactions/[id]` | Detail transaksi | |

### Approvals
| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/approvals` | Daftar permohonan | admin, pengurus (semua); anggota (milik sendiri) |
| GET | `/api/approvals/[id]` | Detail permohonan | |
| PUT | `/api/approvals/[id]` | Review (approve/reject/revision) | admin, pengurus |

### Financial Transactions
| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/financial-transactions` | Laporan keuangan umum | admin, pengurus |
| POST | `/api/financial-transactions` | Catat transaksi manual | admin, pengurus |
| GET | `/api/financial-transactions/[id]` | Detail transaksi | admin, pengurus |

### Users
| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/users` | Daftar pengguna | admin, pengurus |
| GET | `/api/users/[id]` | Detail profil + notif prefs | |
| PUT | `/api/users/[id]` | Update profil | diri sendiri / admin |

### Notification Preferences
| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| GET | `/api/notification-prefs` | Ambil preferensi sendiri | semua |
| PUT | `/api/notification-prefs` | Simpan preferensi | semua |
| GET | `/api/notification-prefs/[id]` | Detail preferensi | |
| PUT | `/api/notification-prefs/[id]` | Update preferensi | diri sendiri |

---

## ⚙️ Setup & Cara Pakai

### 1. Environment Variables
Tambahkan ke `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
````

### 2. Jalankan SQL Schema

Buka Supabase Dashboard → SQL Editor → paste isi file `sql/001_schema.sql` → Run.

### 3. Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 4. Salin File ke Project

```
lib/supabase.ts          → salin ke app/lib/supabase.ts
lib/api-helpers.ts       → salin ke app/lib/api-helpers.ts
types/database.ts        → salin ke types/database.ts
api/members/route.ts     → salin ke app/api/members/route.ts
api/members/[id]/...     → salin ke app/api/members/[id]/route.ts
... (dst untuk semua folder api)
```

---

## 🔄 Alur Bisnis Utama

### Pendaftaran Anggota

```
POST /api/members
  → Validasi data
  → Generate nomor anggota (KMP-YYYY-XXXX)
  → Insert ke members
  → (Opsional) Buka simpanan pokok otomatis
```

### Pengajuan Pinjaman

```
POST /api/loans
  → Cek anggota aktif
  → Cek tidak ada pinjaman aktif
  → Hitung angsuran (flat rate)
  → Generate nomor pinjaman (PJM-YYYY-XXXX)
  → Insert ke loans (status: pending)
  → Auto-create approval record
```

### Persetujuan & Pencairan Pinjaman

```
PUT /api/loans/[id] { action: "approve" }
  → Update loans.status = approved
  → Update approvals.status = approved

PUT /api/loans/[id] { action: "disburse" }
  → Update loans.status = active
  → Generate loan_payments (jadwal per bulan)
  → Catat ke financial_transactions (pengeluaran)
```

### Pembayaran Angsuran

```
POST /api/loan-payments { loan_payment_id, paid_amount }
  → Ambil data angsuran
  → Hitung denda jika telat (0.1%/hari)
  → Update loan_payments.status = paid/partial
  → Update loans.paid_amount
  → Jika lunas: loans.status = completed
  → Catat ke financial_transactions (pemasukan)
```

### Transaksi Simpanan

```
POST /api/savings-transactions { savings_account_id, transaction_type, amount }
  → Cek rekening aktif
  → Cek saldo cukup (untuk penarikan)
  → Insert savings_transactions (dengan balance_before/after)
  → Update savings_accounts.balance
  → Catat ke financial_transactions
```

pnpm dev

# or

bun dev

```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
```
