/**
 * Google Cloud Speech-to-Text service for Eco-Pulse.
 * Enables farmers to send voice memos instead of typing sensor data.
 * Supports Indian languages for maximum accessibility.
 *
 * @module services/speech
 */

import speech from '@google-cloud/speech';
import config from '../config.js';
import logger from './logger.js';
import { LANGUAGE_MAP, STT } from '../constants.js';

let speechClient = null;

// Initialize Speech client when GCP project is configured
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
 * @param {string} [encoding] - Audio encoding (default from constants)
 * @param {number} [sampleRate] - Sample rate in Hz (default from constants)
 * @returns {Promise<{ transcript: string, confidence: number, transcribed: boolean }>}
 */
export async function transcribeAudio(
  audioBuffer,
  language = 'English',
  encoding = STT.ENCODING,
  sampleRate = STT.SAMPLE_RATE_HZ,
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

  const langConfig = LANGUAGE_MAP[language];
  const languageCode = langConfig?.code || 'en-IN';

  try {
    const [response] = await speechClient.recognize({
      audio: { content: audioBuffer.toString('base64') },
      config: {
        encoding,
        sampleRateHertz: sampleRate,
        languageCode,
        enableAutomaticPunctuation: true,
        model: STT.MODEL,
        useEnhanced: true,
        enableWordConfidence: true,
        speechContexts: [{ phrases: STT.AGRICULTURAL_HINTS }],
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

    // Disable client on credential errors to prevent repeated failures
    if (err.message?.includes('credentials') || err.message?.includes('authentication')) {
      logger.warn('Disabling Speech-to-Text due to credential error');
      speechClient = null;
    }

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
