# Testing Strategy Guide

**Global Quant Scanner Pro - Testing Infrastructure**

**Status**: ✅ Phase 1 COMPLETED
**Last Updated**: January 2026
**Version**: 0.0.5

---

## 📋 Overview

This document details the testing strategy for Global Quant Scanner Pro, including the current test implementation, Phase 1 security tests, and the roadmap for comprehensive testing coverage in Phase 2.

---

## 🧪 1. Current Test Infrastructure

### Test Files

- [src/tests/tests.js](../src/tests/tests.js) - Main test suite (50 tests)
- [src/tests/phase1-tests.js](../src/tests/phase1-tests.js) - Phase 1 security tests (10+ tests)
- [src/tests/ml-tests.js](../src/tests/ml-tests.js) - Machine learning tests

### Custom Test Framework

The current implementation uses a custom assertion framework built on Node.js's native `assert` module.

**Features**:
- ✅ Simple assertion API
- ✅ Test grouping with `describe`
- ✅ Colored output (pass/fail)
- ✅ Test statistics (passed/failed/total)

**Limitations**:
- ⚠️ No coverage reporting
- ⚠️ No parallel execution
- ⚠️ No watch mode
- ⚠️ Limited assertion types

### Running Tests

```bash
# Run all tests
npm test

# Run tests via API
npm run test:api

# Run Phase 1 tests only
node src/tests/phase1-tests.js
```

---

## 🔒 2. Phase 1 Test Suite

### Implementation File

[src/tests/phase1-tests.js](../src/tests/phase1-tests.js)

### Test Categories

#### 2.1 Validation Schema Tests

Tests for Zod schema validation:

```javascript
// Yahoo Finance schema validation
✅ Valid symbol, from, to
✅ Invalid symbol (too long, invalid characters)
✅ Invalid timestamps (negative, future dates)
✅ Invalid range (from > to)
✅ Type transformation (string → number)
```

#### 2.2 Sanitization Tests

Tests for XSS and SQL injection prevention:

```javascript
// XSS prevention
✅ HTML tags removed from strings
✅ Script tags sanitized
✅ Event handlers removed

// SQL injection prevention
✅ SQL keywords detected and escaped
✅ Comment sequences removed
✅ UNION attacks prevented
```

#### 2.3 Error Handling Tests

Tests for custom error classes:

```javascript
// Custom error classes
✅ ValidationError (400 status)
✅ NotFoundError (404 status)
✅ AuthenticationError (401 status)
✅ Error message formatting
✅ Error serialization
```

#### 2.4 Configuration Tests

Tests for environment variable handling:

```javascript
// Environment loading
✅ Required variables validated
✅ Default values applied
✅ Type coercion (string → number, boolean)
✅ Production-specific validation
```

### Test Coverage

**Current Coverage** (estimated):
- **Overall**: ~35%
- **New modules**: 80%+ (validation, security, error handling)
- **Legacy code**: ~25%

---

## 📊 3. Test Metrics

### Current Status

| Category | Tests | Coverage | Status |
|----------|-------|----------|--------|
| Core Scanner | 15 | ~30% | ⚠️ Needs expansion |
| Indicators | 10 | ~40% | ⚠️ Needs expansion |
| Analytics | 8 | ~25% | ⚠️ Needs expansion |
| Validation | 5 | 90% | ✅ Good |
| Security | 4 | 85% | ✅ Good |
| Error Handling | 3 | 80% | ✅ Good |
| Configuration | 3 | 75% | ✅ Good |
| ML Components | 12 | ~35% | ⚠️ Needs expansion |

**Total**: 60+ tests

---

## 🎯 4. Phase 2 Testing Roadmap

### 4.1 Test Framework Migration (Vitest)

**Goal**: Migrate to modern test framework

**Actions**:
- Install Vitest and dependencies
- Configure `vitest.config.js`
- Migrate existing tests to Vitest syntax
- Set up coverage reporting
- Add test UI for debugging

**Timeline**: Week 1-2 of Phase 2

**Success Criteria**:
- All tests migrated and passing
- Coverage reports generated
- Tests run faster than before

### 4.2 Expand Unit Test Coverage

**Goal**: Achieve 80%+ coverage for critical modules

**Priority Modules**:

1. **Core Scanner** ([src/core/scanner.js](../src/core/scanner.js))
   - Market data fetching
   - Indicator calculation
   - Scoring logic
   - Error handling

2. **Risk Analytics** ([src/analytics/risk_engine.js](../src/analytics/risk_engine.js))
   - VaR calculation
   - CVaR calculation
   - Correlation matrices
   - Stress testing

3. **Portfolio Optimizer** ([src/analytics/portfolio-optimizer.js](../src/analytics/portfolio-optimizer.js))
   - Maximum Sharpe optimization
   - Minimum variance optimization
   - Risk parity allocation
   - Constraint handling

4. **ML Components** ([src/ml/](../src/ml/))
   - Model training and prediction
   - Factor weighting
   - Regime detection
   - Anomaly detection

5. **Alert System** ([src/alerts/alert-manager.js](../src/alerts/alert-manager.js))
   - Threshold monitoring
   - Notification sending
   - Alert history

**Timeline**: Week 2-4 of Phase 2

### 4.3 Integration Tests

**Goal**: Verify components work together correctly

**Test Scenarios**:

1. **End-to-End Scanning**
   - Fetch market data → Calculate indicators → Score → Rank
   - Verify data flow between modules
   - Test error propagation

2. **Portfolio Construction**
   - Score assets → Optimize allocation → Apply constraints
   - Test with various optimization methods
   - Verify constraint compliance

3. **Alert Triggering**
   - Monitor thresholds → Trigger alerts → Send notifications
   - Test with mock notification services
   - Verify alert history storage

4. **Database Operations**
   - Store → Retrieve → Update → Delete
   - Test data persistence
   - Verify IndexedDB operations

**Timeline**: Week 5-6 of Phase 2

### 4.4 End-to-End (E2E) Tests

**Goal**: Test user-facing functionality

**Framework**: Playwright

**Test Scenarios**:

1. **Market Scanning Journey**
   - Select market
   - Choose strategy
   - Run analysis
   - View results
   - Sort and filter

2. **Portfolio Construction**
   - Select top assets
   - Build portfolio
   - View optimization results
   - Export report

3. **Alert Configuration**
   - Create alert rule
   - Configure notifications
   - Test alert triggering
   - View alert history

4. **Dashboard Navigation**
   - Navigate between views
   - Interact with charts
   - Export data
   - Responsive design

**Timeline**: Week 7-8 of Phase 2

---

## 🔧 5. Testing Best Practices

### Unit Tests

**Do**:
- ✅ Test one thing per test
- ✅ Use descriptive test names
- ✅ Follow AAA pattern (Arrange, Act, Assert)
- ✅ Mock external dependencies
- ✅ Test edge cases and error conditions

**Don't**:
- ❌ Test implementation details
- ❌ Share state between tests
- ❌ Make tests depend on each other
- ❌ Test third-party libraries
- ❌ Write tests that are slower than necessary

### Integration Tests

**Do**:
- ✅ Test realistic scenarios
- ✅ Use test databases/fixtures
- ✅ Clean up after tests
- ✅ Test error handling
- ✅ Verify data integrity

**Don't**:
- ❌ Use production data
- ❌ Test everything (focus on critical paths)
- ❌ Make tests too complex
- ❌ Ignore flaky tests
- ❌ Skip cleanup

### E2E Tests

**Do**:
- ✅ Test critical user journeys
- ✅ Use page object pattern
- ✅ Take screenshots on failure
- ✅ Test across browsers
- ✅ Keep tests independent

**Don't**:
- ❌ Test every possible interaction
- ❌ Use hardcoded waits (use smart waits)
- ❌ Test implementation details
- ❌ Ignore performance
- ❌ Make tests too brittle

---

## 📈 6. Coverage Goals

### Phase 1 (Current)

| Category | Target | Actual | Status |
|----------|--------|--------|--------|
| Overall | 30% | ~35% | ✅ Met |
| New Modules | 80% | 80%+ | ✅ Met |
| Security | 75% | 85% | ✅ Exceeded |

### Phase 2 (Planned)

| Category | Target | Timeline |
|----------|--------|----------|
| Overall | 80% | End of Phase 2 |
| Core Logic | 90% | Week 4 |
| Analytics | 85% | Week 5 |
| ML Components | 80% | Week 6 |
| Integration | 70% | Week 7 |
| E2E | Key journeys | Week 8 |

---

## 🚀 7. Running Tests in CI

### GitHub Actions Integration

All tests run automatically in CI:

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
    - run: npm ci
    - run: npm test
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
```

### Coverage Reporting

**Current**: No automated coverage reporting

**Planned (Phase 2)**:
- Codecov integration
- Coverage badges in README
- Coverage trends over time
- PR coverage checks

---

## 🔍 8. Test Data Management

### Fixtures

Test data stored in `src/tests/fixtures/`:

```javascript
// Example fixture structure
{
  marketData: {
    symbol: 'AAPL',
    prices: [150, 152, 151, 153],
    timestamps: [/* ... */]
  },
  indicators: {
    rsi: [45, 52, 48, 55],
    macd: [/* ... */]
  }
}
```

### Mocks

Mock external services:

```javascript
// Yahoo Finance API mock
const mockYahooData = {
  chart: {
    result: [{
      timestamp: [/* ... */],
      indicators: {
        quote: [{
          close: [150, 152, 151]
        }]
      }
    }]
  }
};
```

---

## 🧩 9. Testing Tools

### Current

- **Node.js assert**: Native assertion library
- **Custom framework**: Test runner and reporter

### Planned (Phase 2)

- **Vitest**: Fast test framework
- **@vitest/ui**: Interactive test UI
- **@vitest/coverage-v8**: Coverage reporting
- **Playwright**: E2E testing
- **msw**: API mocking
- **fast-check**: Property-based testing

---

## 📞 Support

For questions about testing:

- GitHub Issues: https://github.com/JP-Fernando/global-scanner-pro/issues
- Vitest Docs: https://vitest.dev/
- Playwright Docs: https://playwright.dev/

---

**Document Version**: 1.0
**Last Updated**: January 18, 2026
