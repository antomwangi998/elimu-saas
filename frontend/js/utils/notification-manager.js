// ============================================================
// ElimuSaaS -- Browser push notification manager
// Module: notification-manager
// ============================================================
'use strict';

/**
 * Browser push notification manager
 * @module notification-manager
 */

const notification_manager = (function() {
  'use strict';

  // ── Private state ──────────────────────────────────────────
  const _state = {};

  // ── Public API ─────────────────────────────────────────────
  return {
    /**
     * Initialize the notification-manager module
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
    if (notification_manager.init) notification_manager.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = notification_manager;
}
