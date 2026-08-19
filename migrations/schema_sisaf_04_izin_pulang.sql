-- ============================================================
-- SISAF — schema_sisaf_04_izin_pulang
-- STATUS: BELUM DIJALANKAN (belum ada project Supabase untuk SISAF —
-- lihat status blocker di README, sama seperti schema_sisaf_01/02/03).
--
-- Modul Perizinan Pulang/Keluar Asrama (rekomendasi prioritas sedang dari
-- riset komparatif di README). Alur: 'diajukan' -> 'disetujui' -> 'kembali',
-- atau 'diajukan' -> 'ditolak'. Beda dari kolom status_santri (yang
-- menandai status keanggotaan santri secara keseluruhan): ini status per
-- KEJADIAN izin, satu santri bisa punya banyak baris izin_pulang sepanjang
-- waktu, statusnya tidak permanen seperti 'cuti'/'pindah'.
--
-- diajukan_oleh/disetujui_oleh sengaja bertipe TEXT (bukan uuid FK ke
-- auth.users seperti student_status_histories.disetujui_oleh) karena nilai
-- ini ditampilkan langsung apa adanya di UI tanpa join ke user_profiles —
-- konsisten dengan cara mockDataService.js/supabaseDataService.js mengisi
-- kolom ini (nama, bukan uuid).
-- ============================================================

create table izin_pulang (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid references santri(id) not null,
  tanggal_keluar date not null,
  tanggal_rencana_kembali date not null,
  tanggal_kembali_aktual date,
  alasan text not null,
  status text not null default 'diajukan'
    check (status in ('diajukan', 'disetujui', 'ditolak', 'kembali')),
  diajukan_oleh text,
  disetujui_oleh text,
  catatan_persetujuan text,
  created_at timestamptz default now(),
  constraint izin_pulang_tanggal_valid check (tanggal_rencana_kembali >= tanggal_keluar)
);
create index idx_izin_pulang_santri on izin_pulang(santri_id);
create index idx_izin_pulang_status on izin_pulang(status);

-- ============================================================
-- RLS — IZIN_PULANG
-- Baca: sama seperti modul lain, ikut sisaf_can_view_santri (admin/kepsek
-- lintas kelas, wali_kelas kelasnya sendiri, wali_santri anaknya sendiri).
-- Tulis (insert): admin ATAU wali_kelas untuk santri di kelasnya sendiri —
-- pola sama persis dengan presensi_harian, karena modul ini juga punya
-- form pengajuan nyata untuk wali_kelas (bukan admin-only seperti
-- nilai/kedisiplinan/kesehatan/dokumen).
-- Tulis (update, yaitu menyetujui/menolak/mencatat kembali): admin SAJA —
-- keputusan institusional untuk mengizinkan santri keluar asrama sengaja
-- dipusatkan ke satu role, beda dari insert (pengajuan) yang lebih terbuka.
-- ============================================================
alter table izin_pulang enable row level security;

create policy "izin_pulang_select" on izin_pulang for select
  using (sisaf_can_view_santri(santri_id));

create policy "izin_pulang_insert_admin_or_own_class" on izin_pulang for insert
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

create policy "izin_pulang_update_admin_only" on izin_pulang for update
  using (sisaf_current_role() = 'admin');

-- Tidak ada policy delete: aplikasi tidak punya fitur hapus izin_pulang di
-- app.js. Kalau nanti ditambah, tambahkan policy delete admin-only di PR
-- yang sama (aturan kerja README poin 5).
