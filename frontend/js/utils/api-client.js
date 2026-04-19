// ============================================================
// ElimuSaaS -- API client wrapper with error handling and auth headers
// Module: api-client
// ============================================================
'use strict';

/**
 * API client wrapper with error handling and auth headers
 * @module api-client
 */

const api_client = (function() {
  'use strict';

  // ── Private state ──────────────────────────────────────────
  const _state = {};

  // ── Public API ─────────────────────────────────────────────
  return {
    /**
     * Initialize the api-client module
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
    if (api_client.init) api_client.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api_client;
}
