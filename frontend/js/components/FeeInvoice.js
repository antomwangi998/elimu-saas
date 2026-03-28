// ============================================================
// ElimuSaaS -- Fee invoice display component
// Component: FeeInvoice
// ============================================================
'use strict';

/**
 * Fee invoice display component
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function FeeInvoice(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-feeinvoice" data-component="FeeInvoice">
      <!-- Fee invoice display component -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.FeeInvoice = FeeInvoice;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeeInvoice;
}
