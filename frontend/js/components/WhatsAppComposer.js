// ============================================================
// ElimuSaaS -- WhatsApp message composer component
// Component: WhatsAppComposer
// ============================================================
'use strict';

/**
 * WhatsApp message composer component
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function WhatsAppComposer(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-whatsappcomposer" data-component="WhatsAppComposer">
      <!-- WhatsApp message composer component -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.WhatsAppComposer = WhatsAppComposer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WhatsAppComposer;
}
