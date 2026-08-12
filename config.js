// ============================================================
// SISAF — config.js
// Toggle APP_MODE untuk berpindah antara data mock dan Supabase.
// Sama seperti pola di dataku2026 (HRIS Al-Falah).
// ============================================================

const CONFIG = {
  // 'mock'  -> pakai mockDataService.js (default sekarang, belum ada project Supabase)
  // 'supabase' -> pakai supabaseDataService.js (aktifkan setelah migrasi dijalankan)
  APP_MODE: 'mock',

  APP_NAME: 'SISAF',
  APP_FULL_NAME: 'Sistem Informasi Santri Al-Falah',
  // Profil institusi (nama, alamat, kontak) TIDAK lagi di sini — sudah
  // dipindah ke database (mockDataService/supabaseDataService.getInstitutionSettings),
  // supaya bisa diubah lewat menu Pengaturan oleh admin tanpa menyentuh kode.
  // Ini langkah pertama ke arah SaaS: config.js tetap berisi hal teknis
  // (mode data, kredensial Supabase), sedangkan data spesifik-tenant ada di DB.

  // Diisi setelah project Supabase SISAF dibuat.
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
};

// Dipakai module lain via <script> global (pola sama seperti dataku2026,
// vanilla JS tanpa bundler).
window.CONFIG = CONFIG;
