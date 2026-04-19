// ============================================================
// Students Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.Students

if (typeof Pages !== 'undefined' && !Pages.Students) {
  Pages.Students = { load: async function() {
    const c = document.getElementById('page-students');
    if (c && window._pageFns && window._pageFns['Students']) {
      return window._pageFns['Students'].load.call(this);
    }
  } };
}
