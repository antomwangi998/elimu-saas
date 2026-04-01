// ============================================================
// ElimuSaaS -- Modal dialog management and stacking
// Module: modal-manager
// ============================================================
'use strict';

/**
 * Modal dialog management and stacking
 * @module modal-manager
 */

const modal_manager = (function() {
  'use strict';

  // ── Private state ──────────────────────────────────────────
  const _state = {};

  // ── Public API ─────────────────────────────────────────────
  return {
    /**
     * Initialize the modal-manager module
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
    if (modal_manager.init) modal_manager.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = modal_manager;
}
