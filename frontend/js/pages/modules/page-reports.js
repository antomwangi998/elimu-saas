// ============================================================
// Reports Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.Reports

if (typeof Pages !== 'undefined' && !Pages.Reports) {
  Pages.Reports = { load: async function() {
    const c = document.getElementById('page-reports');
    if (c && window._pageFns && window._pageFns['Reports']) {
      return window._pageFns['Reports'].load.call(this);
    }
  } };
}
