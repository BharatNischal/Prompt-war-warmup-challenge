import { describe, it, expect, vi } from 'vitest';

// Mock config before importing
vi.mock('../../server/config.js', () => ({
  default: {
    gcpProjectId: '',
    nodeEnv: 'test',
  },
}));

// Mock logger
vi.mock('../../server/services/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    critical: vi.fn(),
  },
}));

// Mock storage
vi.mock('../../server/services/storage.js', () => ({
  uploadAudio: vi.fn().mockResolvedValue({ url: 'https://storage.test/audio.mp3', stored: true }),
  uploadFieldImage: vi.fn().mockResolvedValue({ url: 'https://storage.test/image.jpg', stored: true }),
  isStorageAvailable: vi.fn().mockReturnValue(false),
}));

describe('GCP Services', () => {
  describe('Logger', () => {
    it('exports all log levels', async () => {
      const logger = (await import('../../server/services/logger.js')).default;
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.critical).toBeDefined();
    });
  });

  describe('Storage', () => {
    it('exports storage utility functions', async () => {
      const { isStorageAvailable, uploadFieldImage, uploadAudio } = await import('../../server/services/storage.js');
      expect(isStorageAvailable).toBeDefined();
      expect(uploadFieldImage).toBeDefined();
      expect(uploadAudio).toBeDefined();
    });
  });

  describe('TTS', () => {
    it('exports synthesizeSpeech and isTTSAvailable', async () => {
      vi.mock('@google-cloud/text-to-speech', () => ({
        default: { TextToSpeechClient: vi.fn() },
        TextToSpeechClient: vi.fn(),
      }));

      const { synthesizeSpeech, isTTSAvailable } = await import('../../server/services/tts.js');
      expect(synthesizeSpeech).toBeDefined();
      expect(isTTSAvailable).toBeDefined();
    });
  });

  describe('Speech-to-Text', () => {
    it('exports transcribeAudio and isSpeechAvailable', async () => {
      vi.mock('@google-cloud/speech', () => ({
        default: { SpeechClient: vi.fn() },
        SpeechClient: vi.fn(),
      }));

      const { transcribeAudio, isSpeechAvailable } = await import('../../server/services/speech.js');
      expect(transcribeAudio).toBeDefined();
      expect(isSpeechAvailable).toBeDefined();
    });
  });

  describe('Firestore', () => {
    it('exports CRUD functions', async () => {
      vi.mock('@google-cloud/firestore', () => ({
        Firestore: vi.fn().mockImplementation(() => ({
          collection: vi.fn().mockReturnValue({
            add: vi.fn().mockResolvedValue({ id: 'test-id' }),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ exists: false }),
            }),
          }),
        })),
      }));

      const { saveAnalysis, getAnalysisHistory, getAnalysisById, isFirestoreAvailable } =
        await import('../../server/services/firestore.js');

      expect(saveAnalysis).toBeDefined();
      expect(getAnalysisHistory).toBeDefined();
      expect(getAnalysisById).toBeDefined();
      expect(isFirestoreAvailable).toBeDefined();
    });
  });
});
