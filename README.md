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

Akademik · **Presensi** · Keuangan Santri · Kedisiplinan · Kesehatan & Asrama ·
Dokumen · **Notifikasi (simulasi)** — diakses lewat tab horizontal di halaman
detail santri (pola sama seperti mockup awal
`sisaf-riwayat-akademik-santri.html`).

### Presensi Harian Santri

Tab riwayat presensi per santri (read-only, di halaman detail) + layar
"Input Presensi" terpisah di nav utama (`admin`, `wali_kelas`) untuk input
massal satu kelas/satu tanggal sekaligus. `wali_kelas` terkunci ke kelasnya
sendiri baik di UI maupun di RLS (`presensi_write_admin_or_own_class`) —
beda dari modul lain (nilai/kedisiplinan/kesehatan/dokumen) yang masih
admin-only di layer tulis karena memang belum ada form-nya; presensi punya
form nyata jadi policy-nya sengaja lebih terbuka, disesuaikan dengan
cakupan role di data layer (`getPresensiByKelasTanggal` di
`mockDataService.js`/`supabaseDataService.js`).

Status: seed mock + 3 fungsi data layer + tab + form input + RLS + migrasi
sudah ditulis lengkap. Migrasi & RLS presensi **belum dieksekusi ke Postgres
nyata**, sama seperti modul-modul Supabase lain — lihat "Status migrasi
Supabase" di bawah.

### Penerimaan Santri (Admission) & Kelulusan (Graduation)

Fitur ini dikerjakan mendahului "Jangan mulai Fase 3 sebelum Fase 1 selesai"
di README (lihat commit `faa7cec`) atas keputusan eksplisit user, karena
project Supabase memang belum bisa dibuat dari sesi mana pun sampai sekarang
— menunggu itu berarti fitur tidak pernah dibangun sama sekali. Konsekuensinya
sama seperti seluruh modul lain: jalur `supabaseDataService.js` 0% teruji
terhadap Postgres nyata, hanya kontrak/mock yang diverifikasi (`node --test`
+ `dom_verify.js`).

**UI sekarang sudah ada** (menyusul commit `faa7cec` yang baru data layer):

- **Nav "Penerimaan Santri"** (`admin` + `kepala_sekolah`, sesuai otorisasi
  `getApplicants`). `kepala_sekolah` hanya baca — tombol "+ Calon Santri
  Baru" dan aksi Terima/Daftarkan disembunyikan di UI (`canWrite` di
  `renderAdmission`), selain ditolak juga di data layer (admin-only).
- **Tabel calon santri** dengan badge status (`STATUS_LABEL`/`STATUS_BADGE_CLASS`
  yang sudah ada dipakai ulang, bukan didefinisikan lagi) + tombol aksi yang
  berubah sesuai status: `calon_santri` → tombol **Terima**; `diterima` →
  tombol **Daftarkan sebagai Santri** yang membuka form inline (NIS, kelas,
  wali santri — dropdown wali santri dipasok fungsi baru `getWaliSantriList`,
  ditambahkan ke kedua data service + parity list test); `terdaftar` →
  tautan langsung ke profil santri yang otomatis dibuat.
- **Form "Calon Santri Baru"** (admin) — toggle inline, bukan modal terpisah,
  konsisten dengan pola form presensi yang sudah ada.
- **Kelulusan** dipindah ke tab "Riwayat Status" halaman detail santri
  (bukan halaman terpisah) supaya konteks santri & riwayat status tetap satu
  layar. Panel "Kelulusan (Graduation Clearance)" hanya muncul untuk santri
  yang belum berstatus keluar (`lulus`/`mengundurkan_diri`/`dikeluarkan`/
  `meninggal`/`pindah`), menampilkan hasil `checkGraduationEligibility`
  (badge layak/belum + alasan), dan tombol **Luluskan Santri** dinonaktifkan
  kalau belum layak — sama seperti seluruh modul lain, ini bantuan UI, BUKAN
  satu-satunya penjaga aturan; `graduateSantri` di data layer tetap mengecek
  ulang eligibility sebelum memproses.

**Yang BELUM ada / catatan jujur:**
- `updateApplicantStatus` di jalur Supabase belum satu transaksi Postgres
  (dicatat sejak commit `faa7cec`) — migrasikan ke RPC transactional sebelum
  dipakai rutin di production.
- Tidak ada halaman "riwayat kelulusan" terpisah — untuk melihat santri yang
  sudah lulus, cek `daftar santri` (badge merah "Lulus") lalu buka riwayat
  statusnya.
- `dom_verify.js` diperluas dengan alur penuh (buat calon santri → terima →
  daftarkan → verifikasi baris santri baru otomatis terbentuk) + pengecekan
  guard akses per role, dan `tests/data_service_contract.test.js` mendapat
  test baru untuk `getWaliSantriList`. Hasil sebelum ditulis di sini:
  `node --test tests/data_service_contract.test.js` 26/26 pass (1 skip =
  suite supabase), `node dom_verify.js` PASS penuh 5 role.

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

**Sudah ditutup:** otorisasi `updateInstitutionSettings` sekarang
divalidasi juga di `mockDataService`/`supabaseDataService` (parameter
`currentUser`, cek terhadap `SETTINGS_MANAGER_ROLES`), bukan cuma di
`app.js` lewat sembunyi tombol/menu. Konsisten dengan RLS
`institution_settings_update_admin_only` yang sudah admin-only sejak
awal di `schema_sisaf_02_rls_policies.sql`.

## Tech debt yang disadari dari awal (bukan ditemukan belakangan)

- ~~**Inline `onclick=` di HTML string**~~ — **sudah diperbaiki.** Semua
  8 titik `onclick=` di `app.js` sudah direfactor ke `data-action` +
  satu delegated listener di `#app` (lihat `ACTION_HANDLERS` di akhir
  `app.js`). CSP tanpa `unsafe-inline` sekarang memungkinkan. `dom_verify.js`
  sudah disesuaikan mengikuti selector baru. **Aturan untuk kontributor
  baru: jangan tambah `onclick=` inline lagi** — tambah `data-action`
  baru + satu entri di `ACTION_HANDLERS`.
- ~~**Sesi login tidak persisten**~~ — **sudah diperbaiki.** Sesi
  disimpan di `sessionStorage` lewat `sessionPersistence.js` (bertahan
  saat refresh, otomatis kosong saat tab ditutup — sengaja tidak pakai
  `localStorage` supaya tidak jadi sesi permanen di perangkat bersama).
  Akan digantikan oleh Supabase Auth session management native setelah
  migrasi backend.
- **Password mock plaintext** di `mockDataService.js` — aman karena hanya
  data contoh in-memory, tapi jangan pernah dijadikan pola untuk data asli.
- **BUG DITEMUKAN (belum diperbaiki):** `const SETTINGS_MANAGER_ROLES`
  dideklarasikan di DUA file (`app.js` baris 39 dan `mockDataService.js`
  baris 165) — masing-masing scope module aman di browser (tag `<script>`
  terpisah), TAPI `dom_verify.js` meng-eval semua file ke satu scope global
  yang sama sehingga `SyntaxError: Identifier 'SETTINGS_MANAGER_ROLES' has
  already been declared` dan verifikasi DOM gagal total. Sudah ada sejak
  commit awal (`24c8432`)/README menyebutnya duplikasi sengaja untuk
  otorisasi dua lapis — niatnya benar, tapi nama variabel harus dibedakan
  atau salah satu di-namespace (mis. `MockDB.SETTINGS_MANAGER_ROLES`).
  **Perbaikan disarankan sebelum PR berikutnya yang menyentuh `dom_verify.js`.**

## Riset Komparatif & Rekomendasi Fitur Tambahan

Bagian ini hasil riset terhadap aplikasi sejenis di GitHub (sistem
informasi pesantren dan SIS umum) per 16 Agustus 2026, untuk melihat
fitur apa yang lazim ada tapi belum tercakup di roadmap 5 fase SISAF
saat ini. **Ini rekomendasi, bukan komitmen** — keputusan mengadopsi
tetap di tangan tim/pemilik produk, dan sebagian besar butuh diskusi
skop dulu sebelum masuk fase manapun.

Repo yang dijadikan pembanding: `mharisudn/santri` (SIM Kesantrian),
`dibaliqaja/pesantren-cms`, `AhmadMuzayyin/digitren`,
`dnzykreatif-dev/Santri-Analytics` (hafalan & absensi berbasis Google
Sheets), `nurd0tid/SiPONPES`, serta pola umum di topik GitHub
`student-information-system` / `school-management` (mis. openSIS,
EduCore).

### Prioritas tinggi — celah nyata dibanding aplikasi sejenis

> Status per fase ini: item #1 **selesai** (lihat "Presensi Harian Santri"
> di atas). Item #2 dan #3, ditambah item #4 (hafalan, dari daftar
> "prioritas sedang" di bawah), sekarang punya rencana kerja rinci siap
> dikerjakan tim paralel — lihat **"Fase 6 — Roadmap Pengembangan
> Selanjutnya"** di bagian bawah README ini.

1. **Presensi harian santri** (bukan cuma catatan kedisiplinan
   insidental). Hampir semua pembanding punya ini sebagai modul
   terpisah dari "pelanggaran". Cocok jadi tabel baru
   (`presensi_harian`) + tab baru di halaman detail santri, mengikuti
   pola tab yang sudah ada (`TABS` di `app.js`). Tidak butuh Supabase
   untuk mulai — bisa dirancang & di-mock dulu seperti modul lain.
2. **Buku kas / tabungan santri** (uang saku, bukan tagihan SPP).
   Muncul di PesantrenCMS dan Digitren sebagai fitur inti, karena di
   pesantren uang santri sering dititip-kelola pihak sekolah. Beda
   dari `keuanganSantri` (tagihan) yang sudah ada — ini saldo & mutasi
   dua arah (setor/tarik).
3. **Log aktivitas / audit trail** (PesantrenCMS punya ini eksplisit).
   SISAF sudah punya `changeStudentStatus` yang menyimpan riwayat, tapi
   belum ada log umum untuk siapa-mengubah-apa-kapan di seluruh
   aplikasi (mis. siapa mengubah pengaturan institusi, siapa
   menambah nilai). Penting untuk akuntabilitas data pribadi santri —
   sejalan dengan semangat `errorTracking.js` yang sudah dibuat, tinggal
   diperluas jadi audit log, bukan cuma error log.

### Prioritas sedang — relevan untuk konteks pesantren

4. **Pelacakan hafalan Al-Qur'an per juz/surat.** Santri Analytics
   menjadikan ini modul utama, bukan sekadar baris di nilai akademik
   seperti sekarang (lihat seed `nilaiAkademik` yang menyamakan
   "Tahfizh" dengan mata pelajaran biasa). Kalau institusi memang
   fokus tahfizh, modul terpisah dengan progres per juz akan jauh
   lebih berguna daripada nilai huruf A/B/C.
5. **Perizinan pulang/keluar asrama** dengan alur approval (mirip
   "Pulang Bulanan" di Santri Analytics). Bisa dibangun di atas pola
   `changeStudentStatus` yang sudah ada — status `izin_pulang` dengan
   tanggal kembali, bukan status permanen.
6. **Portal santri sendiri**, bukan cuma wali santri. Saat ini role
   `wali_santri` cuma untuk orang tua; kalau santri (terutama yang
   lebih besar) juga perlu login sendiri melihat nilai/jadwalnya
   sendiri, ini role baru yang perlu ditambah di `ROLE_LABEL` dan
   matriks otorisasi.

### Prioritas rendah / opsional — pertimbangkan tapi tidak mendesak

7. **Jadwal pelajaran/kelas** — umum di SIS generik, tapi SISAF
   fokusnya administrasi kesantrian, bukan akademik penuh; masuk akal
   ditunda sampai ada permintaan eksplisit.
8. **Manajemen inventaris/aset asrama** (muncul di EduCore) — relevan
   kalau pesantren juga mau mengelola barang, tapi jauh dari
   scope inti "data santri" saat ini.
9. **Absensi biometrik/RFID/face-recognition** — pola umum di
   pembanding SIS besar (openSIS, beberapa proyek attendance-system),
   tapi ini investasi hardware, bukan sekadar fitur software; taruh di
   backlog jangka panjang saja.

### Yang SUDAH lebih baik di SISAF dibanding kebanyakan pembanding

Untuk konteks — bukan berarti semua pembanding lebih unggul:
- **Otorisasi berlapis** (UI + data layer + RLS) sudah eksplisit di
  SISAF sejak awal; kebanyakan proyek serupa (termasuk yang di atas)
  hanya mengandalkan cek di layer PHP/controller tanpa RLS database.
- **Riwayat status tidak ditimpa** (`changeStudentStatus` selalu
  menambah baris baru) — banyak pembanding memakai kolom `status`
  tunggal yang ditimpa langsung, kehilangan histori.
- **Test kontrak otomatis untuk data layer** — jarang ditemukan di
  proyek PHP/Laravel sejenis pada riset ini.



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
| ~~Test otomatis untuk data layer~~ **Selesai** — `tests/data_service_contract.test.js`, jalankan dengan `node --test tests/data_service_contract.test.js`. 14 assertion lulus terhadap mock (paritas 20 fungsi, otorisasi role, riwayat status tidak ditimpa, dll). Suite terhadap supabase otomatis aktif begitu env var `SISAF_SUPABASE_URL` & `SISAF_SUPABASE_ANON_KEY` diisi (setelah project Supabase dibuat) — sampai saat itu di-skip, bukan gagal. | `tests/data_service_contract.test.js` | **QA / Frontend Dev A** |
| ~~Setup error tracking~~ **Selesai** — `errorTracking.js` (self-hosted, tanpa Sentry/pihak ketiga karena data santri sensitif tidak boleh keluar). Menangkap `window.onerror` & `unhandledrejection` global, redaksi otomatis pola NIS/email dari pesan sebelum disimpan di `window.SISAF_ERRORS` (buffer memori, maks 50, tidak persisten). `window.SISAF_reportHandledError(context, err)` tersedia untuk dipanggil manual dari `catch` baru yang ditambahkan nanti. | `errorTracking.js`, `index.html` | **Frontend Dev B** |
| ~~Review & rapikan CSS/komponen UI berulang~~ **Selesai** — pola "kartu permukaan" (background+border+shadow, dipakai di `.login-card`/`.stat-card`/`.panel`) dan gradien logo "mark" (`.login-brand .mark`/`.brand .mark`) digabung jadi selector bersama di `styles.css`. Nama class & tampilan tidak berubah — cek: `app.js` masih memakai class yang sama persis. | `styles.css` | **Frontend Dev B** |

**Fase 2 selesai seluruhnya** (per commit yang menambahkan baris ini).
Fase 1 (backend Supabase nyata) masih diblokir menunggu project Supabase
dibuat — lihat bagian "Status blocker" di README.

**Catatan:** aturan "jangan mulai Fase 3 sebelum Fase 1" di bawah ini
**tidak diikuti** — Fase 3 (data layer di `faa7cec`, lalu UI di commit
setelahnya) dikerjakan lebih dulu atas keputusan eksplisit user, karena
Fase 1 (project Supabase nyata) tidak bisa dibuat dari sesi non-manusia
mana pun. Menunggu Fase 1 berarti Fase 3 tidak pernah dikerjakan. Trade-off
ini diterima secara sadar: jalur `supabaseDataService.js` untuk Admission/
Graduation 0% teruji terhadap Postgres nyata, sama seperti modul lain.

### Fase 3 — Modul Admission & Graduation

Enum `status_santri` dan kolom `admission_id`/`exit_date`/`exit_reason`
di tabel `santri` sudah disiapkan (lihat bagian "Fondasi: Student Master"
di atas) supaya fase ini tidak perlu `ALTER TABLE` terhadap data produksi.

| Tugas | File yang disentuh | Status |
|---|---|---|
| Desain tabel `applicants` + alur `calon_santri` → `diterima` → `terdaftar` | migrasi `schema_sisaf_03_admission.sql` | **Selesai** (skema tertulis; **belum dijalankan** ke Postgres nyata — sama seperti migrasi lain) |
| Data layer Admission/Graduation (`getApplicants`, `createApplicant`, `updateApplicantStatus`, `checkGraduationEligibility`, `graduateSantri`) | `mockDataService.js` + `supabaseDataService.js` | **Selesai**, diuji lewat `tests/data_service_contract.test.js` (mock) |
| UI form pendaftaran calon santri baru + tabel status + form "daftarkan sebagai santri" | `app.js` (`renderAdmission` + handler terkait, fungsi baru — tidak mengedit fungsi render lain) | **Selesai** — lihat bagian "Penerimaan Santri & Kelulusan" di atas |
| Alur Graduation clearance (syarat kelulusan, cek keuangan lunas, dst.) | `app.js` (panel di tab "Riwayat Status") + `checkGraduationEligibility`/`graduateSantri` (data layer, sudah ada) | **Selesai** |
| RLS untuk tabel `applicants` | `migrations/rls_test.sql` (assertion) + `schema_sisaf_03_admission.sql` (policy) | Tertulis, **belum diuji terhadap Postgres nyata** (blocker sama dengan Fase 1) |

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

### Fase 6 — Roadmap Pengembangan Selanjutnya (3 Fitur Prioritas)

Tiga fitur ini diambil langsung dari bagian "Prioritas tinggi/sedang —
celah nyata dibanding aplikasi sejenis" di atas (hasil riset komparatif
`f31eb80`). Presensi Harian (prioritas #1 riset itu) sudah selesai
(`fd2a479`–`75644e6`), jadi tiga berikutnya inilah yang paling bernilai
untuk dikerjakan sekarang. Ketiganya **independen satu sama lain** —
tidak ada urutan wajib, dan tidak ada ketergantungan pada Fase 1
(Supabase nyata) untuk *mulai* mengerjakan (pola sama seperti Presensi
dan Admission: desain + mock dulu, migrasi ditulis tapi menunggu
project Supabase untuk dieksekusi).

**Aturan kerja paralel untuk fase ini** (tambahan dari aturan umum di
atas): setiap fitur menyentuh file baru untuk data/migrasinya sendiri,
tapi ketiganya **sama-sama akan menyentuh `app.js` (nav baru), `styles.css`
kalau perlu komponen baru, dan `tests/data_service_contract.test.js`
(baris di `REQUIRED_FUNCTIONS`)**. Untuk `app.js` khususnya: tiap tim
menambah fungsi `render<NamaFitur>()` + handler baru sendiri (pola yang
sama dipakai `renderAdmission`/`renderPresensiInput`), **jangan mengedit
fungsi render fitur lain**, dan tambahkan entry `NAV_ITEMS` masing-masing
di baris terpisah supaya git merge tidak konflik di baris yang sama.
Kalau tiga tim mengedit `app.js` di waktu yang sama, koordinasi urutan
merge dulu di grup — PR kedua & ketiga tinggal `git rebase` di atas PR
pertama yang sudah masuk `main`.

#### 6.1 — Buku Kas / Tabungan Santri (uang saku)

**Kenapa prioritas tinggi:** beda dari `keuanganSantri` (tagihan SPP
sekolah) yang sudah ada, ini saldo & mutasi dua arah — orang tua/wali
menitipkan uang saku ke pesantren, santri menariknya bertahap. Modul
ini eksplisit ada di PesantrenCMS dan Digitren (lihat riset komparatif
`f31eb80`) dan relevan langsung dengan Bagian 12 (Strategi Keuangan)
di `Dokumen_Induk_Transformasi_Pesantren_Lamjampok.docx` — pesantren
memang menitip-kelola uang santri secara operasional, bukan sekadar
ide fitur.

| Yang dibangun | File |
|---|---|
| Tabel baru `tabungan_santri` (saldo per santri) + `tabungan_mutasi` (setor/tarik, riwayat tidak ditimpa — pola sama dengan `student_status_histories`) | migrasi baru `migrations/schema_sisaf_04_tabungan.sql` |
| Seed mock + `getTabunganBySantri`, `getMutasiTabunganBySantri`, `setorTabungan`, `tarikTabungan` (validasi saldo cukup sebelum tarik) | `mockDataService.js` + `supabaseDataService.js` (signature identik, tambahkan ke `REQUIRED_FUNCTIONS`) |
| Tab baru **"Tabungan"** di halaman detail santri (tambah ke `TABS` di `app.js`) — saldo + riwayat mutasi, read-only untuk semua role yang bisa lihat santri tsb | `app.js` (`renderTabTabungan`, entri baru di `TABS`) |
| Form setor/tarik — siapa yang boleh input transaksi perlu diputuskan (kandidat: `admin` + `bendahara`, sama dengan otorisasi Keuangan Santri yang sudah ada) | `app.js` (form + handler baru), disepakati bersama Backend Lead sebelum ditulis di RLS |
| RLS: baca sama dengan scope Keuangan Santri (per-role), tulis admin+bendahara saja | `migrations/schema_sisaf_04_tabungan.sql` + assertion baru di `tests/rls_test.sql` |

**Belum diputuskan (didiskusikan tim sebelum mulai):** apakah saldo bisa
minus (kasbon) atau harus selalu ≥ 0 — pilihan ini menentukan constraint
`check` di kolom saldo, jadi harus diputuskan sebelum menulis migrasi,
bukan sesudah.

#### 6.2 — Log Aktivitas / Audit Trail

**Kenapa prioritas tinggi:** SISAF sudah punya riwayat status santri
(`student_status_histories`) yang tidak ditimpa, tapi belum ada log umum
untuk "siapa mengubah apa, kapan" di seluruh aplikasi — misalnya siapa
mengubah `institution_settings`, siapa menambah nilai akademik, siapa
menghapus applicant. Penting untuk akuntabilitas data pribadi santri,
dan PesantrenCMS (pembanding di riset `f31eb80`) punya ini secara
eksplisit. Ini juga perluasan wajar dari `errorTracking.js` yang sudah
ada — pola self-hosted yang sama (tanpa Sentry/pihak ketiga, karena data
santri sensitif), tinggal diperluas dari "log error" jadi "log aksi".

| Yang dibangun | File |
|---|---|
| Tabel `audit_log` (siapa/`user_id`, aksi, entitas+id yang disentuh, nilai lama→baru sebagai JSON, timestamp) | migrasi baru `migrations/schema_sisaf_05_audit_log.sql` |
| Fungsi `recordAuditLog(action, entity, entityId, before, after, currentUser)` dipanggil dari fungsi tulis yang sudah ada (`updateInstitutionSettings`, `changeStudentStatus`, `updateApplicantStatus`, dst.) — **bukan fitur baru yang berdiri sendiri, tapi menyisip ke fungsi existing**, jadi butuh koordinasi ekstra supaya tidak bentrok dengan tim lain yang kebetulan sedang menyentuh fungsi yang sama | `mockDataService.js` + `supabaseDataService.js` |
| Tampilan **"Log Aktivitas"** — halaman baru di nav utama (bukan tab per-santri, karena lintas-santri), admin-only, dengan filter tanggal/user/entitas | `app.js` (view baru `renderAuditLog`, entri `NAV_ITEMS` `roles: ['admin']`) |
| RLS: hanya admin yang boleh membaca; **tidak ada yang boleh menghapus/mengubah baris log** (append-only, ditegakkan lewat `revoke update, delete` di RLS, bukan cuma dilarang di UI) | `migrations/schema_sisaf_05_audit_log.sql` |

**Catatan desain penting:** karena fungsi ini "menyisip" ke banyak
fungsi tulis yang sudah ada (bukan menambah fungsi baru murni),
**tim yang mengerjakan ini sebaiknya mulai paling akhir** dari ketiga
fitur di fase ini, atau koordinasi intens dengan siapa pun yang sedang
menyentuh `mockDataService.js`/`supabaseDataService.js` di waktu
bersamaan — risiko konflik merge paling tinggi dari tiga fitur ini.

#### 6.3 — Pelacakan Hafalan Al-Qur'an per Juz/Surat

**Kenapa prioritas tinggi:** seed `nilaiAkademik` saat ini menyamakan
"Tahfizh" dengan mata pelajaran biasa (nilai huruf A/B/C), padahal untuk
pesantren yang fokus tahfizh, progres per juz/surat jauh lebih berguna
dan lebih sering dicek orang tua. `Dokumen_Induk_Transformasi_Pesantren_Lamjampok.docx`
eksplisit menjadikan ini indikator lulusan (Bagian 5, karakter #4
"Berilmu Al-Qur'an" — target 5 juz/15 juz tergantung program) dan KPI
strategis (K12: "Jumlah hafizh Al-Qur'an per angkatan"), dan repo
pembanding Santri Analytics menjadikan modul ini utama, bukan sekadar
baris nilai.

| Yang dibangun | File |
|---|---|
| Tabel `hafalan_santri` (santri_id, juz/surat, tanggal setor, status: `lancar`/`perlu_muroja'ah`/`belum_lancar`, penguji) — desain skema (per juz vs per surat vs keduanya) didiskusikan dulu dengan pengasuhan/ubudiyah, ini bukan keputusan teknis murni | migrasi baru `migrations/schema_sisaf_06_hafalan.sql` |
| Seed mock + `getHafalanBySantri`, `recordSetoranHafalan`, `getRingkasanHafalanBySantri` (total juz lancar, progres ke target program) | `mockDataService.js` + `supabaseDataService.js` |
| Tab baru **"Hafalan"** di halaman detail santri (progres per juz, riwayat setoran) — menggantikan baris "Tahfizh" yang sekarang tercampur di tab Akademik (`nilaiAkademik`), **tanpa menghapus data lama** — cukup berhenti menambah baris baru berkategori Tahfizh ke `nilaiAkademik` setelah modul ini aktif | `app.js` (`renderTabHafalan`, entri baru di `TABS`) |
| Form input setoran — kandidat penanggung jawab: role yang sama dengan yang mengelola Ubudiyah/Musyrif di dokumen JobDesc (`09_JobDesc_KPI_Pesantren_MUSYKER_2026.docx`, jabatan `UBUD-001`/`MUSYRIF-001`) — SISAF belum punya role sedetail itu, jadi keputusan sementara: `admin` + `wali_kelas` dulu (pola sama dengan Presensi), diperluas kalau modul role granular dibangun | `app.js` (form + handler baru) |
| RLS: baca mengikuti scope santri yang sudah ada (`_filterSantriByRole`), tulis admin+wali_kelas | `migrations/schema_sisaf_06_hafalan.sql` + assertion baru di `tests/rls_test.sql` |

**Belum diputuskan:** skema per-juz (30 baris tetap per santri) vs
per-surat (114 baris, lebih presisi tapi lebih berat) vs hybrid —
putuskan bersama sebelum menulis migrasi, karena mengubah granularitas
setelah ada data produksi butuh migrasi data, bukan cuma `ALTER TABLE`.

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

