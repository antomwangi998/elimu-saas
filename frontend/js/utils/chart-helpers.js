// ============================================================
// ElimuSaaS -- Chart.js wrapper with ElimuSaaS theme
// Module: chart-helpers
// ============================================================
'use strict';

/**
 * Chart.js wrapper with ElimuSaaS theme
 * @module chart-helpers
 */

const chart_helpers = (function() {
  'use strict';

  // ── Private state ──────────────────────────────────────────
  const _state = {};

  // ── Public API ─────────────────────────────────────────────
  return {
    /**
     * Initialize the chart-helpers module
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
    if (chart_helpers.init) chart_helpers.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = chart_helpers;
}
