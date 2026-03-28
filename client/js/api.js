/**
 * API client for communicating with the Eco-Pulse backend.
 */

const EcoAPI = (() => {
  const BASE = ''; // Same origin

  /**
   * Submit field data for analysis.
   * @param {FormData} formData - Multipart form data with images and fields
   * @returns {Promise<object>} Analysis result
   */
  async function analyze(formData) {
    const response = await fetch(`${BASE}/api/analyze`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type — browser sets it with boundary for multipart
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || err.details || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch weather forecast for coordinates.
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<object>}
   */
  async function getWeather(lat, lon) {
    const response = await fetch(`${BASE}/api/weather?lat=${lat}&lon=${lon}`);

    if (!response.ok) {
      throw new Error('Failed to fetch weather');
    }

    return response.json();
  }

  /**
   * Health check.
   * @returns {Promise<object>}
   */
  async function healthCheck() {
    const response = await fetch(`${BASE}/api/health`);
    return response.json();
  }

  return { analyze, getWeather, healthCheck };
})();

window.EcoAPI = EcoAPI;
