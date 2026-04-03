// ============================================================
// ElimuSaaS -- Certificate print template component
// Component: CertificateTemplate
// ============================================================
'use strict';

/**
 * Certificate print template component
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function CertificateTemplate(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-certificatetemplate" data-component="CertificateTemplate">
      <!-- Certificate print template component -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.CertificateTemplate = CertificateTemplate;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CertificateTemplate;
}
