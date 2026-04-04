// ============================================================
// ElimuSaaS -- Attendance grid calendar component
// Component: AttendanceGrid
// ============================================================
'use strict';

/**
 * Attendance grid calendar component
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function AttendanceGrid(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-attendancegrid" data-component="AttendanceGrid">
      <!-- Attendance grid calendar component -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.AttendanceGrid = AttendanceGrid;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AttendanceGrid;
}
