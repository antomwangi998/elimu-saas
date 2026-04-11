// ============================================================
// Threads Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.Threads

if (typeof Pages !== 'undefined' && !Pages.Threads) {
  Pages.Threads = { load: async function() {
    const c = document.getElementById('page-threads');
    if (c && window._pageFns && window._pageFns['Threads']) {
      return window._pageFns['Threads'].load.call(this);
    }
  } };
}
