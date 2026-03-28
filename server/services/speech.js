/**
 * Google Cloud Speech-to-Text service for Eco-Pulse.
 * Enables farmers to send voice memos instead of typing sensor data.
 * Supports Indian languages for maximum accessibility.
 */

import speech from '@google-cloud/speech';
import config from '../config.js';
import logger from './logger.js';

let speechClient = null;

// Language code mapping for speech recognition
const SPEECH_LANGUAGE_MAP = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Tamil: 'ta-IN',
  Telugu: 'te-IN',
  Bengali: 'bn-IN',
  Marathi: 'mr-IN',
  Kannada: 'kn-IN',
  Punjabi: 'pa-IN',
};

// Initialize Speech client
if (config.gcpProjectId) {
  try {
    speechClient = new speech.SpeechClient({
      projectId: config.gcpProjectId,
    });
    logger.info('Cloud Speech-to-Text initialized');
  } catch (err) {
    logger.warn('Speech-to-Text init failed', { error: err.message });
  }
}

/**
 * Transcribe an audio buffer to text using Cloud Speech-to-Text.
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} [language='English'] - Language for recognition
 * @param {string} [encoding='WEBM_OPUS'] - Audio encoding
 * @param {number} [sampleRate=48000] - Sample rate in Hz
 * @returns {Promise<{ transcript: string, confidence: number, transcribed: boolean }>}
 */
export async function transcribeAudio(
  audioBuffer,
  language = 'English',
  encoding = 'WEBM_OPUS',
  sampleRate = 48000,
) {
  if (!speechClient) {
    logger.debug('Speech-to-Text not available, returning empty transcript');
    return {
      transcript: '',
      confidence: 0,
      transcribed: false,
      message: 'Cloud Speech-to-Text not configured',
    };
  }

  const languageCode = SPEECH_LANGUAGE_MAP[language] || 'en-IN';

  try {
    const [response] = await speechClient.recognize({
      audio: { content: audioBuffer.toString('base64') },
      config: {
        encoding,
        sampleRateHertz: sampleRate,
        languageCode,
        enableAutomaticPunctuation: true,
        model: 'latest_long',
        useEnhanced: true,
        // Enable word-level confidence for quality assessment
        enableWordConfidence: true,
        // Agricultural domain hints
        speechContexts: [{
          phrases: [
            'soil moisture', 'humidity', 'temperature', 'rainfall',
            'rice', 'wheat', 'cotton', 'sugarcane', 'harvest',
            'cyclone', 'flood', 'drought', 'irrigation',
            'fertilizer', 'pesticide', 'yield', 'acres',
          ],
        }],
      },
    });

    const result = response.results?.[0];
    const transcript = result?.alternatives?.[0]?.transcript || '';
    const confidence = result?.alternatives?.[0]?.confidence || 0;

    logger.info('Audio transcribed', {
      language: languageCode,
      transcriptLength: transcript.length,
      confidence: Math.round(confidence * 100) + '%',
    });

    return {
      transcript,
      confidence,
      transcribed: true,
      language: languageCode,
    };
  } catch (err) {
    logger.error('Speech-to-Text failed', { error: err.message, language });
    return {
      transcript: '',
      confidence: 0,
      transcribed: false,
      message: `Transcription failed: ${err.message}`,
    };
  }
}

/**
 * Check if Speech-to-Text is available.
 * @returns {boolean}
 */
export function isSpeechAvailable() {
  return !!speechClient;
}
