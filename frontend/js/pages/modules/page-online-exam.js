// ============================================================
// OnlineExam Page Module
// Part of ElimuSaaS modular page system
// ============================================================
// This module is loaded by all-pages-v2.js
// Individual exports are available via Pages.OnlineExam

if (typeof Pages !== 'undefined' && !Pages.OnlineExam) {
  Pages.OnlineExam = { load: async function() {
    const c = document.getElementById('page-online-exam');
    if (c && window._pageFns && window._pageFns['OnlineExam']) {
      return window._pageFns['OnlineExam'].load.call(this);
    }
  } };
}
