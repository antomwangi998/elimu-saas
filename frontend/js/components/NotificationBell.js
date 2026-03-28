// ============================================================
// ElimuSaaS -- Notification bell with dropdown
// Component: NotificationBell
// ============================================================
'use strict';

/**
 * Notification bell with dropdown
 * 
 * @param {Object} props - Component properties
 * @returns {string} HTML string
 */
function NotificationBell(props = {}) {
  const { data = {}, onAction = null } = props;

  return `
    <div class="component-notificationbell" data-component="NotificationBell">
      <!-- Notification bell with dropdown -->
      <div class="component-body">
        ${data.content || ''}
      </div>
    </div>
  `;
}

// Register component
if (typeof window !== 'undefined') {
  window.Components = window.Components || {};
  window.Components.NotificationBell = NotificationBell;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationBell;
}
