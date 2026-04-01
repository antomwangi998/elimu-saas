// ============================================================
// ElimuSaaS -- LocalStorage and SessionStorage helpers
// Module: storage-utils
// ============================================================
'use strict';

/**
 * LocalStorage and SessionStorage helpers
 * @module storage-utils
 */

const storage_utils = (function() {
  'use strict';

  // ── Private state ──────────────────────────────────────────
  const _state = {};

  // ── Public API ─────────────────────────────────────────────
  return {
    /**
     * Initialize the storage-utils module
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
    if (storage_utils.init) storage_utils.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = storage_utils;
}
