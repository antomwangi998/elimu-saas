// ============================================================
// ElimuSaaS -- Leave-out request form component
// Component: LeaveOutForm
// ============================================================
'use strict';

/**
 * Leave-out request form component
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function LeaveOutForm(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-leaveoutform" data-component="LeaveOutForm">
      <!-- Leave-out request form component -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.LeaveOutForm = LeaveOutForm;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LeaveOutForm;
}
