-- ============================================================
-- SISAF — schema_sisaf_02_rls_policies
-- STATUS: BELUM DIJALANKAN terhadap production.
--
-- Menggantikan placeholder policies di schema_sisaf_01_init.sql
-- dengan kebijakan nyata, diturunkan langsung dari matriks akses
-- yang SUDAH berjalan di mockDataService.js (_filterSantriByRole)
-- supaya perilaku Postgres tidak menyimpang dari perilaku mock
-- yang sudah divalidasi lewat dom_verify.js.
--
-- PRINSIP (tidak berubah dari catatan di schema_01):
-- RLS adalah lapisan PERTAMA (defense in depth), bukan satu-satunya.
-- app.js tetap melakukan validasi eksplisit di layer JS. Kebijakan
-- di bawah WAJIB diuji lewat tests/rls_test.sql sebelum production —
-- lihat catatan tech debt HRIS: kebijakan yang tidak pernah diuji
-- terhadap Postgres nyata sama saja dengan tidak ada kebijakan.
--
-- MATRIKS AKSES (sumber: mockDataService.js:_filterSantriByRole
-- + app.js SETTINGS_MANAGER_ROLES / NOTIF_MANAGER_ROLES):
--   admin           -> semua santri, semua tabel turunan, read+write
--   kepala_sekolah  -> semua santri, read-only (tidak ada form ubah
--                      status/tulis di UI untuk role ini)
--   bendahara       -> semua santri, read; notifikasi_settings write
--                      (satu-satunya non-admin dengan izin tulis)
--   wali_kelas      -> hanya santri di kelas_id miliknya, read-only
--                      di UI saat ini (belum ada form tulis nilai/
--                      kedisiplinan — kolom write disiapkan tapi
--                      TIDAK diaktifkan di sini sampai UI-nya ada,
--                      supaya RLS tidak lebih permisif dari app)
--   wali_santri     -> hanya anaknya sendiri (wali_santri_id miliknya),
--                      read-only
--
-- CATATAN: kebijakan menulis (insert/update/delete) ke tabel turunan
-- (nilai_akademik, keuangan_santri, dst.) sengaja dibatasi admin-only
-- untuk saat ini, KARENA app.js belum punya form tulis untuk tabel-
-- tabel itu (hanya changeStudentStatus dan simulateSendNotifikasi
-- yang punya form, keduanya admin-only). Perluas policy tulis HANYA
-- bersamaan dengan menambah form tulis yang sesuai di app.js, supaya
-- RLS dan app-layer authorization tidak pernah tidak-sinkron.
-- ============================================================

-- Bersihkan placeholder lama (jika sempat dijalankan sebagian)
drop policy if exists "admin_full_access" on santri;
drop policy if exists "wali_kelas_own_class" on santri;
drop policy if exists "wali_santri_own_child" on santri;

-- ---------- HELPER: role & scope milik user saat ini ----------
-- SECURITY DEFINER supaya bisa dipanggil dari dalam policy tanpa
-- kena RLS pada user_profiles itu sendiri (hindari recursion).
create or replace function sisaf_current_role()
returns sisaf_role
language sql stable security definer
set search_path = public
as $$
  select role from user_profiles where id = auth.uid();
$$;

create or replace function sisaf_current_kelas_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select kelas_id from user_profiles where id = auth.uid();
$$;

create or replace function sisaf_current_wali_santri_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select wali_santri_id from user_profiles where id = auth.uid();
$$;

-- Scope dasar: apakah user saat ini boleh MELIHAT baris santri ini,
-- terlepas dari tabel mana yang sedang diquery. Semua policy read di
-- tabel turunan (nilai, keuangan, dst.) memanggil ini via santri_id,
-- supaya matriks akses hanya didefinisikan SATU kali.
create or replace function sisaf_can_view_santri(target_santri_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select case sisaf_current_role()
    when 'admin' then true
    when 'kepala_sekolah' then true
    when 'bendahara' then true
    when 'wali_kelas' then exists (
      select 1 from santri s
      where s.id = target_santri_id
        and s.kelas_id = sisaf_current_kelas_id()
    )
    when 'wali_santri' then exists (
      select 1 from santri s
      where s.id = target_santri_id
        and s.wali_santri_id = sisaf_current_wali_santri_id()
    )
    else false
  end;
$$;

-- ============================================================
-- SANTRI
-- ============================================================
create policy "santri_select_by_role" on santri for select
  using (
    sisaf_current_role() in ('admin', 'kepala_sekolah', 'bendahara')
    or (sisaf_current_role() = 'wali_kelas' and kelas_id = sisaf_current_kelas_id())
    or (sisaf_current_role() = 'wali_santri' and wali_santri_id = sisaf_current_wali_santri_id())
  );

create policy "santri_write_admin_only" on santri for insert
  with check (sisaf_current_role() = 'admin');
create policy "santri_update_admin_only" on santri for update
  using (sisaf_current_role() = 'admin');
create policy "santri_delete_admin_only" on santri for delete
  using (sisaf_current_role() = 'admin');

-- ============================================================
-- STUDENT STATUS HISTORY — insert lewat changeStudentStatus (admin
-- only di app.js saat ini); dibaca oleh siapapun yang boleh lihat
-- santrinya (butuh riwayat lengkap untuk tab "Status" di UI).
-- ============================================================
create policy "status_history_select" on student_status_histories for select
  using (sisaf_can_view_santri(santri_id));

create policy "status_history_insert_admin_only" on student_status_histories for insert
  with check (sisaf_current_role() = 'admin');

-- ============================================================
-- NILAI AKADEMIK / KEUANGAN / KEDISIPLINAN / KESEHATAN / DOKUMEN
-- Read: sama seperti santri induknya. Write: admin-only untuk saat
-- ini (lihat catatan di atas kepala file).
-- ============================================================
create policy "nilai_select" on nilai_akademik for select
  using (sisaf_can_view_santri(santri_id));
create policy "nilai_write_admin_only" on nilai_akademik for all
  using (sisaf_current_role() = 'admin')
  with check (sisaf_current_role() = 'admin');

create policy "keuangan_select" on keuangan_santri for select
  using (sisaf_can_view_santri(santri_id));
create policy "keuangan_write_admin_only" on keuangan_santri for all
  using (sisaf_current_role() = 'admin')
  with check (sisaf_current_role() = 'admin');

create policy "kedisiplinan_select" on kedisiplinan for select
  using (sisaf_can_view_santri(santri_id));
create policy "kedisiplinan_write_admin_only" on kedisiplinan for all
  using (sisaf_current_role() = 'admin')
  with check (sisaf_current_role() = 'admin');

create policy "kesehatan_select" on kesehatan_asrama for select
  using (sisaf_can_view_santri(santri_id));
create policy "kesehatan_write_admin_only" on kesehatan_asrama for all
  using (sisaf_current_role() = 'admin')
  with check (sisaf_current_role() = 'admin');

create policy "dokumen_select" on dokumen_santri for select
  using (sisaf_can_view_santri(santri_id));
create policy "dokumen_write_admin_only" on dokumen_santri for all
  using (sisaf_current_role() = 'admin')
  with check (sisaf_current_role() = 'admin');

-- ============================================================
-- NOTIFIKASI LOG — read sama seperti santri induknya. Insert
-- (simulateSendNotifikasi) admin-only di app.js saat ini.
-- ============================================================
create policy "notifikasi_log_select" on notifikasi_log for select
  using (sisaf_can_view_santri(santri_id));
create policy "notifikasi_log_insert_admin_only" on notifikasi_log for insert
  with check (sisaf_current_role() = 'admin');

-- ============================================================
-- INSTITUTION_SETTINGS & NOTIFIKASI_SETTINGS
-- Kedua tabel ini belum di-enable RLS di schema_01 (dilupakan —
-- ditutup di sini). institution_settings dibaca SEBELUM login
-- (layar login perlu nama institusi), jadi select harus terbuka
-- untuk anon; write admin-only sesuai SETTINGS_MANAGER_ROLES.
-- notifikasi_settings write dibolehkan untuk NOTIF_MANAGER_ROLES
-- (admin + bendahara), sesuai app.js baris 636/719.
-- ============================================================
alter table institution_settings enable row level security;
alter table notifikasi_settings enable row level security;

create policy "institution_settings_select_public" on institution_settings for select
  using (true);
create policy "institution_settings_update_admin_only" on institution_settings for update
  using (sisaf_current_role() = 'admin');

create policy "notifikasi_settings_select_authenticated" on notifikasi_settings for select
  using (auth.role() = 'authenticated');
create policy "notifikasi_settings_update_notif_managers" on notifikasi_settings for update
  using (sisaf_current_role() in ('admin', 'bendahara'));

-- ============================================================
-- PRESENSI_HARIAN
-- Berbeda dari nilai/kedisiplinan/kesehatan/dokumen: tabel ini SUDAH
-- punya form tulis nyata di app.js untuk wali_kelas (recordPresensi,
-- dipakai layar input massal per kelas per tanggal). Maka write policy
-- di sini TIDAK admin-only — wali_kelas boleh insert/update presensi
-- untuk santri di kelasnya sendiri saja (via sisaf_current_kelas_id()).
-- ============================================================
alter table presensi_harian enable row level security;

create policy "presensi_select" on presensi_harian for select
  using (sisaf_can_view_santri(santri_id));

create policy "presensi_write_admin_or_own_class" on presensi_harian for insert
  with check (
    sisaf_current_role() = 'admin'
    or (
      sisaf_current_role() = 'wali_kelas'
      and exists (
        select 1 from santri s
        where s.id = santri_id and s.kelas_id = sisaf_current_kelas_id()
      )
    )
  );

create policy "presensi_update_admin_or_own_class" on presensi_harian for update
  using (
    sisaf_current_role() = 'admin'
    or (
      sisaf_current_role() = 'wali_kelas'
      and exists (
        select 1 from santri s
        where s.id = santri_id and s.kelas_id = sisaf_current_kelas_id()
      )
    )
  );
