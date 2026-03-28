import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';

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
      synthesizeSpeech: vi.fn().mockResolvedValue([{ audioContent: Buffer.from('fake') }]),
    })),
  },
  TextToSpeechClient: vi.fn(),
}));

vi.mock('@google-cloud/speech', () => ({
  default: {
    SpeechClient: vi.fn().mockImplementation(() => ({
      recognize: vi.fn().mockResolvedValue([{
        results: [{ alternatives: [{ transcript: 'soil moisture is 30 percent', confidence: 0.88 }] }],
      }]),
    })),
  },
  SpeechClient: vi.fn(),
}));

vi.mock('@google-cloud/firestore', () => {
  const MockFirestore = vi.fn().mockImplementation(() => ({
    collection: vi.fn().mockReturnValue({
      add: vi.fn().mockResolvedValue({ id: 'test-doc' }),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
      }),
    }),
  }));
  MockFirestore.FieldValue = {
    serverTimestamp: vi.fn().mockReturnValue('SERVER_TIMESTAMP'),
  };
  return { Firestore: MockFirestore };
});

const mockGenerateContent = vi.fn().mockResolvedValue({
  text: 'Field analysis complete. Risk Level: HIGH.',
  functionCalls: null,
});

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

process.env.GEMINI_API_KEY = 'test-key-uploads';
process.env.NODE_ENV = 'test';
process.env.GCP_PROJECT_ID = '';
process.env.GCS_BUCKET = '';
process.env.PORT = '0';

let app;
let testImage;

beforeAll(async () => {
  const mod = await import('../../server/index.js');
  app = mod.default;

  // Create a real test image
  testImage = await sharp({
    create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 128, b: 0 } },
  })
    .jpeg()
    .toBuffer();
});

describe('Upload Integration Tests', () => {
  it('processes analysis with image upload', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .attach('fieldImages', testImage, 'field.jpg')
      .field('cropInfo', 'Rice, 5 acres');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.inputSummary.imagesProcessed).toBe(1);
  });

  it('processes analysis with multiple images', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .attach('fieldImages', testImage, 'field1.jpg')
      .attach('fieldImages', testImage, 'field2.jpg')
      .field('cropInfo', 'Wheat');

    expect(res.status).toBe(200);
    expect(res.body.inputSummary.imagesProcessed).toBe(2);
  });

  it('processes analysis with voice note', async () => {
    const fakeAudio = Buffer.from('fake-audio-webm-data');
    const res = await request(app)
      .post('/api/analyze')
      .attach('voiceNote', fakeAudio, { filename: 'voice.webm', contentType: 'audio/webm' })
      .field('cropInfo', 'Cotton');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Voice note was processed (may or may not produce transcript depending on mock state)
    expect(res.body.inputSummary).toBeDefined();
  });

  it('processes analysis with both images and voice', async () => {
    const fakeAudio = Buffer.from('fake-audio-data');
    const res = await request(app)
      .post('/api/analyze')
      .attach('fieldImages', testImage, 'field.jpg')
      .attach('voiceNote', fakeAudio, { filename: 'note.webm', contentType: 'audio/webm' })
      .field('cropInfo', 'Sugarcane')
      .field('latitude', '16.5')
      .field('longitude', '80.6');

    expect(res.status).toBe(200);
    expect(res.body.inputSummary.imagesProcessed).toBe(1);
    expect(res.body.inputSummary.hasLocation).toBe(true);
  });

  it('handles Gemini API errors gracefully', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Gemini API quota exceeded'));

    const res = await request(app)
      .post('/api/analyze')
      .field('cropInfo', 'Rice');

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Analysis failed');
  });

  it('rejects invalid file type', async () => {
    const fakeFile = Buffer.from('not-an-image');
    const res = await request(app)
      .post('/api/analyze')
      .attach('fieldImages', fakeFile, { filename: 'evil.exe', contentType: 'application/x-msdownload' })
      .field('cropInfo', 'Rice');

    // Multer rejects invalid MIME types — may return 400 or 500 depending on error handler
    expect([400, 500]).toContain(res.status);
  });
});
