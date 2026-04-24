// ============================================================
// ElimuSaaS -- Lab equipment card component
// Component: LabItemCard
// ============================================================
'use strict';

/**
 * Lab equipment card component
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function LabItemCard(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-labitemcard" data-component="LabItemCard">
      <!-- Lab equipment card component -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.LabItemCard = LabItemCard;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LabItemCard;
}
