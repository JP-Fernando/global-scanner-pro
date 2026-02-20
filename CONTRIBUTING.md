# Contributing to Global Quant Scanner Pro

Thank you for your interest in contributing. This document covers everything you need to get started — from environment setup to submitting pull requests.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Project Structure](#project-structure)
4. [Running the Application](#running-the-application)
5. [Testing](#testing)
6. [Type Checking and Linting](#type-checking-and-linting)
7. [Commit Conventions](#commit-conventions)
8. [Pull Request Process](#pull-request-process)
9. [Reporting Bugs](#reporting-bugs)
10. [Requesting Features](#requesting-features)

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Node.js | 20.x LTS | Required |
| npm | 10.x | Bundled with Node 20 |
| Git | 2.40+ | Required |
| Docker | 24.x | Optional (for containerised workflow) |

---

## Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/JP-Fernando/global-scanner-pro.git
cd global-scanner-pro

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and fill in required values (PORT, NODE_ENV, etc.)

# 4. Start the development server
node server.js
```

The application will be available at:
- **App**: `http://localhost:3000`
- **API Docs**: `http://localhost:3000/api-docs`
- **Health**: `http://localhost:3000/api/v1/health`

---

## Project Structure

```
global-scanner-pro/
├── server.js                    # Express server entry point
├── src/
│   ├── alerts/                  # Alert configuration and delivery
│   ├── allocation/              # Capital allocation strategies
│   ├── analytics/               # Risk, governance, market regime
│   ├── config/                  # App config, environment, Swagger spec
│   ├── core/                    # Scanner UI logic (scanner.ts)
│   ├── dashboard/               # Portfolio dashboard
│   ├── i18n/                    # Internationalisation (ES/EN)
│   ├── indicators/              # Technical indicators + scoring
│   ├── middleware/              # Express middleware (validation, errors, security)
│   ├── ml/                      # Machine learning engine
│   ├── portfolio/               # Portfolio manager + performance tracker
│   ├── reports/                 # Excel / PDF report generators
│   ├── security/                # Validation schemas (Zod)
│   ├── storage/                 # IndexedDB store
│   ├── tests/                   # All test suites
│   │   ├── unit/                # Vitest unit tests (.test.js)
│   │   ├── integration/         # Vitest integration tests (.integration.test.js)
│   │   ├── e2e/                 # Playwright E2E specs (.spec.js)
│   │   └── performance/         # Vitest benchmarks + load tests
│   ├── types/                   # Shared TypeScript type definitions
│   ├── ui/                      # Shared UI utilities
│   └── utils/                   # Logger, Sentry, helpers
├── docs/                        # Documentation
├── universes/                   # Market universe JSON files
├── Dockerfile                   # Multi-stage production image
├── docker-compose.yml           # Local development with Docker
├── tsconfig.json                # TypeScript strict mode config
├── vitest.config.js             # Vitest unit/integration config
├── playwright.config.js         # Playwright E2E config
└── eslint.config.js             # ESLint flat config
```

**Source files** are `.ts`; **test files** remain `.js` (Vitest handles both natively).

---

## Running the Application

```bash
# Development server (auto-restart on changes requires nodemon or tsx watch)
node server.js

# With tsx watch (TypeScript-aware)
npx tsx watch server.js
```

---

## Testing

The project uses **Vitest** for unit/integration tests and **Playwright** for E2E tests.

### Unit and Integration Tests

```bash
# Run all tests (unit + integration)
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Interactive UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

Coverage thresholds (enforced in CI):

| Metric | Threshold |
|--------|-----------|
| Statements | 80% |
| Branches | 60% |
| Functions | 85% |
| Lines | 80% |

### End-to-End Tests

```bash
# Run all E2E tests (requires server to be running)
npm run test:e2e

# Headed mode (visible browser)
npm run test:e2e:headed

# Chromium only
npm run test:e2e:chromium

# View HTML report
npm run test:e2e:report
```

### Performance Benchmarks

```bash
# Run computational benchmarks
npm run test:bench

# Run load tests (requires server on port 3000)
npm run test:load

# Full performance audit (bench + load + Lighthouse)
npm run test:perf:all
```

---

## Type Checking and Linting

```bash
# TypeScript strict type checking (zero errors required)
npx tsc --noEmit

# ESLint (zero errors required)
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Format with Prettier
npm run format
```

A **pre-commit hook** (Husky) automatically runs lint + format on staged files. To bypass in emergencies: `git commit --no-verify` (not recommended for shared branches).

---

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `test` | Adding or updating tests |
| `refactor` | Code change that is neither a feature nor a fix |
| `perf` | Performance improvement |
| `chore` | Build, tooling, dependency updates |
| `ci` | CI/CD pipeline changes |

**Examples:**

```bash
git commit -m "feat(ml): add regime-prediction confidence intervals"
git commit -m "fix(api): handle Yahoo Finance timeout correctly"
git commit -m "test(allocation): add ERC edge case for single-asset portfolio"
git commit -m "docs: update arquitectura-tecnica.md with ML modules"
```

---

## Pull Request Process

1. **Branch naming**: `feat/<description>`, `fix/<description>`, `docs/<description>`

   ```bash
   git checkout -b feat/add-real-time-alerts
   ```

2. **Keep PRs focused**: one feature or fix per PR; split large changes into logical parts.

3. **Before opening a PR**, ensure all of the following pass locally:

   ```bash
   npx tsc --noEmit   # zero type errors
   npm run lint        # zero lint errors
   npm test            # all 1138+ tests pass
   ```

4. **PR description** should include:
   - What changed and why
   - How to test the change
   - Screenshots (for UI changes)
   - Link to relevant issue or roadmap item

5. **CI checks** (GitHub Actions) must all pass before merge:
   - TypeScript compilation
   - ESLint
   - Unit + Integration tests (with coverage thresholds)
   - E2E tests (Chromium)
   - Performance benchmarks

6. At least **one review approval** is required before merging.

---

## Reporting Bugs

Please open a [GitHub Issue](https://github.com/JP-Fernando/global-scanner-pro/issues/new) with:

- **Title**: concise description (e.g., "Yahoo Finance proxy returns 502 for ETF tickers")
- **Steps to reproduce** (numbered list)
- **Expected behaviour**
- **Actual behaviour** (include error messages/screenshots)
- **Environment**: OS, Node.js version, browser

---

## Requesting Features

Open a [GitHub Issue](https://github.com/JP-Fernando/global-scanner-pro/issues/new) with the label `enhancement`:

- What problem does this solve?
- Who benefits from it?
- Proposed solution (if you have one)

For significant architectural changes, consider opening a discussion first.

---

## Code of Conduct

Be respectful. Focus on the technical merits of the discussion. We follow the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct.
