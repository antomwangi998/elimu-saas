// ============================================================
// Timetable Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.Timetable

if (typeof Pages !== 'undefined' && !Pages.Timetable) {
  Pages.Timetable = { load: async function() {
    const c = document.getElementById('page-timetable');
    if (c && window._pageFns && window._pageFns['Timetable']) {
      return window._pageFns['Timetable'].load.call(this);
    }
  } };
}
