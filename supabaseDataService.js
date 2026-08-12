// ============================================================
// SISAF — supabaseDataService.js
// STATUS: STUB — belum tersambung ke Supabase nyata.
//
// Setiap fungsi di sini punya signature identik dengan
// mockDataService.js. Begitu project Supabase SISAF dibuat dan
// migrations/schema_sisaf_01_init.sql dijalankan, isi TODO di
// bawah dengan pemanggilan supabase-js — app.js TIDAK PERLU diubah
// karena dataService.js yang menentukan implementasi mana yang aktif.
//
// Sandbox pengembangan ini tidak bisa menjangkau *.supabase.co,
// jadi kode di bawah ditulis sesuai pola dataku2026 tapi belum
// pernah dieksekusi/diuji terhadap instance nyata.
// ============================================================

let _supabaseClient = null;
function _getClient() {
  if (!_supabaseClient) {
    // TODO: setelah <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    // ditambahkan di index.html:
    // _supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    throw new Error('Supabase client belum dikonfigurasi. Isi CONFIG.SUPABASE_URL / SUPABASE_ANON_KEY di config.js setelah migrasi dijalankan.');
  }
  return _supabaseClient;
}

const supabaseDataService = {
  async login(email, password) {
    // TODO: const { data, error } = await _getClient().auth.signInWithPassword({ email, password });
    // TODO: lalu fetch baris terkait dari user_profiles by data.user.id untuk dapat role/kelas_id/wali_santri_id
    throw new Error('supabaseDataService.login belum diimplementasikan — jalankan migrasi & isi kredensial Supabase terlebih dahulu.');
  },

  async getKelasList() {
    // TODO: const { data, error } = await _getClient().from('kelas').select('*');
    throw new Error('supabaseDataService.getKelasList belum diimplementasikan.');
  },

  async getSantriList(currentUser) {
    // TODO: query 'santri' dengan filter sesuai role.
    // RLS akan menangani sebagian, tapi tetap terapkan filter eksplisit
    // di sini juga (prinsip yang sama dengan mockDataService),
    // sampai RLS SISAF diuji end-to-end terhadap Postgres nyata.
    throw new Error('supabaseDataService.getSantriList belum diimplementasikan.');
  },

  async getSantriById(santriId, currentUser) {
    throw new Error('supabaseDataService.getSantriById belum diimplementasikan.');
  },

  async getNilaiBySantri(santriId) {
    // TODO: .from('nilai_akademik').select('*').eq('santri_id', santriId)
    throw new Error('supabaseDataService.getNilaiBySantri belum diimplementasikan.');
  },

  async getKeuanganBySantri(santriId) {
    throw new Error('supabaseDataService.getKeuanganBySantri belum diimplementasikan.');
  },

  async getKedisiplinanBySantri(santriId) {
    throw new Error('supabaseDataService.getKedisiplinanBySantri belum diimplementasikan.');
  },

  async getKesehatanBySantri(santriId) {
    throw new Error('supabaseDataService.getKesehatanBySantri belum diimplementasikan.');
  },

  async getDokumenBySantri(santriId) {
    throw new Error('supabaseDataService.getDokumenBySantri belum diimplementasikan.');
  },

  async getStatusHistoryBySantri(santriId) {
    // TODO: .from('student_status_histories').select('*').eq('santri_id', santriId).order('tanggal_efektif', {ascending:false})
    throw new Error('supabaseDataService.getStatusHistoryBySantri belum diimplementasikan.');
  },

  async changeStudentStatus({ santriId, statusBaru, tanggalEfektif, alasan, disetujuiOleh }) {
    // TODO: idealnya ini satu transaction: insert ke student_status_histories
    // + update santri.status, supaya tidak ada state antara yang tidak konsisten
    // kalau salah satu gagal. Lihat prinsip "Menggunakan transaction untuk
    // operasi multi-table" di dokumen arsitektur.
    throw new Error('supabaseDataService.changeStudentStatus belum diimplementasikan.');
  },

  async getInstitutionSettings() {
    // TODO: .from('institution_settings').select('*').eq('tenant_id', CONFIG.TENANT_ID).single()
    // Kolom tenant_id baru relevan kalau/saat SISAF benar-benar jadi multi-tenant.
    throw new Error('supabaseDataService.getInstitutionSettings belum diimplementasikan.');
  },

  async updateInstitutionSettings(newSettings) {
    throw new Error('supabaseDataService.updateInstitutionSettings belum diimplementasikan.');
  },

  async getNotifikasiBySantri(santriId) {
    // TODO: .from('notifikasi_log').select('*').eq('santri_id', santriId).order('tanggal', {ascending:false})
    throw new Error('supabaseDataService.getNotifikasiBySantri belum diimplementasikan.');
  },

  async getNotifikasiSettings() {
    // TODO: .from('notifikasi_settings').select('*').single()
    throw new Error('supabaseDataService.getNotifikasiSettings belum diimplementasikan.');
  },

  async updateNotifikasiSettings(newSettings) {
    throw new Error('supabaseDataService.updateNotifikasiSettings belum diimplementasikan.');
  },

  // PENTING: pengiriman WA sungguhan TIDAK BOLEH terjadi di sini langsung
  // dari browser (token WA gateway tidak boleh berada di kode frontend).
  // Implementasi nyata: insert ke tabel notifikasi_log dengan status 'queued',
  // lalu Supabase Edge Function (dipicu DB trigger/webhook) yang benar-benar
  // memanggil WhatsApp API dan meng-update status. Fungsi ini seharusnya
  // HANYA melakukan insert, bukan memanggil WA API langsung.
  async simulateSendNotifikasi({ santriId, jenis, isi }) {
    throw new Error('supabaseDataService.simulateSendNotifikasi belum diimplementasikan — perlu Edge Function terpisah untuk pengiriman WA sungguhan.');
  },

  async getKelasById(kelasId) {
    throw new Error('supabaseDataService.getKelasById belum diimplementasikan (perlu cache lokal dari getKelasList).');
  },
  async getWaliSantriById(waliId) {
    throw new Error('supabaseDataService.getWaliSantriById belum diimplementasikan.');
  },
};

window.supabaseDataService = supabaseDataService;
