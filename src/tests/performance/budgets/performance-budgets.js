/**
 * Performance budgets — single source of truth for all thresholds.
 *
 * Budgets are intentionally generous for CI (shared runners are slower).
 * Local development can use tighter thresholds by setting PERF_STRICT=true.
 */

const isStrict = process.env.PERF_STRICT === 'true';

export const API_BUDGETS = {
  health: {
    p95ResponseMs: isStrict ? 50 : 100,
    p99ResponseMs: isStrict ? 100 : 250,
    minRequestsPerSec: isStrict ? 1000 : 500,
  },
  yahoo: {
    // Measures server-side overhead only (external call times out)
    p95ResponseMs: isStrict ? 200 : 500,
    p99ResponseMs: isStrict ? 400 : 1000,
  },
  rateLimiting: {
    globalMaxPerWindow: 100,
    yahooMaxPerMinute: 20,
    rejectionResponseMs: 50,
  },
};

export const COMPUTATION_BUDGETS = {
  indicators: {
    singleIndicatorMs: isStrict ? 2 : 5,
    fullScoringMs: isStrict ? 10 : 25,
  },
  allocation: {
    thirtyAssetsMs: isStrict ? 5 : 15,
  },
  ml: {
    randomForestFitMs: isStrict ? 500 : 1500,
    kmeansFitMs: isStrict ? 100 : 300,
    linearRegressionFitMs: isStrict ? 10 : 30,
  },
  portfolioOptimizer: {
    maxSharpeMs: isStrict ? 50 : 150,
    minVarianceMs: isStrict ? 50 : 150,
    riskParityMs: isStrict ? 50 : 150,
  },
  monteCarlo: {
    tenThousandSimsMs: isStrict ? 200 : 600,
  },
  stressTesting: {
    multiFactorMs: isStrict ? 50 : 150,
  },
};

export const FRONTEND_BUDGETS = {
  lighthouse: {
    performance: 90,
    accessibility: 90,
    bestPractices: 90,
    seo: 80,
  },
  webVitals: {
    fcpMs: 1500,
    ttiMs: 3000,
    lcpMs: 2500,
    cls: 0.1,
  },
};
