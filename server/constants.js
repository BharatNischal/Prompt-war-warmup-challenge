/**
 * Centralized constants for Eco-Pulse backend.
 * All magic numbers, strings, and configuration values in one place.
 *
 * @module constants
 */

/* ── HTTP Status Codes ───────────────────────────── */
export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
});

/* ── Application Metadata ────────────────────────── */
export const APP = Object.freeze({
  NAME: 'eco-pulse',
  VERSION: '2.0.0',
  DESCRIPTION: 'Gemini-powered hyper-local climate resilience engine',
});

/* ── Supported Languages (BCP-47 codes for India) ── */
export const LANGUAGE_MAP = Object.freeze({
  English: { code: 'en-IN', ttsVoice: 'en-IN-Wavenet-B', gender: 'MALE' },
  Hindi: { code: 'hi-IN', ttsVoice: 'hi-IN-Wavenet-A', gender: 'FEMALE' },
  Tamil: { code: 'ta-IN', ttsVoice: 'ta-IN-Wavenet-A', gender: 'FEMALE' },
  Telugu: { code: 'te-IN', ttsVoice: 'te-IN-Standard-A', gender: 'FEMALE' },
  Bengali: { code: 'bn-IN', ttsVoice: 'bn-IN-Wavenet-A', gender: 'FEMALE' },
  Marathi: { code: 'mr-IN', ttsVoice: 'mr-IN-Wavenet-A', gender: 'FEMALE' },
  Kannada: { code: 'kn-IN', ttsVoice: 'kn-IN-Wavenet-A', gender: 'FEMALE' },
  Punjabi: { code: 'pa-IN', ttsVoice: 'pa-IN-Wavenet-A', gender: 'FEMALE' },
});

/* ── File Upload Constraints ─────────────────────── */
export const UPLOAD = Object.freeze({
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  MAX_IMAGE_COUNT: 5,
  MAX_VOICE_COUNT: 1,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  ALLOWED_AUDIO_TYPES: [
    'audio/webm',
    'audio/ogg',
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/mp4',
    'audio/x-m4a',
  ],
});

/* ── Image Processing Defaults ───────────────────── */
export const IMAGE = Object.freeze({
  MAX_WIDTH_PX: 1024,
  JPEG_QUALITY: 80,
  OUTPUT_MIME: 'image/jpeg',
});

/* ── TTS Audio Configuration ─────────────────────── */
export const TTS = Object.freeze({
  AUDIO_ENCODING: 'MP3',
  SPEAKING_RATE: 0.9,
  PITCH: 0,
  EFFECTS_PROFILE: 'telephony-class-application',
  DEFAULT_LANGUAGE: 'English',
});

/* ── Speech-to-Text Configuration ────────────────── */
export const STT = Object.freeze({
  ENCODING: 'WEBM_OPUS',
  SAMPLE_RATE_HZ: 48000,
  MODEL: 'latest_long',
  AGRICULTURAL_HINTS: [
    'soil moisture',
    'humidity',
    'temperature',
    'rainfall',
    'rice',
    'wheat',
    'cotton',
    'sugarcane',
    'harvest',
    'cyclone',
    'flood',
    'drought',
    'irrigation',
    'fertilizer',
    'pesticide',
    'yield',
    'acres',
  ],
});

/* ── Cloud Storage Paths ─────────────────────────── */
export const STORAGE_PATHS = Object.freeze({
  IMAGES: 'images',
  AUDIO: 'audio',
  SIGNED_URL_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
});

/* ── Firestore ───────────────────────────────────── */
export const FIRESTORE = Object.freeze({
  COLLECTION: 'analyses',
  TTL_DAYS: 30,
  DEFAULT_HISTORY_LIMIT: 10,
  MAX_HISTORY_LIMIT: 50,
  MIN_ID_LENGTH: 5,
});

/* ── Gemini AI ───────────────────────────────────── */
export const GEMINI = Object.freeze({
  MODEL: 'gemini-2.5-flash',
  TEMPERATURE: 0.4,
  MAX_OUTPUT_TOKENS: 4096,
});

/* ── Rate Limiting ───────────────────────────────── */
export const RATE_LIMIT = Object.freeze({
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
});

/* ── Error Messages ──────────────────────────────── */
export const ERROR_MESSAGES = Object.freeze({
  VALIDATION_FAILED: 'Validation failed',
  ANALYSIS_FAILED: 'Analysis failed. Please try again.',
  HISTORY_FAILED: 'Failed to retrieve history',
  WEATHER_FAILED: 'Failed to fetch weather data',
  INVALID_FILE_TYPE: 'Invalid file type',
  TOO_MANY_REQUESTS: 'Too many requests, please try again later.',
  COORDS_REQUIRED: 'lat and lon query parameters are required',
  INVALID_COORDS: 'Invalid coordinates',
  INVALID_ANALYSIS_ID: 'Invalid analysis ID',
  NOT_FOUND: 'Resource not found',
});

/* ── Urgency Levels ──────────────────────────────── */
export const URGENCY_LEVELS = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

/* ── Alert Severities ────────────────────────────── */
export const ALERT_SEVERITY = Object.freeze({
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
});

/* ── Warehouse Mock Data ─────────────────────────── */
export const WAREHOUSE = Object.freeze({
  NAME: 'District Agricultural Cooperative #47',
  LOCATION: 'Nearest available storage facility',
  COST_PER_KG_INR: 0.5,
  RESERVATION_HOURS: 72,
});
