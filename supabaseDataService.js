// ============================================================
// SISAF — supabaseDataService.js
// STATUS: implementasi ditulis lengkap, TAPI BELUM PERNAH DIEKSEKUSI
// terhadap project Supabase nyata — sandbox pengembangan ini tidak
// bisa menjangkau *.supabase.co, dan project SISAF di Supabase belum
// dibuat. Backend Lead WAJIB menguji setiap fungsi di sini terhadap
// Postgres nyata (setelah schema_sisaf_01_init.sql +
// schema_sisaf_02_rls_policies.sql dijalankan) sebelum mengubah
// CONFIG.APP_MODE ke 'supabase' di production.
//
// Signature setiap fungsi identik dengan mockDataService.js — lihat
// aturan parity di README ("Selalu lewat dataService.js" dan "Signature
// harus identik"). app.js TIDAK diubah oleh file ini.
// ============================================================

let _supabaseClient = null;
function _getClient() {
  if (!_supabaseClient) {
    if (typeof window.supabase === 'undefined') {
      throw new Error(
        'supabase-js belum dimuat. Tambahkan <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> ' +
        'di index.html SEBELUM <script src="supabaseDataService.js">.'
      );
    }
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
      throw new Error('CONFIG.SUPABASE_URL / SUPABASE_ANON_KEY masih kosong. Isi di config.js setelah project Supabase dibuat.');
    }
    _supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return _supabaseClient;
}

// Melempar error yang konsisten & mudah dibaca dari error Postgres/RLS
// mentah (kode 42501 = insufficient_privilege, paling sering muncul
// kalau RLS menolak operasi).
function _throwIfError(error, context) {
  if (!error) return;
  if (error.code === '42501') {
    throw new Error(`${context}: ditolak oleh RLS (kemungkinan otorisasi role tidak sesuai). Detail: ${error.message}`);
  }
  throw new Error(`${context}: ${error.message}`);
}

// Role yang boleh mengubah profil institusi — harus identik dengan
// SETTINGS_MANAGER_ROLES di mockDataService.js dan app.js. Kalau daftar
// role berubah, perbarui di KETIGA tempat.
const SETTINGS_MANAGER_ROLES = ['admin'];

const supabaseDataService = {
  // ---------------- AUTH ----------------
  // Return shape HARUS sama dengan mockDataService.login: { user, error }
  // dengan user = { id, email, nama, role, kelas_id, wali_santri_id } (tanpa password).
  async login(email, password) {
    const client = _getClient();
    const { data: authData, error: authError } = await client.auth.signInWithPassword({ email, password });
    if (authError) {
      return { user: null, error: 'Email atau kata sandi salah.' };
    }

    const { data: profile, error: profileError } = await client
      .from('user_profiles')
      .select('id, nama, role, kelas_id, wali_santri_id')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      // Login Auth berhasil tapi tidak ada baris user_profiles — akun
      // dibuat di Supabase Auth tanpa profil terkait. Ini konfigurasi
      // data yang salah, bukan kredensial salah, jadi pesan dibedakan
      // supaya Backend Lead tidak salah diagnosis sebagai bug login.
      await client.auth.signOut();
      return { user: null, error: 'Akun ditemukan tapi profil (user_profiles) belum lengkap. Hubungi admin.' };
    }

    return {
      user: {
        id: profile.id,
        email: authData.user.email,
        nama: profile.nama,
        role: profile.role,
        kelas_id: profile.kelas_id,
        wali_santri_id: profile.wali_santri_id,
      },
      error: null,
    };
  },

  async logout() {
    const { error } = await _getClient().auth.signOut();
    _throwIfError(error, 'logout');
  },

  // ---------------- KELAS ----------------
  async getKelasList() {
    const { data, error } = await _getClient().from('kelas').select('*');
    _throwIfError(error, 'getKelasList');
    return data;
  },

  // ---------------- SANTRI ----------------
  // RLS di schema_sisaf_02_rls_policies.sql sudah menerapkan scope yang
  // sama persis dengan _filterSantriByRole (mockDataService.js), jadi
  // query di sini TIDAK perlu filter tambahan di JS — RLS adalah source
  // of truth di jalur Supabase. Ini beda dengan mock (yang tidak punya
  // RLS sama sekali, makanya filter dilakukan manual di sana).
  // Kalau RLS belum diuji/aktif, JANGAN nyalakan APP_MODE='supabase' di
  // production — lihat catatan tech debt di README.
  async getSantriList(currentUser) {
    const { data, error } = await _getClient().from('santri').select('*').order('nama');
    _throwIfError(error, 'getSantriList');
    return data;
  },

  async getSantriById(santriId, currentUser) {
    const { data, error } = await _getClient().from('santri').select('*').eq('id', santriId).maybeSingle();
    _throwIfError(error, 'getSantriById');
    return data || null;
  },

  // ---------------- AKADEMIK ----------------
  async getNilaiBySantri(santriId) {
    const { data, error } = await _getClient()
      .from('nilai_akademik')
      .select('*')
      .eq('santri_id', santriId);
    _throwIfError(error, 'getNilaiBySantri');
    return data;
  },

  // ---------------- KEUANGAN ----------------
  async getKeuanganBySantri(santriId) {
    const { data, error } = await _getClient()
      .from('keuangan_santri')
      .select('*')
      .eq('santri_id', santriId);
    _throwIfError(error, 'getKeuanganBySantri');
    return data;
  },

  // ---------------- KEDISIPLINAN ----------------
  async getKedisiplinanBySantri(santriId) {
    const { data, error } = await _getClient()
      .from('kedisiplinan')
      .select('*')
      .eq('santri_id', santriId);
    _throwIfError(error, 'getKedisiplinanBySantri');
    return data;
  },

  // ---------------- KESEHATAN & ASRAMA ----------------
  async getKesehatanBySantri(santriId) {
    const { data, error } = await _getClient()
      .from('kesehatan_asrama')
      .select('*')
      .eq('santri_id', santriId)
      .maybeSingle();
    _throwIfError(error, 'getKesehatanBySantri');
    return data || null;
  },

  // ---------------- DOKUMEN ----------------
  async getDokumenBySantri(santriId) {
    const { data, error } = await _getClient()
      .from('dokumen_santri')
      .select('*')
      .eq('santri_id', santriId);
    _throwIfError(error, 'getDokumenBySantri');
    return data;
  },

  // ---------------- STATUS SANTRI (Student Master) ----------------
  async getStatusHistoryBySantri(santriId) {
    const { data, error } = await _getClient()
      .from('student_status_histories')
      .select('*')
      .eq('santri_id', santriId)
      .order('tanggal_efektif', { ascending: false });
    _throwIfError(error, 'getStatusHistoryBySantri');
    return data;
  },

  // Sama seperti mockDataService: insert riwayat DULU, baru update
  // status di baris santri. Idealnya ini satu Postgres function/RPC
  // transactional (mis. `rpc('change_student_status', {...})`) supaya
  // dua langkah ini atomik — kalau salah satu gagal, keduanya rollback.
  // Ditulis di sini sebagai dua langkah terpisah dulu (paritas cepat
  // dengan mock); migrasikan ke RPC transactional sebelum production
  // sungguhan memakai fitur ubah status secara rutin.
  async changeStudentStatus({ santriId, statusBaru, tanggalEfektif, alasan, disetujuiOleh }) {
    const client = _getClient();

    const { data: current, error: fetchError } = await client
      .from('santri')
      .select('status')
      .eq('id', santriId)
      .single();
    _throwIfError(fetchError, 'changeStudentStatus (fetch status lama)');

    const { data: entry, error: insertError } = await client
      .from('student_status_histories')
      .insert({
        santri_id: santriId,
        status_sebelumnya: current.status,
        status_baru: statusBaru,
        tanggal_efektif: tanggalEfektif,
        alasan,
        disetujui_oleh: disetujuiOleh,
      })
      .select()
      .single();
    _throwIfError(insertError, 'changeStudentStatus (insert riwayat)');

    const santriUpdate = { status: statusBaru };
    if (['pindah', 'lulus', 'mengundurkan_diri', 'dikeluarkan', 'meninggal'].includes(statusBaru)) {
      santriUpdate.exit_date = tanggalEfektif;
      santriUpdate.exit_reason = alasan;
    }
    const { error: updateError } = await client.from('santri').update(santriUpdate).eq('id', santriId);
    if (updateError) {
      // Riwayat sudah terlanjur tersimpan tapi status santri gagal
      // diperbarui — state tidak konsisten. Ini justru alasan kenapa
      // catatan di atas bilang harus jadi RPC transactional; sampai
      // itu dikerjakan, error ini WAJIB terlihat jelas ke pengguna,
      // bukan ditelan diam-diam.
      throw new Error(
        `changeStudentStatus: riwayat status TERSIMPAN tapi santri.status GAGAL diperbarui (${updateError.message}). ` +
        `Data tidak konsisten — perbaiki manual atau migrasikan fungsi ini ke RPC transactional.`
      );
    }

    return entry;
  },

  // ---------------- PENGATURAN INSTITUSI ----------------
  async getInstitutionSettings() {
    // .single() akan error kalau baris belum ada sama sekali (tabel
    // kosong) — pakai maybeSingle() supaya layar login tetap bisa
    // tampil dengan fallback, bukan crash, sebelum seed awal dijalankan.
    const { data, error } = await _getClient().from('institution_settings').select('*').maybeSingle();
    _throwIfError(error, 'getInstitutionSettings');
    return data || { nama: 'SISAF', alamat: '', kontak: '' };
  },

  // Otorisasi role divalidasi DI SINI juga (bukan cuma RLS di Postgres),
  // sama seperti mockDataService — pertahanan berlapis. RLS di
  // schema_sisaf_02_rls_policies.sql tetap jadi penjaga utama untuk
  // panggilan yang lewat di luar app ini sama sekali (mis. langsung ke
  // REST API Supabase), tapi cek eksplisit ini memberi pesan error yang
  // jelas dalam bahasa Indonesia untuk pengguna app, bukan error Postgres
  // mentah.
  async updateInstitutionSettings(newSettings, currentUser) {
    if (!currentUser || !SETTINGS_MANAGER_ROLES.includes(currentUser.role)) {
      throw new Error('Anda tidak memiliki izin untuk mengubah pengaturan institusi.');
    }
    const client = _getClient();
    const { data: existing } = await client.from('institution_settings').select('id').maybeSingle();
    const query = existing
      ? client.from('institution_settings').update(newSettings).eq('id', existing.id)
      : client.from('institution_settings').insert(newSettings);
    const { data, error } = await query.select().single();
    _throwIfError(error, 'updateInstitutionSettings');
    return data;
  },

  // ---------------- NOTIFIKASI ----------------
  async getNotifikasiBySantri(santriId) {
    const { data, error } = await _getClient()
      .from('notifikasi_log')
      .select('*')
      .eq('santri_id', santriId)
      .order('created_at', { ascending: false });
    _throwIfError(error, 'getNotifikasiBySantri');
    return data;
  },

  async getNotifikasiSettings() {
    const { data, error } = await _getClient().from('notifikasi_settings').select('*');
    _throwIfError(error, 'getNotifikasiSettings');
    // mockDataService mengembalikan object { jenis: aktif, ... }, bukan
    // array baris — ubah bentuknya di sini supaya app.js (yang mengharap
    // bentuk mock) tidak perlu tahu bedanya.
    const settings = {};
    for (const row of data) settings[row.jenis] = row.aktif;
    return settings;
  },

  async updateNotifikasiSettings(newSettings) {
    const client = _getClient();
    // Satu upsert per key, karena skema menyimpan satu baris per jenis
    // notifikasi (bukan satu baris berisi semua toggle seperti mock).
    const rows = Object.entries(newSettings).map(([jenis, aktif]) => ({ jenis, aktif }));
    const { error } = await client.from('notifikasi_settings').upsert(rows, { onConflict: 'jenis' });
    _throwIfError(error, 'updateNotifikasiSettings');
    return this.getNotifikasiSettings();
  },

  // PENTING: fungsi ini HANYA insert ke notifikasi_log dengan status
  // 'queued'. Pengiriman WA sungguhan terjadi di Supabase Edge Function
  // terpisah (dipicu DB trigger/webhook setelah insert ini), BUKAN di
  // sini — token WhatsApp API tidak boleh pernah berada di kode
  // frontend/browser. Lihat README bagian "Fase 4 — Notifikasi WhatsApp
  // Nyata".
  async simulateSendNotifikasi({ santriId, jenis, isi }) {
    const { data, error } = await _getClient()
      .from('notifikasi_log')
      .insert({ santri_id: santriId, jenis, isi, channel: 'WhatsApp', status: 'queued' })
      .select()
      .single();
    _throwIfError(error, 'simulateSendNotifikasi');
    return data;
  },

  // ---------------- HELPERS ----------------
  async getKelasById(kelasId) {
    if (!kelasId) return null;
    const { data, error } = await _getClient().from('kelas').select('*').eq('id', kelasId).maybeSingle();
    _throwIfError(error, 'getKelasById');
    return data || null;
  },

  async getWaliSantriById(waliId) {
    if (!waliId) return null;
    const { data, error } = await _getClient().from('wali_santri').select('*').eq('id', waliId).maybeSingle();
    _throwIfError(error, 'getWaliSantriById');
    return data || null;
  },
};

window.supabaseDataService = supabaseDataService;
