// ============================================================
// Academics Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.Academics

if (typeof Pages !== 'undefined' && !Pages.Academics) {
  Pages.Academics = { load: async function() {
    const c = document.getElementById('page-academics');
    if (c && window._pageFns && window._pageFns['Academics']) {
      return window._pageFns['Academics'].load.call(this);
    }
  } };
}
