-- ============================================================
-- SISAF (Sistem Informasi Santri Al-Falah) — schema_sisaf_01
-- STATUS: BELUM DIJALANKAN (belum ada project Supabase untuk SISAF)
-- Disiapkan agar begitu project Supabase dibuat, migrasi ini
-- tinggal dieksekusi tanpa perlu didesain ulang.
--
-- Meniru pola dataku2026: RLS + Auth (Supabase), tapi otorisasi
-- kritikal tetap divalidasi eksplisit di layer aplikasi (JS),
-- bukan mengandalkan RLS sepenuhnya — lihat catatan tech debt
-- HRIS: RLS belum pernah diuji terhadap Postgres nyata.
-- ============================================================

-- ---------- ENUM ----------
create type sisaf_role as enum (
  'admin',
  'kepala_sekolah',
  'wali_kelas',
  'bendahara',
  'wali_santri'
);

-- Vocabulary status mengikuti siklus penuh siswa (diadaptasi dari
-- Student Lifecycle Architecture: Admission -> ... -> Graduation), bukan
-- cuma status operasional sehari-hari. calon_santri/diterima baru relevan
-- saat modul Admission dibangun, tapi didefinisikan sekarang supaya tidak
-- perlu migrasi enum susulan (enum di Postgres sulit diubah tanpa downtime).
create type status_santri as enum (
  'calon_santri', 'diterima', 'terdaftar', 'aktif', 'cuti',
  'pindah', 'lulus', 'mengundurkan_diri', 'dikeluarkan', 'meninggal'
);
create type status_pembayaran as enum ('lunas', 'belum_lunas', 'sebagian');
create type jenis_kedisiplinan as enum ('pelanggaran', 'prestasi');

-- ---------- KELAS ----------
create table kelas (
  id uuid primary key default gen_random_uuid(),
  nama text not null,                    -- e.g. 'XI IPA 2'
  tingkat text not null,                 -- e.g. 'XI'
  tahun_ajaran text not null,            -- e.g. '2025/2026'
  wali_kelas_user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ---------- WALI SANTRI (orang tua/wali) ----------
create table wali_santri (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),  -- null sampai akun dibuat
  nama text not null,
  hubungan text,                          -- 'Ayah' / 'Ibu' / 'Wali'
  telepon text,
  email text,
  alamat text,
  created_at timestamptz default now()
);

-- ---------- SANTRI ----------
create table santri (
  id uuid primary key default gen_random_uuid(),
  nis text not null unique,
  nama text not null,
  kelas_id uuid references kelas(id),
  wali_santri_id uuid references wali_santri(id),
  angkatan text not null,
  tanggal_lahir date,
  jenis_kelamin text check (jenis_kelamin in ('L', 'P')),
  status status_santri not null default 'aktif',
  foto_url text,
  -- Kolom di bawah ini nullable dan belum dipakai UI manapun sekarang —
  -- disiapkan supaya modul Admission/Graduation nanti tidak perlu ALTER
  -- TABLE susulan terhadap tabel yang sudah berisi data produksi.
  admission_id uuid,        -- FK ke applicants(id) setelah modul Admission ada
  exit_date date,
  exit_reason text,
  created_at timestamptz default now()
);
create index idx_santri_kelas on santri(kelas_id);
create index idx_santri_wali on santri(wali_santri_id);

-- ---------- USER PROFILE (extends auth.users) ----------
create table user_profiles (
  id uuid primary key references auth.users(id),
  nama text not null,
  role sisaf_role not null,
  kelas_id uuid references kelas(id),         -- terisi jika role = wali_kelas
  wali_santri_id uuid references wali_santri(id), -- terisi jika role = wali_santri
  created_at timestamptz default now()
);

-- ---------- RIWAYAT STATUS SANTRI (Student Master foundation) ----------
-- Prinsip: status TIDAK PERNAH ditimpa di tempat. Setiap perubahan status
-- menghasilkan baris baru di sini, baru kemudian santri.status diperbarui.
-- Ini yang memungkinkan Student 360 menampilkan riwayat lengkap
-- Admission -> aktif -> ... -> lulus/keluar tanpa kehilangan jejak.
create table student_status_histories (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid references santri(id) not null,
  status_sebelumnya status_santri,        -- null untuk entri pertama (pendaftaran awal)
  status_baru status_santri not null,
  tanggal_efektif date not null,
  alasan text,
  dokumen_rujukan text,                   -- path Supabase Storage jika ada SK/surat pendukung
  disetujui_oleh uuid references auth.users(id),
  created_at timestamptz default now()
);
create index idx_status_history_santri on student_status_histories(santri_id, tanggal_efektif desc);

-- ---------- AKADEMIK ----------
create table nilai_akademik (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid references santri(id) not null,
  semester text not null,                 -- 'Ganjil 2025/2026'
  mata_pelajaran text not null,
  kategori text,                          -- 'Diniyah' / 'Umum'
  nilai_huruf text,                       -- 'A', 'B+', dst
  poin_nilai numeric(3,2),
  sks int,
  poin_diperoleh numeric(5,2),
  created_at timestamptz default now()
);
create index idx_nilai_santri on nilai_akademik(santri_id, semester);

-- ---------- KEUANGAN SANTRI ----------
create table keuangan_santri (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid references santri(id) not null,
  jenis text not null,                    -- 'SPP', 'Uang Saku', 'Seragam', dst
  periode text,                           -- 'Agustus 2026'
  jumlah numeric(12,2) not null,
  status status_pembayaran not null default 'belum_lunas',
  tanggal_jatuh_tempo date,
  tanggal_bayar date,
  created_at timestamptz default now()
);
create index idx_keuangan_santri on keuangan_santri(santri_id);

-- ---------- KEDISIPLINAN ----------
create table kedisiplinan (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid references santri(id) not null,
  tanggal date not null,
  jenis jenis_kedisiplinan not null,
  kategori text not null,                 -- 'Ringan/Sedang/Berat' or 'Akademik/Non-akademik'
  poin int not null,
  keterangan text,
  pelapor_user_id uuid references auth.users(id),
  created_at timestamptz default now()
);
create index idx_kedisiplinan_santri on kedisiplinan(santri_id);

-- ---------- KESEHATAN & ASRAMA ----------
create table kesehatan_asrama (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid references santri(id) not null unique,
  asrama text,
  kamar text,
  golongan_darah text,
  alergi text,
  riwayat_penyakit text,
  catatan text,
  updated_at timestamptz default now()
);

-- ---------- DOKUMEN ----------
create table dokumen_santri (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid references santri(id) not null,
  jenis_dokumen text not null,            -- 'Akta Kelahiran', 'KK', 'Ijazah', dst
  nama_file text,
  file_path text,                         -- Supabase Storage path
  status text default 'belum_lengkap',    -- 'lengkap' / 'belum_lengkap'
  tanggal_upload timestamptz,
  created_at timestamptz default now()
);
create index idx_dokumen_santri on dokumen_santri(santri_id);

-- ---------- PENGATURAN INSTITUSI ----------
-- Ditambahkan di sini karena sebelumnya baru ada di mockDataService.js,
-- belum disinkronkan ke migrasi (tech debt yang sekarang ditutup sekalian
-- saat mengerjakan fondasi Student Master). Kolom tenant_id ditambahkan
-- kalau/saat SISAF benar-benar jadi multi-tenant SaaS.
create table institution_settings (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  alamat text,
  kontak text,
  updated_at timestamptz default now()
);

-- ---------- NOTIFIKASI (simulasi di mode mock, nyata setelah Edge Function ada) ----------
create table notifikasi_settings (
  id uuid primary key default gen_random_uuid(),
  jenis text not null unique,             -- 'tagihan_jatuh_tempo', 'pembayaran_diterima', dst
  aktif boolean not null default true
);

create table notifikasi_log (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid references santri(id) not null,
  jenis text not null,
  isi text not null,
  channel text default 'WhatsApp',
  status text default 'queued',           -- 'queued' -> Edge Function yang mengubah ke 'terkirim'/'gagal'
  created_at timestamptz default now()
);
create index idx_notifikasi_santri on notifikasi_log(santri_id);

-- ============================================================
-- RLS — diaktifkan di sini sebagai kerangka awal.
-- CATATAN PENTING (mengikuti tech debt HRIS): kebijakan berikut
-- BELUM DIUJI terhadap Postgres nyata. Sebelum production,
-- lakukan pengujian manual per-role seperti pada dataku2026.
-- Aplikasi tetap melakukan validasi otorisasi eksplisit di JS
-- sebagai lapisan kedua, bukan mengandalkan RLS saja.
-- ============================================================
alter table santri enable row level security;
alter table student_status_histories enable row level security;
alter table nilai_akademik enable row level security;
alter table keuangan_santri enable row level security;
alter table kedisiplinan enable row level security;
alter table kesehatan_asrama enable row level security;
alter table dokumen_santri enable row level security;
alter table notifikasi_log enable row level security;

-- Placeholder policies — perlu direvisi saat pengujian RLS nyata.
-- create policy "admin_full_access" on santri for all
--   using (exists (select 1 from user_profiles where id = auth.uid() and role = 'admin'));
-- create policy "wali_kelas_own_class" on santri for select
--   using (kelas_id in (select kelas_id from user_profiles where id = auth.uid() and role = 'wali_kelas'));
-- create policy "wali_santri_own_child" on santri for select
--   using (wali_santri_id in (select wali_santri_id from user_profiles where id = auth.uid() and role = 'wali_santri'));
-- (Kebijakan lengkap untuk tabel lain menyusul saat RLS diuji end-to-end.)
