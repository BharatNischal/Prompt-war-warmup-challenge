/**
 * Tests for the cloud logging write path and failure fallback.
 * Covers logger.js lines 42-49 (cloud write + catch fallback).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('dotenv/config', () => ({}));
vi.mock('@google-cloud/logging', () => ({
  Logging: vi.fn(),
}));

// Mock config to avoid process.exit on missing GEMINI_API_KEY
vi.mock('../../server/config.js', () => ({
  default: {
    nodeEnv: 'development',
    gcpProjectId: '',
  },
}));

describe('Logger — cloud write & fallback paths', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes to Cloud Logging when cloudLogger is set (lines 42-45)', async () => {
    const { default: logger, _setCloudLogger } = await import(
      '../../server/services/logger.js'
    );

    const mockWrite = vi.fn().mockResolvedValue();
    const mockEntry = vi.fn().mockReturnValue({ data: 'entry' });
    _setCloudLogger({ entry: mockEntry, write: mockWrite });

    vi.spyOn(console, 'log').mockImplementation(() => {});

    await logger.info('cloud test', { k: 'v' });

    expect(mockEntry).toHaveBeenCalled();
    expect(mockWrite).toHaveBeenCalled();

    _setCloudLogger(null);
  });

  it('falls back to console.log when cloud write fails (lines 46-48)', async () => {
    const { default: logger, _setCloudLogger } = await import(
      '../../server/services/logger.js'
    );

    _setCloudLogger({
      entry: vi.fn().mockReturnValue({}),
      write: vi.fn().mockRejectedValue(new Error('Cloud Logging down')),
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await logger.error('fallback test', { k: 'v' });

    // The catch block calls console.log(JSON.stringify(entry))
    const jsonCall = logSpy.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('severity'),
    );
    expect(jsonCall).toBeTruthy();

    logSpy.mockRestore();
    _setCloudLogger(null);
  });
});
