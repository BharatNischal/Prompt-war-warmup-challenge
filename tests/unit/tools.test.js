import { describe, it, expect } from 'vitest';
import { executeToolCall, toolDeclarations } from '../../server/services/tools.js';

describe('toolDeclarations', () => {
  it('defines exactly 2 function declarations', () => {
    const decls = toolDeclarations[0].functionDeclarations;
    expect(decls).toHaveLength(2);
  });

  it('has reserve_warehouse_space declaration', () => {
    const decls = toolDeclarations[0].functionDeclarations;
    const warehouse = decls.find(d => d.name === 'reserve_warehouse_space');
    expect(warehouse).toBeDefined();
    expect(warehouse.parameters.required).toContain('crop_type');
    expect(warehouse.parameters.required).toContain('quantity_kg');
    expect(warehouse.parameters.required).toContain('urgency_level');
  });

  it('has send_voice_alert declaration', () => {
    const decls = toolDeclarations[0].functionDeclarations;
    const voice = decls.find(d => d.name === 'send_voice_alert');
    expect(voice).toBeDefined();
    expect(voice.parameters.required).toContain('phone_number');
    expect(voice.parameters.required).toContain('language');
    expect(voice.parameters.required).toContain('message_text');
  });
});

describe('executeToolCall', () => {
  it('reserves warehouse space successfully', async () => {
    const result = await executeToolCall('reserve_warehouse_space', {
      crop_type: 'rice',
      quantity_kg: 500,
      urgency_level: 'HIGH',
    });

    expect(result.success).toBe(true);
    expect(result.confirmation_id).toBeDefined();
    expect(result.confirmation_id).toMatch(/^WH-/);
    expect(result.reserved_capacity_kg).toBe(500);
    expect(result.crop_type).toBe('rice');
  });

  it('sends voice alert successfully', async () => {
    const result = await executeToolCall('send_voice_alert', {
      phone_number: '+919876543210',
      language: 'Hindi',
      message_text: 'Harvest immediately!',
      alert_severity: 'CRITICAL',
    });

    expect(result.success).toBe(true);
    expect(result.call_id).toMatch(/^CALL-/);
    expect(result.phone_number).toBe('+919876543210');
    expect(result.language).toBe('Hindi');
    expect(result.status).toBe('DELIVERED');
  });

  it('handles unknown tool gracefully', async () => {
    const result = await executeToolCall('unknown_tool', {});
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Unknown tool');
  });
});
