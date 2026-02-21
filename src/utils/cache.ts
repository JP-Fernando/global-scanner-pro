/**
 * In-memory cache utility for API response caching.
 *
 * Uses node-cache with configurable TTL to reduce external API calls
 * and improve response times for repeated requests.
 *
 * @module utils/cache
 */

import NodeCache from 'node-cache';
import { log } from './logger.js';

// ── Cache instances ─────────────────────────────────────────────────────────

/**
 * Yahoo Finance API cache.
 * TTL: 5 minutes (market data changes slowly during trading hours).
 * Stale check period: 60 seconds.
 */
const yahooCache = new NodeCache({
  stdTTL: 300,       // 5 minutes default TTL
  checkperiod: 60,   // cleanup check every 60s
  useClones: false,  // avoid deep-clone overhead for read-heavy workload
  deleteOnExpire: true
});

// ── Cache statistics ─────────────────────────────────────────────────────────

let hits = 0;
let misses = 0;

/**
 * Returns cumulative cache statistics.
 */
export const getCacheStats = () => {
  const nodeStats = yahooCache.getStats();
  return {
    hits,
    misses,
    keys: yahooCache.keys().length,
    hitRate: hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0,
    // Node-cache internal stats (ksize, vsize, etc.)
    ksize: nodeStats.ksize,
    vsize: nodeStats.vsize
  };
};

/**
 * Resets cumulative hit/miss counters (useful in tests).
 */
export const resetCacheStats = () => {
  hits = 0;
  misses = 0;
};

// ── Yahoo Finance cache helpers ──────────────────────────────────────────────

/**
 * Builds a deterministic cache key from Yahoo Finance query parameters.
 *
 * @param symbol - Ticker symbol (e.g. "AAPL")
 * @param from   - Start timestamp (Unix seconds)
 * @param to     - End timestamp (Unix seconds)
 */
export const buildYahooCacheKey = (symbol: string, from: string | number, to: string | number): string =>
  `yahoo:${symbol}:${from}:${to}`;

/**
 * Retrieves a cached Yahoo Finance response.
 *
 * @returns The cached data, or `undefined` on cache miss.
 */
export const getYahooCache = (key: string): unknown | undefined => {
  const value = yahooCache.get(key);
  if (value !== undefined) {
    hits++;
    log.debug('Cache hit', { key });
    return value;
  }
  misses++;
  log.debug('Cache miss', { key });
  return undefined;
};

/**
 * Stores a Yahoo Finance response in the cache.
 *
 * @param key  - Cache key (from `buildYahooCacheKey`)
 * @param data - Response data to cache
 * @param ttl  - Optional TTL override in seconds
 */
export const setYahooCache = (key: string, data: unknown, ttl?: number): void => {
  yahooCache.set(key, data, ttl ?? 300);
  log.debug('Cache set', { key, ttl: ttl ?? 300 });
};

/**
 * Removes all keys from the Yahoo Finance cache.
 * Useful for forced cache invalidation.
 */
export const flushYahooCache = (): void => {
  yahooCache.flushAll();
  log.info('Yahoo Finance cache flushed');
};

export { yahooCache };
