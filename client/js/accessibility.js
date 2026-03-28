/**
 * Accessibility utilities for Eco-Pulse.
 * Manages focus traps, ARIA announcements, and keyboard navigation.
 */

const EcoA11y = (() => {
  const announcer = document.getElementById('aria-announcer');

  /**
   * Announce a message to screen readers via the ARIA live region.
   * @param {string} message
   * @param {'polite'|'assertive'} priority
   */
  function announce(message, priority = 'polite') {
    if (!announcer) return;
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = '';
    // Force reflow so screen readers pick up the change
    void announcer.offsetHeight;
    announcer.textContent = message;
  }

  /**
   * Trap focus within a container (e.g., modal/overlay).
   * Returns a cleanup function to release the trap.
   * @param {HTMLElement} container
   * @returns {() => void} Release function
   */
  function trapFocus(container) {
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handler(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    container.addEventListener('keydown', handler);
    first?.focus();

    return () => container.removeEventListener('keydown', handler);
  }

  /**
   * Make the upload zone keyboard-accessible (Enter/Space to activate).
   */
  function initUploadZoneA11y() {
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('field-images');
    if (!zone || !input) return;

    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        input.click();
      }
    });
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initUploadZoneA11y();
  });

  return { announce, trapFocus };
})();

// Expose globally
window.EcoA11y = EcoA11y;
