import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { validateAnalyzeRequest } from '../utils/validators.js';
import { compressImage } from '../utils/imageProcessor.js';
import { getWeatherForecast, formatWeatherForGemini } from '../services/weather.js';
import { analyzeField } from '../services/gemini.js';
import { uploadFieldImage } from '../services/storage.js';
import { saveAnalysis } from '../services/firestore.js';
import { transcribeAudio } from '../services/speech.js';
import logger from '../services/logger.js';

const router = Router();

/**
 * POST /api/analyze
 * Main endpoint: accepts multipart form data with images + metadata,
 * runs Gemini analysis with function calling, returns structured result.
 *
 * Form fields:
 *   - fieldImages (files): Up to 5 images of field/logbook
 *   - voiceNote (file): Optional audio recording (voice memo)
 *   - latitude, longitude: Location coordinates
 *   - sensorData: Raw sensor readings (text)
 *   - cropInfo: Crop type and additional info
 *   - phone: Farmer phone number (E.164)
 *   - language: Preferred language for voice alerts
 */
router.post(
  '/',
  upload.fields([
    { name: 'fieldImages', maxCount: 5 },
    { name: 'voiceNote', maxCount: 1 },
  ]),
  async (req, res) => {
    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const requestId = req.headers['x-request-id'] || analysisId;

    try {
      logger.info(
        'Analysis request received',
        {
          analysisId,
          hasImages: !!req.files?.fieldImages?.length,
          hasVoice: !!req.files?.voiceNote?.length,
        },
        requestId,
      );

      // 1. Validate inputs
      const { valid, errors, data } = validateAnalyzeRequest(req.body);
      if (!valid) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }

      // 2. Process uploaded images
      const images = [];
      if (req.files?.fieldImages && req.files.fieldImages.length > 0) {
        for (let i = 0; i < req.files.fieldImages.length; i++) {
          const file = req.files.fieldImages[i];
          const compressed = await compressImage(file.buffer);
          images.push(compressed);

          // Upload to Cloud Storage (non-blocking)
          uploadFieldImage(compressed.buffer, analysisId, i).catch((err) => {
            logger.warn(
              'Image upload to GCS failed (non-critical)',
              { error: err.message },
              requestId,
            );
          });
        }
      }

      // 3. Transcribe voice note if provided (Cloud Speech-to-Text)
      let voiceTranscript = '';
      if (req.files?.voiceNote && req.files.voiceNote.length > 0) {
        const audioBuffer = req.files.voiceNote[0].buffer;
        const result = await transcribeAudio(audioBuffer, data.language);
        voiceTranscript = result.transcript || '';
        logger.info(
          'Voice note transcribed',
          {
            language: data.language,
            transcriptLength: voiceTranscript.length,
            confidence: result.confidence,
          },
          requestId,
        );
      }

      // 4. Combine sensor data with voice transcript
      let combinedSensorData = data.sensorData || '';
      if (voiceTranscript) {
        combinedSensorData += `\n\n[VOICE MEMO TRANSCRIPT]:\n${voiceTranscript}`;
      }

      // 5. Fetch weather data if coordinates provided
      let weatherContext = '';
      let weatherData = null;
      if (data.latitude !== undefined && data.longitude !== undefined) {
        try {
          weatherData = await getWeatherForecast(data.latitude, data.longitude);
          weatherContext = formatWeatherForGemini(weatherData);
        } catch (err) {
          logger.warn(
            'Weather fetch failed, continuing without',
            { error: err.message },
            requestId,
          );
          weatherContext = 'Weather data temporarily unavailable.';
        }
      }

      // 6. Run Gemini analysis with function calling
      const result = await analyzeField({
        images,
        weatherContext,
        sensorData: combinedSensorData,
        cropInfo: data.cropInfo,
        phone: data.phone || '',
        language: data.language,
        analysisId,
      });

      // 7. Build response
      const response = {
        success: true,
        analysisId,
        ...result,
        weather: weatherData,
        voiceTranscript: voiceTranscript || undefined,
        inputSummary: {
          imagesProcessed: images.length,
          hasLocation: data.latitude !== undefined,
          hasSensorData: !!data.sensorData,
          hasCropInfo: !!data.cropInfo,
          hasVoiceNote: !!voiceTranscript,
        },
      };

      // 8. Save to Firestore (non-blocking)
      saveAnalysis(response, response.inputSummary).catch((err) => {
        logger.warn('Firestore save failed (non-critical)', { error: err.message }, requestId);
      });

      logger.info(
        'Analysis complete',
        {
          analysisId,
          actionsTriggered: result.actions?.length || 0,
        },
        requestId,
      );

      res.json(response);
    } catch (error) {
      logger.error('Analysis failed', { error: error.message, analysisId }, requestId);

      if (error.message.includes('Invalid file type')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({
        error: 'Analysis failed. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
);

export default router;
