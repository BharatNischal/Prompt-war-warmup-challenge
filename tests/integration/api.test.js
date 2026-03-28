import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// Mock all GCP services before importing app
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
      synthesizeSpeech: vi.fn().mockResolvedValue([{ audioContent: Buffer.from('fake-audio') }]),
    })),
  },
  TextToSpeechClient: vi.fn(),
}));

vi.mock('@google-cloud/speech', () => ({
  default: {
    SpeechClient: vi.fn().mockImplementation(() => ({
      recognize: vi.fn().mockResolvedValue([{
        results: [{ alternatives: [{ transcript: 'test transcript', confidence: 0.95 }] }],
      }]),
    })),
  },
  SpeechClient: vi.fn(),
}));

vi.mock('@google-cloud/firestore', () => ({
  Firestore: vi.fn().mockImplementation(() => ({
    collection: vi.fn().mockReturnValue({
      add: vi.fn().mockResolvedValue({ id: 'test-doc' }),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
      }),
    }),
  })),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: 'Mock analysis: Risk Level: MEDIUM. Your crop is at moderate risk.',
        functionCalls: null,
        candidates: [{ content: { parts: [{ text: 'mock' }] } }],
      }),
    },
  })),
}));

// Set env before importing config
process.env.GEMINI_API_KEY = 'test-key-for-integration';
process.env.NODE_ENV = 'test';
process.env.GCP_PROJECT_ID = '';
process.env.GCS_BUCKET = '';
process.env.PORT = '0'; // Random port to avoid EADDRINUSE

let app;
beforeAll(async () => {
  const mod = await import('../../server/index.js');
  app = mod.default;
});

describe('API Integration Tests', () => {
  describe('GET /api/health', () => {
    it('returns healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('eco-pulse');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/weather', () => {
    it('returns 400 without coordinates', async () => {
      const res = await request(app).get('/api/weather');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('lat and lon');
    });

    it('returns 400 for invalid latitude', async () => {
      const res = await request(app).get('/api/weather?lat=999&lon=80');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });

    it('returns forecast for valid coordinates', async () => {
      const res = await request(app).get('/api/weather?lat=16.5&lon=80.6');
      expect(res.status).toBe(200);
      expect(res.body.available).toBe(true);
      expect(res.body.forecast).toBeDefined();
    });
  });

  describe('POST /api/analyze', () => {
    it('processes text-only analysis', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .field('cropInfo', 'Rice, 3 acres, 85 days old')
        .field('sensorData', 'soil moisture: 21%')
        .field('latitude', '16.5')
        .field('longitude', '80.6');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.analysis).toBeDefined();
      expect(res.body.analysisId).toBeDefined();
      expect(res.body.inputSummary).toBeDefined();
    });

    it('returns 400 for invalid coordinates', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .field('latitude', '999')
        .field('longitude', '-200');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Validation failed');
    });

    it('returns 400 for invalid phone number', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .field('cropInfo', 'Rice')
        .field('phone', 'not-a-phone');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/history', () => {
    it('returns analysis history array', async () => {
      const res = await request(app).get('/api/history');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.analyses)).toBe(true);
    });

    it('returns 404 for non-existent analysis', async () => {
      const res = await request(app).get('/api/history/nonexistent-id-12345');
      expect(res.status).toBe(404);
    });
  });

  describe('Error Handling', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
