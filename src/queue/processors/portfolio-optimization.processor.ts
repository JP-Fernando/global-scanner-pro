/**
 * Portfolio Optimization Job Processor
 *
 * Executes portfolio optimization algorithms (Max Sharpe, Min Variance,
 * Risk Parity, ERC) in a BullMQ worker so the HTTP event loop is not blocked
 * during intensive matrix computations.
 *
 * Expected job data shape:
 * ```json
 * {
 *   "method": "maxSharpe" | "minVariance" | "riskParity" | "equalRiskContribution",
 *   "assets": ["AAPL", "MSFT", ...],
 *   "returns": [[0.01, -0.02, ...], ...],   // one row per asset, daily returns
 *   "riskFreeRate": 0.04,                   // annualised, optional (default 0.04)
 *   "constraints": {                        // optional
 *     "minWeight": 0.01,
 *     "maxWeight": 0.40
 *   }
 * }
 * ```
 *
 * @module queue/processors/portfolio-optimization.processor
 */

import type { Job } from 'bullmq';
import { log } from '../../utils/logger.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type OptimizationMethod = 'maxSharpe' | 'minVariance' | 'riskParity' | 'equalRiskContribution';

export interface OptimizationJobData {
  method: OptimizationMethod;
  assets: string[];
  returns: number[][];     // rows = assets, cols = time periods
  riskFreeRate?: number;
  constraints?: {
    minWeight?: number;
    maxWeight?: number;
  };
}

export interface OptimizationResult {
  method: OptimizationMethod;
  weights: Record<string, number>;
  metrics: {
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
    diversificationRatio?: number;
  };
  processingTimeMs: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Annualised return from daily returns array */
function annualisedReturn(dailyReturns: number[]): number {
  if (dailyReturns.length === 0) return 0;
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  return mean * 252;
}

/** Annualised volatility from daily returns array */
function annualisedVol(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
  return Math.sqrt(variance * 252);
}

/** Covariance between two return series */
function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const mb = b.slice(0, n).reduce((s, v) => s + v, 0) / n;
  return a.slice(0, n).reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0) / (n - 1);
}

/** Build annualised covariance matrix */
function covarianceMatrix(returns: number[][]): number[][] {
  const n = returns.length;
  const cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const c = covariance(returns[i], returns[j]) * 252;
      cov[i][j] = c;
      cov[j][i] = c;
    }
  }
  return cov;
}

/** Portfolio variance given weights and covariance matrix */
function portfolioVariance(weights: number[], cov: number[][]): number {
  let variance = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      variance += weights[i] * weights[j] * cov[i][j];
    }
  }
  return variance;
}

/** Clamp weights to [min, max] and normalise to sum to 1 */
function normaliseWeights(raw: number[], min = 0.0, max = 1.0): number[] {
  const clamped = raw.map(w => Math.max(min, Math.min(max, w)));
  const total = clamped.reduce((a, b) => a + b, 0) || 1;
  return clamped.map(w => w / total);
}

// ── Optimisation implementations ──────────────────────────────────────────────

function equalWeight(n: number): number[] {
  return new Array(n).fill(1 / n);
}

/**
 * Inverse-variance weighting (proxy for Max Sharpe with uncorrelated assets).
 * A proper gradient-based optimiser would be needed for correlated portfolios,
 * but this provides a fast, dependency-free approximation.
 */
function maxSharpeWeights(returns: number[][], riskFreeRate: number, constraints: { minWeight: number; maxWeight: number }): number[] {
  const vols = returns.map(r => annualisedVol(r));
  const rets = returns.map(r => annualisedReturn(r));
  const excess = rets.map((r, i) => Math.max(0, (r - riskFreeRate) / (vols[i] || 1e-9)));
  const total = excess.reduce((a, b) => a + b, 0) || 1;
  const raw = excess.map(e => e / total);
  return normaliseWeights(raw, constraints.minWeight, constraints.maxWeight);
}

/** Minimum-variance portfolio via inverse-variance proxy */
function minVarianceWeights(returns: number[][], constraints: { minWeight: number; maxWeight: number }): number[] {
  const vols = returns.map(r => annualisedVol(r) || 1e-9);
  const invVol = vols.map(v => 1 / (v * v));
  const total = invVol.reduce((a, b) => a + b, 0) || 1;
  const raw = invVol.map(v => v / total);
  return normaliseWeights(raw, constraints.minWeight, constraints.maxWeight);
}

/** Risk parity / ERC — equal risk contribution via iterative proportional scaling */
function riskParityWeights(returns: number[][], constraints: { minWeight: number; maxWeight: number }): number[] {
  const n = returns.length;
  const cov = covarianceMatrix(returns);
  let w = new Array(n).fill(1 / n);

  // Simple iterative algorithm: scale each weight by target / marginal risk
  for (let iter = 0; iter < 200; iter++) {
    const pVar = portfolioVariance(w, cov);
    const sigma = Math.sqrt(pVar) || 1e-9;
    const targetRisk = sigma / n;  // equal risk contribution target

    for (let i = 0; i < n; i++) {
      let mc = 0;
      for (let j = 0; j < n; j++) mc += w[j] * cov[i][j];
      const rc = w[i] * mc / sigma;
      w[i] *= targetRisk / (rc || 1e-9);
    }
    // Normalise
    const sum = w.reduce((a, b) => a + b, 0) || 1;
    w = w.map(v => v / sum);
  }

  return normaliseWeights(w, constraints.minWeight, constraints.maxWeight);
}

// ── Processor ─────────────────────────────────────────────────────────────────

export async function portfolioOptimizationProcessor(job: Job<OptimizationJobData>): Promise<OptimizationResult> {
  const t0 = Date.now();
  const { method, assets, returns, riskFreeRate = 0.04, constraints = {} } = job.data;

  const minWeight = constraints.minWeight ?? 0.0;
  const maxWeight = constraints.maxWeight ?? 1.0;
  const cons = { minWeight, maxWeight };

  log.info(`Portfolio optimization started: ${method}`, { jobId: job.id, assets: assets.length });

  await job.updateProgress(10);

  let weights: number[];
  switch (method) {
    case 'maxSharpe':
      weights = maxSharpeWeights(returns, riskFreeRate, cons);
      break;
    case 'minVariance':
      weights = minVarianceWeights(returns, cons);
      break;
    case 'riskParity':
    case 'equalRiskContribution':
      weights = riskParityWeights(returns, cons);
      break;
    default:
      weights = equalWeight(assets.length);
  }

  await job.updateProgress(80);

  // Compute portfolio-level metrics
  const cov = covarianceMatrix(returns);
  const portVar = portfolioVariance(weights, cov);
  const portVol = Math.sqrt(portVar);
  const portRet = returns.reduce((sum, assetReturns, i) =>
    sum + weights[i] * annualisedReturn(assetReturns), 0
  );
  const sharpe = portVol > 0 ? (portRet - riskFreeRate) / portVol : 0;

  await job.updateProgress(100);

  const processingTimeMs = Date.now() - t0;
  log.info(`Portfolio optimization completed: ${method} in ${processingTimeMs}ms`, { jobId: job.id });

  return {
    method,
    weights: Object.fromEntries(assets.map((a, i) => [a, Math.round(weights[i] * 10000) / 10000])),
    metrics: {
      expectedReturn: Math.round(portRet * 10000) / 10000,
      volatility: Math.round(portVol * 10000) / 10000,
      sharpeRatio: Math.round(sharpe * 1000) / 1000
    },
    processingTimeMs
  };
}
