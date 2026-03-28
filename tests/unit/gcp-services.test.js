import { describe, it, expect, vi } from 'vitest';

// ── Mock config ──
vi.mock('../../server/config.js', () => ({
  default: {
    gcpProjectId: 'test-project',
    gcsBucket: 'test-bucket',
    nodeEnv: 'test',
    weatherApiKey: '',
  },
}));

// ── Mock logger ──
vi.mock('../../server/services/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    critical: vi.fn(),
  },
}));

// ── Mock GCS ──
const mockSave = vi.fn().mockResolvedValue();
const mockGetSignedUrl = vi.fn().mockResolvedValue(['https://storage.test/signed-url']);
const mockFile = vi.fn().mockReturnValue({
  save: mockSave,
  getSignedUrl: mockGetSignedUrl,
});
const mockBucket = vi.fn().mockReturnValue({ file: mockFile });

vi.mock('@google-cloud/storage', () => ({
  Storage: vi.fn().mockImplementation(() => ({
    bucket: mockBucket,
  })),
}));

// ── Mock TTS ──
const mockSynthesizeSpeech = vi
  .fn()
  .mockResolvedValue([{ audioContent: Buffer.from('fake-audio-data') }]);

vi.mock('@google-cloud/text-to-speech', () => ({
  default: {
    TextToSpeechClient: vi.fn().mockImplementation(() => ({
      synthesizeSpeech: mockSynthesizeSpeech,
    })),
  },
}));

// ── Mock STT ──
const mockRecognize = vi.fn().mockResolvedValue([
  {
    results: [
      {
        alternatives: [{ transcript: 'soil moisture is forty percent', confidence: 0.92 }],
      },
    ],
  },
]);

vi.mock('@google-cloud/speech', () => ({
  default: {
    SpeechClient: vi.fn().mockImplementation(() => ({
      recognize: mockRecognize,
    })),
  },
}));

// ── Mock Firestore ──
const mockAdd = vi.fn().mockResolvedValue({ id: 'doc-abc123' });
const mockForEach = vi.fn((cb) => {
  cb({ id: 'doc-1', data: () => ({ analysis: 'test', createdAt: new Date() }) });
  cb({ id: 'doc-2', data: () => ({ analysis: 'test2', createdAt: new Date() }) });
});
const mockGet = vi.fn().mockResolvedValue({ forEach: mockForEach });
const mockDocGet = vi.fn().mockResolvedValue({
  exists: true,
  id: 'doc-abc123',
  data: () => ({ analysis: 'found' }),
});
const mockDoc = vi.fn().mockReturnValue({ get: mockDocGet });
const mockOrderBy = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockReturnValue({ get: mockGet });

const MockFirestore = vi.fn().mockImplementation(() => ({
  collection: vi.fn().mockReturnValue({
    add: mockAdd,
    orderBy: mockOrderBy,
    limit: mockLimit,
    doc: mockDoc,
  }),
}));
MockFirestore.FieldValue = {
  serverTimestamp: vi.fn().mockReturnValue('SERVER_TIMESTAMP'),
};

vi.mock('@google-cloud/firestore', () => ({
  Firestore: MockFirestore,
}));

// ── Mock Cloud Logging ──
vi.mock('@google-cloud/logging', () => ({
  Logging: vi.fn().mockImplementation(() => ({
    log: vi.fn().mockReturnValue({
      entry: vi.fn(),
      write: vi.fn().mockResolvedValue(),
    }),
  })),
}));

describe('GCP Services — Deep Coverage', () => {
  // ── Logger ──
  describe('Logger', () => {
    it('exports all log severity levels', async () => {
      const logger = (await import('../../server/services/logger.js')).default;
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.critical).toBeDefined();
    });

    it('can call all log levels without throwing', async () => {
      const logger = (await import('../../server/services/logger.js')).default;
      expect(() => logger.info('test info')).not.toThrow();
      expect(() => logger.warn('test warn')).not.toThrow();
      expect(() => logger.error('test error', { code: 500 })).not.toThrow();
      expect(() => logger.debug('test debug')).not.toThrow();
      expect(() => logger.critical('test critical')).not.toThrow();
    });
  });

  // ── Storage ──
  describe('Storage', () => {
    it('exports all storage functions', async () => {
      const { uploadFile, uploadFieldImage, uploadAudio, isStorageAvailable } =
        await import('../../server/services/storage.js');
      expect(uploadFile).toBeDefined();
      expect(uploadFieldImage).toBeDefined();
      expect(uploadAudio).toBeDefined();
      expect(isStorageAvailable).toBeDefined();
    });

    it('isStorageAvailable returns true when configured', async () => {
      const { isStorageAvailable } = await import('../../server/services/storage.js');
      expect(isStorageAvailable()).toBe(true);
    });

    it('uploadFile stores buffer and returns signed URL', async () => {
      const { uploadFile } = await import('../../server/services/storage.js');
      const result = await uploadFile(Buffer.from('test'), 'test.jpg', 'image/jpeg');
      expect(result.stored).toBe(true);
      expect(result.url).toContain('https://');
      expect(result.gcsUri).toContain('gs://');
    });

    it('uploadFieldImage uses correct path format', async () => {
      const { uploadFieldImage } = await import('../../server/services/storage.js');
      const result = await uploadFieldImage(Buffer.from('img'), 'analysis-123', 0);
      expect(result.stored).toBe(true);
      expect(result.gcsUri).toContain('images/analysis-123/field_0.jpg');
    });

    it('uploadAudio uses correct path format', async () => {
      const { uploadAudio } = await import('../../server/services/storage.js');
      const result = await uploadAudio(Buffer.from('audio'), 'analysis-456');
      expect(result.stored).toBe(true);
      expect(result.gcsUri).toContain('audio/analysis-456/alert.mp3');
    });
  });

  // ── Text-to-Speech ──
  describe('Text-to-Speech', () => {
    it('exports synthesizeSpeech and isTTSAvailable', async () => {
      const { synthesizeSpeech, isTTSAvailable } = await import('../../server/services/tts.js');
      expect(synthesizeSpeech).toBeDefined();
      expect(isTTSAvailable).toBeDefined();
    });

    it('isTTSAvailable returns true when configured', async () => {
      const { isTTSAvailable } = await import('../../server/services/tts.js');
      expect(isTTSAvailable()).toBe(true);
    });

    it('synthesizeSpeech generates audio and uploads to storage', async () => {
      const { synthesizeSpeech } = await import('../../server/services/tts.js');
      const result = await synthesizeSpeech('Test alert message', 'English', 'analysis-789');
      expect(result.audioGenerated).toBe(true);
      expect(result.audioUrl).toBeDefined();
      expect(result.language).toBe('en-IN');
    });

    it('synthesizeSpeech handles Telugu language', async () => {
      const { synthesizeSpeech } = await import('../../server/services/tts.js');
      const result = await synthesizeSpeech('తెలుగు హెచ్చరిక', 'Telugu', 'analysis-tel');
      expect(result.audioGenerated).toBe(true);
      expect(result.language).toBe('te-IN');
    });

    it('synthesizeSpeech falls back to English for unknown language', async () => {
      const { synthesizeSpeech } = await import('../../server/services/tts.js');
      const result = await synthesizeSpeech('Alert', 'Unknown', 'analysis-unk');
      expect(result.audioGenerated).toBe(true);
      expect(result.language).toBe('en-IN');
    });

    it('synthesizeSpeech handles TTS failure gracefully', async () => {
      mockSynthesizeSpeech.mockRejectedValueOnce(new Error('TTS quota exceeded'));
      const { synthesizeSpeech } = await import('../../server/services/tts.js');
      const result = await synthesizeSpeech('Alert', 'Hindi', 'analysis-err');
      expect(result.audioGenerated).toBe(false);
      expect(result.message).toContain('TTS failed');
    });
  });

  // ── Speech-to-Text ──
  describe('Speech-to-Text', () => {
    it('exports transcribeAudio and isSpeechAvailable', async () => {
      const { transcribeAudio, isSpeechAvailable } =
        await import('../../server/services/speech.js');
      expect(transcribeAudio).toBeDefined();
      expect(isSpeechAvailable).toBeDefined();
    });

    it('isSpeechAvailable returns true when configured', async () => {
      const { isSpeechAvailable } = await import('../../server/services/speech.js');
      expect(isSpeechAvailable()).toBe(true);
    });

    it('transcribeAudio returns transcript with confidence', async () => {
      const { transcribeAudio } = await import('../../server/services/speech.js');
      const result = await transcribeAudio(Buffer.from('audio-data'), 'English');
      expect(result.transcribed).toBe(true);
      expect(result.transcript).toBe('soil moisture is forty percent');
      expect(result.confidence).toBeCloseTo(0.92);
      expect(result.language).toBe('en-IN');
    });

    it('transcribeAudio supports Hindi language code', async () => {
      const { transcribeAudio } = await import('../../server/services/speech.js');
      const result = await transcribeAudio(Buffer.from('audio'), 'Hindi');
      expect(result.language).toBe('hi-IN');
    });

    it('transcribeAudio handles empty results', async () => {
      mockRecognize.mockResolvedValueOnce([{ results: [] }]);
      const { transcribeAudio } = await import('../../server/services/speech.js');
      const result = await transcribeAudio(Buffer.from('silence'));
      expect(result.transcript).toBe('');
    });

    it('transcribeAudio handles STT failure gracefully', async () => {
      mockRecognize.mockRejectedValueOnce(new Error('Quota exceeded'));
      const { transcribeAudio } = await import('../../server/services/speech.js');
      const result = await transcribeAudio(Buffer.from('bad-audio'));
      expect(result.transcribed).toBe(false);
      expect(result.message).toContain('Transcription failed');
    });
  });

  // ── Firestore ──
  describe('Firestore', () => {
    it('exports all CRUD functions', async () => {
      const { saveAnalysis, getAnalysisHistory, getAnalysisById, isFirestoreAvailable } =
        await import('../../server/services/firestore.js');
      expect(saveAnalysis).toBeDefined();
      expect(getAnalysisHistory).toBeDefined();
      expect(getAnalysisById).toBeDefined();
      expect(isFirestoreAvailable).toBeDefined();
    });

    it('isFirestoreAvailable returns true when configured', async () => {
      const { isFirestoreAvailable } = await import('../../server/services/firestore.js');
      expect(isFirestoreAvailable()).toBe(true);
    });

    it('saveAnalysis stores document and returns ID', async () => {
      const { saveAnalysis } = await import('../../server/services/firestore.js');
      const result = await saveAnalysis({ text: 'analysis result' }, { lat: 16.5, lon: 80.6 });
      expect(result.saved).toBe(true);
      expect(result.id).toBe('doc-abc123');
    });

    it('getAnalysisHistory returns array of documents', async () => {
      const { getAnalysisHistory } = await import('../../server/services/firestore.js');
      const results = await getAnalysisHistory({ limit: 5 });
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(results[0]).toHaveProperty('id');
    });

    it('getAnalysisById returns a specific document', async () => {
      const { getAnalysisById } = await import('../../server/services/firestore.js');
      const result = await getAnalysisById('doc-abc123');
      expect(result).not.toBeNull();
      expect(result.id).toBe('doc-abc123');
      expect(result.analysis).toBe('found');
    });

    it('getAnalysisById returns null for missing document', async () => {
      mockDocGet.mockResolvedValueOnce({ exists: false });
      const { getAnalysisById } = await import('../../server/services/firestore.js');
      const result = await getAnalysisById('missing-id');
      expect(result).toBeNull();
    });

    it('saveAnalysis handles Firestore errors gracefully', async () => {
      mockAdd.mockRejectedValueOnce(new Error('Firestore write failed'));
      const { saveAnalysis } = await import('../../server/services/firestore.js');
      const result = await saveAnalysis({ text: 'fail' });
      expect(result.saved).toBe(false);
      expect(result.id).toContain('error-');
    });
  });
});
