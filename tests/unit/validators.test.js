import { describe, it, expect } from 'vitest';
import {
  isValidLatitude,
  isValidLongitude,
  sanitizeText,
  isValidPhone,
  validateAnalyzeRequest,
} from '../../server/utils/validators.js';

describe('isValidLatitude', () => {
  it('accepts valid latitudes', () => {
    expect(isValidLatitude(0)).toBe(true);
    expect(isValidLatitude(28.6139)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude('12.345')).toBe(true);
  });

  it('rejects invalid latitudes', () => {
    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLatitude(-91)).toBe(false);
    expect(isValidLatitude('abc')).toBe(false);
    expect(isValidLatitude(NaN)).toBe(false);
  });
});

describe('isValidLongitude', () => {
  it('accepts valid longitudes', () => {
    expect(isValidLongitude(0)).toBe(true);
    expect(isValidLongitude(77.209)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
  });

  it('rejects invalid longitudes', () => {
    expect(isValidLongitude(181)).toBe(false);
    expect(isValidLongitude(-181)).toBe(false);
    expect(isValidLongitude('xyz')).toBe(false);
  });
});

describe('sanitizeText', () => {
  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('truncates to maxLen', () => {
    expect(sanitizeText('abcdefgh', 5)).toBe('abcde');
  });

  it('preserves newlines and tabs', () => {
    expect(sanitizeText('line1\nline2\ttab')).toBe('line1\nline2\ttab');
  });

  it('returns empty string for non-string', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
    expect(sanitizeText(123)).toBe('');
  });
});

describe('isValidPhone', () => {
  it('accepts valid E.164 numbers', () => {
    expect(isValidPhone('+919876543210')).toBe(true);
    expect(isValidPhone('+12025551234')).toBe(true);
    expect(isValidPhone('+441234567890')).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    expect(isValidPhone('9876543210')).toBe(false);
    expect(isValidPhone('+0123')).toBe(false);
    expect(isValidPhone('hello')).toBe(false);
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone(null)).toBe(false);
  });
});

describe('validateAnalyzeRequest', () => {
  it('validates a complete valid request', () => {
    const result = validateAnalyzeRequest({
      latitude: '28.6139',
      longitude: '77.2090',
      sensorData: 'Soil moisture: 45%',
      cropInfo: 'Rice',
      phone: '+919876543210',
      language: 'Hindi',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data.latitude).toBe(28.6139);
    expect(result.data.language).toBe('Hindi');
  });

  it('returns errors for invalid coordinates', () => {
    const result = validateAnalyzeRequest({
      latitude: '999',
      longitude: '-200',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns errors for invalid phone', () => {
    const result = validateAnalyzeRequest({
      phone: 'not-a-phone',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid phone number (use E.164 format, e.g., +919876543210)');
  });

  it('handles empty request gracefully', () => {
    const result = validateAnalyzeRequest({});
    expect(result.valid).toBe(true);
    expect(result.data.language).toBe('English');
  });
});
