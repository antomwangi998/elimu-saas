// ============================================================
// ElimuSaaS -- UI utility functions, loading states, modals
// Module: ui-helpers
// ============================================================
'use strict';

/**
 * UI utility functions, loading states, modals
 * @module ui-helpers
 */

const ui_helpers = (function() {
  'use strict';

  // ── Private state ──────────────────────────────────────────
  const _state = {};

  // ── Public API ─────────────────────────────────────────────
  return {
    /**
     * Initialize the ui-helpers module
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
    if (ui_helpers.init) ui_helpers.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ui_helpers;
}
