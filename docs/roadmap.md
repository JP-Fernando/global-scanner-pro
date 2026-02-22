# Professional Roadmap: Global Quant Scanner Pro

## Roadmap Structure

This document presents a phased approach organised into four major phases, followed by ongoing continuous improvement initiatives.

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
**Actions**:
- Set up log aggregation (options: ELK stack, Loki, or cloud-based like CloudWatch):
  - Configure log shipping (Fluentd, Logstash, or vector)
  - Create log parsing rules
  - Set up log retention policies
  - Configure log search and filtering
- Create log-based alerts:
  - Error rate spikes
  - Critical errors
  - Security events
- Create log analysis dashboards
- Document log querying procedures

**Success Criteria**:
- All logs aggregated in central location
- Logs searchable and filterable
- Log-based alerts working
- Log retention policies enforced

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
**Actions**:
- Make application stateless:
  - Move session data to Redis (when authentication added)
  - Ensure no local file storage for user data
  - Use shared cache (Redis) instead of in-memory cache
- Implement load balancing:
  - Configure nginx or cloud load balancer
  - Set up session affinity if needed
  - Configure health check endpoints
  - Test failover scenarios
- Document scaling procedures:
  - How to add application instances
  - How to configure load balancer
  - How to monitor distributed instances

**Success Criteria**:
- Application runs correctly with multiple instances
- Load balancer distributes traffic evenly
- No session loss when scaling

#### 3.4.2 Async Processing with Queue
**Actions**:
- Install message queue (BullMQ with Redis, or AWS SQS):
  - Configure queue connection
  - Create queue for async tasks
  - Implement job processors
- Move long-running tasks to queue:
  - Portfolio optimisation
  - ML model training
  - Report generation
  - Alert processing
- Implement job monitoring:
  - Queue length metrics
  - Job processing time
  - Failed job tracking
  - Job retry logic
- Create admin UI for queue management (Bull Board)

**Success Criteria**:
- Heavy operations processed asynchronously
- Queue metrics monitored
- Failed jobs retried automatically
- API response times improved

---

## 4. Phase 4: Production Readiness and Compliance

**Objective**: Ensure the application meets production standards including compliance, authentication, and operational readiness.

**Priority**: MEDIUM to LOW (depending on deployment timeline)

### 4.1 Authentication and Authorisation

#### 4.1.1 Authentication System Design
**Current Gap**: No user authentication system exists; application is single-user.

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
**Actions**:
- Create user database schema:
  - Users table (id, email, password_hash, created_at, updated_at)
  - Sessions table (if using session-based auth)
  - User preferences table
  - User roles table
- Implement authentication endpoints:
  - POST `/api/v1/auth/register` (user registration)
  - POST `/api/v1/auth/login` (user login)
  - POST `/api/v1/auth/logout` (user logout)
  - POST `/api/v1/auth/refresh` (token refresh)
  - POST `/api/v1/auth/forgot-password` (password reset request)
  - POST `/api/v1/auth/reset-password` (password reset confirmation)
- Implement password security:
  - Use bcrypt or Argon2 for password hashing
  - Implement password strength requirements
  - Implement rate limiting on login attempts
  - Implement account lockout after failed attempts
- Implement email verification:
  - Send verification email on registration
  - Create email verification endpoint
  - Prevent login until email verified
- Create authentication middleware:
  - Verify JWT tokens or sessions
  - Attach user object to request
  - Handle expired tokens
- Update frontend for authentication:
  - Login page
  - Registration page
  - Password reset flow
  - Token storage and refresh
  - Redirect to login when unauthorised

**Success Criteria**:
- Users can register and log in
- Passwords stored securely (hashed)
- Email verification works
- Authentication required for protected endpoints

#### 4.1.3 Role-Based Access Control (RBAC)
**Actions**:
- Define user roles:
  - Admin (full access)
  - Analyst (read/write access to scans and portfolios)
  - Viewer (read-only access)
  - Custom roles (optional)
- Implement permission system:
  - Define permissions (create_scan, edit_portfolio, configure_alerts, etc.)
  - Assign permissions to roles
  - Create authorization middleware
  - Protect endpoints with permission checks
- Implement data isolation:
  - Users see only their own scans and portfolios
  - Admins can see all data
  - Implement row-level security in database
- Update UI to show/hide features based on permissions

**Success Criteria**:
- Different user roles have appropriate access
- Unauthorised actions blocked
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
**Actions**:
- Create deployment guide:
  - Prerequisites and requirements
  - Environment setup instructions
  - Configuration instructions
  - Deployment steps
  - Post-deployment verification
  - Rollback procedures
- Document deployment environments:
  - Development environment setup
  - Staging environment setup
  - Production environment setup
  - Environment-specific configurations
- Create deployment checklist:
  - Pre-deployment checks
  - Deployment steps
  - Post-deployment checks
  - Rollback criteria
- Document common deployment issues and solutions

**Success Criteria**:
- Deployment guide is complete and accurate
- New team members can deploy using guide
- Deployment checklist followed for all deployments

#### 4.3.2 Operations Runbook
**Actions**:
- Create operations runbook:
  - System architecture overview
  - Common operational tasks:
    - How to scale the application
    - How to restart services
    - How to check system health
    - How to view logs
    - How to access databases
  - Troubleshooting procedures:
    - High CPU usage
    - High memory usage
    - Slow response times
    - Database connection issues
    - External API failures
  - Incident response procedures:
    - Incident severity levels
    - Escalation procedures
    - Communication templates
    - Post-incident review process
  - Maintenance procedures:
    - Database maintenance
    - Log rotation
    - Certificate renewal
    - Dependency updates

**Success Criteria**:
- Runbook covers common operational scenarios
- On-call engineers can resolve issues using runbook
- Runbook kept up-to-date

#### 4.3.3 Contributing Guide
**Actions**:
- Create `CONTRIBUTING.md`:
  - How to set up development environment
  - Code style guidelines
  - How to run tests
  - How to submit pull requests
  - PR review process
  - How to report bugs
  - How to request features
- Document development workflows:
  - Git branching strategy
  - Commit message conventions
  - PR naming conventions
  - Code review guidelines
- Create issue templates:
  - Bug report template
  - Feature request template
  - Pull request template
- Create development environment setup script

**Success Criteria**:
- New contributors can get started easily
- Development workflows documented
- Contribution standards enforced

#### 4.3.4 Changelog and Versioning
**Actions**:
- Create `CHANGELOG.md`:
  - Follow Keep a Changelog format
  - Document all notable changes
  - Organise by version
  - Categorise changes (Added, Changed, Deprecated, Removed, Fixed, Security)
- Implement semantic versioning:
  - MAJOR.MINOR.PATCH
  - Document versioning policy
  - Tag releases in Git
  - Update version in package.json
- Automate changelog generation (optional):
  - Use conventional commits
  - Generate changelog from commit messages
  - Update changelog on release

**Success Criteria**:
- All releases documented in changelog
- Versioning follows semver
- Users can see what changed between versions

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
**Actions** (Future):
- Evaluate mobile strategy:
  - Option A: Progressive Web App (PWA)
  - Option B: React Native
  - Option C: Native apps (iOS and Android)
- Develop mobile-optimised UI:
  - Responsive design
  - Touch-friendly interface
  - Offline support
  - Push notifications
- Implement mobile-specific features:
  - Biometric authentication
  - Camera for document upload
  - Location services (if applicable)

**Future Deliverable**: Mobile application

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
| Test Coverage | 81.5% stmts / 81.8% lines (1214 tests: 1025 unit + 113 integration + 76 E2E) | 80%+ | ✅ End of Phase 2.1.4 |
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

### Critical - High Impact, High Urgency
1. Security hardening (1.1)
2. CI/CD pipeline (1.2)
3. Error handling and logging (1.3)
4. Environment configuration (1.5)

### High Priority - High Impact, Medium Urgency
5. Test framework migration (2.1.1)
6. Test coverage expansion (2.1.2)
7. Type safety implementation (2.2)
8. API documentation (2.3)
9. Performance optimisation (3.1)
10. Containerisation (3.2)

### Medium Priority - Medium Impact, Variable Urgency
11. Integration tests (2.1.3 ✅) and E2E tests (2.1.4)
12. Code quality tooling (1.4)
13. Monitoring and observability (3.3)
14. Database optimisation (3.1.3)
15. Scalability improvements (3.4)

### Lower Priority - Important but Less Urgent
16. Authentication and authorisation (4.1)
17. Compliance and data protection (4.2)
18. Operational documentation (4.3)
19. Advanced features (5.4)

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
