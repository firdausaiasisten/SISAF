const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

async function run() {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', resources: 'usable', url: 'https://example.com/' });
  const { window } = dom;
  window.print = () => {}; // jsdom does not implement print(); stub it for the print-rapor test

  const files = ['config.js', 'mockDataService.js', 'supabaseDataService.js', 'dataService.js', 'app.js'];
  const combined = files.map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n;\n');
  window.eval(combined);

  // DOMContentLoaded already fired before scripts loaded in this harness, call render() directly.
  window.render();

  const results = [];
  const accounts = [
    ['admin@alfalah.sch.id', 'admin123', 'admin'],
    ['kepsek@alfalah.sch.id', 'kepsek123', 'kepala_sekolah'],
    ['fadhil.rahman@alfalah.sch.id', 'wali123', 'wali_kelas'],
    ['bendahara@alfalah.sch.id', 'bendahara123', 'bendahara'],
    ['ortu.alfatih@gmail.com', 'ortu123', 'wali_santri'],
  ];

  for (const [email, password, expectedRole] of accounts) {
    // reset state
    window.state.user = null;
    window.render();

    window.document.getElementById('login-email').value = email;
    window.document.getElementById('login-password').value = password;
    await window.handleLogin({ preventDefault: () => {} });

    const ok = window.state.user && window.state.user.role === expectedRole;
    results.push(`${ok ? 'PASS' : 'FAIL'}  login ${email} -> role=${window.state.user && window.state.user.role}`);

    // Ringkasan: notification settings panel should only appear for admin/bendahara
    const settingsPanel = window.document.querySelector('#main-content input[onchange^="handleToggleNotifSetting"]');
    const shouldSeeSettings = ['admin', 'bendahara'].includes(expectedRole);
    const settingsOk = shouldSeeSettings ? !!settingsPanel : !settingsPanel;
    results.push(`  ${settingsOk ? 'PASS' : 'FAIL'}  notif settings panel visible=${!!settingsPanel} (expected ${shouldSeeSettings})`);

    // Pengaturan Institusi: nav item + access guard
    const pengaturanNav = [...window.document.querySelectorAll('.nav li a')].find(a => a.textContent.includes('Pengaturan Institusi'));
    const shouldSeeSettingsNav = expectedRole === 'admin';
    results.push(`  ${(!!pengaturanNav === shouldSeeSettingsNav) ? 'PASS' : 'FAIL'}  pengaturan nav visible=${!!pengaturanNav} (expected ${shouldSeeSettingsNav})`);

    if (expectedRole === 'admin') {
      await window.goTo('pengaturan');
      const form = window.document.querySelector('#main-content form[onsubmit^="handleSaveInstitution"]');
      results.push(`  admin can open Pengaturan form: ${form ? 'PASS' : 'FAIL'}`);
      window.document.getElementById('inst-nama').value = 'Pesantren Modern Al-Falah Abu Lam U (Updated)';
      window.document.getElementById('inst-alamat').value = 'Jl. Contoh Alamat No. 1, Aceh Besar';
      window.document.getElementById('inst-kontak').value = '0800-000-0000 / info@alfalah.sch.id';
      await window.handleSaveInstitution({ preventDefault: () => {} });
      const updated = await window.dataService.getInstitutionSettings();
      results.push(`  institution update persisted: ${updated.nama.includes('Updated') ? 'PASS' : 'FAIL'}`);
      await window.goTo('ringkasan');
    } else {
      // non-admin trying to force the view via state should be denied by the guard in render()
      window.state.view = 'pengaturan';
      await window.render();
      results.push(`  non-admin forced to 'pengaturan' gets redirected: ${window.state.view !== 'pengaturan' ? 'PASS' : 'FAIL'}`);
      window.state.view = 'ringkasan';
    }

    // navigate to daftar santri, then open first santri, then click through tabs
    await window.goTo('daftar');
    const santriLinks = window.document.querySelectorAll('#main-content a[data-action="openSantri"]');
    results.push(`  daftar santri rows: ${santriLinks.length}`);

    if (santriLinks.length > 0) {
      const santriId = santriLinks[0].dataset.santriId;
      await window.openSantri(santriId);

      for (const tab of ['akademik', 'keuangan', 'kedisiplinan', 'kesehatan', 'dokumen', 'notifikasi', 'status']) {
        await window.setTab(tab);
        const hasEmptyOrPanel = window.document.querySelector('#main-content .panel, #main-content .empty-state');
        results.push(`  tab ${tab}: ${hasEmptyOrPanel ? 'rendered' : 'MISSING'}`);
        if (tab === 'status' && expectedRole !== 'admin') {
          const formVisible = !!window.document.querySelector('#main-content form[onsubmit^="handleChangeStatus"]');
          results.push(`  ${expectedRole} should NOT see change-status form: ${!formVisible ? 'PASS' : 'FAIL'}`);
        }
      }

      // Notifikasi-specific checks
      if (expectedRole === 'admin') {
        await window.setTab('notifikasi');
        const beforeCount = (await window.dataService.getNotifikasiBySantri(santriId)).length;
        const sendForm = window.document.querySelector('#main-content form[onsubmit^="handleSimulateSend"]');
        results.push(`  admin sees simulate-send form: ${sendForm ? 'YES' : 'MISSING'}`);
        await window.handleSimulateSend({ preventDefault: () => {} }, santriId);
        const afterCount = (await window.dataService.getNotifikasiBySantri(santriId)).length;
        results.push(`  simulate send increments log: ${afterCount === beforeCount + 1 ? 'PASS' : 'FAIL (before=' + beforeCount + ' after=' + afterCount + ')'}`);

        // Rapor print test
        await window.setTab('akademik');
        const printBtn = window.document.querySelector('#main-content button[data-action="handlePrintRapor"]');
        results.push(`  rapor print button present: ${printBtn ? 'YES' : 'MISSING'}`);
        if (printBtn) {
          const { santriId: raporSantriId, semester: raporSemester } = printBtn.dataset;
          await window.handlePrintRapor(raporSantriId, raporSemester);
          const raporEl = window.document.getElementById('print-rapor');
          const openedSantri = await window.dataService.getSantriById(raporSantriId, window.state.user);
          const hasSantriName = raporEl.textContent.includes(openedSantri.nama);
          const inst = await window.dataService.getInstitutionSettings();
          const hasKop = raporEl.textContent.includes(inst.nama.toUpperCase());
          const hasTable = raporEl.querySelectorAll('.rapor-table tbody tr').length > 0;
          const hasSignature = raporEl.textContent.includes('Wali Kelas') && raporEl.textContent.includes('Kepala Sekolah');
          results.push(`  rapor content - kop surat: ${hasKop ? 'PASS' : 'FAIL'}`);
          results.push(`  rapor content - santri name: ${hasSantriName ? 'PASS' : 'FAIL'}`);
          results.push(`  rapor content - nilai table rows: ${hasTable ? 'PASS (' + raporEl.querySelectorAll('.rapor-table tbody tr').length + ' rows)' : 'FAIL'}`);
          results.push(`  rapor content - signature blocks: ${hasSignature ? 'PASS' : 'FAIL'}`);
        }

        // Status history + change-status test
        await window.setTab('status');
        const statusForm = window.document.querySelector('#main-content form[onsubmit^="handleChangeStatus"]');
        results.push(`  admin sees change-status form: ${statusForm ? 'YES' : 'MISSING'}`);
        const historyBefore = (await window.dataService.getStatusHistoryBySantri(santriId)).length;
        window.document.getElementById('status-baru').value = 'cuti';
        window.document.getElementById('status-tanggal').value = '2026-08-15';
        window.document.getElementById('status-alasan').value = 'Cuti sakit sementara (uji coba)';
        await window.handleChangeStatus({ preventDefault: () => {} }, santriId);
        const historyAfter = await window.dataService.getStatusHistoryBySantri(santriId);
        const updatedSantri = await window.dataService.getSantriById(santriId, window.state.user);
        results.push(`  status history appended: ${historyAfter.length === historyBefore + 1 ? 'PASS' : 'FAIL'}`);
        results.push(`  current status updated to 'cuti': ${updatedSantri.status === 'cuti' ? 'PASS' : 'FAIL (got ' + updatedSantri.status + ')'}`);
        // Regression check: list badge should reflect new status color, not hardcoded green
        await window.goTo('daftar');
        const rowBadge = [...window.document.querySelectorAll('#main-content tbody tr')]
          .find(tr => tr.textContent.includes(updatedSantri.nama))
          ?.querySelector('.badge');
        results.push(`  list badge reflects non-active status (not hardcoded green): ${rowBadge && rowBadge.className.includes('badge-warn') ? 'PASS' : 'FAIL (class=' + (rowBadge && rowBadge.className) + ')'}`);
      }
      if (expectedRole === 'wali_santri') {
        const sendForm = window.document.querySelector('#main-content form[onsubmit^="handleSimulateSend"]');
        results.push(`  wali_santri should NOT see simulate-send form: ${!sendForm ? 'PASS' : 'FAIL - form visible to non-manager role'}`);
      }
    } else if (expectedRole !== 'wali_santri') {
      results.push(`  WARNING: role ${expectedRole} sees 0 santri (unexpected unless wali_santri without data)`);
    }

    await window.handleLogout();
    if (expectedRole === 'admin') {
      const loginText = window.document.querySelector('.login-brand p').textContent;
      results.push(`  updated institution name shows on login screen: ${loginText.includes('Updated') ? 'PASS' : 'FAIL'}`);
    }
  }

  console.log(results.join('\n'));
  const failed = results.filter(r => r.includes('FAIL') || r.includes('MISSING'));
  if (failed.length) {
    console.error(`\n${failed.length} PROBLEM(S) FOUND`);
    process.exit(1);
  } else {
    console.log('\nAll role logins + tab renders verified OK.');
  }
}

run().catch(err => { console.error('TEST CRASHED:', err); process.exit(1); });
