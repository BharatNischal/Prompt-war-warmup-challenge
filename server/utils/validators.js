/**
 * Validates latitude value
 * @param {number} lat
 * @returns {boolean}
 */
export function isValidLatitude(lat) {
  const num = parseFloat(lat);
  return !isNaN(num) && num >= -90 && num <= 90;
}

/**
 * Validates longitude value
 * @param {number} lon
 * @returns {boolean}
 */
export function isValidLongitude(lon) {
  const num = parseFloat(lon);
  return !isNaN(num) && num >= -180 && num <= 180;
}

/**
 * Sanitizes text input — strips control chars and limits length
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
export function sanitizeText(text, maxLen = 2000) {
  if (typeof text !== 'string') return '';
  // Remove control characters except newline/tab
  return text
    .replace(/[^\P{C}\n\t]/gu, '')
    .trim()
    .slice(0, maxLen);
}

/**
 * Validates phone number format (E.164)
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  return /^\+[1-9]\d{6,14}$/.test(phone.trim());
}

/**
 * Validates and parses the analyze request body
 * @param {object} body
 * @returns {{ valid: boolean, errors: string[], data: object }}
 */
export function validateAnalyzeRequest(body) {
  const errors = [];
  const data = {};

  // Location
  if (body.latitude !== undefined && body.longitude !== undefined) {
    if (!isValidLatitude(body.latitude)) {
      errors.push('Invalid latitude (must be between -90 and 90)');
    }
    if (!isValidLongitude(body.longitude)) {
      errors.push('Invalid longitude (must be between -180 and 180)');
    }
    data.latitude = parseFloat(body.latitude);
    data.longitude = parseFloat(body.longitude);
  }

  // Sensor data (optional free text)
  data.sensorData = sanitizeText(body.sensorData || '', 5000);

  // Crop info (optional)
  data.cropInfo = sanitizeText(body.cropInfo || '', 1000);

  // Phone (optional, for voice alert)
  if (body.phone) {
    if (!isValidPhone(body.phone)) {
      errors.push('Invalid phone number (use E.164 format, e.g., +919876543210)');
    }
    data.phone = body.phone.trim();
  }

  // Language (optional)
  data.language = sanitizeText(body.language || 'English', 50);

  return {
    valid: errors.length === 0,
    errors,
    data,
  };
}
