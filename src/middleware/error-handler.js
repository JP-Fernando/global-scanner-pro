/**
 * Centralized Error Handling Middleware
 *
 * This module provides centralized error handling for Express applications,
 * including custom error classes, error formatting, and logging.
 *
 * @module middleware/error-handler
 */

import { log } from '../utils/logger.js';
import { config } from '../config/environment.js';

/**
 * Base error class for application errors
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.details = details;
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

/**
 * External service error (502)
 */
export class ExternalServiceError extends AppError {
  constructor(service, originalError = null) {
    super(`External service error: ${service}`, 502);
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super('Too many requests', 429);
    this.retryAfter = retryAfter;
  }
}

/**
 * Determines if an error is operational (expected) or programming error
 * @param {Error} error - Error object
 * @returns {boolean} True if operational error
 */
function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Formats error response for client
 * @param {Error} error - Error object
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(error) {
  const response = {
    error: error.message || 'Internal server error',
    timestamp: error.timestamp || new Date().toISOString(),
    statusCode: error.statusCode || 500
  };

  // Add details for validation errors
  if (error instanceof ValidationError && error.details) {
    response.details = error.details;
  }

  // Add retryAfter for rate limit errors
  if (error instanceof RateLimitError) {
    response.retryAfter = error.retryAfter;
  }

  // Add stack trace in development
  if (config.server.isDevelopment && error.stack) {
    response.stack = error.stack;
  }

  // Add request ID if available
  if (error.requestId) {
    response.requestId = error.requestId;
  }

  return response;
}

/**
 * Logs error with appropriate level and context
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 */
function logError(error, req) {
  const errorContext = {
    requestId: req?.id,
    method: req?.method,
    url: req?.originalUrl || req?.url,
    ip: req?.ip,
    userAgent: req?.get?.('user-agent'),
    statusCode: error.statusCode,
    isOperational: isOperationalError(error)
  };

  if (error.statusCode >= 500 || !isOperationalError(error)) {
    log.error(error.message, {
      ...errorContext,
      stack: error.stack,
      originalError: error.originalError
    });
  } else if (error.statusCode >= 400) {
    log.warn(error.message, errorContext);
  } else {
    log.info(error.message, errorContext);
  }
}

/**
 * Error handling middleware
 * Catches and formats all errors
 */
export function errorHandler(err, req, res, next) {
  // Add request ID to error
  if (req.id) {
    err.requestId = req.id;
  }

  // Log error
  logError(err, req);

  // Send error response
  const errorResponse = formatErrorResponse(err);
  res.status(errorResponse.statusCode).json(errorResponse);
}

/**
 * Not found middleware
 * Handles requests to non-existent routes
 */
export function notFoundHandler(req, res, next) {
  const error = new NotFoundError('Endpoint');
  error.requestId = req.id;
  next(error);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 *
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 *
 * @example
 * app.get('/api/data', asyncHandler(async (req, res) => {
 *   const data = await fetchData();
 *   res.json(data);
 * }));
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global unhandled rejection handler
 * Logs unhandled promise rejections
 */
export function setupUnhandledRejectionHandler() {
  process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Promise Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString()
    });

    // In production, we might want to gracefully shutdown
    if (config.server.isProduction) {
      log.error('Initiating graceful shutdown due to unhandled rejection');
      gracefulShutdown('unhandledRejection');
    }
  });
}

/**
 * Global uncaught exception handler
 * Logs uncaught exceptions and initiates graceful shutdown
 */
export function setupUncaughtExceptionHandler() {
  process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack
    });

    // Uncaught exceptions are serious, always shutdown
    gracefulShutdown('uncaughtException');
  });
}

/**
 * Graceful shutdown handler
 * @param {string} reason - Shutdown reason
 */
function gracefulShutdown(reason) {
  log.error(`Graceful shutdown initiated: ${reason}`);

  // Give time for pending requests to complete
  setTimeout(() => {
    log.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000); // 10 seconds

  // Close server and exit
  // Note: In a real application, you would close the server here
  // server.close(() => {
  //   log.info('Server closed');
  //   process.exit(1);
  // });
}

/**
 * Setup all error handlers
 */
export function setupErrorHandlers() {
  setupUnhandledRejectionHandler();
  setupUncaughtExceptionHandler();
  console.log('✓ Error handlers configured');
}

export default {
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
  isOperationalError,
  formatErrorResponse,
  setupErrorHandlers
};
