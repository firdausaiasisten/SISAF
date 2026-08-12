// ============================================================
// SISAF — dataService.js
// Lapisan abstraksi tunggal yang dipakai app.js. Menukar antara
// mockDataService dan supabaseDataService berdasarkan CONFIG.APP_MODE,
// tanpa app.js perlu tahu implementasi mana yang aktif.
// Pola ini identik dengan dataku2026.
// ============================================================

const dataService = (function () {
  const impl = window.CONFIG.APP_MODE === 'supabase'
    ? window.supabaseDataService
    : window.mockDataService;

  if (window.CONFIG.APP_MODE === 'mock') {
    console.info('[SISAF] Berjalan dalam APP_MODE=mock — data adalah data contoh, bukan data santri sesungguhnya.');
  }

  return impl;
})();

window.dataService = dataService;
