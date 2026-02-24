# Operations Runbook — Global Quant Scanner Pro

This runbook covers day-to-day operational tasks, incident response, troubleshooting, and maintenance procedures.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Common Operational Tasks](#2-common-operational-tasks)
3. [Health Monitoring](#3-health-monitoring)
4. [Troubleshooting Guide](#4-troubleshooting-guide)
5. [Incident Response](#5-incident-response)
6. [Maintenance Procedures](#6-maintenance-procedures)
7. [Log Management](#7-log-management)
8. [Scaling Procedures](#8-scaling-procedures)

---

## 1. System Overview

### Architecture

```
Browser ─── Nginx (TLS) ─── Node.js / Express (server.js)
                                │
                         ┌──────┴──────┐
                         │             │
                    node-cache     Redis (optional)
                    (in-process)   (shared cache + BullMQ queues)
                         │
                    Yahoo Finance API (external)
```

### Key endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/health` | Application health — used by load balancers and monitors |
| `GET /metrics` | Prometheus metrics — scrape every 15s |
| `GET /api-docs` | Interactive Swagger UI |
| `GET /api/v1/yahoo` | Yahoo Finance data proxy (cached 5 min) |
| `POST /api/v1/jobs/optimize` | Submit portfolio optimisation job (Redis required) |
| `POST /api/v1/jobs/report` | Submit report generation job (Redis required) |
| `POST /api/v1/jobs/ml-train` | Submit ML training job (Redis required) |
| `GET /api/v1/jobs/:id` | Poll async job status |

### Log files (under `./logs/`)

| File | Contents | Rotation |
|------|----------|---------|
| `combined-YYYY-MM-DD.log` | All log levels | Daily, 14-day retention |
| `error-YYYY-MM-DD.log` | Errors only | Daily, 30-day retention |
| `http-YYYY-MM-DD.log` | HTTP access log | Daily, 7-day retention |
| `exceptions.log` | Uncaught exceptions | Size-capped 5 MB × 3 |
| `rejections.log` | Unhandled promise rejections | Size-capped 5 MB × 3 |

---

## 2. Common Operational Tasks

### Check server is running

```bash
pm2 status gsp
# or
systemctl status gsp
```

### View live logs

```bash
pm2 logs gsp --lines 100
# or tail the structured log
tail -f logs/combined-$(date +%Y-%m-%d).log | jq .
```

### Restart the application

```bash
pm2 restart gsp           # graceful restart
pm2 reload gsp            # zero-downtime reload (when using cluster mode)
```

### Check application health

```bash
curl -s http://localhost:3000/api/v1/health | jq .
```

Expected response shape:
```json
{
  "status": "ok",
  "apiVersion": "v1",
  "timestamp": "2026-02-24T18:00:00.000Z",
  "version": "0.0.6",
  "environment": "production",
  "uptime": 3600,
  "memory": { "heapUsedMb": 120, "heapTotalMb": 200, "rssMb": 180 },
  "cache": { "backend": "node-cache", "yahoo": { "hitRate": "85%" } },
  "queue": { "enabled": false, "queues": [] },
  "dependencies": { "internalCache": "ok", "redis": { "enabled": false } },
  "features": { "ml": true, "alerts": true }
}
```

### Flush the API cache

```bash
# Dev/staging only (not available in production)
curl -X POST http://localhost:3000/api/v1/cache/flush
```

### View Prometheus metrics

```bash
curl -s http://localhost:3000/metrics | grep -E "^(http_requests|http_request_duration|cache)"
```

### Check queue status (when Redis enabled)

```bash
curl -s http://localhost:3000/api/v1/jobs | jq .
```

---

## 3. Health Monitoring

### Key Prometheus queries

```promql
# Request rate (req/s over 5 min window)
rate(http_requests_total[5m])

# Error rate (5xx)
rate(http_requests_total{status_code=~"5.."}[5m])
  / rate(http_requests_total[5m])

# p97.5 latency
histogram_quantile(0.975, rate(http_request_duration_seconds_bucket[5m]))

# Cache hit rate
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))

# Active connections
http_active_connections

# Heap memory used (MB)
nodejs_heap_size_used_bytes / 1024 / 1024
```

### Alert thresholds

| Metric | Warning | Critical |
|--------|---------|---------|
| Error rate | > 0.5% | > 1% |
| p97.5 latency | > 300 ms | > 500 ms |
| Heap used | > 70% of heap total | > 90% |
| RSS memory | > 400 MB | > 600 MB |
| Cache hit rate | < 50% | < 20% |

### Uptime monitoring

Configure an external monitor (e.g. UptimeRobot, BetterUptime) to:
- Poll `GET /api/v1/health` every 60 seconds
- Alert if response is not `200` or body does not contain `"status":"ok"`
- Alert if response time > 2 seconds

---

## 4. Troubleshooting Guide

### High CPU usage

```bash
# Identify process
top -p $(pm2 pid gsp)

# Check for CPU-intensive routes
curl -s localhost:3000/metrics | grep http_request_duration_seconds_sum

# Enable profiling temporarily
NODE_OPTIONS=--prof node server.js
# Then analyse: node --prof-process isolate-*.log
```

**Common causes and fixes:**
- Yahoo Finance proxy overloaded → increase `RATE_LIMIT_YAHOO_MAX`
- In-memory cache evictions → check `cache_keys_count` metric, increase `CACHE_TTL`
- ML job processor using too many resources → set `concurrency: 1` in queue-manager, or add Redis + offload to dedicated worker

### High memory usage

```bash
# Check heap breakdown
curl -s localhost:3000/api/v1/health | jq .memory

# Check for log accumulation
du -sh logs/
ls -lh logs/*.log | sort -k5 -rh | head -10
```

**Common causes and fixes:**
- Log files not rotating → verify `LOG_MAX_DAYS` and `LOG_ZIP_ARCHIVED` in `.env`
- Node-cache growing unbounded → verify `CACHE_TTL` is set and `checkperiod` is active
- Memory leak → take heap snapshot: `kill -USR2 $(pm2 pid gsp)` (Node.js heap snapshot to `/tmp/`)

### Slow response times

```bash
# Check per-route latency
curl -s localhost:3000/metrics | grep http_request_duration_seconds_sum

# Check Yahoo Finance upstream latency
curl -w "%{time_total}" -o /dev/null -s "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?period1=0&period2=1"
```

**Common causes and fixes:**
- Yahoo Finance upstream slow → cache hit rate low → check `X-Cache` header on `/api/v1/yahoo`
- Node event loop blocked → check for synchronous heavy operations; offload to BullMQ queues
- Compression not working → verify `compression` middleware is before routes in `server.js`

### Redis connection errors

```bash
# Check Redis connection state
curl -s localhost:3000/api/v1/health | jq .dependencies.redis

# Test Redis directly
redis-cli -u $REDIS_URL ping
# → PONG

# Check Redis logs
redis-cli -u $REDIS_URL info replication
```

**Common causes and fixes:**
- Wrong `REDIS_URL` format → must start with `redis://` or `rediss://`
- Redis auth required → include password: `redis://:password@host:port`
- Network firewall → verify port 6379 is reachable from app server
- Redis memory full → check `redis-cli info memory`, increase `maxmemory` or enable eviction policy

### Yahoo Finance proxy returning errors

```bash
# Check the raw error
curl -v "http://localhost:3000/api/v1/yahoo?symbol=AAPL&from=$(date -d '30 days ago' +%s)&to=$(date +%s)"

# Check rate limiting headers
curl -I "http://localhost:3000/api/v1/yahoo?symbol=AAPL&from=0&to=1" 2>&1 | grep -i rate
```

**Common causes and fixes:**
- Yahoo Finance blocked our IP → the proxy uses a realistic User-Agent; if blocked wait a few minutes
- Rate limit exceeded → client making too many requests; increase `RATE_LIMIT_YAHOO_MAX` or implement client-side backoff
- Symbol not found → check ticker is valid on Yahoo Finance

### Application not starting

```bash
# Check for port conflicts
lsof -ti:3000

# Check for env validation errors
NODE_ENV=production node server.js 2>&1 | head -30

# Check for module not found errors
npm run build:server 2>&1
```

---

## 5. Incident Response

### Severity levels

| Level | Description | Response Time | Example |
|-------|-------------|--------------|---------|
| P1 — Critical | Full service outage | 15 minutes | App not responding, all requests failing |
| P2 — High | Degraded service | 1 hour | Error rate > 5%, latency > 2s |
| P3 — Medium | Partial degradation | 4 hours | Cache not working, Yahoo proxy slow |
| P4 — Low | Minor issue | 24 hours | Log rotation issue, non-critical warning |

### Incident response steps

1. **Detect**: Alert fires from Sentry / Prometheus / UptimeRobot
2. **Assess**: Check health endpoint and Prometheus metrics
3. **Communicate**: Notify stakeholders of impact and ETA
4. **Mitigate**: Apply immediate fix (restart, rollback, scale up)
5. **Resolve**: Apply permanent fix
6. **Post-mortem**: Document root cause and prevention

### Communication templates

**Initial notification (P1/P2):**
> `[INCIDENT] Global Quant Scanner Pro — {severity}: {brief description}. Impact: {user impact}. Team investigating. Updates every 15 min.`

**Resolution notification:**
> `[RESOLVED] Global Quant Scanner Pro — {description} resolved at {time}. Duration: {duration}. Root cause: {summary}. Post-mortem to follow.`

### Emergency contacts

| Role | Action |
|------|--------|
| On-call engineer | Check Sentry + Prometheus, restart app if needed |
| Infrastructure | Redis, server health, network issues |
| Lead developer | Code-level issues, rollback decisions |

---

## 6. Maintenance Procedures

### Dependency updates

```bash
# Check for outdated dependencies
npm outdated

# Check for security vulnerabilities
npm audit

# Update all patch and minor versions
npm update

# Update a specific package
npm install package@latest --legacy-peer-deps
```

### Certificate renewal (Let's Encrypt)

```bash
# Renew certificates (certbot auto-renews, but manual if needed)
certbot renew --nginx

# Verify expiry
openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Database/cache maintenance

```bash
# Check Redis memory usage
redis-cli -u $REDIS_URL info memory | grep used_memory_human

# Flush all Redis keys (CAUTION: clears all cached data)
redis-cli -u $REDIS_URL flushdb

# Clear expired keys
redis-cli -u $REDIS_URL debug sleep 0  # trigger passive expiry scan
```

### Rotating the SESSION_SECRET

1. Generate new secret: `openssl rand -base64 32`
2. Update `.env` with new value
3. Restart the application: `pm2 restart gsp`
4. Note: existing browser sessions will be invalidated (users must re-login once auth is implemented)

---

## 7. Log Management

### View logs

```bash
# Today's combined log (structured JSON, pretty-printed)
tail -f logs/combined-$(date +%Y-%m-%d).log | jq .

# Filter errors only
grep '"level":"error"' logs/combined-$(date +%Y-%m-%d).log | jq .

# Filter by request ID for tracing a specific request
grep '"requestId":"abc-123"' logs/combined-$(date +%Y-%m-%d).log | jq .

# View HTTP access log
tail -f logs/http-$(date +%Y-%m-%d).log | jq '{method,url,statusCode,duration}'
```

### Log shipping to ELK / Loki

The logs are already in JSON format (ELK-compatible). To ship them:

**Filebeat (ELK) configuration:**
```yaml
filebeat.inputs:
  - type: log
    paths:
      - /path/to/global-scanner-pro/logs/*.log
    json.keys_under_root: true
    json.add_error_key: true
    fields:
      service: global-scanner-pro
      environment: production

output.elasticsearch:
  hosts: ["https://elasticsearch:9200"]
  index: "gsp-logs-%{+yyyy.MM.dd}"
```

**Promtail (Loki) configuration:**
```yaml
scrape_configs:
  - job_name: gsp
    static_configs:
      - targets: [localhost]
        labels:
          job: global-scanner-pro
          __path__: /path/to/logs/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            service: service
```

### Archive and cleanup

Log rotation is handled automatically by `winston-daily-rotate-file`:
- Combined logs: 14-day retention
- Error logs: 30-day retention
- HTTP logs: 7-day retention
- Archived logs are gzip-compressed (when `LOG_ZIP_ARCHIVED=true`)

To manually clean up old logs:
```bash
find logs/ -name "*.log.gz" -mtime +30 -delete
find logs/ -name "*.log" -mtime +14 -delete
```

---

## 8. Scaling Procedures

### Vertical scaling (single instance)

1. Increase server resources (CPU/RAM)
2. Adjust `MAX_CONCURRENT_REQUESTS` in `.env`
3. Increase `RATE_LIMIT_MAX_REQUESTS` if needed
4. Restart: `pm2 restart gsp`

### Horizontal scaling (multiple instances)

**Prerequisites:**
- `REDIS_URL` must be configured (shared cache)
- A load balancer must be in front (Nginx or cloud LB)

```bash
# Using PM2 cluster mode
pm2 start server.js --name gsp -i max   # one instance per CPU core
pm2 save

# Using Docker Compose
docker compose up -d --scale app=4
```

**Verify all instances share cache:**
```bash
# Request to instance 1 — expect X-Cache: MISS
curl -H "Host: app1" http://localhost:3000/api/v1/yahoo?symbol=AAPL&from=0&to=1

# Same request to instance 2 — expect X-Cache: HIT (from Redis)
curl -H "Host: app2" http://localhost:3001/api/v1/yahoo?symbol=AAPL&from=0&to=1
```

### Adding a Redis instance

1. Provision Redis (local, Docker, AWS ElastiCache, Redis Cloud)
2. Set `REDIS_URL=redis://host:port` in `.env`
3. Optionally set `REDIS_KEY_PREFIX=gsp:` to namespace keys
4. Restart the application
5. Verify: `curl localhost:3000/api/v1/health | jq '.dependencies.redis'`

### Job queue scaling

When `REDIS_URL` is set, BullMQ workers automatically process background jobs:
- Portfolio optimisation: 2 concurrent workers
- Report generation: 2 concurrent workers
- ML training: 1 concurrent worker (heavier)

To add dedicated worker processes, create a separate `worker.js` entry point that imports and runs only the queue processors without starting the HTTP server.
