import { Router } from 'express';
import { getWeatherForecast } from '../services/weather.js';
import { isValidLatitude, isValidLongitude } from '../utils/validators.js';
import logger from '../services/logger.js';

const router = Router();

/**
 * GET /api/weather?lat=X&lon=Y
 * Proxies weather data from OpenWeatherMap for the frontend widget.
 */
router.get('/', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon query parameters are required' });
    }

    if (!isValidLatitude(lat) || !isValidLongitude(lon)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const forecast = await getWeatherForecast(parseFloat(lat), parseFloat(lon));
    res.json(forecast);
  } catch (error) {
    logger.error('Weather route error', { error: error.message });
    res.status(502).json({ error: 'Failed to fetch weather data' });
  }
});

export default router;
