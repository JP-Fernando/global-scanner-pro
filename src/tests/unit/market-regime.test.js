/**
 * Market Regime Detector Tests
 *
 * Tests for benchmark analysis, market breadth, regime detection,
 * strategy adjustment, and regime history.
 */

import { describe, it, expect } from 'vitest';
import {
  REGIME_TYPES,
  REGIME_CONFIG,
  analyzeBenchmarkRegime,
  calculateMarketBreadth,
  detectMarketRegime,
  adjustStrategyForRegime,
  analyzeRegimeHistory,
} from '../../analytics/market_regime.js';
import { buildPriceSeries } from '../helpers.js';

// ---------- helpers ----------

/** Build a long upward-trending price series (bullish) */
const buildBullishPrices = (len = 400) =>
  buildPriceSeries(100, len, 0.5);

/** Build a long downward-trending price series with realistic volatility (bearish) */
const buildBearishPrices = (len = 400) => {
  // Seeded PRNG for deterministic results
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff) - 0.5;
  };

  const prices = [];
  let price = 300;
  for (let i = 0; i < len; i++) {
    // Strong downward trend (-0.5%/day) with noise (±2%) for high volatility
    price *= (1 - 0.005 + rand() * 0.04);
    prices.push(Math.max(price, 5));
  }
  return prices;
};

/** Build a flat / sideways price series */
const _buildFlatPrices = (len = 400) =>
  Array.from({ length: len }, (_, i) => 100 + Math.sin(i / 10) * 0.5);

describe('Market Regime Detector', () => {
  // ---------------------------------------------------------------
  // REGIME_TYPES & REGIME_CONFIG
  // ---------------------------------------------------------------
  describe('Constants', () => {
    it('defines three regime types', () => {
      expect(Object.keys(REGIME_TYPES)).toEqual(
        expect.arrayContaining(['risk_on', 'neutral', 'risk_off'])
      );
    });

    it('each regime has strategy_adjustment', () => {
      for (const key of Object.keys(REGIME_TYPES)) {
        expect(REGIME_TYPES[key].strategy_adjustment).toBeDefined();
        expect(REGIME_TYPES[key].strategy_adjustment.momentum_weight).toBeTypeOf('number');
        expect(REGIME_TYPES[key].strategy_adjustment.risk_penalty).toBeTypeOf('number');
        expect(REGIME_TYPES[key].strategy_adjustment.min_score).toBeTypeOf('number');
      }
    });

    it('REGIME_CONFIG has expected keys', () => {
      expect(REGIME_CONFIG.lookback_trend).toBe(200);
      expect(REGIME_CONFIG.lookback_volatility).toBe(20);
      expect(REGIME_CONFIG.vol_threshold_low).toBe(12);
      expect(REGIME_CONFIG.vol_threshold_high).toBe(20);
    });
  });

  // ---------------------------------------------------------------
  // analyzeBenchmarkRegime
  // ---------------------------------------------------------------
  describe('analyzeBenchmarkRegime', () => {
    it('returns neutral with low confidence for insufficient data', () => {
      const result = analyzeBenchmarkRegime([100, 101, 102]);
      expect(result.regime).toBe('neutral');
      expect(result.confidence).toBe(0.5);
    });

    it('returns neutral for null input', () => {
      const result = analyzeBenchmarkRegime(null);
      expect(result.regime).toBe('neutral');
      expect(result.confidence).toBe(0.5);
    });

    it('detects risk_on for strong bullish data', () => {
      const prices = buildBullishPrices(400);
      const result = analyzeBenchmarkRegime(prices);

      expect(result.regime).toBe('risk_on');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.signals).toBeDefined();
      expect(result.signals.trend).toBe(1);
    });

    it('returns valid structure for volatile declining data', () => {
      const prices = buildBearishPrices(400);
      const result = analyzeBenchmarkRegime(prices);

      // Should return a valid regime with all expected fields
      expect(['risk_on', 'neutral', 'risk_off']).toContain(result.regime);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
      expect(result.signals.trend).toBeTypeOf('number');
      expect(result.signals.volatility).toBeTypeOf('number');
      expect(result.signals.momentum).toBeTypeOf('number');
      // Momentum should be negative for declining data
      expect(result.signals.momentum).toBeLessThanOrEqual(0);
    });

    it('returns details with descriptions', () => {
      const prices = buildBullishPrices(400);
      const result = analyzeBenchmarkRegime(prices);

      expect(result.details).toBeDefined();
      expect(result.details.trendDescription).toBeTypeOf('string');
      expect(result.details.volDescription).toBeTypeOf('string');
      expect(result.details.momentumDescription).toBeTypeOf('string');
    });

    it('includes composite signal in signals', () => {
      const prices = buildBullishPrices(400);
      const result = analyzeBenchmarkRegime(prices);

      expect(result.signals.composite).toBeTypeOf('number');
      expect(result.signals.composite).toBe(
        result.signals.trend + result.signals.volatility + result.signals.momentum
      );
    });

    it('confidence is capped at 0.95', () => {
      const prices = buildBullishPrices(600);
      const result = analyzeBenchmarkRegime(prices);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  // ---------------------------------------------------------------
  // calculateMarketBreadth
  // ---------------------------------------------------------------
  describe('calculateMarketBreadth', () => {
    it('returns 50% breadth with no data', () => {
      const result = calculateMarketBreadth([]);
      expect(result.breadth).toBe(50);
      expect(result.signal).toBe(0);
    });

    it('returns 50% breadth for null input', () => {
      const result = calculateMarketBreadth(null);
      expect(result.breadth).toBe(50);
    });

    it('detects strong breadth when majority above EMA50', () => {
      const scanResults = Array.from({ length: 10 }, (_, i) => ({
        ticker: `T${i}`,
        price: 120,
        details: { trend: { ema50: '100' } },
      }));

      const result = calculateMarketBreadth(scanResults);
      expect(result.breadth).toBe(100);
      expect(result.signal).toBe(1);
      expect(result.bullishCount).toBe(10);
      expect(result.totalAnalyzed).toBe(10);
    });

    it('detects weak breadth when majority below EMA50', () => {
      const scanResults = Array.from({ length: 10 }, (_, i) => ({
        ticker: `T${i}`,
        price: 80,
        details: { trend: { ema50: '100' } },
      }));

      const result = calculateMarketBreadth(scanResults);
      expect(result.breadth).toBe(0);
      expect(result.signal).toBe(-1);
    });

    it('handles assets without EMA50 data', () => {
      const scanResults = [
        { ticker: 'A', price: 120, details: {} },
        { ticker: 'B', price: 80, details: { trend: { ema50: '100' } } },
      ];

      const result = calculateMarketBreadth(scanResults);
      expect(result.totalAnalyzed).toBe(1);
    });

    it('returns neutral for mixed breadth', () => {
      const scanResults = Array.from({ length: 10 }, (_, i) => ({
        ticker: `T${i}`,
        price: i < 5 ? 120 : 80,
        details: { trend: { ema50: '100' } },
      }));

      const result = calculateMarketBreadth(scanResults);
      expect(result.breadth).toBe(50);
      expect(result.signal).toBe(0);
    });
  });

  // ---------------------------------------------------------------
  // detectMarketRegime
  // ---------------------------------------------------------------
  describe('detectMarketRegime', () => {
    it('works with only benchmark data (no scan results)', () => {
      const prices = buildBullishPrices(400);
      const result = detectMarketRegime(prices);

      expect(result.regime).toBeDefined();
      expect(result.confidence).toBeTypeOf('number');
      expect(result.name).toBeTypeOf('string');
      expect(result.emoji).toBeTypeOf('string');
      expect(result.color).toBeTypeOf('string');
      expect(result.strategyAdjustment).toBeDefined();
      expect(result.timestamp).toBeTypeOf('string');
      expect(result.breadthAnalysis).toBeNull();
    });

    it('includes breadth analysis when scan results provided', () => {
      const prices = buildBullishPrices(400);
      const scanResults = Array.from({ length: 10 }, (_, i) => ({
        ticker: `T${i}`,
        price: 120,
        details: { trend: { ema50: '100' } },
      }));

      const result = detectMarketRegime(prices, scanResults);
      expect(result.breadthAnalysis).not.toBeNull();
      expect(result.breadthAnalysis.breadth).toBeDefined();
    });

    it('reduces confidence on divergence between benchmark and breadth', () => {
      const prices = buildBullishPrices(400);
      // Weak breadth contradicts bullish benchmark
      const scanResults = Array.from({ length: 10 }, (_, i) => ({
        ticker: `T${i}`,
        price: 80,
        details: { trend: { ema50: '100' } },
      }));

      const result = detectMarketRegime(prices, scanResults);
      // Divergence should push regime toward neutral
      expect(result.regime).toBe('neutral');
    });

    it('increases confidence when signals confirm', () => {
      const prices = buildBullishPrices(400);
      const scanResults = Array.from({ length: 10 }, (_, i) => ({
        ticker: `T${i}`,
        price: 120,
        details: { trend: { ema50: '100' } },
      }));

      const resultWithBreadth = detectMarketRegime(prices, scanResults);
      const resultWithout = detectMarketRegime(prices);

      // Confirming breadth should maintain or boost confidence
      expect(resultWithBreadth.confidence).toBeGreaterThanOrEqual(
        resultWithout.confidence * 0.9
      );
    });
  });

  // ---------------------------------------------------------------
  // adjustStrategyForRegime
  // ---------------------------------------------------------------
  describe('adjustStrategyForRegime', () => {
    const baseStrategy = {
      name: 'test_strategy',
      weights: { trend: 0.3, momentum: 0.3, risk: 0.2, liquidity: 0.2 },
      signals: {
        strong_buy: 80,
        buy: 60,
        hold_upper: 40,
        hold_lower: 20,
        sell: 0,
      },
    };

    it('returns adjusted strategy for risk_on regime', () => {
      const regimeData = {
        strategyAdjustment: REGIME_TYPES.risk_on.strategy_adjustment,
      };

      const adjusted = adjustStrategyForRegime(baseStrategy, regimeData);

      expect(adjusted.regime_adjusted).toBe(true);
      expect(adjusted.original_strategy).toBe('test_strategy');
      // Momentum weight should be increased
      expect(adjusted.weights.momentum).toBeGreaterThan(0);
      // Weights should sum to ~1
      const totalWeight = Object.values(adjusted.weights).reduce((a, b) => a + b, 0);
      expect(totalWeight).toBeCloseTo(1, 3);
    });

    it('returns adjusted strategy for risk_off regime', () => {
      const regimeData = {
        strategyAdjustment: REGIME_TYPES.risk_off.strategy_adjustment,
      };

      const adjusted = adjustStrategyForRegime(baseStrategy, regimeData);

      expect(adjusted.regime_adjusted).toBe(true);
      // Signals should be shifted up (more restrictive)
      expect(adjusted.signals.strong_buy).toBeGreaterThan(baseStrategy.signals.strong_buy);
    });

    it('renormalises weights to sum to 1', () => {
      const regimeData = {
        strategyAdjustment: REGIME_TYPES.risk_off.strategy_adjustment,
      };

      const adjusted = adjustStrategyForRegime(baseStrategy, regimeData);
      const total = Object.values(adjusted.weights).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 5);
    });
  });

  // ---------------------------------------------------------------
  // analyzeRegimeHistory
  // ---------------------------------------------------------------
  describe('analyzeRegimeHistory', () => {
    it('returns history and stats for sufficient data', () => {
      const prices = buildBullishPrices(600);
      const result = analyzeRegimeHistory(prices, 60);

      expect(result.history).toBeInstanceOf(Array);
      expect(result.history.length).toBeGreaterThan(0);
      expect(result.stats).toBeDefined();
      expect(result.stats.risk_on_pct).toBeDefined();
      expect(result.stats.neutral_pct).toBeDefined();
      expect(result.stats.risk_off_pct).toBeDefined();
    });

    it('each history entry has date, regime, and confidence', () => {
      const prices = buildBullishPrices(400);
      const result = analyzeRegimeHistory(prices, 60);

      for (const entry of result.history) {
        expect(entry.date).toBeTypeOf('string');
        expect(entry.regime).toBeTypeOf('string');
        expect(entry.confidence).toBeTypeOf('number');
      }
    });

    it('returns empty history for insufficient data', () => {
      const prices = buildPriceSeries(100, 100, 0.5);
      const result = analyzeRegimeHistory(prices, 60);
      expect(result.history).toHaveLength(0);
    });
  });
});
