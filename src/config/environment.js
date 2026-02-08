/**
 * Environment Configuration and Validation
 *
 * This module loads and validates environment variables,
 * ensuring all required configuration is present before the application starts.
 *
 * @module config/environment
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment variable schema
 * Defines all configuration with validation and default values
 */
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.preprocess(
    (val) => val || '3000',
    z.string().regex(/^\d+$/).transform(Number)
  ),

  // Security
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters')
    .optional()
    .default('insecure-default-secret-change-in-production'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.preprocess(
    (val) => val || '900000',
    z.string().regex(/^\d+$/).transform(Number)
  ),
  RATE_LIMIT_MAX_REQUESTS: z.preprocess(
    (val) => val || '100',
    z.string().regex(/^\d+$/).transform(Number)
  ),
  RATE_LIMIT_YAHOO_MAX: z.preprocess(
    (val) => val || '20',
    z.string().regex(/^\d+$/).transform(Number)
  ),

  // External Services (Optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().transform(val => val ? Number(val) : undefined),
  SMTP_SECURE: z.string().transform(val => val === 'true').optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),

  // Webhooks (Optional)
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  TEAMS_WEBHOOK_URL: z.string().url().optional(),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),

  // Monitoring (Optional)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.enum(['development', 'staging', 'production'])
    .default('development'),
  SENTRY_TRACES_SAMPLE_RATE: z.preprocess(
    (val) => val || '0.1',
    z.string().regex(/^[0-9]*\.?[0-9]+$/)
      .transform(Number)
      .refine(val => val >= 0 && val <= 1, 'Sample rate must be between 0 and 1')
  ),

  // Feature Flags
  ENABLE_ML_FEATURES: z.preprocess(
    (val) => val === undefined ? 'true' : val,
    z.string().transform(val => val !== 'false')
  ),
  ENABLE_ALERTS: z.preprocess(
    (val) => val === undefined ? 'true' : val,
    z.string().transform(val => val !== 'false')
  ),
  ENABLE_PORTFOLIO_OPTIMIZER: z.preprocess(
    (val) => val === undefined ? 'true' : val,
    z.string().transform(val => val !== 'false')
  ),
  ENABLE_STRESS_TESTING: z.preprocess(
    (val) => val === undefined ? 'true' : val,
    z.string().transform(val => val !== 'false')
  ),
  ENABLE_ATTRIBUTION_ANALYSIS: z.preprocess(
    (val) => val === undefined ? 'true' : val,
    z.string().transform(val => val !== 'false')
  ),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info'),
  LOG_FILE_PATH: z.string().default('./logs'),
  LOG_MAX_FILES: z.preprocess(
    (val) => val || '7',
    z.string().regex(/^\d+$/).transform(Number)
  ),

  // Performance
  CACHE_TTL: z.preprocess(
    (val) => val || '300',
    z.string().regex(/^\d+$/).transform(Number)
  ),
  MAX_CONCURRENT_REQUESTS: z.preprocess(
    (val) => val || '10',
    z.string().regex(/^\d+$/).transform(Number)
  ),
  REQUEST_TIMEOUT: z.preprocess(
    (val) => val || '30000',
    z.string().regex(/^\d+$/).transform(Number)
  ),

  // Development
  DEBUG: z.preprocess(
    (val) => val === undefined ? 'false' : val,
    z.string().transform(val => val === 'true')
  ),
  ENABLE_API_DOCS: z.preprocess(
    (val) => val === undefined ? 'true' : val,
    z.string().transform(val => val !== 'false')
  )
});

/**
 * Validates and parses environment variables
 * @returns {Object} Validated and typed environment configuration
 * @throws {Error} If required environment variables are missing or invalid
 */
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);

    // Additional validation for production environment
    if (parsed.NODE_ENV === 'production') {
      if (parsed.SESSION_SECRET === 'insecure-default-secret-change-in-production') {
        throw new Error(
          'SESSION_SECRET must be set to a secure value in production. ' +
          'Generate one with: openssl rand -base64 32'
        );
      }

      if (!parsed.SENTRY_DSN) {
        console.warn(
          '⚠️  WARNING: SENTRY_DSN not configured. Error tracking will be disabled in production.'
        );
      }
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      (error.issues || []).forEach(err => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid environment configuration');
    }
    throw error;
  }
}

/**
 * Validated and typed environment configuration
 */
export const env = validateEnv();

/**
 * Configuration object derived from environment variables
 */
export const config = {
  server: {
    port: env.PORT,
    env: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
    isProduction: env.NODE_ENV === 'production',
    isStaging: env.NODE_ENV === 'staging',
    isTest: env.NODE_ENV === 'test'
  },

  security: {
    allowedOrigins: env.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
    sessionSecret: env.SESSION_SECRET,
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX_REQUESTS,
      yahooMax: env.RATE_LIMIT_YAHOO_MAX
    }
  },

  smtp: env.SMTP_HOST ? {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  } : null,

  webhooks: {
    slack: env.SLACK_WEBHOOK_URL,
    teams: env.TEAMS_WEBHOOK_URL,
    discord: env.DISCORD_WEBHOOK_URL
  },

  sentry: env.SENTRY_DSN ? {
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE
  } : null,

  features: {
    ml: env.ENABLE_ML_FEATURES,
    alerts: env.ENABLE_ALERTS,
    portfolioOptimizer: env.ENABLE_PORTFOLIO_OPTIMIZER,
    stressTesting: env.ENABLE_STRESS_TESTING,
    attributionAnalysis: env.ENABLE_ATTRIBUTION_ANALYSIS
  },

  logging: {
    level: env.LOG_LEVEL,
    filePath: env.LOG_FILE_PATH,
    maxFiles: env.LOG_MAX_FILES
  },

  performance: {
    cacheTTL: env.CACHE_TTL,
    maxConcurrentRequests: env.MAX_CONCURRENT_REQUESTS,
    requestTimeout: env.REQUEST_TIMEOUT
  },

  development: {
    debug: env.DEBUG,
    apiDocs: env.ENABLE_API_DOCS
  }
};

/**
 * Prints configuration summary on startup
 */
export function printConfig() {
  console.log('\n📋 Configuration Summary:');
  console.log(`   Environment: ${config.server.env}`);
  console.log(`   Port: ${config.server.port}`);
  console.log(`   Allowed Origins: ${config.security.allowedOrigins.join(', ')}`);
  console.log(`   Rate Limit: ${config.security.rateLimit.max} requests per ${config.security.rateLimit.windowMs / 1000}s`);
  console.log(`   Log Level: ${config.logging.level}`);
  console.log(`   Features:`);
  console.log(`     - ML: ${config.features.ml ? '✓' : '✗'}`);
  console.log(`     - Alerts: ${config.features.alerts ? '✓' : '✗'}`);
  console.log(`     - Portfolio Optimizer: ${config.features.portfolioOptimizer ? '✓' : '✗'}`);
  console.log(`     - Stress Testing: ${config.features.stressTesting ? '✓' : '✗'}`);
  console.log(`     - Attribution Analysis: ${config.features.attributionAnalysis ? '✓' : '✗'}`);
  console.log(`   Sentry: ${config.sentry ? '✓ Enabled' : '✗ Disabled'}`);
  console.log(`   SMTP: ${config.smtp ? '✓ Configured' : '✗ Not configured'}`);
  console.log('');
}

export default config;
