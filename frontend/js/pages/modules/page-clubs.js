// ============================================================
// Clubs Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.Clubs

if (typeof Pages !== 'undefined' && !Pages.Clubs) {
  Pages.Clubs = { load: async function() {
    const c = document.getElementById('page-clubs');
    if (c && window._pageFns && window._pageFns['Clubs']) {
      return window._pageFns['Clubs'].load.call(this);
    }
  } };
}
