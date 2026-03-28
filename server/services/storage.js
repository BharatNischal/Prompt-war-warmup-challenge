/**
 * Google Cloud Storage service for Eco-Pulse.
 * Handles image uploads and TTS audio file storage with auto-expiry.
 */

import { Storage } from '@google-cloud/storage';
import config from '../config.js';
import logger from './logger.js';

let storage = null;
let bucket = null;

// Initialize GCS if configured
if (config.gcsBucket) {
  try {
    storage = new Storage({ projectId: config.gcpProjectId });
    bucket = storage.bucket(config.gcsBucket);
    logger.info('Cloud Storage initialized', { bucket: config.gcsBucket });
  } catch (err) {
    logger.warn('Cloud Storage init failed, using local fallback', { error: err.message });
  }
}

/**
 * Upload a file buffer to Cloud Storage.
 * @param {Buffer} buffer - File content
 * @param {string} filename - Destination filename (e.g., 'images/abc123.jpg')
 * @param {string} contentType - MIME type
 * @param {object} [metadata] - Custom metadata
 * @returns {Promise<{ url: string, gcsUri: string }>}
 */
export async function uploadFile(buffer, filename, contentType, metadata = {}) {
  if (!bucket) {
    logger.debug('GCS not configured, returning placeholder URL');
    return {
      url: `/local/${filename}`,
      gcsUri: `gs://local/${filename}`,
      stored: false,
    };
  }

  const file = bucket.file(filename);

  try {
    await file.save(buffer, {
      contentType,
      metadata: {
        ...metadata,
        uploadedBy: 'eco-pulse',
        uploadedAt: new Date().toISOString(),
      },
      resumable: false, // Small files don't need resumable upload
    });

    // Generate a signed URL valid for 24 hours
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    logger.info('File uploaded to GCS', { filename, contentType, size: buffer.length });

    return {
      url: signedUrl,
      gcsUri: `gs://${config.gcsBucket}/${filename}`,
      stored: true,
    };
  } catch (err) {
    logger.error('GCS upload failed', { error: err.message, filename });

    // Disable GCS on credential errors to prevent repeated failures
    if (err.message?.includes('credentials') || err.message?.includes('authentication')) {
      logger.warn('Disabling Cloud Storage due to credential error');
      bucket = null;
    }

    return {
      url: `/local/${filename}`,
      gcsUri: `gs://local/${filename}`,
      stored: false,
      message: `Upload failed: ${err.message}`,
    };
  }
}

/**
 * Upload a compressed field image to GCS.
 * @param {Buffer} buffer - Compressed image buffer
 * @param {string} analysisId - Analysis session ID
 * @param {number} index - Image index
 * @returns {Promise<object>}
 */
export async function uploadFieldImage(buffer, analysisId, index) {
  const filename = `images/${analysisId}/field_${index}.jpg`;
  return uploadFile(buffer, filename, 'image/jpeg', { analysisId, type: 'field_image' });
}

/**
 * Upload TTS audio to GCS.
 * @param {Buffer} audioBuffer - MP3 audio buffer
 * @param {string} analysisId - Analysis session ID
 * @returns {Promise<object>}
 */
export async function uploadAudio(audioBuffer, analysisId) {
  const filename = `audio/${analysisId}/alert.mp3`;
  return uploadFile(audioBuffer, filename, 'audio/mpeg', { analysisId, type: 'voice_alert' });
}

/**
 * Check if GCS is available and configured.
 * @returns {boolean}
 */
export function isStorageAvailable() {
  return !!bucket;
}
