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

// Configuration and environment
import { config, printConfig } from './src/config/environment.js';

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

// Print configuration on startup
printConfig();

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
// API Routes
// ========================================

/**
 * Yahoo Finance Proxy Endpoint
 * Proxies requests to Yahoo Finance API with rate limiting and validation
 */
app.get(
  '/api/yahoo',
  configureYahooRateLimit(),
  validate(yahooFinanceSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { symbol, from, to } = req.query;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d`;

    log.debug(`Fetching Yahoo Finance data for ${symbol}`, {
      requestId: req.id,
      symbol,
      from,
      to
    });

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

      log.info(`Successfully fetched data for ${symbol}`, {
        requestId: req.id,
        symbol,
        dataPoints: data?.chart?.result?.[0]?.timestamp?.length || 0
      });

      res.json(data);
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
        throw new ExternalServiceError('Yahoo Finance (timeout)', error);
      }
      throw error;
    }
  })
);

/**
 * Test Runner Endpoint
 * Executes the test suite and returns results
 */
app.get(
  '/api/run-tests',
  validate(testRunnerSchema, 'query'),
  asyncHandler(async (req, res) => {
    log.info('Running test suite', { requestId: req.id });

    const { runAllTests } = await import('./src/tests/tests.js');
    const results = runAllTests();

    log.info('Test suite completed', {
      requestId: req.id,
      totalTests: results.totalTests,
      passed: results.passed,
      failed: results.failed
    });

    res.json(results);
  })
);

/**
 * Health Check Endpoint
 * Returns application health status
 */
app.get(
  '/api/health',
  validate(healthCheckSchema, 'query'),
  (req, res) => {
    const healthStatus = {
      status: 'ok',
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
  }
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
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   🎯 GLOBAL QUANT SCANNER PRO                              ║');
  console.log('║   Professional Edition v0.0.5                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('  ✅ Scanner iniciado correctamente\n');
  console.log('  📊 Interfaz principal:');
  console.log(`     → http://localhost:${port}/index.html\n`);
  console.log('  🔌 API Endpoints:');
  console.log(`     → http://localhost:${port}/api/health (Health Check)`);
  console.log(`     → http://localhost:${port}/api/run-tests (Test Suite)`);
  console.log(`     → http://localhost:${port}/api/yahoo (Yahoo Finance Proxy)\n`);
  console.log('  📝 Logs:');
  console.log(`     → ${config.logging.filePath}/combined.log`);
  console.log(`     → ${config.logging.filePath}/error.log\n`);
  console.log('  💡 Tip: Ctrl+Click en las URLs para abrirlas\n');

  log.info('Server started successfully', {
    port,
    environment: config.server.env,
    nodeVersion: process.version
  });
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
