// ============================================================
// ElimuSaaS -- Floating Action Button component
// Component: FAB
// ============================================================
'use strict';

/**
 * Floating Action Button component
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function FAB(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-fab" data-component="FAB">
      <!-- Floating Action Button component -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.FAB = FAB;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FAB;
}
