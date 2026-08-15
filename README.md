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
  schema_sisaf_01_init.sql          skema lengkap, BELUM DIJALANKAN
  schema_sisaf_02_rls_policies.sql  RLS policy nyata, BELUM DIJALANKAN
tests/
  rls_test.sql               pgTAP — 26 assertion, per-role + anon
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
1. Buat project Supabase, jalankan `migrations/schema_sisaf_01_init.sql`
   lalu `migrations/schema_sisaf_02_rls_policies.sql`.
2. Jalankan `tests/rls_test.sql` (`supabase test db`) — perbaiki policy
   yang gagal sebelum lanjut.
3. Isi `CONFIG.SUPABASE_URL` dan `CONFIG.SUPABASE_ANON_KEY` di `config.js`.
   `index.html` sudah memuat `<script supabase-js@2>` dari CDN, tidak
   perlu diedit lagi.
4. Uji **setiap** fungsi `supabaseDataService.js` manual per role —
   sudah diimplementasikan penuh (lihat status di bawah) tapi belum
   pernah dieksekusi terhadap Postgres nyata.
5. Ubah `CONFIG.APP_MODE` ke `'supabase'`. Tidak ada perubahan di `app.js`.

### Status `supabaseDataService.js` — sudah ditulis, BELUM diuji nyata

Semua 20 fungsi sudah diimplementasikan mengikuti pola `supabase-js`,
dengan paritas signature terhadap `mockDataService.js` (diverifikasi
otomatis: nama fungsi sama persis, tidak ada yang tertinggal di salah
satu sisi). Beberapa catatan penting untuk siapa pun yang menguji/
melanjutkan ini:

- **`changeStudentStatus`** — insert riwayat status lalu update
  `santri.status` masih **dua langkah terpisah**, bukan satu transaksi.
  Kalau langkah kedua gagal setelah langkah pertama berhasil, data jadi
  tidak konsisten (errornya sengaja dibuat jelas, bukan ditelan). Ini
  **harus** dimigrasikan ke Postgres function (RPC) transactional
  sebelum dipakai rutin di production.
- **`login`** — request Supabase Auth dan `user_profiles` adalah dua
  panggilan terpisah; kalau akun Auth ada tapi profilnya belum dibuat,
  fungsi mengembalikan pesan error yang membedakan kasus ini dari
  "password salah", supaya tidak salah didiagnosis.
- **RLS sebagai source of truth di jalur Supabase** — berbeda dari
  `mockDataService` (yang memfilter santri manual di JS karena tidak
  ada RLS sama sekali), versi Supabase mengandalkan
  `schema_sisaf_02_rls_policies.sql` untuk scope akses. Kalau RLS belum
  diuji lulus (`tests/rls_test.sql`), JANGAN nyalakan `APP_MODE='supabase'`
  di production — kebocoran data antar kelas/wali bisa terjadi diam-diam.
- Sandbox pengembangan tidak bisa menjangkau `*.supabase.co`, jadi yang
  sudah diverifikasi otomatis hanya: sintaks valid, paritas 20/20 fungsi
  dengan mock, dan pesan error yang jelas saat client belum dikonfigurasi.
  **Belum** diverifikasi: query benar-benar mengembalikan data yang benar
  dari Postgres sungguhan.

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

- ~~**Inline `onclick=` di HTML string**~~ — **sudah diperbaiki.** Semua
  8 titik `onclick=` di `app.js` sudah direfactor ke `data-action` +
  satu delegated listener di `#app` (lihat `ACTION_HANDLERS` di akhir
  `app.js`). CSP tanpa `unsafe-inline` sekarang memungkinkan. `dom_verify.js`
  sudah disesuaikan mengikuti selector baru. **Aturan untuk kontributor
  baru: jangan tambah `onclick=` inline lagi** — tambah `data-action`
  baru + satu entri di `ACTION_HANDLERS`.
- **Sesi login tidak persisten** — state disimpan in-memory (bukan
  localStorage/cookie), hilang saat refresh. Perlu diputuskan sebelum
  produksi: Supabase Auth session (setelah migrasi) akan menangani ini
  secara native.
- **Password mock plaintext** di `mockDataService.js` — aman karena hanya
  data contoh in-memory, tapi jangan pernah dijadikan pola untuk data asli.

## Rencana Pengembangan Selanjutnya & Pembagian Peran Tim

Bagian ini untuk tim yang mengembangkan SISAF bersama-sama. Tujuannya
dua: (1) urutan kerja yang jelas supaya tidak ada yang membangun di atas
fondasi yang belum siap, dan (2) **pembagian file/modul per orang supaya
tidak ada dua orang mengedit file yang sama secara bersamaan** — ini
penyebab paling umum "code malfunction" di proyek kecil: bukan karena
kodenya salah, tapi karena dua perubahan saling menimpa tanpa sadar.

### Aturan kerja sama (wajib dibaca sebelum mulai)

1. **Satu file/modul = satu penanggung jawab per fase.** Kalau perlu
   menyentuh file yang bukan tanggung jawabmu, koordinasi dulu di grup
   tim, jangan langsung commit.
2. **Selalu lewat `dataService.js`, jangan pernah panggil
   `mockDataService`/`supabaseDataService` langsung dari `app.js`.**
   Ini sudah pernah jadi bug nyata di proyek ini (lihat bagian "Perbaikan
   bug" di atas) — sekali lagi terjadi berarti fitur diam-diam pakai data
   mock walau `APP_MODE` sudah `'supabase'`.
3. **Signature fungsi di `mockDataService.js` dan `supabaseDataService.js`
   harus identik** (nama fungsi, urutan parameter, bentuk return). Kalau
   menambah fungsi baru, tambahkan di **kedua** file sekaligus meski
   `supabaseDataService` isinya masih TODO — supaya tidak ada yang lupa.
4. **Jangan tambah `onclick=` inline baru** — pakai pola `data-action`
   yang sudah ada (lihat bagian Tech debt di atas).
5. **RLS dan otorisasi di `app.js` harus tetap sinkron.** Kalau menambah
   izin tulis baru untuk suatu role, tambahkan juga policy-nya di
   `migrations/schema_sisaf_02_rls_policies.sql` pada PR yang sama — jangan
   dipisah ke PR lain, supaya tidak ada window waktu di mana keduanya
   tidak sinkron.
6. **Branch per fase/modul**, nama branch `fase-<n>-<modul>` (mis.
   `fase-1-migrasi-supabase`), PR ke `main` setelah `dom_verify.js` (dan
   `rls_test.sql` kalau relevan) lulus lokal.

### Fase 1 — Fondasi Backend (blocking, kerjakan lebih dulu)

Tidak ada fase lain yang boleh mulai sebelum fase ini selesai, karena
semuanya bergantung pada backend nyata ada.

| Tugas | File yang disentuh | Penanggung jawab |
|---|---|---|
| Buat project Supabase, jalankan `schema_sisaf_01_init.sql` lalu `schema_sisaf_02_rls_policies.sql` | `migrations/` | **Backend Lead** |
| Jalankan `tests/rls_test.sql` (`supabase test db`) terhadap Postgres nyata, perbaiki policy yang gagal | `migrations/schema_sisaf_02_rls_policies.sql`, `tests/rls_test.sql` | **Backend Lead** |
| Isi `supabaseDataService.js` — ganti setiap TODO dengan pemanggilan `supabase-js` nyata, signature harus tetap sama persis dengan `mockDataService.js` | `supabaseDataService.js` | **~~Backend Dev~~ Sudah ditulis, perlu diuji** — lihat bagian status di atas |
| Isi kredensial Supabase (URL, anon key), tambahkan `<script supabase-js>` | `config.js`, `index.html` | **Backend Lead** |
| Migrasi sesi login ke Supabase Auth (`onAuthStateChange`, dsb.) | `app.js` (hanya bagian `handleLogin`/`handleLogout`/init sesi — koordinasi dengan siapa pun yang pegang Fase 2 di `app.js`) | **Backend Dev** |

**Keluaran fase ini:** `CONFIG.APP_MODE = 'supabase'` bisa dinyalakan
dan seluruh `dom_verify.js` tetap lulus tanpa mengubah UI.

### Fase 2 — Kualitas & Keamanan Frontend (bisa paralel dengan Fase 1)

Tidak bergantung pada backend, jadi bisa dikerjakan bersamaan oleh orang
berbeda selama tidak menyentuh file yang sama di waktu yang sama.

| Tugas | File yang disentuh | Penanggung jawab |
|---|---|---|
| Test otomatis untuk data layer: satu test suite yang dijalankan terhadap **mock maupun supabase** dengan assertion yang sama, memastikan kontrak signature terjaga | file baru `tests/data_service_contract.test.js` | **QA / Frontend Dev A** |
| Setup error tracking (Sentry atau setara) — penting karena ini data pribadi santri | file baru, minimal invasif ke `app.js` | **Frontend Dev B** |
| Review & rapikan CSS/komponen UI berulang jika ditemukan duplikasi | `styles.css` | **Frontend Dev B** |

**Jangan mulai Fase 3 sebelum Fase 1 selesai** — modul Admission/Graduation
butuh backend nyata untuk pipeline status yang lebih kompleks dari yang
mock bisa simulasikan dengan baik (banyak state transisi, validasi
dokumen, dsb.).

### Fase 3 — Modul Admission & Graduation

Enum `status_santri` dan kolom `admission_id`/`exit_date`/`exit_reason`
di tabel `santri` sudah disiapkan (lihat bagian "Fondasi: Student Master"
di atas) supaya fase ini tidak perlu `ALTER TABLE` terhadap data produksi.

| Tugas | File yang disentuh | Penanggung jawab |
|---|---|---|
| Desain tabel `applicants` + alur `calon_santri` → `diterima` → `terdaftar` | migrasi baru `schema_sisaf_03_admission.sql` | **Backend Lead** |
| UI form pendaftaran calon santri baru | `app.js` (fungsi render baru, **jangan edit fungsi render yang sudah ada** — tambah fungsi baru dan panggil dari router) | **Frontend Dev A** |
| Alur Graduation clearance (syarat kelulusan, cek keuangan lunas, dst.) | `app.js` + fungsi baru di `dataService`/kedua implementasi | **Frontend Dev A + Backend Dev** (koordinasi) |
| RLS untuk tabel `applicants` | `schema_sisaf_03_admission.sql` | **Backend Lead** |

### Fase 4 — Notifikasi WhatsApp Nyata

Baru dikerjakan setelah Fase 1 selesai — butuh Supabase Edge Function
untuk menyimpan token API di server (lihat bagian "Notifikasi WhatsApp"
di atas untuk alasan keamanannya).

| Tugas | File yang disentuh | Penanggung jawab |
|---|---|---|
| Edge Function pengirim WA (WhatsApp Cloud API resmi) | project Supabase (Edge Functions), bukan file di repo ini | **Backend Lead** |
| Trigger pengiriman dari `simulateSendNotifikasi` → panggilan nyata | `supabaseDataService.js` | **Backend Dev** |

### Fase 5 — Multi-tenant SaaS (opsional, keputusan bisnis dulu)

Jangan mulai tanpa keputusan eksplisit dari pemilik produk — ini
perubahan besar ke RLS (per-tenant, bukan cuma per-role). `institution_settings`
sudah disiapkan arahnya (lihat bagian terkait di atas).

### Ringkasan pembagian peran (siapa pegang apa secara umum)

- **Backend Lead** — migrasi SQL, RLS policy, keputusan skema, review PR
  yang menyentuh `migrations/`.
- **Backend Dev** — implementasi `supabaseDataService.js`, integrasi
  Edge Function.
- **Frontend Dev A** — modul baru di `app.js` (Admission/Graduation) —
  selalu tambah fungsi baru, hindari mengedit fungsi render yang sudah
  ada dan sedang dipakai modul lain.
- **Frontend Dev B** — kualitas, error tracking, styling, refactor teknis
  (bukan fitur baru) di `app.js`/`styles.css`.
- **QA** — `dom_verify.js`, `rls_test.sql`, test kontrak data layer;
  wajib jalan hijau sebelum PR di-merge, siapa pun pengarangnya.

Kalau tim lebih kecil dari 5 orang, satu orang bisa pegang lebih dari
satu peran — yang penting **satu orang tidak mengedit file yang sama
dengan orang lain di waktu bersamaan tanpa koordinasi**, itu prinsip
intinya, bukan jumlah orangnya.

