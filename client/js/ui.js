/**
 * Eco-Pulse — UI Rendering Module
 * Handles toast notifications, loading states, risk gauge,
 * weather rendering, action cards, and upload previews.
 *
 * @namespace EcoUI
 */

const EcoUI = (() => {
  'use strict';

  const { TOAST, WEATHER_ICONS } = EcoConstants;

  /* ── HTML Sanitization ─────────────────────────────── */

  /**
   * Escape HTML entities to prevent XSS in dynamically rendered content.
   * @param {string} str - Raw string
   * @returns {string} Escaped HTML-safe string
   */
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ── Toast Notifications ───────────────────────────── */

  /**
   * Show a toast notification with auto-dismiss.
   * @param {string} message - Notification text
   * @param {'info'|'success'|'error'} type - Toast severity
   * @param {number} [duration] - Auto-dismiss delay in ms
   */
  function showToast(message, type = TOAST.TYPE_INFO, duration = TOAST.DEFAULT_DURATION_MS) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = `all ${TOAST.FADE_OUT_MS}ms ease-out`;
      setTimeout(() => toast.remove(), TOAST.FADE_OUT_MS);
    }, duration);
  }

  /* ── Loading Overlay ───────────────────────────────── */

  const loadingOverlay = document.getElementById('loading-overlay');
  let releaseFocusTrap = null;

  /** Show the loading overlay and trap focus for accessibility. */
  function showLoading() {
    loadingOverlay?.classList.add('visible');
    // Reset all step indicators
    document.querySelectorAll('#loading-steps li').forEach((li) => {
      li.classList.remove('active', 'done');
    });
    // Trap focus inside the overlay for screen readers
    if (window.EcoA11y && loadingOverlay) {
      releaseFocusTrap = window.EcoA11y.trapFocus(loadingOverlay);
    }
  }

  /** Hide the loading overlay and release focus trap. */
  function hideLoading() {
    loadingOverlay?.classList.remove('visible');
    if (releaseFocusTrap) {
      releaseFocusTrap();
      releaseFocusTrap = null;
    }
  }

  /**
   * Advance the loading step indicator to the given step.
   * Marks all preceding steps as done.
   * @param {string} stepId - DOM id of the target step element
   */
  function setLoadingStep(stepId) {
    const steps = document.querySelectorAll('#loading-steps li');
    let found = false;
    steps.forEach((li) => {
      if (li.id === stepId) {
        li.classList.add('active');
        li.classList.remove('done');
        found = true;
      } else if (!found) {
        li.classList.remove('active');
        li.classList.add('done');
      }
    });
  }

  /* ── Risk Gauge ────────────────────────────────────── */

  /** Risk level visual configuration */
  const RISK_CONFIG = Object.freeze({
    LOW: { color: 'var(--success)', percent: '25%' },
    MEDIUM: { color: 'var(--warning)', percent: '50%' },
    HIGH: { color: 'var(--danger)', percent: '75%' },
    CRITICAL: { color: 'var(--danger)', percent: '95%' },
  });

  /**
   * Update the circular risk gauge display.
   * @param {'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'} level - Risk assessment level
   */
  function updateRiskGauge(level) {
    const circle = document.getElementById('risk-circle');
    const levelEl = document.getElementById('risk-level');
    if (!circle || !levelEl) return;

    const cfg = RISK_CONFIG[level] || RISK_CONFIG.MEDIUM;
    circle.style.setProperty('--gauge-color', cfg.color);
    circle.style.setProperty('--gauge-percent', cfg.percent);
    levelEl.textContent = level;
    levelEl.style.color = cfg.color;
  }

  /* ── Render Actions ────────────────────────────────── */

  /**
   * Render action cards from Gemini function call results.
   * @param {Array<{tool: string, args: object, result: object}>} actions
   */
  function renderActions(actions) {
    const container = document.getElementById('actions-container');
    if (!container) return;

    if (!actions || actions.length === 0) {
      container.innerHTML =
        '<p style="color: var(--text-muted); font-size: var(--text-sm);">No automated actions were needed.</p>';
      return;
    }

    container.innerHTML = '';

    for (const action of actions) {
      const card = document.createElement('div');
      card.className = 'action-card';

      if (action.tool === 'reserve_warehouse_space') {
        card.innerHTML = createWarehouseCard(action.result);
      } else if (action.tool === 'send_voice_alert') {
        card.innerHTML = createVoiceAlertCard(action.result);
      }

      container.appendChild(card);
    }
  }

  /**
   * Generate warehouse reservation card HTML.
   * @param {object} result - Tool call result
   * @returns {string} Sanitized HTML
   */
  function createWarehouseCard(result = {}) {
    const validUntil = result.valid_until
      ? new Date(result.valid_until).toLocaleDateString()
      : 'N/A';

    return `
      <div class="action-card__icon" style="background: var(--success-dim);">🏭</div>
      <div class="action-card__content">
        <div class="action-card__title">Warehouse Space Reserved</div>
        <div class="action-card__detail">
          <span class="action-card__badge action-card__badge--success">✅ Confirmed</span><br>
          <strong>Crop:</strong> ${escapeHtml(result.crop_type || 'N/A')}<br>
          <strong>Quantity:</strong> ${result.reserved_capacity_kg || 0} kg<br>
          <strong>ID:</strong> ${escapeHtml(result.confirmation_id || 'N/A')}<br>
          <strong>Valid until:</strong> ${validUntil}
        </div>
      </div>
    `;
  }

  /**
   * Generate voice alert card HTML.
   * @param {object} result - Tool call result
   * @returns {string} Sanitized HTML
   */
  function createVoiceAlertCard(result = {}) {
    return `
      <div class="action-card__icon" style="background: var(--warning-dim);">📞</div>
      <div class="action-card__content">
        <div class="action-card__title">Voice Alert Sent</div>
        <div class="action-card__detail">
          <span class="action-card__badge action-card__badge--warning">${escapeHtml(result.alert_severity || 'INFO')}</span><br>
          <strong>To:</strong> ${escapeHtml(result.phone_number || 'N/A')}<br>
          <strong>Language:</strong> ${escapeHtml(result.language || 'N/A')}<br>
          <strong>Message:</strong> "${escapeHtml(result.message_delivered || 'N/A')}"
        </div>
      </div>
    `;
  }

  /* ── Render Weather ────────────────────────────────── */

  /**
   * Render the weather forecast horizontal strip.
   * @param {object} weatherData - Weather response with forecast array
   */
  function renderWeather(weatherData) {
    const strip = document.getElementById('weather-strip');
    if (!strip) return;

    if (!weatherData || !weatherData.available) {
      strip.innerHTML =
        '<p style="color: var(--text-muted); font-size: var(--text-sm);">Weather data unavailable</p>';
      return;
    }

    strip.innerHTML = '';
    const items = (weatherData.forecast || []).slice(0, 8);

    for (const f of items) {
      const time = f.datetime ? f.datetime.split(' ')[1]?.slice(0, 5) : '';
      const date = f.datetime ? f.datetime.split(' ')[0]?.slice(5) : '';
      const icon = WEATHER_ICONS[f.description] || '🌡️';

      const item = document.createElement('div');
      item.className = 'weather-item';
      item.innerHTML = `
        <div class="weather-item__time">${escapeHtml(date)}<br>${escapeHtml(time)}</div>
        <div class="weather-item__icon" aria-hidden="true">${icon}</div>
        <div class="weather-item__temp">${Math.round(f.temp)}°</div>
        <div class="weather-item__desc">${escapeHtml(f.description)}</div>
      `;
      strip.appendChild(item);
    }
  }

  /* ── Render Analysis Text ──────────────────────────── */

  /**
   * Render the Gemini analysis text with basic markdown formatting.
   * Safely escapes HTML before applying bold syntax.
   * @param {string} text - Raw analysis text from Gemini
   */
  function renderAnalysis(text) {
    const container = document.getElementById('analysis-text');
    if (!container) return;

    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\n/g, '<br>');

    container.innerHTML = formatted;
  }

  /* ── Show/Hide Results ─────────────────────────────── */

  /** Reveal the results section and scroll it into view. */
  function showResults() {
    const section = document.getElementById('results-section');
    if (section) {
      section.classList.add('visible');
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ── Upload Previews ───────────────────────────────── */

  /**
   * Render image preview thumbnails with remove buttons.
   * Uses URL.createObjectURL for efficient previews and cleans up on load.
   * @param {File[]} files - Selected image files
   * @param {function} onRemove - Callback invoked with file index on removal
   */
  function renderUploadPreviews(files, onRemove) {
    const container = document.getElementById('upload-previews');
    if (!container) return;
    container.innerHTML = '';

    Array.from(files).forEach((file, idx) => {
      const preview = document.createElement('div');
      preview.className = 'upload-preview';

      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = `Preview of ${file.name}`;
      img.onload = () => URL.revokeObjectURL(img.src);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'upload-preview__remove';
      removeBtn.innerHTML = '✕';
      removeBtn.setAttribute('aria-label', `Remove ${file.name}`);
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onRemove(idx);
      });

      preview.appendChild(img);
      preview.appendChild(removeBtn);
      container.appendChild(preview);
    });
  }

  /* ── Public API ────────────────────────────────────── */

  return {
    showToast,
    showLoading,
    hideLoading,
    setLoadingStep,
    updateRiskGauge,
    renderActions,
    renderWeather,
    renderAnalysis,
    showResults,
    renderUploadPreviews,
  };
})();

window.EcoUI = EcoUI;
