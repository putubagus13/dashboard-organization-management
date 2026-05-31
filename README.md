# STT Tunas Guna Dharma — Sistem Manajemen Organisasi

Aplikasi manajemen organisasi berbasis web untuk STT Tunas Guna Dharma, dibangun dengan Next.js 15, TypeScript, dan Supabase.

## 🚀 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 15 (App Router, fullstack) |
| Language | TypeScript (strict, no `any`) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Styling | Tailwind CSS (Bento Box Design) |
| Fonts | Plus Jakarta Sans + Sora |

---

## 📋 Fitur Utama

### 1. Autentikasi
- Login/Register dengan email & password
- Login dengan Google OAuth
- Forgot password & Reset password
- Role-based access: `superadmin`, `admin`, `treasurer`, `secretary`, `member`

### 2. Manajemen Anggota
- CRUD lengkap data anggota
- Nomor anggota otomatis (STT0001, STT0002, ...)
- Filter berdasarkan status, jabatan, keaktifan
- Detail anggota: riwayat iuran & kehadiran
- Tracking poin keaktifan

### 3. Pengelolaan Kas
- Multi-rekening kas (Kas Utama, Kas Sosial, Dana Cadangan, dll.)
- Catatan transaksi pemasukan & pengeluaran
- Manajemen donatur dengan total donasi
- Pinjaman (loans) dengan cicilan, bunga, dan tracking progress
- Saldo otomatis terupdate via database trigger

### 4. Absensi Rapat
- Buat & kelola jadwal rapat (fleksibel)
- Input kehadiran per-anggota: Hadir / Tidak Hadir / Izin / Sakit
- Konversi kehadiran ke poin keaktifan (configurable)
- Statistik kehadiran per rapat

### 5. Iuran Anggota
- Nominal iuran berbeda per status anggota (configurable)
- Pencatatan per-periode (bulan/tahun)
- Status: Lunas / Belum Bayar / Dibebaskan
- Konfigurasi poin untuk setiap aksi (kehadiran, iuran, dll.)
- Laporan bulanan iuran

### 6. Bank Sampah 🌿
- Catat sesi pengumpulan sampah
- Multi-jenis sampah dengan harga per kg (configurable)
- Pencatatan per-rumah (KK), anggota maupun non-anggota
- Kalkulasi otomatis berat & nilai
- **Leaderboard** pengepul terbanyak (all-time, bulanan, tahunan)
- Podium visual untuk Top 3

---

## 🗄️ Skema Database

```
profiles              → User accounts & roles
member_status_types   → Jenis status anggota
members               → Data anggota lengkap
cash_accounts         → Rekening kas
transaction_categories→ Kategori transaksi
donors                → Data donatur
cash_transactions     → Semua transaksi keuangan
loans                 → Pinjaman
loan_payments         → Cicilan pinjaman
meetings              → Jadwal rapat
attendance            → Absensi rapat
dues_settings         → Nominal iuran per status
dues_payments         → Pembayaran iuran bulanan
points_config         → Konfigurasi poin keaktifan
waste_collectors      → Data pengepul sampah
waste_types           → Jenis & harga sampah
waste_collection_sessions → Sesi pengumpulan
waste_collections     → Catatan per-rumah per-sesi
waste_collection_items → Detail item sampah
```

---

## ⚙️ Setup & Installation

### 1. Clone & Install
```bash
git clone <repo-url>
cd stt-tunas-guna-dharma
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env.local
```
Isi nilai berikut di `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Setup Supabase
Di Supabase Dashboard:
1. Buat project baru
2. Masuk ke **SQL Editor**
3. Jalankan migration secara berurutan:
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_rls_policies.sql
   supabase/migrations/003_seed_data.sql
   ```
4. Aktifkan Google OAuth di **Authentication → Providers → Google**
5. Tambahkan redirect URL: `https://your-domain.com/api/auth/callback`

### 4. Jalankan Aplikasi
```bash
npm run dev
# Buka http://localhost:3000
```

---

## 📁 Struktur Project

```
src/
├── app/
│   ├── (auth)/          # Login, Register, Forgot/Reset Password
│   ├── (dashboard)/     # Semua halaman setelah login
│   │   ├── dashboard/   # Halaman utama
│   │   ├── members/     # Manajemen anggota
│   │   ├── finance/     # Keuangan (transaksi, pinjaman, donatur)
│   │   ├── attendance/  # Absensi rapat
│   │   ├── dues/        # Iuran anggota
│   │   └── waste-bank/  # Bank sampah
│   └── api/             # API routes
├── components/
│   ├── ui/              # Komponen UI reusable
│   ├── layout/          # Sidebar, Header
│   ├── auth/            # Form autentikasi
│   ├── members/         # Komponen anggota
│   ├── finance/         # Komponen keuangan
│   ├── attendance/      # Komponen absensi
│   ├── dues/            # Komponen iuran
│   └── waste-bank/      # Komponen bank sampah
├── lib/
│   ├── supabase/        # Client, server, admin
│   ├── utils/           # Format, helpers
│   └── validations/     # Zod schemas
├── types/               # TypeScript types
└── constants/           # Konstanta aplikasi
```

---

## 🔑 Role & Akses

| Fitur | superadmin | admin | treasurer | secretary | member |
|-------|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kelola Anggota | ✅ | ✅ | ❌ | ✅ | ❌ |
| Kelola Keuangan | ✅ | ✅ | ✅ | ❌ | ❌ |
| Kelola Rapat | ✅ | ✅ | ❌ | ✅ | ❌ |
| Kelola Iuran | ✅ | ✅ | ✅ | ❌ | ❌ |
| Bank Sampah | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pengaturan | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 🛠️ Perintah Berguna

```bash
npm run dev          # Development server
npm run build        # Production build
npm run type-check   # TypeScript check
npm run lint         # ESLint check
```

---

## 📝 Catatan Pengembangan

- Semua komponen menggunakan TypeScript strict mode (no `any`)
- Database triggers menangani: auto-member-number, saldo kas, poin keaktifan, total sampah
- RLS (Row Level Security) aktif di semua tabel
- Arsitektur modular: mudah menambah fitur baru
- Server Components untuk data fetching, Client Components untuk interaktivitas
