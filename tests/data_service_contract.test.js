// ============================================================
// SISAF — tests/data_service_contract.test.js
//
// Test kontrak untuk data layer. Tujuan: satu set assertion yang
// sama dijalankan terhadap SEMUA implementasi dataService
// (mockDataService sekarang, supabaseDataService begitu ada
// project Supabase nyata) supaya app.js bisa menukar implementasi
// tanpa takut perilaku diam-diam berubah.
//
// Cara jalan (tanpa dependency, pakai test runner bawaan Node >=18):
//   node --test tests/data_service_contract.test.js
//
// Implementasi mock SELALU diuji. Implementasi supabase HANYA
// diuji kalau file config kredensial tersedia (lihat loadSupabaseImpl
// di bawah) — kalau belum ada project Supabase, test itu di-skip
// dengan jelas, bukan gagal diam-diam.
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// ---------------------------------------------------------------
// Loader: file sumber SISAF adalah script biasa (bukan module ES/
// CommonJS) yang menempel ke `window.xxx`. Supaya bisa dites di
// Node tanpa browser dan tanpa build step, kita eval di sandbox vm
// dengan `window` palsu, lalu ambil objek yang ditempelkannya.
// ---------------------------------------------------------------
function loadScriptAsWindowGlobal(relativePath, globalName) {
  const filePath = path.join(__dirname, '..', relativePath);
  const code = fs.readFileSync(filePath, 'utf8');
  const sandbox = { window: {}, console, setTimeout, Date, Promise };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: relativePath });
  const impl = sandbox.window[globalName];
  if (!impl) {
    throw new Error(`Gagal memuat ${globalName} dari ${relativePath} — cek apakah nama window.${globalName} masih sama.`);
  }
  return impl;
}

function loadMockImpl() {
  return loadScriptAsWindowGlobal('mockDataService.js', 'mockDataService');
}

// supabaseDataService.js butuh library supabase-js (dimuat lewat CDN di
// index.html) + project Supabase nyata untuk benar-benar terhubung.
// File itu sendiri berhasil di-load sebagai script (tidak throw), tapi
// setiap panggilan fungsinya akan gagal saat runtime selama belum ada
// project nyata. Maka penanda kesiapannya BUKAN "berhasil di-load",
// melainkan variabel lingkungan eksplisit yang baru diisi Backend Lead
// setelah project Supabase dibuat (lihat README bagian blocker):
//   SISAF_SUPABASE_URL, SISAF_SUPABASE_ANON_KEY
// Sampai saat itu, suite supabase sengaja di-skip — bukan dianggap gagal.
function supabaseCredentialsReady() {
  return Boolean(process.env.SISAF_SUPABASE_URL && process.env.SISAF_SUPABASE_ANON_KEY);
}

function tryLoadSupabaseImpl() {
  if (!supabaseCredentialsReady()) return null;
  try {
    return loadScriptAsWindowGlobal('supabaseDataService.js', 'supabaseDataService');
  } catch (err) {
    return null;
  }
}

// Daftar 20 fungsi wajib ada di kedua implementasi (paritas signature).
const REQUIRED_FUNCTIONS = [
  'login', 'logout',
  'getKelasList',
  'getSantriList', 'getSantriById',
  'getNilaiBySantri',
  'getKeuanganBySantri',
  'getKedisiplinanBySantri',
  'getKesehatanBySantri',
  'getDokumenBySantri',
  'getStatusHistoryBySantri', 'changeStudentStatus',
  'getInstitutionSettings', 'updateInstitutionSettings',
  'getNotifikasiBySantri', 'getNotifikasiSettings', 'updateNotifikasiSettings',
  'simulateSendNotifikasi',
  'getKelasById', 'getWaliSantriById',
];

// Kredensial user contoh yang SELALU ada di seed mock (lihat mockDataService.js).
// Kalau nanti seed Supabase dibuat ulang, sinkronkan email/password di sini.
const KNOWN_USERS = {
  admin: { email: 'admin@alfalah.sch.id', password: 'admin123' },
  waliKelas: { email: 'fadhil.rahman@alfalah.sch.id', password: 'wali123' },
  waliSantri: { email: 'ortu.alfatih@gmail.com', password: 'ortu123' },
};

// ---------------------------------------------------------------
// Runner kontrak — dipanggil sekali untuk mock, sekali untuk supabase
// (kalau tersedia). `label` dipakai di nama test supaya jelas asalnya.
// ---------------------------------------------------------------
function runContractSuite(label, getImpl) {
  test(`[${label}] semua ${REQUIRED_FUNCTIONS.length} fungsi kontrak ada dan berupa function`, () => {
    const impl = getImpl();
    for (const fnName of REQUIRED_FUNCTIONS) {
      assert.equal(typeof impl[fnName], 'function', `${fnName} harus ada di ${label} dan berupa function`);
    }
  });

  test(`[${label}] login dengan kredensial benar mengembalikan user tanpa field password`, async () => {
    const impl = getImpl();
    const { user, error } = await impl.login(KNOWN_USERS.admin.email, KNOWN_USERS.admin.password);
    assert.equal(error, null);
    assert.ok(user, 'user harus terisi saat login sukses');
    assert.equal(user.email, KNOWN_USERS.admin.email);
    assert.equal(user.role, 'admin');
    assert.equal('password' in user, false, 'password TIDAK BOLEH ikut ke response login — kebocoran kredensial');
  });

  test(`[${label}] login dengan kredensial salah mengembalikan user null + pesan error`, async () => {
    const impl = getImpl();
    const { user, error } = await impl.login('tidak-ada@alfalah.sch.id', 'salah');
    assert.equal(user, null);
    assert.ok(typeof error === 'string' && error.length > 0, 'error harus berupa string tidak kosong');
  });

  test(`[${label}] logout tidak melempar error`, async () => {
    const impl = getImpl();
    await assert.doesNotReject(() => impl.logout());
  });

  test(`[${label}] getKelasList mengembalikan array`, async () => {
    const impl = getImpl();
    const kelas = await impl.getKelasList();
    assert.ok(Array.isArray(kelas));
  });

  test(`[${label}] otorisasi getSantriList: admin melihat semua, wali_kelas hanya kelasnya, wali_santri hanya anaknya`, async () => {
    const impl = getImpl();
    const { user: admin } = await impl.login(KNOWN_USERS.admin.email, KNOWN_USERS.admin.password);
    const { user: waliKelas } = await impl.login(KNOWN_USERS.waliKelas.email, KNOWN_USERS.waliKelas.password);
    const { user: waliSantri } = await impl.login(KNOWN_USERS.waliSantri.email, KNOWN_USERS.waliSantri.password);

    const asAdmin = await impl.getSantriList(admin);
    const asWaliKelas = await impl.getSantriList(waliKelas);
    const asWaliSantri = await impl.getSantriList(waliSantri);

    assert.ok(Array.isArray(asAdmin) && asAdmin.length > 0, 'admin harus melihat minimal 1 santri');
    assert.ok(asWaliKelas.length <= asAdmin.length, 'wali_kelas tidak boleh melihat lebih banyak dari admin');
    assert.ok(asWaliKelas.every(s => s.kelas_id === waliKelas.kelas_id), 'wali_kelas hanya boleh melihat santri di kelasnya sendiri');
    assert.ok(asWaliSantri.every(s => s.wali_santri_id === waliSantri.wali_santri_id), 'wali_santri hanya boleh melihat anaknya sendiri');
  });

  test(`[${label}] getSantriList tanpa currentUser (null) mengembalikan array kosong, bukan error atau semua data`, async () => {
    const impl = getImpl();
    const result = await impl.getSantriList(null);
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 0, 'currentUser null tidak boleh bocor data — default-nya harus tertutup (deny by default)');
  });

  test(`[${label}] getSantriById mengembalikan null untuk id yang tidak ada (bukan melempar error)`, async () => {
    const impl = getImpl();
    const { user: admin } = await impl.login(KNOWN_USERS.admin.email, KNOWN_USERS.admin.password);
    const result = await impl.getSantriById('id-yang-tidak-pernah-ada', admin);
    assert.equal(result, null);
  });

  test(`[${label}] getSantriById tidak mengembalikan santri di luar cakupan role (wali_kelas mengakses santri kelas lain)`, async () => {
    const impl = getImpl();
    const { user: waliKelas } = await impl.login(KNOWN_USERS.waliKelas.email, KNOWN_USERS.waliKelas.password);
    const { user: admin } = await impl.login(KNOWN_USERS.admin.email, KNOWN_USERS.admin.password);
    const semuaSantri = await impl.getSantriList(admin);
    const santriDiLuarKelasnya = semuaSantri.find(s => s.kelas_id !== waliKelas.kelas_id);
    if (!santriDiLuarKelasnya) return; // seed data tidak cukup beragam untuk kasus ini, lewati
    const result = await impl.getSantriById(santriDiLuarKelasnya.id, waliKelas);
    assert.equal(result, null, 'wali_kelas TIDAK BOLEH bisa mengambil santri di luar kelasnya lewat getSantriById');
  });

  test(`[${label}] data anak (nilai/keuangan/kedisiplinan/dokumen) mengembalikan array untuk santri valid`, async () => {
    const impl = getImpl();
    const { user: admin } = await impl.login(KNOWN_USERS.admin.email, KNOWN_USERS.admin.password);
    const [santriPertama] = await impl.getSantriList(admin);
    assert.ok(santriPertama, 'butuh minimal 1 santri di seed data untuk test ini');

    const nilai = await impl.getNilaiBySantri(santriPertama.id);
    const keuangan = await impl.getKeuanganBySantri(santriPertama.id);
    const kedisiplinan = await impl.getKedisiplinanBySantri(santriPertama.id);
    const dokumen = await impl.getDokumenBySantri(santriPertama.id);
    const riwayat = await impl.getStatusHistoryBySantri(santriPertama.id);

    for (const [nama, arr] of Object.entries({ nilai, keuangan, kedisiplinan, dokumen, riwayat })) {
      assert.ok(Array.isArray(arr), `${nama} harus berupa array`);
    }
  });

  test(`[${label}] changeStudentStatus menambah baris riwayat baru TANPA menghapus riwayat lama, dan memperbarui status current`, async () => {
    const impl = getImpl();
    const { user: admin } = await impl.login(KNOWN_USERS.admin.email, KNOWN_USERS.admin.password);
    const [santriPertama] = await impl.getSantriList(admin);
    assert.ok(santriPertama);

    const riwayatSebelum = await impl.getStatusHistoryBySantri(santriPertama.id);
    const jumlahSebelum = riwayatSebelum.length;

    const entry = await impl.changeStudentStatus({
      santriId: santriPertama.id,
      statusBaru: 'cuti',
      tanggalEfektif: '2026-08-15',
      alasan: '[TEST OTOMATIS] uji kontrak data layer — aman diabaikan/dihapus.',
      disetujuiOleh: admin.id,
    });

    assert.ok(entry && entry.santri_id === santriPertama.id);
    assert.equal(entry.status_baru, 'cuti');

    const riwayatSesudah = await impl.getStatusHistoryBySantri(santriPertama.id);
    assert.equal(
      riwayatSesudah.length,
      jumlahSebelum + 1,
      'changeStudentStatus harus MENAMBAH baris riwayat, bukan menimpa yang lama (prinsip data historis tidak boleh ditimpa)'
    );

    const santriSesudah = await impl.getSantriById(santriPertama.id, admin);
    assert.equal(santriSesudah.status, 'cuti', 'status current pada record santri harus ikut diperbarui');
  });

  test(`[${label}] getInstitutionSettings & updateInstitutionSettings konsisten (apa yang ditulis, itu yang dibaca kembali)`, async () => {
    const impl = getImpl();
    const sebelum = await impl.getInstitutionSettings();
    assert.ok(sebelum && typeof sebelum === 'object');

    const hasil = await impl.updateInstitutionSettings({ nama_institusi: sebelum.nama_institusi });
    assert.equal(hasil.nama_institusi, sebelum.nama_institusi);
  });

  test(`[${label}] simulateSendNotifikasi mencatat entri dengan status terkirim_simulasi`, async () => {
    const impl = getImpl();
    const { user: admin } = await impl.login(KNOWN_USERS.admin.email, KNOWN_USERS.admin.password);
    const [santriPertama] = await impl.getSantriList(admin);
    const entry = await impl.simulateSendNotifikasi({
      santriId: santriPertama.id,
      jenis: 'pengumuman',
      isi: '[TEST OTOMATIS] uji kontrak data layer.',
    });
    assert.ok(entry && entry.santri_id === santriPertama.id);
    assert.equal(entry.status, 'terkirim_simulasi', 'jangan sampai simulasi diam-diam berubah jadi klaim "terkirim" sungguhan');
  });

  test(`[${label}] getKelasById & getWaliSantriById mengembalikan null (bukan melempar) untuk id tidak dikenal`, async () => {
    const impl = getImpl();
    assert.equal(await impl.getKelasById('tidak-ada'), null);
    assert.equal(await impl.getWaliSantriById('tidak-ada'), null);
  });
}

// ---------------------------------------------------------------
// Jalankan suite untuk mock (selalu ada).
// ---------------------------------------------------------------
runContractSuite('mock', loadMockImpl);

// ---------------------------------------------------------------
// Jalankan suite untuk supabase HANYA kalau berhasil dimuat.
// Sampai project Supabase nyata dibuat (lihat blocker di README),
// ini akan tampil sebagai satu test "diagnostic skip", bukan gagal.
// ---------------------------------------------------------------
const supabaseImpl = tryLoadSupabaseImpl();
if (supabaseImpl) {
  runContractSuite('supabase', () => supabaseImpl);
} else {
  test('[supabase] dilewati — set SISAF_SUPABASE_URL & SISAF_SUPABASE_ANON_KEY (project Supabase nyata) untuk mengaktifkan suite ini', { skip: true }, () => {});
}
