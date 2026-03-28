import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ExternalServiceError,
} from '../../server/utils/errors.js';

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    it('creates error with status code and error code', () => {
      const err = new AppError('Something went wrong', 500, 'INTERNAL_ERROR');
      expect(err.message).toBe('Something went wrong');
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('INTERNAL_ERROR');
      expect(err.isOperational).toBe(true);
      expect(err instanceof Error).toBe(true);
    });

    it('has default status code and error code', () => {
      const err = new AppError('test');
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('creates 400 error with details array', () => {
      const err = new ValidationError('Invalid input', ['field1 is required']);
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.details).toEqual(['field1 is required']);
    });
  });

  describe('NotFoundError', () => {
    it('creates 404 error with resource name', () => {
      const err = new NotFoundError('Analysis');
      expect(err.statusCode).toBe(404);
      expect(err.message).toContain('Analysis');
    });
  });

  describe('RateLimitError', () => {
    it('creates 429 error', () => {
      const err = new RateLimitError();
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('RATE_LIMIT');
    });
  });

  describe('ExternalServiceError', () => {
    it('creates 502 error with service name', () => {
      const err = new ExternalServiceError('Gemini', 'API timeout');
      expect(err.statusCode).toBe(502);
      expect(err.message).toContain('Gemini');
      expect(err.service).toBe('Gemini');
    });
  });
});
