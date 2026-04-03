// ============================================================
// ElimuSaaS -- Printable payslip component
// Component: PayslipPrint
// ============================================================
'use strict';

/**
 * Printable payslip component
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function PayslipPrint(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-payslipprint" data-component="PayslipPrint">
      <!-- Printable payslip component -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.PayslipPrint = PayslipPrint;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PayslipPrint;
}
