/**
 * Security Middleware Tests
 *
 * Tests for Helmet, CORS, rate limiting, HTTPS enforcement,
 * security headers, request ID, and request sanitization.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  configureHelmet,
  configureCors,
  configureGlobalRateLimit,
  configureYahooRateLimit,
  enforceHttps,
  addSecurityHeaders,
  addRequestId,
  sanitizeRequest,
  configureSecurityMiddleware,
} from '../../middleware/security.js';

// ---------- helpers ----------

const createMockReq = (overrides = {}) => ({
  path: '/api/test',
  headers: { host: 'localhost:3000' },
  url: '/api/test',
  secure: false,
  query: {},
  ...overrides,
});

const createMockRes = () => {
  const headers = {};
  return {
    setHeader: vi.fn((key, value) => { headers[key] = value; }),
    getHeader: vi.fn((key) => headers[key]),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    redirect: vi.fn(),
    _headers: headers,
  };
};

const createMockNext = () => vi.fn();

describe('Security Middleware', () => {
  // ---------------------------------------------------------------
  // configureHelmet
  // ---------------------------------------------------------------
  describe('configureHelmet', () => {
    it('returns a middleware function', () => {
      const middleware = configureHelmet();
      expect(middleware).toBeTypeOf('function');
    });
  });

  // ---------------------------------------------------------------
  // configureCors
  // ---------------------------------------------------------------
  describe('configureCors', () => {
    it('returns a middleware function', () => {
      const middleware = configureCors();
      expect(middleware).toBeTypeOf('function');
    });
  });

  // ---------------------------------------------------------------
  // configureGlobalRateLimit
  // ---------------------------------------------------------------
  describe('configureGlobalRateLimit', () => {
    it('returns a middleware function', () => {
      const middleware = configureGlobalRateLimit();
      expect(middleware).toBeTypeOf('function');
    });
  });

  // ---------------------------------------------------------------
  // configureYahooRateLimit
  // ---------------------------------------------------------------
  describe('configureYahooRateLimit', () => {
    it('returns a middleware function', () => {
      const middleware = configureYahooRateLimit();
      expect(middleware).toBeTypeOf('function');
    });
  });

  // ---------------------------------------------------------------
  // enforceHttps
  // ---------------------------------------------------------------
  describe('enforceHttps', () => {
    it('returns a middleware function', () => {
      const middleware = enforceHttps();
      expect(middleware).toBeTypeOf('function');
    });

    it('calls next() in non-production environment', () => {
      const middleware = enforceHttps();
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // addSecurityHeaders
  // ---------------------------------------------------------------
  describe('addSecurityHeaders', () => {
    it('returns a middleware function', () => {
      const middleware = addSecurityHeaders();
      expect(middleware).toBeTypeOf('function');
    });

    it('sets custom security headers', () => {
      const middleware = addSecurityHeaders();
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Security-Policy', "default-src 'self'");
      expect(res.setHeader).toHaveBeenCalledWith('X-WebKit-CSP', "default-src 'self'");
      expect(res.setHeader).toHaveBeenCalledWith('X-Download-Options', 'noopen');
      expect(res.setHeader).toHaveBeenCalledWith('X-Permitted-Cross-Domain-Policies', 'none');
      expect(next).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // addRequestId
  // ---------------------------------------------------------------
  describe('addRequestId', () => {
    it('returns a middleware function', () => {
      const middleware = addRequestId();
      expect(middleware).toBeTypeOf('function');
    });

    it('assigns a unique request ID to req.id', () => {
      const middleware = addRequestId();
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(req.id).toBeTypeOf('string');
      expect(req.id.length).toBeGreaterThan(0);
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.id);
      expect(next).toHaveBeenCalled();
    });

    it('generates unique IDs for each request', () => {
      const middleware = addRequestId();
      const req1 = createMockReq();
      const req2 = createMockReq();
      const res1 = createMockRes();
      const res2 = createMockRes();
      const next = createMockNext();

      middleware(req1, res1, next);
      middleware(req2, res2, next);

      expect(req1.id).not.toBe(req2.id);
    });
  });

  // ---------------------------------------------------------------
  // sanitizeRequest
  // ---------------------------------------------------------------
  describe('sanitizeRequest', () => {
    it('returns a middleware function', () => {
      const middleware = sanitizeRequest();
      expect(middleware).toBeTypeOf('function');
    });

    it('removes null bytes from query parameters', () => {
      const middleware = sanitizeRequest();
      const req = createMockReq({
        query: { symbol: 'AAPL\0' },
      });
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(req.query.symbol).toBe('AAPL');
      expect(next).toHaveBeenCalled();
    });

    it('removes control characters from query parameters', () => {
      const middleware = sanitizeRequest();
      const req = createMockReq({
        query: { symbol: 'AAPL\x01\x02\x03' },
      });
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(req.query.symbol).toBe('AAPL');
      expect(next).toHaveBeenCalled();
    });

    it('preserves valid query parameters', () => {
      const middleware = sanitizeRequest();
      const req = createMockReq({
        query: { symbol: 'AAPL', from: '1234567890' },
      });
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(req.query.symbol).toBe('AAPL');
      expect(req.query.from).toBe('1234567890');
    });

    it('handles requests with no query parameters', () => {
      const middleware = sanitizeRequest();
      const req = createMockReq({ query: undefined });
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('handles non-string query parameters', () => {
      const middleware = sanitizeRequest();
      const req = createMockReq({
        query: { page: 1, active: true, name: 'test\0value' },
      });
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(req.query.page).toBe(1);
      expect(req.query.active).toBe(true);
      expect(req.query.name).toBe('testvalue');
    });
  });

  // ---------------------------------------------------------------
  // configureSecurityMiddleware
  // ---------------------------------------------------------------
  describe('configureSecurityMiddleware', () => {
    it('applies all middleware to the app', () => {
      const app = { use: vi.fn() };
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      configureSecurityMiddleware(app);

      // Should call app.use multiple times
      expect(app.use.mock.calls.length).toBeGreaterThanOrEqual(5);
      consoleSpy.mockRestore();
    });
  });
});
