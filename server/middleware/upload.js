import multer from 'multer';
import config from '../config.js';

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const AUDIO_TYPES = [
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
];

const ALLOWED_TYPES = [...IMAGE_TYPES, ...AUDIO_TYPES];

const storage = multer.memoryStorage();

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
    files: config.upload.maxFiles + 1, // +1 for voice note
  },
});
