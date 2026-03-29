// ============================================================
// ElimuSaaS -- Dynamic table rendering with sorting and pagination
// Module: table-utils
// ============================================================
'use strict';

/**
 * Dynamic table rendering with sorting and pagination
 * @module table-utils
 */

const table_utils = (function() {
  'use strict';

  // ── Private state ──────────────────────────────────────────
  const _state = {};

  // ── Public API ─────────────────────────────────────────────
  return {
    /**
     * Initialize the table-utils module
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
    if (table_utils.init) table_utils.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = table_utils;
}
