/**
 * Google Cloud Text-to-Speech service for Eco-Pulse.
 * Generates real audio alerts in the farmer's local language.
 * Falls back to mock response if TTS is unavailable.
 *
 * @module services/tts
 */

import textToSpeech from '@google-cloud/text-to-speech';
import config from '../config.js';
import logger from './logger.js';
import { uploadAudio } from './storage.js';
import { LANGUAGE_MAP, TTS } from '../constants.js';

let ttsClient = null;

// Initialize TTS client when GCP project is configured
if (config.gcpProjectId) {
  try {
    ttsClient = new textToSpeech.TextToSpeechClient({
      projectId: config.gcpProjectId,
    });
    logger.info('Cloud Text-to-Speech initialized');
  } catch (err) {
    logger.warn('Cloud TTS init failed', { error: err.message });
  }
}

/**
 * Synthesize speech from text using Google Cloud TTS.
 * @param {string} text - The alert message to convert to speech
 * @param {string} [language] - Language name (e.g., 'Telugu', 'Hindi')
 * @param {string} [analysisId] - Analysis session ID for file naming
 * @returns {Promise<{ audioUrl: string | null, audioGenerated: boolean }>}
 */
export async function synthesizeSpeech(text, language = TTS.DEFAULT_LANGUAGE, analysisId = '') {
  if (!ttsClient) {
    logger.debug('TTS not available, returning mock audio response');
    return {
      audioUrl: null,
      audioGenerated: false,
      message: 'Cloud TTS not configured — audio would be generated in production',
    };
  }

  const langConfig = LANGUAGE_MAP[language] || LANGUAGE_MAP.English;

  try {
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: langConfig.code,
        name: langConfig.ttsVoice,
        ssmlGender: langConfig.gender,
      },
      audioConfig: {
        audioEncoding: TTS.AUDIO_ENCODING,
        speakingRate: TTS.SPEAKING_RATE,
        pitch: TTS.PITCH,
        effectsProfileId: [TTS.EFFECTS_PROFILE],
      },
    });

    logger.info('TTS audio synthesized', {
      language,
      textLength: text.length,
      audioBytes: response.audioContent.length,
    });

    // Upload to Cloud Storage if available
    const audioBuffer = Buffer.from(response.audioContent);
    const upload = await uploadAudio(audioBuffer, analysisId || `tts-${Date.now()}`);

    return {
      audioUrl: upload.url,
      audioGenerated: true,
      audioSize: audioBuffer.length,
      language: langConfig.code,
    };
  } catch (err) {
    logger.error('TTS synthesis failed', { error: err.message, language });

    // Disable client on credential errors to prevent repeated failures
    if (err.message?.includes('credentials') || err.message?.includes('authentication')) {
      logger.warn('Disabling TTS due to credential error');
      ttsClient = null;
    }

    return {
      audioUrl: null,
      audioGenerated: false,
      message: `TTS failed: ${err.message}`,
    };
  }
}

/**
 * Check if TTS service is available.
 * @returns {boolean}
 */
export function isTTSAvailable() {
  return !!ttsClient;
}
