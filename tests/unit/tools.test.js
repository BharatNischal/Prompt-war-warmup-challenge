import { describe, it, expect, vi } from 'vitest';

// Mock config
vi.mock('../../server/config.js', () => ({
  default: { gcpProjectId: '', nodeEnv: 'test' },
}));

// Mock logger
vi.mock('../../server/services/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), critical: vi.fn() },
}));

// Mock TTS
vi.mock('../../server/services/tts.js', () => ({
  synthesizeSpeech: vi.fn().mockResolvedValue({
    audioUrl: 'https://storage.test/alert.mp3',
    audioGenerated: true,
    audioSize: 12345,
  }),
  isTTSAvailable: vi.fn().mockReturnValue(true),
}));

// Mock storage
vi.mock('../../server/services/storage.js', () => ({
  uploadFieldImage: vi.fn().mockResolvedValue({ url: 'https://storage.test/img.jpg', stored: true }),
  uploadAudio: vi.fn().mockResolvedValue({ url: 'https://storage.test/audio.mp3', stored: true }),
  isStorageAvailable: vi.fn().mockReturnValue(false),
}));

import { toolDeclarations, executeToolCall } from '../../server/services/tools.js';

describe('Tool Declarations', () => {
  it('declares reserve_warehouse_space tool', () => {
    const tool = toolDeclarations[0].functionDeclarations.find(
      (t) => t.name === 'reserve_warehouse_space'
    );
    expect(tool).toBeDefined();
    expect(tool.parameters.properties.crop_type).toBeDefined();
    expect(tool.parameters.properties.quantity_kg).toBeDefined();
    expect(tool.parameters.properties.urgency_level).toBeDefined();
    expect(tool.parameters.required).toContain('crop_type');
    expect(tool.parameters.required).toContain('quantity_kg');
    expect(tool.parameters.required).toContain('urgency_level');
  });

  it('declares send_voice_alert tool', () => {
    const tool = toolDeclarations[0].functionDeclarations.find(
      (t) => t.name === 'send_voice_alert'
    );
    expect(tool).toBeDefined();
    expect(tool.parameters.properties.phone_number).toBeDefined();
    expect(tool.parameters.properties.language).toBeDefined();
    expect(tool.parameters.properties.message_text).toBeDefined();
    expect(tool.parameters.required).toContain('phone_number');
  });

  it('urgency_level has valid enum values', () => {
    const tool = toolDeclarations[0].functionDeclarations.find(
      (t) => t.name === 'reserve_warehouse_space'
    );
    expect(tool.parameters.properties.urgency_level.enum).toEqual([
      'LOW', 'MEDIUM', 'HIGH', 'CRITICAL',
    ]);
  });
});

describe('Tool Execution', () => {
  describe('reserve_warehouse_space', () => {
    it('returns confirmation with ID', async () => {
      const result = await executeToolCall('reserve_warehouse_space', {
        crop_type: 'rice',
        quantity_kg: 500,
        urgency_level: 'HIGH',
      });

      expect(result.success).toBe(true);
      expect(result.confirmation_id).toMatch(/^WH-/);
      expect(result.reserved_capacity_kg).toBe(500);
      expect(result.crop_type).toBe('rice');
      expect(result.urgency).toBe('HIGH');
      expect(result.estimated_cost_inr).toBe(250);
      expect(result.valid_until).toBeDefined();
    });

    it('generates unique confirmation IDs', async () => {
      const [r1, r2] = await Promise.all([
        executeToolCall('reserve_warehouse_space', { crop_type: 'rice', quantity_kg: 100, urgency_level: 'LOW' }),
        executeToolCall('reserve_warehouse_space', { crop_type: 'wheat', quantity_kg: 200, urgency_level: 'MEDIUM' }),
      ]);
      expect(r1.confirmation_id).not.toBe(r2.confirmation_id);
    });
  });

  describe('send_voice_alert', () => {
    it('returns delivery confirmation with audio', async () => {
      const result = await executeToolCall('send_voice_alert', {
        phone_number: '+919876543210',
        language: 'Telugu',
        message_text: 'Harvest your rice immediately due to approaching cyclone.',
        alert_severity: 'CRITICAL',
      });

      expect(result.success).toBe(true);
      expect(result.call_id).toMatch(/^CALL-/);
      expect(result.phone_number).toBe('+919876543210');
      expect(result.language).toBe('Telugu');
      expect(result.status).toBe('DELIVERED');
      expect(result.audio_generated).toBe(true);
      expect(result.audio_url).toBeDefined();
    });
  });

  describe('unknown tool', () => {
    it('returns error for unknown tool name', async () => {
      const result = await executeToolCall('nonexistent_tool', {});
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Unknown tool');
    });
  });
});
