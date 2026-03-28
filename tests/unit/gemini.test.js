import { describe, it, expect, vi } from 'vitest';

// Mock the @google/genai module before importing gemini service
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: vi.fn(),
      },
    })),
  };
});

// Mock dotenv
vi.mock('dotenv/config', () => ({}));

// Mock config to avoid process.exit
vi.mock('../../server/config.js', () => ({
  default: {
    geminiApiKey: 'test-key',
    gcpProjectId: '',
    nodeEnv: 'test',
    weatherApiKey: '',
  },
}));

// Mock logger
vi.mock('../../server/services/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), critical: vi.fn() },
}));

// Mock TTS
vi.mock('../../server/services/tts.js', () => ({
  synthesizeSpeech: vi.fn().mockResolvedValue({ audioUrl: null, audioGenerated: false }),
  isTTSAvailable: vi.fn().mockReturnValue(false),
}));

// Mock storage
vi.mock('../../server/services/storage.js', () => ({
  uploadFieldImage: vi.fn().mockResolvedValue({ url: '', stored: false }),
  uploadAudio: vi.fn().mockResolvedValue({ url: '', stored: false }),
  isStorageAvailable: vi.fn().mockReturnValue(false),
}));

// We need to test the tool declarations and system instruction integration
// without actually calling Gemini API
describe('Gemini Service Integration', () => {
  it('tool declarations match expected schema', async () => {
    const { toolDeclarations } = await import('../../server/services/tools.js');

    expect(toolDeclarations).toBeDefined();
    expect(Array.isArray(toolDeclarations)).toBe(true);

    const decls = toolDeclarations[0].functionDeclarations;

    // Verify warehouse tool
    const warehouse = decls.find(d => d.name === 'reserve_warehouse_space');
    expect(warehouse).toBeDefined();
    expect(warehouse.description).toContain('warehouse');
    expect(warehouse.parameters.type).toBe('object');

    // Verify voice tool
    const voice = decls.find(d => d.name === 'send_voice_alert');
    expect(voice).toBeDefined();
    expect(voice.description).toContain('voice');
    expect(voice.parameters.type).toBe('object');
  });

  it('tool declarations have proper enum values', async () => {
    const { toolDeclarations } = await import('../../server/services/tools.js');
    const decls = toolDeclarations[0].functionDeclarations;

    const warehouse = decls.find(d => d.name === 'reserve_warehouse_space');
    const urgency = warehouse.parameters.properties.urgency_level;
    expect(urgency.enum).toEqual(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

    const voice = decls.find(d => d.name === 'send_voice_alert');
    const severity = voice.parameters.properties.alert_severity;
    expect(severity.enum).toEqual(['INFO', 'WARNING', 'CRITICAL']);
  });
});
