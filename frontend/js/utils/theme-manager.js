// ============================================================
// ElimuSaaS -- Theme switching between Obsidian/Pearl/Midnight
// Module: theme-manager
// ============================================================
'use strict';

/**
 * Theme switching between Obsidian/Pearl/Midnight
 * @module theme-manager
 */

const theme_manager = (function() {
  'use strict';

  // ── Private state ──────────────────────────────────────────
  const _state = {};

  // ── Public API ─────────────────────────────────────────────
  return {
    /**
     * Initialize the theme-manager module
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
    if (theme_manager.init) theme_manager.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = theme_manager;
}
