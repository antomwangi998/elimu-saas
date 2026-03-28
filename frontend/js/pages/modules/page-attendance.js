// ============================================================
// Attendance Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.Attendance

if (typeof Pages !== 'undefined' && !Pages.Attendance) {
  Pages.Attendance = { load: async function() {
    const c = document.getElementById('page-attendance');
    if (c && window._pageFns && window._pageFns['Attendance']) {
      return window._pageFns['Attendance'].load.call(this);
    }
  } };
}
