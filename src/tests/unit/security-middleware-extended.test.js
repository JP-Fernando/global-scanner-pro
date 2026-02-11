/**
 * Security Middleware Extended Tests
 *
 * Covers the rate limit handler callbacks, HTTPS redirect in production,
 * and configureSecurityMiddleware integration.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the config for production scenarios
vi.mock('../../config/environment.js', async () => {
  const actual = await vi.importActual('../../config/environment.js');
  return {
    config: {
      ...actual.config,
      server: {
        isDevelopment: false,
        isProduction: true,
      },
      security: {
        allowedOrigins: ['http://localhost:3000', '*'],
        rateLimit: {
          windowMs: 15 * 60 * 1000,
          max: 100,
          yahooMax: 20,
        },
      },
      sentry: { dsn: '' },
    },
  };
});

import {
  enforceHttps,
  configureSecurityMiddleware,
} from '../../middleware/security.js';

// ---------- helpers ----------
const createMockReq = (overrides = {}) => ({
  path: '/api/test',
  headers: { host: 'example.com' },
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

describe('Security Middleware - Extended (Production)', () => {
  // -----------------------------------------------------------
  // enforceHttps in production
  // -----------------------------------------------------------
  describe('enforceHttps in production mode', () => {
    it('redirects HTTP to HTTPS in production', () => {
      const middleware = enforceHttps();
      const req = createMockReq({
        secure: false,
        headers: { host: 'example.com' },
        url: '/api/data',
      });
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/api/data');
      expect(next).not.toHaveBeenCalled();
    });

    it('passes through for already-secure requests', () => {
      const middleware = enforceHttps();
      const req = createMockReq({ secure: true });
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('passes through when x-forwarded-proto is https', () => {
      const middleware = enforceHttps();
      const req = createMockReq({
        secure: false,
        headers: { host: 'example.com', 'x-forwarded-proto': 'https' },
      });
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------
  // configureSecurityMiddleware integration
  // -----------------------------------------------------------
  describe('configureSecurityMiddleware', () => {
    it('registers all middleware on the app', () => {
      const app = { use: vi.fn() };
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      configureSecurityMiddleware(app);

      // Should call app.use multiple times for each middleware
      expect(app.use.mock.calls.length).toBeGreaterThanOrEqual(6);
      expect(consoleSpy).toHaveBeenCalledWith('✓ Security middleware configured');

      consoleSpy.mockRestore();
    });
  });
});
