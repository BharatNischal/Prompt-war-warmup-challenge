/**
 * Eco-Pulse — Main Application Controller
 * Orchestrates form submission, file handling, and result rendering.
 */

(function () {
  'use strict';

  let selectedFiles = [];
  let voiceBlob = null;
  let mediaRecorder = null;
  let recordingTimer = null;

  // ── DOM References ────────────────────────────────
  const form = document.getElementById('analyze-form');
  const fileInput = document.getElementById('field-images');
  const uploadZone = document.getElementById('upload-zone');
  const analyzeBtn = document.getElementById('analyze-btn');

  // ── File Handling ─────────────────────────────────

  function updateFileList() {
    EcoUI.renderUploadPreviews(selectedFiles, (idx) => {
      selectedFiles.splice(idx, 1);
      updateFileList();
      EcoA11y.announce(`Image removed. ${selectedFiles.length} images selected.`);
    });
  }

  fileInput?.addEventListener('change', () => {
    const newFiles = Array.from(fileInput.files);
    const total = selectedFiles.length + newFiles.length;

    if (total > 5) {
      EcoUI.showToast('Maximum 5 images allowed.', 'error');
      return;
    }

    selectedFiles.push(...newFiles);
    updateFileList();
    EcoA11y.announce(`${newFiles.length} image(s) added. Total: ${selectedFiles.length}`);
  });

  // Drag & drop
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

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    const total = selectedFiles.length + files.length;

    if (total > 5) {
      EcoUI.showToast('Maximum 5 images allowed.', 'error');
      return;
    }

    selectedFiles.push(...files);
    updateFileList();
    EcoA11y.announce(`${files.length} image(s) added via drag and drop.`);
  });

  // ── Voice Recording ──────────────────────────────

  const recordBtn = document.getElementById('record-btn');
  const recordLabel = document.getElementById('record-label');
  const voiceIcon = document.getElementById('voice-icon');
  const voiceTimer = document.getElementById('voice-timer');
  const voicePreview = document.getElementById('voice-preview');

  recordBtn?.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      // Stop recording
      mediaRecorder.stop();
      recordBtn.classList.remove('recording');
      recordLabel.textContent = 'Tap to Record';
      voiceIcon.textContent = '🎤';
      clearInterval(recordingTimer);
      EcoA11y.announce('Recording stopped.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        voiceBlob = new Blob(chunks, { type: 'audio/webm' });
        voicePreview.src = URL.createObjectURL(voiceBlob);
        voicePreview.style.display = 'block';
        stream.getTracks().forEach((t) => t.stop());
        EcoA11y.announce('Voice memo recorded. Preview is available.');
      };

      mediaRecorder.start();
      recordBtn.classList.add('recording');
      recordLabel.textContent = 'Stop Recording';
      voiceIcon.textContent = '⏹️';

      // Timer
      let seconds = 0;
      recordingTimer = setInterval(() => {
        seconds++;
        const min = Math.floor(seconds / 60)
          .toString()
          .padStart(2, '0');
        const sec = (seconds % 60).toString().padStart(2, '0');
        voiceTimer.textContent = `${min}:${sec}`;
      }, 1000);

      EcoA11y.announce('Recording started. Speak your sensor readings or observations.');
    } catch {
      EcoUI.showToast('Microphone access denied. Please allow microphone permissions.', 'error');
    }
  });

  // ── Form Submission ───────────────────────────────

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate: at least one input
    const sensorData = document.getElementById('sensor-data')?.value?.trim();
    const cropInfo = document.getElementById('crop-info')?.value?.trim();

    if (selectedFiles.length === 0 && !sensorData && !cropInfo && !voiceBlob) {
      EcoUI.showToast(
        'Please provide at least one input: images, sensor data, crop info, or voice memo.',
        'error',
      );
      EcoA11y.announce('Form validation failed. Please provide at least one input.', 'assertive');
      return;
    }

    // Build FormData
    const formData = new FormData();

    for (const file of selectedFiles) {
      formData.append('fieldImages', file);
    }

    // Add voice note if recorded
    if (voiceBlob) {
      formData.append('voiceNote', voiceBlob, 'voice-memo.webm');
    }

    const fields = ['latitude', 'longitude', 'cropInfo', 'sensorData', 'phone', 'language'];
    for (const field of fields) {
      const el = document.getElementById(
        field === 'cropInfo' ? 'crop-info' : field === 'sensorData' ? 'sensor-data' : field,
      );
      if (el?.value?.trim()) {
        formData.append(field, el.value.trim());
      }
    }

    // Show loading
    EcoUI.showLoading();
    analyzeBtn.disabled = true;
    EcoA11y.announce('Analysis started. Processing your field data.', 'polite');

    try {
      // Step 1: Compressing
      EcoUI.setLoadingStep('step-compress');
      await delay(400);

      // Step 2: Weather
      EcoUI.setLoadingStep('step-weather');
      await delay(300);

      // Step 3: Gemini
      EcoUI.setLoadingStep('step-gemini');

      const result = await EcoAPI.analyze(formData);

      // Step 4: Actions
      EcoUI.setLoadingStep('step-actions');
      await delay(300);

      // Step 5: Done
      EcoUI.setLoadingStep('step-done');
      await delay(400);

      EcoUI.hideLoading();

      // Render results
      renderResults(result);

      EcoUI.showToast('Analysis complete! Scroll down to see results.', 'success');
      EcoA11y.announce('Analysis complete. Results are now displayed below.', 'assertive');
    } catch (error) {
      EcoUI.hideLoading();
      EcoUI.showToast(`Analysis failed: ${error.message}`, 'error');
      EcoA11y.announce(`Analysis failed: ${error.message}`, 'assertive');
      console.error('Analysis error:', error);
    } finally {
      analyzeBtn.disabled = false;
    }
  });

  // ── Render Results ────────────────────────────────

  function renderResults(result) {
    // Extract risk level from analysis text
    const riskLevel = extractRiskLevel(result.analysis);
    EcoUI.updateRiskGauge(riskLevel);

    // Render analysis text
    EcoUI.renderAnalysis(result.analysis);

    // Render actions
    EcoUI.renderActions(result.actions);

    // Render weather
    if (result.weather) {
      EcoUI.renderWeather(result.weather);
    }

    // Render voice alert audio if available
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

    // Show results section
    EcoUI.showResults();
  }

  /**
   * Extract risk level from Gemini's analysis text.
   * Looks for keywords: CRITICAL, HIGH, MEDIUM, LOW
   */
  function extractRiskLevel(text) {
    if (!text) return 'MEDIUM';
    const upper = text.toUpperCase();
    if (upper.includes('CRITICAL')) return 'CRITICAL';
    if (
      upper.includes('HIGH RISK') ||
      upper.includes('HIGH-RISK') ||
      upper.match(/RISK\s*LEVEL\s*:\s*HIGH/)
    )
      return 'HIGH';
    if (
      upper.includes('LOW RISK') ||
      upper.includes('LOW-RISK') ||
      upper.match(/RISK\s*LEVEL\s*:\s*LOW/)
    )
      return 'LOW';
    return 'MEDIUM';
  }

  // ── Utility ───────────────────────────────────────

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ── Initialize ────────────────────────────────────

  document.addEventListener('DOMContentLoaded', async () => {
    // Health check
    try {
      await EcoAPI.healthCheck();
      document.getElementById('status-text').textContent = 'System Ready';
    } catch {
      document.getElementById('status-text').textContent = 'Server Offline';
      EcoUI.showToast('Could not connect to server. Please try again later.', 'error');
    }
  });
})();
