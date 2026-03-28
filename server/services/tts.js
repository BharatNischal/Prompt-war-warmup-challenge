/**
 * Google Cloud Text-to-Speech service for Eco-Pulse.
 * Generates real audio alerts in the farmer's local language.
 * Falls back to mock if TTS is unavailable.
 */

import textToSpeech from '@google-cloud/text-to-speech';
import config from '../config.js';
import logger from './logger.js';
import { uploadAudio } from './storage.js';

let ttsClient = null;

// Language code mapping for supported Indian languages
const LANGUAGE_MAP = {
  English: { code: 'en-IN', name: 'en-IN-Wavenet-B', gender: 'MALE' },
  Hindi: { code: 'hi-IN', name: 'hi-IN-Wavenet-A', gender: 'FEMALE' },
  Tamil: { code: 'ta-IN', name: 'ta-IN-Wavenet-A', gender: 'FEMALE' },
  Telugu: { code: 'te-IN', name: 'te-IN-Standard-A', gender: 'FEMALE' },
  Bengali: { code: 'bn-IN', name: 'bn-IN-Wavenet-A', gender: 'FEMALE' },
  Marathi: { code: 'mr-IN', name: 'mr-IN-Wavenet-A', gender: 'FEMALE' },
  Kannada: { code: 'kn-IN', name: 'kn-IN-Wavenet-A', gender: 'FEMALE' },
  Punjabi: { code: 'pa-IN', name: 'pa-IN-Wavenet-A', gender: 'FEMALE' },
};

// Initialize TTS client
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
 * @param {string} language - Language name (e.g., 'Telugu', 'Hindi')
 * @param {string} analysisId - Analysis session ID for file naming
 * @returns {Promise<{ audioUrl: string | null, audioGenerated: boolean }>}
 */
export async function synthesizeSpeech(text, language = 'English', analysisId = '') {
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
        name: langConfig.name,
        ssmlGender: langConfig.gender,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.9, // Slightly slower for clarity
        pitch: 0,
        effectsProfileId: ['telephony-class-application'], // Optimized for phone calls
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
