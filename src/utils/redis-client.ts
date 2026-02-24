/**
 * Optional Redis Client
 *
 * Provides a lazy-initialized Redis connection via ioredis.
 * When `REDIS_URL` is not set the client is `null` and the application
 * falls back to the in-process node-cache (single-instance mode).
 *
 * When `REDIS_URL` is set the application uses Redis as a shared cache,
 * enabling horizontal scaling across multiple instances.
 *
 * @module utils/redis-client
 */

import { Redis } from 'ioredis';
import { config } from '../config/environment.js';
import { log } from './logger.js';

// ── Connection state ──────────────────────────────────────────────────────────

let redisClient: Redis | null = null;
let connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
let lastError: string | null = null;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the Redis client if `REDIS_URL` is configured, otherwise `null`.
 *
 * The connection is established lazily on the first call and re-used
 * for all subsequent calls.
 */
export function getRedisClient(): Redis | null {
  if (!config.redis.url) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  connectionState = 'connecting';
  log.info('Connecting to Redis', { url: config.redis.url.replace(/:\/\/.*@/, '://***@') });

  redisClient = new Redis(config.redis.url, {
    keyPrefix: config.redis.keyPrefix,
    connectTimeout: config.redis.connectTimeoutMs,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 5) {
        log.error('Redis retry limit exceeded, giving up');
        return null; // stop retrying
      }
      const delay = Math.min(times * 200, 2000);
      log.warn(`Redis reconnect attempt ${times}, next in ${delay}ms`);
      return delay;
    },
    lazyConnect: false
  });

  redisClient.on('connect', () => {
    connectionState = 'connected';
    lastError = null;
    log.info('Redis connected');
  });

  redisClient.on('ready', () => {
    connectionState = 'connected';
    log.info('Redis ready');
  });

  redisClient.on('error', (err: Error) => {
    connectionState = 'error';
    lastError = err.message;
    log.error('Redis error', { error: err.message });
  });

  redisClient.on('close', () => {
    connectionState = 'disconnected';
    log.warn('Redis connection closed');
  });

  redisClient.on('reconnecting', () => {
    connectionState = 'connecting';
    log.info('Redis reconnecting');
  });

  return redisClient;
}

/**
 * Returns the current Redis connection status for health checks.
 */
export function getRedisStatus(): { enabled: boolean; state: string; error: string | null } {
  return {
    enabled: !!config.redis.url,
    state: connectionState,
    error: lastError
  };
}

/**
 * Gracefully closes the Redis connection.
 * Should be called during application shutdown.
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    connectionState = 'disconnected';
    log.info('Redis connection closed gracefully');
  }
}
