-- ============================================================
-- SISAF — tests/rls_test.sql
-- pgTAP suite untuk memvalidasi schema_sisaf_02_rls_policies.sql
-- terhadap Postgres NYATA (bukan asumsi) — menutup tech debt yang
-- dicatat di HRIS: "RLS belum pernah diuji end-to-end".
--
-- CARA MENJALANKAN (via Supabase CLI, sudah include pgTAP):
--   supabase test db
-- atau manual dengan pg_prove:
--   pg_prove -d postgres://...  tests/rls_test.sql
--
-- Pola: setiap skenario login disimulasikan dengan
--   set local role authenticated;
--   set local request.jwt.claim.sub = '<uuid user>';
-- lalu auth.uid() (fungsi bawaan Supabase) akan mengembalikan uuid
-- itu di dalam transaksi, persis seperti request API sungguhan.
-- ============================================================

begin;
select plan(26);

-- ---------------- FIXTURE DATA ----------------
-- Dua kelas, dua santri (satu per kelas), satu wali_santri per santri,
-- lima user (satu per role) dengan scope yang saling silang supaya
-- kebocoran akses antar-kelas/antar-wali benar-benar ketahuan.

insert into kelas (id, nama, tingkat, tahun_ajaran) values
  ('11111111-1111-1111-1111-111111111111', 'X IPA 1', 'X', '2025/2026'),
  ('22222222-2222-2222-2222-222222222222', 'X IPA 2', 'X', '2025/2026');

insert into wali_santri (id, nama) values
  ('33333333-3333-3333-3333-333333333333', 'Wali Santri A'),
  ('44444444-4444-4444-4444-444444444444', 'Wali Santri B');

insert into santri (id, nis, nama, kelas_id, wali_santri_id, angkatan, status) values
  ('55555555-5555-5555-5555-555555555555', 'NIS-A', 'Santri A', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '2025', 'aktif'),
  ('66666666-6666-6666-6666-666666666666', 'NIS-B', 'Santri B', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', '2025', 'aktif');

insert into nilai_akademik (santri_id, semester, mata_pelajaran, nilai_huruf) values
  ('55555555-5555-5555-5555-555555555555', 'Ganjil 2025/2026', 'Fiqih', 'A');

-- auth.users adalah tabel Supabase bawaan; insert minimal yang dibutuhkan FK.
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'admin@test.local'),
  ('a0000000-0000-0000-0000-000000000002', 'kepsek@test.local'),
  ('a0000000-0000-0000-0000-000000000003', 'walikelas-a@test.local'),
  ('a0000000-0000-0000-0000-000000000004', 'bendahara@test.local'),
  ('a0000000-0000-0000-0000-000000000005', 'walisantri-a@test.local');

insert into user_profiles (id, nama, role, kelas_id, wali_santri_id) values
  ('a0000000-0000-0000-0000-000000000001', 'Admin', 'admin', null, null),
  ('a0000000-0000-0000-0000-000000000002', 'Kepsek', 'kepala_sekolah', null, null),
  ('a0000000-0000-0000-0000-000000000003', 'Wali Kelas A', 'wali_kelas', '11111111-1111-1111-1111-111111111111', null),
  ('a0000000-0000-0000-0000-000000000004', 'Bendahara', 'bendahara', null, null),
  ('a0000000-0000-0000-0000-000000000005', 'Wali Santri A', 'wali_santri', null, '33333333-3333-3333-3333-333333333333');

-- ---------------- HELPER: pindah identitas dalam transaksi ----------------
create or replace function test_login_as(user_id uuid) returns void as $$
begin
  execute format('set local role authenticated');
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ============================================================
-- ADMIN: harus lihat semua santri lintas kelas, dan bisa tulis
-- ============================================================
select test_login_as('a0000000-0000-0000-0000-000000000001');

select is(
  (select count(*) from santri)::int, 2,
  'admin melihat SEMUA santri lintas kelas'
);
select lives_ok(
  $$ update santri set nama = 'Santri A (diubah admin)' where id = '55555555-5555-5555-5555-555555555555' $$,
  'admin BISA update santri'
);
select is(
  (select count(*) from nilai_akademik)::int, 1,
  'admin melihat nilai_akademik'
);
select lives_ok(
  $$ insert into nilai_akademik (santri_id, semester, mata_pelajaran, nilai_huruf)
     values ('66666666-6666-6666-6666-666666666666', 'Ganjil 2025/2026', 'Tahfizh', 'B') $$,
  'admin BISA insert nilai_akademik'
);

-- ============================================================
-- KEPALA SEKOLAH: lihat semua santri (read), TIDAK bisa tulis
-- ============================================================
select test_login_as('a0000000-0000-0000-0000-000000000002');

select is(
  (select count(*) from santri)::int, 2,
  'kepala_sekolah melihat SEMUA santri (read-only)'
);
select throws_ok(
  $$ update santri set nama = 'Coba ubah' where id = '55555555-5555-5555-5555-555555555555' $$,
  '42501',
  null,
  'kepala_sekolah DILARANG update santri'
);
select is(
  (select count(*) from nilai_akademik)::int, 2,
  'kepala_sekolah melihat semua nilai_akademik (read)'
);
select throws_ok(
  $$ insert into nilai_akademik (santri_id, semester, mata_pelajaran) values ('55555555-5555-5555-5555-555555555555', 'X', 'Y') $$,
  '42501',
  null,
  'kepala_sekolah DILARANG insert nilai_akademik'
);

-- ============================================================
-- WALI KELAS (kelas A): hanya lihat santri di kelasnya sendiri
-- ============================================================
select test_login_as('a0000000-0000-0000-0000-000000000003');

select is(
  (select count(*) from santri)::int, 1,
  'wali_kelas melihat HANYA 1 santri (kelasnya sendiri)'
);
select is(
  (select nama from santri limit 1), 'Santri A (diubah admin)',
  'wali_kelas melihat santri yang benar (Santri A, kelasnya sendiri)'
);
select throws_ok(
  $$ update santri set nama = 'Coba ubah' where id = '55555555-5555-5555-5555-555555555555' $$,
  '42501',
  null,
  'wali_kelas DILARANG update santri (read-only di UI saat ini)'
);
select is(
  (select count(*) from nilai_akademik)::int, 1,
  'wali_kelas HANYA melihat nilai_akademik santri di kelasnya (bukan kelas lain)'
);

-- Uji negatif eksplisit: wali_kelas TIDAK boleh melihat santri kelas B
-- lewat query langsung by id (bukan cuma count).
select is(
  (select count(*) from santri where id = '66666666-6666-6666-6666-666666666666')::int, 0,
  'wali_kelas TIDAK BISA melihat Santri B (kelas lain) walau tahu ID-nya'
);

-- ============================================================
-- BENDAHARA: lihat semua santri (read), tulis notifikasi_settings
-- boleh, tapi TIDAK boleh tulis data santri/akademik
-- ============================================================
select test_login_as('a0000000-0000-0000-0000-000000000004');

select is(
  (select count(*) from santri)::int, 2,
  'bendahara melihat SEMUA santri (read)'
);
select is(
  (select count(*) from keuangan_santri)::int, 0,
  'bendahara bisa query keuangan_santri (kosong di fixture ini, tapi tidak error)'
);
select throws_ok(
  $$ update santri set nama = 'Coba ubah' where id = '55555555-5555-5555-5555-555555555555' $$,
  '42501',
  null,
  'bendahara DILARANG update santri'
);

insert into notifikasi_settings (jenis, aktif) values ('tagihan_jatuh_tempo', true);
select lives_ok(
  $$ update notifikasi_settings set aktif = false where jenis = 'tagihan_jatuh_tempo' $$,
  'bendahara BISA update notifikasi_settings (NOTIF_MANAGER_ROLES)'
);

-- ============================================================
-- WALI SANTRI (A): hanya lihat anaknya sendiri, read-only total
-- ============================================================
select test_login_as('a0000000-0000-0000-0000-000000000005');

select is(
  (select count(*) from santri)::int, 1,
  'wali_santri melihat HANYA 1 santri (anaknya sendiri)'
);
select is(
  (select nama from santri limit 1), 'Santri A (diubah admin)',
  'wali_santri melihat santri yang benar (anaknya, bukan anak orang lain)'
);
select is(
  (select count(*) from santri where id = '66666666-6666-6666-6666-666666666666')::int, 0,
  'wali_santri TIDAK BISA melihat Santri B (bukan anaknya) walau tahu ID-nya'
);
select throws_ok(
  $$ update santri set nama = 'Coba ubah' where id = '55555555-5555-5555-5555-555555555555' $$,
  '42501',
  null,
  'wali_santri DILARANG update santri (read-only total)'
);
select throws_ok(
  $$ insert into nilai_akademik (santri_id, semester, mata_pelajaran) values ('55555555-5555-5555-5555-555555555555', 'X', 'Y') $$,
  '42501',
  null,
  'wali_santri DILARANG insert nilai_akademik'
);
select throws_ok(
  $$ update notifikasi_settings set aktif = true where jenis = 'tagihan_jatuh_tempo' $$,
  '42501',
  null,
  'wali_santri DILARANG update notifikasi_settings'
);

-- ============================================================
-- ANON (belum login): institution_settings tetap terbaca (layar
-- login perlu nama institusi), tapi santri TIDAK boleh terbaca sama
-- sekali.
-- ============================================================
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

insert into institution_settings (id, nama) values
  ('77777777-7777-7777-7777-777777777777', 'Pondok Test')
on conflict do nothing;

select is(
  (select count(*) from santri)::int, 0,
  'anon (belum login) TIDAK BISA melihat santri sama sekali'
);
select is(
  (select nama from institution_settings limit 1), 'Pondok Test',
  'anon (belum login) BISA membaca institution_settings (dibutuhkan layar login)'
);
select throws_ok(
  $$ update institution_settings set nama = 'Diubah anon' $$,
  '42501',
  null,
  'anon DILARANG update institution_settings'
);

select * from finish();
rollback;
