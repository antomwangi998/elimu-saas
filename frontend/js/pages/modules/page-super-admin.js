// ============================================================
// SuperAdmin Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.SuperAdmin

if (typeof Pages !== 'undefined' && !Pages.SuperAdmin) {
  Pages.SuperAdmin = { load: async function() {
    const c = document.getElementById('page-super-admin');
    if (c && window._pageFns && window._pageFns['SuperAdmin']) {
      return window._pageFns['SuperAdmin'].load.call(this);
    }
  } };
}
