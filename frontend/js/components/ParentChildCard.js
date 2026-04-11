// ============================================================
// ElimuSaaS -- Parent child overview card
// Component: ParentChildCard
// ============================================================
'use strict';

/**
 * Parent child overview card
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function ParentChildCard(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-parentchildcard" data-component="ParentChildCard">
      <!-- Parent child overview card -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.ParentChildCard = ParentChildCard;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ParentChildCard;
}
