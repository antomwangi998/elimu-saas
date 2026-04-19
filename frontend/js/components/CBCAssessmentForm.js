// ============================================================
// ElimuSaaS -- CBC assessment score entry form
// Component: CBCAssessmentForm
// ============================================================
'use strict';

/**
 * CBC assessment score entry form
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function CBCAssessmentForm(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-cbcassessmentform" data-component="CBCAssessmentForm">
      <!-- CBC assessment score entry form -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.CBCAssessmentForm = CBCAssessmentForm;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CBCAssessmentForm;
}
