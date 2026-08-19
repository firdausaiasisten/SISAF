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

// Role yang boleh mengubah profil institusi — nilai harus identik dengan
// SETTINGS_MANAGER_ROLES di mockDataService.js dan UI_SETTINGS_MANAGER_ROLES
// di app.js. Nama sengaja beda per file (sebelumnya sama-sama
// SETTINGS_MANAGER_ROLES di ketiga file, menyebabkan SyntaxError
// "Identifier has already been declared" karena index.html memuat semua
// <script> classic dalam satu scope global). Kalau daftar role berubah,
// perbarui di KETIGA tempat.
const SUPABASE_SETTINGS_MANAGER_ROLES = ['admin'];

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

  // ---------------- PRESENSI HARIAN ----------------
  async getPresensiBySantri(santriId) {
    const { data, error } = await _getClient()
      .from('presensi_harian')
      .select('*')
      .eq('santri_id', santriId)
      .order('tanggal', { ascending: false });
    _throwIfError(error, 'getPresensiBySantri');
    return data;
  },

  // Join manual (bukan RPC) supaya konsisten dengan gaya query lain di file
  // ini; jumlah santri per kelas kecil jadi tidak perlu SQL function khusus.
  async getPresensiByKelasTanggal(kelasId, tanggal) {
    const client = _getClient();
    const { data: daftarSantri, error: errSantri } = await client
      .from('santri')
      .select('id, nama, nis')
      .eq('kelas_id', kelasId)
      .eq('status', 'aktif');
    _throwIfError(errSantri, 'getPresensiByKelasTanggal:santri');

    const { data: presensiHariItu, error: errPresensi } = await client
      .from('presensi_harian')
      .select('santri_id, status, keterangan')
      .eq('tanggal', tanggal)
      .in('santri_id', (daftarSantri || []).map(s => s.id));
    _throwIfError(errPresensi, 'getPresensiByKelasTanggal:presensi');

    return (daftarSantri || []).map(s => {
      const existing = (presensiHariItu || []).find(p => p.santri_id === s.id);
      return {
        santri_id: s.id,
        nama: s.nama,
        nis: s.nis,
        status: existing ? existing.status : null,
        keterangan: existing ? existing.keterangan : null,
      };
    });
  },

  async recordPresensi({ santriId, tanggal, status, keterangan, dicatatOleh }) {
    const { data, error } = await _getClient()
      .from('presensi_harian')
      .upsert(
        {
          santri_id: santriId,
          tanggal,
          status,
          keterangan: keterangan || null,
          dicatat_oleh: dicatatOleh,
        },
        { onConflict: 'santri_id,tanggal' }
      )
      .select()
      .single();
    _throwIfError(error, 'recordPresensi');
    return data;
  },

  // ---------------- PERIZINAN PULANG ASRAMA ----------------
  async getIzinPulangBySantri(santriId) {
    const { data, error } = await _getClient()
      .from('izin_pulang')
      .select('*')
      .eq('santri_id', santriId)
      .order('tanggal_keluar', { ascending: false });
    _throwIfError(error, 'getIzinPulangBySantri');
    return data;
  },

  async createIzinPulang({ santriId, tanggalKeluar, tanggalRencanaKembali, alasan }, currentUser) {
    if (!currentUser || !['admin', 'wali_kelas'].includes(currentUser.role)) {
      throw new Error('Hanya admin atau wali kelas yang boleh mengajukan izin pulang.');
    }
    const client = _getClient();
    if (currentUser.role === 'wali_kelas') {
      const { data: santriRecord, error: fetchError } = await client
        .from('santri').select('kelas_id').eq('id', santriId).single();
      _throwIfError(fetchError, 'createIzinPulang (cek kelas)');
      if (!santriRecord || santriRecord.kelas_id !== currentUser.kelas_id) {
        throw new Error('Wali kelas hanya boleh mengajukan izin pulang untuk santri di kelasnya sendiri.');
      }
    }
    const { data, error } = await client
      .from('izin_pulang')
      .insert({
        santri_id: santriId,
        tanggal_keluar: tanggalKeluar,
        tanggal_rencana_kembali: tanggalRencanaKembali,
        alasan,
        status: 'diajukan',
        diajukan_oleh: currentUser.nama || currentUser.email,
      })
      .select().single();
    _throwIfError(error, 'createIzinPulang');
    return data;
  },

  // Fetch status lama dulu supaya pesan error transisi tidak valid konsisten
  // dengan versi mock (menyebutkan status asal), bukan cuma mengandalkan RLS
  // menolak update yang salah tanpa penjelasan yang jelas.
  async updateIzinPulangStatus(izinId, statusBaru, currentUser, extra = {}) {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Hanya admin yang boleh memproses status izin pulang.');
    }
    const client = _getClient();
    const { data: entry, error: fetchError } = await client
      .from('izin_pulang').select('status').eq('id', izinId).single();
    _throwIfError(fetchError, 'updateIzinPulangStatus (fetch)');

    const TRANSISI_VALID = { diajukan: ['disetujui', 'ditolak'], disetujui: ['kembali'] };
    const opsiValid = TRANSISI_VALID[entry.status] || [];
    if (!opsiValid.includes(statusBaru)) {
      throw new Error(`Transisi status tidak valid: ${entry.status} -> ${statusBaru}.`);
    }
    if (statusBaru === 'kembali' && !extra.tanggalKembaliAktual) {
      throw new Error('Tanggal kembali aktual wajib diisi saat mencatat santri kembali.');
    }

    const payload = { status: statusBaru, disetujui_oleh: currentUser.nama || currentUser.email };
    if (extra.catatan) payload.catatan_persetujuan = extra.catatan;
    if (statusBaru === 'kembali') payload.tanggal_kembali_aktual = extra.tanggalKembaliAktual;

    const { data, error } = await client
      .from('izin_pulang').update(payload).eq('id', izinId)
      .select().single();
    _throwIfError(error, 'updateIzinPulangStatus');
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
    if (!currentUser || !SUPABASE_SETTINGS_MANAGER_ROLES.includes(currentUser.role)) {
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

  // ---------------- ADMISSION (calon_santri -> diterima -> terdaftar) ----------------
  async getApplicants(currentUser) {
    if (!currentUser || !['admin', 'kepala_sekolah'].includes(currentUser.role)) return [];
    const { data, error } = await _getClient()
      .from('applicants')
      .select('*')
      .order('tanggal_daftar', { ascending: false });
    _throwIfError(error, 'getApplicants');
    return data;
  },

  async createApplicant(data, currentUser) {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Hanya admin yang boleh mendaftarkan calon santri baru.');
    }
    const { data: entry, error } = await _getClient()
      .from('applicants')
      .insert({
        nama: data.nama,
        tanggal_lahir: data.tanggalLahir || null,
        jenis_kelamin: data.jenisKelamin || null,
        asal_sekolah: data.asalSekolah || null,
        nama_wali: data.namaWali || null,
        telepon_wali: data.teleponWali || null,
        status: 'calon_santri',
        tanggal_daftar: data.tanggalDaftar || new Date().toISOString().slice(0, 10),
        catatan: data.catatan || null,
      })
      .select()
      .single();
    _throwIfError(error, 'createApplicant');
    return entry;
  },

  // Sama seperti changeStudentStatus: BELUM satu transaksi Postgres.
  // Saat status jadi 'terdaftar', tiga panggilan terpisah (fetch applicant,
  // insert santri, insert riwayat, update applicant) -- migrasikan ke RPC
  // transactional sebelum dipakai rutin di production, prioritas SAMA
  // dengan changeStudentStatus karena pola risikonya identik (data
  // admission bisa tidak konsisten kalau salah satu langkah gagal).
  async updateApplicantStatus(applicantId, statusBaru, currentUser, extra = {}) {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Hanya admin yang boleh mengubah status penerimaan.');
    }
    const client = _getClient();
    const { data: applicant, error: fetchError } = await client
      .from('applicants').select('*').eq('id', applicantId).single();
    _throwIfError(fetchError, 'updateApplicantStatus (fetch applicant)');

    const URUTAN = ['calon_santri', 'diterima', 'terdaftar'];
    const idxSekarang = URUTAN.indexOf(applicant.status);
    const idxBaru = URUTAN.indexOf(statusBaru);
    if (idxBaru !== idxSekarang + 1) {
      throw new Error(`Transisi status tidak valid: ${applicant.status} -> ${statusBaru}. Harus urut satu langkah.`);
    }

    if (statusBaru === 'terdaftar') {
      if (!extra.nis || !extra.kelasId || !extra.waliSantriId) {
        throw new Error('NIS, kelas, dan wali santri wajib diisi saat menerbitkan status "terdaftar".');
      }
      const { data: santriBaru, error: santriError } = await client
        .from('santri')
        .insert({
          nis: extra.nis,
          nama: applicant.nama,
          kelas_id: extra.kelasId,
          wali_santri_id: extra.waliSantriId,
          angkatan: extra.angkatan || String(new Date().getFullYear()),
          tanggal_lahir: applicant.tanggal_lahir,
          jenis_kelamin: applicant.jenis_kelamin,
          status: 'terdaftar',
          admission_id: applicant.id,
        })
        .select().single();
      _throwIfError(santriError, 'updateApplicantStatus (insert santri)');

      const { error: histError } = await client.from('student_status_histories').insert({
        santri_id: santriBaru.id,
        status_sebelumnya: null,
        status_baru: 'terdaftar',
        tanggal_efektif: new Date().toISOString().slice(0, 10),
        alasan: `Penerimaan santri baru (admission ${applicant.id})`,
        disetujui_oleh: currentUser.nama || currentUser.email,
      });
      _throwIfError(histError, 'updateApplicantStatus (insert riwayat)');

      const { data: updated, error: updateError } = await client
        .from('applicants').update({ status: statusBaru, santri_id: santriBaru.id }).eq('id', applicantId)
        .select().single();
      _throwIfError(updateError, 'updateApplicantStatus (update applicant)');
      return updated;
    }

    const { data: updated, error: updateError } = await client
      .from('applicants').update({ status: statusBaru }).eq('id', applicantId)
      .select().single();
    _throwIfError(updateError, 'updateApplicantStatus');
    return updated;
  },

  // ---------------- GRADUATION CLEARANCE ----------------
  async checkGraduationEligibility(santriId) {
    const { data, error } = await _getClient()
      .from('keuangan_santri')
      .select('id')
      .eq('santri_id', santriId)
      .neq('status', 'lunas');
    _throwIfError(error, 'checkGraduationEligibility');
    return {
      eligible: data.length === 0,
      alasanTidakEligible: data.length > 0 ? `${data.length} tagihan belum lunas.` : null,
    };
  },

  async graduateSantri({ santriId, tanggalEfektif, disetujuiOleh }, currentUser) {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Hanya admin yang boleh meluluskan santri.');
    }
    const cek = await this.checkGraduationEligibility(santriId);
    if (!cek.eligible) {
      throw new Error(`Belum bisa diluluskan: ${cek.alasanTidakEligible}`);
    }
    return this.changeStudentStatus({
      santriId, statusBaru: 'lulus', tanggalEfektif,
      alasan: 'Kelulusan', disetujuiOleh,
    });
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

  async getWaliSantriList() {
    const { data, error } = await _getClient().from('wali_santri').select('*').order('nama');
    _throwIfError(error, 'getWaliSantriList');
    return data;
  },
};

window.supabaseDataService = supabaseDataService;
