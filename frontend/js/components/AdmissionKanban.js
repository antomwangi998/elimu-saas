// ============================================================
// ElimuSaaS -- Admission pipeline kanban board
// Component: AdmissionKanban
// ============================================================
'use strict';

/**
 * Admission pipeline kanban board
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function AdmissionKanban(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-admissionkanban" data-component="AdmissionKanban">
      <!-- Admission pipeline kanban board -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.AdmissionKanban = AdmissionKanban;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdmissionKanban;
}
