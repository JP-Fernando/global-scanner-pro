/**
 * Structured Logging System
 *
 * This module provides a Winston-based structured logging system with daily log
 * rotation (winston-daily-rotate-file), ELK-compatible JSON output, and support
 * for multiple transports, log levels, and contextual logging.
 *
 * Log files:
 *   logs/combined-YYYY-MM-DD.log  — all log levels (rotated daily, 14-day retention)
 *   logs/error-YYYY-MM-DD.log     — errors only (rotated daily, 30-day retention)
 *   logs/http-YYYY-MM-DD.log      — HTTP access logs (rotated daily, 7-day retention)
 *   logs/exceptions.log           — uncaught exceptions
 *   logs/rejections.log           — unhandled promise rejections
 *
 * @module utils/logger
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config/environment.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type { Request, Response, NextFunction } from 'express';

const __dirname: string = path.dirname(fileURLToPath(import.meta.url));

// Ensure logs directory exists
const logsDir: string = path.resolve(process.cwd(), config.logging.filePath);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/** Record type for structured log metadata */
type LogMetadata = Record<string, unknown>;

/**
 * Custom format for development environment
 * Provides colorized, pretty-printed logs
 */
const developmentFormat: winston.Logform.Format = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }: winston.Logform.TransformableInfo) => {
    let msg: string = `${timestamp as string} [${level}]: ${message as string}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += `\n${JSON.stringify(metadata, null, 2)}`;
    }

    // Add stack trace for errors
    if (stack) {
      msg += `\n${stack as string}`;
    }

    return msg;
  })
);

/**
 * Custom format for production environment
 * Provides structured JSON logs for ELK Stack / Loki / CloudWatch parsing.
 * Fields follow the Elastic Common Schema (ECS) conventions where practical.
 */
const productionFormat: winston.Logform.Format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Sanitize log data to prevent logging sensitive information
 * @param data - Data to sanitize
 * @returns Sanitized data
 */
function sanitizeLogData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys: string[] = [
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

  const sanitized: Record<string, unknown> = Array.isArray(data)
    ? ([] as unknown as Record<string, unknown>)
    : {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey: string = key.toLowerCase();

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

// ── Shared daily-rotate-file options ─────────────────────────────────────────

/** Common options for DailyRotateFile transports */
const rotateDefaults = {
  dirname: logsDir,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: config.logging.zipArchived,
  auditFile: path.join(logsDir, '.audit.json'),
  format: productionFormat
};

// ── Create Winston logger instance ───────────────────────────────────────────

const logger: winston.Logger = winston.createLogger({
  level: config.logging.level,
  format: config.server.isProduction ? productionFormat : developmentFormat,
  defaultMeta: {
    service: 'global-scanner-pro',
    environment: config.server.env,
    version: '0.0.6'
  },
  transports: [
    // Console transport (always active)
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true
    }),

    // Daily-rotating combined log (all levels) — 14-day retention
    new DailyRotateFile({
      ...rotateDefaults,
      filename: 'combined-%DATE%.log',
      maxFiles: `${config.logging.maxDays}d`,
      auditFile: path.join(logsDir, '.audit-combined.json')
    }),

    // Daily-rotating error log — 30-day retention for incident investigation
    new DailyRotateFile({
      ...rotateDefaults,
      filename: 'error-%DATE%.log',
      level: 'error',
      maxFiles: '30d',
      handleExceptions: true,
      handleRejections: true,
      auditFile: path.join(logsDir, '.audit-error.json')
    }),

    // Daily-rotating HTTP access log — 7-day retention
    new DailyRotateFile({
      ...rotateDefaults,
      filename: 'http-%DATE%.log',
      level: 'http',
      maxFiles: '7d',
      auditFile: path.join(logsDir, '.audit-http.json')
    })
  ],

  // Handle uncaught exceptions (static file; does not rotate)
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880,  // 5 MB cap
      maxFiles: 3
    })
  ],

  // Handle unhandled promise rejections (static file; does not rotate)
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  ]
});

// Log rotation events for observability
logger.on('rotate' as any, (oldFilename: string, newFilename: string) => {
  logger.info('Log file rotated', { oldFilename, newFilename });
});

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a child logger with additional context
 * @param context - Additional context to add to all log entries
 * @returns Child logger instance
 */
export function createChildLogger(context: Record<string, unknown>): winston.Logger {
  return logger.child(sanitizeLogData(context) as Record<string, unknown>);
}

/**
 * Express request with optional id and connection fields used for logging
 */
interface LoggableRequest extends Request {
  id?: string;
  connection: Request['socket'] & { remoteAddress?: string };
}

/**
 * Log with request context
 * @param req - Express request object
 * @param level - Log level
 * @param message - Log message
 * @param metadata - Additional metadata
 */
export function logWithRequest(
  req: LoggableRequest,
  level: string,
  message: string,
  metadata: LogMetadata = {}
): void {
  const requestContext: LogMetadata = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  };

  logger.log(level, message, {
    ...requestContext,
    ...sanitizeLogData(metadata) as LogMetadata
  });
}

/**
 * Express middleware for HTTP request logging
 * @returns Express middleware
 */
export function httpLogger(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime: number = Date.now();

    // Log when response finishes
    res.on('finish', (): void => {
      const duration: number = Date.now() - startTime;
      const logLevel: string = res.statusCode >= 500 ? 'error' :
                      res.statusCode >= 400 ? 'warn' : 'http';

      logWithRequest(req as LoggableRequest, logLevel, `${req.method} ${req.originalUrl}`, {
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
export const log: Record<string, (message: string, metadata?: LogMetadata) => winston.Logger> = {
  error: (message: string, metadata?: LogMetadata): winston.Logger => logger.error(message, sanitizeLogData(metadata)),
  warn: (message: string, metadata?: LogMetadata): winston.Logger => logger.warn(message, sanitizeLogData(metadata)),
  info: (message: string, metadata?: LogMetadata): winston.Logger => logger.info(message, sanitizeLogData(metadata)),
  http: (message: string, metadata?: LogMetadata): winston.Logger => logger.http(message, sanitizeLogData(metadata)),
  verbose: (message: string, metadata?: LogMetadata): winston.Logger => logger.verbose(message, sanitizeLogData(metadata)),
  debug: (message: string, metadata?: LogMetadata): winston.Logger => logger.debug(message, sanitizeLogData(metadata)),
  silly: (message: string, metadata?: LogMetadata): winston.Logger => logger.silly(message, sanitizeLogData(metadata))
};

/**
 * Log performance metrics
 * @param operation - Operation name
 * @param duration - Duration in milliseconds
 * @param metadata - Additional metadata
 */
export function logPerformance(operation: string, duration: number, metadata: LogMetadata = {}): void {
  logger.info(`Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    ...sanitizeLogData(metadata) as LogMetadata
  });
}

/**
 * Log security events
 * @param event - Security event type
 * @param details - Event details
 */
export function logSecurityEvent(event: string, details: LogMetadata): void {
  logger.warn(`Security Event: ${event}`, {
    securityEvent: event,
    ...sanitizeLogData(details) as LogMetadata
  });
}

/**
 * Log business metrics
 * @param metric - Metric name
 * @param value - Metric value
 * @param metadata - Additional metadata
 */
export function logMetric(metric: string, value: number, metadata: LogMetadata = {}): void {
  logger.info(`Metric: ${metric}`, {
    metric,
    value,
    ...sanitizeLogData(metadata) as LogMetadata
  });
}

// Export logger instance as default
export default logger;
