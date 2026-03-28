/**
 * Additional integration tests to cover remaining route branches:
 * - Weather route 502 error
 * - History route GET /:id success, error branches
 * - Analyze route image upload catch, voice+sensor, validation error
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import request from 'supertest';

// Full GCP mocks
vi.mock('dotenv/config', () => ({}));

vi.mock('@google-cloud/logging', () => ({
  Logging: vi.fn().mockImplementation(() => ({
    log: vi.fn().mockReturnValue({
      entry: vi.fn(),
      write: vi.fn().mockResolvedValue(),
    }),
  })),
}));

vi.mock('@google-cloud/storage', () => ({
  Storage: vi.fn().mockImplementation(() => ({
    bucket: vi.fn().mockReturnValue({
      file: vi.fn().mockReturnValue({
        save: vi.fn().mockResolvedValue(),
        getSignedUrl: vi.fn().mockResolvedValue(['https://storage.test/signed']),
      }),
    }),
  })),
}));

vi.mock('@google-cloud/text-to-speech', () => ({
  default: {
    TextToSpeechClient: vi.fn().mockImplementation(() => ({
      synthesizeSpeech: vi.fn().mockResolvedValue([{ audioContent: Buffer.from('audio') }]),
    })),
  },
}));

vi.mock('@google-cloud/speech', () => ({
  default: {
    SpeechClient: vi.fn().mockImplementation(() => ({
      recognize: vi.fn().mockResolvedValue([{
        results: [{ alternatives: [{ transcript: 'soil moisture is 60%', confidence: 0.95 }] }],
      }]),
    })),
  },
}));

const mockFirestoreGetHistory = vi.fn().mockResolvedValue([]);
const mockFirestoreGetById = vi.fn().mockResolvedValue(null);
const mockFirestoreSave = vi.fn().mockResolvedValue({ id: 'doc1', saved: true });

vi.mock('../../server/services/firestore.js', () => ({
  getAnalysisHistory: (...args) => mockFirestoreGetHistory(...args),
  getAnalysisById: (...args) => mockFirestoreGetById(...args),
  saveAnalysis: (...args) => mockFirestoreSave(...args),
  isFirestoreAvailable: vi.fn().mockReturnValue(false),
}));

// Mock storage — uploadFieldImage can be made to reject per-test
const mockUploadFieldImage = vi.fn().mockResolvedValue({
  url: 'https://storage.test/signed',
  gcsUri: 'gs://test/img.jpg',
  stored: true,
});
vi.mock('../../server/services/storage.js', () => ({
  uploadFieldImage: (...args) => mockUploadFieldImage(...args),
  uploadFile: vi.fn().mockResolvedValue({ url: '/local/test', stored: false }),
  uploadAudio: vi.fn().mockResolvedValue({ url: '/local/audio', stored: false }),
  isStorageAvailable: vi.fn().mockReturnValue(true),
}));

// Mock weather
const mockGetWeatherForecast = vi.fn();
const mockFormatWeatherForGemini = vi.fn().mockReturnValue('');
vi.mock('../../server/services/weather.js', () => ({
  getWeatherForecast: mockGetWeatherForecast,
  formatWeatherForGemini: mockFormatWeatherForGemini,
}));

const mockGenerateContent = vi.fn().mockResolvedValue({
  text: 'Risk Level: MEDIUM. Crop analysis complete.',
  functionCalls: null,
});

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

process.env.GEMINI_API_KEY = 'test-key-routes-cov';
process.env.NODE_ENV = 'test';
process.env.GCP_PROJECT_ID = 'test-project';
process.env.GCS_BUCKET = 'test-bucket';

let app;

beforeAll(async () => {
  const mod = await import('../../server/index.js');
  app = mod.default;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Route Branch Coverage', () => {
  /* ── Weather route lines 26-28: 502 error ── */
  describe('GET /api/weather — server error', () => {
    it('returns 502 when weather service throws', async () => {
      mockGetWeatherForecast.mockRejectedValueOnce(new Error('API timeout'));

      const res = await request(app).get('/api/weather?lat=28.6&lon=77.2');
      expect(res.status).toBe(502);
      expect(res.body.error).toContain('weather');
    });
  });

  /* ── History GET / error (line 38-39) ── */
  describe('GET /api/history — catch block', () => {
    it('returns 500 when getAnalysisHistory throws', async () => {
      mockFirestoreGetHistory.mockRejectedValueOnce(new Error('DB crashed'));

      const res = await request(app).get('/api/history');
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('history');
    });
  });

  /* ── History GET /:id success (line 59) ── */
  describe('GET /api/history/:id — found', () => {
    it('returns analysis when found', async () => {
      mockFirestoreGetById.mockResolvedValueOnce({
        id: 'abc12345',
        analysis: 'test data',
        createdAt: new Date().toISOString(),
      });

      const res = await request(app).get('/api/history/abc12345');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.analysis.id).toBe('abc12345');
    });
  });

  /* ── History GET /:id — short ID validation error (line 50-51) ── */
  describe('GET /api/history/:id — validation', () => {
    it('returns 400 for too-short IDs', async () => {
      const res = await request(app).get('/api/history/ab');
      expect(res.status).toBe(400);
    });
  });

  /* ── History GET /:id — not found error (line 55-56) ── */
  describe('GET /api/history/:id — not found', () => {
    it('returns 404 when analysis not found', async () => {
      mockFirestoreGetById.mockResolvedValueOnce(null);

      const res = await request(app).get('/api/history/nonexistent-id');
      expect(res.status).toBe(404);
    });
  });

  /* ── History GET /:id — non-http error (line 64-65) ── */
  describe('GET /api/history/:id — generic error', () => {
    it('returns 500 for unexpected errors', async () => {
      mockFirestoreGetById.mockRejectedValueOnce(new Error('unexpected'));

      const res = await request(app).get('/api/history/valid-long-id');
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('history');
    });
  });

  /* ── Analyze route — validation error (lines 51-52) ── */
  describe('POST /api/analyze — validation fail', () => {
    it('returns 400 with validation details for invalid coords', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .field('cropInfo', 'Rice')
        .field('latitude', '999')  // Invalid lat
        .field('longitude', '77.2');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Validation');
    });
  });

  /* ── Analyze route line 94-95: voice transcript appended ── */
  describe('POST /api/analyze — with voice note', () => {
    it('transcribes voice and appends to sensor data', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Risk Level: HIGH. Moisture is critical.',
        functionCalls: null,
      });

      // Create a fake webm file
      const fakeAudio = Buffer.from('fake-audio-data');

      const res = await request(app)
        .post('/api/analyze')
        .field('cropInfo', 'Rice, 5 acres')
        .field('sensorData', 'Soil pH: 6.5')
        .field('language', 'English')
        .attach('voiceNote', fakeAudio, {
          filename: 'voice.webm',
          contentType: 'audio/webm',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // hasVoiceNote is true when voiceTranscript is non-empty
      expect(res.body.inputSummary).toBeDefined();
    });
  });

  /* ── Analyze route line 160-161: invalid file error ── */
  describe('POST /api/analyze — Gemini invalid file type error', () => {
    it('returns 400 when error includes Invalid file type', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Invalid file type: bad'));

      const res = await request(app)
        .post('/api/analyze')
        .field('cropInfo', 'Test');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid file type');
    });
  });

  /* ── Analyze route line 163-166: generic error ── */
  describe('POST /api/analyze — generic server error', () => {
    it('returns 500 for generic errors', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Gemini quota exceeded'));

      const res = await request(app)
        .post('/api/analyze')
        .field('cropInfo', 'Wheat');

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Analysis failed');
    });
  });

  /* ── Analyze route lines 105-111: weather catch inside analyze ── */
  describe('POST /api/analyze — weather failure in analyze', () => {
    it('continues analysis when weather fetch fails', async () => {
      mockGetWeatherForecast.mockRejectedValueOnce(new Error('Weather API down'));
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Risk Level: LOW. Analysis complete.',
        functionCalls: null,
      });

      const res = await request(app)
        .post('/api/analyze')
        .field('cropInfo', 'Cotton')
        .field('latitude', '28.6')
        .field('longitude', '77.2');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* ── Analyze route line 143: Firestore save catch (non-blocking) ── */
  describe('POST /api/analyze — Firestore save fails', () => {
    it('succeeds even when Firestore save rejects', async () => {
      mockFirestoreSave.mockRejectedValueOnce(new Error('Firestore write timeout'));
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Risk Level: MEDIUM. All clear.',
        functionCalls: null,
      });

      const res = await request(app)
        .post('/api/analyze')
        .field('cropInfo', 'Rice');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* ── Analyze route lines 65-69: image upload catch (non-blocking) ── */
  describe('POST /api/analyze — image GCS upload fails', () => {
    it('processes images and catches GCS upload failure', async () => {
      // Make uploadFieldImage reject to trigger lines 65-69
      mockUploadFieldImage.mockRejectedValueOnce(new Error('GCS upload quota exceeded'));

      mockGenerateContent.mockResolvedValueOnce({
        text: 'Risk Level: HIGH. Blight detected.',
        functionCalls: null,
      });

      // Generate a tiny 2x2 valid JPEG for sharp to process
      const sharp = (await import('sharp')).default;
      const testImageBuffer = await sharp({
        create: {
          width: 2,
          height: 2,
          channels: 3,
          background: { r: 128, g: 128, b: 128 },
        },
      })
        .jpeg()
        .toBuffer();

      const res = await request(app)
        .post('/api/analyze')
        .field('cropInfo', 'Wheat, 2 acres')
        .attach('fieldImages', testImageBuffer, {
          filename: 'field.jpg',
          contentType: 'image/jpeg',
        });

      // The analysis should still succeed
      // (GCS upload failure is non-blocking)
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.inputSummary.imagesProcessed).toBeGreaterThanOrEqual(1);
    });
  });
});

