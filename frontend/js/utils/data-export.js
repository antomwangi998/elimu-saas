// ============================================================
// ElimuSaaS -- Export data to CSV, Excel and PDF formats
// Module: data-export
// ============================================================
'use strict';

/**
 * Export data to CSV, Excel and PDF formats
 * @module data-export
 */

const data_export = (function() {
  'use strict';

  // ── Private state ──────────────────────────────────────────
  const _state = {};

  // ── Public API ─────────────────────────────────────────────
  return {
    /**
     * Initialize the data-export module
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
    if (data_export.init) data_export.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = data_export;
}
