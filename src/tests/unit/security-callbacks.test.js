/**
 * Security Middleware Callback Tests
 *
 * Tests the CORS origin validation callback, rate-limit handler callbacks,
 * and rate-limit skip function that are not covered by the middleware
 * integration tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture callbacks passed to cors(), rateLimit(), helmet()
let capturedCorsOptions = null;
let capturedGlobalRateLimitOptions = null;
let capturedYahooRateLimitOptions = null;

vi.mock('helmet', () => ({
  default: (_options) => (_req, _res, next) => next(),
}));

vi.mock('cors', () => ({
  default: (options) => {
    capturedCorsOptions = options;
    return (req, res, next) => next();
  },
}));

vi.mock('express-rate-limit', () => ({
  default: (options) => {
    // Distinguish between global and yahoo rate limiters by checking the message
    if (options.message?.error === 'Too many Yahoo Finance requests') {
      capturedYahooRateLimitOptions = options;
    } else {
      capturedGlobalRateLimitOptions = options;
    }
    return (req, res, next) => next();
  },
}));

vi.mock('../../config/environment.js', () => ({
  config: {
    server: { isDevelopment: true, isProduction: false },
    security: {
      allowedOrigins: ['http://localhost:3000', 'http://trusted.example.com'],
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100,
        yahooMax: 20,
      },
    },
    sentry: { dsn: '' },
  },
}));

// Import after mocks
import {
  configureCors,
  configureGlobalRateLimit,
  configureYahooRateLimit,
} from '../../middleware/security.js';

describe('Security Callbacks', () => {
  beforeEach(() => {
    capturedCorsOptions = null;
    capturedGlobalRateLimitOptions = null;
    capturedYahooRateLimitOptions = null;
  });

  // -----------------------------------------------------------
  // CORS origin callback
  // -----------------------------------------------------------
  describe('CORS origin callback', () => {
    it('allows requests with no origin (null)', () => {
      configureCors();
      const callback = vi.fn();

      capturedCorsOptions.origin(null, callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('allows requests with no origin (undefined)', () => {
      configureCors();
      const callback = vi.fn();

      capturedCorsOptions.origin(undefined, callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('allows a listed origin', () => {
      configureCors();
      const callback = vi.fn();

      capturedCorsOptions.origin('http://localhost:3000', callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('rejects an unlisted origin', () => {
      configureCors();
      const callback = vi.fn();

      capturedCorsOptions.origin('http://evil.example.com', callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // -----------------------------------------------------------
  // Global rate limit handler
  // -----------------------------------------------------------
  describe('Global rate limit handler', () => {
    it('responds with 429 and error details', () => {
      configureGlobalRateLimit();

      const req = {};
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      capturedGlobalRateLimitOptions.handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many requests',
          retryAfter: expect.any(Number),
          timestamp: expect.any(String),
        })
      );
    });

    it('skips health check endpoint', () => {
      configureGlobalRateLimit();

      const skipFn = capturedGlobalRateLimitOptions.skip;
      expect(skipFn({ path: '/api/health' })).toBe(true);
      expect(skipFn({ path: '/api/data' })).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // Yahoo rate limit handler
  // -----------------------------------------------------------
  describe('Yahoo rate limit handler', () => {
    it('responds with 429 and Yahoo-specific error', () => {
      configureYahooRateLimit();

      const req = {};
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      capturedYahooRateLimitOptions.handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many Yahoo Finance requests',
          retryAfter: 60,
          timestamp: expect.any(String),
        })
      );
    });
  });
});
