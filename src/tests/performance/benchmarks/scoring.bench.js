/**
 * Benchmark: Scoring Pipeline
 *
 * Measures throughput of the multi-factor scoring engine
 * (trend, momentum, risk, liquidity, final score, hard filters).
 */
import { bench, describe } from 'vitest';
import {
  calculateTrendScore, calculateMomentumScore,
  calculateRiskScore, calculateLiquidityScore,
  calculateFinalScore, applyHardFilters,
} from '../../../indicators/scoring.js';
import { buildOHLCVSeries } from '../../integration/helpers.js';
import { buildStrategyConfig } from '../../helpers.js';

const { data, prices, volumes } = buildOHLCVSeries(300, 100);
const config = buildStrategyConfig();
const indConfig = config.indicators;
const filterConfig = config.filters;
const weights = config.weights;

describe('Scoring Pipeline (300 data points)', () => {
  bench('calculateTrendScore', () => {
    calculateTrendScore(data, prices, indConfig);
  });

  bench('calculateMomentumScore', () => {
    calculateMomentumScore(prices, indConfig);
  });

  bench('calculateRiskScore', () => {
    calculateRiskScore(data, prices, indConfig);
  });

  bench('calculateLiquidityScore', () => {
    calculateLiquidityScore(volumes, filterConfig);
  });

  bench('applyHardFilters', () => {
    applyHardFilters(data, prices, volumes, filterConfig);
  });

  bench('Full scoring pipeline (all factors)', () => {
    const trend = calculateTrendScore(data, prices, indConfig);
    const momentum = calculateMomentumScore(prices, indConfig);
    const risk = calculateRiskScore(data, prices, indConfig);
    const liquidity = calculateLiquidityScore(volumes, filterConfig);
    calculateFinalScore(
      trend.score, momentum.score, risk.score, liquidity.score, weights
    );
  });
});
