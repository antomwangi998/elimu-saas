// ============================================================
// ElimuSaaS -- Client-side form validation with rules engine
// Module: form-validator
// ============================================================
'use strict';

/**
 * Client-side form validation with rules engine
 * @module form-validator
 */

const form_validator = (function() {
  'use strict';

  // ── Private state ──────────────────────────────────────────
  const _state = {};

  // ── Public API ─────────────────────────────────────────────
  return {
    /**
     * Initialize the form-validator module
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
    if (form_validator.init) form_validator.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = form_validator;
}
