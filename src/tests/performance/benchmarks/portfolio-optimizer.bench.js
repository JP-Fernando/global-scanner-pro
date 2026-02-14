/**
 * Benchmark: Portfolio Optimization
 *
 * Measures throughput of MaxSharpe, MinVariance, and RiskParity
 * optimization algorithms.
 */
import { bench, describe } from 'vitest';
import {
  optimizeMaxSharpe, optimizeMinVariance, optimizeRiskParity,
} from '../../../analytics/portfolio-optimizer.js';
import { buildOptimizationPortfolio } from '../../helpers.js';

const positions = buildOptimizationPortfolio();

describe('Portfolio Optimization (4 positions)', () => {
  bench('optimizeMaxSharpe', () => { optimizeMaxSharpe(positions); });
  bench('optimizeMinVariance', () => { optimizeMinVariance(positions); });
  bench('optimizeRiskParity', () => { optimizeRiskParity(positions); });
});
