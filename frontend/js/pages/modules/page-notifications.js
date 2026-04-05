// ============================================================
// Notifications Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.Notifications

if (typeof Pages !== 'undefined' && !Pages.Notifications) {
  Pages.Notifications = { load: async function() {
    const c = document.getElementById('page-notifications');
    if (c && window._pageFns && window._pageFns['Notifications']) {
      return window._pageFns['Notifications'].load.call(this);
    }
  } };
}
