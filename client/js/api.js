/**
 * Eco-Pulse — API Client
 * Handles all communication with the backend REST API.
 * Uses EcoConstants for endpoint URLs and error handling.
 *
 * @namespace EcoAPI
 */

const EcoAPI = (() => {
  'use strict';

  const { API } = EcoConstants;

  /**
   * Submit field data for multimodal AI analysis.
   * @param {FormData} formData - Multipart form data with images, audio, and metadata
   * @returns {Promise<object>} Structured analysis result
   * @throws {Error} On HTTP error or network failure
   */
  async function analyze(formData) {
    const response = await fetch(API.ANALYZE, {
      method: 'POST',
      body: formData,
      // Content-Type header deliberately omitted — browser sets multipart boundary automatically
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || err.details || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch weather forecast for geographic coordinates.
   * @param {number} lat - Latitude (-90 to 90)
   * @param {number} lon - Longitude (-180 to 180)
   * @returns {Promise<object>} Weather forecast data
   * @throws {Error} On HTTP error
   */
  async function getWeather(lat, lon) {
    const response = await fetch(`${API.WEATHER}?lat=${lat}&lon=${lon}`);

    if (!response.ok) {
      throw new Error('Failed to fetch weather');
    }

    return response.json();
  }

  /**
   * Server health check — verifies backend connectivity.
   * @returns {Promise<object>} Health status with timestamp
   */
  async function healthCheck() {
    const response = await fetch(API.HEALTH);
    return response.json();
  }

  /**
   * Retrieve analysis history from Firestore.
   * @param {object} [options]
   * @param {number} [options.limit=10] - Max results to return
   * @returns {Promise<object>} Array of past analyses
   */
  async function getHistory({ limit = 10 } = {}) {
    const response = await fetch(`${API.HISTORY}?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch history');
    }
    return response.json();
  }

  return { analyze, getWeather, healthCheck, getHistory };
})();

window.EcoAPI = EcoAPI;
