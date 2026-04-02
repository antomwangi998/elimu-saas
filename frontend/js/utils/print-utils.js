// ============================================================
// ElimuSaaS -- Print and PDF generation via window.print
// Module: print-utils
// ============================================================
'use strict';

/**
 * Print and PDF generation via window.print
 * @module print-utils
 */

const print_utils = (function() {
  'use strict';

  // ── Private state ──────────────────────────────────────────
  const _state = {};

  // ── Public API ─────────────────────────────────────────────
  return {
    /**
     * Initialize the print-utils module
     */
    init() {
      _state.initialized = true;
    },

    /**
     * Check if module is initialized
     */
    isReady() {
      return _state.initialized === true;
    },
  };
})();

// Auto-init on DOMContentLoaded
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (print_utils.init) print_utils.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = print_utils;
}
