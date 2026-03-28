import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Logger', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('uses console logging in development mode', async () => {
    vi.mock('../../server/config.js', () => ({
      default: {
        nodeEnv: 'development',
        gcpProjectId: '',
      },
    }));

    vi.mock('@google-cloud/logging', () => ({
      Logging: vi.fn(),
    }));

    const logger = (await import('../../server/services/logger.js')).default;
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await logger.info('test message', { key: 'value' });
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('initializes cloud logging in production', async () => {
    vi.mock('../../server/config.js', () => ({
      default: {
        nodeEnv: 'production',
        gcpProjectId: 'test-project',
      },
    }));

    const mockEntry = vi.fn().mockReturnValue({});
    const mockWrite = vi.fn().mockResolvedValue();
    const mockLog = vi.fn().mockReturnValue({
      entry: mockEntry,
      write: mockWrite,
    });

    vi.mock('@google-cloud/logging', () => ({
      Logging: vi.fn().mockImplementation(() => ({
        log: mockLog,
      })),
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = (await import('../../server/services/logger.js')).default;

    // Cloud logging should be initialized — verify the module loaded
    expect(logger.info).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');

    logSpy.mockRestore();
  });

  it('falls back to console when cloud logging write fails', async () => {
    vi.mock('../../server/config.js', () => ({
      default: {
        nodeEnv: 'production',
        gcpProjectId: 'test-project',
      },
    }));

    const mockEntry = vi.fn().mockReturnValue({});
    const mockWrite = vi.fn().mockRejectedValue(new Error('Cloud Logging quota exceeded'));
    const mockLog = vi.fn().mockReturnValue({
      entry: mockEntry,
      write: mockWrite,
    });

    vi.mock('@google-cloud/logging', () => ({
      Logging: vi.fn().mockImplementation(() => ({
        log: mockLog,
      })),
    }));

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = (await import('../../server/services/logger.js')).default;
    await logger.error('error test', { code: 500 });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('logs all severity levels', async () => {
    vi.mock('../../server/config.js', () => ({
      default: {
        nodeEnv: 'development',
        gcpProjectId: '',
      },
    }));

    vi.mock('@google-cloud/logging', () => ({
      Logging: vi.fn(),
    }));

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = (await import('../../server/services/logger.js')).default;

    await logger.info('info');
    await logger.warn('warn');
    await logger.error('error');
    await logger.debug('debug');
    await logger.critical('critical');

    expect(consoleSpy).toHaveBeenCalledTimes(5);
    consoleSpy.mockRestore();
  });

  it('includes request ID when provided', async () => {
    vi.mock('../../server/config.js', () => ({
      default: {
        nodeEnv: 'development',
        gcpProjectId: '',
      },
    }));

    vi.mock('@google-cloud/logging', () => ({
      Logging: vi.fn(),
    }));

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = (await import('../../server/services/logger.js')).default;

    await logger.info('with request id', {}, 'req-123');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles cloud logging init failure gracefully', async () => {
    vi.mock('../../server/config.js', () => ({
      default: {
        nodeEnv: 'production',
        gcpProjectId: 'test-project',
      },
    }));

    vi.mock('@google-cloud/logging', () => ({
      Logging: vi.fn().mockImplementation(() => {
        throw new Error('Init failed');
      }),
    }));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = (await import('../../server/services/logger.js')).default;

    // Should still work via console fallback
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await logger.info('fallback test');
    expect(logSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    logSpy.mockRestore();
  });
});
