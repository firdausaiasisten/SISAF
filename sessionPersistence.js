// ============================================================
// SISAF — sessionPersistence.js
//
// Menyimpan sesi login (`state.user`) di sessionStorage supaya
// refresh halaman tidak memaksa login ulang. Sengaja PAKAI
// sessionStorage, BUKAN localStorage:
//   - sessionStorage otomatis kosong saat tab/browser ditutup —
//     cocok untuk perangkat bersama/warnet/komputer sekolah, tidak
//     meninggalkan sesi santri/wali menyala selamanya di perangkat
//     yang bukan milik mereka.
//   - localStorage bertahan tanpa batas waktu sampai dihapus manual,
//     risiko lebih besar untuk data yang menyentuh info pribadi santri.
//
// Ini BUKAN pengganti otorisasi sungguhan — hanya menyimpan objek
// user yang sama dengan yang dikembalikan dataService.login() (tanpa
// password, sudah disaring oleh mockDataService/supabaseDataService).
// Saat migrasi ke Supabase Auth, modul ini bisa dipensiunkan karena
// supabase-js sudah punya session management sendiri.
// ============================================================

const SESSION_KEY = 'sisaf:session_user';

const sessionPersistence = {
  // Simpan user yang sedang login. Dipanggil sesaat setelah
  // dataService.login() sukses.
  save(user) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch (err) {
      // sessionStorage bisa gagal di mode private/incognito ketat di
      // beberapa browser lama — sesi cukup jatuh kembali ke in-memory
      // saja (tidak fatal, hanya refresh akan minta login ulang lagi).
      console.warn('[SISAF] Tidak bisa menyimpan sesi ke sessionStorage:', err.message);
    }
  },

  // Ambil sesi tersimpan saat aplikasi dimuat ulang. Mengembalikan
  // null kalau tidak ada sesi atau datanya rusak/tidak valid.
  restore() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw);
      // Validasi minimal supaya data korup tidak lolos ke state.user
      // dan membuat UI render dalam kondisi setengah-login yang aneh.
      if (!user || typeof user !== 'object' || !user.id || !user.role) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return user;
    } catch (err) {
      return null;
    }
  },

  clear() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (err) {
      // aman diabaikan — kalau setItem tadi juga gagal, tidak ada yang perlu dihapus
    }
  },
};

window.sessionPersistence = sessionPersistence;
