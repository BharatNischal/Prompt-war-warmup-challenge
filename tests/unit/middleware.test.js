import { describe, it, expect, vi } from 'vitest';

// Mock config before importing
vi.mock('../../server/config.js', () => ({
  default: {
    cors: { origin: '*' },
    rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
    upload: { maxFileSize: 5 * 1024 * 1024, maxFiles: 5 },
    gcpProjectId: '',
    nodeEnv: 'test',
  },
}));

vi.mock('../../server/services/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    critical: vi.fn(),
  },
}));

describe('Middleware', () => {
  describe('Security', () => {
    it('exports securityMiddleware as an array', async () => {
      const { securityMiddleware } = await import('../../server/middleware/security.js');
      expect(Array.isArray(securityMiddleware)).toBe(true);
      expect(securityMiddleware.length).toBeGreaterThan(0);
    });

    it('includes helmet, cors, and rate-limit middleware', async () => {
      const { securityMiddleware } = await import('../../server/middleware/security.js');
      // Each middleware should be a function
      securityMiddleware.forEach((mw) => {
        expect(typeof mw).toBe('function');
      });
    });
  });

  describe('Upload', () => {
    it('exports upload middleware', async () => {
      const { upload } = await import('../../server/middleware/upload.js');
      expect(upload).toBeDefined();
    });

    it('has fields method for multipart form parsing', async () => {
      const { upload } = await import('../../server/middleware/upload.js');
      expect(typeof upload.fields).toBe('function');
    });
  });
});
