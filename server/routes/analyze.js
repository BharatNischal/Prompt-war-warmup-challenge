import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { validateAnalyzeRequest } from '../utils/validators.js';
import { compressImage } from '../utils/imageProcessor.js';
import { getWeatherForecast, formatWeatherForGemini } from '../services/weather.js';
import { analyzeField } from '../services/gemini.js';

const router = Router();

/**
 * POST /api/analyze
 * Main endpoint: accepts multipart form data with images + metadata,
 * runs Gemini analysis with function calling, returns structured result.
 *
 * Form fields:
 *   - fieldImages (files): Up to 5 images of field/logbook
 *   - latitude, longitude: Location coordinates
 *   - sensorData: Raw sensor readings (text)
 *   - cropInfo: Crop type and additional info
 *   - phone: Farmer phone number (E.164)
 *   - language: Preferred language for voice alerts
 */
router.post('/', upload.array('fieldImages', 5), async (req, res) => {
  try {
    // 1. Validate inputs
    const { valid, errors, data } = validateAnalyzeRequest(req.body);
    if (!valid) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // 2. Process uploaded images
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const compressed = await compressImage(file.buffer);
        images.push(compressed);
      }
    }

    // 3. Fetch weather data if coordinates provided
    let weatherContext = '';
    let weatherData = null;
    if (data.latitude !== undefined && data.longitude !== undefined) {
      try {
        weatherData = await getWeatherForecast(data.latitude, data.longitude);
        weatherContext = formatWeatherForGemini(weatherData);
      } catch (err) {
        console.warn('Weather fetch failed, continuing without:', err.message);
        weatherContext = 'Weather data temporarily unavailable.';
      }
    }

    // 4. Run Gemini analysis with function calling
    const result = await analyzeField({
      images,
      weatherContext,
      sensorData: data.sensorData,
      cropInfo: data.cropInfo,
      phone: data.phone || '',
      language: data.language,
    });

    // 5. Return structured response
    res.json({
      success: true,
      ...result,
      weather: weatherData,
      inputSummary: {
        imagesProcessed: images.length,
        hasLocation: data.latitude !== undefined,
        hasSensorData: !!data.sensorData,
        hasCropInfo: !!data.cropInfo,
      },
    });
  } catch (error) {
    console.error('Analysis error:', error.message);

    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Analysis failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
