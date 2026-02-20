/**
 * Global Quant Scanner Pro - Main Server
 *
 * Professional Edition with enterprise-grade security,
 * logging, error handling, and monitoring.
 *
 * @module server
 */

import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';

// Configuration and environment
import { config, printConfig } from './src/config/environment.js';
import { swaggerSpec, swaggerUiOptions } from './src/config/swagger.js';

// Security middleware
import {
  configureSecurityMiddleware,
  configureYahooRateLimit
} from './src/middleware/security.js';

// Validation middleware
import { validate } from './src/middleware/validation.js';
import {
  yahooFinanceSchema,
  healthCheckSchema,
  testRunnerSchema
} from './src/security/validation-schemas.js';

// Error handling
import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  setupErrorHandlers,
  ExternalServiceError
} from './src/middleware/error-handler.js';

// Logging
import { httpLogger, log } from './src/utils/logger.js';

// Sentry error tracking
import {
  initializeSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler
} from './src/utils/sentry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Print full configuration only in debug mode
if (config.development.debug) {
  printConfig();
}

// Setup global error handlers
setupErrorHandlers();

// Create Express app
const app = express();

// Initialize Sentry (must be first)
initializeSentry(app);

// Sentry request handler (must be first middleware)
app.use(sentryRequestHandler());

// Sentry tracing handler (must be before routes)
app.use(sentryTracingHandler());

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Configure all security middleware (helmet, CORS, rate limiting, etc.)
configureSecurityMiddleware(app);

// HTTP request logging
app.use(httpLogger());

// Configure MIME types for ES6 modules
app.use((req, res, next) => {
  if (req.url.endsWith('.js')) {
    res.type('application/javascript');
  }
  next();
});

// Serve static files
app.use(express.static('.'));

// ========================================
// API Documentation (Swagger UI)
// ========================================

/**
 * Serve raw OpenAPI JSON spec at /api-docs.json
 * Useful for code generation tools and API clients.
 */
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * Serve Swagger UI interactive documentation at /api-docs
 * Provides "Try it out" functionality for all endpoints.
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// ========================================
// Route Handlers (shared between v1 and legacy paths)
// ========================================

/**
 * Yahoo Finance proxy handler.
 * Fetches historical OHLCV data for a given ticker from Yahoo Finance.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const yahooHandler = asyncHandler(async (req, res) => {
  const { symbol, from, to } = req.query;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d`;

  log.debug(`Yahoo Finance: fetching ${symbol}`, { requestId: req.id, symbol, from, to });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      },
      timeout: config.performance.requestTimeout
    });

    if (!response.ok) {
      throw new ExternalServiceError('Yahoo Finance', {
        status: response.status,
        statusText: response.statusText
      });
    }

    const data = await response.json();

    log.debug(`Yahoo Finance: ${symbol} OK (${data?.chart?.result?.[0]?.timestamp?.length || 0} pts)`, {
      requestId: req.id, symbol
    });

    res.json(data);
  } catch (error) {
    if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
      throw new ExternalServiceError('Yahoo Finance (timeout)', error);
    }
    throw error;
  }
});

/**
 * Test runner handler.
 * Executes the legacy test suite and returns a result summary.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const testRunnerHandler = asyncHandler(async (req, res) => {
  log.debug('Running test suite', { requestId: req.id });

  const { runAllTests } = await import('./src/tests/tests.js');
  const results = runAllTests();

  log.debug('Test suite completed', {
    requestId: req.id,
    totalTests: results.totalTests,
    passed: results.passed,
    failed: results.failed
  });

  res.json(results);
});

/**
 * Health check handler.
 * Returns server status, uptime, memory usage, and enabled features.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const healthHandler = (req, res) => {
  const versioned = req.path.startsWith('/api/v1') || res.locals.apiVersion === 'v1';
  const healthStatus = {
    status: 'ok',
    ...(versioned ? { apiVersion: 'v1' } : {}),
    timestamp: new Date().toISOString(),
    version: '0.0.5',
    environment: config.server.env,
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024)
    },
    features: config.features
  };

  res.json(healthStatus);
};

// ========================================
// API v1 Routes (current, versioned)
// ========================================

/**
 * Middleware that stamps all /api/v1 responses with the current API version header.
 */
app.use('/api/v1', (req, res, next) => {
  res.setHeader('X-API-Version', 'v1');
  res.locals.apiVersion = 'v1';
  next();
});

/**
 * GET /api/v1/yahoo — Yahoo Finance historical price proxy (v1)
 * Rate-limited to 20 requests/minute per IP.
 */
app.get(
  '/api/v1/yahoo',
  configureYahooRateLimit(),
  validate(yahooFinanceSchema, 'query'),
  yahooHandler
);

/**
 * GET /api/v1/run-tests — Legacy test suite runner (v1)
 */
app.get(
  '/api/v1/run-tests',
  validate(testRunnerSchema, 'query'),
  testRunnerHandler
);

/**
 * GET /api/v1/health — Application health check (v1)
 */
app.get(
  '/api/v1/health',
  validate(healthCheckSchema, 'query'),
  healthHandler
);

// ========================================
// Legacy API Routes (deprecated — use /api/v1/)
// ========================================

/**
 * Middleware that marks all legacy /api routes as deprecated.
 * Clients should migrate to /api/v1/ equivalents.
 */
app.use('/api', (req, res, next) => {
  // Skip /api-docs and /api-docs.json — not legacy routes
  if (req.path.startsWith('-docs')) {
    return next();
  }
  res.setHeader('Deprecation', 'true');
  res.setHeader('X-Deprecated', 'true');
  res.setHeader('Link', `</api/v1${  req.path  }>; rel="successor-version"`);
  next();
});

/**
 * GET /api/yahoo — Yahoo Finance proxy (legacy, deprecated)
 * @deprecated Use GET /api/v1/yahoo
 */
app.get(
  '/api/yahoo',
  configureYahooRateLimit(),
  validate(yahooFinanceSchema, 'query'),
  yahooHandler
);

/**
 * GET /api/run-tests — Test suite runner (legacy, deprecated)
 * @deprecated Use GET /api/v1/run-tests
 */
app.get(
  '/api/run-tests',
  validate(testRunnerSchema, 'query'),
  testRunnerHandler
);

/**
 * GET /api/health — Health check (legacy, deprecated)
 * @deprecated Use GET /api/v1/health
 */
app.get(
  '/api/health',
  validate(healthCheckSchema, 'query'),
  healthHandler
);

// ========================================
// Error Handling
// ========================================

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler());

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ========================================
// Server Startup
// ========================================

const BASE_PORT = config.server.port;
const MAX_PORT_ATTEMPTS = 10;

/**
 * Logs server startup information
 * @param {number} port - Port number
 */
const logServerStart = (port) => {
  const base = `http://localhost:${port}`;

  // ANSI colors
  const rst = '\x1b[0m';
  const bld = '\x1b[1m';
  const dim = '\x1b[2m';
  const cyn = '\x1b[36m';
  const grn = '\x1b[32m';
  const ylw = '\x1b[33m';
  const mag = '\x1b[35m';

  console.log('');
  console.log(`  ${cyn}${bld} ██████╗  ██████╗ ███████╗${rst}   ${mag}${bld}██████╗ ██████╗  ██████╗ ${rst}`);
  console.log(`  ${cyn}${bld}██╔════╝ ██╔═══██╗██╔════╝${rst}   ${mag}${bld}██╔══██╗██╔══██╗██╔═══██╗${rst}`);
  console.log(`  ${cyn}${bld}██║  ███╗██║   ██║███████╗${rst}   ${mag}${bld}██████╔╝██████╔╝██║   ██║${rst}`);
  console.log(`  ${cyn}${bld}██║   ██║██║▄▄ ██║╚════██║${rst}   ${mag}${bld}██╔═══╝ ██╔══██╗██║   ██║${rst}`);
  console.log(`  ${cyn}${bld}╚██████╔╝╚██████╔╝███████║${rst}   ${mag}${bld}██║     ██║  ██║╚██████╔╝${rst}`);
  console.log(`  ${cyn}${bld} ╚═════╝  ╚══▀▀═╝ ╚══════╝${rst}   ${mag}${bld}╚═╝     ╚═╝  ╚═╝ ╚═════╝ ${rst}`);
  console.log('');
  console.log(`  ${dim}Global Quant Scanner Pro${rst} ${ylw}${bld}v0.0.5${rst}`);
  console.log(`  ${dim}───────────────────────────────────────────────────${rst}`);
  console.log('');
  console.log(`  ${grn}${bld}➜${rst}  ${bld}Local:${rst}   ${cyn}${base}/index.html${rst}`);
  console.log(`  ${grn}${bld}➜${rst}  ${bld}API Docs:${rst} ${cyn}${base}/api-docs${rst}`);
  console.log('');
  console.log(`  ${dim}v1   /api/v1/health · /api/v1/yahoo · /api/v1/run-tests${rst}`);
  console.log(`  ${dim}spec /api-docs.json${rst}`);
  console.log('');

  log.info('Server started', { port, environment: config.server.env });
};

/**
 * Starts the server on the specified port
 * @param {number} port - Port to start on
 * @param {number} [attempt=0] - Current attempt number
 */
const startServer = (port, attempt = 0) => {
  const server = app.listen(port, () => logServerStart(port));

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS - 1) {
      const nextPort = port + 1;
      console.warn(
        `⚠️  Puerto ${port} en uso. Intentando iniciar en el puerto ${nextPort}...`
      );
      startServer(nextPort, attempt + 1);
      return;
    }

    log.error('Failed to start server', {
      error: error.message,
      code: error.code,
      port
    });
    console.error('❌ No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    log.info(`Received ${signal}, initiating graceful shutdown`);
    console.log(`\n⚠️  Recibida señal ${signal}, cerrando servidor...`);

    server.close(async () => {
      log.info('Server closed, flushing logs and closing connections');

      // Flush Sentry events
      const { flush } = await import('./src/utils/sentry.js');
      await flush();

      log.info('Shutdown complete');
      console.log('✅ Servidor cerrado correctamente\n');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      log.error('Forced shutdown after timeout');
      console.error('❌ Timeout: forzando cierre del servidor\n');
      process.exit(1);
    }, 10000);
  };

  // Listen for shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Start the server
startServer(BASE_PORT);

export default app;
