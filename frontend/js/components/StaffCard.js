// ============================================================
// ElimuSaaS -- Staff profile card component
// Component: StaffCard
// ============================================================
'use strict';

/**
 * Staff profile card component
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function StaffCard(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-staffcard" data-component="StaffCard">
      <!-- Staff profile card component -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.StaffCard = StaffCard;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StaffCard;
}
