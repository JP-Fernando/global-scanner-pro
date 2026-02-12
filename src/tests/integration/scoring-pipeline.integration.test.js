/**
 * Integration tests: Indicators → Scoring → Allocation pipeline
 *
 * Verifies the complete quantitative pipeline where indicator calculations
 * feed into scoring functions which feed into capital allocation.
 */

import { describe, it, expect } from 'vitest';
import * as ind from '../../indicators/indicators.js';
import {
  calculateTrendScore,
  calculateMomentumScore,
  calculateRiskScore,
  calculateLiquidityScore,
  calculateFinalScore,
  calculateShortTermScore,
  calculateMediumTermScore,
  calculateLongTermScore,
  applyHardFilters,
  generateSignal,
} from '../../indicators/scoring.js';
import {
  allocateCapital,
  calculatePortfolioRisk,
  calculateCapitalRecommendations,
  ALLOCATION_CONFIG,
} from '../../allocation/allocation.js';
import { buildOHLCVSeries, buildScoredAssets, buildStrategyConfig } from './helpers.js';

// ---------------------------------------------------------------------------
// 1. Indicators → Scoring integration
// ---------------------------------------------------------------------------

describe('Indicators → Scoring', () => {
  const config = buildStrategyConfig();
  const { data, prices, volumes } = buildOHLCVSeries(300, 100);

  describe('Trend score uses real indicator values', () => {
    it('produces a score object with numeric score 0-100', () => {
      const result = calculateTrendScore(data, prices, config.indicators);
      expect(result).toHaveProperty('score');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('populates EMA details from indicators.js', () => {
      const result = calculateTrendScore(data, prices, config.indicators);
      expect(result.details).toHaveProperty('ema50');
      expect(result.details).toHaveProperty('ema200');
      // With 300 data points the EMAs should compute (not "N/A")
      if (prices.length >= config.indicators.ema_long) {
        expect(result.details.ema200).not.toBe('N/A');
      }
    });

    it('ADX score is populated', () => {
      const result = calculateTrendScore(data, prices, config.indicators);
      expect(parseFloat(result.details.adxScore)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Momentum score uses real indicator values', () => {
    it('returns score 0-100 with benchmark ROC', () => {
      const benchmarkROC6m = 5;
      const benchmarkROC12m = 10;
      const result = calculateMomentumScore(prices, config.indicators, benchmarkROC6m, benchmarkROC12m);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('alpha is calculated as asset ROC minus benchmark ROC', () => {
      const result = calculateMomentumScore(prices, config.indicators, 5, 10);
      const roc6m = parseFloat(result.details.roc6m);
      const alpha6m = parseFloat(result.details.alpha6m);
      expect(alpha6m).toBeCloseTo(roc6m - 5, 1);
    });

    it('RSI is within valid range', () => {
      const result = calculateMomentumScore(prices, config.indicators);
      const rsi = parseFloat(result.details.rsi);
      expect(rsi).toBeGreaterThanOrEqual(0);
      expect(rsi).toBeLessThanOrEqual(100);
    });
  });

  describe('Risk score uses real indicator values', () => {
    it('returns score 0-100', () => {
      const result = calculateRiskScore(data, prices, config.indicators, 20);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('volatility detail is populated', () => {
      const result = calculateRiskScore(data, prices, config.indicators, 20);
      expect(parseFloat(result.details.volatility)).toBeGreaterThan(0);
    });

    it('maxDrawdown detail is populated', () => {
      const result = calculateRiskScore(data, prices, config.indicators);
      expect(parseFloat(result.details.maxDrawdown)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Liquidity score uses real indicator values', () => {
    it('returns score 0-100', () => {
      const result = calculateLiquidityScore(volumes, config.filters);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('volume ratio is populated', () => {
      const result = calculateLiquidityScore(volumes, config.filters);
      expect(parseFloat(result.details.volRatio)).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. All four scores → Final composite score
// ---------------------------------------------------------------------------

describe('Scores → FinalScore', () => {
  const config = buildStrategyConfig();
  const { data, prices, volumes } = buildOHLCVSeries(300, 100);

  it('computes a composite score from all four factor scores', () => {
    const trend = calculateTrendScore(data, prices, config.indicators);
    const momentum = calculateMomentumScore(prices, config.indicators);
    const risk = calculateRiskScore(data, prices, config.indicators);
    const liquidity = calculateLiquidityScore(volumes, config.filters);

    const finalScore = calculateFinalScore(
      trend.score, momentum.score, risk.score, liquidity.score,
      config.weights,
    );

    expect(finalScore).toBeGreaterThanOrEqual(0);
    expect(finalScore).toBeLessThanOrEqual(100);
    expect(Number.isInteger(finalScore)).toBe(true);
  });

  it('final score reflects weight distribution', () => {
    // All factors at 100 → final should be 100
    const perfect = calculateFinalScore(100, 100, 100, 100, config.weights);
    expect(perfect).toBe(100);

    // All factors at 0 → final should be 0
    const zero = calculateFinalScore(0, 0, 0, 0, config.weights);
    expect(zero).toBe(0);
  });

  it('generates a signal from the final score', () => {
    const thresholds = { strong_buy: 80, buy: 65, hold_upper: 50, hold_lower: 35 };

    const strong = generateSignal(85, thresholds);
    expect(strong.key).toBe('strong_buy');

    const sell = generateSignal(20, thresholds);
    expect(sell.key).toBe('sell');
  });
});

// ---------------------------------------------------------------------------
// 3. Temporal scores integration
// ---------------------------------------------------------------------------

describe('Temporal scores (short/medium/long)', () => {
  const config = buildStrategyConfig();
  const { data, prices, volumes } = buildOHLCVSeries(500, 100);

  it('short term score uses EMA20, RSI, and volume ratio', () => {
    const score = calculateShortTermScore(data, prices, volumes, config.indicators);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('medium term score uses EMA50/200, ROC 6m, volatility', () => {
    const score = calculateMediumTermScore(data, prices, config.indicators);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('long term score uses ROC 12m, EMA200 consistency, vol', () => {
    const score = calculateLongTermScore(data, prices, config.indicators);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// 4. Hard filters → scoring flow
// ---------------------------------------------------------------------------

describe('Hard filters → Scoring flow', () => {
  const config = buildStrategyConfig();

  it('accepts assets with sufficient history and volume', () => {
    const { data, prices, volumes } = buildOHLCVSeries(300, 100);
    const result = applyHardFilters(data, prices, volumes, config.filters);
    expect(result.passed).toBe(true);
  });

  it('rejects assets with insufficient history', () => {
    const { data, prices, volumes } = buildOHLCVSeries(5, 100);
    const result = applyHardFilters(data, prices, volumes, config.filters);
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('Historia'))).toBe(true);
  });

  it('rejects assets with critically low volume', () => {
    const { data, prices } = buildOHLCVSeries(30, 100);
    const lowVolumes = Array(30).fill(500); // Below 1000 threshold
    const result = applyHardFilters(data, prices, lowVolumes, config.filters);
    expect(result.passed).toBe(false);
  });

  it('passes assets with low-but-not-critical volume (with warning)', () => {
    const { data, prices } = buildOHLCVSeries(30, 100);
    const medVolumes = Array(30).fill(3000); // Above 1000, below min_volume_20d (5000)
    const result = applyHardFilters(data, prices, medVolumes, config.filters);
    expect(result.passed).toBe(true);
    expect(result.reasons.some(r => r.includes('Volumen bajo'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Scoring → Allocation (end-to-end)
// ---------------------------------------------------------------------------

describe('Scoring → Allocation integration', () => {
  it('scored assets flow through allocateCapital with all 5 methods', () => {
    const assets = buildScoredAssets(5);

    const methods = ['equal_weight', 'score_weighted', 'erc', 'volatility_target', 'hybrid'];
    for (const method of methods) {
      const result = allocateCapital(assets, method);

      expect(result.method).toBe(method);
      expect(result.nAssets).toBe(5);
      expect(result.allocation).toHaveLength(5);

      // Weights must sum to ~1.0
      const weightSum = result.allocation.reduce((s, a) => s + a.weight, 0);
      expect(weightSum).toBeCloseTo(1.0, 4);

      // Each position must have valid fields
      for (const pos of result.allocation) {
        expect(pos.ticker).toBeTruthy();
        expect(pos.weight).toBeGreaterThan(0);
        expect(pos.weight).toBeLessThanOrEqual(1);
        expect(typeof pos.weight_pct).toBe('string');
        expect(typeof pos.score).toBe('number');
      }

      // Portfolio risk should be populated
      expect(result.portfolioRisk).toBeDefined();
      expect(parseFloat(result.portfolioRisk.portfolioVolatility)).toBeGreaterThan(0);
    }
  });

  it('score_weighted gives higher-scoring assets more weight', () => {
    const assets = buildScoredAssets(3);
    const result = allocateCapital(assets, 'score_weighted');
    // Assets are sorted by score descending in buildScoredAssets
    expect(result.allocation[0].weight).toBeGreaterThanOrEqual(result.allocation[2].weight);
  });

  it('erc gives lower-volatility assets more weight', () => {
    const assets = buildScoredAssets(3);
    const result = allocateCapital(assets, 'erc');
    // Asset[0] has vol 22, asset[2] has vol 26 → asset[0] should have higher weight
    expect(result.allocation[0].weight).toBeGreaterThan(result.allocation[2].weight);
  });

  it('capital recommendations match weights * totalCapital', () => {
    const assets = buildScoredAssets(3);
    const { allocation } = allocateCapital(assets, 'equal_weight');
    const recs = calculateCapitalRecommendations(allocation, 100000);

    for (const rec of recs) {
      const expected = rec.weight * 100000;
      expect(parseFloat(rec.recommended_capital)).toBeCloseTo(expected, 0);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Portfolio risk metrics
// ---------------------------------------------------------------------------

describe('Allocation → Portfolio risk metrics', () => {
  it('diversification ratio > 1 for diversified portfolio', () => {
    const assets = buildScoredAssets(5);
    const { allocation, portfolioRisk } = allocateCapital(assets, 'equal_weight');
    expect(parseFloat(portfolioRisk.diversificationRatio)).toBeGreaterThan(1);
  });

  it('effective N equals N for equal-weight', () => {
    const n = 4;
    const assets = buildScoredAssets(n);
    const { portfolioRisk } = allocateCapital(assets, 'equal_weight');
    expect(parseFloat(portfolioRisk.effectiveNAssets)).toBeCloseTo(n, 0);
  });

  it('marginal risk has an entry per asset', () => {
    const assets = buildScoredAssets(5);
    const { portfolioRisk } = allocateCapital(assets, 'hybrid');
    expect(portfolioRisk.marginalRisk).toHaveLength(5);
    for (const mr of portfolioRisk.marginalRisk) {
      expect(mr.ticker).toBeTruthy();
      expect(parseFloat(mr.contribution)).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Universe scoring and ranking
// ---------------------------------------------------------------------------

describe('Universe scoring and ranking', () => {
  const config = buildStrategyConfig();

  it('scores a 5-asset universe and ranks by final score', () => {
    const universeData = [
      buildOHLCVSeries(300, 100),
      buildOHLCVSeries(300, 120),
      buildOHLCVSeries(300, 80),
      buildOHLCVSeries(300, 150),
      buildOHLCVSeries(300, 200),
    ];

    const scored = universeData.map((assetData, i) => {
      const trend = calculateTrendScore(assetData.data, assetData.prices, config.indicators);
      const momentum = calculateMomentumScore(assetData.prices, config.indicators);
      const risk = calculateRiskScore(assetData.data, assetData.prices, config.indicators);
      const liquidity = calculateLiquidityScore(assetData.volumes, config.filters);
      const scoreTotal = calculateFinalScore(
        trend.score, momentum.score, risk.score, liquidity.score,
        config.weights,
      );
      return { ticker: `ASSET${i}`, name: `Asset ${i}`, scoreTotal, details: { risk: risk.details } };
    });

    // Sort descending
    scored.sort((a, b) => b.scoreTotal - a.scoreTotal);

    // Verify ordering
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1].scoreTotal).toBeGreaterThanOrEqual(scored[i].scoreTotal);
    }

    // All scores valid
    for (const s of scored) {
      expect(s.scoreTotal).toBeGreaterThanOrEqual(0);
      expect(s.scoreTotal).toBeLessThanOrEqual(100);
    }
  });

  it('scored universe flows into allocation', () => {
    const assets = [
      { ticker: 'A', name: 'A', scoreTotal: 80, details: { risk: { volatility: '20.00' } } },
      { ticker: 'B', name: 'B', scoreTotal: 60, details: { risk: { volatility: '30.00' } } },
      { ticker: 'C', name: 'C', scoreTotal: 70, details: { risk: { volatility: '25.00' } } },
    ];

    const result = allocateCapital(assets, 'hybrid');
    expect(result.allocation).toHaveLength(3);
    const wSum = result.allocation.reduce((s, a) => s + a.weight, 0);
    expect(wSum).toBeCloseTo(1.0, 4);
  });
});

// ---------------------------------------------------------------------------
// 8. Edge cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('single-asset allocation', () => {
    const assets = buildScoredAssets(1);
    const result = allocateCapital(assets, 'equal_weight');
    expect(result.allocation).toHaveLength(1);
    expect(result.allocation[0].weight).toBeCloseTo(1.0, 4);
  });

  it('all identical scores → equal-ish weights for score_weighted', () => {
    const assets = Array.from({ length: 4 }, (_, i) => ({
      ticker: `T${i}`, name: `T${i}`, scoreTotal: 70,
      details: { risk: { volatility: '20.00' } },
    }));
    const result = allocateCapital(assets, 'score_weighted');
    for (const pos of result.allocation) {
      expect(pos.weight).toBeCloseTo(0.25, 1);
    }
  });

  it('scoring with very short price series degrades gracefully', () => {
    const config = buildStrategyConfig();
    const { data, prices, volumes } = buildOHLCVSeries(25, 100);
    // Should not throw — missing indicators fall back to neutral scores
    const trend = calculateTrendScore(data, prices, config.indicators);
    const risk = calculateRiskScore(data, prices, config.indicators);
    expect(trend.score).toBeGreaterThanOrEqual(0);
    expect(risk.score).toBeGreaterThanOrEqual(0);
  });
});
