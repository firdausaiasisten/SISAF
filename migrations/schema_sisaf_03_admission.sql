-- ============================================================
-- SISAF — schema_sisaf_03_admission
-- STATUS: BELUM DIJALANKAN (belum ada project Supabase untuk SISAF —
-- lihat status blocker di README, sama seperti schema_sisaf_01/02).
--
-- Modul Admission (Fase 3 di README): alur penerimaan calon santri
-- calon_santri -> diterima -> terdaftar. Enum status_santri sudah
-- mendefinisikan ketiga nilai ini sejak schema_sisaf_01 supaya migrasi
-- ini tidak perlu ALTER TYPE (operasi berat di Postgres untuk enum
-- yang sudah dipakai tabel lain).
--
-- Begitu applicant mencapai status 'terdaftar', mockDataService.js dan
-- supabaseDataService.js (updateApplicantStatus) membuat satu baris
-- santri baru dengan admission_id = applicants.id — kolom admission_id
-- di tabel santri sudah disiapkan sejak schema_sisaf_01 (nullable,
-- belum dipakai UI manapun sampai migrasi ini).
--
-- BELUM transactional (dua-tiga langkah terpisah di data layer, sama
-- persis dengan risiko changeStudentStatus) -- lihat catatan di
-- supabaseDataService.js. Migrasikan ke RPC sebelum dipakai rutin di
-- production.
-- ============================================================

create table applicants (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  tanggal_lahir date,
  jenis_kelamin text check (jenis_kelamin in ('L', 'P')),
  asal_sekolah text,
  nama_wali text,
  telepon_wali text,
  -- Subset status_santri: hanya 3 nilai pertama yang valid di tabel ini.
  -- Constraint check di bawah menegakkan itu di level DB, bukan cuma JS,
  -- supaya baris applicants tidak pernah punya status 'aktif'/'lulus'/dst.
  status status_santri not null default 'calon_santri'
    check (status in ('calon_santri', 'diterima', 'terdaftar')),
  tanggal_daftar date not null default current_date,
  catatan text,
  -- Terisi begitu status jadi 'terdaftar' -- penanda applicant sudah
  -- "lulus" jadi santri, sekaligus jalur balik dari applicants ke santri
  -- (kebalikan dari santri.admission_id yang menunjuk applicants -> santri).
  santri_id uuid references santri(id),
  created_at timestamptz default now()
);
create index idx_applicants_status on applicants(status);

-- FK balik dari santri.admission_id ke applicants, ditambahkan di sini
-- (bukan schema_sisaf_01) karena tabel applicants baru ada sekarang.
-- santri.admission_id sendiri sudah ada sejak schema_01 tapi belum
-- pernah punya FK constraint nyata.
alter table santri
  add constraint fk_santri_admission
  foreign key (admission_id) references applicants(id);

-- ============================================================
-- RLS — APPLICANTS
-- Baca: admin + kepala_sekolah (pantauan penerimaan, konsisten dengan
-- getApplicants di data layer). Tulis (insert/update): admin saja —
-- satu-satunya role dengan form Admission di app.js, sama pola dengan
-- institution_settings (admin-only write).
-- ============================================================
alter table applicants enable row level security;

create policy "applicants_select_admin_kepsek" on applicants for select
  using (sisaf_current_role() in ('admin', 'kepala_sekolah'));

create policy "applicants_insert_admin_only" on applicants for insert
  with check (sisaf_current_role() = 'admin');

create policy "applicants_update_admin_only" on applicants for update
  using (sisaf_current_role() = 'admin');

-- Tidak ada policy delete: aplikasi tidak punya fitur hapus applicant di
-- app.js sekarang. Kalau nanti ditambah, tambahkan policy delete admin-only
-- di PR yang sama (aturan kerja README poin 5).
