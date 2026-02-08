/**
 * Environment Configuration Tests
 *
 * Tests for the environment variable validation and config module.
 * Since the module runs validateEnv() at import time, we test the
 * already-loaded exports rather than trying to re-import.
 */

import { describe, it, expect, vi } from 'vitest';
import { env, config, printConfig } from '../../config/environment.js';

describe('Environment Configuration', () => {
  // ---------------------------------------------------------------
  // env object (validated environment variables)
  // ---------------------------------------------------------------
  describe('env (validated environment variables)', () => {
    it('has NODE_ENV set to a valid value', () => {
      expect(['development', 'staging', 'production', 'test']).toContain(env.NODE_ENV);
    });

    it('has PORT as a number', () => {
      expect(env.PORT).toBeTypeOf('number');
      expect(env.PORT).toBeGreaterThan(0);
    });

    it('has rate limit values as numbers', () => {
      expect(env.RATE_LIMIT_WINDOW_MS).toBeTypeOf('number');
      expect(env.RATE_LIMIT_MAX_REQUESTS).toBeTypeOf('number');
      expect(env.RATE_LIMIT_YAHOO_MAX).toBeTypeOf('number');
    });

    it('has feature flags as booleans', () => {
      expect(env.ENABLE_ML_FEATURES).toBeTypeOf('boolean');
      expect(env.ENABLE_ALERTS).toBeTypeOf('boolean');
      expect(env.ENABLE_PORTFOLIO_OPTIMIZER).toBeTypeOf('boolean');
      expect(env.ENABLE_STRESS_TESTING).toBeTypeOf('boolean');
      expect(env.ENABLE_ATTRIBUTION_ANALYSIS).toBeTypeOf('boolean');
    });

    it('has LOG_LEVEL as a valid string', () => {
      const validLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
      expect(validLevels).toContain(env.LOG_LEVEL);
    });

    it('has CACHE_TTL as a number', () => {
      expect(env.CACHE_TTL).toBeTypeOf('number');
      expect(env.CACHE_TTL).toBeGreaterThan(0);
    });

    it('has MAX_CONCURRENT_REQUESTS as a number', () => {
      expect(env.MAX_CONCURRENT_REQUESTS).toBeTypeOf('number');
      expect(env.MAX_CONCURRENT_REQUESTS).toBeGreaterThan(0);
    });

    it('has REQUEST_TIMEOUT as a number', () => {
      expect(env.REQUEST_TIMEOUT).toBeTypeOf('number');
      expect(env.REQUEST_TIMEOUT).toBeGreaterThan(0);
    });

    it('has DEBUG as a boolean', () => {
      expect(env.DEBUG).toBeTypeOf('boolean');
    });

    it('has ENABLE_API_DOCS as a boolean', () => {
      expect(env.ENABLE_API_DOCS).toBeTypeOf('boolean');
    });

    it('has LOG_FILE_PATH as a string', () => {
      expect(env.LOG_FILE_PATH).toBeTypeOf('string');
    });

    it('has LOG_MAX_FILES as a number', () => {
      expect(env.LOG_MAX_FILES).toBeTypeOf('number');
    });

    it('SENTRY_TRACES_SAMPLE_RATE is between 0 and 1', () => {
      expect(env.SENTRY_TRACES_SAMPLE_RATE).toBeGreaterThanOrEqual(0);
      expect(env.SENTRY_TRACES_SAMPLE_RATE).toBeLessThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------
  // config object (derived configuration)
  // ---------------------------------------------------------------
  describe('config (derived configuration)', () => {
    it('has server section with expected fields', () => {
      expect(config.server.port).toBeTypeOf('number');
      expect(config.server.env).toBeTypeOf('string');
      expect(config.server.isDevelopment).toBeTypeOf('boolean');
      expect(config.server.isProduction).toBeTypeOf('boolean');
      expect(config.server.isStaging).toBeTypeOf('boolean');
    });

    it('production and staging are mutually exclusive', () => {
      // isDevelopment is true for both 'development' and 'test' NODE_ENV
      expect(config.server.isProduction && config.server.isStaging).toBe(false);
    });

    it('has security section with allowed origins and rate limits', () => {
      expect(config.security.allowedOrigins).toBeInstanceOf(Array);
      expect(config.security.allowedOrigins.length).toBeGreaterThan(0);
      expect(config.security.sessionSecret).toBeTypeOf('string');
      expect(config.security.rateLimit.windowMs).toBeTypeOf('number');
      expect(config.security.rateLimit.max).toBeTypeOf('number');
      expect(config.security.rateLimit.yahooMax).toBeTypeOf('number');
    });

    it('smtp is null or an object', () => {
      if (config.smtp) {
        expect(config.smtp.host).toBeTypeOf('string');
      } else {
        expect(config.smtp).toBeNull();
      }
    });

    it('webhooks section has optional URL fields', () => {
      expect(config.webhooks).toBeDefined();
      for (const key of ['slack', 'teams', 'discord']) {
        const val = config.webhooks[key];
        if (val !== undefined) {
          expect(val).toBeTypeOf('string');
        }
      }
    });

    it('sentry is null or an object', () => {
      if (config.sentry) {
        expect(config.sentry.dsn).toBeTypeOf('string');
        expect(config.sentry.environment).toBeTypeOf('string');
        expect(config.sentry.tracesSampleRate).toBeTypeOf('number');
      } else {
        expect(config.sentry).toBeNull();
      }
    });

    it('has features section with boolean flags', () => {
      expect(config.features.ml).toBeTypeOf('boolean');
      expect(config.features.alerts).toBeTypeOf('boolean');
      expect(config.features.portfolioOptimizer).toBeTypeOf('boolean');
      expect(config.features.stressTesting).toBeTypeOf('boolean');
      expect(config.features.attributionAnalysis).toBeTypeOf('boolean');
    });

    it('has logging section', () => {
      expect(config.logging.level).toBeTypeOf('string');
      expect(config.logging.filePath).toBeTypeOf('string');
      expect(config.logging.maxFiles).toBeTypeOf('number');
    });

    it('has performance section', () => {
      expect(config.performance.cacheTTL).toBeTypeOf('number');
      expect(config.performance.maxConcurrentRequests).toBeTypeOf('number');
      expect(config.performance.requestTimeout).toBeTypeOf('number');
    });

    it('has development section', () => {
      expect(config.development.debug).toBeTypeOf('boolean');
      expect(config.development.apiDocs).toBeTypeOf('boolean');
    });
  });

  // ---------------------------------------------------------------
  // printConfig
  // ---------------------------------------------------------------
  describe('printConfig', () => {
    it('prints config summary without throwing', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(() => printConfig()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      const allOutput = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(allOutput).toContain('Configuration Summary');
      expect(allOutput).toContain('Environment');
      expect(allOutput).toContain('Port');

      consoleSpy.mockRestore();
    });
  });
});
