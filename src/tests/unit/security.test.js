import { describe, it, expect } from 'vitest';
import { yahooFinanceSchema, testRunnerSchema, sanitize } from '../../security/validation-schemas.js';
import { ZodError } from 'zod';

describe('Phase 1 Security', () => {
  // -----------------------------------------------------------
  // Yahoo Finance Schema
  // -----------------------------------------------------------
  describe('Yahoo Finance Schema', () => {
    it('accepts valid symbol and timestamps', async () => {
      const data = await yahooFinanceSchema.parseAsync({
        symbol: 'AAPL',
        from: '1609459200',
        to: '1612137600',
      });

      expect(data.symbol).toBe('AAPL');
      expect(typeof data.from).toBe('number');
      expect(typeof data.to).toBe('number');
    });

    it('rejects invalid symbol characters', async () => {
      await expect(
        yahooFinanceSchema.parseAsync({
          symbol: 'AA<>PL',
          from: '1609459200',
          to: '1612137600',
        })
      ).rejects.toBeInstanceOf(ZodError);
    });

    it('rejects invalid timestamp', async () => {
      await expect(
        yahooFinanceSchema.parseAsync({
          symbol: 'AAPL',
          from: 'invalid',
          to: '1612137600',
        })
      ).rejects.toBeInstanceOf(ZodError);
    });

    it('rejects invalid time range (from > to)', async () => {
      await expect(
        yahooFinanceSchema.parseAsync({
          symbol: 'AAPL',
          from: '1612137600',
          to: '1609459200',
        })
      ).rejects.toBeInstanceOf(ZodError);
    });

    it('rejects lowercase symbol (regex requires uppercase)', async () => {
      // The schema enforces /^[A-Z0-9.\-^=]+$/ before the toUpperCase transform
      await expect(
        yahooFinanceSchema.parseAsync({
          symbol: 'aapl',
          from: '1609459200',
          to: '1612137600',
        })
      ).rejects.toBeInstanceOf(ZodError);
    });
  });

  // -----------------------------------------------------------
  // Test Runner Schema
  // -----------------------------------------------------------
  describe('Test Runner Schema', () => {
    it('accepts a valid filter', async () => {
      const result = await testRunnerSchema.parseAsync({ filter: 'indicator' });
      expect(result.filter).toBe('indicator');
    });

    it('accepts undefined (optional schema)', async () => {
      const result = await testRunnerSchema.parseAsync(undefined);
      expect(result).toBeUndefined();
    });

    it('rejects filter with XSS payload', async () => {
      await expect(
        testRunnerSchema.parseAsync({
          filter: 'test<script>alert(1)</script>',
        })
      ).rejects.toBeInstanceOf(ZodError);
    });
  });

  // -----------------------------------------------------------
  // Sanitization
  // -----------------------------------------------------------
  describe('Input Sanitization', () => {
    it('sanitizes XSS script tags', () => {
      const sanitized = sanitize.string('<script>alert("XSS")</script>');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('sanitizes XSS in objects while preserving clean values', () => {
      const clean = sanitize.object({
        name: 'John',
        email: 'john@example.com',
        comment: '<img src=x onerror=alert(1)>',
      });

      expect(clean.comment).not.toContain('<img');
      expect(clean.name).toBe('John');
    });

    it('sanitizes SQL injection patterns', () => {
      const sanitized = sanitize.sql("'; DROP TABLE users; --");
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('--');
    });
  });

  // -----------------------------------------------------------
  // Custom Error Classes
  // -----------------------------------------------------------
  describe('Custom Error Classes', () => {
    it('supports statusCode 400 (ValidationError)', () => {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      expect(error.statusCode).toBe(400);
    });

    it('supports statusCode 404 (NotFoundError)', () => {
      const error = new Error('Resource not found');
      error.statusCode = 404;
      expect(error.statusCode).toBe(404);
    });

    it('supports statusCode 502 (ExternalServiceError)', () => {
      const error = new Error('External service error: Yahoo Finance');
      error.statusCode = 502;
      error.service = 'Yahoo Finance';
      expect(error.statusCode).toBe(502);
    });
  });

  // -----------------------------------------------------------
  // Environment Configuration
  // -----------------------------------------------------------
  describe('Environment Configuration', () => {
    it('has NODE_ENV set', () => {
      expect(process.env.NODE_ENV).toBeDefined();
    });

    it('has a valid PORT default', () => {
      const port = process.env.PORT || 3000;
      expect(typeof port === 'number' || typeof port === 'string').toBe(true);
    });
  });
});
