# Deployment Guide — Global Quant Scanner Pro

This guide covers prerequisites, environment setup, and step-by-step deployment procedures for all environments.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Development Deployment](#3-development-deployment)
4. [Staging Deployment](#4-staging-deployment)
5. [Production Deployment](#5-production-deployment)
6. [Docker Deployment](#6-docker-deployment)
7. [Post-Deployment Verification](#7-post-deployment-verification)
8. [Rollback Procedures](#8-rollback-procedures)
9. [Common Deployment Issues](#9-common-deployment-issues)

---

## 1. Prerequisites

| Requirement | Minimum Version | Notes |
|-------------|----------------|-------|
| Node.js | 20.x LTS | `node --version` |
| npm | 10.x | bundled with Node 20 |
| Git | 2.x | for source control |
| Docker | 24.x | optional — for containerised deployment |
| Docker Compose | 2.x | optional — for local multi-service setup |
| Redis | 7.x | optional — enables Redis cache and async job queues |

### Required environment variables for production

```
NODE_ENV=production
SESSION_SECRET=<32+ random bytes — openssl rand -base64 32>
ALLOWED_ORIGINS=https://your-domain.com
```

---

## 2. Environment Setup

### 2.1 Clone and install

```bash
git clone https://github.com/JP-Fernando/global-scanner-pro.git
cd global-scanner-pro
npm ci          # install exact dependency versions from package-lock.json
```

### 2.2 Create `.env` from template

```bash
cp .env.example .env
# Edit .env — at minimum set NODE_ENV, SESSION_SECRET, ALLOWED_ORIGINS
```

### 2.3 Key environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | `development`, `staging`, or `production` |
| `PORT` | No | `3000` | HTTP listen port |
| `SESSION_SECRET` | Production | — | ≥32-char secret (fail-fast if insecure in prod) |
| `ALLOWED_ORIGINS` | Yes | `http://localhost:3000` | Comma-separated CORS origins |
| `REDIS_URL` | No | — | `redis://host:port` — enables Redis cache + job queues |
| `REDIS_KEY_PREFIX` | No | `gsp:` | Namespace prefix for Redis keys |
| `SENTRY_DSN` | Production recommended | — | Error tracking DSN |
| `LOG_LEVEL` | No | `info` | `error\|warn\|info\|http\|verbose\|debug` |
| `LOG_MAX_DAYS` | No | `14` | Days of log retention for rotated files |

Full variable reference: [`.env.example`](../.env.example)

---

## 3. Development Deployment

```bash
# Install dependencies
npm ci

# Build TypeScript (server side)
npm run build:server

# Start development server (watches for changes via tsx)
npm run dev:server

# Optional: start Vite dev server for HMR frontend
npm run dev:vite
```

The server starts on `http://localhost:3000` (or next available port).

---

## 4. Staging Deployment

Staging mirrors production but with less restrictive secrets requirements.

```bash
# 1. Pull latest code
git pull origin main

# 2. Install exact dependencies
npm ci

# 3. Build all artefacts
npm run build           # TypeScript + Vite frontend

# 4. Set environment
export NODE_ENV=staging
export PORT=3000
# ... other variables from .env

# 5. Start the server
node server.js
```

### Verify staging health

```bash
curl http://your-staging-host:3000/api/v1/health | jq '.status'
# → "ok"
```

---

## 5. Production Deployment

### 5.1 Build

```bash
git pull origin main
npm ci --omit=dev
npm run build                   # builds dist/src/ (TS) + dist/public/ (Vite)
```

### 5.2 Configure environment

```bash
export NODE_ENV=production
export PORT=3000
export SESSION_SECRET=$(openssl rand -base64 32)
export ALLOWED_ORIGINS=https://your-domain.com
export SENTRY_DSN=https://...@sentry.io/...
# Optional Redis:
export REDIS_URL=redis://redis-host:6379
```

### 5.3 Start with process manager (PM2 recommended)

```bash
npm install -g pm2

# Start
pm2 start server.js --name gsp --env production

# Configure auto-restart on reboot
pm2 startup
pm2 save

# View logs
pm2 logs gsp
pm2 monit
```

### 5.4 Nginx reverse proxy (recommended)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Security headers (supplement to Helmet.js)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 6. Docker Deployment

### 6.1 Single container

```bash
# Build image
docker build -t gsp:latest .

# Run container
docker run -d \
  --name gsp \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e SESSION_SECRET=$(openssl rand -base64 32) \
  -e ALLOWED_ORIGINS=https://your-domain.com \
  gsp:latest
```

### 6.2 Docker Compose (recommended for local/staging with Redis)

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env

# Start all services (app + Redis)
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Stop and remove volumes
docker compose down -v
```

### 6.3 Scaling with Docker Compose

```bash
# Run 3 application replicas (requires Redis for shared cache)
docker compose up -d --scale app=3
```

> **Note**: Horizontal scaling requires `REDIS_URL` to be set so all instances share the same cache. Without Redis each instance maintains its own in-process cache.

---

## 7. Post-Deployment Verification

Run this checklist after every deployment:

```bash
BASE_URL=https://your-domain.com

# 1. Health check
curl -s $BASE_URL/api/v1/health | jq '{status, version, environment, uptime}'

# 2. Cache backend
curl -s $BASE_URL/api/v1/health | jq '.cache.backend'

# 3. Queue status (if Redis configured)
curl -s $BASE_URL/api/v1/jobs | jq '.enabled'

# 4. Prometheus metrics
curl -s $BASE_URL/metrics | grep http_requests_total

# 5. API docs accessible
curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api-docs
# → 200

# 6. Test Yahoo Finance proxy (replace with a valid symbol)
curl -s "$BASE_URL/api/v1/yahoo?symbol=AAPL&from=1700000000&to=1700100000" \
  | jq '.chart.result[0].meta.symbol'
# → "AAPL"
```

### Deployment checklist

- [ ] `NODE_ENV` is `production`
- [ ] `SESSION_SECRET` is a random 32+ byte value
- [ ] `ALLOWED_ORIGINS` matches your domain(s)
- [ ] HTTPS enforced (Nginx + Let's Encrypt)
- [ ] Health endpoint returns `status: "ok"`
- [ ] Sentry DSN configured and receiving events
- [ ] Log rotation configured (`LOG_MAX_DAYS`, `LOG_ZIP_ARCHIVED`)
- [ ] PM2 or equivalent process manager running with `pm2 save`
- [ ] Monitoring alert rules configured

---

## 8. Rollback Procedures

### 8.1 Code rollback

```bash
# Find the previous working commit
git log --oneline -10

# Rollback to previous commit
git checkout <previous-commit-sha>
npm ci --omit=dev
npm run build

# Restart process manager
pm2 restart gsp
```

### 8.2 Docker rollback

```bash
# Tag the current image before deploying
docker tag gsp:latest gsp:backup-$(date +%Y%m%d)

# Rollback to backup
docker stop gsp
docker run -d --name gsp gsp:backup-20260224
```

### 8.3 Rollback criteria

Initiate a rollback immediately if any of the following are observed within 15 minutes of deployment:

- Health endpoint returns non-`ok` status
- Error rate > 1% (check Sentry or Prometheus `http_requests_total{status=~"5.."}/http_requests_total`)
- p97.5 API latency > 500 ms
- CPU > 90% sustained for > 2 minutes

---

## 9. Common Deployment Issues

| Symptom | Likely Cause | Resolution |
|---------|-------------|-----------|
| `EADDRINUSE` on startup | Port already in use | Change `PORT` or kill existing process |
| `SESSION_SECRET must be set` | Missing/insecure secret in production | Set `SESSION_SECRET` to 32+ random bytes |
| `Redis connection failed` | Wrong `REDIS_URL` or Redis not running | Check URL format: `redis://host:port`, verify Redis is reachable |
| `Cannot find module '...dist/src...'` | TypeScript not built | Run `npm run build:server` |
| `dist/public/index.html not found` | Vite build missing | Run `npm run build:client` |
| Blank page in browser | CSP blocking external resources | Check browser console, update `ALLOWED_ORIGINS` or CSP config |
| `npm ci` fails on peer deps | Dependency conflict | Use `npm ci --legacy-peer-deps` |
| High memory usage | Log files accumulating | Verify `LOG_MAX_DAYS` and `LOG_ZIP_ARCHIVED` are set |
