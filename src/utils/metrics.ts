/**
 * Prometheus metrics module.
 *
 * Exposes application-level metrics via prom-client:
 *  - HTTP request rate and latency
 *  - HTTP error rate (4xx/5xx)
 *  - Active HTTP connections
 *  - Cache hit/miss counts
 *  - Node.js default process metrics (CPU, memory, GC, event loop)
 *
 * Metrics are scraped by Prometheus from the GET /metrics endpoint.
 *
 * @module utils/metrics
 */

import client from 'prom-client';
import type { Request, Response, NextFunction } from 'express';
import { getCacheStats } from './cache.js';

// ── Registry ─────────────────────────────────────────────────────────────────

/**
 * Dedicated Prometheus registry — avoids polluting the global default registry
 * which could cause issues in test environments.
 */
export const registry = new client.Registry();

// Attach default Node.js metrics (CPU, memory, GC, event loop lag, etc.)
client.collectDefaultMetrics({ register: registry });

// ── Custom metrics ────────────────────────────────────────────────────────────

/**
 * Total number of HTTP requests processed, labelled by method, route and status.
 */
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [registry]
});

/**
 * HTTP request duration histogram (seconds).
 * Buckets tuned for a fast API: sub-ms to 5 s.
 */
export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry]
});

/**
 * Number of currently active HTTP connections being processed.
 */
export const httpActiveConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections being processed',
  registers: [registry]
});

/**
 * Yahoo Finance cache hit counter.
 */
export const cacheHitsTotal = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache'] as const,
  registers: [registry]
});

/**
 * Yahoo Finance cache miss counter.
 */
export const cacheMissesTotal = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache'] as const,
  registers: [registry]
});

/**
 * Gauge for current cache key count.
 */
export const cacheKeysGauge = new client.Gauge({
  name: 'cache_keys_count',
  help: 'Current number of keys in each cache',
  labelNames: ['cache'] as const,
  registers: [registry]
});

/**
 * Counter for Yahoo Finance external requests.
 */
export const yahooRequestsTotal = new client.Counter({
  name: 'yahoo_finance_requests_total',
  help: 'Total number of requests forwarded to Yahoo Finance (cache misses)',
  labelNames: ['status'] as const,
  registers: [registry]
});

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * Normalises a request path to a consistent route label for metric cardinality control.
 * Dynamic path segments (UUIDs, numeric IDs) are replaced with `:id`.
 *
 * @example
 *   normaliseRoute('/api/v1/yahoo')   → '/api/v1/yahoo'
 *   normaliseRoute('/api/yahoo')      → '/api/yahoo'
 */
const normaliseRoute = (req: Request): string => {
  // Use Express's matched route pattern when available
  const matched = req.route?.path as string | undefined;
  if (matched) {
    const base = req.baseUrl ?? '';
    return base + matched;
  }
  // Fall back to raw path with ID-like segments replaced
  return req.path.replace(/\/[0-9a-f-]{8,}/gi, '/:id');
};

/**
 * Express middleware that instruments every HTTP request with Prometheus metrics.
 *
 * Records:
 *  - Active connection gauge (increment on start, decrement on finish)
 *  - Request counter (method × route × status)
 *  - Request duration histogram (method × route × status)
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  httpActiveConnections.inc();

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - startTime;
    const durationS = Number(durationNs) / 1e9;
    const route = normaliseRoute(req);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode)
    };

    httpActiveConnections.dec();
    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationS);
  });

  next();
};

// ── Cache metrics refresh ─────────────────────────────────────────────────────

/**
 * Refreshes Prometheus cache gauges from the in-memory cache stats.
 * Called on each scrape of the /metrics endpoint.
 */
export const refreshCacheMetrics = (): void => {
  const stats = getCacheStats();
  cacheKeysGauge.set({ cache: 'yahoo' }, stats.keys);
};

// ── Metrics handler ───────────────────────────────────────────────────────────

/**
 * Express route handler for GET /metrics.
 * Returns Prometheus text format — intended for scraping by a Prometheus server.
 *
 * Clients should be restricted to internal networks / monitoring systems only.
 */
export const metricsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    refreshCacheMetrics();
    const metrics = await registry.metrics();
    res.set('Content-Type', registry.contentType);
    res.end(metrics);
  } catch (err) {
    res.status(500).end(String(err));
  }
};
