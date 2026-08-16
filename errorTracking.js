// ============================================================
// SISAF — errorTracking.js
//
// Error tracking MINIMAL, tanpa dependency eksternal (bukan Sentry).
// Alasan: data yang lewat aplikasi ini adalah data pribadi santri
// (NIS, nilai, kesehatan, dst) — mengirim stack trace ke layanan
// pihak ketiga berisiko ikut membocorkan payload yang sedang diproses
// saat error terjadi. Jadi log disimpan LOKAL di memori tab berjalan
// (tidak localStorage, tidak dikirim ke server manapun), dan admin
// bisa membuka console untuk lihat window.SISAF_ERRORS jika perlu
// investigasi setelah user melapor bug.
//
// Kalau nanti tim memutuskan pakai Sentry/layanan setara, ganti
// fungsi `_report` di bawah ini saja — jangan sebar console.error
// manual lagi di app.js.
// ============================================================

(function () {
  const MAX_LOG = 50;
  const buffer = [];

  function _redactMessage(str) {
    // Sensor pola yang mirip NIS (mis. 2024.11.0087) dan email dari pesan
    // error sebelum disimpan, supaya buffer di memori tidak jadi tempat
    // kebocoran data santri kalau tab di-share-screen saat debugging.
    return String(str)
      .replace(/\b\d{4}\.\d{2}\.\d{4}\b/g, '[NIS_DISENSOR]')
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL_DISENSOR]');
  }

  function _report(entry) {
    entry.message = _redactMessage(entry.message);
    if (entry.stack) entry.stack = _redactMessage(entry.stack);
    buffer.push(entry);
    if (buffer.length > MAX_LOG) buffer.shift();
    // eslint-disable-next-line no-console
    console.error('[SISAF:error]', entry.source, '—', entry.message);
  }

  window.addEventListener('error', function (event) {
    _report({
      source: 'window.onerror',
      message: event.message || 'Error tanpa pesan',
      stack: event.error && event.error.stack,
      file: event.filename,
      line: event.lineno,
      timestamp: new Date().toISOString(),
    });
  });

  window.addEventListener('unhandledrejection', function (event) {
    const reason = event.reason;
    _report({
      source: 'unhandledrejection',
      message: (reason && reason.message) || String(reason) || 'Promise ditolak tanpa alasan',
      stack: reason && reason.stack,
      timestamp: new Date().toISOString(),
    });
  });

  // Dipanggil manual dari blok catch penting di app.js (mis. gagal simpan
  // perubahan status santri) supaya tercatat walau sudah ditangani UI-nya
  // (tidak menjadi unhandledrejection tapi tetap layak diketahui admin).
  window.SISAF_reportHandledError = function (context, err) {
    _report({
      source: 'handled: ' + context,
      message: (err && err.message) || String(err),
      stack: err && err.stack,
      timestamp: new Date().toISOString(),
    });
  };

  window.SISAF_ERRORS = buffer;
})();
