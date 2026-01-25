/**
 * Structured Logging System
 *
 * This module provides a Winston-based structured logging system
 * with support for multiple transports, log levels, and contextual logging.
 *
 * @module utils/logger
 */

import winston from 'winston';
import { config } from '../config/environment.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure logs directory exists
const logsDir = path.resolve(process.cwd(), config.logging.filePath);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom format for development environment
 * Provides colorized, pretty-printed logs
 */
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += `\n${JSON.stringify(metadata, null, 2)}`;
    }

    // Add stack trace for errors
    if (stack) {
      msg += `\n${stack}`;
    }

    return msg;
  })
);

/**
 * Custom format for production environment
 * Provides structured JSON logs for parsing by log aggregation tools
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Sanitize log data to prevent logging sensitive information
 * @param {any} data - Data to sanitize
 * @returns {any} Sanitized data
 */
function sanitizeLogData(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'session',
    'sessionId',
    'creditCard',
    'ssn'
  ];

  const sanitized = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: config.logging.level,
  format: config.server.isProduction ? productionFormat : developmentFormat,
  defaultMeta: {
    service: 'global-scanner-pro',
    environment: config.server.env,
    version: '0.0.5'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true
    }),

    // File transport for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: config.logging.maxFiles,
      tailable: true,
      handleExceptions: true,
      handleRejections: true
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: config.logging.maxFiles,
      tailable: true
    }),

    // File transport for HTTP requests (info level and above)
    new winston.transports.File({
      filename: path.join(logsDir, 'http.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: config.logging.maxFiles,
      tailable: true
    })
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880,
      maxFiles: config.logging.maxFiles
    })
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880,
      maxFiles: config.logging.maxFiles
    })
  ]
});

/**
 * Create a child logger with additional context
 * @param {Object} context - Additional context to add to all log entries
 * @returns {Object} Child logger instance
 */
export function createChildLogger(context) {
  return logger.child(sanitizeLogData(context));
}

/**
 * Log with request context
 * @param {Object} req - Express request object
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} [metadata={}] - Additional metadata
 */
export function logWithRequest(req, level, message, metadata = {}) {
  const requestContext = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  };

  logger.log(level, message, {
    ...requestContext,
    ...sanitizeLogData(metadata)
  });
}

/**
 * Express middleware for HTTP request logging
 * @returns {Function} Express middleware
 */
export function httpLogger() {
  return (req, res, next) => {
    const startTime = Date.now();

    // Log when response finishes
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logLevel = res.statusCode >= 500 ? 'error' :
                      res.statusCode >= 400 ? 'warn' : 'http';

      logWithRequest(req, logLevel, `${req.method} ${req.originalUrl}`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('content-length')
      });
    });

    next();
  };
}

/**
 * Wrapper functions for common log levels
 */
export const log = {
  error: (message, metadata) => logger.error(message, sanitizeLogData(metadata)),
  warn: (message, metadata) => logger.warn(message, sanitizeLogData(metadata)),
  info: (message, metadata) => logger.info(message, sanitizeLogData(metadata)),
  http: (message, metadata) => logger.http(message, sanitizeLogData(metadata)),
  verbose: (message, metadata) => logger.verbose(message, sanitizeLogData(metadata)),
  debug: (message, metadata) => logger.debug(message, sanitizeLogData(metadata)),
  silly: (message, metadata) => logger.silly(message, sanitizeLogData(metadata))
};

/**
 * Log performance metrics
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @param {Object} [metadata={}] - Additional metadata
 */
export function logPerformance(operation, duration, metadata = {}) {
  logger.info(`Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    ...sanitizeLogData(metadata)
  });
}

/**
 * Log security events
 * @param {string} event - Security event type
 * @param {Object} details - Event details
 */
export function logSecurityEvent(event, details) {
  logger.warn(`Security Event: ${event}`, {
    securityEvent: event,
    ...sanitizeLogData(details)
  });
}

/**
 * Log business metrics
 * @param {string} metric - Metric name
 * @param {number} value - Metric value
 * @param {Object} [metadata={}] - Additional metadata
 */
export function logMetric(metric, value, metadata = {}) {
  logger.info(`Metric: ${metric}`, {
    metric,
    value,
    ...sanitizeLogData(metadata)
  });
}

// Export logger instance as default
export default logger;
