// ============================================================
// AIInsights Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.AIInsights

if (typeof Pages !== 'undefined' && !Pages.AIInsights) {
  Pages.AIInsights = { load: async function() {
    const c = document.getElementById('page-ai-insights');
    if (c && window._pageFns && window._pageFns['AIInsights']) {
      return window._pageFns['AIInsights'].load.call(this);
    }
  } };
}
