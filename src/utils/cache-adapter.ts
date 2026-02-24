/**
 * Cache Adapter
 *
 * Provides a unified caching interface that transparently delegates to either:
 *   - Redis (when REDIS_URL is set) — shared cache enabling horizontal scaling
 *   - node-cache (default)          — in-process cache for single-instance mode
 *
 * Both backends expose the same `get / set / del / flush` surface so the rest of
 * the codebase is decoupled from the underlying cache technology.
 *
 * @module utils/cache-adapter
 */

import NodeCache from 'node-cache';
import { getRedisClient } from './redis-client.js';
import { log } from './logger.js';

// ── Backend type ──────────────────────────────────────────────────────────────

export type CacheBackend = 'redis' | 'node-cache';

// ── Adapter interface ─────────────────────────────────────────────────────────

export interface CacheAdapter {
  /** Returns `undefined` on cache miss. */
  get(key: string): Promise<unknown | undefined>;
  /** Stores `value` for `ttlSeconds`. */
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  /** Removes a single key. */
  del(key: string): Promise<void>;
  /** Removes all keys (respects key prefix when using Redis). */
  flush(): Promise<void>;
  /** Active backend identifier. */
  backend: CacheBackend;
}

// ── Redis adapter ─────────────────────────────────────────────────────────────

function makeRedisAdapter(): CacheAdapter {
  const redis = getRedisClient()!;

  return {
    backend: 'redis',

    async get(key: string): Promise<unknown | undefined> {
      try {
        const raw = await redis.get(key);
        if (raw === null) return undefined;
        return JSON.parse(raw) as unknown;
      } catch (err) {
        log.error('Redis GET error', { key, error: (err as Error).message });
        return undefined;
      }
    },

    async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
      try {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch (err) {
        log.error('Redis SET error', { key, error: (err as Error).message });
      }
    },

    async del(key: string): Promise<void> {
      try {
        await redis.del(key);
      } catch (err) {
        log.error('Redis DEL error', { key, error: (err as Error).message });
      }
    },

    async flush(): Promise<void> {
      try {
        // Only flush keys matching our prefix to avoid clearing unrelated data
        const prefix = (redis.options.keyPrefix as string) ?? '';
        const keys = await redis.keys(`${prefix}*`);
        if (keys.length > 0) {
          // Strip prefix from keys before calling del (ioredis adds it automatically)
          const strippedKeys = keys.map((k: string) =>
            prefix && k.startsWith(prefix) ? k.slice(prefix.length) : k
          );
          await redis.del(...strippedKeys);
        }
      } catch (err) {
        log.error('Redis FLUSH error', { error: (err as Error).message });
      }
    }
  };
}

// ── node-cache adapter ────────────────────────────────────────────────────────

function makeNodeCacheAdapter(cache: NodeCache): CacheAdapter {
  return {
    backend: 'node-cache',

    async get(key: string): Promise<unknown | undefined> {
      const value = cache.get(key);
      return value === undefined ? undefined : value;
    },

    async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
      cache.set(key, value, ttlSeconds);
    },

    async del(key: string): Promise<void> {
      cache.del(key);
    },

    async flush(): Promise<void> {
      cache.flushAll();
    }
  };
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Creates a CacheAdapter backed by Redis (if available) or node-cache.
 *
 * @param nodeCache - Fallback node-cache instance used when Redis is not configured.
 */
export function createCacheAdapter(nodeCache: NodeCache): CacheAdapter {
  const redis = getRedisClient();

  if (redis) {
    log.info('Cache adapter: using Redis backend');
    return makeRedisAdapter();
  }

  log.info('Cache adapter: using node-cache backend (single-instance mode)');
  return makeNodeCacheAdapter(nodeCache);
}
