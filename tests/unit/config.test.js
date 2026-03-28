import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Config', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GCP_PROJECT_ID = 'test-project';
    process.env.GCS_BUCKET = 'test-bucket';
    process.env.NODE_ENV = 'test';
  });

  it('loads required GEMINI_API_KEY', async () => {
    vi.mock('dotenv/config', () => ({}));
    const config = (await import('../../server/config.js')).default;
    expect(config.geminiApiKey).toBe('test-key');
  });

  it('sets default port to 8080', async () => {
    delete process.env.PORT;
    const config = (await import('../../server/config.js')).default;
    expect(config.port).toBe(8080);
  });

  it('loads GCP configuration', async () => {
    const config = (await import('../../server/config.js')).default;
    expect(config.gcpProjectId).toBe('test-project');
    expect(config.gcsBucket).toBe('test-bucket');
  });

  it('sets upload limits', async () => {
    const config = (await import('../../server/config.js')).default;
    expect(config.upload.maxFileSize).toBe(5 * 1024 * 1024);
    expect(config.upload.maxFiles).toBe(5);
  });

  it('configures rate limiting', async () => {
    const config = (await import('../../server/config.js')).default;
    expect(config.rateLimit.windowMs).toBe(15 * 60 * 1000);
    expect(config.rateLimit.max).toBe(100);
  });

  it('defaults CORS origin to wildcard', async () => {
    delete process.env.CORS_ORIGIN;
    const config = (await import('../../server/config.js')).default;
    expect(config.cors.origin).toBe('*');
  });

  it('exits when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(async () => {
      await import('../../server/config.js');
    }).rejects.toThrow('process.exit called');

    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
    mockError.mockRestore();
  });
});
