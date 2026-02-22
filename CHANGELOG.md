# Changelog

All notable changes to **Global Quant Scanner Pro** are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added (Phase 3.1.1 — Frontend Build Optimisation)
- **Vite 7 build pipeline** — production-grade frontend bundler replacing raw tsc browser output
  - `vite build` compiles and optimises all browser-side TypeScript entry points
  - esbuild minification of JS and CSS (10–20× faster than Terser)
  - Source maps for production debugging
  - Asset content hashing for 1-year immutable cache headers (`[name]-[hash].js`)
  - `modulepreload` hints for all shared chunks injected into the HTML at build time
- **Code splitting by domain** — 9 independent cached chunks:
  - `chunk-ml` · `chunk-analytics` · `chunk-indicators` · `chunk-portfolio`
  - `chunk-reports` · `chunk-i18n` · `chunk-allocation` · `chunk-data`
  - `chunk-alerts` · `chunk-storage` · `chunk-dashboard`
- **`scripts/inject-vite-assets.js`** — post-build HTML injection script:
  reads `dist/public/.vite/manifest.json`, replaces dev-mode script/CSS references
  with hashed production paths, injects `<link rel="modulepreload">` hints,
  copies `universes/` data files to `dist/public/universes/`
- **`vite.config.ts`** — Vite configuration with `@` path alias, Vite dev-server proxy
  (`/api → :3001`, `/metrics → :3001`) for optional `npm run dev:vite` workflow
- **Production static file serving** — Express now serves `dist/public/` in production
  (`NODE_ENV=production`) with SPA HTML fallback for client-side routing
- **New npm scripts**:
  - `build:server` — TypeScript compilation only (was `build`)
  - `build:client` — Vite bundle + HTML injection
  - `build` — full build (server + client)
  - `build:client:vite` — Vite bundle only (no HTML injection)
  - `preview` — serve production build via Vite preview server (port 4173)
  - `dev:server` — backend-only dev server (alias for `dev`)
  - `dev:vite` — Vite HMR dev server (frontend; requires `dev:server` on port 3001)
- **CI build job** — now runs `build:server` AND `build:client` separately; reports
  per-chunk gzip sizes; uploads `dist/public/index.html` and manifest as artifacts

### Performance Results (Phase 3.1.1)
| Metric | Value |
|--------|-------|
| Total gzipped bundle | ~110 kB (scanner 22 kB + translator 37 kB + chunks 51 kB) |
| Largest single chunk | `ui-translator` 37 kB gzip (i18n strings) |
| CSS | `attribution-dashboard` 1.85 kB gzip |
| Build time | ~620 ms (Vite esbuild) |
| Cache efficiency | 9 independently cacheable chunks |
| Budget target | < 500 kB gzip ✅ |

### Added (Phase 3.3.1/3.3.4/3.1.2/3.1.4 — Caching, Compression & Prometheus)
- **Compression middleware** (`compression` package) — gzip/brotli response compression for all API and static responses above 1 KB, reducing payload size by 60–80%
- **In-memory response cache** (`src/utils/cache.ts`) — Yahoo Finance API responses cached for 5 minutes using `node-cache`, reducing external API calls and improving response times
  - `buildYahooCacheKey` / `getYahooCache` / `setYahooCache` / `flushYahooCache` helpers
  - Cumulative `hits`, `misses`, `hitRate` counters
- **Prometheus metrics** (`src/utils/metrics.ts`) — full observability with `prom-client`
  - `http_requests_total` — request counter labelled by method, route, status code
  - `http_request_duration_seconds` — latency histogram (11 buckets, 1ms–5s)
  - `http_active_connections` — real-time gauge of in-flight requests
  - `cache_hits_total` / `cache_misses_total` — per-cache counters
  - `cache_keys_count` — current cache size gauge
  - `yahoo_finance_requests_total` — external request counter
  - Default Node.js metrics (CPU, memory, GC, event loop lag)
- **`GET /metrics`** endpoint — Prometheus scrape target in text exposition format
- **Cache-Control headers** for static file serving: HTML (no-cache), JS/CSS/fonts/images (1 year immutable), JSON (5 min)
- **`X-Cache: HIT/MISS`** response header on Yahoo Finance proxy responses
- **`POST /api/v1/cache/flush`** — cache flush endpoint (dev/test only)
- **Enhanced `/api/v1/health`** response — adds `cache` stats (keys, hits, misses, hitRate), RSS memory (`rssMb`), and `dependencies` section
- `metricsMiddleware` — Express middleware recording per-request Prometheus metrics
- OpenAPI 3.0 specification for all REST endpoints (`src/config/swagger.ts`)
- Swagger UI interactive documentation at `/api-docs`
- Raw OpenAPI JSON spec endpoint at `/api-docs.json`
- Versioned API routes under `/api/v1/` (health, yahoo, run-tests)
- `X-API-Version: v1` response header on all v1 endpoints
- `X-Deprecated: true` and `Deprecation: true` headers on legacy `/api/` routes
- `Link` response header pointing to v1 successor on deprecated routes
- `apiVersion: 'v1'` field in `/api/v1/health` response body
- `CONTRIBUTING.md` — developer onboarding and PR guidelines
- `CHANGELOG.md` — this file
- `Dockerfile` — multi-stage production container image (node:20-alpine)
- `.dockerignore` — excludes dev artifacts from Docker build context
- `docker-compose.yml` — local development orchestration

### Changed
- `server.js` — added compression, metrics middleware, and cache imports; updated `yahooHandler` to serve from cache; enhanced `healthHandler` with dependency stats; updated startup banner to show `/metrics`
- Static file serving (`express.static`) — upgraded with explicit `Cache-Control` header strategy

---

## [0.0.5] — 2026-02-20 — Phase 2.2: TypeScript Migration

### Added
- Full TypeScript migration for all 55+ source files (`.js` → `.ts`)
- `tsconfig.json` with strict mode (`noImplicitAny`, `strictNullChecks`, etc.)
- `src/types/index.ts` — shared type definitions (OHLCV, ScoredAsset, portfolio types, etc.)
- `@types/*` packages for all runtime dependencies
- Type declarations for browser globals, i18n, and window extensions
- `tsx` package for TypeScript execution without compilation step

### Changed
- All source files renamed from `.js` to `.ts`
- Implicit `any` parameters annotated explicitly
- `catch (e)` blocks cast to `(e as any).message`
- DOM access casts (`HTMLInputElement`, `HTMLSelectElement`, `HTMLElement`)
- `window.X` access via `(window as any).X`

### Fixed
- Zero TypeScript compilation errors across entire codebase

### Testing
- All 1138 tests continue to pass after migration (53 test files)
- Coverage maintained: Stmts 81.5% | Branch 69.8% | Funcs 86.5% | Lines 81.8%

---

## [0.0.4] — 2026-02-15 — Phase 2.1.5: Performance and Load Testing

### Added
- 7 Vitest benchmark files (49 individual benchmarks):
  - `indicators.bench.js` — 18 benchmarks (SMA, EMA, RSI, ATR, Bollinger, ADX, etc.)
  - `scoring.bench.js` — 6 benchmarks (trend, momentum, risk, liquidity, full pipeline)
  - `allocation.bench.js` — 8 benchmarks (5 allocation methods, capital allocation)
  - `ml-engine.bench.js` — 9 benchmarks (normalize, correlate, LR/RF/KMeans fit/predict)
  - `portfolio-optimizer.bench.js` — 3 benchmarks (Sharpe, MinVar, RiskParity)
  - `monte-carlo.bench.js` — 2 benchmarks (1k and 10k simulations)
  - `stress-testing.bench.js` — 3 benchmarks (sector, currency, multi-factor)
- 3 autocannon-based load test scripts:
  - Health endpoint throughput (~3300 req/s, p97.5 < 100ms)
  - Yahoo Finance middleware overhead
  - Rate limiting validation (20 accepted / 30 rejected with 429)
- Lighthouse CI configuration (`lighthouserc.js`) with production budgets
- `src/tests/performance/budgets/performance-budgets.js` — single source of truth for thresholds
- Performance regression detection via `vitest bench --compare`
- `performance` job in GitHub Actions CI pipeline
- npm scripts: `test:bench`, `test:load`, `test:perf:all`, `perf:baseline`

### Performance Baselines
- Health endpoint: ~3,300 req/s, p97.5 latency 7ms
- Single indicator calculation: < 5ms
- Full scoring pipeline: < 25ms
- Monte Carlo 10k simulations: < 600ms
- Random Forest fit: < 1,500ms

---

## [0.0.3] — 2026-02-10 — Phase 2.1.4: End-to-End Tests (Playwright)

### Added
- Playwright E2E test infrastructure with Page Object Model (7 POMs)
- 11 E2E spec files with 76 tests covering all critical user journeys:
  - `smoke.spec.js` — page load, health API, critical elements (8 tests)
  - `scan-journey.spec.js` — market selection, scan execution, results (10 tests)
  - `filters.spec.js` — search, signal, score, volume, combined filters (9 tests)
  - `portfolio-construction.spec.js` — allocation methods, risk profiles (8 tests)
  - `portfolio-dashboard.spec.js` — save/load, charts, positions, metrics (7 tests)
  - `backtest.spec.js` — params, execution, results, export (7 tests)
  - `alerts.spec.js` — thresholds, channels, notifications (6 tests)
  - `export.spec.js` — scan/backtest/portfolio export (4 tests)
  - `language.spec.js` — default Spanish, en/es switching (6 tests)
  - `responsive.spec.js` — desktop/tablet/mobile viewports (7 tests)
  - `accessibility.spec.js` — axe-core audit, keyboard focus (4 tests)
- API mocking via `page.route()` (no production server changes required)
- axe-core accessibility auditing integration
- Multi-browser testing (Chromium, Firefox, WebKit) via `playwright.config.js`
- `e2e` job in GitHub Actions CI pipeline (Chromium headless)

### Dependencies Added
- `@playwright/test` ^1.x
- `@axe-core/playwright` ^4.x

---

## [0.0.2] — 2026-02-05 — Phase 2.1.3: Integration Tests

### Added
- `src/tests/integration/` directory with shared builders and helpers
- 6 integration test files with 113 tests covering end-to-end workflows:
  - `scoring-pipeline.integration.test.js` — Indicators → Scoring → Allocation (33 tests)
  - `portfolio-construction.integration.test.js` — Allocation → Risk → Governance (15 tests)
  - `alert-system.integration.test.js` — Alert creation → persistence → delivery (16 tests)
  - `report-generation.integration.test.js` — Scan results → Excel/PDF (9 tests)
  - `ml-pipeline.integration.test.js` — Factor weighting → Anomaly detection → Recommendations (19 tests)
  - `portfolio-lifecycle.integration.test.js` — Full CRUD + rebalancing lifecycle (21 tests)
- In-memory mock `createMockDbStore()` for deterministic database testing
- `test:unit` and `test:integration` npm scripts

### Testing
- Total test suite: 53 files, 1138 tests (1025 unit + 113 integration)
- All tests pass in ~3.8 seconds
- Coverage maintained above all thresholds

---

## [0.0.1] — 2026-01-30 — Phase 2.1.1 + 2.1.2: Test Framework and Coverage

### Added
- **Vitest** test framework (migrated from custom assertion framework)
- `vitest.config.js` with Node environment, browser globals, and coverage config
- `src/tests/vitest.setup.js` — browser mocks, i18n init, custom `toBeApprox` matcher
- `src/tests/helpers.js` — data builders, fixtures, and mocking utilities
- **25 new unit test files** (Phase B) covering all critical modules:
  - `scanner.test.js` — 74 tests (formatting, RSI descriptions, decision tree, CSV export)
  - `adaptive-scoring.test.js`, `anomaly-detection-extended.test.js`, `ml-engine-extended.test.js`
  - `performance-tracker-extended.test.js`, `portfolio-manager-extended.test.js`
  - `risk-engine-extended.test.js`, `scoring-extended.test.js`, `scoring-threshold.test.js`
  - `attribution-extended.test.js`, `comparative-analysis.test.js`
  - `excel-exporter.test.js`, `pdf-templates.test.js`, `reports-index.test.js`
  - `recommendation-engine.test.js`, `regime-prediction.test.js`
  - `factor-weighting.test.js`, `ml-index.test.js`
  - `dynamic-governance-extended.test.js`, `governance-extended.test.js`
  - `core-config.test.js`, `indexed-db-store.test.js`
  - `security-callbacks.test.js`, `security-middleware-extended.test.js`
  - `validation-schemas-extended.test.js`, `error-handler-extended.test.js`
- **7 unit test files** (Phase A) for core business logic:
  - `environment.test.js`, `market-regime.test.js`, `governance.test.js`
  - `security-middleware.test.js`, `performance-tracker.test.js`
  - `portfolio-manager.test.js`, `allocation.test.js`
- `@vitest/ui` interactive test runner
- `@vitest/coverage-v8` coverage reporting with thresholds

### Changed
- Coverage thresholds raised from baseline (38/20/40/38) to targets (80/60/85/80)

### Testing Results
- 47 test files, 1025 tests
- Coverage: Stmts 81% | Branch 69% | Funcs 87% | Lines 82%
- Key modules at 100% coverage: allocation, governance, portfolio-manager, performance-tracker, validation middleware, excel-exporter, pdf-templates

---

## [0.0.0] — 2026-01-15 — Phase 1: Security Hardening and Infrastructure

### Added
- **Security middleware** (`src/middleware/security.ts`):
  - Helmet.js security headers (CSP, X-Frame-Options, HSTS, etc.)
  - CORS configuration with environment-variable allowed origins
  - Global rate limiting (100 req / 15 min per IP)
  - Yahoo Finance endpoint rate limiting (20 req / min per IP)
  - HTTPS enforcement redirect in production
  - Request ID generation for request correlation
  - Input sanitisation middleware
- **Validation layer** (`src/security/validation-schemas.ts`, `src/middleware/validation.ts`):
  - Zod schemas for all API endpoints (yahoo, health, run-tests)
  - Reusable `commonSchemas` (pagination, uuid, email, ISO date, percentage)
  - `validate()` and `validateMultiple()` middleware
  - Body size limit enforcement (1MB)
  - Content-Type validation
- **Structured logging** (`src/utils/logger.ts`):
  - Winston with console + file transports
  - JSON format in production, pretty-print in development
  - Log rotation and retention policies
  - Sensitive data redaction
  - HTTP request logging with Morgan-compatible format
- **Error handling** (`src/middleware/error-handler.ts`):
  - Centralised Express error middleware
  - Custom error classes: `ValidationError`, `NotFoundError`, `AuthenticationError`, `ExternalServiceError`
  - Stack trace hiding in production
  - Structured error response format (error, timestamp, statusCode, details)
  - Global unhandled rejection and uncaught exception handlers with graceful shutdown
- **Sentry integration** (`src/utils/sentry.ts`):
  - Error tracking and performance monitoring
  - Environment tagging and release tracking
  - Source map configuration
- **Environment configuration** (`src/config/environment.ts`):
  - Zod-validated environment schema
  - `.env.example` template with all required variables
  - Fail-fast validation on startup
- **Code quality tooling**:
  - ESLint flat config (`eslint.config.js`) with security and JSDoc plugins
  - Prettier formatting
  - Husky pre-commit hooks with lint-staged
- **GitHub Actions CI/CD**:
  - `.github/workflows/ci.yml` — lint, test, coverage, E2E, performance
  - `.github/workflows/security.yml` — weekly dependency vulnerability scan
  - `.github/workflows/deploy.yml` — tag-triggered deployment pipeline

---

[Unreleased]: https://github.com/JP-Fernando/global-scanner-pro/compare/v0.0.5...HEAD
[0.0.5]: https://github.com/JP-Fernando/global-scanner-pro/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/JP-Fernando/global-scanner-pro/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/JP-Fernando/global-scanner-pro/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/JP-Fernando/global-scanner-pro/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/JP-Fernando/global-scanner-pro/compare/v0.0.0...v0.0.1
[0.0.0]: https://github.com/JP-Fernando/global-scanner-pro/releases/tag/v0.0.0
