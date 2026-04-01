// ============================================================
// ElimuSaaS -- Discipline incident form component
// Component: DisciplineForm
// ============================================================
'use strict';

/**
 * Discipline incident form component
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function DisciplineForm(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-disciplineform" data-component="DisciplineForm">
      <!-- Discipline incident form component -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.DisciplineForm = DisciplineForm;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DisciplineForm;
}
