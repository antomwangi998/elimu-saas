// ============================================================
// Gamification Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.Gamification

if (typeof Pages !== 'undefined' && !Pages.Gamification) {
  Pages.Gamification = { load: async function() {
    const c = document.getElementById('page-gamification');
    if (c && window._pageFns && window._pageFns['Gamification']) {
      return window._pageFns['Gamification'].load.call(this);
    }
  } };
}
