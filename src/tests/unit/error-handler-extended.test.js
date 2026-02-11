/**
 * Error Handler Extended Tests
 *
 * Covers setupUnhandledRejectionHandler, setupUncaughtExceptionHandler,
 * setupErrorHandlers, logError info path, and gracefulShutdown.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the logger
vi.mock('../../utils/logger.js', () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock config
vi.mock('../../config/environment.js', () => ({
  config: {
    server: {
      isDevelopment: true,
      isProduction: false,
    },
  },
}));

import {
  AppError,
  errorHandler,
  setupUnhandledRejectionHandler,
  setupUncaughtExceptionHandler,
  setupErrorHandlers,
} from '../../middleware/error-handler.js';
import { log } from '../../utils/logger.js';

// Helper to create mock request/response
const createMockReq = (overrides = {}) => ({
  id: 'test-request-id',
  method: 'GET',
  originalUrl: '/api/test',
  ip: '127.0.0.1',
  get: vi.fn((header) => {
    if (header === 'user-agent') return 'Test Agent';
    return undefined;
  }),
  ...overrides,
});

const createMockRes = () => {
  const res = {
    statusCode: 200,
    jsonData: null,
  };
  res.status = vi.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((data) => {
    res.jsonData = data;
    return res;
  });
  return res;
};

describe('Error Handler - Extended', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------
  // logError info path (statusCode < 400)
  // -----------------------------------------------------------
  describe('logError info path', () => {
    it('logs at info level for errors with statusCode < 400', () => {
      const error = new AppError('Redirect', 301);
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(log.info).toHaveBeenCalled();
    });

    it('logs at warn level for 4xx errors', () => {
      const error = new AppError('Bad request', 400);
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(log.warn).toHaveBeenCalled();
    });

    it('logs at error level for 5xx errors', () => {
      const error = new AppError('Server error', 500);
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(log.error).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------
  // setupUnhandledRejectionHandler
  // -----------------------------------------------------------
  describe('setupUnhandledRejectionHandler', () => {
    let originalListeners;

    beforeEach(() => {
      originalListeners = process.listeners('unhandledRejection');
      process.removeAllListeners('unhandledRejection');
    });

    afterEach(() => {
      process.removeAllListeners('unhandledRejection');
      originalListeners.forEach(listener => {
        process.on('unhandledRejection', listener);
      });
    });

    it('registers an unhandledRejection listener', () => {
      const before = process.listenerCount('unhandledRejection');
      setupUnhandledRejectionHandler();
      const after = process.listenerCount('unhandledRejection');

      expect(after).toBe(before + 1);
    });

    it('logs unhandled rejections', () => {
      setupUnhandledRejectionHandler();

      const listener = process.listeners('unhandledRejection').pop();
      const reason = new Error('Unhandled test rejection');
      const promise = Promise.resolve();

      listener(reason, promise);

      expect(log.error).toHaveBeenCalledWith(
        'Unhandled Promise Rejection',
        expect.objectContaining({
          reason: 'Unhandled test rejection',
        })
      );
    });

    it('handles non-error rejection reasons', () => {
      setupUnhandledRejectionHandler();

      const listener = process.listeners('unhandledRejection').pop();
      listener('string reason', Promise.resolve());

      expect(log.error).toHaveBeenCalledWith(
        'Unhandled Promise Rejection',
        expect.objectContaining({
          reason: 'string reason',
        })
      );
    });
  });

  // -----------------------------------------------------------
  // setupUncaughtExceptionHandler
  // -----------------------------------------------------------
  describe('setupUncaughtExceptionHandler', () => {
    let originalListeners;

    beforeEach(() => {
      originalListeners = process.listeners('uncaughtException');
      process.removeAllListeners('uncaughtException');
    });

    afterEach(() => {
      process.removeAllListeners('uncaughtException');
      originalListeners.forEach(listener => {
        process.on('uncaughtException', listener);
      });
    });

    it('registers an uncaughtException listener', () => {
      const before = process.listenerCount('uncaughtException');
      setupUncaughtExceptionHandler();
      const after = process.listenerCount('uncaughtException');

      expect(after).toBe(before + 1);
    });

    it('logs uncaught exceptions', () => {
      setupUncaughtExceptionHandler();

      const listener = process.listeners('uncaughtException').pop();
      const error = new Error('Uncaught test exception');

      // Mock process.exit so we don't actually exit
      const originalExit = process.exit;
      process.exit = vi.fn();
      const originalSetTimeout = globalThis.setTimeout;
      globalThis.setTimeout = vi.fn();

      listener(error);

      expect(log.error).toHaveBeenCalledWith(
        'Uncaught Exception',
        expect.objectContaining({
          message: 'Uncaught test exception',
        })
      );

      process.exit = originalExit;
      globalThis.setTimeout = originalSetTimeout;
    });
  });

  // -----------------------------------------------------------
  // setupErrorHandlers
  // -----------------------------------------------------------
  describe('setupErrorHandlers', () => {
    let originalRejectionListeners;
    let originalExceptionListeners;

    beforeEach(() => {
      originalRejectionListeners = process.listeners('unhandledRejection');
      originalExceptionListeners = process.listeners('uncaughtException');
      process.removeAllListeners('unhandledRejection');
      process.removeAllListeners('uncaughtException');
    });

    afterEach(() => {
      process.removeAllListeners('unhandledRejection');
      process.removeAllListeners('uncaughtException');
      originalRejectionListeners.forEach(l => process.on('unhandledRejection', l));
      originalExceptionListeners.forEach(l => process.on('uncaughtException', l));
    });

    it('sets up both handlers', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      setupErrorHandlers();

      expect(process.listenerCount('unhandledRejection')).toBeGreaterThanOrEqual(1);
      expect(process.listenerCount('uncaughtException')).toBeGreaterThanOrEqual(1);
      expect(consoleSpy).toHaveBeenCalledWith('✓ Error handlers configured');

      consoleSpy.mockRestore();
    });
  });
});
