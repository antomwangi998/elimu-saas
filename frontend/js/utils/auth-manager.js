// ============================================================
// ElimuSaaS -- Authentication state management and token refresh
// Module: auth-manager
// ============================================================
'use strict';

/**
 * Authentication state management and token refresh
 * @module auth-manager
 */

const auth_manager = (function() {
  'use strict';

  // ── Private state ──────────────────────────────────────────
  const _state = {};

  // ── Public API ─────────────────────────────────────────────
  return {
    /**
     * Initialize the auth-manager module
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
    if (auth_manager.init) auth_manager.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = auth_manager;
}
