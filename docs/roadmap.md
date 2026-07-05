# Professional Roadmap: Global Quant Scanner Pro

## Roadmap Structure

This document presents a phased approach organised into four major phases, followed by ongoing continuous improvement initiatives.

## Current Snapshot — 2026-07-02

The repository is in a stronger state than the original roadmap suggests in terms of engineering
foundations: security hardening, test coverage, API documentation, performance work, reporting,
alerts, portfolio tooling, and the new simulator flow are all materially advanced. The main gap is
no longer "can we build features?" but "what product shape are we shipping next?"

### What is already strong
- Responsive web UI already tested across mobile viewports
- IndexedDB persistence already available for local browser storage
- Express + Vite delivery path already suitable for an installable web app shell
- Good validation, monitoring, logging, and test foundations for expanding safely
- ✅ Installable local-first PWA shell (manifest, service worker, offline last-scan/simulator
  review, install prompt) — completed 2026-07-02, see §5.5.3.1

### What is still strategically missing
- Real authentication and user ownership model
- A clear decision between local-first single-user usage vs multi-user synced product
  (this milestone shipped the local-first branch; account-based sync is still open, §5.5.3.3)
- Frontend separation planning: preserve the current desktop-optimised experience while adding
  an Android-focused frontend over the same backend and shared domain logic (§5.5.3.2 — next up)

### Recommendation
PWA enablement (local-first branch) is done. Treat the next milestone as **frontend separation
and Android UX hardening** (§5.5.3.2) — the installable shell now exists, but the next step
should not be "make desktop worse so mobile fits". Instead, preserve the current desktop
workflow, extract shared application logic, and build an Android-focused presentation layer over
the same backend before revisiting the local-first vs account-based sync decision (§5.5.3.3).

---

## 1. Phase 1: Security Hardening and Infrastructure Foundation

**Objective**: Establish essential security measures and foundational infrastructure to protect the application and enable professional development workflows.

**Status**: ✅ COMPLETED - January 2026

**Priority**: CRITICAL

### 📚 Phase 1 Documentation

Detailed documentation for Phase 1 implementation has been organized into specialized guides:

- [Security Implementation Guide](security-implementation.md) - Input validation, security headers, rate limiting, CORS, and secrets management
- [Logging and Monitoring Guide](logging-monitoring.md) - Winston logging, error handling, and Sentry integration
- [Code Quality Guide](code-quality.md) - ESLint, Prettier, and Husky configuration
- [CI/CD Pipeline Guide](ci-cd-pipeline.md) - GitHub Actions workflows and automation
- [Testing Strategy Guide](testing-strategy.md) - Current tests and Phase 2 roadmap

For a quick overview, see the Phase 1 section in the main [README.md](../README.md).

### 1.1 Security Implementation

> **✅ COMPLETED** - See [Security Implementation Guide](security-implementation.md) for full details

#### 1.1.1 Input Validation and Sanitisation
**Status**: ✅ COMPLETED

**Actions**:
- Install and configure Zod or Joi schema validation library
- Create validation schemas for all API endpoints (`/api/yahoo`, `/api/health`, `/api/run-tests`)
- Implement validation middleware to reject malformed requests
- Add sanitisation for string inputs to prevent XSS attacks
- Document validation rules in API documentation

**Success Criteria**:
- All API endpoints validate input parameters
- Invalid requests return 400 status with descriptive error messages
- Unit tests verify validation logic for edge cases

#### 1.1.2 Security Headers Implementation
**Status**: ✅ COMPLETED

**Actions**:
- Install Helmet.js middleware
- Configure Content Security Policy (CSP) to prevent XSS
- Enable X-Frame-Options to prevent clickjacking
- Set X-Content-Type-Options to prevent MIME sniffing
- Configure Strict-Transport-Security for HTTPS enforcement
- Add X-XSS-Protection header

**Success Criteria**:
- Security headers present in all HTTP responses
- SecurityHeaders.com scan shows A+ rating
- Browser console shows no CSP violations during normal operation

#### 1.1.3 Rate Limiting
**Status**: ✅ COMPLETED

**Actions**:
- Install express-rate-limit middleware
- Implement global rate limiting (100 requests per 15 minutes per IP)
- Add stricter rate limiting for Yahoo Finance proxy endpoint (20 requests per minute)
- Implement distributed rate limiting using Redis for multi-instance deployments
- Add rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- Create rate limit exceeded error responses with Retry-After header

**Success Criteria**:
- Rate limiting prevents abuse scenarios
- Legitimate users receive clear feedback when rate limited
- Rate limit metrics available for monitoring

#### 1.1.4 CORS Configuration
**Status**: ✅ COMPLETED

**Actions**:
- Install and configure cors middleware
- Define allowed origins based on environment variables
- Configure allowed methods (GET, POST, PUT, DELETE)
- Set allowed headers and exposed headers
- Enable credentials support where required
- Document CORS policy for API consumers

**Success Criteria**:
- Only authorised origins can access the API
- CORS preflight requests handled correctly
- Browser console shows no CORS errors for legitimate requests

#### 1.1.5 Secrets Management
**Status**: ✅ COMPLETED

**Actions**:
- Create `.env.example` template with all required variables
- Add `.env` to `.gitignore` (verify not already committed)
- Install dotenv package for environment variable loading
- Migrate all configuration to environment variables:
  - PORT
  - NODE_ENV
  - ALLOWED_ORIGINS
  - SMTP configuration for alerts
  - Webhook URLs
  - API keys (if any)
- Document environment setup in README
- Add validation for required environment variables on startup

**Success Criteria**:
- No hardcoded secrets in source code
- Application fails fast with clear error if required variables missing
- `.env.example` provides clear guidance for configuration

#### 1.1.6 HTTPS Enforcement
**Status**: ✅ COMPLETED

**Actions**:
- Add middleware to redirect HTTP to HTTPS in production
- Document SSL certificate setup procedures
- Configure secure cookie flags when session management added
- Update documentation with HTTPS deployment requirements

**Success Criteria**:
- Production deployment serves only HTTPS traffic
- HTTP requests automatically redirect to HTTPS
- SSL Labs scan shows A+ rating

### 1.2 Continuous Integration and Continuous Deployment (CI/CD) Pipeline

> **✅ COMPLETED** - See [CI/CD Pipeline Guide](ci-cd-pipeline.md) for full details

#### 1.2.1 GitHub Actions Workflow Setup
**Status**: ✅ COMPLETED

**Actions**:
- Create `.github/workflows/ci.yml` for continuous integration:
  - Trigger on push to main and all pull requests
  - Set up Node.js 20.x environment
  - Install dependencies with npm ci
  - Run linting checks
  - Execute test suite
  - Generate code coverage reports
  - Run security audit (npm audit)
- Create `.github/workflows/security.yml` for security scanning:
  - Schedule weekly Snyk vulnerability scans
  - Run dependency audit on all PRs
  - Check for secrets in commits using GitGuardian
- Create `.github/workflows/deploy.yml` for deployment:
  - Trigger on tags (v*.*.*)
  - Build production artefacts
  - Deploy to staging environment
  - Run smoke tests
  - Deploy to production with manual approval

**Success Criteria**:
- All PRs blocked until CI passes
- Failed tests prevent merges
- Security vulnerabilities flagged automatically
- Deployment process fully automated

### 1.3 Error Handling and Logging Infrastructure

> **✅ COMPLETED** - See [Logging and Monitoring Guide](logging-monitoring.md) for full details

#### 1.3.1 Structured Logging Implementation
**Status**: ✅ COMPLETED

**Actions**:
- Install Winston or Pino logging library
- Create logging configuration module:
  - Define log levels (error, warn, info, debug, trace)
  - Configure log formatting (JSON for production, pretty for development)
  - Set up log rotation and retention policies
  - Configure different transports (console, file, remote)
- Create logging utility functions for common patterns
- Replace all console.log/error/warn calls with proper logging
- Add request ID tracking for correlation
- Implement log sanitisation to prevent logging sensitive data

**Success Criteria**:
- All logging uses structured logging library
- Logs include timestamps, levels, and context
- Production logs in JSON format for parsing
- No sensitive data in logs

#### 1.3.2 Centralized Error Handling
**Status**: ✅ COMPLETED

**Actions**:
- Create error handling middleware for Express:
  - Catch all unhandled errors
  - Format error responses consistently
  - Log errors with full context
  - Return appropriate HTTP status codes
  - Sanitise error messages for client (hide stack traces in production)
- Create custom error classes:
  - ValidationError
  - NotFoundError
  - AuthenticationError
  - ExternalServiceError
- Implement async error wrapper utility
- Add global unhandled rejection handler
- Add uncaught exception handler with graceful shutdown

**Success Criteria**:
- All errors logged consistently
- Client receives sanitised error messages
- Stack traces hidden in production
- Application recovers gracefully from errors

#### 1.3.3 Error Tracking Service Integration
**Status**: ✅ COMPLETED

**Actions**:
- Select error tracking service (Sentry recommended, open-source alternatives: GlitchTip)
- Create Sentry account and project
- Install and configure Sentry SDK:
  - Configure DSN via environment variable
  - Set up environment tags (development, staging, production)
  - Configure release tracking with Git commit SHA
  - Set up user context tracking (when authentication added)
  - Configure breadcrumbs for debugging context
- Create error filtering rules to reduce noise
- Set up alerting rules for critical errors
- Document error tracking procedures

**Success Criteria**:
- All errors automatically reported to Sentry
- Error notifications sent for critical issues
- Error trends tracked over time
- Source maps configured for stack trace clarity

### 1.4 Code Quality Tooling

> **✅ COMPLETED** - See [Code Quality Guide](code-quality.md) for full details

#### 1.4.1 ESLint Configuration
**Status**: ✅ COMPLETED

**Actions**:
- Install ESLint and plugins:
  - eslint
  - eslint-config-airbnb-base or eslint-config-standard
  - eslint-plugin-import
  - eslint-plugin-security
  - eslint-plugin-jsdoc
- Create `.eslintrc.json` configuration:
  - Extend recommended rule sets
  - Configure environment (ES6, Node.js, browser)
  - Add custom rules for project conventions
  - Configure security rules
- Create `.eslintignore` file
- Add lint script to package.json
- Fix all existing linting errors (or suppress with documented justification)
- Configure IDE integration (VS Code settings.json)

**Success Criteria**:
- `npm run lint` passes with zero errors
- ESLint runs in CI pipeline
- IDE shows linting errors in real-time

#### 1.4.2 Prettier Configuration
**Actions**:
- Install Prettier
- Create `.prettierrc.json` configuration:
  - Set consistent code formatting rules
  - Configure line width, tabs vs spaces, quote style
- Create `.prettierignore` file
- Add format script to package.json
- Format entire codebase with Prettier
- Configure Prettier to work with ESLint (eslint-config-prettier)

**Success Criteria**:
- All code formatted consistently
- `npm run format` formats all code
- No conflicts between ESLint and Prettier

#### 1.4.3 Git Hooks with Husky
**Actions**:
- Install Husky and lint-staged
- Configure Husky to run on pre-commit:
  - Run linting on staged files
  - Run formatting on staged files
  - Run unit tests (optional, may be too slow)
- Configure pre-push hook:
  - Run full test suite
  - Run security audit
- Document how to bypass hooks when necessary (--no-verify)

**Success Criteria**:
- Linting runs automatically before commits
- Poorly formatted code cannot be committed
- Failed tests prevent pushes

### 1.5 Environment Configuration

> **✅ COMPLETED** - See [Security Implementation Guide](security-implementation.md#5-environment-variables-and-secrets-management) for full details

#### 1.5.1 Environment Variable Setup
**Status**: ✅ COMPLETED

**Actions** (Completed):
- Create comprehensive `.env.example`:
```
# Server Configuration
PORT=3000
NODE_ENV=development

# Security
ALLOWED_ORIGINS=http://localhost:3000
SESSION_SECRET=your-session-secret-here

# External Services
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/YOUR/WEBHOOK/URL

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Feature Flags
ENABLE_ML_FEATURES=true
ENABLE_ALERTS=true
```

- Add environment validation on startup:
```javascript
const requiredEnvVars = ['NODE_ENV', 'PORT'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
```

**Success Criteria**:
- `.env.example` documents all configuration options
- Application fails fast if required variables missing
- No secrets in source control

---

## 2. Phase 2: Testing Excellence and Type Safety

**Objective**: Establish comprehensive test coverage, implement type safety, and ensure code quality meets professional standards.

**Priority**: HIGH

### 2.1 Test Framework Migration and Enhancement

#### 2.1.1 Migrate to Modern Test Framework
**Status**: ✅ COMPLETED - January 2026

**Current Gap**: Custom assertion framework in [tests/tests.js](../src/tests/tests.js) instead of industry-standard testing framework.

**Actions**:
- ✅ Evaluate test framework options — Vitest selected for ES module support
- ✅ Install Vitest and related dependencies:
  - vitest 4.x
  - @vitest/ui (interactive test UI)
  - @vitest/coverage-v8 (V8-based coverage reporting)
- ✅ Create [`vitest.config.js`](../vitest.config.js) configuration:
  - Node environment with browser global mocks
  - Coverage thresholds (baseline: 38/20/40/38 — target 80 in Phase 2.1.2)
  - Global test utilities (`describe`, `it`, `expect`, `vi`)
  - Test file pattern: `src/tests/unit/**/*.test.js`
- ✅ Migrate all tests to Vitest — 15 test files:
  - [indicators.test.js](../src/tests/unit/indicators.test.js) — 23 tests (SMA, EMA, RSI, ATR, Bollinger, ADX, Williams %R, ROC, Volatility, MaxDrawdown, DaysAboveEMA, VolumeRatio, validation)
  - [backtesting.test.js](../src/tests/unit/backtesting.test.js) — 2 tests (strategy backtest, walk-forward)
  - [risk-engine.test.js](../src/tests/unit/risk-engine.test.js) — 8 tests (VaR, CVaR, correlation matrix, symmetry, shrinkage, edge cases)
  - [reports.test.js](../src/tests/unit/reports.test.js) — 13 tests (base generator, Excel, PDF, comparative analysis, executive summary, period comparison)
  - [attribution.test.js](../src/tests/unit/attribution.test.js) — 2 tests (Brinson attribution, report exports)
  - [alerts.test.js](../src/tests/unit/alerts.test.js) — comprehensive tests (settings, logs, delivery, notifications, webhooks)
  - [stress-testing.test.js](../src/tests/unit/stress-testing.test.js) — 7 tests (sector, currency, geopolitical, liquidity, multi-factor, edge cases)
  - [optimization.test.js](../src/tests/unit/optimization.test.js) — 5 tests (Monte Carlo, historical scenarios, max Sharpe, min variance, risk parity)
  - [dynamic-governance.test.js](../src/tests/unit/dynamic-governance.test.js) — 14 tests (volatility/correlation regime detection, dynamic limits, stress scenarios, edge cases)
  - [ml.test.js](../src/tests/unit/ml.test.js) — 11 tests (linear regression, random forest, K-Means, factor weighting, adaptive scoring, regime prediction, recommendations, anomaly detection)
  - [security.test.js](../src/tests/unit/security.test.js) — 16 tests (Zod schemas, sanitisation, custom errors, environment config)
  - [ui.test.js](../src/tests/unit/ui.test.js) — 3 tests (debouncing, throttling, ARIA)
  - [error-handler.test.js](../src/tests/unit/error-handler.test.js) — comprehensive tests (error middleware, custom errors, logging, sanitisation)
  - [scoring.test.js](../src/tests/unit/scoring.test.js) — comprehensive tests (score calculation, normalization, edge cases)
  - [validation-middleware.test.js](../src/tests/unit/validation-middleware.test.js) — comprehensive tests (Zod validation, request sanitisation, error responses)
- ✅ Create shared test infrastructure:
  - [vitest.setup.js](../src/tests/vitest.setup.js) — browser mocks, i18n init, custom `toBeApprox` matcher
  - [helpers.js](../src/tests/helpers.js) — data builders, fixtures, mocking utilities, report mocks
- ✅ Update CI workflow with coverage reporting and artifact upload
- ✅ Update ESLint config with Vitest globals
- ✅ Update package.json scripts (`test`, `test:watch`, `test:ui`, `test:coverage`)
- ✅ Fix Zod validation API: use `.issues` instead of `.errors` in validation middleware (February 2026)

**Results**:
- 15 test files with comprehensive coverage
- Coverage baseline: Stmts 40% | Branch 23% | Funcs 45% | Lines 40%
- Legacy test runner preserved as `npm run test:legacy`
- CI workflow runs coverage and uploads report artifacts

**Success Criteria**:
- ✅ All existing tests migrated and passing
- ✅ Tests run faster than before (~700ms total)
- ✅ Coverage reports generated automatically
- ✅ Test UI available for debugging (`npm run test:ui`)

#### 2.1.2 Expand Unit Test Coverage
**Status**: ✅ COMPLETED - February 2026

**Current Gap** (at start): Coverage at ~43% overall; many critical modules untested.

**Actions**:
- ✅ Analyse current test coverage with `vitest run --coverage`
- ✅ Fix vitest coverage config to exclude non-JS files from coverage report
- ✅ Fix Zod v4 compatibility bug: use `.issues` instead of `.errors` in `config/environment.js`
- ✅ Add `test` as valid `NODE_ENV` in environment schema for Vitest compatibility
- ✅ Write unit tests for critical modules — Phase A (7 new test files, 187 new tests):
  - [environment.test.js](../src/tests/unit/environment.test.js) — 24 tests (env validation, config object, features, logging, performance, printConfig)
  - [market-regime.test.js](../src/tests/unit/market-regime.test.js) — 26 tests (benchmark analysis, market breadth, regime detection, strategy adjustment, regime history)
  - [governance.test.js](../src/tests/unit/governance.test.js) — 26 tests (investment rules, risk profiles, compliance validation, corrections, governance reports)
  - [security-middleware.test.js](../src/tests/unit/security-middleware.test.js) — 18 tests (Helmet, CORS, rate limiting, HTTPS enforcement, security headers, request ID, sanitization)
  - [performance-tracker.test.js](../src/tests/unit/performance-tracker.test.js) — 25 tests (drawdowns, max drawdown, Sharpe/Sortino/Calmar ratios, equity curves, alpha/beta, tracking error)
  - [portfolio-manager.test.js](../src/tests/unit/portfolio-manager.test.js) — 33 tests (CRUD, position management, rebalancing, snapshots, equity curves)
  - [allocation.test.js](../src/tests/unit/allocation.test.js) — 35 tests (equal weight, score-weighted, ERC, vol targeting, hybrid, portfolio risk, capital recommendations)
- ✅ Write extended unit tests — Phase B (25 new test files, 634+ new tests):
  - [scanner.test.js](../src/tests/unit/scanner.test.js) — 74 tests (formatting, metric colours, RSI descriptions, investment recommendation decision tree with 14 branches, time-horizon recommendations, ML insights HTML, data loading, CSV export)
  - [adaptive-scoring.test.js](../src/tests/unit/adaptive-scoring.test.js), [anomaly-detection-extended.test.js](../src/tests/unit/anomaly-detection-extended.test.js), [attribution-extended.test.js](../src/tests/unit/attribution-extended.test.js), [comparative-analysis.test.js](../src/tests/unit/comparative-analysis.test.js), [core-config.test.js](../src/tests/unit/core-config.test.js), [dynamic-governance-extended.test.js](../src/tests/unit/dynamic-governance-extended.test.js), [error-handler-extended.test.js](../src/tests/unit/error-handler-extended.test.js), [excel-exporter.test.js](../src/tests/unit/excel-exporter.test.js), [factor-weighting.test.js](../src/tests/unit/factor-weighting.test.js), [indexed-db-store.test.js](../src/tests/unit/indexed-db-store.test.js), [ml-engine-extended.test.js](../src/tests/unit/ml-engine-extended.test.js), [ml-index.test.js](../src/tests/unit/ml-index.test.js), [pdf-templates.test.js](../src/tests/unit/pdf-templates.test.js), [performance-tracker-extended.test.js](../src/tests/unit/performance-tracker-extended.test.js), [portfolio-manager-extended.test.js](../src/tests/unit/portfolio-manager-extended.test.js), [recommendation-engine.test.js](../src/tests/unit/recommendation-engine.test.js), [regime-prediction.test.js](../src/tests/unit/regime-prediction.test.js), [reports-index.test.js](../src/tests/unit/reports-index.test.js), [risk-engine-extended.test.js](../src/tests/unit/risk-engine-extended.test.js), [scoring-extended.test.js](../src/tests/unit/scoring-extended.test.js), [scoring-threshold.test.js](../src/tests/unit/scoring-threshold.test.js), [security-callbacks.test.js](../src/tests/unit/security-callbacks.test.js), [security-middleware-extended.test.js](../src/tests/unit/security-middleware-extended.test.js), [validation-schemas-extended.test.js](../src/tests/unit/validation-schemas-extended.test.js)
- ✅ Export internal pure functions from `core/scanner.js` for testability
- ✅ Raised vitest coverage thresholds from Phase 2.1.1 baseline (38/20/40/38) to Phase 2.1.2 targets (80/60/85/80)
- ✅ All critical modules now tested: core scanner, ML, reports, storage, analytics, portfolio, allocation, middleware, security, config
- Remaining for future improvement:
  - Add property-based testing for numerical calculations (using fast-check)
  - Increase `core/scanner.js` coverage beyond 24% (requires extracting DOM-coupled logic)

**Results** (February 2026 — Final):
- 47 test files with 1025 tests (was 15 files / ~200 tests at Phase 2.1.1)
- Coverage: **Stmts 81% | Branch 69% | Funcs 87% | Lines 82%** (up from 43/27/48/43)
- Key module coverage:
  - `allocation/allocation.js`: 100% statements
  - `analytics/governance.js`: 100% statements
  - `analytics/market_regime.js`: 89% statements
  - `analytics/dynamic-governance.js`: 97% statements
  - `analytics/comparative-analysis.js`: 98% statements
  - `config/environment.js`: 82% statements
  - `core/scanner.js`: 0% → 24% statements (pure logic + decision tree tested)
  - `indicators/indicators.js`: 99% statements
  - `indicators/scoring.js`: 92% statements
  - `middleware/security.js`: 98% statements
  - `middleware/error-handler.js`: 94% statements
  - `middleware/validation.js`: 100% statements
  - `ml/ml-engine.js`: 99% statements
  - `ml/adaptive-scoring.js`: 100% statements
  - `ml/factor-weighting.js`: 96% statements
  - `ml/anomaly-detection.js`: 98% statements
  - `ml/recommendation-engine.js`: 94% statements
  - `ml/regime-prediction.js`: 99% statements
  - `portfolio/portfolio-manager.js`: 100% statements
  - `portfolio/performance-tracker.js`: 100% statements
  - `reports/report-generator.js`: 94% statements
  - `reports/excel-exporter.js`: 100% statements
  - `reports/pdf-templates.js`: 100% statements
  - `reports/comparative-analysis.js`: 100% statements
  - `security/validation-schemas.js`: 97% statements
  - `storage/indexed-db-store.js`: 87% statements

**Success Criteria**:
- ✅ Code coverage reaches 80% overall (81% stmts / 82% lines)
- ✅ All critical paths tested
- ✅ Edge cases and error conditions covered
- Property-based tests deferred to future iteration

#### 2.1.3 Implement Integration Tests
**Status**: ✅ COMPLETED - February 2026

**Current Gap** (at start): No integration tests exist to verify components work together correctly.

**Actions**:
- ✅ Create integration test suite structure:
  - `src/tests/integration/` directory
  - [helpers.js](../src/tests/integration/helpers.js) — shared builders (`buildScoredAssets`, `buildPriceMatrix`, `buildPortfolioWithPositions`, `buildRegimeMarketData`, `createMockDbStore`, `buildOHLCVSeries`)
  - Updated [vitest.config.js](../vitest.config.js) to include `src/tests/integration/**/*.test.js`
  - Added `test:unit` and `test:integration` npm scripts to [package.json](../package.json)
- ✅ Write integration tests for 6 key workflows (6 test files, 113 tests):
  - [scoring-pipeline.integration.test.js](../src/tests/integration/scoring-pipeline.integration.test.js) — 33 tests: Indicators → Scoring → FinalScore → Allocation → Portfolio Risk (all 5 allocation methods, weight sums, score-weighted ordering, ERC vol ordering, capital recommendations, edge cases)
  - [portfolio-construction.integration.test.js](../src/tests/integration/portfolio-construction.integration.test.js) — 15 tests: Allocation → Risk report (VaR, correlations, stress tests), Allocation → Governance (compliance validation, over-concentration, automatic corrections, governance reports), Allocation methods comparison, Capital recommendations, Risk metrics consistency
  - [alert-system.integration.test.js](../src/tests/integration/alert-system.integration.test.js) — 16 tests: Alert creation → persistence → retrieval, Settings CRUD, Strong signals notification (threshold filtering), Rebalance notification, Throttling (dedupeKey blocking), Delivery channels (webhook success/failure/network error, partial success, skipped delivery)
  - [report-generation.integration.test.js](../src/tests/integration/report-generation.integration.test.js) — 9 tests: Scan results → Excel, Portfolio → Excel, Backtest → PDF, Comparative analysis (2 and 3 strategies), Report generator utilities (formatNumber, formatPercent, formatCurrency, safeValue), Executive summary, Period comparison
  - [ml-pipeline.integration.test.js](../src/tests/integration/ml-pipeline.integration.test.js) — 19 tests: Factor feature extraction, Factor weighting training pipeline (prepareTrainingData, train, optimizeFactorWeights), Adaptive scoring feedback loop (boost/penalty/batch/regime analysis), Regime prediction (feature extraction, classifier training, prediction), Anomaly detection (Z-score, detectAll, summary), Recommendation engine (portfolio recs, risk warnings, analyzeAssetML), Full ML chain integration
  - [portfolio-lifecycle.integration.test.js](../src/tests/integration/portfolio-lifecycle.integration.test.js) — 21 tests: Portfolio CRUD (create, load, update, list, delete), Position management (add, remove duplicate rejection, update quantity), Snapshots → Equity curve, Drawdown series and max drawdown, Performance metrics (Sharpe, Sortino, Calmar), Rebalancing lifecycle (drift detection, execution, history), Full lifecycle chain (create → snapshot → drawdown → metrics → rebalance)
- ✅ Test database interactions via in-memory mock `createMockDbStore()`:
  - Full IndexedDB interface mock with `vi.fn()` wrappers (portfolios, snapshots, rebalances, alerts, alertSettings, priceCache)
  - Assertions on mock internals (`_portfolios`, `_snapshots`, `_rebalances`, etc.)
- ✅ Test external API interactions:
  - Alert delivery channels via `vi.fn()` mocking of `fetch` (webhook success/failure/network error, multi-channel partial success)
  - `notifyRebalance` mocked for portfolio lifecycle tests

**Results** (February 2026):
- 6 integration test files with 113 tests, all passing
- Total test suite: **53 files, 1138 tests** (1025 unit + 113 integration)
- Coverage maintained: **Stmts 81.5% | Branch 69.8% | Funcs 86.5% | Lines 81.8%** (all above thresholds)
- Integration tests run in ~100ms, full suite in ~3.8s

**Success Criteria**:
- ✅ Integration tests verify end-to-end workflows (6 key workflows covered)
- ✅ Integration tests run reliably in CI (deterministic data builders, no external deps)
- ✅ Tests use isolated mock databases (in-memory Map-backed stores)
- ✅ All 1138 tests passing (unit + integration)

#### 2.1.4 Implement End-to-End (E2E) Tests
**Status**: ✅ COMPLETED - February 2026

**Current Gap** (at start): No E2E tests to verify user-facing functionality.

**Actions**:
- ✅ Selected Playwright as E2E framework (superior parallel execution, multi-browser support, built-in auto-wait)
- ✅ Installed and configured Playwright:
  - `@playwright/test` and `@axe-core/playwright` as dev dependencies
  - [playwright.config.js](../playwright.config.js) — 3 browser projects (Chromium, Firefox, WebKit), `webServer` auto-start, screenshots/video on failure
  - npm scripts: `test:e2e`, `test:e2e:headed`, `test:e2e:chromium`, `test:e2e:report`
- ✅ Created E2E test infrastructure:
  - [src/tests/e2e/](../src/tests/e2e/) directory
  - **Page Object Models** (7 POMs): [BasePage](../src/tests/e2e/pages/BasePage.js), [ScannerPage](../src/tests/e2e/pages/ScannerPage.js), [FiltersPage](../src/tests/e2e/pages/FiltersPage.js), [PortfolioPage](../src/tests/e2e/pages/PortfolioPage.js), [DashboardPage](../src/tests/e2e/pages/DashboardPage.js), [BacktestPage](../src/tests/e2e/pages/BacktestPage.js), [AlertsPage](../src/tests/e2e/pages/AlertsPage.js)
  - [api-mocks.js](../src/tests/e2e/helpers/api-mocks.js) — `page.route()` interceptors for `/api/yahoo` and `universes/*.json`
  - [test-utils.js](../src/tests/e2e/helpers/test-utils.js) — `setupWithCompletedScan()`, `clearBrowserState()`, `getVisibleResultCount()`
  - [yahoo-responses.js](../src/tests/e2e/fixtures/yahoo-responses.js) — deterministic OHLCV data builder with symbol-seeded variation
- ✅ Wrote E2E tests for all critical user journeys (11 spec files, 76 tests):
  - [smoke.spec.js](../src/tests/e2e/smoke.spec.js) — 8 tests: page load, health API, critical elements, defaults
  - [scan-journey.spec.js](../src/tests/e2e/scan-journey.spec.js) — 10 tests: market/strategy selection, scan execution, results, view modes
  - [filters.spec.js](../src/tests/e2e/filters.spec.js) — 9 tests: search, signal, score, volume, combined, clear, summary
  - [portfolio-construction.spec.js](../src/tests/e2e/portfolio-construction.spec.js) — 8 tests: allocation methods (equal/score/hybrid), risk profiles
  - [portfolio-dashboard.spec.js](../src/tests/e2e/portfolio-dashboard.spec.js) — 7 tests: save/load, chart tabs, positions, metrics, refresh
  - [backtest.spec.js](../src/tests/e2e/backtest.spec.js) — 7 tests: params, execution, results sections, methods, export buttons
  - [alerts.spec.js](../src/tests/e2e/alerts.spec.js) — 6 tests: thresholds, channels, notifications, save
  - [export.spec.js](../src/tests/e2e/export.spec.js) — 4 tests: scan export, download event, backtest/portfolio exports
  - [language.spec.js](../src/tests/e2e/language.spec.js) — 6 tests: default Spanish, switch en/es, button text, html lang, filters
  - [responsive.spec.js](../src/tests/e2e/responsive.spec.js) — 7 tests: desktop/tablet/mobile viewports, overflow, touch targets
  - [accessibility.spec.js](../src/tests/e2e/accessibility.spec.js) — 4 tests: axe-core audit, baseline tracking, keyboard focus
- ✅ Tested responsive design across desktop (1280×720), tablet (768×1024), and mobile (375×667) viewports
- ✅ Integrated axe-core for automated accessibility auditing
- ✅ Configured CI with headless Chromium in [ci.yml](../.github/workflows/ci.yml) `e2e` job
- ✅ Updated [.gitignore](../.gitignore) and [eslint.config.js](../eslint.config.js) for Playwright artifacts and globals

**API Mocking Strategy**: All external API calls intercepted at browser level via `page.route()` — no production server code changes required. Uses deterministic fixture data adapted from integration test helpers.

**Results** (February 2026):
- 11 E2E spec files with 76 tests, all passing on Chromium (~1.6 min)
- Total test suite: **64 files, 1214 tests** (1025 unit + 113 integration + 76 E2E)
- Coverage maintained (E2E tests complement but don't duplicate unit/integration coverage)
- E2E tests run in CI after lint+test jobs, with report and screenshot artifact upload

**Success Criteria**:
- ✅ All critical user journeys tested (scan, filters, portfolio, dashboard, backtest, alerts, export, language)
- ✅ E2E tests run in CI on every PR (GitHub Actions `e2e` job with Chromium)
- ✅ Tests capture screenshots/videos on failure (Playwright `only-on-failure` config)
- ✅ Accessibility violations detected automatically (axe-core integration with baseline tracking)

#### 2.1.5 Performance and Load Testing
**Status**: ✅ COMPLETED - February 2026

**Current Gap** (at start): No performance testing infrastructure.

**Actions**:
- ✅ Installed performance testing tools:
  - `autocannon` ^8.x (devDep — HTTP load testing, programmatic API)
  - `@lhci/cli` ^0.15.x (devDep — Lighthouse CI for frontend performance)
  - `vitest bench` (built-in — computational benchmarks, no extra dependency)
- ✅ Created performance test directory structure:
  - `src/tests/performance/budgets/` — centralised threshold definitions
  - `src/tests/performance/benchmarks/` — 7 Vitest bench files (`*.bench.js`)
  - `src/tests/performance/load/` — autocannon-based load test scripts
  - `src/tests/performance/lighthouse/` — LHCI configuration and runner
  - `src/tests/performance/results/` — runtime output directory (gitignored)
- ✅ Created [performance-budgets.js](../src/tests/performance/budgets/performance-budgets.js) — single source of truth for all thresholds with `PERF_STRICT` env for tighter local limits
- ✅ Created 7 computational benchmark files:
  - [indicators.bench.js](../src/tests/performance/benchmarks/indicators.bench.js) — 18 benchmarks: SMA, EMA, EMA_Array, RSI, ATR, BollingerBands, ADX, WilliamsR, ROC, Volatility, MaxDrawdown, DaysAboveEMA, VolumeRatio (500 and 1000 data points)
  - [scoring.bench.js](../src/tests/performance/benchmarks/scoring.bench.js) — 6 benchmarks: calculateTrendScore, calculateMomentumScore, calculateRiskScore, calculateLiquidityScore, applyHardFilters, full scoring pipeline
  - [allocation.bench.js](../src/tests/performance/benchmarks/allocation.bench.js) — 8 benchmarks: equalWeight, scoreWeighted, ERC, volatilityTargeting, hybrid (5 assets), allocateCapital with 3 methods (10 assets)
  - [ml-engine.bench.js](../src/tests/performance/benchmarks/ml-engine.bench.js) — 9 benchmarks: normalizeArray, standardizeArray, calculateCorrelation, LinearRegression/DecisionTree/RandomForest/KMeans fit, LR/RF predict
  - [portfolio-optimizer.bench.js](../src/tests/performance/benchmarks/portfolio-optimizer.bench.js) — 3 benchmarks: optimizeMaxSharpe, optimizeMinVariance, optimizeRiskParity
  - [monte-carlo.bench.js](../src/tests/performance/benchmarks/monte-carlo.bench.js) — 2 benchmarks: 1k and 10k simulation runs
  - [stress-testing.bench.js](../src/tests/performance/benchmarks/stress-testing.bench.js) — 3 benchmarks: sector stress (tech crash, financial crisis), multi-factor stress
- ✅ Created load test infrastructure:
  - [load-test-runner.js](../src/tests/performance/load/load-test-runner.js) — utility: `startServer()` (child process with env overrides, health polling), `runLoadTest()` (autocannon wrapper), `stopServer()`, `assertBudgets()`, `printResults()`
  - [health-endpoint.load.js](../src/tests/performance/load/health-endpoint.load.js) — /api/health throughput test (10s, 10 connections, ~3300 req/s, p97.5 < 100ms budget)
  - [yahoo-endpoint.load.js](../src/tests/performance/load/yahoo-endpoint.load.js) — /api/yahoo middleware overhead (short timeout, measures Express stack)
  - [rate-limiting.load.js](../src/tests/performance/load/rate-limiting.load.js) — validates 429 responses returned when exceeding rate limit (20 accepted, 30 rejected)
- ✅ Created Lighthouse CI configuration:
  - [lighthouserc.js](../src/tests/performance/lighthouse/lighthouserc.js) — 3 runs, performance/a11y/best-practices >= 90, SEO >= 80, FCP < 1500ms, TTI < 3000ms, LCP < 2500ms, CLS < 0.1
  - [lighthouse-runner.js](../src/tests/performance/lighthouse/lighthouse-runner.js) — wraps `lhci autorun`
- ✅ Set performance budgets:
  - API: health p97.5 < 100ms, 500+ req/s; yahoo p97.5 < 500ms
  - Computation: single indicator < 5ms, scoring pipeline < 25ms, RF fit < 1500ms, Monte Carlo 10k < 600ms
  - Frontend: Lighthouse performance/a11y/best-practices >= 90, FCP < 1.5s, TTI < 3s
- ✅ Added npm scripts: `test:bench`, `test:bench:json`, `test:load`, `test:load:health`, `test:load:yahoo`, `test:load:ratelimit`, `test:lighthouse`, `test:perf`, `test:perf:all`, `perf:baseline`
- ✅ Updated [vitest.config.js](../vitest.config.js) with `benchmark` section (include pattern + setup file)
- ✅ Updated [eslint.config.js](../eslint.config.js) with `bench` global for benchmark files
- ✅ Updated [.gitignore](../.gitignore) for runtime performance artifacts
- ✅ Added `performance` job to [ci.yml](../.github/workflows/ci.yml) (needs: lint+test; runs benchmarks, load tests, Lighthouse)
- ✅ Regression detection via `vitest bench --outputJson` + `--compare` against committed baseline

**Results** (February 2026):
- 7 benchmark files with 49 individual benchmarks, all passing
- 3 load test scripts validating API throughput and rate limiting
- Lighthouse CI configured with production performance budgets
- Health endpoint: ~3300 req/s, p97.5 latency 7ms
- Rate limiting validated: 20/50 requests accepted, 30 rejected with 429
- All 1138 existing tests continue passing (zero regressions)
- `npm run lint` clean

**Success Criteria**:
- ✅ Performance benchmarks established (49 computational benchmarks across 7 modules)
- ✅ Performance budgets enforced in CI (performance job with load tests)
- ✅ Performance regressions detectable via `vitest bench --compare` against baseline
- ✅ Load testing verifies capacity (3300+ req/s health endpoint, rate limiting functional)

### 2.2 Type Safety Implementation

**Status**: ✅ COMPLETED - February 2026

#### 2.2.1 TypeScript Migration Assessment
**Status**: ✅ COMPLETED

**Decision**: Option A (Full TypeScript migration) selected and executed.

#### 2.2.2 TypeScript Migration (Option A)
**Status**: ✅ COMPLETED - February 2026

**Completed Actions**:
- Installed TypeScript, tsx, typescript-eslint, and all @types packages
- Created `tsconfig.json` with strict mode (noImplicitAny, strictNullChecks, etc.)
- Created `src/types/` directory with shared type definitions
- Migrated all 55+ source files from `.js` to `.ts` (renamed + typed)
- Zero TypeScript compilation errors across entire codebase (`npx tsc --noEmit` clean)
- All 53 test files / 1138 tests continue to pass after migration
- Updated vitest coverage config to include `.ts` source files

**Key modules migrated**:
- `src/core/scanner.ts` (3739 lines — largest file)
- `src/analytics/` — risk_engine, portfolio-optimizer, attribution-analysis, backtesting, etc.
- `src/ml/` — ml-engine, adaptive-scoring, anomaly-detection, recommendation-engine, etc.
- `src/dashboard/portfolio-dashboard.ts`
- `src/reports/`, `src/portfolio/`, `src/storage/`, `src/ui/`, `src/middleware/`

**Success Criteria**: ✅ All met
- All .js source files migrated to .ts
- TypeScript compilation succeeds with strict mode (0 errors)
- All 1138 tests passing with TypeScript
- Type errors caught at compile time

#### 2.2.3 JSDoc Type Annotations (Option B - Alternative)
**Actions**:
- Configure TypeScript type checking for JavaScript:
  - Create `jsconfig.json`
  - Enable checkJs option
  - Configure type checking strictness
- Add JSDoc comments to all functions:
  - @param with types
  - @returns with types
  - @throws for error conditions
  - @typedef for complex types
- Create type definition files for shared types:
  - Create `types.js` with @typedef declarations
  - Define interfaces for data structures
  - Define union types for enums
- Fix all type errors reported by TypeScript
- Add type checking to CI pipeline

**Success Criteria**:
- All functions have JSDoc type annotations
- TypeScript type checking passes
- IntelliSense works in IDE
- Type errors caught in CI

### 2.3 API Documentation

**Status**: ✅ COMPLETED - February 2026

#### 2.3.1 OpenAPI/Swagger Specification
**Status**: ✅ COMPLETED - February 2026
**Current Gap**: No formal API documentation exists.

**Actions**:
- Install Swagger/OpenAPI tools:
  - swagger-jsdoc (generate spec from JSDoc comments)
  - swagger-ui-express (serve interactive API docs)
- Create OpenAPI 3.0 specification:
  - Document all API endpoints:
    - `/api/yahoo` (Yahoo Finance proxy)
    - `/api/health` (health check)
    - `/api/run-tests` (test runner)
  - Define request/response schemas
  - Document authentication (when implemented)
  - Document error responses
  - Add examples for all endpoints
- Configure Swagger UI:
  - Mount on `/api-docs` endpoint
  - Add custom branding
  - Enable "Try it out" functionality
- Generate static API documentation
- Keep specification in sync with code

**Success Criteria**:
- All API endpoints documented
- Interactive API documentation available at `/api-docs`
- Examples provided for all requests/responses
- Documentation stays in sync with code

#### 2.3.2 API Versioning Strategy
**Status**: ✅ COMPLETED - February 2026
**Current Gap**: No API versioning in place.

**Actions**:
- Design API versioning strategy:
  - URL versioning (`/api/v1/...`) recommended for simplicity
  - Document versioning policy
  - Define deprecation procedures
- Implement version 1:
  - Move existing endpoints to `/api/v1/`
  - Add version to API responses
  - Document migration path from unversioned endpoints
- Create version negotiation middleware
- Document versioning policy in API docs

**Success Criteria**:
- All endpoints versioned (`/api/v1/...`)
- Deprecation policy documented
- Old endpoints redirect with deprecation warnings

### 2.4 Code Documentation

**Status**: ✅ COMPLETED - February 2026

#### 2.4.1 Inline Documentation Standards
**Status**: ✅ COMPLETED - February 2026
**Actions**:
- Establish documentation standards:
  - All public functions must have JSDoc comments
  - Complex algorithms must have explanatory comments
  - Non-obvious code sections must have comments explaining "why" not "what"
- Create documentation templates:
  - Function documentation template
  - Class documentation template
  - Module documentation template
- Document all modules:
  - Add file-level JSDoc comments
  - Document module purpose and responsibilities
  - Document exported functions and classes
  - Document complex algorithms (e.g., ML models, optimisation algorithms)
- Add inline comments for complex logic
- Remove outdated or misleading comments

**Success Criteria**:
- All public APIs documented
- Complex algorithms explained
- Documentation matches code behaviour

#### 2.4.2 Architecture Documentation
**Status**: ✅ COMPLETED - February 2026
**Actions**:
- Enhance [arquitectura-tecnica.md](../docs/arquitectura-tecnica.md):
  - Add architecture diagrams (C4 model recommended)
  - Document system context
  - Document container diagram
  - Document component diagram
  - Document deployment architecture
- Create data flow diagrams:
  - Market data ingestion flow
  - Scanning and scoring flow
  - Portfolio optimisation flow
  - Alert triggering flow
- Document design decisions:
  - Create Architecture Decision Records (ADR) directory
  - Document key architectural choices
  - Document trade-offs and alternatives considered
- Document data models:
  - Database schema documentation
  - Data structure documentation
  - Validation rules documentation

**Success Criteria**:
- Architecture clearly documented with diagrams
- New developers can understand system design
- Design decisions documented and justified

---

## 3. Phase 3: Performance, Scalability, and DevOps

**Objective**: Optimise performance, prepare for scale, and implement professional deployment practices.

**Priority**: MEDIUM to HIGH

### 3.1 Performance Optimisation

#### 3.1.1 Frontend Build Optimisation
**Status**: ✅ COMPLETED — February 2026

**Completed Actions**:
- ✅ Installed Vite 7 as devDependency
- ✅ Created [`vite.config.ts`](../vite.config.ts):
  - Entry points: `src/core/scanner.ts`, `src/i18n/ui-translator.ts`, `src/i18n/ui-init.ts`, `src/dashboard/attribution-dashboard.css`
  - Output: `dist/public/assets/` (hashed filenames: `[name]-[hash].js`)
  - esbuild minification (JS + CSS), source maps for production debugging
  - Vite manifest (`manifest.json`) for post-build HTML injection
  - Vite dev-server config with proxy for optional HMR workflow
- ✅ Code splitting by functional domain — 9 shared chunks:
  `chunk-ml`, `chunk-analytics`, `chunk-indicators`, `chunk-portfolio`,
  `chunk-reports`, `chunk-i18n`, `chunk-allocation`, `chunk-data`,
  `chunk-alerts`, `chunk-storage`, `chunk-dashboard`
- ✅ Created [`scripts/inject-vite-assets.js`](../scripts/inject-vite-assets.js):
  - Reads Vite manifest, patches `index.html` with hashed asset references
  - Injects `<link rel="modulepreload">` for all chunks (performance hint)
  - Copies `universes/` data to `dist/public/universes/`
- ✅ Updated [`server.js`](../server.js):
  - Production (`NODE_ENV=production`): serves `dist/public/` first, then `.` for data files
  - SPA fallback: non-API GET requests return `dist/public/index.html`
  - Development/test: unchanged (serves from `.`, uses tsc-compiled `dist/src/`)
- ✅ Updated npm scripts: `build` (server+client), `build:server`, `build:client`, `build:client:vite`, `preview`, `dev:server`, `dev:vite`
- ✅ Updated CI `build` job: runs `build:server` then `build:client`, reports chunk sizes, uploads artifacts

**Results** (February 2026):
| Metric | Value | Target |
|--------|-------|--------|
| Total gzipped bundle | ~110 kB | < 500 kB ✅ |
| Largest chunk | 37 kB gzip (ui-translator/i18n) | — |
| Build time | ~620 ms | — |
| Independent cache chunks | 9 | — |
| Tree-shaking | Active (esbuild) | ✅ |
| Source maps | Generated | ✅ |
| Asset hashing | Content hash `[name]-[hash].js` | ✅ |

**Success Criteria**:
- ✅ Production bundle size < 500 kB gzipped (~110 kB actual)
- ✅ Asset hashing for long-term cache busting
- ✅ Source maps for production debugging
- ✅ Code splitting by domain for independent cache invalidation
- TTI / FCP / Lighthouse score: measured by Phase 2.1.5 Lighthouse CI (targets >= 90 / FCP < 1.5s)

#### 3.1.2 Backend Performance Optimisation
**Status**: ✅ COMPLETED — February 2026 (compression + Yahoo cache)

**Actions**:
- ✅ Implement API response caching:
  - ✅ `node-cache` in-memory cache for Yahoo Finance responses (5 min TTL)
  - ✅ `src/utils/cache.ts` — buildYahooCacheKey, getYahooCache, setYahooCache, flushYahooCache
  - ✅ Cache hit/miss counters + `X-Cache: HIT/MISS` response header
  - ✅ `POST /api/v1/cache/flush` for forced invalidation (dev/test only)
- Database query caching deferred to 3.1.3 (IndexedDB client-side, no server queries)
- ✅ Implement request compression:
  - ✅ `compression` package (gzip/brotli) registered before routes
  - ✅ Threshold 1 KB; /metrics excluded from compression
- Algorithm optimisation deferred (worker threads for ML — Phase 3.4)
- Connection pooling N/A (stateless proxy; no persistent DB connections)

**Success Criteria**:
- ✅ Response compression reduces payload by 60%+ (gzip active)
- ✅ Cache hit rate tracked and reported in /api/v1/health
- ✅ `X-Cache` header confirms cache operation per request

#### 3.1.3 Database Optimisation
**Current Gap**: IndexedDB usage not optimised; no server-side database for multi-user scenarios.

**Actions**:
- Optimise IndexedDB:
  - Review index strategy
  - Add composite indexes where beneficial
  - Implement efficient query patterns
  - Add database versioning and migrations
  - Implement database cleanup procedures
- Evaluate server-side database options:
  - PostgreSQL for relational data (recommended for financial data)
  - MongoDB for document storage (alternative)
  - TimescaleDB for time-series data (alternative for market data)
- Design database schema:
  - User data (when authentication added)
  - Portfolio configurations
  - Historical scan results
  - Alert configurations
  - Audit logs
- Implement database migrations:
  - Install migration tool (node-pg-migrate for PostgreSQL)
  - Create initial schema migration
  - Document migration procedures
- Implement database backup and restore procedures

**Success Criteria**:
- IndexedDB queries optimised with appropriate indexes
- Server-side database schema designed and implemented
- Database migrations automated
- Backup procedures documented and tested

#### 3.1.4 Caching Strategy
**Status**: ✅ COMPLETED — February 2026 (browser cache headers + application cache)

**Actions**:
- ✅ Browser cache — `Cache-Control` headers via `express.static` `setHeaders`:
  - HTML: `no-cache, must-revalidate`
  - JS/CSS/fonts/images: `public, max-age=31536000, immutable` (1 year)
  - JSON data files: `public, max-age=300` (5 min)
- CDN cache: deferred (requires cloud deployment)
- ✅ Application cache: `node-cache` for Yahoo Finance API responses (5 min TTL)
- Database cache: N/A (IndexedDB client-side; no server-side DB)
- ETags: handled automatically by `express.static`
- ✅ Cache monitoring: hit/miss counters exposed via `/api/v1/health` and `/metrics`

**Success Criteria**:
- ✅ Static assets configured for 1-year cache (immutable)
- ✅ API responses cached with 5-minute TTL
- ✅ Cache hit rate tracked in health endpoint and Prometheus metrics

### 3.2 Containerisation and Deployment

#### 3.2.1 Docker Implementation
**Status**: ✅ COMPLETED - February 2026
**Current Gap**: No containerisation; deployment process not documented or automated.

**Actions**:
- Create `Dockerfile`:
  - Use official Node.js image (node:20-alpine for smaller size)
  - Multi-stage build (build stage and runtime stage)
  - Copy only production dependencies
  - Run as non-root user
  - Configure health check
  - Optimise layer caching
- Create `.dockerignore`:
  - Exclude node_modules
  - Exclude development files
  - Exclude .git
  - Exclude documentation
- Build and test Docker image:
  - Verify image builds successfully
  - Verify application starts correctly
  - Verify health check works
  - Check image size (target < 200MB)
- Push image to container registry (Docker Hub, GitHub Container Registry, or AWS ECR)
- Document Docker deployment procedures

**Success Criteria**:
- Docker image builds successfully
- Image size optimised (< 200MB)
- Application runs correctly in container
- Health check reports application status

#### 3.2.2 Docker Compose for Local Development
**Status**: ✅ COMPLETED - February 2026
**Actions**:
- Create `docker-compose.yml`:
  - Define application service
  - Define Redis service (for caching)
  - Define PostgreSQL service (for database)
  - Configure service dependencies
  - Set up volumes for persistence
  - Configure environment variables
  - Set up networks
- Create `docker-compose.override.yml` for local development:
  - Mount source code as volume for hot reload
  - Expose debugging ports
  - Configure development environment variables
- Document Docker Compose usage:
  - How to start services
  - How to view logs
  - How to access services
  - How to reset data
- Create Make file or npm scripts for common Docker Compose commands

**Success Criteria**:
- `docker-compose up` starts all services
- Services can communicate with each other
- Data persists across container restarts
- Development workflow streamlined

#### 3.2.3 Kubernetes Deployment Configuration
**Actions** (Optional, for larger deployments):
- Create Kubernetes manifests:
  - Deployment manifest for application
  - Service manifest for load balancing
  - Ingress manifest for routing
  - ConfigMap for configuration
  - Secret for sensitive data
  - PersistentVolumeClaim for data
  - HorizontalPodAutoscaler for auto-scaling
- Create Helm chart for simplified deployment:
  - Chart.yaml
  - values.yaml with configuration options
  - Templates for all resources
  - Document Helm deployment procedures
- Configure health checks:
  - Liveness probe
  - Readiness probe
  - Startup probe
- Configure resource limits and requests
- Document Kubernetes deployment procedures

**Success Criteria**:
- Application deploys to Kubernetes successfully
- Health checks work correctly
- Auto-scaling based on CPU/memory usage
- Rolling updates work without downtime

### 3.3 Monitoring and Observability

#### 3.3.1 Application Metrics
**Status**: ✅ COMPLETED — February 2026

**Actions**:
- ✅ Installed `prom-client` for Prometheus metrics
- ✅ Created `src/utils/metrics.ts` with dedicated registry:
  - `http_requests_total` — counter by method/route/status_code
  - `http_request_duration_seconds` — histogram (11 buckets, 1ms–5s)
  - `http_active_connections` — gauge of in-flight requests
  - `cache_hits_total` / `cache_misses_total` — per-cache counters
  - `cache_keys_count` — current cache key count gauge
  - `yahoo_finance_requests_total` — external proxy request counter
  - Default Node.js metrics: CPU, memory, GC, event loop lag, file descriptors
- ✅ `metricsMiddleware` — per-request instrumentation (active conn gauge, counter, histogram)
- ✅ Exposed `GET /metrics` endpoint in Prometheus text format
- ✅ `refreshCacheMetrics()` called on each scrape to update cache gauges
- Grafana dashboards: deferred (requires Prometheus server + Grafana deployment)

**Success Criteria**:
- ✅ Metrics collected and exposed at `/metrics` in Prometheus text format
- ✅ HTTP request rate, latency, error rate, cache performance all instrumented
- Prometheus scraping and Grafana dashboards deferred to cloud deployment phase

#### 3.3.2 Distributed Tracing
**Actions** (Optional, for complex deployments):
- Install tracing library (OpenTelemetry recommended)
- Configure tracing:
  - Set up trace collector (Jaeger or Zipkin)
  - Instrument HTTP requests
  - Instrument database queries
  - Instrument external API calls
  - Add custom spans for critical operations
- Create trace visualisation dashboards
- Document tracing usage for debugging

**Success Criteria**:
- Traces collected for all requests
- Trace visualisation shows request flow
- Bottlenecks identified through traces

#### 3.3.3 Log Aggregation
**Status**: ✅ COMPLETED — February 2026

**Completed Actions**:
- ✅ Installed `winston-daily-rotate-file` for date-based log rotation
- ✅ Updated `src/utils/logger.ts`:
  - `combined-YYYY-MM-DD.log` — all levels, 14-day retention (`LOG_MAX_DAYS`)
  - `error-YYYY-MM-DD.log` — errors only, 30-day retention
  - `http-YYYY-MM-DD.log` — HTTP access log, 7-day retention
  - `exceptions.log` / `rejections.log` — size-capped static files
  - Gzip compression of archived files (`LOG_ZIP_ARCHIVED`)
- ✅ Production format is JSON (ELK/Loki-compatible, Elastic Common Schema conventions)
- ✅ Added `LOG_MAX_DAYS` and `LOG_ZIP_ARCHIVED` env vars to `src/config/environment.ts`
- ✅ Log shipping configuration documented in [Operations Runbook](operations-runbook.md#7-log-management) (Filebeat/Promtail config examples)
- ✅ Log querying procedures documented (jq filtering, request ID tracing)

**Success Criteria**:
- ✅ Logs rotated daily with configurable retention
- ✅ Production JSON format compatible with ELK Stack, Grafana Loki, and CloudWatch
- ✅ Retention policies enforced automatically (14-day combined, 30-day error, 7-day HTTP)
- ✅ Log shipping configuration documented for common aggregation platforms

#### 3.3.4 Health Checks and Uptime Monitoring
**Status**: ✅ COMPLETED — February 2026 (enhanced health endpoint)

**Actions**:
- ✅ Enhanced `/api/v1/health` endpoint:
  - ✅ `memory` — heapUsedMb, heapTotalMb, externalMb, rssMb
  - ✅ `cache` — keys, hits, misses, hitRate for Yahoo Finance cache
  - ✅ `dependencies` — internalCache status (self-check)
  - ✅ `uptime` — seconds since process start (rounded)
  - Redis/external API health checks deferred (not yet deployed)
- External uptime monitoring: deferred (requires production deployment)
- Alerting (PagerDuty/OpsGenie): deferred to Phase 4

**Success Criteria**:
- ✅ Health endpoint reports memory, cache stats, features, and dependency status
- ✅ Suitable for container liveness/readiness probes
- External uptime monitoring and alerting deferred to production deployment phase

### 3.4 Scalability Improvements

#### 3.4.1 Horizontal Scaling Preparation
**Status**: ✅ COMPLETED — February 2026

**Completed Actions**:
- ✅ Installed `ioredis` for optional Redis connectivity
- ✅ Created `src/utils/redis-client.ts` — lazy singleton Redis connection with event-driven state tracking and graceful reconnect strategy
- ✅ Created `src/utils/cache-adapter.ts` — `CacheAdapter` interface with two implementations:
  - `RedisAdapter` (when `REDIS_URL` set) — JSON serialised get/set/del/flush using ioredis
  - `NodeCacheAdapter` (default) — wraps existing node-cache instance
- ✅ Updated `src/utils/cache.ts` to use the adapter transparently (callers unchanged)
- ✅ Added `REDIS_URL`, `REDIS_KEY_PREFIX`, `REDIS_CONNECT_TIMEOUT_MS` env vars
- ✅ Enhanced `/api/v1/health` with `dependencies.redis` status and `cache.backend` field
- ✅ Graceful Redis shutdown on SIGTERM/SIGINT in `server.js`
- ✅ Scaling procedures documented in [Deployment Guide](deployment-guide.md#63-scaling-with-docker-compose) and [Operations Runbook](operations-runbook.md#8-scaling-procedures)

**Success Criteria**:
- ✅ Application uses Redis shared cache when `REDIS_URL` is set (enables horizontal scaling)
- ✅ Falls back to in-process node-cache when Redis is not configured (single-instance mode)
- ✅ Health endpoint reports active backend and Redis connection state
- Session data deferred to Phase 4.1 (authentication not yet implemented)

#### 3.4.2 Async Processing with Queue
**Status**: ✅ COMPLETED — February 2026

**Completed Actions**:
- ✅ Installed `bullmq` for Redis-backed job queues
- ✅ Created `src/queue/queue-manager.ts`:
  - Three named queues: `portfolio-optimization`, `report-generation`, `ml-training`
  - BullMQ Workers with configurable concurrency (2× for optimization/reports, 1× for ML)
  - `enqueue()` — submits job and returns `{ queued: true, jobId }` or `{ queued: false, reason }`
  - `getJobStatus(jobId)` — polls state across all queues
  - `getQueueStats()` — per-queue counts (waiting/active/completed/failed/delayed)
  - Automatic retry (3 attempts, exponential backoff); completed job cleanup after 1h
- ✅ Created three job processors in `src/queue/processors/`:
  - [portfolio-optimization.processor.ts](../src/queue/processors/portfolio-optimization.processor.ts) — Max Sharpe, Min Variance, Risk Parity, ERC (iterative, no external optimizer dep)
  - [report-generation.processor.ts](../src/queue/processors/report-generation.processor.ts) — Excel (xlsx) and PDF (jsPDF) generation with progress reporting
  - [ml-training.processor.ts](../src/queue/processors/ml-training.processor.ts) — Linear Regression (factor weighting), Logistic Regression (regime prediction), Z-Score calibration (anomaly detection)
- ✅ Added five API endpoints to `server.js`:
  - `POST /api/v1/jobs/optimize` → `202 Accepted` with `jobId`
  - `POST /api/v1/jobs/report` → `202 Accepted` with `jobId`
  - `POST /api/v1/jobs/ml-train` → `202 Accepted` with `jobId`
  - `GET /api/v1/jobs/:jobId` → poll status/result/error
  - `GET /api/v1/jobs` → queue statistics
- ✅ Queue enabled/disabled gracefully: no-op when `REDIS_URL` not set; returns `{ queued: false, reason: "redis_not_configured" }` without crashing
- ✅ Queue status included in `/api/v1/health` response
- ✅ Graceful shutdown: `closeQueues()` called before `closeRedisClient()` on SIGTERM/SIGINT

**Success Criteria**:
- ✅ Heavy operations (optimize, report, ML) processed asynchronously with job IDs
- ✅ Job state (waiting/active/completed/failed) pollable via REST API
- ✅ Failed jobs retried automatically (3× exponential backoff)
- ✅ Queue gracefully disabled when Redis not configured (no-op fallback)

---

## 4. Phase 4: Production Readiness and Compliance

**Objective**: Ensure the application meets production standards including compliance, authentication, and operational readiness.

**Priority**: MEDIUM to LOW (depending on deployment timeline)

### 4.1 Authentication and Authorisation

> ✅ **Rebuilt and verified 2026-07-02** after the original implementation (recorded as
> complete in a prior session's memory) was found missing from the repo — see the
> `auth_phase_reverted` memory entry for the forensics. This time: `tsc --noEmit` clean,
> full unit+integration suite green (1231 tests total, 70 covering auth), and the flow was
> smoke-tested end-to-end against a **running server** over real HTTP (register →
> duplicate→409 → login → GET /me → refresh-rotation → logout-of-stale-token all behaved
> correctly). **Not yet committed** — see the working-tree note below.
>
> **What's actually built** (backend only, by explicit scope decision this session):
> `src/config/database.ts` (SQLite singleton, WAL, idempotent DDL), `src/auth/user-model.ts`
> (sync CRUD), `src/auth/auth-service.ts` (register/login/logout/refresh/forgot+reset
> password — bcrypt 12 rounds, constant-time login, JWT refresh rotation with `jti`),
> `src/auth/auth-middleware.ts` (`requireAuth`/`requireRole`), `src/auth/auth-router.ts`
> (7 endpoints, mounted at `/api/v1/auth`). New env vars: `JWT_SECRET`, `JWT_EXPIRES_IN`,
> `JWT_REFRESH_EXPIRES_IN`, `DATABASE_PATH`, `APP_URL`. OpenAPI spec updated
> (`src/config/swagger.ts`, new `Authentication` tag). First user → admin.
>
> **Updated 2026-07-02 (follow-up pass)**: the deferred wiring step is now done. Real
> `requireAuth()` JWT verification protects `/api/v1/simulate`, while `/api/v1/jobs/*`
> requires `admin|analyst` and `/metrics` requires `admin`. The simulator integration
> suite was rewritten to mint real JWTs instead of relying on the previous local stub.
> Frontend login/registration UI, login rate-limiting/lockout, email-verification
> delivery, and per-user data isolation (4.1.3) are still not built yet — see the
> per-subsection status below.
>
> **Reverted the same day**: `requireAuth()` was briefly wired onto `/api/v1/yahoo` too,
> but that broke scanning outright — the frontend has no login flow, so every fetch
> 401'd and every stock was rejected as "Insufficient history". `/api/v1/yahoo` (and the
> legacy `/api/yahoo`) are public again, same as before this phase; only rate limiting
> applies. Dev-mode rate limit defaults were also relaxed (`RATE_LIMIT_MAX_REQUESTS`/
> `RATE_LIMIT_YAHOO_MAX` default higher when `NODE_ENV=development`) so a full-market
> scan doesn't exhaust the limiter mid-run.
>
> **Working-tree note**: like 4.4 before it, this is uncommitted on `main` as of 2026-07-02:
> `package.json`/`package-lock.json` (new deps: `better-sqlite3`, `jsonwebtoken`, `bcrypt`,
> `nodemailer` + `@types/*`), `server.js`, `src/config/environment.ts`,
> `src/config/swagger.ts`, `src/security/validation-schemas.ts`, `src/tests/vitest.setup.js`,
> `vitest.config.js`, `.gitignore`, `.env.example`, plus new `src/auth/`,
> `src/config/database.ts`, and their tests. Commit before moving on.
>
> **Separately discovered while re-verifying this phase**: the project's global coverage
> gate (`vitest --coverage`, thresholds 80/60/85/80 in `vitest.config.js`) was **already
> failing on `main` before this session's changes** (78.11% stmts / 78.34% lines / 83.54%
> funcs — confirmed via `git stash` comparison), largely because `src/config/swagger.ts`
> (0% covered, 656 lines) and `src/core/scanner.ts` (~20%) drag the average down. This
> session's auth work nudged the numbers slightly *up* (78.63/78.94/84.07), not down, but
> the gate itself is a pre-existing, unrelated problem worth a dedicated pass later (either
> add `scanner.ts` tests, or scope coverage `include` away from declarative/generated files
> like `swagger.ts`).

#### 4.1.1 Authentication System Design
**Status**: ✅ COMPLETED — 2026-07-02 (Option A: JWT-based auth selected and implemented)

**Actions**:
- Design authentication strategy:
  - Evaluate authentication methods:
    - Option A: JWT-based authentication (stateless, suitable for API)
    - Option B: Session-based authentication (traditional, simpler)
    - Option C: OAuth 2.0 / OpenID Connect (delegate to provider like Auth0)
  - Document authentication flow
  - Design token refresh mechanism
  - Plan password policies
- Select authentication approach based on requirements:
  - Self-hosted users: JWT or session-based
  - Enterprise users: OAuth/SAML
  - Public SaaS: OAuth with social login

**Deliverable**: Authentication design document

#### 4.1.2 User Management Implementation
**Status**: 🟡 PARTIALLY COMPLETED — 2026-07-02 (backend core done; see gaps below)

**Actions**:
- Create user database schema:
  - ✅ Users table (id, email, password_hash, role, email_verified, created_at, updated_at) — plus `refresh_tokens` and `password_resets` tables
  - N/A Sessions table — not needed, this is stateless JWT auth
  - ❌ User preferences table — not built (no preferences feature exists yet)
  - ❌ Separate user roles table — role is a `CHECK`-constrained enum column on `users` instead; sufficient for the 3 fixed roles (admin/analyst/viewer), revisit only if custom roles are needed
- Implement authentication endpoints:
  - ✅ POST `/api/v1/auth/register` (user registration)
  - ✅ POST `/api/v1/auth/login` (user login)
  - ✅ POST `/api/v1/auth/logout` (user logout)
  - ✅ POST `/api/v1/auth/refresh` (token refresh, with rotation)
  - ✅ POST `/api/v1/auth/forgot-password` (password reset request)
  - ✅ POST `/api/v1/auth/reset-password` (password reset confirmation)
  - ✅ GET `/api/v1/auth/me` (bonus — not in the original plan, added for convenience)
- Implement password security:
  - ✅ bcrypt (12 rounds) for password hashing
  - ✅ Password strength requirement (min 8 characters via Zod schema)
  - ❌ Rate limiting on login attempts — not implemented; `/api/v1/auth/login` has no stricter limit than the global 100 req/15min
  - ❌ Account lockout after failed attempts — not implemented
- Implement email verification:
  - 🟡 `email_verified` column + `markEmailVerified()` exist in the data layer, but no verification email is sent and no verification endpoint exists — registration does not currently gate login on this
  - ❌ Prevent login until email verified — not implemented (by design for now; would need SMTP configured in all environments)
- Create authentication middleware:
  - ✅ Verify JWT tokens (`requireAuth()`)
  - ✅ Attach user object to `req.user`
  - ✅ Handle expired/invalid tokens (401)
  - ✅ `requireRole(...roles)` for RBAC (see 4.1.3)
- Update frontend for authentication:
  - ❌ Login page, registration page, password reset flow, token storage/refresh, redirect-when-unauthorised — **none built**. This session was backend/API-only by design; the existing frontend (`src/core/scanner.ts`) has no auth UI or token handling yet.

**Success Criteria**:
- ✅ Users can register and log in
- ✅ Passwords stored securely (hashed)
- ❌ Email verification works — schema exists, delivery/enforcement does not
- ✅ Authentication required for protected endpoints — wired onto `/api/v1/simulate`, `/api/v1/jobs/*`, and `/metrics` (`/api/v1/yahoo` is deliberately public — see note above)

#### 4.1.3 Role-Based Access Control (RBAC)
**Status**: 🟡 PARTIALLY COMPLETED — 2026-07-02 (roles + middleware built and wired; no per-user data isolation or auth-aware UI yet)

**Actions**:
- Define user roles:
  - ✅ Admin (full access), Analyst, Viewer — enforced via SQLite `CHECK` constraint and the `UserRole` TS type
  - ❌ Custom roles — out of scope, not needed yet
- Implement permission system:
  - 🟡 Role-based (not fine-grained permission-based): `requireRole('admin', 'analyst')` etc. exists and is tested, but there's no `create_scan`/`edit_portfolio`/`configure_alerts`-style permission table — coarser than originally scoped, and sufficient for 3 roles
  - ✅ Authorization middleware (`requireRole`)
- ✅ Protect endpoints with permission checks — `/api/v1/simulate` now requires real JWT auth; `/api/v1/jobs/*` requires `admin|analyst`; `/metrics` requires `admin`. `/api/v1/yahoo` remains public by design (see note above). Simulator integration tests were rewritten to use real JWTs.
- Implement data isolation:
  - ❌ Users see only their own scans/portfolios — not applicable yet; the app has no per-user data ownership model (scans/portfolios aren't currently associated with a user_id anywhere)
  - ❌ Row-level security — not implemented, same reason
- ❌ Update UI to show/hide features based on permissions — no frontend auth UI exists yet (see 4.1.2)

**Success Criteria**:
- ✅ Different user roles have appropriate access **at the middleware level** (verified in isolation)
- ✅ Unauthorised actions blocked **on real endpoints** — auth + RBAC are wired onto `/api/v1/simulate`, `/api/v1/jobs/*`, and `/metrics` (`/api/v1/yahoo` is public by design, not an oversight)
- ❌ Data properly isolated between users — no per-user data model exists yet in this codebase
- Data properly isolated between users

### 4.2 Data Protection and Compliance

#### 4.2.1 Data Encryption
**Current Gap**: No encryption at rest; TLS in transit not enforced.

**Actions**:
- Implement encryption at rest:
  - Enable database encryption (PostgreSQL: pgcrypto or transparent data encryption)
  - Encrypt sensitive fields (passwords, API keys, personal data)
  - Implement key management (AWS KMS, HashiCorp Vault, or encrypted environment variables)
  - Document encryption procedures
- Enforce encryption in transit:
  - Require HTTPS for all connections
  - Configure TLS 1.3 minimum
  - Use strong cipher suites
  - Implement HTTP Strict Transport Security (HSTS)
  - Configure certificate auto-renewal (Let's Encrypt)
- Encrypt backups:
  - Encrypt database backups
  - Store encryption keys separately from backups
  - Document backup decryption procedures

**Success Criteria**:
- All sensitive data encrypted at rest
- All connections use TLS 1.3
- SSL Labs scan shows A+ rating
- Backups encrypted

#### 4.2.2 Audit Logging
**Actions**:
- Design audit log schema:
  - User ID
  - Action performed
  - Resource affected
  - Timestamp
  - IP address
  - User agent
  - Result (success/failure)
- Implement audit logging:
  - Log authentication events (login, logout, failed attempts)
  - Log authorisation failures
  - Log data access (who viewed which portfolios)
  - Log data modifications (create, update, delete)
  - Log configuration changes
  - Log administrative actions
- Store audit logs securely:
  - Separate database or table
  - Write-only access for application
  - Read access restricted to admins
  - Implement log retention policy
- Create audit log viewer:
  - Admin UI to search and filter audit logs
  - Export audit logs for compliance
  - Alert on suspicious activity

**Success Criteria**:
- All security-relevant events logged
- Audit logs tamper-proof
- Audit logs searchable
- Compliance requirements met

#### 4.2.3 GDPR Compliance (if serving EU users)
**Actions**:
- Implement GDPR requirements:
  - Create privacy policy
  - Implement cookie consent banner
  - Allow users to view their data
  - Implement data export functionality
  - Implement right to be forgotten (data deletion)
  - Implement data portability
  - Document data processing activities
  - Appoint Data Protection Officer (if required)
- Update terms of service:
  - Clear data collection disclosure
  - Purpose limitation statements
  - Data retention policies
  - Third-party data sharing disclosure
- Implement data minimisation:
  - Collect only necessary data
  - Anonymise data where possible
  - Delete data when no longer needed
- Create GDPR compliance checklist and procedures

**Success Criteria**:
- Privacy policy published
- Users can export and delete their data
- Cookie consent implemented
- GDPR compliance documented

#### 4.2.4 Data Backup and Disaster Recovery
**Actions**:
- Implement automated backup procedures:
  - Daily database backups
  - Hourly incremental backups (if applicable)
  - Backup user uploads and generated reports
  - Store backups in geographically separate location
  - Encrypt backups
  - Test backup restoration regularly
- Document backup retention policy:
  - Daily backups retained for 7 days
  - Weekly backups retained for 4 weeks
  - Monthly backups retained for 12 months
- Create disaster recovery plan:
  - Document recovery time objective (RTO)
  - Document recovery point objective (RPO)
  - Document recovery procedures
  - Assign recovery team roles
  - Test disaster recovery annually
- Implement database replication:
  - Set up read replicas for scalability
  - Set up failover replicas for high availability
  - Configure automatic failover
  - Test failover procedures

**Success Criteria**:
- Automated backups running daily
- Backups tested and verified
- Disaster recovery plan documented
- RTO and RPO meet requirements

### 4.3 Operational Documentation

#### 4.3.1 Deployment Documentation
**Status**: ✅ COMPLETED — February 2026

**Completed Actions**:
- ✅ Created [docs/deployment-guide.md](deployment-guide.md) covering:
  - Prerequisites table (Node 20, Docker, Redis)
  - Environment variable reference with defaults and descriptions
  - Development / staging / production step-by-step deployment
  - Docker single-container and Compose multi-service deployment
  - Nginx reverse proxy configuration (TLS, headers, proxy_pass)
  - PM2 process manager setup and auto-restart
  - Post-deployment verification checklist (7 curl-based checks)
  - Rollback procedures (code, Docker, rollback criteria)
  - Common deployment issues troubleshooting table

**Success Criteria**:
- ✅ Deployment guide is complete and accurate
- ✅ Covers development, staging, and production environments
- ✅ Deployment checklist with 8 verification items
- ✅ Rollback procedures with criteria thresholds

#### 4.3.2 Operations Runbook
**Status**: ✅ COMPLETED — February 2026

**Completed Actions**:
- ✅ Created [docs/operations-runbook.md](operations-runbook.md) covering:
  - System architecture overview with ASCII diagram
  - Key endpoint reference table
  - Log file inventory (5 file types, rotation schedule)
  - Common operational tasks (health check, log viewing, cache flush, queue status)
  - Health monitoring: Prometheus queries for request rate, error rate, latency, cache hit rate, memory
  - Alert thresholds table (error rate, latency, memory, cache hit rate)
  - Troubleshooting guide: high CPU, high memory, slow responses, Redis errors, Yahoo Finance errors, app not starting
  - Incident response: P1–P4 severity matrix, 5-step response procedure, communication templates
  - Maintenance procedures: dependency updates, certificate renewal, Redis maintenance, secret rotation
  - Log management: viewing, shipping to ELK/Loki (Filebeat + Promtail config examples), archive cleanup
  - Scaling procedures: vertical, horizontal (PM2 cluster, Docker Compose scale), Redis setup, queue scaling

#### 4.3.3 Contributing Guide
**Status**: ✅ COMPLETED — February 2026

**Delivered**:
- `CONTRIBUTING.md` — prerequisites, local setup, project structure, test commands, commit conventions, PR process, bug/feature reporting
- `.github/ISSUE_TEMPLATE/bug_report.md` — structured bug report template
- `.github/ISSUE_TEMPLATE/feature_request.md` — feature request template with acceptance criteria
- `.github/PULL_REQUEST_TEMPLATE.md` — PR checklist (type-check, lint, tests, swagger, changelog)
- `scripts/setup-dev.sh` — automated dev environment bootstrap script

**Success Criteria**:
- New contributors can get started easily ✅
- Development workflows documented ✅
- Contribution standards enforced ✅

#### 4.3.4 Changelog and Versioning
**Status**: ✅ COMPLETED — February 2026

**Delivered**:
- `CHANGELOG.md` — Keep a Changelog format; all versions (0.0.1–0.0.6) documented with Added/Changed/Fixed/Security categories
- Semantic versioning adopted: current version `0.0.6` in `package.json`
- Conventional Commits enforced via Husky pre-commit hook; changelog updated manually per release
- Commit convention documented in `CONTRIBUTING.md`

**Success Criteria**:
- All releases documented in changelog ✅
- Versioning follows semver ✅
- Users can see what changed between versions ✅

---

### 4.4 Investment Simulator Tab

**Status**: ✅ COMPLETED — February 2026 (not yet committed — see note below)

**Objective**: Add a dedicated **"Simulator"** tab that allows the user to select up to 4
securities from the analysis results table and project future portfolio value based on their
historical return statistics, using a monthly DCA (Dollar Cost Averaging) model. The output
shows optimistic, expected, and pessimistic scenarios across multiple time horizons.

**Post-4.4 enhancement already layered on top**: per-ticker investment amounts — each
selected ticker now has its own monthly amount input (`tickerInvestments: Record<string,
number>` replacing the single `monthlyInvestment` field; response adds
`totalMonthlyInvestment`; per-ticker DCA scenarios summed for the portfolio projection;
breakdown shows gain/loss per ticker). See `src/security/validation-schemas.ts:82-96`.

---

#### 4.4.1 Ticker Selection in the Results Table
**Status**: ✅ COMPLETED — February 2026

**Context**: After clicking "Run analysis", the main page renders a results table.
This step adds a selection mechanism to that table without disrupting the existing layout.

**Actions**:
- Add a checkbox column as the first column of the results table (header: "Sim.").
- When a row is checked, add its ticker symbol to a `selectedForSimulator: string[]`
  state variable (maximum 4 items).
- Once 4 tickers are selected, disable all unchecked checkboxes and show a tooltip:
  *"Maximum 4 securities selected"*.
- Show a floating badge/counter at the bottom of the results panel:
  *"X / 4 securities selected for the Simulator → [Go to Simulator]"*.
- Persist the selection in `localStorage` (key: `simulatorSelection`) so it survives
  tab navigation.
- Clear the selection when a new analysis is run.

**Files**:
- `src/core/scanner.ts` — add state, checkbox rendering, and badge HTML
- `src/core/scanner.ts` — `initResultsTable()` / `renderRow()` functions

**Success Criteria**:
- User can select 1–4 tickers from the results table.
- Selecting a 5th ticker is blocked with a visible message.
- Selection persists when navigating to the Simulator tab and back.
- Deselecting a ticker removes it from the list immediately.

---

#### 4.4.2 New "Simulator" Tab in the Main Tab Bar
**Status**: ✅ COMPLETED — February 2026

**Actions**:
- Add a new tab button **"Simulator"** to the existing tab bar in `scanner.ts`
  (after the last existing tab).
- Create the corresponding tab panel container `#tab-simulator`.
- Tab is always visible but shows a hint message when no tickers are selected:
  *"Select up to 4 securities from the results table to get started."*
- When at least one ticker is selected, the tab renders the full simulator UI.

**Files**:
- `src/core/scanner.ts` — tab bar HTML, tab switching logic
- CSS (inline or external) — simulator layout styles

**Success Criteria**:
- "Simulator" tab appears in the tab bar.
- Clicking it while the results table has selections shows the simulator panel.
- Clicking it with no selections shows the empty-state hint.

---

#### 4.4.3 Backend Simulation API
**Status**: ✅ COMPLETED — February 2026

**Endpoint**: `POST /api/v1/simulate`
**Auth**: `requireAuth` (any authenticated user)

**Request body** (JSON):
```json
{
  "tickers": ["AAPL", "MSFT"],          // 1–4 tickers
  "monthlyInvestment": 500,              // EUR/USD, positive number
  "horizonMonths": 60                   // integer ≥ 1; presets: 12 | 36 | 60 | 120
}
```

**Response body** (JSON):
```json
{
  "tickers": ["AAPL", "MSFT"],
  "monthlyInvestment": 500,
  "horizonMonths": 60,
  "currency": "USD",
  "totalInvested": 30000,
  "scenarios": {
    "expected":    { "finalValue": 38500, "cagr": 0.089, "totalReturn": 0.283 },
    "optimistic":  { "finalValue": 52000, "cagr": 0.151, "totalReturn": 0.733 },
    "pessimistic": { "finalValue": 24000, "cagr": -0.04, "totalReturn": -0.200 }
  },
  "monthlyProjection": [
    { "month": 1,  "expected": 502,  "optimistic": 508,  "pessimistic": 496  },
    { "month": 2,  "expected": 1010, "optimistic": 1024, "pessimistic": 988  },
    ...
  ],
  "perTicker": [
    {
      "ticker": "AAPL",
      "weight": 0.5,
      "historicalMonthlyReturn": 0.0142,
      "historicalMonthlyVolatility": 0.0610,
      "dataYears": 5
    },
    ...
  ]
}
```

**Calculation logic** (`src/simulation/simulation-service.ts`):
1. For each ticker, fetch the last 5 years of monthly closing prices from Yahoo Finance
   (reusing the existing cache adapter for TTL-backed caching).
2. Compute monthly log-returns: `r_t = ln(P_t / P_{t-1})`.
3. Compute `μ` (mean monthly return) and `σ` (standard deviation of monthly returns).
4. If multiple tickers, compute the portfolio `μ_p` and `σ_p` assuming equal weight:
   `μ_p = Σ(w_i · μ_i)`, `σ_p = √(Σ Σ w_i · w_j · cov_ij)` (simplified to equal
   weights for v1; no cross-correlation for first iteration).
5. DCA projection over `horizonMonths`:
   - Each month: `portfolio_value = (portfolio_value + monthly_investment) × (1 + r_monthly)`
   - **Expected scenario**: `r_monthly = μ_p`
   - **Optimistic scenario**: `r_monthly = μ_p + σ_p`
   - **Pessimistic scenario**: `r_monthly = μ_p - σ_p`
6. Compute CAGR from final value: `CAGR = (FV / totalInvested)^(12/horizonMonths) - 1`.
7. Return both the per-month series and the summary metrics.

**Files**:
- `src/simulation/simulation-service.ts` — calculation logic
- `src/simulation/simulation-router.ts` — Express router, mounts at `/api/v1/simulate`
- `src/security/validation-schemas.ts` — Zod schema for the request body
- `src/config/swagger.ts` — OpenAPI spec for the new endpoint
- `server.js` — mount `simulationRouter`

**Success Criteria**:
- `POST /api/v1/simulate` returns 200 with correct JSON structure.
- Returns 400 if tickers array is empty or has > 4 items.
- Returns 400 if `monthlyInvestment ≤ 0` or `horizonMonths` is not a positive integer (min 1).
- Returns 401 if not authenticated.
- Historical data is cached (no redundant Yahoo Finance requests within TTL).
- Unit tests cover: return calculation, DCA loop, CAGR formula, edge cases (single ticker,
  ticker with < 12 months of data).

---

#### 4.4.4 Simulator UI Panel
**Status**: ✅ COMPLETED — February 2026

**Layout** (left–right split inside `#tab-simulator`):

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INVESTMENT SIMULATOR                                                    │
├──────────────────────────────┬──────────────────────────────────────────┤
│  SELECTED SECURITIES         │  PROJECTION                               │
│  ┌────────────────────────┐  │                                           │
│  │ ✕ AAPL  Apple Inc.     │  │  Total invested:   30,000 €              │
│  │ ✕ MSFT  Microsoft      │  │  Expected value:   38,500 €  (+28.3%)    │
│  │ ✕ GOOGL Alphabet       │  │  Optimistic:       52,000 €  (+73.3%)    │
│  └────────────────────────┘  │  Pessimistic:      24,000 €  (-20.0%)    │
│                              │                                           │
│  Monthly investment          │  ┌─────────────────────────────────────┐ │
│  [ 500   ] €/month           │  │  [Chart: lines per scenario]        │ │
│                              │  │                                     │ │
│  Time horizon                │  │                                     │ │
│  ○ 1 yr   ● 5 yrs            │  └─────────────────────────────────────┘ │
│  ○ 3 yrs  ○ 10 yrs           │                                           │
│  ○ Custom: [ 18 ] ○ months   │  Breakdown by security ▾                 │
│            [    ] ○ years    │  AAPL  μ=1.42%/mo  σ=6.10%/mo           │
│  [Calculate]                 │  MSFT  μ=1.18%/mo  σ=5.43%/mo           │
└──────────────────────────────┴──────────────────────────────────────────┘
```

**Actions**:
- Left panel:
  - List of selected tickers with a ✕ button to remove each one.
  - Numeric input for monthly investment amount (min 1, step 1, default 100).
  - Time horizon selector:
    - Radio buttons for presets: 1 year / 3 years / 5 years / 10 years.
    - A **"Custom"** radio option that reveals a numeric input field and a
      unit toggle (months / years); the entered value is converted to months
      before being sent to the API. Minimum 1 month, no upper cap enforced
      in the UI (server validates).
  - "Calculate" button; disabled when no tickers are selected or input is invalid.
- Right panel:
  - Summary metrics: total invested, expected final value, optimistic, pessimistic
    (all with absolute value and % return, colour-coded green/red).
  - Line chart (Chart.js) with:
    - X axis: months (labelled by year: "Year 1", "Year 2", …)
    - Y axis: portfolio value in currency
    - 3 lines: Expected (blue), Optimistic (green), Pessimistic (red)
    - Shaded band between pessimistic and optimistic
    - Horizontal dashed line: total invested (reference)
  - Collapsible "Breakdown by security" section showing per-ticker μ, σ, data coverage.
- Loading state: spinner while awaiting API response.
- Error state: inline error message if API fails (e.g., ticker not found).

**Files**:
- `src/core/scanner.ts` — `renderSimulatorTab()`, `onCalculate()`, chart initialisation
- CSS — simulator panel layout and chart container

**Success Criteria**:
- Pressing "Calculate" calls `POST /api/v1/simulate` and renders the results.
- Chart updates on every new calculation without page reload.
- Removing a ticker from the left panel re-runs the calculation automatically.
- Changing the time horizon (preset or custom) re-runs the calculation automatically.
- Selecting "Custom" reveals the numeric input and unit toggle; entering a valid value
  enables the "Calculate" button.
- Summary values match the API response data.

---

#### 4.4.5 Chart Integration
**Status**: ✅ COMPLETED — February 2026

**Actions**:
- Confirm whether Chart.js is already bundled in the project (check `package.json`
  and `vite.config.ts`). If not, add it as a dependency.
- Create a `SimulatorChart` class/module in `src/simulation/simulator-chart.ts`:
  - `init(canvasId)` — create or reuse a Chart.js instance.
  - `update(monthlyProjection, totalInvested, horizonMonths)` — update datasets and
    re-render without flicker (use `chart.update('none')` for instant update).
  - `destroy()` — cleanup on tab switch.
- Datasets:
  - `expected` — line, blue, `borderDash: []`
  - `optimistic` — line, green, `borderDash: [5,5]`
  - `pessimistic` — line, red, `borderDash: [5,5]`
  - `totalInvested` — line, grey dashed (constant reference)
  - Fill between pessimistic and optimistic using Chart.js `fill` plugin (semi-transparent).
- Tooltips: show all 3 values + total invested at the hovered month.
- Responsive: chart resizes with its container.

**Files**:
- `src/simulation/simulator-chart.ts`
- `vite.config.ts` — ensure Chart.js is in the correct chunk (add `chartjs` to the
  `manualChunks` domain list)

**Success Criteria**:
- Chart renders correctly on first calculation.
- Chart updates smoothly when inputs change.
- Chart is fully responsive on different screen sizes.
- Tooltip shows all 4 series values at the hovered point.

---

#### 4.4.6 Tests
**Status**: ✅ COMPLETED — February 2026

**Unit tests** (`src/tests/unit/simulation/`):
- `simulation-service.test.js`:
  - Monthly log-return calculation from a known price series.
  - DCA loop with known μ and σ produces expected final values.
  - CAGR formula correctness.
  - Edge case: single month of history → service returns an error.
  - Edge case: ticker with no price data → graceful error.
  - Portfolio μ/σ with two tickers (equal weights).

**Integration tests** (`src/tests/integration/simulation-endpoints.integration.test.js`):
- `POST /api/v1/simulate` — happy path (2 tickers, 500/month, 60 months).
- Returns 400 if `tickers` is empty.
- Returns 400 if `tickers` has 5 elements.
- Returns 400 if `monthlyInvestment` is 0 or negative.
- Returns 400 if `horizonMonths` is not a positive integer (e.g. 0, negative, or non-integer).
- Custom horizon: `horizonMonths: 18` (custom months) and `horizonMonths: 24`
  (custom years converted to months) both return 200.
- Returns 401 if `Authorization` header is missing.
- Returns 200 with `scenarios.expected.finalValue > totalInvested` when μ > 0.
- Caching: two identical requests within TTL window hit the cache (verify via
  `X-Cache: HIT` header on the second call).

**Success Criteria**:
- All unit tests pass with > 80% coverage of `simulation-service.ts`.
- All integration tests pass against the live Express app.
- `npm test` continues to pass with no regressions.

---

**Phase 4.4 Overall Success Criteria**: ✅ All met (verified 2026-07-02: `tsc --noEmit` clean,
1161 unit tests + 12 integration tests passing)
- ✅ User can select up to 4 tickers in the results table and see them in the Simulator tab.
- ✅ Entering per-ticker monthly amounts and clicking "Calcular" shows a projected chart and summary.
- ✅ Expected, optimistic, and pessimistic scenarios are rendered clearly.
- ✅ Results update in real time when the user changes the horizon or investment amounts.
- ✅ New endpoint documented in the OpenAPI spec (`src/config/swagger.ts`).
- ✅ Test suite remains green (1161 + 12 = 1173 tests touching this feature area).

**Remaining before this phase can be closed out**:
- Commit the working-tree changes (currently uncommitted on `main`).
- Bump `package.json` version and add a `CHANGELOG.md` entry.
- Update `MEMORY.md` project index once committed.

---

## 5. Continuous Improvement and Future Enhancements (Ongoing)

**Objective**: Establish processes for continuous improvement and identify future enhancements.

**Priority**: ONGOING

### 5.1 Technical Debt Management

#### 5.1.1 Technical Debt Tracking
**Actions**:
- Create technical debt register:
  - Identify existing technical debt
  - Categorise by severity and effort
  - Estimate remediation effort
  - Prioritise debt items
- Add technical debt to sprint planning:
  - Allocate percentage of each sprint to debt reduction (e.g., 20%)
  - Track debt reduction progress
  - Prevent new debt accumulation
- Document architectural improvements:
  - Create improvement proposals
  - Review and approve improvements
  - Implement incrementally

**Success Criteria**:
- Technical debt tracked and visible
- Debt reduced over time
- New debt prevented or justified

#### 5.1.2 Dependency Management
**Actions**:
- Implement dependency update strategy:
  - Use Dependabot or Renovate for automated updates
  - Configure auto-merge for patch updates
  - Review minor and major updates
  - Test updates before merging
- Monitor for security vulnerabilities:
  - Run npm audit regularly
  - Subscribe to security advisories
  - Patch vulnerabilities promptly
- Document dependency policies:
  - Approval required for new dependencies
  - Regular dependency audits
  - Deprecation of unused dependencies

**Success Criteria**:
- Dependencies kept up-to-date
- Security vulnerabilities patched quickly
- Dependency bloat prevented

### 5.2 Branch Protection and Git Workflow Maturity

#### 5.2.1 Branch Protection Rules
**Prerequisite**: Complete Phases 2, 3, and 4 (Team collaboration and code review processes established)

**Actions**:
- Configure main branch protection on GitHub:
  - Require PR reviews (minimum 1 approver)
  - Require status checks to pass before merging
  - Require branches to be up to date before merging
  - Prevent force pushes
  - Prevent deletions
- Create development branch for ongoing work
- Document branching strategy (Git Flow or GitHub Flow)

**Success Criteria**:
- Main branch protected from direct commits
- All changes go through PR review process
- CI must pass before merge possible

### 5.3 Performance Monitoring and Optimisation

#### 5.2.1 Ongoing Performance Monitoring
**Actions**:
- Establish performance baselines:
  - API response times
  - Page load times
  - Resource usage
  - Database query times
- Set up performance regression detection:
  - Run performance tests in CI
  - Alert on performance regressions
  - Block PRs that degrade performance
- Regular performance reviews:
  - Monthly performance review meetings
  - Identify and address bottlenecks
  - Track performance trends

**Success Criteria**:
- Performance metrics tracked continuously
- Performance regressions caught early
- Performance improves over time

#### 5.2.2 Cost Optimisation
**Actions**:
- Monitor infrastructure costs:
  - Track cloud service costs
  - Identify cost drivers
  - Set up budget alerts
- Optimise resource usage:
  - Right-size compute instances
  - Use reserved instances or savings plans
  - Implement auto-scaling
  - Clean up unused resources
- Optimise data storage:
  - Implement data retention policies
  - Archive old data
  - Use appropriate storage tiers

**Success Criteria**:
- Infrastructure costs tracked
- Costs optimised without impacting performance
- Budget stays within targets

### 5.4 Feature Development Pipeline

#### 5.4.1 Feature Flags and Gradual Rollout
**Actions**:
- Implement feature flag system (LaunchDarkly, Unleash, or custom):
  - Define feature flags
  - Implement flag evaluation
  - Create admin UI for flag management
- Use feature flags for:
  - New feature rollout
  - A/B testing
  - Canary releases
  - Kill switches for problematic features
- Implement gradual rollout strategy:
  - Release to internal users first
  - Release to beta users
  - Gradual percentage rollout
  - Monitor metrics during rollout

**Success Criteria**:
- Feature flags implemented
- New features rolled out gradually
- Features can be disabled quickly if issues arise

#### 5.4.2 User Feedback Collection
**Actions**:
- Implement feedback mechanisms:
  - In-app feedback widget
  - User surveys
  - Feature request voting
  - Bug reporting
- Collect analytics:
  - User behaviour analytics (with consent)
  - Feature usage metrics
  - Error tracking
- Regular user research:
  - User interviews
  - Usability testing
  - Beta testing programs
- Create feedback review process:
  - Triage feedback weekly
  - Prioritise feature requests
  - Respond to users

**Success Criteria**:
- User feedback collected systematically
- Analytics inform product decisions
- Users feel heard

### 5.5 Advanced Features (Future Roadmap)

#### 5.5.1 Multi-Tenancy Support
**Actions** (Future):
- Design multi-tenant architecture:
  - Tenant isolation strategy (separate databases or schemas)
  - Tenant identification (subdomain or path-based)
  - Tenant-specific configurations
- Implement tenant management:
  - Tenant provisioning
  - Tenant billing
  - Tenant usage limits
- Update data model for multi-tenancy:
  - Add tenant_id to all tables
  - Implement row-level security
  - Tenant-specific data isolation

**Future Deliverable**: Multi-tenant architecture

#### 5.5.2 Real-Time Collaboration
**Actions** (Future):
- Implement WebSocket infrastructure:
  - Install Socket.io or native WebSockets
  - Handle connection management
  - Implement authentication for WebSockets
- Add real-time features:
  - Live portfolio updates
  - Collaborative portfolio editing
  - Real-time alerts and notifications
  - Live chat for support
- Optimise for scale:
  - Use Redis adapter for multi-instance support
  - Implement connection pooling
  - Handle reconnection logic

**Future Deliverable**: Real-time collaboration features

#### 5.5.3 Mobile Application
**Status**: 🟡 RECOMMENDED NEXT DELIVERY TRACK — updated 2026-07-02

**Recommendation**: build a **PWA first** and treat it as the bridge between the current web app
and any future Android product. The app already has the right ingredients for this approach:
responsive layouts, browser-side persistence via IndexedDB, a single deployable frontend, and
existing performance/accessibility test coverage. A PWA lets the team validate mobile usage,
installation behaviour, and offline expectations before committing to a second codebase.

**Why PWA before native Android**:
- Lowest implementation cost and fastest feedback loop
- Reuses the current frontend and deployment model
- Supports installability, home-screen launch, and offline-first behaviour
- Reduces the risk of overbuilding before real mobile usage patterns are known

**When native Android should become the next step**:
- Push notifications must be first-class and highly reliable
- Biometric auth becomes a hard requirement
- Background tasks or deeper device integration are needed
- Play Store distribution becomes commercially important

**Dependency note**:
- A `local-first` PWA is **not blocked** by Phase 4.1 authentication
- A `synced/account-based` PWA **is blocked** by Phase 4.1 authentication and backend user storage

**Recommended delivery sequence**:

#### 5.5.3.1 PWA Foundation
**Status**: ✅ COMPLETED — 2026-07-02

**Completed Actions**:
- ✅ `manifest.webmanifest` (repo root, static — served in dev/test/prod alike) — name,
  short_name, standalone display, theme/background colours, 192/512/512-maskable icons
- ✅ `sw.js` (repo root, hand-rolled — no build step touches it, so dev/test/prod all get
  the same offline behaviour): precaches the app shell (`/`, `/index.html`, manifest,
  icons), network-first navigation with offline fallback to the cached shell,
  stale-while-revalidate for same-origin scripts/styles/fonts/images. Deliberately does
  **not** intercept `/universes/**` or Yahoo/health API calls — see cache invalidation
  note below
  - `icons/` — hand-authored SVG source + generated 192/512/512-maskable/favicon/apple-touch-icon
    PNGs (ImageMagick; flat colours only, its bundled SVG rasteriser doesn't support gradients)
- ✅ Last scan + simulator output persisted to two new IndexedDB stores
  (`scan_results`, `simulation_results` in `src/storage/indexed-db-store.ts`) right after
  each successful scan/simulation in `src/core/scanner.ts` — restored and rendered
  automatically on cold load while offline via `restoreLastScanFromCache()`
- ✅ `src/pwa/pwa-init.ts` (4th Vite entry point) — service worker registration,
  `beforeinstallprompt` capture wired to a visible "Install app" header button, offline
  banner with a locale-formatted "last saved" timestamp
- ✅ Cache invalidation/versioning: static shell assets are versioned via `CACHE_VERSION`
  in `sw.js` (old caches purged on `activate`); market data is **never** cached at the
  service-worker/network layer — it always hits the network, and offline review instead
  reads the fully-computed last scan/simulation from IndexedDB (more precise than
  replaying raw API responses, and keeps `/universes/**`/API calls mockable in E2E tests,
  since a service worker's own `fetch()` bypasses page-scoped test mocks)
- ✅ CSP: explicit `manifestSrc`/`workerSrc` directives added in `src/middleware/security.ts`
- ✅ Tests: 44 new unit tests (`indexed-db-store.test.js` extensions, `pwa-init.test.js`),
  3 new E2E specs (`src/tests/e2e/pwa.spec.js` — manifest validity, SW activation, full
  scan → go offline → reload → last scan still rendered). 1253 unit/integration tests and
  77 relevant E2E tests passing (2 pre-existing, unrelated a11y failures on `main` — not
  caused by this work, reproduced on a clean checkout before starting)

**Success Criteria**: ✅ All met
- ✅ App is installable on Android Chrome (valid manifest + active SW + HTTPS/localhost)
- ✅ App opens in standalone mode from the home screen (`display: "standalone"`)
- ✅ Last successful scan can be reviewed offline (verified end-to-end in `pwa.spec.js`)
- Lighthouse PWA-specific scoring deferred — Lighthouse 10+ dropped the dedicated "PWA"
  category from its default report; revisit if/when a PWA-specific Lighthouse config is
  wired up

**Deliberately out of scope for this pass** (tracked in 5.5.3.3): push notifications,
background sync, and the local-only vs account-synced product decision.

#### 5.5.3.2 Frontend Separation and Android UX Hardening
**Target**: immediately after PWA foundation

**Decision**:
- Do **not** collapse the current desktop UI into a compromised one-size-fits-all layout
- Keep a common backend and shared business/domain logic
- Split presentation into two frontend tracks:
  - Desktop/web analytical experience, preserving dense tables and comparison-heavy workflows
  - Android-focused frontend, optimised for touch, installation, narrow screens, and shorter task flows

**Implementation principle**:
- Duplicate the **UI layer where necessary**, not the product logic. Scanning, portfolio
  construction, simulator calculations, alerts, storage contracts, i18n data, validation, and
  API integrations should remain shared wherever practical.

**Architecture steps**:
1. Audit the current frontend and classify code into:
   - shared domain logic
   - shared state/storage/services
   - desktop-only presentation
   - mobile/Android presentation candidates
2. Extract reusable frontend services behind stable interfaces:
   - scan runner / result adapters
   - portfolio builder inputs and outputs
   - simulator request/response shaping
   - alerts settings persistence
   - offline cache restore/save flows
3. Define the target repository structure for dual frontends, for example:
   - `src/shared/` for adapters, types, formatting helpers, service wrappers, storage access
   - `src/desktop/` for the current web UI
   - `src/android/` for the Android-oriented frontend shell and views
4. Preserve the current desktop layout as a first-class product surface
5. Design Android-specific flows for:
   - run scan
   - review results
   - add/remove simulator selections
   - view portfolio summary and positions
   - review alerts and edit essential thresholds
6. Reduce Android flow complexity through cards, drill-down views, sticky action areas, and
   progressive disclosure instead of trying to keep all desktop tables visible at once
7. Decide the Android delivery wrapper:
   - installable PWA only, if sufficient
   - Android Studio project wrapping the mobile frontend if install/test/distribution needs justify it
8. Add platform-aware test coverage:
   - desktop regression tests to ensure no analytical UX loss
   - Android viewport/task-flow tests for touch interactions and narrow screens
   - offline/resume/installability checks for the Android track

**Execution phases**:
1. Frontend boundary definition
   - Extract shared modules from the current `index.html` + `src/core/scanner.ts` driven UI
   - Replace ad-hoc inline coupling with reusable classes/modules in the areas touched by the split
2. Desktop stabilisation
   - Keep the current desktop information density intact
   - Add regression coverage for results tables, portfolio dashboard, alerts, and simulator
3. Android frontend build-out
   - Create dedicated Android-first views for scanner, results, portfolio, alerts, and simulator
   - Optimise for 360-430px widths and touch-first navigation
4. Android packaging evaluation
   - Validate whether the mobile frontend is sufficient as a PWA
   - Only then decide whether Android Studio packaging should become a committed delivery track

**Success Criteria**:
- Desktop workflows remain as strong as today for analysis-heavy usage
- Android workflows are comfortable and visually coherent on 360-430px widths
- No duplication of core scanning/portfolio/simulator/alerts logic beyond unavoidable UI concerns
- Shared backend contracts remain the single source of truth
- The team can test/install the Android experience with a clear path, without forcing the desktop
  app into a mobile-first compromise

**Planning reference**:
- See [Frontend Separation Plan](frontend-separation-plan.md) for the concrete execution checklist

#### 5.5.3.3 Sync, Notifications, and Device Features
**Target**: after auth/data strategy decision

**Actions**:
- Decide between local-only data and server-synced user data
- Add authenticated sync for portfolios, alerts, and preferences if multi-device continuity is needed
- Evaluate web push notifications and background sync feasibility
- Introduce biometric/native packaging only if the PWA ceiling is reached

**Success Criteria**:
- Product has a clear answer for single-device vs multi-device use
- Notifications and sync behaviour match the selected product model

**Future Deliverable**: Installable Market Scanner PWA, with native Android deferred until justified

#### 5.5.4 Advanced ML Features
**Actions** (Future):
- Enhance existing ML capabilities:
  - Implement deep learning models (TensorFlow.js)
  - Add sentiment analysis from news
  - Implement automated trading signal generation
  - Add portfolio rebalancing automation
- Implement ML model versioning:
  - Track model versions
  - A/B test models
  - Roll back to previous models
- Add model explainability:
  - SHAP values for feature importance
  - Model decision explanations
  - Confidence intervals

**Future Deliverable**: Advanced ML features

#### 5.5.5 Third-Party Integrations
**Actions** (Future):
- Integrate with trading platforms:
  - Interactive Brokers API
  - Alpaca API
  - Other brokerage APIs
- Integrate with data providers:
  - Premium financial data feeds
  - Alternative data sources
  - News and sentiment data
- Implement data export:
  - Export to portfolio management systems
  - Export to risk management systems
  - API for third-party integration

**Future Deliverable**: Third-party integrations

---

## 6. Success Metrics and KPIs

### 6.1 Technical Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Test Coverage | 1231 unit+integration tests passing (2026-07-02), but the `vitest --coverage` global gate (80/60/85/80) is **currently failing** (~78.6/66.4/84.1/78.9%) — pre-existing on `main`, not caused by recent auth/simulator work; driven by `swagger.ts` (0%) and `scanner.ts` (~20%) | 80%+ | 🔴 Gate broken — needs a dedicated pass |
| Performance Benchmarks | 49 benchmarks across 7 modules + 3 load tests | Tracked in CI | ✅ End of Phase 2.1.5 |
| Security Vulnerabilities | Unknown | 0 Critical, 0 High | End of Phase 1 |
| API Response Time (p97.5) | 7ms (health), rate limiting validated | < 500ms | ✅ Measured in Phase 2.1.5 |
| Uptime | Not monitored | 99.9% | End of Phase 3 |
| Deployment Frequency | Manual, infrequent | Daily (automated) | End of Phase 1 |
| Mean Time to Recovery (MTTR) | Not measured | < 1 hour | End of Phase 4 |
| Lighthouse Score | Configured in CI (target >= 90) | > 90 | ✅ Configured in Phase 2.1.5 |
| Bundle Size | Not optimised | < 500KB (gzipped) | End of Phase 3 |

### 6.2 Quality Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| ESLint Errors | Not measured | 0 | End of Phase 1 |
| TypeScript Errors | N/A (no TypeScript) | 0 | End of Phase 2 |
| Code Review Coverage | Not enforced | 100% | End of Phase 1 |
| Documentation Coverage | Partial | 100% (public APIs) | End of Phase 2 |
| Accessibility Compliance | WCAG 2.1 AA (documented) | WCAG 2.1 AA (verified) | End of Phase 3 |

### 6.3 Operational Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Error Rate | Not measured | < 0.1% | End of Phase 3 |
| Monitoring Coverage | Basic | Comprehensive | End of Phase 3 |
| Backup Success Rate | Not implemented | 100% | End of Phase 4 |
| Security Audit Pass Rate | Not audited | 100% | End of Phase 4 |
| Disaster Recovery Test Success | Not tested | 100% | End of Phase 4 |

---

## 7. Resource Requirements and Recommendations

**Required subscriptions/services**:
- GitHub (for version control and CI/CD)
- Cloud hosting (AWS, GCP, or Azure)
- Sentry or similar (error tracking)
- Monitoring service (Datadog, New Relic, or Prometheus/Grafana self-hosted)
- Email service (SendGrid, Mailgun, or AWS SES)
- Domain and SSL certificates (Let's Encrypt for free)

---

## 8. Prioritisation Matrix

### Immediate
The roadmap should now optimise for **shipping a coherent product milestone**, not for adding more
capabilities in parallel. The next decision is architectural as much as functional:

1. ✅ Decided: `local-first PWA` for this milestone (portfolios/alerts/simulator/scan state
   stay on-device via IndexedDB; account-based sync remains a future option, see 5.5.3.3)
2. ✅ PWA foundation work completed 2026-07-02 (§5.5.3.1)
3. Authentication remains scoped to the account-based branch only, not the installable shell itself

### Priority 1 — Next 2 to 4 weeks
1. ✅ PWA foundation (`manifest`, icons, service worker, install flow, offline shell) —
   completed 2026-07-02, see §5.5.3.1
2. Frontend separation and Android UX hardening while preserving desktop quality (§5.5.3.2 — next up)
3. Product decision on persistence model:
   local-only IndexedDB vs authenticated server-synced user data

### Priority 2 — Next platform milestone
4. ✅🟡 Authentication and Authorisation (4.1) — backend rebuilt and verified 2026-07-02
   (JWT + SQLite, 7 endpoints, RBAC middleware, protected `/simulate` + `/jobs/*` +
   `/metrics`; `/yahoo` was briefly protected too but reverted the same day since the
   frontend has no login flow, so it's public again), simulator tests rewritten to mint
   real JWTs); **no frontend UI** and no per-user data model yet — see §4.1 for the
   precise remaining gap list.
5. ✅ Define backend persistence strategy for user portfolios, alerts, and preferences
   in [Backend Persistence Strategy](backend-persistence-strategy.md) — SQLite-backed
   authenticated source of truth with IndexedDB retained as the PWA cache/offline layer.
6. Close remaining production-readiness gaps that matter for real users, not just internal demos

### Priority 3 — After the first mobile release proves demand
7. Push notifications and background sync
8. Advanced mobile ergonomics and tablet-specific layouts
9. Native Android packaging or React Native evaluation only if the Android-focused frontend/PWA ceiling is reached

### Foundations Already Strong
10. Security hardening (1.1) ✅
11. CI/CD pipeline (1.2) ✅
12. Error handling and logging (1.3) ✅
13. Code quality tooling (1.4) ✅
14. Environment configuration (1.5) ✅
15. Testing stack: unit, integration, E2E, performance (2.1) ✅
16. Type safety, API docs, and technical documentation (2.2-2.4) ✅
17. Performance, containerisation, and observability foundations (3.x) ✅ / mostly complete

---


### Long-Term Vision

**Global Quant Scanner Pro** can evolve from a feature-rich prototype into an enterprise-grade financial technology platform suitable for professional deployment, regulatory compliance, and commercial use.

The platform's excellent functional foundation combined with robust infrastructure, comprehensive testing, and professional operations practices will position it as a competitive, reliable, and scalable solution in the quantitative finance technology landscape.

---

## Appendices

### Appendix A: References
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- 12-Factor App: https://12factor.net/
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Semantic Versioning: https://semver.org/

### Appendix B: Glossary
- **CI/CD**: Continuous Integration/Continuous Deployment
- **E2E**: End-to-End testing
- **GDPR**: General Data Protection Regulation
- **JWT**: JSON Web Token
- **RBAC**: Role-Based Access Control
- **RTO**: Recovery Time Objective
- **RPO**: Recovery Point Objective
- **SLA**: Service Level Agreement
- **TTI**: Time to Interactive
- **FCP**: First Contentful Paint
- **VaR**: Value at Risk
- **CVaR**: Conditional Value at Risk

### Appendix C: Related Documents
- [Technical Architecture](arquitectura-tecnica.md)
- [Machine Learning Documentation](machine-learning.md)
- [User Guide for Beginners](guia-principiantes.md)
- [Disclaimer](disclaimer.md)
