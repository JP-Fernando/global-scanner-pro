/**
 * Yahoo Finance API Cache
 *
 * Caches Yahoo Finance API responses to reduce external API calls and
 * improve response times for repeated requests.
 *
 * Backend selection (transparent to callers):
 *   - Redis  — when REDIS_URL is set (shared cache; supports horizontal scaling)
 *   - node-cache — default (in-process; single-instance mode)
 *
 * TTL: 5 minutes (market data changes slowly during trading hours).
 *
 * @module utils/cache
 */

import NodeCache from 'node-cache';
import { createCacheAdapter, type CacheAdapter } from './cache-adapter.js';
import { log } from './logger.js';

// ── Internal node-cache instance (used as fallback) ──────────────────────────

const yahooNodeCache = new NodeCache({
  stdTTL: 300,       // 5 minutes default TTL
  checkperiod: 60,   // cleanup check every 60s
  useClones: false,  // avoid deep-clone overhead for read-heavy workload
  deleteOnExpire: true
});

// ── Adapter (Redis or node-cache) ─────────────────────────────────────────────

let adapter: CacheAdapter | null = null;

/**
 * Lazily initialises and returns the cache adapter.
 * Deferred to allow the Redis client to be set up before first use.
 */
function getAdapter(): CacheAdapter {
  if (!adapter) {
    adapter = createCacheAdapter(yahooNodeCache);
  }
  return adapter;
}

// ── Cache statistics ─────────────────────────────────────────────────────────

let hits = 0;
let misses = 0;

/**
 * Returns cumulative cache statistics.
 */
export const getCacheStats = () => {
  const nodeStats = yahooNodeCache.getStats();
  const backend = adapter?.backend ?? 'node-cache';
  return {
    backend,
    hits,
    misses,
    // `keys` is only accurate for node-cache; Redis key count requires a DBSIZE call
    keys: backend === 'node-cache' ? yahooNodeCache.keys().length : undefined,
    hitRate: hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0,
    // node-cache internal memory stats (only meaningful in node-cache mode)
    ksize: backend === 'node-cache' ? nodeStats.ksize : undefined,
    vsize: backend === 'node-cache' ? nodeStats.vsize : undefined
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
export const getYahooCache = async (key: string): Promise<unknown | undefined> => {
  const value = await getAdapter().get(key);
  if (value !== undefined) {
    hits++;
    log.debug('Cache hit', { key, backend: getAdapter().backend });
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
 * @param ttl  - Optional TTL override in seconds (default: 300)
 */
export const setYahooCache = async (key: string, data: unknown, ttl?: number): Promise<void> => {
  await getAdapter().set(key, data, ttl ?? 300);
  log.debug('Cache set', { key, ttl: ttl ?? 300, backend: getAdapter().backend });
};

/**
 * Removes all keys from the Yahoo Finance cache.
 * Useful for forced cache invalidation.
 */
export const flushYahooCache = async (): Promise<void> => {
  await getAdapter().flush();
  log.info('Yahoo Finance cache flushed', { backend: getAdapter().backend });
};

/** Exposed for tests that need direct node-cache access */
export { yahooNodeCache as yahooCache };
