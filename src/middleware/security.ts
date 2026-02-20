/**
 * Security Middleware
 *
 * This module provides security-related middleware for Express:
 * - Helmet.js security headers
 * - CORS configuration
 * - Rate limiting
 * - HTTPS enforcement
 *
 * @module middleware/security
 */

import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction, Application, RequestHandler } from 'express';
import { config } from '../config/environment.js';

/** Extended request with optional id field */
interface RequestWithId extends Request {
  id?: string;
}

/**
 * Configures Helmet.js security headers
 * Protects against common web vulnerabilities
 *
 * @returns {Function} Helmet middleware
 */
export function configureHelmet(): ReturnType<typeof helmet> {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for inline scripts in index.html
          "'unsafe-eval'", // Required for some chart libraries
          'cdn.jsdelivr.net',
          'cdnjs.cloudflare.com'
        ],
        scriptSrcAttr: ["'unsafe-inline'"], // Required for inline event handlers (onclick, onchange, etc.)
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for inline styles
          'fonts.googleapis.com',
          'cdn.jsdelivr.net'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https:'
        ],
        fontSrc: [
          "'self'",
          'fonts.googleapis.com',
          'fonts.gstatic.com',
          'data:'
        ],
        connectSrc: [
          "'self'",
          'https://query1.finance.yahoo.com',
          'https://query2.finance.yahoo.com',
          config.sentry?.dsn ? new URL(config.sentry.dsn).origin : ''
        ].filter(Boolean),
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"]
      }
    },

    // X-DNS-Prefetch-Control: controls browser DNS prefetching
    dnsPrefetchControl: {
      allow: false
    },

    // X-Frame-Options: prevents clickjacking
    frameguard: {
      action: 'deny'
    },

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // Strict-Transport-Security: enforces HTTPS
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },

    // X-Content-Type-Options: prevents MIME sniffing
    noSniff: true,

    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none'
    },

    // Referrer-Policy: controls referrer information
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },

    // X-XSS-Protection: enables XSS filter (legacy browsers)
    xssFilter: true
  });
}

/**
 * Configures CORS middleware
 * Controls which origins can access the API
 *
 * @returns {Function} CORS middleware
 */
export function configureCors(): RequestHandler {
  return cors({
    origin: (origin: string | undefined, callback: (err: Error | null, origin?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      // Check if origin is allowed
      if (config.security.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (config.security.allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After'
    ],
    maxAge: 86400 // 24 hours
  });
}

/**
 * Global rate limiter for all API endpoints
 * Prevents abuse and DoS attacks
 *
 * @returns {Function} Rate limit middleware
 */
export function configureGlobalRateLimit(): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs: config.security.rateLimit.windowMs,
    max: config.security.rateLimit.max,
    message: {
      error: 'Too many requests',
      message: `You have exceeded the ${config.security.rateLimit.max} requests in ${config.security.rateLimit.windowMs / 1000} seconds limit.`,
      retryAfter: config.security.rateLimit.windowMs / 1000
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    handler: (_req: Request, res: Response): void => {
      res.status(429).json({
        error: 'Too many requests',
        message: `You have exceeded the ${config.security.rateLimit.max} requests in ${config.security.rateLimit.windowMs / 1000} seconds limit.`,
        retryAfter: config.security.rateLimit.windowMs / 1000,
        timestamp: new Date().toISOString()
      });
    },
    skip: (req: Request): boolean => {
      // Skip rate limiting for health check
      return req.path === '/api/health';
    }
  });
}

/**
 * Stricter rate limiter for Yahoo Finance proxy endpoint
 * Prevents excessive API calls to external service
 *
 * @returns {Function} Rate limit middleware
 */
export function configureYahooRateLimit(): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: config.security.rateLimit.yahooMax,
    message: {
      error: 'Too many Yahoo Finance requests',
      message: `You have exceeded the ${config.security.rateLimit.yahooMax} requests per minute limit for Yahoo Finance API.`,
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response): void => {
      res.status(429).json({
        error: 'Too many Yahoo Finance requests',
        message: `You have exceeded the ${config.security.rateLimit.yahooMax} requests per minute limit for Yahoo Finance API.`,
        retryAfter: 60,
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * HTTPS enforcement middleware
 * Redirects HTTP requests to HTTPS in production
 *
 * @returns {Function} HTTPS enforcement middleware
 */
export function enforceHttps(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only enforce in production
    if (!config.server.isProduction) {
      return next();
    }

    // Check if request is already HTTPS
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      return next();
    }

    // Redirect to HTTPS
    const httpsUrl: string = `https://${req.headers.host}${req.url}`;
    res.redirect(301, httpsUrl);
  };
}

/**
 * Security headers middleware that adds custom security headers
 *
 * @returns {Function} Express middleware
 */
export function addSecurityHeaders(): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    // Add custom security headers
    res.setHeader('X-Content-Security-Policy', "default-src 'self'");
    res.setHeader('X-WebKit-CSP', "default-src 'self'");
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    next();
  };
}

/**
 * Request ID middleware
 * Adds a unique request ID to each request for tracking and debugging
 *
 * @returns {Function} Express middleware
 */
export function addRequestId(): (req: RequestWithId, res: Response, next: NextFunction) => void {
  return (req: RequestWithId, res: Response, next: NextFunction): void => {
    // Generate unique request ID
    const requestId: string = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Add to request object
    req.id = requestId;

    // Add to response headers
    res.setHeader('X-Request-ID', requestId);

    next();
  };
}

/**
 * Request sanitization middleware
 * Removes potentially dangerous characters from request data
 *
 * @returns {Function} Express middleware
 */
export function sanitizeRequest(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Sanitize query parameters
    if (req.query) {
      for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
          // Remove null bytes
          (req.query as Record<string, string>)[key] = (req.query[key] as string).replace(/\0/g, '');

          // Remove control characters except newline and tab
          // eslint-disable-next-line no-control-regex
          (req.query as Record<string, string>)[key] = (req.query[key] as string).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        }
      }
    }

    next();
  };
}

/**
 * Configures all security middleware
 *
 * @param {Object} app - Express application instance
 */
export function configureSecurityMiddleware(app: Application): void {
  // Add request ID
  app.use(addRequestId());

  // HTTPS enforcement (production only)
  app.use(enforceHttps());

  // Helmet security headers
  app.use(configureHelmet());

  // Custom security headers
  app.use(addSecurityHeaders());

  // CORS
  app.use(configureCors());

  // Request sanitization
  app.use(sanitizeRequest());

  // Global rate limiting
  app.use(configureGlobalRateLimit());

  console.log('✓ Security middleware configured');
}

export default {
  configureHelmet,
  configureCors,
  configureGlobalRateLimit,
  configureYahooRateLimit,
  enforceHttps,
  addSecurityHeaders,
  addRequestId,
  sanitizeRequest,
  configureSecurityMiddleware
};
