// ============================================================
// ElimuSaaS -- Alumni profile card component
// Component: AlumniCard
// ============================================================
'use strict';

/**
 * Alumni profile card component
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function AlumniCard(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-alumnicard" data-component="AlumniCard">
      <!-- Alumni profile card component -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.AlumniCard = AlumniCard;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AlumniCard;
}
