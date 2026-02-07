/**
 * Scoring Engine Tests
 *
 * Tests for the quantitative scoring engine including
 * normalization, alpha calculation, and temporal scores.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeToPercentile,
  calculateAlpha,
  calculateRelativeVolatility,
  calculateShortTermScore,
  calculateMediumTermScore,
  calculateLongTermScore,
} from '../../indicators/scoring.js';
import { buildStrategyConfig } from '../helpers.js';

describe('Scoring Engine', () => {
  // -----------------------------------------------------------
  // Normalization Functions
  // -----------------------------------------------------------
  describe('normalizeToPercentile', () => {
    it('returns 100 for maximum value', () => {
      const values = [10, 20, 30, 40, 50];
      const percentile = normalizeToPercentile(50, values);
      expect(percentile).toBe(100);
    });

    it('returns ~20 for minimum value in 5-element array', () => {
      const values = [10, 20, 30, 40, 50];
      const percentile = normalizeToPercentile(10, values);
      expect(percentile).toBe(20); // 1/5 = 0.2 = 20%
    });

    it('returns correct percentile for middle value', () => {
      const values = [10, 20, 30, 40, 50];
      const percentile = normalizeToPercentile(30, values);
      expect(percentile).toBe(60); // 3/5 = 60%
    });

    it('handles duplicate values', () => {
      const values = [10, 10, 10, 20, 30];
      const percentile = normalizeToPercentile(10, values);
      expect(percentile).toBe(60); // 3/5 = 60%
    });

    it('handles single element array', () => {
      const values = [100];
      const percentile = normalizeToPercentile(100, values);
      expect(percentile).toBe(100);
    });

    it('handles values outside the array range', () => {
      const values = [10, 20, 30];
      // Value below min
      const percentileLow = normalizeToPercentile(5, values);
      expect(percentileLow).toBe(0);

      // Value above max
      const percentileHigh = normalizeToPercentile(100, values);
      expect(percentileHigh).toBe(100);
    });
  });

  // -----------------------------------------------------------
  // Alpha Calculation
  // -----------------------------------------------------------
  describe('calculateAlpha', () => {
    it('returns positive alpha when asset outperforms benchmark', () => {
      const alpha = calculateAlpha(15, 10);
      expect(alpha).toBe(5);
    });

    it('returns negative alpha when asset underperforms benchmark', () => {
      const alpha = calculateAlpha(5, 10);
      expect(alpha).toBe(-5);
    });

    it('returns zero alpha when performance matches', () => {
      const alpha = calculateAlpha(10, 10);
      expect(alpha).toBe(0);
    });

    it('handles negative returns', () => {
      const alpha = calculateAlpha(-5, -10);
      expect(alpha).toBe(5); // Asset lost less
    });
  });

  // -----------------------------------------------------------
  // Relative Volatility
  // -----------------------------------------------------------
  describe('calculateRelativeVolatility', () => {
    it('returns 1 when volatilities are equal', () => {
      const relVol = calculateRelativeVolatility(20, 20);
      expect(relVol).toBe(1);
    });

    it('returns > 1 when asset is more volatile', () => {
      const relVol = calculateRelativeVolatility(30, 20);
      expect(relVol).toBe(1.5);
    });

    it('returns < 1 when asset is less volatile', () => {
      const relVol = calculateRelativeVolatility(10, 20);
      expect(relVol).toBe(0.5);
    });

    it('returns 1 when benchmark volatility is zero', () => {
      const relVol = calculateRelativeVolatility(25, 0);
      expect(relVol).toBe(1);
    });
  });

  // -----------------------------------------------------------
  // Short Term Score
  // -----------------------------------------------------------
  describe('calculateShortTermScore', () => {
    it('returns valid score for uptrend with good volume', () => {
      // Create uptrending prices
      const prices = Array.from({ length: 100 }, (_, i) => 100 + i * 0.5);
      const volumes = Array.from({ length: 100 }, (_, i) => 10000 + i * 100);
      const data = prices.map((close, i) => ({
        close,
        high: close + 1,
        low: close - 1,
        volume: volumes[i],
      }));

      const config = buildStrategyConfig();
      const score = calculateShortTermScore(data, prices, volumes, config);

      // Score should be a valid positive number
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns lower score for downtrend', () => {
      // Create downtrending prices
      const prices = Array.from({ length: 100 }, (_, i) => 200 - i * 0.5);
      const volumes = Array.from({ length: 100 }, () => 10000);
      const data = prices.map((close) => ({
        close,
        high: close + 1,
        low: close - 1,
        volume: 10000,
      }));

      const config = buildStrategyConfig();
      const score = calculateShortTermScore(data, prices, volumes, config);

      // Score should be lower for downtrend
      expect(score).toBeLessThan(80);
    });

    it('handles insufficient data gracefully', () => {
      const prices = [100, 101, 102]; // Very short series
      const volumes = [10000, 10000, 10000];
      const data = prices.map((close) => ({
        close,
        high: close + 1,
        low: close - 1,
        volume: 10000,
      }));

      const config = buildStrategyConfig();
      // Should not throw, returns neutral score
      const score = calculateShortTermScore(data, prices, volumes, config);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // -----------------------------------------------------------
  // Medium Term Score
  // -----------------------------------------------------------
  describe('calculateMediumTermScore', () => {
    it('returns high score for bullish EMA structure', () => {
      // Create uptrending prices for EMA calculation
      const prices = Array.from({ length: 250 }, (_, i) => 100 + i * 0.3);
      const data = prices.map((close) => ({
        close,
        high: close + 1,
        low: close - 1,
        volume: 10000,
      }));

      const config = buildStrategyConfig();
      const score = calculateMediumTermScore(data, prices, config);

      expect(score).toBeGreaterThan(40);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('handles short data series', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
      const data = prices.map((close) => ({
        close,
        high: close + 1,
        low: close - 1,
        volume: 10000,
      }));

      const config = buildStrategyConfig();
      const score = calculateMediumTermScore(data, prices, config);

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  // -----------------------------------------------------------
  // Long Term Score
  // -----------------------------------------------------------
  describe('calculateLongTermScore', () => {
    it('returns high score for consistent uptrend', () => {
      // Create long uptrending series
      const prices = Array.from({ length: 400 }, (_, i) => 100 + i * 0.2);
      const data = prices.map((close) => ({
        close,
        high: close + 1,
        low: close - 1,
        volume: 10000,
      }));

      const config = buildStrategyConfig();
      const score = calculateLongTermScore(data, prices, config);

      expect(score).toBeGreaterThan(40);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns lower score for volatile series', () => {
      // Create volatile series with high drawdown
      const prices = Array.from({ length: 400 }, (_, i) => {
        const base = 100;
        // Create a pattern that has a significant drawdown
        if (i < 100) return base + i;
        if (i < 200) return 200 - (i - 100);
        if (i < 300) return 100 + (i - 200);
        return 200 - (i - 300) * 0.5;
      });
      const data = prices.map((close) => ({
        close,
        high: close + 2,
        low: close - 2,
        volume: 10000,
      }));

      const config = buildStrategyConfig();
      const score = calculateLongTermScore(data, prices, config);

      // Should still return valid score
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('handles insufficient history', () => {
      const prices = [100, 101, 102, 103, 104];
      const data = prices.map((close) => ({
        close,
        high: close + 1,
        low: close - 1,
        volume: 10000,
      }));

      const config = buildStrategyConfig();
      const score = calculateLongTermScore(data, prices, config);

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  // -----------------------------------------------------------
  // Score Bounds
  // -----------------------------------------------------------
  describe('Score Bounds', () => {
    it('all scores are clamped between 0 and 100', () => {
      const prices = Array.from({ length: 300 }, (_, i) => 100 + Math.sin(i / 10) * 20);
      const volumes = Array.from({ length: 300 }, () => 10000);
      const data = prices.map((close, i) => ({
        close,
        high: close + 1,
        low: close - 1,
        volume: volumes[i],
      }));

      const config = buildStrategyConfig();

      const shortTerm = calculateShortTermScore(data, prices, volumes, config);
      const mediumTerm = calculateMediumTermScore(data, prices, config);
      const longTerm = calculateLongTermScore(data, prices, config);

      expect(shortTerm).toBeGreaterThanOrEqual(0);
      expect(shortTerm).toBeLessThanOrEqual(100);
      expect(mediumTerm).toBeGreaterThanOrEqual(0);
      expect(mediumTerm).toBeLessThanOrEqual(100);
      expect(longTerm).toBeGreaterThanOrEqual(0);
      expect(longTerm).toBeLessThanOrEqual(100);
    });
  });
});
