// ============================================================
// SchoolProfile Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.SchoolProfile

if (typeof Pages !== 'undefined' && !Pages.SchoolProfile) {
  Pages.SchoolProfile = { load: async function() {
    const c = document.getElementById('page-school-profile');
    if (c && window._pageFns && window._pageFns['SchoolProfile']) {
      return window._pageFns['SchoolProfile'].load.call(this);
    }
  } };
}
