// ============================================================
// Staff Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.Staff

if (typeof Pages !== 'undefined' && !Pages.Staff) {
  Pages.Staff = { load: async function() {
    const c = document.getElementById('page-staff');
    if (c && window._pageFns && window._pageFns['Staff']) {
      return window._pageFns['Staff'].load.call(this);
    }
  } };
}
