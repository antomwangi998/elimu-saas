// ============================================================
// ElimuSaaS -- Student behaviour ratings table
// Component: BehaviourTable
// ============================================================
'use strict';

/**
 * Student behaviour ratings table
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function BehaviourTable(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-behaviourtable" data-component="BehaviourTable">
      <!-- Student behaviour ratings table -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.BehaviourTable = BehaviourTable;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BehaviourTable;
}
