/**
 * Error Handler Middleware Tests
 *
 * Tests for centralized error handling including custom error classes,
 * error formatting, and Express middleware.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
  DatabaseError,
  RateLimitError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
} from '../../middleware/error-handler.js';

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

describe('Error Handler Middleware', () => {
  // -----------------------------------------------------------
  // Custom Error Classes
  // -----------------------------------------------------------
  describe('Custom Error Classes', () => {
    describe('AppError', () => {
      it('creates error with default values', () => {
        const error = new AppError('Test error');
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.isOperational).toBe(true);
        expect(error.timestamp).toBeDefined();
      });

      it('creates error with custom status code', () => {
        const error = new AppError('Custom error', 418);
        expect(error.statusCode).toBe(418);
      });

      it('creates non-operational error', () => {
        const error = new AppError('Critical error', 500, false);
        expect(error.isOperational).toBe(false);
      });

      it('has captured stack trace', () => {
        const error = new AppError('Error with stack');
        expect(error.stack).toBeDefined();
        // Stack trace includes the file where error was created
        expect(error.stack).toContain('Error with stack');
      });
    });

    describe('ValidationError', () => {
      it('creates with 400 status code', () => {
        const error = new ValidationError('Invalid input');
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Invalid input');
      });

      it('stores validation details', () => {
        const details = [{ field: 'email', message: 'Invalid format' }];
        const error = new ValidationError('Validation failed', details);
        expect(error.details).toEqual(details);
      });
    });

    describe('AuthenticationError', () => {
      it('creates with 401 status code and default message', () => {
        const error = new AuthenticationError();
        expect(error.statusCode).toBe(401);
        expect(error.message).toBe('Authentication required');
      });

      it('creates with custom message', () => {
        const error = new AuthenticationError('Invalid token');
        expect(error.message).toBe('Invalid token');
      });
    });

    describe('AuthorizationError', () => {
      it('creates with 403 status code and default message', () => {
        const error = new AuthorizationError();
        expect(error.statusCode).toBe(403);
        expect(error.message).toBe('Insufficient permissions');
      });
    });

    describe('NotFoundError', () => {
      it('creates with 404 status code and default resource', () => {
        const error = new NotFoundError();
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('Resource not found');
      });

      it('creates with custom resource name', () => {
        const error = new NotFoundError('User');
        expect(error.message).toBe('User not found');
      });
    });

    describe('ConflictError', () => {
      it('creates with 409 status code', () => {
        const error = new ConflictError();
        expect(error.statusCode).toBe(409);
        expect(error.message).toBe('Resource conflict');
      });

      it('creates with custom message', () => {
        const error = new ConflictError('Email already exists');
        expect(error.message).toBe('Email already exists');
      });
    });

    describe('ExternalServiceError', () => {
      it('creates with 502 status code', () => {
        const error = new ExternalServiceError('Yahoo Finance');
        expect(error.statusCode).toBe(502);
        expect(error.message).toBe('External service error: Yahoo Finance');
        expect(error.service).toBe('Yahoo Finance');
      });

      it('stores original error', () => {
        const originalError = new Error('Connection timeout');
        const error = new ExternalServiceError('API', originalError);
        expect(error.originalError).toBe(originalError);
      });
    });

    describe('DatabaseError', () => {
      it('creates with 500 status code', () => {
        const error = new DatabaseError();
        expect(error.statusCode).toBe(500);
        expect(error.message).toBe('Database operation failed');
      });

      it('stores original error', () => {
        const originalError = new Error('Connection refused');
        const error = new DatabaseError('Query failed', originalError);
        expect(error.originalError).toBe(originalError);
      });
    });

    describe('RateLimitError', () => {
      it('creates with 429 status code and default retry', () => {
        const error = new RateLimitError();
        expect(error.statusCode).toBe(429);
        expect(error.message).toBe('Too many requests');
        expect(error.retryAfter).toBe(60);
      });

      it('creates with custom retry time', () => {
        const error = new RateLimitError(120);
        expect(error.retryAfter).toBe(120);
      });
    });
  });

  // -----------------------------------------------------------
  // Error Handler Middleware
  // -----------------------------------------------------------
  describe('errorHandler()', () => {
    it('handles AppError correctly', () => {
      const error = new AppError('Test app error', 400);
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.jsonData.error).toBe('Test app error');
      expect(res.jsonData.statusCode).toBe(400);
    });

    it('adds request ID to error response', () => {
      const error = new AppError('Error with request ID');
      const req = createMockReq({ id: 'req-123' });
      const res = createMockRes();
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(res.jsonData.requestId).toBe('req-123');
    });

    it('includes validation details for ValidationError', () => {
      const details = [{ field: 'email', message: 'Required' }];
      const error = new ValidationError('Validation failed', details);
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(res.jsonData.details).toEqual(details);
    });

    it('includes retryAfter for RateLimitError', () => {
      const error = new RateLimitError(300);
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(res.jsonData.retryAfter).toBe(300);
    });

    it('handles generic Error objects', () => {
      const error = new Error('Generic error');
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.jsonData.error).toBe('Generic error');
    });

    it('includes stack trace in development', () => {
      const error = new AppError('Dev error');
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(res.jsonData.stack).toBeDefined();
    });
  });

  // -----------------------------------------------------------
  // Not Found Handler
  // -----------------------------------------------------------
  describe('notFoundHandler()', () => {
    it('creates NotFoundError and calls next', () => {
      const req = createMockReq({ id: 'req-456' });
      const res = createMockRes();
      const next = vi.fn();

      notFoundHandler(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Endpoint not found');
      expect(error.requestId).toBe('req-456');
    });
  });

  // -----------------------------------------------------------
  // Async Handler Wrapper
  // -----------------------------------------------------------
  describe('asyncHandler()', () => {
    it('passes successful async result through', async () => {
      const handler = async (req, res) => {
        res.json({ success: true });
      };

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const wrapped = asyncHandler(handler);
      await wrapped(req, res, next);

      expect(res.jsonData).toEqual({ success: true });
      expect(next).not.toHaveBeenCalled();
    });

    it('catches async errors and calls next', async () => {
      const handler = async () => {
        throw new Error('Async error');
      };

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const wrapped = asyncHandler(handler);
      await wrapped(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0][0].message).toBe('Async error');
    });

    it('catches rejected promises', async () => {
      const handler = () => {
        return Promise.reject(new AppError('Rejected promise', 400));
      };

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const wrapped = asyncHandler(handler);
      await wrapped(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
    });

    it('handles synchronous functions that return promise', async () => {
      const handler = (req, res) => {
        return Promise.resolve().then(() => {
          res.json({ sync: true });
        });
      };

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const wrapped = asyncHandler(handler);
      await wrapped(req, res, next);

      expect(res.jsonData).toEqual({ sync: true });
    });
  });

  // -----------------------------------------------------------
  // Error Inheritance
  // -----------------------------------------------------------
  describe('Error Inheritance', () => {
    it('all custom errors extend AppError', () => {
      expect(new ValidationError('test')).toBeInstanceOf(AppError);
      expect(new AuthenticationError()).toBeInstanceOf(AppError);
      expect(new AuthorizationError()).toBeInstanceOf(AppError);
      expect(new NotFoundError()).toBeInstanceOf(AppError);
      expect(new ConflictError()).toBeInstanceOf(AppError);
      expect(new ExternalServiceError('api')).toBeInstanceOf(AppError);
      expect(new DatabaseError()).toBeInstanceOf(AppError);
      expect(new RateLimitError()).toBeInstanceOf(AppError);
    });

    it('all custom errors extend Error', () => {
      expect(new ValidationError('test')).toBeInstanceOf(Error);
      expect(new AppError('test')).toBeInstanceOf(Error);
    });

    it('all custom errors are operational by default', () => {
      expect(new ValidationError('test').isOperational).toBe(true);
      expect(new AuthenticationError().isOperational).toBe(true);
      expect(new NotFoundError().isOperational).toBe(true);
      expect(new RateLimitError().isOperational).toBe(true);
    });
  });
});
