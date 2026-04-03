// ============================================================
// ElimuSaaS -- Library book card component
// Component: LibraryBookCard
// ============================================================
'use strict';

/**
 * Library book card component
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function LibraryBookCard(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-librarybookcard" data-component="LibraryBookCard">
      <!-- Library book card component -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.LibraryBookCard = LibraryBookCard;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LibraryBookCard;
}
