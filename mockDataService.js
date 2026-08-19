// ============================================================
// SISAF — mockDataService.js
// Sumber data mock in-memory. Signature fungsi HARUS tetap sama
// persis dengan supabaseDataService.js (lihat catatan parity di
// bagian bawah file) agar dataService.js bisa menukar implementasi
// tanpa mengubah app.js sama sekali.
// ============================================================

const MockDB = (function () {
  // ---------------- SEED: KELAS ----------------
  const kelas = [
    { id: 'k1', nama: 'XI IPA 2', tingkat: 'XI', tahun_ajaran: '2025/2026', wali_kelas_user_id: 'u_walikelas1' },
    { id: 'k2', nama: 'X IPA 1', tingkat: 'X', tahun_ajaran: '2025/2026', wali_kelas_user_id: 'u_walikelas1' },
  ];

  // ---------------- SEED: WALI SANTRI ----------------
  const waliSantri = [
    { id: 'ws1', user_id: 'u_walisantri1', nama: 'Bapak Ridwan Hakim', hubungan: 'Ayah', telepon: '0812xxxxxxx1', email: 'ortu.alfatih@gmail.com', alamat: 'Banda Aceh' },
    { id: 'ws2', user_id: null, nama: 'Ibu Siti Rahmah', hubungan: 'Ibu', telepon: '0812xxxxxxx2', email: 'siti.rahmah@gmail.com', alamat: 'Aceh Besar' },
    { id: 'ws3', user_id: null, nama: 'Bapak Ismail Yusuf', hubungan: 'Ayah', telepon: '0812xxxxxxx3', email: 'ismail.yusuf@gmail.com', alamat: 'Sigli' },
    { id: 'ws4', user_id: null, nama: 'Ibu Maryam Zahra', hubungan: 'Ibu', telepon: '0812xxxxxxx4', email: 'maryam.zahra@gmail.com', alamat: 'Banda Aceh' },
  ];

  // ---------------- SEED: SANTRI ----------------
  // admission_id/exit_date/exit_reason disiapkan sekarang (null untuk semua
  // data mock saat ini) supaya saat modul Admission/Graduation dibangun,
  // kolom ini tidak perlu ditambah lewat migrasi susulan.
  const santri = [
    { id: 's1', nis: '2024.11.0087', nama: 'Muhammad Al Fatih', kelas_id: 'k1', wali_santri_id: 'ws1', angkatan: '2023', tanggal_lahir: '2009-03-14', jenis_kelamin: 'L', status: 'aktif', foto_url: null, admission_id: null, exit_date: null, exit_reason: null },
    { id: 's2', nis: '2024.11.0088', nama: 'Fatimah Az-Zahra', kelas_id: 'k1', wali_santri_id: 'ws2', angkatan: '2023', tanggal_lahir: '2009-06-02', jenis_kelamin: 'P', status: 'aktif', foto_url: null, admission_id: null, exit_date: null, exit_reason: null },
    { id: 's3', nis: '2023.10.0045', nama: 'Abdurrahman Hakim', kelas_id: 'k2', wali_santri_id: 'ws3', angkatan: '2024', tanggal_lahir: '2010-01-20', jenis_kelamin: 'L', status: 'aktif', foto_url: null, admission_id: null, exit_date: null, exit_reason: null },
    { id: 's4', nis: '2023.10.0046', nama: 'Khadijah Nur Aini', kelas_id: 'k2', wali_santri_id: 'ws4', angkatan: '2024', tanggal_lahir: '2010-09-11', jenis_kelamin: 'P', status: 'aktif', foto_url: null, admission_id: null, exit_date: null, exit_reason: null },
  ];

  // ---------------- SEED: USERS (auth mock) ----------------
  // password disimpan plaintext HANYA karena ini mock demo di memori.
  // supabaseDataService.js akan pakai Supabase Auth (hashed, real).
  const users = [
    { id: 'u_admin1', email: 'admin@alfalah.sch.id', password: 'admin123', nama: 'Admin SISAF', role: 'admin', kelas_id: null, wali_santri_id: null },
    { id: 'u_kepsek1', email: 'kepsek@alfalah.sch.id', password: 'kepsek123', nama: 'Ust. Ridho Maulana, S.Pd.I', role: 'kepala_sekolah', kelas_id: null, wali_santri_id: null },
    { id: 'u_walikelas1', email: 'fadhil.rahman@alfalah.sch.id', password: 'wali123', nama: 'Ust. Fadhil Rahman', role: 'wali_kelas', kelas_id: 'k1', wali_santri_id: null },
    { id: 'u_walikelas2', email: 'aisyah.putri@alfalah.sch.id', password: 'wali123', nama: 'Ustzh. Aisyah Putri', role: 'wali_kelas', kelas_id: 'k2', wali_santri_id: null },
    { id: 'u_bendahara1', email: 'bendahara@alfalah.sch.id', password: 'bendahara123', nama: 'Ibu Nurul Hidayah', role: 'bendahara', kelas_id: null, wali_santri_id: null },
    { id: 'u_walisantri1', email: 'ortu.alfatih@gmail.com', password: 'ortu123', nama: 'Bapak Ridwan Hakim', role: 'wali_santri', kelas_id: null, wali_santri_id: 'ws1' },
  ];

  // ---------------- SEED: NILAI AKADEMIK ----------------
  const nilaiAkademik = [
    { id: 'n1', santri_id: 's1', semester: 'Ganjil 2025/2026', mata_pelajaran: "Tahfizh Al-Qur'an Juz 21-25", kategori: 'Diniyah', nilai_huruf: 'A', poin_nilai: 4.0, sks: 3, poin_diperoleh: 12.0 },
    { id: 'n2', santri_id: 's1', semester: 'Ganjil 2025/2026', mata_pelajaran: 'Fiqih Muamalah', kategori: 'Diniyah', nilai_huruf: 'A-', poin_nilai: 3.7, sks: 2, poin_diperoleh: 7.4 },
    { id: 'n3', santri_id: 's1', semester: 'Ganjil 2025/2026', mata_pelajaran: 'Matematika Peminatan', kategori: 'Umum', nilai_huruf: 'B+', poin_nilai: 3.3, sks: 4, poin_diperoleh: 13.2 },
    { id: 'n4', santri_id: 's1', semester: 'Ganjil 2025/2026', mata_pelajaran: 'Fisika', kategori: 'Umum', nilai_huruf: 'B', poin_nilai: 3.0, sks: 3, poin_diperoleh: 9.0 },
    { id: 'n5', santri_id: 's1', semester: 'Ganjil 2025/2026', mata_pelajaran: 'Aqidah Akhlak', kategori: 'Diniyah', nilai_huruf: 'A', poin_nilai: 4.0, sks: 2, poin_diperoleh: 8.0 },
    { id: 'n6', santri_id: 's1', semester: 'Ganjil 2025/2026', mata_pelajaran: 'Bahasa Inggris', kategori: 'Umum', nilai_huruf: 'A-', poin_nilai: 3.7, sks: 2, poin_diperoleh: 7.4 },
    { id: 'n7', santri_id: 's2', semester: 'Ganjil 2025/2026', mata_pelajaran: "Tahfizh Al-Qur'an Juz 16-20", kategori: 'Diniyah', nilai_huruf: 'A', poin_nilai: 4.0, sks: 3, poin_diperoleh: 12.0 },
    { id: 'n8', santri_id: 's2', semester: 'Ganjil 2025/2026', mata_pelajaran: 'Matematika Peminatan', kategori: 'Umum', nilai_huruf: 'A-', poin_nilai: 3.7, sks: 4, poin_diperoleh: 14.8 },
    { id: 'n9', santri_id: 's3', semester: 'Ganjil 2025/2026', mata_pelajaran: "Tahfizh Al-Qur'an Juz 6-10", kategori: 'Diniyah', nilai_huruf: 'B+', poin_nilai: 3.3, sks: 3, poin_diperoleh: 9.9 },
    { id: 'n10', santri_id: 's4', semester: 'Ganjil 2025/2026', mata_pelajaran: "Tahfizh Al-Qur'an Juz 6-10", kategori: 'Diniyah', nilai_huruf: 'A', poin_nilai: 4.0, sks: 3, poin_diperoleh: 12.0 },
  ];

  // ---------------- SEED: KEUANGAN SANTRI ----------------
  const keuanganSantri = [
    { id: 'ks1', santri_id: 's1', jenis: 'SPP', periode: 'Agustus 2026', jumlah: 850000, status: 'lunas', tanggal_jatuh_tempo: '2026-08-10', tanggal_bayar: '2026-08-05' },
    { id: 'ks2', santri_id: 's1', jenis: 'Uang Saku', periode: 'Agustus 2026', jumlah: 300000, status: 'lunas', tanggal_jatuh_tempo: '2026-08-10', tanggal_bayar: '2026-08-05' },
    { id: 'ks3', santri_id: 's1', jenis: 'SPP', periode: 'September 2026', jumlah: 850000, status: 'belum_lunas', tanggal_jatuh_tempo: '2026-09-10', tanggal_bayar: null },
    { id: 'ks4', santri_id: 's2', jenis: 'SPP', periode: 'Agustus 2026', jumlah: 850000, status: 'sebagian', tanggal_jatuh_tempo: '2026-08-10', tanggal_bayar: null },
    { id: 'ks5', santri_id: 's3', jenis: 'SPP', periode: 'Agustus 2026', jumlah: 850000, status: 'lunas', tanggal_jatuh_tempo: '2026-08-10', tanggal_bayar: '2026-08-08' },
    { id: 'ks6', santri_id: 's4', jenis: 'SPP', periode: 'Agustus 2026', jumlah: 850000, status: 'belum_lunas', tanggal_jatuh_tempo: '2026-08-10', tanggal_bayar: null },
  ];

  // ---------------- SEED: KEDISIPLINAN ----------------
  const kedisiplinan = [
    { id: 'kd1', santri_id: 's1', tanggal: '2026-07-14', jenis: 'prestasi', kategori: 'Akademik', poin: 10, keterangan: "Juara 1 Lomba Tahfizh Antar Pesantren", pelapor: 'Ust. Fadhil Rahman' },
    { id: 'kd2', santri_id: 's1', tanggal: '2026-08-02', jenis: 'pelanggaran', kategori: 'Ringan', poin: -5, keterangan: 'Terlambat masuk kelas pagi', pelapor: 'Ust. Fadhil Rahman' },
    { id: 'kd3', santri_id: 's3', tanggal: '2026-07-28', jenis: 'pelanggaran', kategori: 'Sedang', poin: -15, keterangan: 'Tidak mengikuti shalat berjamaah 3x', pelapor: 'Ustzh. Aisyah Putri' },
  ];

  // ---------------- SEED: KESEHATAN & ASRAMA ----------------
  const kesehatanAsrama = [
    { id: 'ka1', santri_id: 's1', asrama: 'Asrama Putra Al-Farabi', kamar: 'B-12', golongan_darah: 'O', alergi: 'Tidak ada', riwayat_penyakit: '-', catatan: 'Kondisi sehat' },
    { id: 'ka2', santri_id: 's2', asrama: 'Asrama Putri Khadijah', kamar: 'A-05', golongan_darah: 'A', alergi: 'Debu', riwayat_penyakit: 'Asma ringan', catatan: 'Bawa inhaler pribadi' },
    { id: 'ka3', santri_id: 's3', asrama: 'Asrama Putra Al-Farabi', kamar: 'B-08', golongan_darah: 'B', alergi: 'Tidak ada', riwayat_penyakit: '-', catatan: '-' },
    { id: 'ka4', santri_id: 's4', asrama: 'Asrama Putri Khadijah', kamar: 'A-05', golongan_darah: 'AB', alergi: 'Seafood', riwayat_penyakit: '-', catatan: 'Menu makan disesuaikan' },
  ];

  // ---------------- SEED: DOKUMEN ----------------
  const dokumenSantri = [
    { id: 'd1', santri_id: 's1', jenis_dokumen: 'Akta Kelahiran', nama_file: 'akta_alfatih.pdf', status: 'lengkap', tanggal_upload: '2024-07-01' },
    { id: 'd2', santri_id: 's1', jenis_dokumen: 'Kartu Keluarga', nama_file: 'kk_alfatih.pdf', status: 'lengkap', tanggal_upload: '2024-07-01' },
    { id: 'd3', santri_id: 's1', jenis_dokumen: 'Ijazah SMP', nama_file: null, status: 'belum_lengkap', tanggal_upload: null },
    { id: 'd4', santri_id: 's2', jenis_dokumen: 'Akta Kelahiran', nama_file: 'akta_fatimah.pdf', status: 'lengkap', tanggal_upload: '2024-07-02' },
  ];

  // ---------------- SEED: PENGATURAN NOTIFIKASI OTOMATIS ----------------
  // Toggle per jenis event — hanya admin/bendahara yang boleh mengubah (lihat app.js).
  const notifikasiSettings = {
    tagihan_jatuh_tempo: true,
    pembayaran_diterima: true,
    kedisiplinan: true,
    akademik: false,
  };

  // ---------------- SEED: LOG NOTIFIKASI (SIMULASI) ----------------
  // STATUS: SIMULASI SAJA. Tidak ada pesan WhatsApp sungguhan yang terkirim —
  // lihat catatan arsitektur di README. Log ini mencatat "apa yang SEHARUSNYA
  // terkirim" agar alur bisa diuji sebelum backend (Supabase Edge Function +
  // WhatsApp API) benar-benar ada.
  const notifikasiLog = [
    { id: 'nt1', santri_id: 's1', jenis: 'pembayaran_diterima', isi: "Yth. Bapak Ridwan Hakim, pembayaran SPP & Uang Saku Agustus 2026 untuk ananda Muhammad Al Fatih telah kami terima. Jazakumullah khairan.", status: 'terkirim_simulasi', channel: 'WhatsApp', tanggal: '2026-08-05T09:12:00' },
    { id: 'nt2', santri_id: 's1', jenis: 'kedisiplinan', isi: "Alhamdulillah, ananda Muhammad Al Fatih meraih prestasi: Juara 1 Lomba Tahfizh Antar Pesantren.", status: 'terkirim_simulasi', channel: 'WhatsApp', tanggal: '2026-07-14T14:30:00' },
    { id: 'nt3', santri_id: 's1', jenis: 'tagihan_jatuh_tempo', isi: "Yth. Bapak Ridwan Hakim, tagihan SPP September 2026 untuk ananda Muhammad Al Fatih sebesar Rp850.000 akan jatuh tempo pada 10 September 2026.", status: 'terkirim_simulasi', channel: 'WhatsApp', tanggal: '2026-09-03T08:00:00' },
    { id: 'nt4', santri_id: 's3', jenis: 'kedisiplinan', isi: "Yth. Bapak Ismail Yusuf, mohon perhatian, ananda Abdurrahman Hakim tercatat: Tidak mengikuti shalat berjamaah 3x.", status: 'gagal_simulasi', channel: 'WhatsApp', tanggal: '2026-07-28T16:00:00' },
  ];

  // ---------------- SEED: PENGATURAN INSTITUSI ----------------
  // Dipindah dari config.js ke sini supaya bisa diubah lewat UI (role admin),
  // bukan file statis — langkah pertama ke arah SaaS multi-tenant: nanti
  // setiap tenant (pesantren) punya baris sendiri di tabel ini, dan admin
  // masing-masing tenant mengelola profil institusinya sendiri tanpa perlu
  // akses ke config.js atau deployment.
  const institutionSettings = {
    nama: 'Pesantren Modern Al-Falah Abu Lam U',
    alamat: '(lengkapi alamat lengkap pesantren di menu Pengaturan)',
    kontak: '(lengkapi telepon/email resmi di menu Pengaturan)',
  };

  // ---------------- SEED: RIWAYAT STATUS SANTRI ----------------
  // Vocabulary status mencakup siklus penuh (bukan cuma 'aktif'/'lulus'/dst)
  // supaya saat modul Admission/Graduation dibangun nanti, tidak perlu
  // migrasi ulang nilai yang sudah ada. Status yang belum relevan sekarang
  // (calon_santri, diterima) tetap didefinisikan di STATUS_LABEL (app.js)
  // meski belum ada alur UI yang menghasilkannya.
  const statusHistory = [
    { id: 'sh1', santri_id: 's1', status_sebelumnya: null, status_baru: 'aktif', tanggal_efektif: '2023-07-10', alasan: 'Pendaftaran awal tahun ajaran 2023/2024', dokumen_rujukan: null, disetujui_oleh: 'Admin SISAF' },
    { id: 'sh2', santri_id: 's2', status_sebelumnya: null, status_baru: 'aktif', tanggal_efektif: '2023-07-10', alasan: 'Pendaftaran awal tahun ajaran 2023/2024', dokumen_rujukan: null, disetujui_oleh: 'Admin SISAF' },
    { id: 'sh3', santri_id: 's3', status_sebelumnya: null, status_baru: 'aktif', tanggal_efektif: '2024-07-08', alasan: 'Pendaftaran awal tahun ajaran 2024/2025', dokumen_rujukan: null, disetujui_oleh: 'Admin SISAF' },
    { id: 'sh4', santri_id: 's4', status_sebelumnya: null, status_baru: 'aktif', tanggal_efektif: '2024-07-08', alasan: 'Pendaftaran awal tahun ajaran 2024/2025', dokumen_rujukan: null, disetujui_oleh: 'Admin SISAF' },
  ];

  // ---------------- SEED: PRESENSI HARIAN ----------------
  // status: 'hadir' | 'sakit' | 'izin' | 'alpa'. Satu baris per santri per
  // tanggal (constraint unik santri_id+tanggal juga ditegakkan di migrasi).
  const presensi = [
    { id: 'ps1', santri_id: 's1', tanggal: '2026-08-14', status: 'hadir', keterangan: null, dicatat_oleh: 'u_walikelas1' },
    { id: 'ps2', santri_id: 's2', tanggal: '2026-08-14', status: 'hadir', keterangan: null, dicatat_oleh: 'u_walikelas1' },
    { id: 'ps3', santri_id: 's3', tanggal: '2026-08-14', status: 'sakit', keterangan: 'Demam, izin ke klinik asrama', dicatat_oleh: 'u_walikelas2' },
    { id: 'ps4', santri_id: 's4', tanggal: '2026-08-14', status: 'hadir', keterangan: null, dicatat_oleh: 'u_walikelas2' },
    { id: 'ps5', santri_id: 's1', tanggal: '2026-08-15', status: 'hadir', keterangan: null, dicatat_oleh: 'u_walikelas1' },
    { id: 'ps6', santri_id: 's2', tanggal: '2026-08-15', status: 'izin', keterangan: 'Pulang urusan keluarga', dicatat_oleh: 'u_walikelas1' },
  ];

  // ---------------- SEED: APPLICANTS (Admission) ----------------
  // status pakai subset status_santri: 'calon_santri' -> 'diterima' -> 'terdaftar'.
  // Begitu 'terdaftar', satu baris santri baru dibuat otomatis (lihat
  // updateApplicantStatus) dengan admission_id menunjuk ke baris ini.
  const applicants = [
    { id: 'ap1', nama: 'Zaid Ibrahim', tanggal_lahir: '2011-02-11', jenis_kelamin: 'L', asal_sekolah: 'MTsN 1 Banda Aceh', nama_wali: 'Bapak Hamzah', telepon_wali: '0813xxxxxxx1', status: 'calon_santri', tanggal_daftar: '2026-08-01', catatan: null, santri_id: null },
    { id: 'ap2', nama: 'Aisyah Putri', tanggal_lahir: '2011-05-20', jenis_kelamin: 'P', asal_sekolah: 'MTs Al-Muslimun', nama_wali: 'Ibu Ainun', telepon_wali: '0813xxxxxxx2', status: 'diterima', tanggal_daftar: '2026-07-20', catatan: 'Lulus tes tulis & wawancara', santri_id: null },
  ];

  return {
    kelas, waliSantri, santri, users, nilaiAkademik,
    keuanganSantri, kedisiplinan, kesehatanAsrama, dokumenSantri,
    notifikasiSettings, notifikasiLog, institutionSettings, statusHistory,
    presensi, applicants,
  };
})();

// Role yang boleh mengubah profil institusi (nama, alamat, kontak).
// Duplikasi sengaja dari nilai yang sama di app.js (UI_SETTINGS_MANAGER_ROLES)
// dan supabaseDataService.js (SUPABASE_SETTINGS_MANAGER_ROLES) — nama beda
// per file supaya tidak bentrok di scope global classic <script>, tapi
// NILAI harus tetap identik di ketiganya. app.js pakai untuk sembunyikan
// menu/tombol (UX), data layer (file ini) pakai untuk menahan panggilan
// langsung (otorisasi sungguhan). Kalau daftar role berubah, perbarui
// KETIGA tempat.
const SETTINGS_MANAGER_ROLES = ['admin'];

const mockDataService = {
  // ---------------- AUTH ----------------
  async login(email, password) {
    await _delay();
    const user = MockDB.users.find(u => u.email === email && u.password === password);
    if (!user) return { user: null, error: 'Email atau kata sandi salah.' };
    const { password: _pw, ...safeUser } = user;
    return { user: safeUser, error: null };
  },

  // Paritas signature dengan supabaseDataService.logout() (yang memanggil
  // auth.signOut()). Di mock tidak ada sesi server untuk ditutup — no-op,
  // tapi tetap ada supaya kalau app.js suatu saat memanggil dataService.logout()
  // langsung, tidak error di mode mock.
  async logout() {
    await _delay();
  },

  // ---------------- KELAS ----------------
  async getKelasList() {
    await _delay();
    return MockDB.kelas;
  },

  // ---------------- SANTRI (dengan filter otorisasi eksplisit) ----------------
  async getSantriList(currentUser) {
    await _delay();
    return _filterSantriByRole(MockDB.santri, currentUser);
  },

  async getSantriById(santriId, currentUser) {
    await _delay();
    const list = _filterSantriByRole(MockDB.santri, currentUser);
    return list.find(s => s.id === santriId) || null;
  },

  // ---------------- AKADEMIK ----------------
  async getNilaiBySantri(santriId) {
    await _delay();
    return MockDB.nilaiAkademik.filter(n => n.santri_id === santriId);
  },

  // ---------------- KEUANGAN ----------------
  async getKeuanganBySantri(santriId) {
    await _delay();
    return MockDB.keuanganSantri.filter(k => k.santri_id === santriId);
  },

  // ---------------- KEDISIPLINAN ----------------
  async getKedisiplinanBySantri(santriId) {
    await _delay();
    return MockDB.kedisiplinan.filter(k => k.santri_id === santriId);
  },

  // ---------------- KESEHATAN & ASRAMA ----------------
  async getKesehatanBySantri(santriId) {
    await _delay();
    return MockDB.kesehatanAsrama.find(k => k.santri_id === santriId) || null;
  },

  // ---------------- DOKUMEN ----------------
  async getDokumenBySantri(santriId) {
    await _delay();
    return MockDB.dokumenSantri.filter(d => d.santri_id === santriId);
  },

  // ---------------- PRESENSI HARIAN ----------------
  async getPresensiBySantri(santriId) {
    await _delay();
    return MockDB.presensi
      .filter(p => p.santri_id === santriId)
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  },

  // Dipakai layar input massal wali kelas: satu kelas, satu tanggal,
  // mengembalikan seluruh santri kelas tsb + status presensi (null kalau
  // belum diisi) supaya UI bisa render form dalam satu panggilan.
  async getPresensiByKelasTanggal(kelasId, tanggal) {
    await _delay();
    const daftarSantri = MockDB.santri.filter(s => s.kelas_id === kelasId && s.status === 'aktif');
    return daftarSantri.map(s => {
      const existing = MockDB.presensi.find(p => p.santri_id === s.id && p.tanggal === tanggal);
      return {
        santri_id: s.id,
        nama: s.nama,
        nis: s.nis,
        status: existing ? existing.status : null,
        keterangan: existing ? existing.keterangan : null,
      };
    });
  },

  // Upsert satu baris presensi (unik per santri_id+tanggal). Dipakai baik
  // untuk isi baru maupun koreksi hari yang sama.
  async recordPresensi({ santriId, tanggal, status, keterangan, dicatatOleh }) {
    await _delay();
    if (!['hadir', 'sakit', 'izin', 'alpa'].includes(status)) {
      throw new Error('Status presensi tidak valid.');
    }
    const existing = MockDB.presensi.find(p => p.santri_id === santriId && p.tanggal === tanggal);
    if (existing) {
      existing.status = status;
      existing.keterangan = keterangan || null;
      existing.dicatat_oleh = dicatatOleh;
      return existing;
    }
    const entry = {
      id: 'ps' + (MockDB.presensi.length + 1) + '_' + Date.now(),
      santri_id: santriId,
      tanggal,
      status,
      keterangan: keterangan || null,
      dicatat_oleh: dicatatOleh,
    };
    MockDB.presensi.push(entry);
    return entry;
  },

  // ---------------- STATUS SANTRI (Student Master foundation) ----------------
  async getStatusHistoryBySantri(santriId) {
    await _delay();
    return MockDB.statusHistory
      .filter(h => h.santri_id === santriId)
      .sort((a, b) => new Date(b.tanggal_efektif) - new Date(a.tanggal_efektif));
  },

  // Mengubah status TIDAK menimpa status lama — selalu menambah baris riwayat
  // baru (prinsip "data historis tidak boleh ditimpa" dari dokumen arsitektur),
  // baru kemudian memperbarui current_status di record santri.
  async changeStudentStatus({ santriId, statusBaru, tanggalEfektif, alasan, disetujuiOleh }) {
    await _delay(200);
    const santriRecord = MockDB.santri.find(s => s.id === santriId);
    if (!santriRecord) throw new Error('Santri tidak ditemukan.');

    const entry = {
      id: 'sh' + (MockDB.statusHistory.length + 1) + '_' + Date.now(),
      santri_id: santriId,
      status_sebelumnya: santriRecord.status,
      status_baru: statusBaru,
      tanggal_efektif: tanggalEfektif,
      alasan,
      dokumen_rujukan: null,
      disetujui_oleh: disetujuiOleh,
    };
    MockDB.statusHistory.push(entry);
    santriRecord.status = statusBaru;
    if (['keluar', 'mengundurkan_diri', 'dikeluarkan', 'pindah', 'meninggal'].includes(statusBaru)) {
      santriRecord.exit_date = tanggalEfektif;
      santriRecord.exit_reason = alasan;
    }
    return entry;
  },

  // ---------------- PENGATURAN INSTITUSI ----------------
  // Dipanggil bahkan sebelum login (halaman login perlu menampilkan nama
  // institusi yang benar) — wajar untuk SaaS: subdomain/tenant menentukan
  // institusi yang tampil di layar login, sebelum autentikasi terjadi.
  async getInstitutionSettings() {
    await _delay();
    return { ...MockDB.institutionSettings };
  },

  // Otorisasi role divalidasi DI SINI, bukan cuma di app.js — app.js
  // menyembunyikan tombol/menu untuk role selain admin (UX), tapi kalau
  // ada jalur lain memanggil fungsi ini langsung (mis. dari console
  // browser), lapisan ini yang menahannya. Sama seperti prinsip
  // _filterSantriByRole di atas: jangan andalkan UI saja sebagai
  // satu-satunya penjaga otorisasi.
  async updateInstitutionSettings(newSettings, currentUser) {
    await _delay();
    if (!currentUser || !SETTINGS_MANAGER_ROLES.includes(currentUser.role)) {
      throw new Error('Anda tidak memiliki izin untuk mengubah pengaturan institusi.');
    }
    Object.assign(MockDB.institutionSettings, newSettings);
    return { ...MockDB.institutionSettings };
  },

  // ---------------- NOTIFIKASI (SIMULASI) ----------------
  async getNotifikasiBySantri(santriId) {
    await _delay();
    return MockDB.notifikasiLog
      .filter(n => n.santri_id === santriId)
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  },

  async getNotifikasiSettings() {
    await _delay();
    return { ...MockDB.notifikasiSettings };
  },

  async updateNotifikasiSettings(newSettings) {
    await _delay();
    Object.assign(MockDB.notifikasiSettings, newSettings);
    return { ...MockDB.notifikasiSettings };
  },

  // Mencatat notifikasi ke log SEBAGAI SIMULASI — tidak ada pesan WhatsApp
  // sungguhan yang dikirim. Lihat README bagian "Kendala arsitektur notifikasi".
  async simulateSendNotifikasi({ santriId, jenis, isi }) {
    await _delay(200); // delay lebih lama untuk terasa seperti "mengirim"
    const entry = {
      id: 'nt' + (MockDB.notifikasiLog.length + 1) + '_' + Date.now(),
      santri_id: santriId,
      jenis,
      isi,
      status: 'terkirim_simulasi',
      channel: 'WhatsApp',
      tanggal: new Date().toISOString(),
    };
    MockDB.notifikasiLog.push(entry);
    return entry;
  },

  // ---------------- ADMISSION (calon_santri -> diterima -> terdaftar) ----------------
  // Baca: admin & kepala_sekolah (visibilitas lintas peran untuk pantauan
  // penerimaan). Tulis: admin saja — sama pola dengan updateInstitutionSettings.
  async getApplicants(currentUser) {
    await _delay();
    if (!currentUser || !['admin', 'kepala_sekolah'].includes(currentUser.role)) return [];
    return MockDB.applicants.slice().sort((a, b) => new Date(b.tanggal_daftar) - new Date(a.tanggal_daftar));
  },

  async createApplicant(data, currentUser) {
    await _delay();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Hanya admin yang boleh mendaftarkan calon santri baru.');
    }
    const entry = {
      id: 'ap' + (MockDB.applicants.length + 1) + '_' + Date.now(),
      nama: data.nama,
      tanggal_lahir: data.tanggalLahir || null,
      jenis_kelamin: data.jenisKelamin || null,
      asal_sekolah: data.asalSekolah || null,
      nama_wali: data.namaWali || null,
      telepon_wali: data.teleponWali || null,
      status: 'calon_santri',
      tanggal_daftar: data.tanggalDaftar || new Date().toISOString().slice(0, 10),
      catatan: data.catatan || null,
      santri_id: null,
    };
    MockDB.applicants.push(entry);
    return entry;
  },

  // Transisi status HANYA maju satu langkah (calon_santri -> diterima ->
  // terdaftar), tidak boleh loncat atau mundur -- mencegah data admission
  // tidak konsisten (mis. 'terdaftar' tanpa pernah 'diterima').
  // Begitu status jadi 'terdaftar', otomatis membuat satu baris santri
  // baru (kelas_id & wali_santri_id wajib diisi di titik ini, karena baru
  // di titik inilah calon santri benar-benar jadi santri terdaftar).
  async updateApplicantStatus(applicantId, statusBaru, currentUser, extra = {}) {
    await _delay(200);
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Hanya admin yang boleh mengubah status penerimaan.');
    }
    const applicant = MockDB.applicants.find(a => a.id === applicantId);
    if (!applicant) throw new Error('Data calon santri tidak ditemukan.');

    const URUTAN = ['calon_santri', 'diterima', 'terdaftar'];
    const idxSekarang = URUTAN.indexOf(applicant.status);
    const idxBaru = URUTAN.indexOf(statusBaru);
    if (idxBaru !== idxSekarang + 1) {
      throw new Error(`Transisi status tidak valid: ${applicant.status} -> ${statusBaru}. Harus urut satu langkah.`);
    }

    // PENTING: validasi field wajib SEBELUM mutasi applicant.status.
    // Bug sebelumnya: applicant.status di-set duluan, baru dicek field
    // wajib untuk 'terdaftar' -- kalau field kurang, error dilempar TAPI
    // applicant.status sudah kadung berubah jadi 'terdaftar' tanpa baris
    // santri yang menyertainya. Percobaan berikutnya lalu gagal dengan
    // pesan "terdaftar -> terdaftar" yang membingungkan, dan data
    // applicant tersangkut permanen di status yang tidak valid. Ketahuan
    // dari tests/data_service_contract.test.js, bukan dari review manual.
    if (statusBaru === 'terdaftar' && (!extra.nis || !extra.kelasId || !extra.waliSantriId)) {
      throw new Error('NIS, kelas, dan wali santri wajib diisi saat menerbitkan status "terdaftar".');
    }

    applicant.status = statusBaru;

    if (statusBaru === 'terdaftar') {
      const santriBaru = {
        id: 's' + (MockDB.santri.length + 1) + '_' + Date.now(),
        nis: extra.nis,
        nama: applicant.nama,
        kelas_id: extra.kelasId,
        wali_santri_id: extra.waliSantriId,
        angkatan: extra.angkatan || String(new Date().getFullYear()),
        tanggal_lahir: applicant.tanggal_lahir,
        jenis_kelamin: applicant.jenis_kelamin,
        status: 'terdaftar',
        foto_url: null,
        admission_id: applicant.id,
        exit_date: null,
        exit_reason: null,
      };
      MockDB.santri.push(santriBaru);
      MockDB.statusHistory.push({
        id: 'sh' + (MockDB.statusHistory.length + 1) + '_' + Date.now(),
        santri_id: santriBaru.id,
        status_sebelumnya: null,
        status_baru: 'terdaftar',
        tanggal_efektif: new Date().toISOString().slice(0, 10),
        alasan: `Penerimaan santri baru (admission ${applicant.id})`,
        dokumen_rujukan: null,
        disetujui_oleh: currentUser.nama || currentUser.email,
      });
      applicant.santri_id = santriBaru.id;
    }
    return applicant;
  },

  // ---------------- GRADUATION CLEARANCE ----------------
  // Syarat kelulusan sekarang cuma cek keuangan lunas (satu-satunya data
  // yang tersedia untuk itu di modul ini). Kalau nanti ada syarat lain
  // (dokumen lengkap, dst.), tambahkan pengecekan di sini, bukan di app.js,
  // supaya satu sumber kebenaran untuk "boleh lulus atau tidak".
  async checkGraduationEligibility(santriId) {
    await _delay();
    const tagihanBelumLunas = MockDB.keuanganSantri.filter(
      k => k.santri_id === santriId && k.status !== 'lunas'
    );
    return {
      eligible: tagihanBelumLunas.length === 0,
      alasanTidakEligible: tagihanBelumLunas.length > 0
        ? `${tagihanBelumLunas.length} tagihan belum lunas.`
        : null,
    };
  },

  // Membungkus changeStudentStatus dengan pengecekan eligibility supaya
  // UI tidak perlu mengulang logikanya, dan supaya "lulus tanpa cek
  // keuangan" tidak bisa terjadi lewat jalur lain yang lupa mengecek.
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

  // ---------------- HELPERS UNTUK NAMA KELAS/WALI ----------------
  // Dibuat async (meski mock tidak butuh) supaya signature identik dengan
  // versi Supabase nanti, dan app.js selalu memanggil lewat dataService,
  // bukan mockDataService langsung — dua panggilan sebelumnya memanggil
  // mockDataService secara langsung, artinya kalau APP_MODE pindah ke
  // 'supabase' nanti, panggilan itu akan tetap diam-diam pakai data mock.
  async getKelasById(kelasId) {
    await _delay();
    return MockDB.kelas.find(k => k.id === kelasId) || null;
  },
  async getWaliSantriById(waliId) {
    await _delay();
    return MockDB.waliSantri.find(w => w.id === waliId) || null;
  },

  // Dipakai form "Daftarkan sebagai Santri" (Admission) untuk memilih wali
  // santri yang sudah ada di sistem. Baca saja, sama otorisasi longgarnya
  // dengan getKelasList (bukan data sensitif per-santri).
  async getWaliSantriList() {
    await _delay();
    return MockDB.waliSantri;
  },
};

// ---------------- Otorisasi eksplisit di layer JS ----------------
// Sama seperti prinsip HRIS: jangan andalkan RLS saja. Fungsi ini
// akan tetap dipanggil sama persis meski nanti backend jadi Supabase,
// sebagai lapisan kedua di atas RLS.
function _filterSantriByRole(allSantri, currentUser) {
  if (!currentUser) return [];
  switch (currentUser.role) {
    case 'admin':
    case 'kepala_sekolah':
    case 'bendahara':
      return allSantri; // lintas kelas, read (bendahara) / full (admin)
    case 'wali_kelas':
      return allSantri.filter(s => s.kelas_id === currentUser.kelas_id);
    case 'wali_santri':
      return allSantri.filter(s => s.wali_santri_id === currentUser.wali_santri_id);
    default:
      return [];
  }
}

function _delay(ms = 120) {
  // Simulasi latensi jaringan supaya UI loading state teruji,
  // dan supaya perilaku terasa mirip saat nanti pindah ke Supabase.
  return new Promise(resolve => setTimeout(resolve, ms));
}

window.mockDataService = mockDataService;
