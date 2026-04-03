// ============================================================
// ElimuSaaS -- Student profile card component
// Component: StudentCard
// ============================================================
'use strict';

/**
 * Student profile card component
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function StudentCard(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-studentcard" data-component="StudentCard">
      <!-- Student profile card component -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.StudentCard = StudentCard;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StudentCard;
}
