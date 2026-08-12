# SISAF — Sistem Informasi Santri Al-Falah

Prototipe siap-pakai (mock data) untuk Pesantren Modern Al-Falah Abu Lam U.
Arsitektur meniru pola `dataku2026` (HRIS Al-Falah): vanilla JS, tanpa
build step, dengan lapisan abstraksi data yang bisa ditukar antara mock
dan Supabase tanpa mengubah kode UI.

## Menjalankan

Buka `index.html` langsung di browser, atau serve statis:

```bash
npx serve .
```

Tidak ada langkah build. Semua file dimuat sebagai `<script>` biasa.

## Struktur file

```
index.html               shell HTML, urutan <script> penting
styles.css                design tokens & semua styling
config.js                 APP_MODE toggle ('mock' | 'supabase')
mockDataService.js        data contoh in-memory + fungsi query
supabaseDataService.js    STUB — signature sama persis, belum diisi
dataService.js            memilih implementasi aktif berdasar config
app.js                     state, routing, render semua halaman
dom_verify.js              test integrasi (jsdom) — login semua role + tab
migrations/
  schema_sisaf_01_init.sql  skema lengkap, BELUM DIJALANKAN
```

## Akun demo (mode mock)

| Role | Email | Password | Cakupan akses |
|---|---|---|---|
| Admin | admin@alfalah.sch.id | admin123 | Semua santri, semua modul |
| Kepala Sekolah | kepsek@alfalah.sch.id | kepsek123 | Semua santri, baca saja |
| Wali Kelas | fadhil.rahman@alfalah.sch.id | wali123 | Hanya santri kelas XI IPA 2 |
| Bendahara | bendahara@alfalah.sch.id | bendahara123 | Semua santri, fokus Keuangan |
| Wali Santri | ortu.alfatih@gmail.com | ortu123 | Hanya anak sendiri |

## Fondasi: Student Master + Riwayat Status

Diadaptasi dari `Student_Lifecycle_Architecture_Claude_AI.md` (blueprint
Admission→Alumni yang jauh lebih besar dari SISAF saat ini — lihat catatan
di bawah soal apa yang **tidak** diadopsi dan kenapa).

- **Vocabulary status diperluas** ke siklus penuh: `calon_santri`,
  `diterima`, `terdaftar`, `aktif`, `cuti`, `pindah`, `lulus`,
  `mengundurkan_diri`, `dikeluarkan`, `meninggal` — bukan cuma 4 status
  operasional seperti sebelumnya. `calon_santri`/`diterima` belum punya
  alur UI (menunggu modul Admission), tapi sudah didefinisikan di enum
  Postgres sekarang karena enum sulit diubah tanpa downtime setelah ada
  data produksi.
- **`student_status_histories`** — perubahan status tidak pernah menimpa
  data lama; setiap perubahan jadi baris baru, baru `santri.status`
  diperbarui. Tab "Riwayat Status" di halaman detail santri menampilkan
  ini, dan (khusus admin) form "Ubah Status" untuk mencatat perubahan baru.
- **`santri.admission_id`/`exit_date`/`exit_reason`** ditambahkan sekarang
  (nullable, belum dipakai UI manapun) supaya modul Admission/Graduation
  nanti tidak perlu `ALTER TABLE` terhadap data yang sudah berisi santri
  sungguhan.

### Yang SENGAJA tidak diadopsi dari dokumen (dan kenapa)

Dokumen sumber mencakup 9 domain penuh (~80 tabel, 14 role granular,
Admission pipeline, Graduation clearance, Alumni tracer study, audit log
sistematis, Person/Student/Parent/Teacher abstraksi generik). Mengadopsi
semuanya sekaligus sekarang adalah over-engineering untuk SISAF yang masih
prototipe satu-pesantren:

- **Admission & Graduation pipeline penuh** — dikonfirmasi memang berjalan
  di pesantren, jadi bukan "tidak relevan", tapi sengaja ditunda sampai ada
  keputusan eksplisit untuk mengerjakannya sebagai fase terpisah.
- **14 role granular** (Admission Officer, Graduation Admin, Alumni Admin,
  dst.) — belum ditambahkan; 5 role SISAF saat ini sudah cukup untuk
  domain yang benar-benar dibangun.
- **Audit log sistematis, Person entity generik, Document versioning** —
  bernilai tapi merupakan pekerjaan infrastruktur besar tanpa fitur baru
  yang terlihat pengguna; ditunda sampai ada modul yang butuh.

## Modul

Akademik · Keuangan Santri · Kedisiplinan · Kesehatan & Asrama · Dokumen ·
**Notifikasi (simulasi)** — diakses lewat tab horizontal di halaman detail
santri (pola sama seperti mockup awal `sisaf-riwayat-akademik-santri.html`).

### Notifikasi WhatsApp — status: SIMULASI, belum kirim sungguhan

Tidak ada pesan WhatsApp nyata yang terkirim dari versi ini. Alasannya bukan
keterbatasan waktu, tapi keamanan: mengirim WA butuh token API pihak ketiga
yang **tidak boleh** berada di kode frontend (siapa pun bisa mencurinya lewat
DevTools browser). Pengiriman nyata baru bisa dibangun setelah ada backend
(Supabase Edge Function) yang menyimpan token tersebut di server.

Yang sudah berfungsi sekarang (mode mock):
- Riwayat notifikasi per santri (`getNotifikasiBySantri`)
- Toggle jenis event yang otomatis memicu notifikasi (`notifikasiSettings`) —
  hanya `admin`/`bendahara`
- Tombol "Kirim Simulasi" untuk menguji alur end-to-end tanpa kirim WA
  sungguhan (`simulateSendNotifikasi`)

Rekomendasi vendor WA API untuk saat migrasi nyata: pertimbangkan **official
WhatsApp Cloud API / reseller WABA** dibanding gateway tidak resmi (Fonnte,
Wablas, dll) — yang tidak resmi berisiko nomor di-ban permanen oleh Meta
kapan saja, karena mengotomasi WhatsApp Web, bukan API resmi. Ini keputusan
biaya-vs-risiko institusi, bukan sesuatu yang sudah diputuskan di kode ini.

## Status migrasi Supabase

**Belum ada project Supabase untuk SISAF.** Semua data saat ini adalah data
contoh (`mockDataService.js`), bukan data santri sesungguhnya.

Yang sudah disiapkan agar migrasi tidak perlu desain ulang:
1. `migrations/schema_sisaf_01_init.sql` — skema lengkap (kelas, santri,
   wali_santri, user_profiles, nilai_akademik, keuangan_santri,
   kedisiplinan, kesehatan_asrama, dokumen_santri) + kerangka RLS.
2. `supabaseDataService.js` — signature fungsi identik dengan
   `mockDataService.js`, tinggal diisi pemanggilan `supabase-js`.
3. Otorisasi divalidasi eksplisit di `app.js` (`_filterSantriByRole`),
   bukan mengandalkan RLS saja — prinsip yang sama dipakai di HRIS
   setelah RLS di sana ternyata belum pernah diuji terhadap Postgres
   nyata.

### Langkah migrasi saat project Supabase sudah dibuat
1. Jalankan `migrations/schema_sisaf_01_init.sql`.
2. Isi `CONFIG.SUPABASE_URL` dan `CONFIG.SUPABASE_ANON_KEY` di `config.js`.
3. Tambahkan `<script src=".../supabase-js@2">` di `index.html`.
4. Implementasikan setiap fungsi TODO di `supabaseDataService.js`.
5. Uji RLS per-role secara manual terhadap Postgres nyata (jangan
   ulangi tech debt HRIS: RLS yang tidak pernah diuji end-to-end).
6. Ubah `CONFIG.APP_MODE` ke `'supabase'`. Tidak ada perubahan di `app.js`.

### Rapor digital — cetak/simpan sebagai PDF

Tombol "Cetak Rapor" di setiap panel semester (tab Akademik) membuka
tampilan kop-surat formal dan memicu dialog cetak browser
(`window.print()`). Pengguna memilih "Save as PDF" di dialog tersebut.

Sengaja **tidak** memakai library PDF eksternal (jsPDF, dll) — memakai
kemampuan print bawaan browser lebih andal untuk layout formulir formal,
tidak menambah dependency CDN, dan hasilnya mengikuti gaya dokumen
institusional (hitam-putih, kop surat, bukan tampilan warna aplikasi).

**Perlu diisi sebelum dipakai untuk keperluan resmi:** alamat dan kontak
institusi masih placeholder — isi lewat menu "Pengaturan Institusi" (admin),
bukan lagi lewat `config.js`. Data seed awal sengaja dikosongkan agar jelas
terlihat harus diisi, bukan data yang saya karang.

## Perbaikan bug selama pengembangan (dicatat, bukan disembunyikan)

- `santriTableHtml` dan bagian identitas kelas di halaman detail santri
  sebelumnya memanggil `mockDataService` **langsung**, bukan lewat
  `dataService`. Ini berarti kalau `APP_MODE` diubah ke `'supabase'`, dua
  bagian ini akan tetap diam-diam memakai data mock. Sudah diperbaiki:
  `getKelasById`/`getWaliSantriById` sekarang async dan selalu dipanggil
  lewat `dataService`, dengan signature yang sama di kedua implementasi.
- Layar login sebelumnya menunggu fetch pengaturan institusi selesai
  sebelum menampilkan form — kalau koneksi lambat (Supabase nyata nanti),
  layar bisa tampak kosong. Diperbaiki: form login langsung tampil, nama
  institusi menyusul begitu siap (fetch di background, bukan blocking).
- Badge status di Daftar Santri sebelumnya **selalu hijau** ("Aktif")
  untuk semua santri apa pun status sebenarnya — cacat sejak awal, baru
  ketahuan saat menguji perubahan status (santri berstatus "Cuti" tetap
  tampil hijau). Diperbaiki dengan `statusBadgeHtml()` yang memetakan
  warna badge sesuai status sesungguhnya.

## Pengaturan Institusi — langkah pertama ke arah SaaS

Nama, alamat, dan kontak institusi **tidak lagi** di `config.js` — sudah
dipindah ke database (`getInstitutionSettings`/`updateInstitutionSettings`)
dan bisa diubah lewat menu "Pengaturan Institusi" di sidebar, khusus role
`admin`. Perubahan langsung berlaku di layar login dan kop surat rapor
tanpa perlu deploy ulang.

`config.js` sekarang hanya berisi hal teknis (mode data, kredensial
Supabase) — bukan data spesifik institusi. Ini pemisahan yang disengaja:
kalau SISAF benar-benar dikembangkan jadi SaaS multi-tenant, tabel
`institution_settings` tinggal ditambah kolom `tenant_id`, dan setiap
pesantren mengelola profilnya sendiri lewat menu yang sama — tanpa
menyentuh kode atau file konfigurasi.

**Belum dibangun** (di luar scope permintaan saat ini, dicatat supaya
tidak lupa): otorisasi `updateInstitutionSettings` masih divalidasi di
`app.js` lewat pengecekan role sebelum tombol/menu ditampilkan, bukan di
`mockDataService` itu sendiri — konsisten dengan prinsip HRIS, tapi
berarti kalau ada jalur lain memanggil fungsi ini langsung (mis. dari
console browser), tidak ada penghalang di level data. Ini perlu ditutup
dengan RLS + policy saat migrasi Supabase, bukan diperbaiki di mock.

## Tech debt yang disadari dari awal (bukan ditemukan belakangan)

- **Inline `onclick=` di HTML string** (`app.js`) — pola yang sama dipakai
  di HRIS `dataku2026`, dan di sana sudah tercatat sebagai tech debt
  (butuh CSP `unsafe-inline`). Direplikasi di sini untuk konsistensi
  arsitektur sesuai permintaan, bukan diperkenalkan tanpa sadar — refactor
  ke `addEventListener` + event delegation sebaiknya dilakukan bersamaan
  dengan refactor HRIS, bukan terpisah.
- **Sesi login tidak persisten** — state disimpan in-memory (bukan
  localStorage/cookie), hilang saat refresh. Perlu diputuskan sebelum
  produksi: Supabase Auth session (setelah migrasi) akan menangani ini
  secara native.
- **Password mock plaintext** di `mockDataService.js` — aman karena hanya
  data contoh in-memory, tapi jangan pernah dijadikan pola untuk data asli.
