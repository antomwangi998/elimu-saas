// ============================================================
// ElimuSaaS -- Global search bar with autocomplete
// Component: SearchBar
// ============================================================
'use strict';

/**
 * Global search bar with autocomplete
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function SearchBar(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-searchbar" data-component="SearchBar">
      <!-- Global search bar with autocomplete -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.SearchBar = SearchBar;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchBar;
}
