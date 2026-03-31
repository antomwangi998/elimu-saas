// ============================================================
// ElimuSaaS -- Barcode and QR code scanner utilities
// Module: barcode-scanner
// ============================================================
'use strict';

/**
 * Barcode and QR code scanner utilities
 * @module barcode-scanner
 */

const barcode_scanner = (function() {
  'use strict';

  // ── Private state ──────────────────────────────────────────
  const _state = {};

  // ── Public API ─────────────────────────────────────────────
  return {
    /**
     * Initialize the barcode-scanner module
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
    if (barcode_scanner.init) barcode_scanner.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = barcode_scanner;
}
