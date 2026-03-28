/**
 * UI helpers for Eco-Pulse: toast notifications, loading states,
 * risk gauge, weather rendering, and action cards.
 */

const EcoUI = (() => {

  /* ── Toast Notifications ──────────────────────────── */

  /**
   * Show a toast notification.
   * @param {string} message
   * @param {'info'|'success'|'error'} type
   * @param {number} duration - ms before auto-dismiss
   */
  function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }


  /* ── Loading Overlay ──────────────────────────────── */

  const loadingOverlay = document.getElementById('loading-overlay');
  let releaseFocusTrap = null;

  function showLoading() {
    loadingOverlay?.classList.add('visible');
    // Reset steps
    document.querySelectorAll('#loading-steps li').forEach(li => {
      li.classList.remove('active', 'done');
    });
    // Trap focus in overlay
    if (window.EcoA11y && loadingOverlay) {
      releaseFocusTrap = window.EcoA11y.trapFocus(loadingOverlay);
    }
  }

  function hideLoading() {
    loadingOverlay?.classList.remove('visible');
    if (releaseFocusTrap) {
      releaseFocusTrap();
      releaseFocusTrap = null;
    }
  }

  /**
   * Advance the loading step indicator.
   * @param {string} stepId - e.g., 'step-compress'
   */
  function setLoadingStep(stepId) {
    // Mark all previous steps as done
    const steps = document.querySelectorAll('#loading-steps li');
    let found = false;
    steps.forEach(li => {
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


  /* ── Risk Gauge ───────────────────────────────────── */

  /**
   * Update the risk gauge display.
   * @param {'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'} level
   */
  function updateRiskGauge(level) {
    const circle = document.getElementById('risk-circle');
    const levelEl = document.getElementById('risk-level');
    if (!circle || !levelEl) return;

    const config = {
      LOW:      { color: 'var(--success)', percent: '25%', text: 'LOW' },
      MEDIUM:   { color: 'var(--warning)', percent: '50%', text: 'MEDIUM' },
      HIGH:     { color: 'var(--danger)',  percent: '75%', text: 'HIGH' },
      CRITICAL: { color: 'var(--danger)',  percent: '95%', text: 'CRITICAL' },
    };

    const c = config[level] || config.MEDIUM;
    circle.style.setProperty('--gauge-color', c.color);
    circle.style.setProperty('--gauge-percent', c.percent);
    levelEl.textContent = c.text;
    levelEl.style.color = c.color;
  }


  /* ── Render Actions ───────────────────────────────── */

  /**
   * Render action cards from Gemini function call results.
   * @param {Array} actions
   */
  function renderActions(actions) {
    const container = document.getElementById('actions-container');
    if (!container) return;

    if (!actions || actions.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: var(--text-sm);">No automated actions were needed.</p>';
      return;
    }

    container.innerHTML = '';

    for (const action of actions) {
      const card = document.createElement('div');
      card.className = 'action-card';

      if (action.tool === 'reserve_warehouse_space') {
        card.innerHTML = `
          <div class="action-card__icon" style="background: var(--success-dim);">🏭</div>
          <div class="action-card__content">
            <div class="action-card__title">Warehouse Space Reserved</div>
            <div class="action-card__detail">
              <span class="action-card__badge action-card__badge--success">✅ Confirmed</span><br>
              <strong>Crop:</strong> ${escapeHtml(action.result?.crop_type || 'N/A')}<br>
              <strong>Quantity:</strong> ${action.result?.reserved_capacity_kg || 0} kg<br>
              <strong>ID:</strong> ${escapeHtml(action.result?.confirmation_id || 'N/A')}<br>
              <strong>Valid until:</strong> ${action.result?.valid_until ? new Date(action.result.valid_until).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        `;
      } else if (action.tool === 'send_voice_alert') {
        card.innerHTML = `
          <div class="action-card__icon" style="background: var(--warning-dim);">📞</div>
          <div class="action-card__content">
            <div class="action-card__title">Voice Alert Sent</div>
            <div class="action-card__detail">
              <span class="action-card__badge action-card__badge--warning">${escapeHtml(action.result?.alert_severity || 'INFO')}</span><br>
              <strong>To:</strong> ${escapeHtml(action.result?.phone_number || 'N/A')}<br>
              <strong>Language:</strong> ${escapeHtml(action.result?.language || 'N/A')}<br>
              <strong>Message:</strong> "${escapeHtml(action.result?.message_delivered || 'N/A')}"
            </div>
          </div>
        `;
      }

      container.appendChild(card);
    }
  }


  /* ── Render Weather ───────────────────────────────── */

  const weatherIcons = {
    'clear sky': '☀️',
    'few clouds': '🌤️',
    'scattered clouds': '⛅',
    'broken clouds': '☁️',
    'overcast clouds': '☁️',
    'shower rain': '🌧️',
    'rain': '🌧️',
    'light rain': '🌦️',
    'moderate rain': '🌧️',
    'heavy intensity rain': '⛈️',
    'thunderstorm': '⛈️',
    'snow': '❄️',
    'mist': '🌫️',
    'haze': '🌫️',
  };

  /**
   * Render weather forecast strip.
   * @param {object} weatherData
   */
  function renderWeather(weatherData) {
    const strip = document.getElementById('weather-strip');
    if (!strip) return;

    if (!weatherData || !weatherData.available) {
      strip.innerHTML = '<p style="color: var(--text-muted); font-size: var(--text-sm);">Weather data unavailable</p>';
      return;
    }

    strip.innerHTML = '';
    // Show first 8 intervals (24 hours)
    const items = (weatherData.forecast || []).slice(0, 8);

    for (const f of items) {
      const time = f.datetime ? f.datetime.split(' ')[1]?.slice(0, 5) : '';
      const date = f.datetime ? f.datetime.split(' ')[0]?.slice(5) : '';
      const icon = weatherIcons[f.description] || '🌡️';

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


  /* ── Render Analysis Text ─────────────────────────── */

  /**
   * Render the Gemini analysis text with basic markdown-like formatting.
   * @param {string} text
   */
  function renderAnalysis(text) {
    const container = document.getElementById('analysis-text');
    if (!container) return;

    // Basic formatting: bold (**text**)
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\n/g, '<br>');

    container.innerHTML = formatted;
  }


  /* ── Show/Hide Results ────────────────────────────── */

  function showResults() {
    const section = document.getElementById('results-section');
    if (section) {
      section.classList.add('visible');
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }


  /* ── Upload Previews ──────────────────────────────── */

  /**
   * Render image preview thumbnails.
   * @param {FileList|File[]} files
   * @param {function} onRemove - Called with index when remove button clicked
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


  /* ── Helpers ──────────────────────────────────────── */

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }


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
