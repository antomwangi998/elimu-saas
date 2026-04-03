// ============================================================
// SearchResults Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.SearchResults

if (typeof Pages !== 'undefined' && !Pages.SearchResults) {
  Pages.SearchResults = { load: async function() {
    const c = document.getElementById('page-search-results');
    if (c && window._pageFns && window._pageFns['SearchResults']) {
      return window._pageFns['SearchResults'].load.call(this);
    }
  } };
}
