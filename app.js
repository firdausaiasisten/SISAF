// ============================================================
// SISAF — app.js
// Vanilla JS SPA. Sesi login disimpan di sessionStorage (bukan
// localStorage) — bertahan saat refresh tapi hilang saat tab
// ditutup, jadi tidak menjadi sesi permanen tanpa batas waktu.
// Ini perbaikan atas tech debt "sesi login tidak persisten" yang
// dicatat di README. Saat migrasi ke Supabase Auth nanti, mekanisme
// ini digantikan oleh session management bawaan supabase-js
// (lihat sessionStorage.js untuk detail & alasan tidak pakai
// localStorage).
// ============================================================

const state = {
  user: null,           // { id, email, nama, role, kelas_id, wali_santri_id }
  institution: null,    // { nama, alamat, kontak } — dimuat dari DB, bukan config.js
  view: 'ringkasan',    // 'ringkasan' | 'daftar' | 'detail' | 'pengaturan'
  selectedSantriId: null,
  activeTab: 'akademik',
  loginError: null,
  loading: false,
};

const ROLE_LABEL = {
  admin: 'Administrator',
  kepala_sekolah: 'Kepala Sekolah',
  wali_kelas: 'Wali Kelas',
  bendahara: 'Bendahara Santri',
  wali_santri: 'Wali Santri',
};

const NAV_ITEMS = [
  { key: 'ringkasan', label: 'Ringkasan' },
  { key: 'daftar', label: 'Daftar Santri' },
  { key: 'presensi_input', label: 'Input Presensi', roles: ['admin', 'wali_kelas'] },
  { key: 'admission', label: 'Penerimaan Santri', roles: ['admin', 'kepala_sekolah'] },
  { key: 'pengaturan', label: 'Pengaturan Institusi', roles: ['admin'] },
];

// Role yang boleh MELIHAT layar Penerimaan Santri (admin + kepala_sekolah,
// sama seperti otorisasi getApplicants di data layer). Menulis (terima/
// daftarkan) tetap admin-saja -- dicek terpisah di renderAdmission/handler,
// sama pola dengan UI_SETTINGS_MANAGER_ROLES.
const ADMISSION_VIEW_ROLES = ['admin', 'kepala_sekolah'];

// Role yang boleh mengubah profil institusi (nama, alamat, kontak).
// Dulu bernama SETTINGS_MANAGER_ROLES sama seperti di mockDataService.js/
// supabaseDataService.js -- diganti nama karena semua <script> di index.html
// dimuat classic (bukan type="module") sehingga berbagi satu scope global;
// const dengan nama sama di lebih dari satu file menyebabkan SyntaxError
// "Identifier has already been declared" saat halaman dimuat (bukan cuma
// gagal di dom_verify.js -- ini benar-benar merusak app di browser nyata).
// Nilai TETAP harus identik dengan data-layer di KEDUA tempat lain.
const UI_SETTINGS_MANAGER_ROLES = ['admin'];

const TABS = [
  { key: 'akademik', label: 'Akademik' },
  { key: 'presensi', label: 'Presensi' },
  { key: 'perizinan', label: 'Perizinan Pulang' },
  { key: 'keuangan', label: 'Keuangan Santri' },
  { key: 'kedisiplinan', label: 'Kedisiplinan' },
  { key: 'kesehatan', label: 'Kesehatan & Asrama' },
  { key: 'dokumen', label: 'Dokumen' },
  { key: 'notifikasi', label: 'Notifikasi' },
  { key: 'status', label: 'Riwayat Status' },
];

// Vocabulary status mengikuti siklus penuh dari dokumen arsitektur
// (Admission → ... → Graduation), meski sebagian belum punya alur UI
// (calon_santri/diterima baru relevan saat modul Admission dibangun).
const STATUS_LABEL = {
  calon_santri: 'Calon Santri',
  diterima: 'Diterima',
  terdaftar: 'Terdaftar',
  aktif: 'Aktif',
  cuti: 'Cuti',
  pindah: 'Pindah',
  lulus: 'Lulus',
  mengundurkan_diri: 'Mengundurkan Diri',
  dikeluarkan: 'Dikeluarkan',
  meninggal: 'Meninggal Dunia',
};
const STATUS_BADGE_CLASS = {
  calon_santri: 'badge-warn',
  diterima: 'badge-warn',
  terdaftar: 'badge-ok',
  aktif: 'badge-ok',
  cuti: 'badge-warn',
  pindah: 'badge-danger',
  lulus: 'badge-ok',
  mengundurkan_diri: 'badge-danger',
  dikeluarkan: 'badge-danger',
  meninggal: 'badge-danger',
};
function statusBadgeHtml(status) {
  const cls = STATUS_BADGE_CLASS[status] || 'badge-ok';
  const label = STATUS_LABEL[status] || status;
  return `<span class="badge ${cls}">${label}</span>`;
}
// Status yang tidak bisa dipilih manual sekarang (jalur Admission belum
// dibangun) — tetap ditampilkan di riwayat kalau sudah ada, tapi tidak
// muncul di dropdown "Ubah Status".
const STATUS_MANUAL_OPTIONS = ['aktif', 'cuti', 'pindah', 'lulus', 'mengundurkan_diri', 'dikeluarkan', 'meninggal'];

const NOTIF_JENIS_LABEL = {
  tagihan_jatuh_tempo: 'Tagihan Jatuh Tempo',
  pembayaran_diterima: 'Pembayaran Diterima',
  kedisiplinan: 'Kedisiplinan',
  akademik: 'Nilai Akademik Terbit',
};

const NOTIF_TEMPLATE = {
  tagihan_jatuh_tempo: 'Yth. Bapak/Ibu wali, tagihan santri akan segera jatuh tempo. Mohon segera diselesaikan.',
  pembayaran_diterima: 'Yth. Bapak/Ibu wali, pembayaran telah kami terima. Jazakumullah khairan.',
  kedisiplinan: 'Yth. Bapak/Ibu wali, terdapat catatan kedisiplinan baru untuk ananda.',
  akademik: 'Yth. Bapak/Ibu wali, nilai semester ananda telah terbit dan dapat dilihat di SISAF.',
};

// Role yang boleh mengelola pengaturan notifikasi & memicu simulasi kirim.
const NOTIF_MANAGER_ROLES = ['admin', 'bendahara'];

const DEMO_ACCOUNTS = [
  { email: 'admin@alfalah.sch.id', password: 'admin123', label: 'Admin — akses penuh' },
  { email: 'kepsek@alfalah.sch.id', password: 'kepsek123', label: 'Kepala Sekolah — lintas kelas' },
  { email: 'fadhil.rahman@alfalah.sch.id', password: 'wali123', label: 'Wali Kelas — XI IPA 2' },
  { email: 'bendahara@alfalah.sch.id', password: 'bendahara123', label: 'Bendahara — Keuangan Santri' },
  { email: 'ortu.alfatih@gmail.com', password: 'ortu123', label: 'Wali Santri — anak sendiri' },
];

function $app() { return document.getElementById('app'); }

// ---------------- AUTH ----------------
async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  state.loading = true;
  state.loginError = null;
  render();

  const { user, error } = await dataService.login(email, password);
  state.loading = false;
  if (error) {
    state.loginError = error;
    render();
    return;
  }
  state.user = user;
  state.view = 'ringkasan';
  sessionPersistence.save(user);
  await render();
}

function fillLogin(email, password) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = password;
}

async function handleLogout() {
  await dataService.logout();
  sessionPersistence.clear();
  state.user = null;
  state.view = 'ringkasan';
  state.selectedSantriId = null;
  await render();
}

// ---------------- NAVIGATION ----------------
async function goTo(view) {
  state.view = view;
  state.selectedSantriId = null;
  await render();
}

async function openSantri(santriId) {
  state.view = 'detail';
  state.selectedSantriId = santriId;
  state.activeTab = 'akademik';
  await render();
}

async function setTab(tabKey) {
  state.activeTab = tabKey;
  await render();
}

// ---------------- RENDER: ROOT ----------------
// async & always awaited by callers — renderAppShell does several
// sequential data fetches, so a fire-and-forget render() here previously
// let a fast second navigation (e.g. logout right after login) run while
// the first render's fetches were still in flight, hitting stale state.
async function render() {
  if (!state.user) {
    // Layar login tidak boleh menunggu fetch institusi selesai — kalau
    // koneksi lambat (mis. Supabase nyata nanti), form login harus tetap
    // langsung bisa diisi. Nama institusi menyusul begitu siap.
    $app().innerHTML = renderLoginScreen();
    if (!state.institution) {
      dataService.getInstitutionSettings().then(inst => {
        state.institution = inst;
        if (!state.user) render(); // refresh login screen hanya jika masih di sana
      });
    }
    return;
  }
  if (!state.institution) {
    state.institution = await dataService.getInstitutionSettings();
  }
  // Guard langsung di sini, bukan hanya menyembunyikan item nav — supaya
  // state.view tidak bisa "dipaksa" ke 'pengaturan' oleh peran yang tidak
  // berwenang lewat jalur lain selain klik nav.
  if (state.view === 'pengaturan' && !UI_SETTINGS_MANAGER_ROLES.includes(state.user.role)) {
    state.view = 'ringkasan';
  }
  if (state.view === 'presensi_input' && !['admin', 'wali_kelas'].includes(state.user.role)) {
    state.view = 'ringkasan';
  }
  if (state.view === 'admission' && !ADMISSION_VIEW_ROLES.includes(state.user.role)) {
    state.view = 'ringkasan';
  }
  await renderAppShell();
}

function renderLoginScreen() {
  const demoListHtml = DEMO_ACCOUNTS.map(a => `
    <div class="demo-item" data-action="fillLogin" data-email="${a.email}" data-password="${a.password}">
      <span>${a.label}</span><b>${a.email}</b>
    </div>
  `).join('');

  return `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-brand">
          <div class="mark"></div>
          <h1>${CONFIG.APP_NAME}</h1>
          <p>${CONFIG.APP_FULL_NAME}<br>${state.institution ? state.institution.nama : '...'}</p>
        </div>
        ${state.loginError ? `<div class="login-error">${state.loginError}</div>` : ''}
        <form onsubmit="handleLogin(event)">
          <div class="field">
            <label for="login-email">Email</label>
            <input id="login-email" type="email" required autocomplete="username">
          </div>
          <div class="field">
            <label for="login-password">Kata Sandi</label>
            <input id="login-password" type="password" required autocomplete="current-password">
          </div>
          <button class="btn-primary" type="submit" ${state.loading ? 'disabled' : ''}>
            ${state.loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
        <details class="demo-accounts">
          <summary>Akun demo (mode data mock)</summary>
          <div class="demo-list">${demoListHtml}</div>
        </details>
      </div>
    </div>
  `;
}

// ---------------- RENDER: APP SHELL ----------------
async function renderAppShell() {
  const initials = state.user.nama.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const navHtml = NAV_ITEMS
    .filter(item => !item.roles || item.roles.includes(state.user.role))
    .map(item => `
    <li class="${state.view === item.key ? 'active' : ''}">
      <a data-action="goTo" data-view="${item.key}"><span class="dot"></span>${item.label}</a>
    </li>
  `).join('');

  $app().innerHTML = `
    <div class="topbar">
      <div class="brand"><span class="mark"></span> ${CONFIG.APP_NAME}</div>
      <div class="top-actions">
        <div class="top-user"><b>${state.user.nama}</b>${ROLE_LABEL[state.user.role]}</div>
        <div class="avatar">${initials}</div>
        <button class="btn-logout" data-action="handleLogout">Keluar</button>
      </div>
    </div>
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-inner">
          <div class="sidebar-role">${ROLE_LABEL[state.user.role]}</div>
          <ul class="nav">${navHtml}</ul>
        </div>
      </aside>
      <main class="main" id="main-content">
        <div class="empty-state">Memuat...</div>
      </main>
    </div>
  `;

  const main = document.getElementById('main-content');
  if (state.view === 'ringkasan') {
    main.innerHTML = await renderRingkasan();
  } else if (state.view === 'daftar') {
    main.innerHTML = await renderDaftarSantri();
  } else if (state.view === 'detail') {
    main.innerHTML = await renderDetailSantri(state.selectedSantriId);
  } else if (state.view === 'pengaturan') {
    main.innerHTML = await renderPengaturan();
  } else if (state.view === 'presensi_input') {
    main.innerHTML = await renderPresensiInput();
  } else if (state.view === 'admission') {
    main.innerHTML = await renderAdmission();
  }
}

// ---------------- VIEW: RINGKASAN (DASHBOARD) ----------------
async function renderRingkasan() {
  const santriList = await dataService.getSantriList(state.user);

  // Ambil statistik per-santri secara paralel, bukan berurutan — dengan
  // banyak santri, awaiting satu-satu (3 fetch x N santri) membuat dashboard
  // lambat secara linear terhadap jumlah santri yang terlihat oleh role ini.
  const perSantriStats = await Promise.all(santriList.map(async s => {
    const [keuangan, dokumen, kedisiplinan] = await Promise.all([
      dataService.getKeuanganBySantri(s.id),
      dataService.getDokumenBySantri(s.id),
      dataService.getKedisiplinanBySantri(s.id),
    ]);
    return {
      tunggakan: keuangan.filter(k => k.status !== 'lunas').length,
      dokBelumLengkap: dokumen.filter(d => d.status !== 'lengkap').length,
      pelanggaran: kedisiplinan.filter(k => k.jenis === 'pelanggaran').length,
    };
  }));

  const totalTunggakan = perSantriStats.reduce((sum, s) => sum + s.tunggakan, 0);
  const totalDokumenBelumLengkap = perSantriStats.reduce((sum, s) => sum + s.dokBelumLengkap, 0);
  const totalPelanggaranBulanIni = perSantriStats.reduce((sum, s) => sum + s.pelanggaran, 0);

  const roleNote = {
    admin: 'Anda melihat seluruh santri lintas kelas dengan akses penuh.',
    kepala_sekolah: 'Anda melihat ringkasan lintas kelas (akses baca).',
    wali_kelas: 'Anda melihat santri di kelas yang Anda ampu.',
    bendahara: 'Anda melihat seluruh santri dengan fokus data Keuangan Santri.',
    wali_santri: 'Anda melihat data anak Anda sendiri.',
  }[state.user.role];

  return `
    <h1 class="page-title">Ringkasan</h1>
    <p class="page-sub">${state.institution.nama}</p>
    <div class="role-note">${roleNote}</div>

    <div class="stat-cards">
      <div class="stat-card"><div class="label">Jumlah Santri Terlihat</div><div class="value">${santriList.length}</div></div>
      <div class="stat-card"><div class="label">Tagihan Belum Lunas</div><div class="value">${totalTunggakan}</div></div>
      <div class="stat-card"><div class="label">Dokumen Belum Lengkap</div><div class="value">${totalDokumenBelumLengkap}</div></div>
      <div class="stat-card"><div class="label">Catatan Pelanggaran</div><div class="value">${totalPelanggaranBulanIni}</div></div>
    </div>

    ${NOTIF_MANAGER_ROLES.includes(state.user.role) ? await renderNotifSettingsPanel() : ''}

    <div class="panel">
      <h2 class="panel-title">Santri</h2>
      ${await santriTableHtml(santriList)}
    </div>
  `;
}

async function renderNotifSettingsPanel() {
  const settings = await dataService.getNotifikasiSettings();
  const rows = Object.entries(NOTIF_JENIS_LABEL).map(([key, label]) => `
    <label style="display:flex;align-items:center;gap:10px;padding:8px 0;font-size:13.5px;cursor:pointer;">
      <input type="checkbox" ${settings[key] ? 'checked' : ''} onchange="handleToggleNotifSetting('${key}', this.checked)">
      ${label}
    </label>
  `).join('');

  return `
    <div class="panel">
      <h2 class="panel-title">Pengaturan Notifikasi Otomatis (Simulasi)</h2>
      <p class="page-sub" style="margin-top:-8px;">Menentukan jenis kejadian mana yang otomatis memicu notifikasi WA ke wali santri, setelah pengiriman nyata tersedia.</p>
      ${rows}
    </div>
  `;
}

async function handleToggleNotifSetting(key, checked) {
  await dataService.updateNotifikasiSettings({ [key]: checked });
  await render();
}

// ---------------- VIEW: PENGATURAN INSTITUSI ----------------
async function renderPengaturan() {
  const s = state.institution;
  return `
    <h1 class="page-title">Pengaturan Institusi</h1>
    <p class="page-sub">Data ini dipakai di layar login dan kop surat rapor cetak. Disimpan di database (bukan file config), supaya bisa diubah tanpa deploy ulang — dan siap jadi per-tenant kalau SISAF dikembangkan ke arah SaaS multi-pesantren.</p>
    <div class="panel" style="max-width:520px;">
      <form onsubmit="handleSaveInstitution(event)">
        <div class="field">
          <label for="inst-nama">Nama Institusi</label>
          <input id="inst-nama" type="text" required value="${escapeAttr(s.nama)}">
        </div>
        <div class="field">
          <label for="inst-alamat">Alamat</label>
          <input id="inst-alamat" type="text" required value="${escapeAttr(s.alamat)}">
        </div>
        <div class="field">
          <label for="inst-kontak">Kontak (telepon/email)</label>
          <input id="inst-kontak" type="text" required value="${escapeAttr(s.kontak)}">
        </div>
        <button class="btn-primary" type="submit" style="width:auto;padding:9px 18px;">Simpan Perubahan</button>
        ${state.settingsSaved ? `<span style="margin-left:12px;color:var(--ok);font-size:12.5px;font-weight:600;">Tersimpan.</span>` : ''}
        ${state.settingsError ? `<div class="login-error" style="margin-top:12px;margin-bottom:0;">${state.settingsError}</div>` : ''}
      </form>
    </div>
  `;
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

async function handleSaveInstitution(event) {
  event.preventDefault();
  const nama = document.getElementById('inst-nama').value.trim();
  const alamat = document.getElementById('inst-alamat').value.trim();
  const kontak = document.getElementById('inst-kontak').value.trim();
  state.settingsError = null;
  try {
    state.institution = await dataService.updateInstitutionSettings({ nama, alamat, kontak }, state.user);
    state.settingsSaved = true;
    await render();
    state.settingsSaved = false;
  } catch (err) {
    // Bisa terjadi kalau ada jalur lain memanggil fungsi ini tanpa lewat
    // menu (mis. dari console) dengan user yang bukan admin — lapisan
    // otorisasi di data layer yang menahan, bukan cuma UI.
    if (window.SISAF_reportHandledError) window.SISAF_reportHandledError('handleSaveInstitution', err);
    state.settingsError = err.message || 'Gagal menyimpan pengaturan institusi.';
    await render();
  }
}

// ---------------- VIEW: INPUT PRESENSI (wali_kelas & admin) ----------------
// wali_kelas hanya melihat kelasnya sendiri (kelas_id terkunci dari
// currentUser); admin boleh pilih kelas mana saja. Satu form menyimpan
// seluruh baris kelas untuk satu tanggal sekaligus (bukan per-santri),
// supaya input harian tidak perlu N kali submit.
async function renderPresensiInput() {
  const semuaKelas = await dataService.getKelasList();
  const kelasTerkunci = state.user.role === 'wali_kelas';
  const kelasOptions = kelasTerkunci
    ? semuaKelas.filter(k => k.id === state.user.kelas_id)
    : semuaKelas;

  if (!state.presensiKelasId && kelasOptions.length > 0) {
    state.presensiKelasId = kelasOptions[0].id;
  }
  if (!state.presensiTanggal) {
    state.presensiTanggal = new Date().toISOString().slice(0, 10);
  }

  const daftar = state.presensiKelasId
    ? await dataService.getPresensiByKelasTanggal(state.presensiKelasId, state.presensiTanggal)
    : [];

  const kelasSelectHtml = kelasTerkunci
    ? `<input type="text" value="${escapeAttr(kelasOptions[0] ? kelasOptions[0].nama : '-')}" disabled style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);">`
    : `<select id="presensi-kelas" onchange="handlePresensiFilterChange()" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
        ${kelasOptions.map(k => `<option value="${k.id}" ${k.id === state.presensiKelasId ? 'selected' : ''}>${k.nama}</option>`).join('')}
      </select>`;

  const statusOpts = [
    ['hadir', 'Hadir'], ['sakit', 'Sakit'], ['izin', 'Izin'], ['alpa', 'Alpa'],
  ];

  const rows = daftar.map(d => `
    <tr>
      <td>${d.nis}</td>
      <td>${d.nama}</td>
      <td>
        <select id="presensi-status-${d.santri_id}" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;">
          ${statusOpts.map(([v, l]) => `<option value="${v}" ${d.status === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </td>
      <td><input type="text" id="presensi-ket-${d.santri_id}" value="${escapeAttr(d.keterangan || '')}" placeholder="Keterangan (opsional)" style="width:100%;padding:6px 8px;border:1px solid var(--line);border-radius:6px;"></td>
    </tr>
  `).join('');

  return `
    <h1 class="page-title">Input Presensi Harian</h1>
    <p class="page-sub">Pilih kelas dan tanggal, isi status setiap santri, lalu simpan sekali untuk seluruh kelas.</p>
    <div class="panel" style="max-width:720px;">
      <div style="display:flex;gap:16px;margin-bottom:16px;">
        <div class="field" style="flex:1;">
          <label>Kelas</label>
          ${kelasSelectHtml}
        </div>
        <div class="field" style="flex:1;">
          <label for="presensi-tanggal">Tanggal</label>
          <input id="presensi-tanggal" type="date" value="${state.presensiTanggal}" onchange="handlePresensiFilterChange()" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
        </div>
      </div>
      ${daftar.length === 0
        ? `<div class="empty-state">Tidak ada santri aktif di kelas ini.</div>`
        : `
        <form onsubmit="handleSavePresensi(event)">
          <table>
            <thead><tr><th>NIS</th><th>Nama</th><th>Status</th><th>Keterangan</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <button class="btn-primary" type="submit" style="width:auto;padding:9px 18px;margin-top:14px;">Simpan Presensi</button>
          ${state.presensiSaved ? `<span style="margin-left:12px;color:var(--ok);font-size:12.5px;font-weight:600;">Tersimpan.</span>` : ''}
          ${state.presensiError ? `<div class="login-error" style="margin-top:12px;margin-bottom:0;">${state.presensiError}</div>` : ''}
        </form>
      `}
    </div>
  `;
}

function handlePresensiFilterChange() {
  const kelasEl = document.getElementById('presensi-kelas');
  if (kelasEl) state.presensiKelasId = kelasEl.value;
  const tanggalEl = document.getElementById('presensi-tanggal');
  if (tanggalEl) state.presensiTanggal = tanggalEl.value;
  render();
}

async function handleSavePresensi(event) {
  event.preventDefault();
  const daftar = await dataService.getPresensiByKelasTanggal(state.presensiKelasId, state.presensiTanggal);
  state.presensiError = null;
  try {
    // Berurutan (bukan Promise.all) sengaja — kalau salah satu gagal
    // (mis. otorisasi RLS di Supabase nanti), sisanya tetap tersimpan
    // dan errornya jelas menunjuk baris terakhir yang belum sempat masuk.
    for (const d of daftar) {
      const statusEl = document.getElementById(`presensi-status-${d.santri_id}`);
      const ketEl = document.getElementById(`presensi-ket-${d.santri_id}`);
      await dataService.recordPresensi({
        santriId: d.santri_id,
        tanggal: state.presensiTanggal,
        status: statusEl.value,
        keterangan: ketEl.value.trim() || null,
        dicatatOleh: state.user.id,
      });
    }
    state.presensiSaved = true;
    await render();
    state.presensiSaved = false;
  } catch (err) {
    if (window.SISAF_reportHandledError) window.SISAF_reportHandledError('handleSavePresensi', err);
    state.presensiError = err.message || 'Gagal menyimpan presensi.';
    await render();
  }
}

// ---------------- VIEW: PENERIMAAN SANTRI (ADMISSION) ----------------
// Alur: calon_santri -> diterima -> terdaftar (satu langkah maju saja,
// ditegakkan di dataService.updateApplicantStatus). Baca: admin +
// kepala_sekolah (ADMISSION_VIEW_ROLES, lihat guard di render()). Tulis
// (tambah calon santri, ubah status): admin saja -- dicek dua kali, di UI
// (canWrite di bawah) dan di data layer, sama pola dengan Pengaturan
// Institusi dan Input Presensi.
async function renderAdmission() {
  const canWrite = state.user.role === 'admin';
  const applicants = await dataService.getApplicants(state.user);

  const formPanel = canWrite ? `
    <div class="panel" style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2 class="panel-title" style="margin:0;">Daftar Calon Santri</h2>
        <button class="btn-primary" type="button" data-action="toggleAdmissionForm"
          style="width:auto;padding:8px 16px;">
          ${state.admissionFormOpen ? 'Batal' : '+ Calon Santri Baru'}
        </button>
      </div>
      ${state.admissionFormOpen ? `
        <form onsubmit="handleCreateApplicant(event)" style="margin-top:16px;border-top:1px solid var(--line);padding-top:16px;">
          <div style="display:flex;gap:16px;">
            <div class="field" style="flex:1;">
              <label for="ap-nama">Nama Lengkap</label>
              <input id="ap-nama" type="text" required style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
            </div>
            <div class="field" style="flex:1;">
              <label for="ap-tgl-lahir">Tanggal Lahir</label>
              <input id="ap-tgl-lahir" type="date" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
            </div>
            <div class="field" style="width:140px;">
              <label for="ap-jk">Jenis Kelamin</label>
              <select id="ap-jk" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:16px;">
            <div class="field" style="flex:1;">
              <label for="ap-asal">Asal Sekolah</label>
              <input id="ap-asal" type="text" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
            </div>
            <div class="field" style="flex:1;">
              <label for="ap-wali">Nama Wali</label>
              <input id="ap-wali" type="text" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
            </div>
            <div class="field" style="flex:1;">
              <label for="ap-telp">Telepon Wali</label>
              <input id="ap-telp" type="text" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
            </div>
          </div>
          <div class="field">
            <label for="ap-catatan">Catatan (opsional)</label>
            <textarea id="ap-catatan" rows="2" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-family:inherit;"></textarea>
          </div>
          <button class="btn-primary" type="submit" style="width:auto;padding:9px 18px;">Simpan Calon Santri</button>
          ${state.admissionError ? `<div class="login-error" style="margin-top:12px;margin-bottom:0;">${state.admissionError}</div>` : ''}
        </form>
      ` : ''}
    </div>
  ` : '';

  const rows = applicants.map(a => {
    const enrollFormOpen = state.admissionEnrollingId === a.id;
    let actionHtml = '';
    if (canWrite && a.status === 'calon_santri') {
      actionHtml = `<button class="btn-primary" type="button" data-action="acceptApplicant" data-applicant-id="${a.id}" style="width:auto;padding:6px 14px;font-size:12.5px;">Terima</button>`;
    } else if (canWrite && a.status === 'diterima') {
      actionHtml = `<button class="btn-primary" type="button" data-action="${enrollFormOpen ? 'cancelEnrollForm' : 'openEnrollForm'}" data-applicant-id="${a.id}" style="width:auto;padding:6px 14px;font-size:12.5px;">${enrollFormOpen ? 'Batal' : 'Daftarkan sebagai Santri'}</button>`;
    } else if (a.status === 'terdaftar' && a.santri_id) {
      actionHtml = `<a data-action="openSantri" data-santri-id="${a.santri_id}" style="color:var(--primary-700);font-weight:600;font-size:12.5px;">Lihat profil santri →</a>`;
    }

    return `
      <tr>
        <td>${a.nama}</td>
        <td>${a.asal_sekolah || '-'}</td>
        <td>${a.nama_wali || '-'}</td>
        <td>${a.tanggal_daftar ? new Date(a.tanggal_daftar).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</td>
        <td>${statusBadgeHtml(a.status)}</td>
        <td>${actionHtml}</td>
      </tr>
      ${enrollFormOpen ? `
      <tr>
        <td colspan="6" style="background:var(--bg);">
          ${state.admissionEnrollForm}
        </td>
      </tr>` : ''}
    `;
  }).join('');

  return `
    <h1 class="page-title">Penerimaan Santri Baru</h1>
    <p class="page-sub">Alur: Calon Santri → Diterima → Terdaftar. Setiap langkah maju satu tahap, tidak bisa loncat.</p>
    ${formPanel}
    <div class="panel">
      ${applicants.length === 0
        ? `<div class="empty-state">Belum ada calon santri.</div>`
        : `<table>
            <thead><tr><th>Nama</th><th>Asal Sekolah</th><th>Nama Wali</th><th>Tgl Daftar</th><th>Status</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`}
    </div>
  `;
}

async function toggleAdmissionForm() {
  state.admissionFormOpen = !state.admissionFormOpen;
  state.admissionError = null;
  await render();
}

async function handleCreateApplicant(event) {
  event.preventDefault();
  state.admissionError = null;
  try {
    await dataService.createApplicant({
      nama: document.getElementById('ap-nama').value.trim(),
      tanggalLahir: document.getElementById('ap-tgl-lahir').value || null,
      jenisKelamin: document.getElementById('ap-jk').value,
      asalSekolah: document.getElementById('ap-asal').value.trim() || null,
      namaWali: document.getElementById('ap-wali').value.trim() || null,
      teleponWali: document.getElementById('ap-telp').value.trim() || null,
      catatan: document.getElementById('ap-catatan').value.trim() || null,
    }, state.user);
    state.admissionFormOpen = false;
    await render();
  } catch (err) {
    if (window.SISAF_reportHandledError) window.SISAF_reportHandledError('handleCreateApplicant', err);
    state.admissionError = err.message || 'Gagal menyimpan calon santri.';
    await render();
  }
}

async function acceptApplicant(el) {
  const applicantId = el.dataset.applicantId;
  try {
    await dataService.updateApplicantStatus(applicantId, 'diterima', state.user);
    await render();
  } catch (err) {
    if (window.SISAF_reportHandledError) window.SISAF_reportHandledError('acceptApplicant', err);
    alert(err.message || 'Gagal mengubah status.');
  }
}

// Membangun HTML form "Daftarkan sebagai Santri" -- dipisah dari
// openEnrollForm supaya bisa dipanggil ulang dari handleEnrollApplicant
// saat validasi gagal, TANPA fetch ulang kelas/wali dan TANPA menimpa
// state.admissionEnrollError balik ke null (bug yang sempat terjadi saat
// pertama ditulis: memanggil openEnrollForm() lagi di catch block diam-diam
// menghapus pesan error yang baru saja di-set, karena openEnrollForm selalu
// me-reset error ke null di awal).
function buildEnrollFormHtml(applicantId, kelasList, waliList) {
  return `
    <form onsubmit="handleEnrollApplicant(event, '${applicantId}')" style="max-width:560px;padding:12px 0;">
      <div style="display:flex;gap:16px;">
        <div class="field" style="flex:1;">
          <label for="enroll-nis">NIS</label>
          <input id="enroll-nis" type="text" required style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;">
        </div>
        <div class="field" style="flex:1;">
          <label for="enroll-kelas">Kelas</label>
          <select id="enroll-kelas" required style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;">
            ${kelasList.map(k => `<option value="${k.id}">${k.nama}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="flex:1;">
          <label for="enroll-wali">Wali Santri</label>
          <select id="enroll-wali" required style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;">
            ${waliList.map(w => `<option value="${w.id}">${w.nama}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn-primary" type="submit" style="width:auto;padding:7px 16px;font-size:12.5px;">Terbitkan Status Terdaftar</button>
      ${state.admissionEnrollError ? `<div class="login-error" style="margin-top:10px;margin-bottom:0;">${state.admissionEnrollError}</div>` : ''}
    </form>
  `;
}

async function openEnrollForm(el) {
  const applicantId = el.dataset.applicantId;
  const [kelasList, waliList] = await Promise.all([
    dataService.getKelasList(),
    dataService.getWaliSantriList(),
  ]);
  state.admissionEnrollingId = applicantId;
  state.admissionEnrollError = null;
  state.admissionEnrollKelasList = kelasList;
  state.admissionEnrollWaliList = waliList;
  state.admissionEnrollForm = buildEnrollFormHtml(applicantId, kelasList, waliList);
  await render();
}

async function cancelEnrollForm() {
  state.admissionEnrollingId = null;
  state.admissionEnrollForm = null;
  state.admissionEnrollError = null;
  state.admissionEnrollKelasList = null;
  state.admissionEnrollWaliList = null;
  await render();
}

async function handleEnrollApplicant(event, applicantId) {
  event.preventDefault();
  const nis = document.getElementById('enroll-nis').value.trim();
  const kelasId = document.getElementById('enroll-kelas').value;
  const waliSantriId = document.getElementById('enroll-wali').value;
  try {
    await dataService.updateApplicantStatus(applicantId, 'terdaftar', state.user, {
      nis, kelasId, waliSantriId,
    });
    state.admissionEnrollingId = null;
    state.admissionEnrollForm = null;
    state.admissionEnrollError = null;
    state.admissionEnrollKelasList = null;
    state.admissionEnrollWaliList = null;
    await render();
  } catch (err) {
    if (window.SISAF_reportHandledError) window.SISAF_reportHandledError('handleEnrollApplicant', err);
    state.admissionEnrollError = err.message || 'Gagal mendaftarkan santri.';
    state.admissionEnrollForm = buildEnrollFormHtml(applicantId, state.admissionEnrollKelasList, state.admissionEnrollWaliList);
    await render();
  }
}

// ---------------- VIEW: DAFTAR SANTRI ----------------
async function renderDaftarSantri() {
  const santriList = await dataService.getSantriList(state.user);
  return `
    <h1 class="page-title">Daftar Santri</h1>
    <p class="page-sub">${santriList.length} santri dapat diakses oleh peran Anda</p>
    <div class="panel">
      ${await santriTableHtml(santriList)}
    </div>
  `;
}

async function santriTableHtml(santriList) {
  if (santriList.length === 0) {
    return `<div class="empty-state">Tidak ada santri yang dapat ditampilkan untuk peran ini.</div>`;
  }
  const rows = (await Promise.all(santriList.map(async s => {
    const k = await dataService.getKelasById(s.kelas_id);
    return `
      <tr>
        <td><a data-action="openSantri" data-santri-id="${s.id}">${s.nama}</a></td>
        <td>${s.nis}</td>
        <td>${k ? k.nama : '-'}</td>
        <td>${s.angkatan}</td>
        <td>${statusBadgeHtml(s.status)}</td>
      </tr>
    `;
  }))).join('');

  return `
    <table>
      <thead><tr><th>Nama</th><th>NIS</th><th>Kelas</th><th>Angkatan</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ---------------- VIEW: DETAIL SANTRI ----------------
async function renderDetailSantri(santriId) {
  const santri = await dataService.getSantriById(santriId, state.user);
  if (!santri) {
    return `<div class="empty-state">Santri tidak ditemukan atau tidak dapat diakses oleh peran Anda.<br><a data-action="goTo" data-view="daftar" style="color:var(--primary-700);font-weight:600;">← Kembali ke Daftar Santri</a></div>`;
  }
  const kelasInfo = await dataService.getKelasById(santri.kelas_id);
  const initials = santri.nama.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const tabsHtml = TABS.map(t => `
    <a data-action="setTab" data-tab="${t.key}" class="${state.activeTab === t.key ? 'active' : ''}"
       style="padding:10px 2px 12px;font-size:13.5px;font-weight:${state.activeTab === t.key ? '700' : '500'};
       color:${state.activeTab === t.key ? 'var(--primary-900)' : 'var(--ink-faint)'};
       border-bottom:${state.activeTab === t.key ? '2.5px solid var(--accent-500)' : '2.5px solid transparent'};
       cursor:pointer;">${t.label}</a>
  `).join('');

  let tabContent = '';
  if (state.activeTab === 'akademik') tabContent = await renderTabAkademik(santri);
  else if (state.activeTab === 'presensi') tabContent = await renderTabPresensi(santri);
  else if (state.activeTab === 'perizinan') tabContent = await renderTabPerizinan(santri);
  else if (state.activeTab === 'keuangan') tabContent = await renderTabKeuangan(santri);
  else if (state.activeTab === 'kedisiplinan') tabContent = await renderTabKedisiplinan(santri);
  else if (state.activeTab === 'kesehatan') tabContent = await renderTabKesehatan(santri);
  else if (state.activeTab === 'dokumen') tabContent = await renderTabDokumen(santri);
  else if (state.activeTab === 'notifikasi') tabContent = await renderTabNotifikasi(santri);
  else if (state.activeTab === 'status') tabContent = await renderTabStatus(santri);

  return `
    <a data-action="goTo" data-view="daftar" style="color:var(--primary-700);font-weight:600;font-size:12.5px;">← Daftar Santri</a>
    <div class="panel" style="display:flex;gap:18px;align-items:center;margin-top:10px;">
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(155deg,var(--accent-400),var(--primary-700));
        display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Fraunces',serif;font-size:22px;font-weight:600;flex:none;">${initials}</div>
      <div>
        <div style="display:flex;align-items:center;gap:10px;">
          <h1 class="page-title" style="margin-bottom:2px;">${santri.nama}</h1>
          ${statusBadgeHtml(santri.status)}
        </div>
        <p class="page-sub" style="margin:0;">NIS ${santri.nis} · ${kelasInfo ? kelasInfo.nama : '-'} · Angkatan ${santri.angkatan}</p>
      </div>
    </div>

    <div style="display:flex;gap:24px;border-bottom:1px solid var(--line);margin-bottom:18px;">${tabsHtml}</div>
    ${tabContent}
  `;
}

// ---------------- TAB: AKADEMIK ----------------
async function renderTabAkademik(santri) {
  const nilai = await dataService.getNilaiBySantri(santri.id);
  if (nilai.length === 0) return `<div class="empty-state">Belum ada data nilai untuk santri ini.</div>`;

  const semesterGroups = {};
  nilai.forEach(n => {
    if (!semesterGroups[n.semester]) semesterGroups[n.semester] = [];
    semesterGroups[n.semester].push(n);
  });

  return Object.entries(semesterGroups).map(([semester, items]) => {
    const totalSks = items.reduce((sum, n) => sum + n.sks, 0);
    const totalPoin = items.reduce((sum, n) => sum + n.poin_diperoleh, 0);
    const ipk = (totalPoin / totalSks).toFixed(2);
    const rows = items.map(n => `
      <tr>
        <td>${n.mata_pelajaran}<div style="font-size:11px;color:var(--ink-faint);">${n.kategori}</div></td>
        <td><span class="grade">${n.nilai_huruf}</span></td>
        <td class="num">${n.poin_nilai.toFixed(2)}</td>
        <td class="num">${n.sks}</td>
        <td class="num">${n.poin_diperoleh.toFixed(2)}</td>
      </tr>
    `).join('');
    return `
      <div class="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h2 class="panel-title" style="margin:0;">${semester}</h2>
          <button class="btn-logout" data-action="handlePrintRapor" data-santri-id="${santri.id}" data-semester="${semester}">Cetak Rapor</button>
        </div>
        <table>
          <thead><tr><th>Mata Pelajaran</th><th>Nilai</th><th class="num">Poin</th><th class="num">SKS</th><th class="num">Poin Diperoleh</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="3" style="text-align:right;font-weight:700;padding:10px;">Total / IPK Semester:</td><td class="num" style="font-weight:700;">${totalSks}</td><td class="num" style="font-weight:700;">${ipk}</td></tr></tfoot>
        </table>
      </div>
    `;
  }).join('');
}

// ---------------- TAB: PRESENSI ----------------
async function renderTabPresensi(santri) {
  const items = await dataService.getPresensiBySantri(santri.id);
  if (items.length === 0) return `<div class="empty-state">Belum ada data presensi untuk santri ini.</div>`;

  const badgeFor = status => {
    if (status === 'hadir') return `<span class="badge badge-ok">Hadir</span>`;
    if (status === 'sakit') return `<span class="badge badge-warn">Sakit</span>`;
    if (status === 'izin') return `<span class="badge badge-warn">Izin</span>`;
    return `<span class="badge badge-danger">Alpa</span>`;
  };

  const rekap = items.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  const rows = items.map(p => `
    <tr>
      <td>${p.tanggal}</td>
      <td>${badgeFor(p.status)}</td>
      <td>${p.keterangan || '-'}</td>
    </tr>
  `).join('');

  return `
    <div class="panel">
      <h2 class="panel-title">Riwayat Presensi Harian</h2>
      <p style="margin:0 0 12px;color:var(--text-muted,#666);">
        Hadir: ${rekap.hadir || 0} · Sakit: ${rekap.sakit || 0} ·
        Izin: ${rekap.izin || 0} · Alpa: ${rekap.alpa || 0}
      </p>
      <table>
        <thead><tr><th>Tanggal</th><th>Status</th><th>Keterangan</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ---------------- TAB: PERIZINAN PULANG ASRAMA ----------------
async function renderTabPerizinan(santri) {
  const items = await dataService.getIzinPulangBySantri(santri.id);

  const badgeFor = status => {
    if (status === 'disetujui') return `<span class="badge badge-warn">Disetujui (belum kembali)</span>`;
    if (status === 'ditolak') return `<span class="badge badge-danger">Ditolak</span>`;
    if (status === 'kembali') return `<span class="badge badge-ok">Sudah Kembali</span>`;
    return `<span class="badge badge-warn">Menunggu Persetujuan</span>`;
  };

  // Menyetujui/menolak/mencatat kembali: admin saja (keputusan
  // institusional). Mengajukan: admin atau wali_kelas -- tab ini sendiri
  // sudah otomatis terbatas ke santri yang boleh dilihat wali_kelas
  // (_filterSantriByRole di data layer), jadi tidak perlu cek kelas lagi
  // di sini; data layer tetap memvalidasi ulang kalau ada jalur lain.
  const canProses = state.user.role === 'admin';
  const canAjukan = ['admin', 'wali_kelas'].includes(state.user.role);

  const rows = items.map(p => {
    let aksi = '<span style="color:var(--ink-faint);">—</span>';
    const btnOutline = 'padding:4px 10px;font-size:12.5px;border:1px solid var(--line);border-radius:6px;background:var(--bg);cursor:pointer;';
    const btnDanger = btnOutline + 'color:var(--danger);border-color:var(--danger-bg);';
    if (canProses && p.status === 'diajukan') {
      aksi = `
        <button data-action="setujuiIzinPulang" data-izin-id="${p.id}" style="${btnOutline}margin-right:6px;">Setujui</button>
        <button data-action="tolakIzinPulang" data-izin-id="${p.id}" style="${btnDanger}">Tolak</button>
      `;
    } else if (canProses && p.status === 'disetujui') {
      aksi = `<button data-action="catatKembaliIzinPulang" data-izin-id="${p.id}" style="${btnOutline}">Catat Kembali (hari ini)</button>`;
    }
    return `
      <tr>
        <td>${p.tanggal_keluar}</td>
        <td>${p.tanggal_rencana_kembali}</td>
        <td>${p.tanggal_kembali_aktual || '-'}</td>
        <td>${p.alasan}</td>
        <td>${badgeFor(p.status)}</td>
        <td>${aksi}</td>
      </tr>
    `;
  }).join('');

  const listPanel = `
    <div class="panel">
      <h2 class="panel-title">Riwayat Perizinan Pulang Asrama</h2>
      ${items.length === 0
        ? `<div class="empty-state">Belum ada pengajuan izin pulang untuk santri ini.</div>`
        : `<table>
            <thead><tr><th>Tanggal Keluar</th><th>Rencana Kembali</th><th>Kembali Aktual</th><th>Alasan</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`}
    </div>
  `;

  if (!canAjukan) return listPanel;

  const formPanel = `
    <div class="panel">
      <h2 class="panel-title">Ajukan Izin Pulang</h2>
      <form onsubmit="handleAjukanIzinPulang(event, '${santri.id}')">
        <div class="field">
          <label for="izin-keluar">Tanggal Keluar</label>
          <input id="izin-keluar" type="date" required value="${new Date().toISOString().slice(0, 10)}">
        </div>
        <div class="field">
          <label for="izin-kembali">Rencana Tanggal Kembali</label>
          <input id="izin-kembali" type="date" required>
        </div>
        <div class="field">
          <label for="izin-alasan">Alasan</label>
          <textarea id="izin-alasan" rows="2" required style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;background:var(--bg);font-family:inherit;"></textarea>
        </div>
        <button class="btn-primary" type="submit" style="width:auto;padding:9px 18px;">Ajukan Izin Pulang</button>
      </form>
    </div>
  `;

  return formPanel + listPanel;
}

async function handleAjukanIzinPulang(event, santriId) {
  event.preventDefault();
  const tanggalKeluar = document.getElementById('izin-keluar').value;
  const tanggalRencanaKembali = document.getElementById('izin-kembali').value;
  const alasan = document.getElementById('izin-alasan').value.trim();
  if (!tanggalKeluar || !tanggalRencanaKembali || !alasan) return;
  await dataService.createIzinPulang({ santriId, tanggalKeluar, tanggalRencanaKembali, alasan }, state.user);
  await render();
}

// Tolak/Setujui tidak pakai window.prompt/confirm -- konsisten dengan
// pola app.js yang selalu memakai form untuk input teks, bukan dialog
// browser native. "Catat Kembali" memakai tanggal hari ini otomatis
// (kasus paling umum: admin mencatat begitu santri benar-benar tiba).
async function handleSetujuiIzinPulang(izinId) {
  await dataService.updateIzinPulangStatus(izinId, 'disetujui', state.user);
  await render();
}
async function handleTolakIzinPulang(izinId) {
  await dataService.updateIzinPulangStatus(izinId, 'ditolak', state.user);
  await render();
}
async function handleCatatKembaliIzinPulang(izinId) {
  await dataService.updateIzinPulangStatus(izinId, 'kembali', state.user, {
    tanggalKembaliAktual: new Date().toISOString().slice(0, 10),
  });
  await render();
}

// ---------------- TAB: KEUANGAN ----------------
async function renderTabKeuangan(santri) {
  const items = await dataService.getKeuanganBySantri(santri.id);
  if (items.length === 0) return `<div class="empty-state">Belum ada data keuangan untuk santri ini.</div>`;

  const badgeFor = status => {
    if (status === 'lunas') return `<span class="badge badge-ok">Lunas</span>`;
    if (status === 'sebagian') return `<span class="badge badge-warn">Sebagian</span>`;
    return `<span class="badge badge-danger">Belum Lunas</span>`;
  };

  const rows = items.map(k => `
    <tr>
      <td>${k.jenis}</td>
      <td>${k.periode || '-'}</td>
      <td class="num">Rp ${k.jumlah.toLocaleString('id-ID')}</td>
      <td>${k.tanggal_jatuh_tempo || '-'}</td>
      <td>${badgeFor(k.status)}</td>
    </tr>
  `).join('');

  return `
    <div class="panel">
      <h2 class="panel-title">Riwayat Keuangan Santri</h2>
      <table>
        <thead><tr><th>Jenis</th><th>Periode</th><th class="num">Jumlah</th><th>Jatuh Tempo</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ---------------- TAB: KEDISIPLINAN ----------------
async function renderTabKedisiplinan(santri) {
  const items = await dataService.getKedisiplinanBySantri(santri.id);
  if (items.length === 0) return `<div class="empty-state">Belum ada catatan kedisiplinan untuk santri ini.</div>`;

  const rows = items.map(k => `
    <tr>
      <td>${k.tanggal}</td>
      <td>${k.jenis === 'prestasi' ? `<span class="badge badge-ok">Prestasi</span>` : `<span class="badge badge-danger">Pelanggaran</span>`}</td>
      <td>${k.kategori}</td>
      <td class="num" style="color:${k.poin > 0 ? 'var(--ok)' : 'var(--danger)'};font-weight:700;">${k.poin > 0 ? '+' : ''}${k.poin}</td>
      <td>${k.keterangan}</td>
      <td>${k.pelapor}</td>
    </tr>
  `).join('');

  const totalPoin = items.reduce((sum, k) => sum + k.poin, 0);

  return `
    <div class="panel">
      <h2 class="panel-title">Catatan Kedisiplinan</h2>
      <table>
        <thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th class="num">Poin</th><th>Keterangan</th><th>Pelapor</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="3" style="text-align:right;font-weight:700;padding:10px;">Total Poin:</td><td class="num" style="font-weight:700;color:${totalPoin >= 0 ? 'var(--ok)' : 'var(--danger)'};">${totalPoin > 0 ? '+' : ''}${totalPoin}</td><td colspan="2"></td></tr></tfoot>
      </table>
    </div>
  `;
}

// ---------------- TAB: KESEHATAN & ASRAMA ----------------
async function renderTabKesehatan(santri) {
  const data = await dataService.getKesehatanBySantri(santri.id);
  if (!data) return `<div class="empty-state">Belum ada data kesehatan/asrama untuk santri ini.</div>`;

  return `
    <div class="panel">
      <h2 class="panel-title">Kesehatan &amp; Asrama</h2>
      <div class="stat-cards">
        <div class="stat-card"><div class="label">Asrama</div><div class="value" style="font-size:16px;">${data.asrama || '-'}</div></div>
        <div class="stat-card"><div class="label">Kamar</div><div class="value" style="font-size:16px;">${data.kamar || '-'}</div></div>
        <div class="stat-card"><div class="label">Golongan Darah</div><div class="value" style="font-size:16px;">${data.golongan_darah || '-'}</div></div>
      </div>
      <table>
        <tbody>
          <tr><td style="font-weight:600;width:180px;">Alergi</td><td>${data.alergi || '-'}</td></tr>
          <tr><td style="font-weight:600;">Riwayat Penyakit</td><td>${data.riwayat_penyakit || '-'}</td></tr>
          <tr><td style="font-weight:600;">Catatan</td><td>${data.catatan || '-'}</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

// ---------------- TAB: DOKUMEN ----------------
async function renderTabDokumen(santri) {
  const items = await dataService.getDokumenBySantri(santri.id);
  if (items.length === 0) return `<div class="empty-state">Belum ada data dokumen untuk santri ini.</div>`;

  const rows = items.map(d => `
    <tr>
      <td>${d.jenis_dokumen}</td>
      <td>${d.nama_file || '<span style="color:var(--ink-faint);">Belum diunggah</span>'}</td>
      <td>${d.status === 'lengkap' ? `<span class="badge badge-ok">Lengkap</span>` : `<span class="badge badge-warn">Belum Lengkap</span>`}</td>
      <td>${d.tanggal_upload || '-'}</td>
    </tr>
  `).join('');

  return `
    <div class="panel">
      <h2 class="panel-title">Dokumen Santri</h2>
      <table>
        <thead><tr><th>Jenis Dokumen</th><th>Nama File</th><th>Status</th><th>Tanggal Unggah</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// Expose state for consistency with the window.X pattern used by the other
// modules (const/let declarations don't attach to window automatically,
// unlike the function declarations above).
window.state = state;

// ---------------- TAB: NOTIFIKASI (SIMULASI) ----------------
async function renderTabNotifikasi(santri) {
  const log = await dataService.getNotifikasiBySantri(santri.id);
  const canManage = NOTIF_MANAGER_ROLES.includes(state.user.role);

  const badgeFor = status => {
    if (status === 'terkirim_simulasi') return `<span class="badge badge-ok">Terkirim (simulasi)</span>`;
    if (status === 'gagal_simulasi') return `<span class="badge badge-danger">Gagal (simulasi)</span>`;
    return `<span class="badge badge-warn">${status}</span>`;
  };

  const rows = log.map(n => `
    <tr>
      <td>${new Date(n.tanggal).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
      <td>${NOTIF_JENIS_LABEL[n.jenis] || n.jenis}</td>
      <td style="max-width:360px;">${n.isi}</td>
      <td>${n.channel}</td>
      <td>${badgeFor(n.status)}</td>
    </tr>
  `).join('');

  const disclaimer = `
    <div class="role-note">
      Ini adalah <b>simulasi</b> — belum ada pesan WhatsApp sungguhan yang terkirim.
      Pengiriman nyata membutuhkan backend (Supabase Edge Function) karena token
      WhatsApp API tidak boleh disimpan di kode frontend.
    </div>
  `;

  const historyPanel = `
    <div class="panel">
      <h2 class="panel-title">Riwayat Notifikasi</h2>
      ${log.length === 0
        ? `<div class="empty-state">Belum ada riwayat notifikasi untuk santri ini.</div>`
        : `<table>
            <thead><tr><th>Waktu</th><th>Jenis</th><th>Isi Pesan</th><th>Kanal</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`}
    </div>
  `;

  if (!canManage) {
    return disclaimer + historyPanel;
  }

  const optionsHtml = Object.entries(NOTIF_JENIS_LABEL)
    .map(([key, label]) => `<option value="${key}">${label}</option>`).join('');

  const triggerPanel = `
    <div class="panel">
      <h2 class="panel-title">Kirim Notifikasi (Simulasi)</h2>
      <form onsubmit="handleSimulateSend(event, '${santri.id}')">
        <div class="field">
          <label for="notif-jenis">Jenis Notifikasi</label>
          <select id="notif-jenis" onchange="fillNotifTemplate(this.value)" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;background:var(--bg);">
            ${optionsHtml}
          </select>
        </div>
        <div class="field">
          <label for="notif-isi">Isi Pesan</label>
          <textarea id="notif-isi" rows="3" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;background:var(--bg);font-family:inherit;">${NOTIF_TEMPLATE.tagihan_jatuh_tempo}</textarea>
        </div>
        <button class="btn-primary" type="submit" style="width:auto;padding:9px 18px;">Kirim Simulasi</button>
      </form>
    </div>
  `;

  return disclaimer + triggerPanel + historyPanel;
}

function fillNotifTemplate(jenis) {
  document.getElementById('notif-isi').value = NOTIF_TEMPLATE[jenis] || '';
}

async function handleSimulateSend(event, santriId) {
  event.preventDefault();
  const jenis = document.getElementById('notif-jenis').value;
  const isi = document.getElementById('notif-isi').value.trim();
  if (!isi) return;
  await dataService.simulateSendNotifikasi({ santriId, jenis, isi });
  await render();
}

// ---------------- TAB: RIWAYAT STATUS (Student Master foundation) ----------------
async function renderTabStatus(santri) {
  const history = await dataService.getStatusHistoryBySantri(santri.id);
  const canManage = UI_SETTINGS_MANAGER_ROLES.includes(state.user.role); // admin saja, sama seperti Pengaturan Institusi

  const rows = history.map(h => `
    <tr>
      <td>${new Date(h.tanggal_efektif).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</td>
      <td>${h.status_sebelumnya ? statusBadgeHtml(h.status_sebelumnya) : '<span style="color:var(--ink-faint);">—</span>'}</td>
      <td>→</td>
      <td>${statusBadgeHtml(h.status_baru)}</td>
      <td>${h.alasan || '-'}</td>
      <td>${h.disetujui_oleh || '-'}</td>
    </tr>
  `).join('');

  const historyPanel = `
    <div class="panel">
      <h2 class="panel-title">Riwayat Status</h2>
      ${history.length === 0
        ? `<div class="empty-state">Belum ada riwayat perubahan status.</div>`
        : `<table>
            <thead><tr><th>Tanggal Efektif</th><th>Dari</th><th></th><th>Menjadi</th><th>Alasan</th><th>Disetujui Oleh</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`}
    </div>
  `;

  if (!canManage) return historyPanel;

  // ---------------- GRADUATION CLEARANCE ----------------
  // Hanya relevan untuk santri yang masih berstatus aktif -- kalau sudah
  // lulus/keluar dengan cara lain, tombol ini tidak berguna dan berpotensi
  // membingungkan (mis. tombol "Luluskan" muncul di santri yang sudah
  // dikeluarkan). Eligibility dicek ulang di data layer saat submit
  // (graduateSantri) -- panel ini hanya menampilkan hasil cek untuk
  // membantu admin, BUKAN satu-satunya penjaga aturan.
  const STATUS_SUDAH_KELUAR = ['lulus', 'mengundurkan_diri', 'dikeluarkan', 'meninggal', 'pindah'];
  let graduationPanel = '';
  if (!STATUS_SUDAH_KELUAR.includes(santri.status)) {
    const cek = await dataService.checkGraduationEligibility(santri.id);
    graduationPanel = `
      <div class="panel">
        <h2 class="panel-title">Kelulusan (Graduation Clearance)</h2>
        <p class="page-sub" style="margin-top:-8px;">
          Syarat kelulusan: seluruh tagihan keuangan santri harus berstatus lunas.
        </p>
        <p style="font-size:13px;margin:0 0 14px;">
          Status kelayakan: ${cek.eligible
            ? `<span class="badge badge-ok">Layak diluluskan</span>`
            : `<span class="badge badge-danger">Belum layak</span> — ${cek.alasanTidakEligible}`}
        </p>
        <form onsubmit="handleGraduateSantri(event, '${santri.id}')">
          <div class="field" style="max-width:220px;">
            <label for="graduate-tanggal">Tanggal Efektif Lulus</label>
            <input id="graduate-tanggal" type="date" required value="${new Date().toISOString().slice(0, 10)}">
          </div>
          <button class="btn-primary" type="submit" style="width:auto;padding:9px 18px;" ${cek.eligible ? '' : 'disabled'}>
            Luluskan Santri
          </button>
          ${state.graduationError ? `<div class="login-error" style="margin-top:12px;margin-bottom:0;">${state.graduationError}</div>` : ''}
        </form>
      </div>
    `;
  }

  const optionsHtml = STATUS_MANUAL_OPTIONS
    .filter(key => key !== santri.status)
    .map(key => `<option value="${key}">${STATUS_LABEL[key]}</option>`).join('');

  const changePanel = `
    <div class="panel">
      <h2 class="panel-title">Ubah Status</h2>
      <p class="page-sub" style="margin-top:-8px;">Status saat ini: ${statusBadgeHtml(santri.status)}. Perubahan tercatat permanen di riwayat — status lama tidak ditimpa.</p>
      <form onsubmit="handleChangeStatus(event, '${santri.id}')">
        <div class="field">
          <label for="status-baru">Status Baru</label>
          <select id="status-baru" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;background:var(--bg);">
            ${optionsHtml}
          </select>
        </div>
        <div class="field">
          <label for="status-tanggal">Tanggal Efektif</label>
          <input id="status-tanggal" type="date" required value="${new Date().toISOString().slice(0, 10)}">
        </div>
        <div class="field">
          <label for="status-alasan">Alasan</label>
          <textarea id="status-alasan" rows="2" required style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;background:var(--bg);font-family:inherit;"></textarea>
        </div>
        <button class="btn-primary" type="submit" style="width:auto;padding:9px 18px;">Simpan Perubahan Status</button>
      </form>
    </div>
  `;

  return graduationPanel + changePanel + historyPanel;
}

async function handleGraduateSantri(event, santriId) {
  event.preventDefault();
  const tanggalEfektif = document.getElementById('graduate-tanggal').value;
  state.graduationError = null;
  try {
    await dataService.graduateSantri({
      santriId, tanggalEfektif, disetujuiOleh: state.user.nama,
    }, state.user);
    await render();
  } catch (err) {
    if (window.SISAF_reportHandledError) window.SISAF_reportHandledError('handleGraduateSantri', err);
    state.graduationError = err.message || 'Gagal meluluskan santri.';
    await render();
  }
}

async function handleChangeStatus(event, santriId) {
  event.preventDefault();
  const statusBaru = document.getElementById('status-baru').value;
  const tanggalEfektif = document.getElementById('status-tanggal').value;
  const alasan = document.getElementById('status-alasan').value.trim();
  if (!alasan) return;
  await dataService.changeStudentStatus({
    santriId, statusBaru, tanggalEfektif, alasan,
    disetujuiOleh: state.user.nama,
  });
  await render();
}

// ---------------- CETAK RAPOR (kop surat, via window.print) ----------------
// Tidak pakai library PDF eksternal — memakai print bawaan browser
// ("Save as PDF") lewat CSS @media print, supaya tidak menambah dependency
// CDN dan hasilnya konsisten dengan format dokumen resmi (bukan tampilan
// warna-warni aplikasi).
async function handlePrintRapor(santriId, semester) {
  const santri = await dataService.getSantriById(santriId, state.user);
  if (!santri) return;
  const kelasInfo = await dataService.getKelasById(santri.kelas_id);
  const nilai = (await dataService.getNilaiBySantri(santriId)).filter(n => n.semester === semester);
  const institution = await dataService.getInstitutionSettings();

  const totalSks = nilai.reduce((sum, n) => sum + n.sks, 0);
  const totalPoin = nilai.reduce((sum, n) => sum + n.poin_diperoleh, 0);
  const ipk = totalSks > 0 ? (totalPoin / totalSks).toFixed(2) : '-';

  const rows = nilai.map((n, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${n.mata_pelajaran}</td>
      <td>${n.kategori}</td>
      <td style="text-align:center;">${n.nilai_huruf}</td>
      <td class="num">${n.sks}</td>
    </tr>
  `).join('');

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `
    <div class="rapor-page">
      <div class="rapor-kop">
        <div class="mark">LOGO</div>
        <div>
          <h1>${institution.nama.toUpperCase()}</h1>
          <p>${institution.alamat}</p>
          <p>${institution.kontak}</p>
        </div>
      </div>
      <div class="rapor-title">Laporan Hasil Belajar Santri — ${semester}</div>
      <div class="rapor-identitas">
        <div>Nama Santri</div><div>:</div><div>${santri.nama}</div>
        <div>NIS</div><div>:</div><div>${santri.nis}</div>
        <div>Kelas</div><div>:</div><div>${kelasInfo ? kelasInfo.nama : '-'}</div>
        <div>Angkatan</div><div>:</div><div>${santri.angkatan}</div>
      </div>
      <table class="rapor-table">
        <thead><tr><th style="width:24px;">No</th><th>Mata Pelajaran</th><th style="width:80px;">Kategori</th><th style="width:50px;">Nilai</th><th class="num" style="width:40px;">SKS</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" style="text-align:center;">Tidak ada data nilai untuk semester ini.</td></tr>`}</tbody>
      </table>
      <div class="rapor-summary">
        Total SKS: <b>${totalSks}</b> &nbsp;&nbsp; IPK Semester: <b>${ipk}</b>
      </div>
      <div class="rapor-ttd">
        <div class="slot">Wali Kelas<div class="space"></div><div class="line">(...........................)</div></div>
        <div class="slot">Orang Tua/Wali<div class="space"></div><div class="line">(...........................)</div></div>
        <div class="slot">${institution.nama}, ${today}<br>Kepala Sekolah<div class="space"></div><div class="line">(...........................)</div></div>
      </div>
    </div>
  `;

  let container = document.getElementById('print-rapor');
  if (!container) {
    container = document.createElement('div');
    container.id = 'print-rapor';
    document.body.appendChild(container);
  }
  container.innerHTML = html;
  window.print();
}

// ---------------- INIT ----------------
// ---------------- EVENT DELEGATION ----------------
// Satu listener terpusat di #app, bukan onclick= inline per elemen.
// Alasan: (1) CSP tanpa 'unsafe-inline' jadi mungkin, (2) skala lebih baik
// begitu modul Admission/Graduation menambah banyak elemen interaktif,
// (3) satu titik untuk trace semua aksi UI saat debugging.
// Setiap elemen aksi diberi `data-action="namaFungsi"` + data-* untuk
// argumennya; map di bawah menerjemahkan itu ke pemanggilan fungsi asli
// tanpa mengubah signature fungsi-fungsi tersebut.
const ACTION_HANDLERS = {
  fillLogin: (el) => fillLogin(el.dataset.email, el.dataset.password),
  handleLogout: () => handleLogout(),
  goTo: (el) => goTo(el.dataset.view),
  openSantri: (el) => openSantri(el.dataset.santriId),
  setTab: (el) => setTab(el.dataset.tab),
  handlePrintRapor: (el) => handlePrintRapor(el.dataset.santriId, el.dataset.semester),
  setujuiIzinPulang: (el) => handleSetujuiIzinPulang(el.dataset.izinId),
  tolakIzinPulang: (el) => handleTolakIzinPulang(el.dataset.izinId),
  catatKembaliIzinPulang: (el) => handleCatatKembaliIzinPulang(el.dataset.izinId),
  toggleAdmissionForm: () => toggleAdmissionForm(),
  acceptApplicant: (el) => acceptApplicant(el),
  openEnrollForm: (el) => openEnrollForm(el),
  cancelEnrollForm: () => cancelEnrollForm(),
};

function initEventDelegation() {
  document.getElementById('app').addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const handler = ACTION_HANDLERS[el.dataset.action];
    if (!handler) {
      console.warn(`SISAF: tidak ada handler terdaftar untuk data-action="${el.dataset.action}"`);
      return;
    }
    e.preventDefault();
    handler(el);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initEventDelegation();
  const restoredUser = sessionPersistence.restore();
  if (restoredUser) {
    state.user = restoredUser;
    state.view = 'ringkasan';
  }
  render();
});
