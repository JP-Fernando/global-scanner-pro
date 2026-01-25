/**
 * Sentry Error Tracking Integration
 *
 * This module configures Sentry for error tracking and performance monitoring.
 *
 * @module utils/sentry
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { config } from '../config/environment.js';
import { log } from './logger.js';

let sentryInitialized = false;

/**
 * Initialize Sentry
 * @param {Object} app - Express app instance (optional, for request handlers)
 */
export function initializeSentry(app = null) {
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
        new Sentry.Integrations.Http({ tracing: true }),

        // Express integration (if app is provided)
        ...(app ? [
          new Sentry.Integrations.Express({ app })
        ] : []),

        // Node profiling integration
        nodeProfilingIntegration()
      ],

      // Release tracking (use git commit SHA or version)
      release: `global-scanner-pro@${process.env.npm_package_version || '0.0.5'}`,

      // Before send hook - filter or modify events before sending
      beforeSend(event, _hint) {
        // Filter out operational errors (4xx status codes)
        const statusCode = event.contexts?.response?.status_code;
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
  } catch (error) {
    log.error('Failed to initialize Sentry', { error: error.message });
  }
}

/**
 * Express middleware to set up Sentry request handler
 * Must be used before any other middleware
 *
 * @returns {Function} Express middleware
 */
export function sentryRequestHandler() {
  if (!sentryInitialized) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.requestHandler();
}

/**
 * Express middleware to set up Sentry tracing handler
 * Must be used after requestHandler but before routes
 *
 * @returns {Function} Express middleware
 */
export function sentryTracingHandler() {
  if (!sentryInitialized) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.tracingHandler();
}

/**
 * Express middleware to set up Sentry error handler
 * Must be used after all routes but before other error handlers
 *
 * @returns {Function} Express middleware
 */
export function sentryErrorHandler() {
  if (!sentryInitialized) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Send all errors with status >= 500
      return error.statusCode >= 500;
    }
  });
}

/**
 * Capture an exception manually
 * @param {Error} error - Error to capture
 * @param {Object} [context={}] - Additional context
 */
export function captureException(error, context = {}) {
  if (!sentryInitialized) {
    log.error('Sentry not initialized, cannot capture exception', {
      error: error.message,
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
 * @param {string} message - Message to capture
 * @param {string} [level='info'] - Severity level
 * @param {Object} [context={}] - Additional context
 */
export function captureMessage(message, level = 'info', context = {}) {
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
 * @param {Object} breadcrumb - Breadcrumb data
 */
export function addBreadcrumb(breadcrumb) {
  if (!sentryInitialized) {
    return;
  }

  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Set user context
 * @param {Object} user - User data
 */
export function setUser(user) {
  if (!sentryInitialized) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username
  });
}

/**
 * Set custom context
 * @param {string} key - Context key
 * @param {Object} value - Context value
 */
export function setContext(key, value) {
  if (!sentryInitialized) {
    return;
  }

  Sentry.setContext(key, value);
}

/**
 * Start a transaction for performance monitoring
 * @param {Object} options - Transaction options
 * @returns {Object} Transaction object
 */
export function startTransaction(options) {
  if (!sentryInitialized) {
    return {
      finish: () => {},
      setStatus: () => {},
      setData: () => {}
    };
  }

  return Sentry.startTransaction(options);
}

/**
 * Wrap a function with error tracking
 * @param {Function} fn - Function to wrap
 * @param {string} [name] - Function name for identification
 * @returns {Function} Wrapped function
 */
export function wrapWithErrorTracking(fn, name) {
  if (!sentryInitialized) {
    return fn;
  }

  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
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
 * @param {number} [timeout=2000] - Timeout in milliseconds
 * @returns {Promise<boolean>} True if flushed successfully
 */
export async function flush(timeout = 2000) {
  if (!sentryInitialized) {
    return true;
  }

  try {
    await Sentry.flush(timeout);
    return true;
  } catch (error) {
    log.error('Failed to flush Sentry events', { error: error.message });
    return false;
  }
}

/**
 * Close Sentry client
 * @param {number} [timeout=2000] - Timeout in milliseconds
 * @returns {Promise<boolean>} True if closed successfully
 */
export async function close(timeout = 2000) {
  if (!sentryInitialized) {
    return true;
  }

  try {
    await Sentry.close(timeout);
    sentryInitialized = false;
    return true;
  } catch (error) {
    log.error('Failed to close Sentry client', { error: error.message });
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
