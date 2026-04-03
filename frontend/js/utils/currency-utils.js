// ============================================================
// ElimuSaaS -- Currency formatting for KES and other currencies
// Module: currency-utils
// ============================================================
'use strict';

/**
 * Currency formatting for KES and other currencies
 * @module currency-utils
 */

const currency_utils = (function() {
  'use strict';

  // ── Private state ──────────────────────────────────────────
  const _state = {};

  // ── Public API ─────────────────────────────────────────────
  return {
    /**
     * Initialize the currency-utils module
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
    if (currency_utils.init) currency_utils.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = currency_utils;
}
