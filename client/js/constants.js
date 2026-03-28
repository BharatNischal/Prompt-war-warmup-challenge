/**
 * Eco-Pulse — Frontend Constants
 * Centralized configuration for the client-side application.
 *
 * @namespace EcoConstants
 */

const EcoConstants = Object.freeze({
  /* ── Application ───────────────────────────────── */
  APP_NAME: 'Eco-Pulse',
  APP_TAGLINE: 'Hyper-Local Climate Resilience',

  /* ── API Endpoints ─────────────────────────────── */
  API: Object.freeze({
    ANALYZE: '/api/analyze',
    WEATHER: '/api/weather',
    HEALTH: '/api/health',
    HISTORY: '/api/history',
  }),

  /* ── Upload Limits ─────────────────────────────── */
  UPLOAD: Object.freeze({
    MAX_IMAGES: 5,
    MAX_FILE_SIZE_MB: 5,
    ACCEPTED_IMAGE_TYPES: 'image/jpeg,image/png,image/webp,image/heic',
    ACCEPTED_AUDIO_TYPES: 'audio/webm,audio/ogg,audio/wav,audio/mp3,audio/mpeg',
    AUDIO_MIME: 'audio/webm',
    VOICE_FILENAME: 'voice-memo.webm',
  }),

  /* ── Risk Levels ───────────────────────────────── */
  RISK: Object.freeze({
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL',
  }),

  /* ── Toast Configuration ───────────────────────── */
  TOAST: Object.freeze({
    DEFAULT_DURATION_MS: 5000,
    FADE_OUT_MS: 300,
    TYPE_INFO: 'info',
    TYPE_SUCCESS: 'success',
    TYPE_ERROR: 'error',
  }),

  /* ── Loading Step IDs ──────────────────────────── */
  STEPS: Object.freeze({
    COMPRESS: 'step-compress',
    WEATHER: 'step-weather',
    GEMINI: 'step-gemini',
    ACTIONS: 'step-actions',
    DONE: 'step-done',
  }),

  /* ── UI Timing ─────────────────────────────────── */
  TIMING: Object.freeze({
    STEP_DELAY_MS: 300,
    COMPRESS_DELAY_MS: 400,
    DONE_DELAY_MS: 400,
  }),

  /* ── Weather Icons ─────────────────────────────── */
  WEATHER_ICONS: Object.freeze({
    'clear sky': '☀️',
    'few clouds': '🌤️',
    'scattered clouds': '⛅',
    'broken clouds': '☁️',
    'overcast clouds': '☁️',
    'shower rain': '🌧️',
    rain: '🌧️',
    'light rain': '🌦️',
    'moderate rain': '🌧️',
    'heavy intensity rain': '⛈️',
    thunderstorm: '⛈️',
    snow: '❄️',
    mist: '🌫️',
    haze: '🌫️',
  }),

  /* ── Form Field Mappings ───────────────────────── */
  FORM_FIELDS: Object.freeze({
    cropInfo: 'crop-info',
    sensorData: 'sensor-data',
    latitude: 'latitude',
    longitude: 'longitude',
    phone: 'phone',
    language: 'language',
  }),

  /* ── Status Messages ───────────────────────────── */
  MESSAGES: Object.freeze({
    SYSTEM_READY: 'System Ready',
    SERVER_OFFLINE: 'Server Offline',
    ANALYSIS_STARTED: 'Analysis started. Processing your field data.',
    ANALYSIS_COMPLETE: 'Analysis complete! Scroll down to see results.',
    ANALYSIS_COMPLETE_A11Y: 'Analysis complete. Results are now displayed below.',
    VALIDATION_EMPTY:
      'Please provide at least one input: images, sensor data, crop info, or voice memo.',
    MAX_IMAGES: 'Maximum 5 images allowed.',
    MIC_DENIED: 'Microphone access denied. Please allow microphone permissions.',
    RECORDING_START: 'Recording started. Speak your sensor readings or observations.',
    RECORDING_STOP: 'Recording stopped.',
    VOICE_RECORDED: 'Voice memo recorded. Preview is available.',
    SERVER_ERROR: 'Could not connect to server. Please try again later.',
  }),
});

window.EcoConstants = EcoConstants;
