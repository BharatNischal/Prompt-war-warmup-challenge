/**
 * File upload middleware using Multer.
 * Validates file types against centralized constants and enforces size limits.
 *
 * @module middleware/upload
 */

import multer from 'multer';
import config from '../config.js';
import { UPLOAD } from '../constants.js';

/** Combined list of all accepted MIME types */
const ALLOWED_TYPES = [...UPLOAD.ALLOWED_IMAGE_TYPES, ...UPLOAD.ALLOWED_AUDIO_TYPES];

const storage = multer.memoryStorage();

/**
 * Multer file filter — rejects uploads with unsupported MIME types.
 * @param {import('express').Request} _req
 * @param {Express.Multer.File} file
 * @param {multer.FileFilterCallback} cb
 */
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: images and audio files.`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles + UPLOAD.MAX_VOICE_COUNT, // +1 for voice note
  },
});
