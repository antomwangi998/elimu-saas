// ============================================================
// ElimuSaaS -- M-Pesa STK push prompt component
// Component: MpesaPrompt
// ============================================================
'use strict';

/**
 * M-Pesa STK push prompt component
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function MpesaPrompt(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-mpesaprompt" data-component="MpesaPrompt">
      <!-- M-Pesa STK push prompt component -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.MpesaPrompt = MpesaPrompt;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MpesaPrompt;
}
