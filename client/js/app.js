/**
 * Eco-Pulse — Main Application Controller
 * Orchestrates form submission, file handling, voice recording,
 * and result rendering. Uses EcoConstants for all configuration.
 *
 * @module app
 */

(function () {
  'use strict';

  const { UPLOAD, STEPS, TIMING, RISK, FORM_FIELDS, MESSAGES } = EcoConstants;

  /* ── Application State ─────────────────────────────── */

  /** @type {File[]} Currently selected image files */
  let selectedFiles = [];
  /** @type {Blob|null} Recorded voice memo blob */
  let voiceBlob = null;
  /** @type {MediaRecorder|null} Active media recorder instance */
  let mediaRecorder = null;
  /** @type {number|null} Recording timer interval ID */
  let recordingTimer = null;

  /* ── DOM References ────────────────────────────────── */

  const form = document.getElementById('analyze-form');
  const fileInput = document.getElementById('field-images');
  const uploadZone = document.getElementById('upload-zone');
  const analyzeBtn = document.getElementById('analyze-btn');

  /* ─────────────────────────────────────────────────── */
  /*  FILE HANDLING                                      */
  /* ─────────────────────────────────────────────────── */

  /** Re-render upload previews after file list changes. */
  function updateFileList() {
    EcoUI.renderUploadPreviews(selectedFiles, (idx) => {
      selectedFiles.splice(idx, 1);
      updateFileList();
      EcoA11y.announce(`Image removed. ${selectedFiles.length} images selected.`);
    });
  }

  /**
   * Validate and add files to the selectedFiles array.
   * Enforces the MAX_IMAGES limit from constants.
   * @param {File[]} newFiles - Files to add
   * @param {string} source - Source description for a11y announcement
   * @returns {boolean} Whether files were accepted
   */
  function addFiles(newFiles, source = 'selection') {
    const total = selectedFiles.length + newFiles.length;

    if (total > UPLOAD.MAX_IMAGES) {
      EcoUI.showToast(MESSAGES.MAX_IMAGES, 'error');
      return false;
    }

    selectedFiles.push(...newFiles);
    updateFileList();
    EcoA11y.announce(
      `${newFiles.length} image(s) added via ${source}. Total: ${selectedFiles.length}`,
    );
    return true;
  }

  fileInput?.addEventListener('change', () => {
    addFiles(Array.from(fileInput.files), 'file picker');
  });

  /* ── Drag & Drop ───────────────────────────────────── */

  uploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('upload-zone--active');
  });

  uploadZone?.addEventListener('dragleave', () => {
    uploadZone.classList.remove('upload-zone--active');
  });

  uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('upload-zone--active');

    const imageFiles = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    addFiles(imageFiles, 'drag and drop');
  });

  /* ─────────────────────────────────────────────────── */
  /*  VOICE RECORDING                                    */
  /* ─────────────────────────────────────────────────── */

  const recordBtn = document.getElementById('record-btn');
  const recordLabel = document.getElementById('record-label');
  const voiceIcon = document.getElementById('voice-icon');
  const voiceTimer = document.getElementById('voice-timer');
  const voicePreview = document.getElementById('voice-preview');

  /**
   * Format seconds into MM:SS display string.
   * @param {number} totalSeconds
   * @returns {string}
   */
  function formatTime(totalSeconds) {
    const min = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const sec = (totalSeconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  /** Stop an active recording session. */
  function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
    mediaRecorder.stop();
    recordBtn.classList.remove('recording');
    recordLabel.textContent = 'Tap to Record';
    voiceIcon.textContent = '🎤';
    clearInterval(recordingTimer);
    EcoA11y.announce(MESSAGES.RECORDING_STOP);
  }

  /** Start a new voice recording session. */
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];

      mediaRecorder = new MediaRecorder(stream, { mimeType: UPLOAD.AUDIO_MIME });

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        voiceBlob = new Blob(chunks, { type: UPLOAD.AUDIO_MIME });
        voicePreview.src = URL.createObjectURL(voiceBlob);
        voicePreview.style.display = 'block';
        stream.getTracks().forEach((t) => t.stop());
        EcoA11y.announce(MESSAGES.VOICE_RECORDED);
      };

      mediaRecorder.start();
      recordBtn.classList.add('recording');
      recordLabel.textContent = 'Stop Recording';
      voiceIcon.textContent = '⏹️';

      // Timer display
      let seconds = 0;
      recordingTimer = setInterval(() => {
        seconds++;
        voiceTimer.textContent = formatTime(seconds);
      }, 1000);

      EcoA11y.announce(MESSAGES.RECORDING_START);
    } catch {
      EcoUI.showToast(MESSAGES.MIC_DENIED, 'error');
    }
  }

  recordBtn?.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      stopRecording();
    } else {
      startRecording();
    }
  });

  /* ─────────────────────────────────────────────────── */
  /*  FORM SUBMISSION                                    */
  /* ─────────────────────────────────────────────────── */

  /**
   * Validate form — at least one input must be provided.
   * @returns {boolean}
   */
  function validateForm() {
    const sensorData = document.getElementById('sensor-data')?.value?.trim();
    const cropInfo = document.getElementById('crop-info')?.value?.trim();

    if (selectedFiles.length === 0 && !sensorData && !cropInfo && !voiceBlob) {
      EcoUI.showToast(MESSAGES.VALIDATION_EMPTY, 'error');
      EcoA11y.announce('Form validation failed. Please provide at least one input.', 'assertive');
      return false;
    }
    return true;
  }

  /**
   * Build FormData from form state for multipart submission.
   * @returns {FormData}
   */
  function buildFormData() {
    const formData = new FormData();

    for (const file of selectedFiles) {
      formData.append('fieldImages', file);
    }

    if (voiceBlob) {
      formData.append('voiceNote', voiceBlob, UPLOAD.VOICE_FILENAME);
    }

    // Append text fields using the field mapping from constants
    const fieldNames = Object.keys(FORM_FIELDS);
    for (const field of fieldNames) {
      const elId = FORM_FIELDS[field];
      const el = document.getElementById(elId);
      if (el?.value?.trim()) {
        formData.append(field, el.value.trim());
      }
    }

    return formData;
  }

  /**
   * Animate through loading steps with configurable delays.
   * @param {function} apiCall - Async function that performs the actual API request
   * @returns {Promise<object>} API response
   */
  async function runAnalysisWithSteps(apiCall) {
    EcoUI.setLoadingStep(STEPS.COMPRESS);
    await delay(TIMING.COMPRESS_DELAY_MS);

    EcoUI.setLoadingStep(STEPS.WEATHER);
    await delay(TIMING.STEP_DELAY_MS);

    EcoUI.setLoadingStep(STEPS.GEMINI);
    const result = await apiCall();

    EcoUI.setLoadingStep(STEPS.ACTIONS);
    await delay(TIMING.STEP_DELAY_MS);

    EcoUI.setLoadingStep(STEPS.DONE);
    await delay(TIMING.DONE_DELAY_MS);

    return result;
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const formData = buildFormData();

    EcoUI.showLoading();
    analyzeBtn.disabled = true;
    EcoA11y.announce(MESSAGES.ANALYSIS_STARTED, 'polite');

    try {
      const result = await runAnalysisWithSteps(() => EcoAPI.analyze(formData));

      EcoUI.hideLoading();
      renderResults(result);

      EcoUI.showToast(MESSAGES.ANALYSIS_COMPLETE, 'success');
      EcoA11y.announce(MESSAGES.ANALYSIS_COMPLETE_A11Y, 'assertive');
    } catch (error) {
      EcoUI.hideLoading();
      EcoUI.showToast(`Analysis failed: ${error.message}`, 'error');
      EcoA11y.announce(`Analysis failed: ${error.message}`, 'assertive');
      console.error('Analysis error:', error);
    } finally {
      analyzeBtn.disabled = false;
    }
  });

  /* ─────────────────────────────────────────────────── */
  /*  RESULT RENDERING                                   */
  /* ─────────────────────────────────────────────────── */

  /**
   * Render all result components from the analysis response.
   * @param {object} result - API response with analysis, actions, weather
   */
  function renderResults(result) {
    EcoUI.updateRiskGauge(extractRiskLevel(result.analysis));
    EcoUI.renderAnalysis(result.analysis);
    EcoUI.renderActions(result.actions);

    if (result.weather) {
      EcoUI.renderWeather(result.weather);
    }

    // Voice alert audio if a TTS action was triggered
    const audioContainer = document.getElementById('audio-alert-container');
    const alertAudio = document.getElementById('alert-audio');
    if (result.actions) {
      const voiceAction = result.actions.find(
        (a) => a.tool === 'send_voice_alert' && a.result?.audio_url,
      );
      if (voiceAction && audioContainer && alertAudio) {
        alertAudio.src = voiceAction.result.audio_url;
        audioContainer.style.display = 'block';
      }
    }

    EcoUI.showResults();
  }

  /**
   * Extract risk level from Gemini's analysis text via keyword matching.
   * @param {string} text - Raw analysis text
   * @returns {'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'}
   */
  function extractRiskLevel(text) {
    if (!text) return RISK.MEDIUM;
    const upper = text.toUpperCase();
    if (upper.includes('CRITICAL')) return RISK.CRITICAL;
    if (
      upper.includes('HIGH RISK') ||
      upper.includes('HIGH-RISK') ||
      upper.match(/RISK\s*LEVEL\s*:\s*HIGH/)
    )
      return RISK.HIGH;
    if (
      upper.includes('LOW RISK') ||
      upper.includes('LOW-RISK') ||
      upper.match(/RISK\s*LEVEL\s*:\s*LOW/)
    )
      return RISK.LOW;
    return RISK.MEDIUM;
  }

  /* ─────────────────────────────────────────────────── */
  /*  UTILITIES                                          */
  /* ─────────────────────────────────────────────────── */

  /**
   * Promise-based delay utility.
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /* ─────────────────────────────────────────────────── */
  /*  INITIALIZATION                                     */
  /* ─────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await EcoAPI.healthCheck();
      document.getElementById('status-text').textContent = MESSAGES.SYSTEM_READY;
    } catch {
      document.getElementById('status-text').textContent = MESSAGES.SERVER_OFFLINE;
      EcoUI.showToast(MESSAGES.SERVER_ERROR, 'error');
    }
  });
})();
