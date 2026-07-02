/**
 * OpenAPI 3.0 Specification — Global Quant Scanner Pro
 *
 * Full API documentation for all REST endpoints, including schemas,
 * error responses, and query parameter validation rules.
 *
 * @module config/swagger
 */

import type { Options as SwaggerJsdocOptions } from 'swagger-jsdoc';

// ─────────────────────────────────────────────────────────────────
// Schema Definitions
// ─────────────────────────────────────────────────────────────────

const schemas = {
  // ── Health ──────────────────────────────────────────────────────
  MemoryUsage: {
    type: 'object',
    description: 'Heap memory usage of the Node.js process (values in MB).',
    required: ['used', 'total', 'external'],
    properties: {
      used: { type: 'number', example: 42, description: 'Heap memory used (MB)' },
      total: { type: 'number', example: 128, description: 'Total heap allocated (MB)' },
      external: { type: 'number', example: 5, description: 'External C++ memory linked to V8 (MB)' },
    },
  },

  FeatureFlags: {
    type: 'object',
    description: 'Server-side feature flags enabled at runtime.',
    additionalProperties: true,
    example: { mlFeatures: true, alerts: true },
  },

  HealthResponse: {
    type: 'object',
    required: ['status', 'timestamp', 'version', 'environment', 'uptime', 'memory', 'features'],
    properties: {
      status: {
        type: 'string',
        enum: ['ok'],
        example: 'ok',
        description: 'Always "ok" when the server is running.',
      },
      apiVersion: {
        type: 'string',
        example: 'v1',
        description: 'API version (present on /api/v1/health responses).',
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        example: '2026-02-20T12:00:00.000Z',
        description: 'ISO 8601 UTC timestamp of the health check.',
      },
      version: {
        type: 'string',
        example: '0.0.6',
        description: 'Application version from package.json.',
      },
      environment: {
        type: 'string',
        enum: ['development', 'staging', 'production', 'test'],
        example: 'production',
        description: 'Runtime environment (NODE_ENV).',
      },
      uptime: {
        type: 'number',
        example: 3600.5,
        description: 'Seconds the Node.js process has been running.',
      },
      memory: { $ref: '#/components/schemas/MemoryUsage' },
      features: { $ref: '#/components/schemas/FeatureFlags' },
    },
  },

  // ── Yahoo Finance ───────────────────────────────────────────────
  YahooChartMeta: {
    type: 'object',
    description: 'Metadata from Yahoo Finance for the requested symbol.',
    properties: {
      currency: { type: 'string', example: 'USD' },
      symbol: { type: 'string', example: 'AAPL' },
      exchangeName: { type: 'string', example: 'NMS' },
      instrumentType: { type: 'string', example: 'EQUITY' },
      firstTradeDate: { type: 'integer', example: 345479400 },
      regularMarketTime: { type: 'integer', example: 1708387200 },
      gmtoffset: { type: 'integer', example: -18000 },
      timezone: { type: 'string', example: 'EST' },
      exchangeTimezoneName: { type: 'string', example: 'America/New_York' },
      regularMarketPrice: { type: 'number', example: 182.52 },
      chartPreviousClose: { type: 'number', example: 179.66 },
      dataGranularity: { type: 'string', example: '1d' },
      range: { type: 'string', example: '' },
    },
  },

  YahooChartIndicators: {
    type: 'object',
    description: 'OHLCV price indicators.',
    properties: {
      quote: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            open: { type: 'array', items: { type: 'number', nullable: true } },
            high: { type: 'array', items: { type: 'number', nullable: true } },
            low: { type: 'array', items: { type: 'number', nullable: true } },
            close: { type: 'array', items: { type: 'number', nullable: true } },
            volume: { type: 'array', items: { type: 'integer', nullable: true } },
          },
        },
      },
      adjclose: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            adjclose: { type: 'array', items: { type: 'number', nullable: true } },
          },
        },
      },
    },
  },

  YahooChartResult: {
    type: 'object',
    description: 'Single ticker result from Yahoo Finance chart API.',
    properties: {
      meta: { $ref: '#/components/schemas/YahooChartMeta' },
      timestamp: {
        type: 'array',
        items: { type: 'integer' },
        description: 'Unix timestamps (seconds) for each trading day.',
        example: [1708300800, 1708387200],
      },
      indicators: { $ref: '#/components/schemas/YahooChartIndicators' },
    },
  },

  YahooResponse: {
    type: 'object',
    description: 'Raw proxied response from Yahoo Finance chart API v8.',
    properties: {
      chart: {
        type: 'object',
        properties: {
          result: {
            type: 'array',
            items: { $ref: '#/components/schemas/YahooChartResult' },
          },
          error: {
            type: 'object',
            nullable: true,
            description: 'Yahoo Finance error object (null when successful).',
          },
        },
      },
    },
  },

  // ── Test Runner ─────────────────────────────────────────────────
  TestRunnerResponse: {
    type: 'object',
    description: 'Results from the legacy test runner suite.',
    required: ['totalTests', 'passed', 'failed'],
    properties: {
      totalTests: { type: 'integer', example: 50, description: 'Total tests executed.' },
      passed: { type: 'integer', example: 48, description: 'Tests that passed.' },
      failed: { type: 'integer', example: 2, description: 'Tests that failed.' },
      errors: {
        type: 'array',
        items: { type: 'string' },
        description: 'Error messages for failed tests.',
        example: ['Expected 42, got 41'],
      },
    },
  },

  // ── Simulation ──────────────────────────────────────────────────
  SimulationRequest: {
    type: 'object',
    required: ['tickers', 'tickerInvestments', 'horizonMonths'],
    properties: {
      tickers: {
        type: 'array',
        minItems: 1,
        maxItems: 4,
        items: { type: 'string', example: 'AAPL' },
        description: 'List of ticker symbols (1–4). Each must have a corresponding entry in tickerInvestments.',
      },
      tickerInvestments: {
        type: 'object',
        additionalProperties: { type: 'number', minimum: 0 },
        description: 'Monthly investment amount (≥ 0) keyed by ticker symbol. Sum must be > 0.',
        example: { AAPL: 300, MSFT: 200 },
      },
      horizonMonths: {
        type: 'integer',
        minimum: 1,
        example: 60,
      },
    },
  },

  SimulationResponse: {
    type: 'object',
    required: [
      'tickers',
      'totalMonthlyInvestment',
      'horizonMonths',
      'currency',
      'totalInvested',
      'scenarios',
      'monthlyProjection',
      'perTicker'
    ],
    properties: {
      tickers: {
        type: 'array',
        items: { type: 'string', example: 'AAPL' },
      },
      totalMonthlyInvestment: { type: 'number', example: 500, description: 'Sum of all per-ticker monthly amounts.' },
      horizonMonths: { type: 'integer', example: 60 },
      currency: { type: 'string', example: 'USD' },
      totalInvested: { type: 'number', example: 30000 },
      scenarios: {
        type: 'object',
        properties: {
          expected: { $ref: '#/components/schemas/SimulationScenario' },
          optimistic: { $ref: '#/components/schemas/SimulationScenario' },
          pessimistic: { $ref: '#/components/schemas/SimulationScenario' },
        },
      },
      monthlyProjection: {
        type: 'array',
        items: { $ref: '#/components/schemas/SimulationProjectionPoint' },
      },
      perTicker: {
        type: 'array',
        items: { $ref: '#/components/schemas/SimulationPerTicker' },
      },
    },
  },

  SimulationScenario: {
    type: 'object',
    required: ['finalValue', 'cagr', 'totalReturn'],
    properties: {
      finalValue: { type: 'number', example: 38500 },
      cagr: { type: 'number', example: 0.089 },
      totalReturn: { type: 'number', example: 0.283 },
    },
  },

  SimulationProjectionPoint: {
    type: 'object',
    required: ['month', 'expected', 'optimistic', 'pessimistic'],
    properties: {
      month: { type: 'integer', example: 1 },
      expected: { type: 'number', example: 502 },
      optimistic: { type: 'number', example: 508 },
      pessimistic: { type: 'number', example: 496 },
    },
  },

  SimulationPerTicker: {
    type: 'object',
    required: ['ticker', 'weight', 'monthlyAmount', 'tickerTotalInvested', 'historicalMonthlyReturn', 'historicalMonthlyVolatility', 'dataYears', 'scenarios'],
    properties: {
      ticker: { type: 'string', example: 'AAPL' },
      weight: { type: 'number', example: 0.6, description: 'Share of total monthly investment allocated to this ticker.' },
      monthlyAmount: { type: 'number', example: 300, description: 'Monthly investment for this ticker.' },
      tickerTotalInvested: { type: 'number', example: 18000, description: 'Total invested in this ticker over the horizon.' },
      historicalMonthlyReturn: { type: 'number', example: 0.0142 },
      historicalMonthlyVolatility: { type: 'number', example: 0.061 },
      dataYears: { type: 'number', example: 5 },
      scenarios: {
        type: 'object',
        properties: {
          expected: { $ref: '#/components/schemas/SimulationScenario' },
          optimistic: { $ref: '#/components/schemas/SimulationScenario' },
          pessimistic: { $ref: '#/components/schemas/SimulationScenario' },
        },
      },
    },
  },

  // ── Authentication ──────────────────────────────────────────────
  PublicUser: {
    type: 'object',
    required: ['id', 'email', 'role', 'email_verified', 'created_at'],
    properties: {
      id: { type: 'string', example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4' },
      email: { type: 'string', format: 'email', example: 'user@example.com' },
      role: { type: 'string', enum: ['admin', 'analyst', 'viewer'], example: 'viewer' },
      email_verified: { type: 'boolean', example: false },
      created_at: { type: 'string', format: 'date-time', example: '2026-02-20T12:00:00.000Z' },
    },
  },

  AuthResult: {
    type: 'object',
    required: ['user', 'accessToken', 'refreshToken'],
    properties: {
      user: { $ref: '#/components/schemas/PublicUser' },
      accessToken: { type: 'string', description: 'Short-lived JWT (see JWT_EXPIRES_IN).' },
      refreshToken: { type: 'string', description: 'Long-lived JWT used to obtain new token pairs (see JWT_REFRESH_EXPIRES_IN).' },
    },
  },

  TokenPair: {
    type: 'object',
    required: ['accessToken', 'refreshToken'],
    properties: {
      accessToken: { type: 'string' },
      refreshToken: { type: 'string' },
    },
  },

  RegisterRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'user@example.com' },
      password: { type: 'string', minLength: 8, maxLength: 128, example: 'correcthorsebattery' },
      role: {
        type: 'string',
        enum: ['admin', 'analyst', 'viewer'],
        description: 'Ignored for the first-ever user, who is always promoted to admin.',
      },
    },
  },

  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'user@example.com' },
      password: { type: 'string', example: 'correcthorsebattery' },
    },
  },

  RefreshRequest: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string' },
    },
  },

  ForgotPasswordRequest: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email', example: 'user@example.com' },
    },
  },

  ResetPasswordRequest: {
    type: 'object',
    required: ['token', 'password'],
    properties: {
      token: { type: 'string', description: 'Raw reset token received by email.' },
      password: { type: 'string', minLength: 8, maxLength: 128, example: 'newcorrecthorse' },
    },
  },

  // ── Error Responses ─────────────────────────────────────────────
  ValidationErrorDetail: {
    type: 'object',
    required: ['field', 'message', 'code'],
    properties: {
      field: { type: 'string', example: 'symbol', description: 'Request field that failed validation.' },
      message: { type: 'string', example: 'Symbol is required', description: 'Human-readable validation message.' },
      code: { type: 'string', example: 'too_small', description: 'Zod error code.' },
    },
  },

  ErrorResponse: {
    type: 'object',
    required: ['error', 'timestamp', 'statusCode'],
    properties: {
      error: { type: 'string', example: 'Validation failed', description: 'Error description.' },
      timestamp: { type: 'string', format: 'date-time', example: '2026-02-20T12:00:00.000Z' },
      statusCode: { type: 'integer', example: 400 },
      details: {
        type: 'array',
        items: { $ref: '#/components/schemas/ValidationErrorDetail' },
        description: 'Present for 400 validation errors; lists each field error.',
      },
      retryAfter: {
        type: 'integer',
        example: 60,
        description: 'Seconds until the rate limit window resets (429 responses only).',
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────
// Reusable Response Components
// ─────────────────────────────────────────────────────────────────

const responses = {
  ValidationError: {
    description: 'Request validation failed (invalid or missing query parameters).',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: 'Validation failed',
          timestamp: '2026-02-20T12:00:00.000Z',
          statusCode: 400,
          details: [
            { field: 'symbol', message: 'Symbol is required', code: 'too_small' },
          ],
        },
      },
    },
  },

  TooManyRequests: {
    description: 'Rate limit exceeded. Retry after the specified number of seconds.',
    headers: {
      'X-RateLimit-Limit': { schema: { type: 'integer' }, description: 'Max requests per window.' },
      'X-RateLimit-Remaining': { schema: { type: 'integer' }, description: 'Remaining requests in window.' },
      'Retry-After': { schema: { type: 'integer' }, description: 'Seconds until window resets.' },
    },
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: 'Too many requests, please try again later.',
          timestamp: '2026-02-20T12:00:00.000Z',
          statusCode: 429,
          retryAfter: 60,
        },
      },
    },
  },

  InternalError: {
    description: 'Unexpected server error.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: 'Internal Server Error',
          timestamp: '2026-02-20T12:00:00.000Z',
          statusCode: 500,
        },
      },
    },
  },

  BadGateway: {
    description: 'Upstream service (Yahoo Finance) is unavailable or returned an error.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: 'External service error: Yahoo Finance',
          timestamp: '2026-02-20T12:00:00.000Z',
          statusCode: 502,
        },
      },
    },
  },

  Unauthorized: {
    description: 'Authentication required.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: 'Authentication required',
          timestamp: '2026-02-20T12:00:00.000Z',
          statusCode: 401,
        },
      },
    },
  },

  Conflict: {
    description: 'The resource already exists (e.g. email already registered).',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: 'Email address is already registered',
          timestamp: '2026-02-20T12:00:00.000Z',
          statusCode: 409,
        },
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────
// OpenAPI Paths
// ─────────────────────────────────────────────────────────────────

const paths = {
  // ── /health ─────────────────────────────────────────────────────
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Application health check',
      description:
        'Returns server health status including uptime, memory usage, and enabled feature flags. ' +
        'No authentication required. Suitable for load-balancer and monitoring probes.',
      operationId: 'getHealth',
      responses: {
        200: {
          description: 'Server is healthy and accepting requests.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HealthResponse' },
            },
          },
        },
        500: { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  // ── /yahoo ───────────────────────────────────────────────────────
  '/yahoo': {
    get: {
      tags: ['Market Data'],
      summary: 'Yahoo Finance historical price proxy',
      description:
        'Proxies requests to the Yahoo Finance chart API (v8). ' +
        'Returns daily OHLCV data for a given ticker over a specified date range. ' +
        'Rate-limited to **20 requests per minute** per IP address. ' +
        'The `symbol` parameter is automatically normalised to uppercase.',
      operationId: 'getYahooFinance',
      parameters: [
        {
          name: 'symbol',
          in: 'query',
          required: true,
          description:
            'Ticker symbol (1–10 characters, uppercase letters, digits, `.`, `-`, `^`, `=`). ' +
            'Examples: `AAPL`, `BTC-USD`, `^GSPC`, `ES=F`.',
          schema: {
            type: 'string',
            minLength: 1,
            maxLength: 10,
            pattern: '^[A-Z0-9.\\-^=]+$',
            example: 'AAPL',
          },
        },
        {
          name: 'from',
          in: 'query',
          required: true,
          description: 'Start of the date range as a **Unix timestamp in seconds** (must be in the past).',
          schema: {
            type: 'integer',
            minimum: 1,
            example: 1672531200,
          },
        },
        {
          name: 'to',
          in: 'query',
          required: true,
          description:
            'End of the date range as a **Unix timestamp in seconds** (must be in the past and after `from`).',
          schema: {
            type: 'integer',
            minimum: 1,
            example: 1708387200,
          },
        },
      ],
      responses: {
        200: {
          description: 'Historical OHLCV data returned successfully.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/YahooResponse' },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        429: { $ref: '#/components/responses/TooManyRequests' },
        502: { $ref: '#/components/responses/BadGateway' },
        500: { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  // ── /run-tests ───────────────────────────────────────────────────
  '/run-tests': {
    get: {
      tags: ['Utilities'],
      summary: 'Execute the legacy test suite',
      description:
        'Runs the built-in legacy test runner and returns a summary of results. ' +
        'Intended for development and CI validation only — not for production use. ' +
        'An optional `filter` parameter restricts which tests are executed.',
      operationId: 'runTests',
      parameters: [
        {
          name: 'filter',
          in: 'query',
          required: false,
          description:
            'Optional case-sensitive substring filter for test names ' +
            '(alphanumeric, spaces, hyphens, underscores; max 100 characters).',
          schema: {
            type: 'string',
            maxLength: 100,
            pattern: '^[a-zA-Z0-9 \\-_]+$',
            example: 'indicators',
          },
        },
      ],
      responses: {
        200: {
          description: 'Test suite executed. Check `failed` count to determine success.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TestRunnerResponse' },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        500: { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  // ── /simulate ───────────────────────────────────────────────────
  '/simulate': {
    post: {
      tags: ['Simulation'],
      summary: 'Run monthly DCA investment simulation',
      description:
        'Simulates expected, optimistic, and pessimistic portfolio outcomes ' +
        'using monthly historical return statistics from Yahoo Finance.',
      operationId: 'simulateInvestment',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SimulationRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Simulation completed successfully.',
          headers: {
            'X-Cache': {
              schema: { type: 'string', enum: ['HIT', 'MISS'] },
              description: 'HIT when all ticker history came from cache.',
            },
          },
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SimulationResponse' },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        502: { $ref: '#/components/responses/BadGateway' },
        500: { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  // ── /auth/* ─────────────────────────────────────────────────────
  '/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Register a new user account',
      description: 'Creates a user account. The first-ever registered user is automatically promoted to admin.',
      operationId: 'authRegister',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
      },
      responses: {
        201: {
          description: 'User created.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResult' } } },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        409: { $ref: '#/components/responses/Conflict' },
        500: { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'Exchange credentials for a token pair',
      operationId: 'authLogin',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
      },
      responses: {
        200: {
          description: 'Login successful.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResult' } } },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/auth/logout': {
    post: {
      tags: ['Authentication'],
      summary: 'Invalidate a refresh token',
      operationId: 'authLogout',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } } },
      },
      responses: {
        204: { description: 'Refresh token invalidated.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/auth/refresh': {
    post: {
      tags: ['Authentication'],
      summary: 'Rotate an access/refresh token pair',
      description: 'Exchanges a valid, non-revoked refresh token for a new token pair. The old refresh token is invalidated (rotation).',
      operationId: 'authRefresh',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } } },
      },
      responses: {
        200: {
          description: 'New token pair issued.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenPair' } } },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/auth/forgot-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Initiate a password reset',
      description: 'Always returns 202, regardless of whether the email is registered, to prevent user enumeration.',
      operationId: 'authForgotPassword',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordRequest' } } },
      },
      responses: {
        202: { description: 'If the email is registered, a reset link has been sent.' },
        400: { $ref: '#/components/responses/ValidationError' },
        500: { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/auth/reset-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Complete a password reset',
      description: 'Consumes a reset token (valid for 1 hour, single use) and sets a new password. Invalidates all existing refresh tokens for the user.',
      operationId: 'authResetPassword',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' } } },
      },
      responses: {
        200: { description: 'Password reset successfully.' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/auth/me': {
    get: {
      tags: ['Authentication'],
      summary: "Get the authenticated user's profile",
      operationId: 'authMe',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Current user profile.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicUser' } } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { description: 'The authenticated user no longer exists.' },
        500: { $ref: '#/components/responses/InternalError' },
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────
// Full OpenAPI Document
// ─────────────────────────────────────────────────────────────────

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Global Quant Scanner Pro — REST API',
    version: '1.0.0',
    description:
      '## Overview\n' +
      'Global Quant Scanner Pro is a professional quantitative finance scanner that analyses equities ' +
      'across global markets using technical indicators, ML scoring, and portfolio optimisation.\n\n' +
      '## Versioning\n' +
      'The current API version is **v1**. All endpoints are available under `/api/v1/`. ' +
      'Legacy paths (`/api/`) continue to work but return an `X-Deprecated: true` header.\n\n' +
      '## Rate Limiting\n' +
      '- Global limit: **100 requests per 15 minutes** per IP\n' +
      '- Yahoo Finance proxy: **20 requests per minute** per IP\n\n' +
      '## Error Format\n' +
      'All errors return a JSON body with `error`, `timestamp`, and `statusCode` fields. ' +
      'Validation errors include a `details` array with per-field messages.',
    contact: {
      name: 'Global Quant Scanner Pro',
      url: 'https://github.com/JP-Fernando/global-scanner-pro',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    { url: '/api/v1', description: 'Version 1 (current)' },
    { url: '/api', description: 'Legacy (deprecated — use /api/v1)' },
  ],
  tags: [
    { name: 'Health', description: 'Server health and status endpoints' },
    { name: 'Market Data', description: 'Market data proxy endpoints (Yahoo Finance)' },
    { name: 'Utilities', description: 'Development and diagnostic utilities' },
    { name: 'Simulation', description: 'Investment simulation endpoints' },
    { name: 'Authentication', description: 'User registration, login, token refresh, and password reset' },
  ],
  paths,
  components: {
    schemas,
    responses,
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

// swagger-ui-express options
export const swaggerUiOptions: object = {
  customSiteTitle: 'GQS Pro — API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    tryItOutEnabled: true,
    displayRequestDuration: true,
    filter: true,
    deepLinking: true,
  },
};

// swagger-jsdoc options (for future JSDoc-driven spec generation)
export const swaggerJsdocOptions: SwaggerJsdocOptions = {
  definition: swaggerSpec as SwaggerJsdocOptions['definition'],
  apis: [],
};
