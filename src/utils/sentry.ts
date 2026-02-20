/**
 * Sentry Error Tracking Integration
 *
 * This module configures Sentry for error tracking and performance monitoring.
 *
 * @module utils/sentry
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { Breadcrumb, SeverityLevel, User, ErrorEvent, EventHint } from '@sentry/node';
import type { Application, Request, Response, NextFunction } from 'express';
import { config } from '../config/environment.js';
import { log } from './logger.js';

/** Express request handler middleware signature */
type ExpressRequestHandler = (req: Request, res: Response, next: NextFunction) => void;

/** Express error handler middleware signature */
type ExpressErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => void;

/** Context data passed alongside exceptions or messages */
interface SentryContext {
  [key: string]: unknown;
}

/** User data for Sentry user identification */
interface SentryUserData {
  id?: string | number;
  email?: string;
  username?: string;
  [key: string]: unknown;
}

/** Options for starting a transaction (legacy API) */
interface TransactionOptions {
  name: string;
  op?: string;
  description?: string;
  [key: string]: unknown;
}

/** Stub transaction object returned when Sentry is not initialized */
interface TransactionStub {
  finish: () => void;
  setStatus: (status: string) => void;
  setData: (key: string, value: unknown) => void;
}

let sentryInitialized: boolean = false;

/**
 * Initialize Sentry
 * @param app - Express app instance (optional, for request handlers)
 */
export function initializeSentry(app: Application | null = null): void {
  // Skip if Sentry is not configured
  if (!config.sentry) {
    log.info('Sentry not configured, skipping initialization');
    return;
  }

  try {
    Sentry.init({
      dsn: config.sentry.dsn,
      environment: config.sentry.environment,

      // Set tracesSampleRate to 1.0 to capture 100% of transactions
      // Adjust this value in production to reduce performance overhead
      tracesSampleRate: config.sentry.tracesSampleRate,

      // Profiling sample rate
      profilesSampleRate: config.sentry.tracesSampleRate,

      // Integrations
      integrations: [
        // HTTP integration for tracking HTTP requests
        Sentry.httpIntegration(),

        // Express integration (if app is provided)
        ...(app ? [
          Sentry.expressIntegration()
        ] : []),

        // Node profiling integration
        nodeProfilingIntegration()
      ],

      // Release tracking (use git commit SHA or version)
      release: `global-scanner-pro@${process.env.npm_package_version || '0.0.5'}`,

      // Before send hook - filter or modify events before sending
      beforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
        // Filter out operational errors (4xx status codes)
        const statusCode = (event.contexts?.response as Record<string, unknown> | undefined)?.status_code as number | undefined;
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          return null; // Don't send to Sentry
        }

        // Sanitize sensitive data
        if (event.request) {
          // Remove cookies
          delete event.request.cookies;

          // Remove authorization headers
          if (event.request.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }

          // Sanitize query parameters
          if (event.request.query_string) {
            event.request.query_string = '[REDACTED]';
          }
        }

        return event;
      },

      // Ignore certain errors
      ignoreErrors: [
        // Browser errors
        'Non-Error promise rejection captured',
        'ResizeObserver loop limit exceeded',

        // Network errors
        'Network request failed',
        'Failed to fetch',

        // Common user errors
        'Validation failed',
        'Too many requests',

        // Specific error messages to ignore
        /ECONNREFUSED/,
        /ENOTFOUND/,
        /ETIMEDOUT/
      ]
    });

    sentryInitialized = true;
    log.info('✓ Sentry initialized', {
      environment: config.sentry.environment,
      tracesSampleRate: config.sentry.tracesSampleRate
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Failed to initialize Sentry', { error: message });
  }
}

/**
 * Express middleware to set up Sentry request handler
 * Must be used before any other middleware
 *
 * @returns Express middleware
 */
export function sentryRequestHandler(): ExpressRequestHandler {
  // In Sentry v10+, request handling is automatic via the expressIntegration.
  // Return a passthrough middleware for compatibility.
  return (_req: Request, _res: Response, next: NextFunction): void => next();
}

/**
 * Express middleware to set up Sentry tracing handler
 * Must be used after requestHandler but before routes
 *
 * @returns Express middleware
 */
export function sentryTracingHandler(): ExpressRequestHandler {
  // In Sentry v10+, tracing is automatic via the httpIntegration and expressIntegration.
  // Return a passthrough middleware for compatibility.
  return (_req: Request, _res: Response, next: NextFunction): void => next();
}

/**
 * Express middleware to set up Sentry error handler
 * Must be used after all routes but before other error handlers
 *
 * @returns Express error middleware
 */
export function sentryErrorHandler(): ExpressErrorHandler {
  if (!sentryInitialized) {
    return (err: Error, _req: Request, _res: Response, next: NextFunction): void => next(err);
  }

  // In Sentry v10+, use setupExpressErrorHandler on the app directly.
  // Return a wrapper that captures the error and forwards it.
  return (err: Error, _req: Request, _res: Response, next: NextFunction): void => {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 0;
    if (statusCode >= 500 || statusCode === 0) {
      Sentry.captureException(err);
    }
    next(err);
  };
}

/**
 * Capture an exception manually
 * @param error - Error to capture
 * @param context - Additional context
 */
export function captureException(error: unknown, context: SentryContext = {}): void {
  if (!sentryInitialized) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Sentry not initialized, cannot capture exception', {
      error: message,
      context
    });
    return;
  }

  Sentry.captureException(error, {
    contexts: {
      custom: context
    }
  });
}

/**
 * Capture a message manually
 * @param message - Message to capture
 * @param level - Severity level
 * @param context - Additional context
 */
export function captureMessage(message: string, level: SeverityLevel = 'info', context: SentryContext = {}): void {
  if (!sentryInitialized) {
    log.info('Sentry not initialized, cannot capture message', {
      message,
      level,
      context
    });
    return;
  }

  Sentry.captureMessage(message, {
    level,
    contexts: {
      custom: context
    }
  });
}

/**
 * Add breadcrumb for debugging context
 * @param breadcrumb - Breadcrumb data
 */
export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  if (!sentryInitialized) {
    return;
  }

  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Set user context
 * @param user - User data
 */
export function setUser(user: SentryUserData): void {
  if (!sentryInitialized) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username
  } satisfies User);
}

/**
 * Set custom context
 * @param key - Context key
 * @param value - Context value
 */
export function setContext(key: string, value: Record<string, unknown>): void {
  if (!sentryInitialized) {
    return;
  }

  Sentry.setContext(key, value);
}

/**
 * Start a transaction for performance monitoring
 * @param options - Transaction options
 * @returns Transaction object or stub
 */
export function startTransaction(options: TransactionOptions): TransactionStub {
  if (!sentryInitialized) {
    return {
      finish: (): void => {},
      setStatus: (_status: string): void => {},
      setData: (_key: string, _value: unknown): void => {}
    };
  }

  // In Sentry v10+, startTransaction is replaced by startSpan / startInactiveSpan.
  // Return a compatible stub wrapping startInactiveSpan for callers expecting the legacy API.
  const span = Sentry.startInactiveSpan({ name: options.name, op: options.op });
  return {
    finish: (): void => { span?.end(); },
    setStatus: (_status: string): void => { /* span status set via Sentry.setHttpStatus */ },
    setData: (_key: string, _value: unknown): void => { span?.setAttribute(_key, _value as string); }
  };
}

/**
 * Wrap a function with error tracking
 * @param fn - Function to wrap
 * @param name - Function name for identification
 * @returns Wrapped function
 */
export function wrapWithErrorTracking<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  name?: string
): (...args: TArgs) => Promise<TReturn> {
  if (!sentryInitialized) {
    return fn;
  }

  return async function(this: unknown, ...args: TArgs): Promise<TReturn> {
    try {
      return await fn.apply(this, args);
    } catch (error: unknown) {
      captureException(error, {
        function: name || fn.name,
        arguments: args.length
      });
      throw error;
    }
  };
}

/**
 * Flush pending Sentry events
 * Useful before shutdown
 * @param timeout - Timeout in milliseconds
 * @returns True if flushed successfully
 */
export async function flush(timeout: number = 2000): Promise<boolean> {
  if (!sentryInitialized) {
    return true;
  }

  try {
    await Sentry.flush(timeout);
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Failed to flush Sentry events', { error: message });
    return false;
  }
}

/**
 * Close Sentry client
 * @param timeout - Timeout in milliseconds
 * @returns True if closed successfully
 */
export async function close(timeout: number = 2000): Promise<boolean> {
  if (!sentryInitialized) {
    return true;
  }

  try {
    await Sentry.close(timeout);
    sentryInitialized = false;
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Failed to close Sentry client', { error: message });
    return false;
  }
}

export default {
  initializeSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  setContext,
  startTransaction,
  wrapWithErrorTracking,
  flush,
  close
};
