import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock config
vi.mock('../../server/config.js', () => ({
  default: {
    geminiApiKey: 'test-key',
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

// Mock TTS/Storage for tool execution
vi.mock('../../server/services/tts.js', () => ({
  synthesizeSpeech: vi.fn().mockResolvedValue({ audioUrl: null, audioGenerated: false }),
  isTTSAvailable: vi.fn().mockReturnValue(false),
}));

vi.mock('../../server/services/storage.js', () => ({
  uploadAudio: vi.fn().mockResolvedValue({ url: '', stored: false }),
  uploadFieldImage: vi.fn().mockResolvedValue({ url: '', stored: false }),
  isStorageAvailable: vi.fn().mockReturnValue(false),
}));

// Mock Gemini with function calling support
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

describe('Gemini Service', () => {
  let analyzeField;

  beforeAll(async () => {
    const mod = await import('../../server/services/gemini.js');
    analyzeField = mod.analyzeField;
  });

  it('analyzes text-only input without function calls', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Risk Level: MEDIUM. Your crop shows signs of stress.',
      functionCalls: null,
    });

    const result = await analyzeField({
      sensorData: 'soil moisture: 21%',
      cropInfo: 'Rice, 3 acres',
    });

    expect(result.analysis).toContain('Risk Level: MEDIUM');
    expect(result.actions).toEqual([]);
    expect(result.timestamp).toBeDefined();
  });

  it('handles Gemini function calls (warehouse + voice alert)', async () => {
    // First call returns function calls
    mockGenerateContent.mockResolvedValueOnce({
      text: '',
      functionCalls: [
        {
          name: 'reserve_warehouse_space',
          args: { crop_type: 'rice', quantity_kg: 500, urgency_level: 'HIGH' },
        },
        {
          name: 'send_voice_alert',
          args: {
            phone_number: '+919876543210',
            language: 'Telugu',
            message_text: 'Cyclone warning',
            alert_severity: 'CRITICAL',
          },
        },
      ],
      candidates: [
        { content: { parts: [{ text: 'I need to reserve warehouse and alert farmer' }] } },
      ],
    });

    // Second call (follow-up) returns final analysis
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Risk Level: CRITICAL. Warehouse reserved. Voice alert sent.',
    });

    const result = await analyzeField({
      weatherContext: 'Cyclone approaching',
      sensorData: 'soil moisture: 21%',
      cropInfo: 'Rice, 3 acres',
      phone: '+919876543210',
      language: 'Telugu',
      analysisId: 'test-analysis-1',
    });

    expect(result.actions.length).toBe(2);
    expect(result.actions[0].tool).toBe('reserve_warehouse_space');
    expect(result.actions[1].tool).toBe('send_voice_alert');
    expect(result.analysis).toContain('CRITICAL');
  });

  it('processes images in multimodal input', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Field photo analysis: Crop appears healthy.',
      functionCalls: null,
    });

    const result = await analyzeField({
      images: [{ buffer: Buffer.from('fake-image'), mimeType: 'image/jpeg' }],
      cropInfo: 'Rice',
    });

    expect(result.analysis).toContain('healthy');
    // Verify generateContent was called with inline image data
    const callArgs = mockGenerateContent.mock.calls[mockGenerateContent.mock.calls.length - 1][0];
    const parts = callArgs.contents[0].parts;
    expect(parts[0].inlineData.mimeType).toBe('image/jpeg');
  });

  it('throws on Gemini API error', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API quota exceeded'));

    await expect(analyzeField({ sensorData: 'test' })).rejects.toThrow(
      'Analysis failed: API quota exceeded',
    );
  });

  it('handles empty text response from Gemini', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '',
      functionCalls: null,
    });

    const result = await analyzeField({ sensorData: 'test' });
    expect(result.analysis).toBe('');
  });

  it('includes weather context in prompt', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Weather analysis complete.',
      functionCalls: null,
    });

    await analyzeField({
      weatherContext: 'Heavy rainfall expected in 48 hours',
      sensorData: 'humidity: 85%',
    });

    const callArgs = mockGenerateContent.mock.calls[mockGenerateContent.mock.calls.length - 1][0];
    const textPart = callArgs.contents[0].parts.find((p) => p.text);
    expect(textPart.text).toContain('WEATHER FORECAST DATA');
    expect(textPart.text).toContain('Heavy rainfall');
  });

  it('includes phone and language in prompt', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Done.',
      functionCalls: null,
    });

    await analyzeField({
      phone: '+919876543210',
      language: 'Hindi',
    });

    const callArgs = mockGenerateContent.mock.calls[mockGenerateContent.mock.calls.length - 1][0];
    const textPart = callArgs.contents[0].parts.find((p) => p.text);
    expect(textPart.text).toContain('+919876543210');
    expect(textPart.text).toContain('Hindi');
  });
});
