// ============================================================
// Dashboard Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.Dashboard

if (typeof Pages !== 'undefined' && !Pages.Dashboard) {
  Pages.Dashboard = { load: async function() {
    const c = document.getElementById('page-dashboard');
    if (c && window._pageFns && window._pageFns['Dashboard']) {
      return window._pageFns['Dashboard'].load.call(this);
    }
  } };
}
