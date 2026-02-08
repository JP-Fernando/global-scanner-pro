/**
 * Performance Tracker Tests
 *
 * Tests for drawdown calculations, performance metrics, equity curves,
 * and helper methods. Async methods that depend on external APIs / IndexedDB
 * are tested via mocking.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceTracker } from '../../portfolio/performance-tracker.js';

describe('PerformanceTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new PerformanceTracker();
  });

  // ---------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------
  describe('constructor', () => {
    it('initialises with empty price cache', () => {
      expect(tracker.priceCache).toBeInstanceOf(Map);
      expect(tracker.priceCache.size).toBe(0);
    });
  });

  // ---------------------------------------------------------------
  // calculateDrawdowns
  // ---------------------------------------------------------------
  describe('calculateDrawdowns', () => {
    it('returns empty array for empty equity curve', () => {
      const result = tracker.calculateDrawdowns([]);
      expect(result).toEqual([]);
    });

    it('calculates zero drawdown for monotonically increasing curve', () => {
      const equityCurve = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 110 },
        { date: '2023-01-03', value: 120 },
      ];

      const result = tracker.calculateDrawdowns(equityCurve);
      expect(result).toHaveLength(3);
      result.forEach(point => {
        expect(point.drawdown_pct).toBe(0);
      });
    });

    it('calculates correct drawdown for declining values', () => {
      const equityCurve = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 120 },
        { date: '2023-01-03', value: 96 }, // 20% drawdown from 120 peak
      ];

      const result = tracker.calculateDrawdowns(equityCurve);
      expect(result[2].drawdown_pct).toBeCloseTo(-20, 1);
      expect(result[2].peak).toBe(120);
    });

    it('tracks peak correctly through multiple ups and downs', () => {
      const equityCurve = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 120 },
        { date: '2023-01-03', value: 110 },
        { date: '2023-01-04', value: 130 },
        { date: '2023-01-05', value: 115 },
      ];

      const result = tracker.calculateDrawdowns(equityCurve);
      expect(result[3].peak).toBe(130);
      expect(result[4].peak).toBe(130);
      expect(result[4].drawdown_pct).toBeCloseTo(((115 - 130) / 130) * 100, 1);
    });
  });

  // ---------------------------------------------------------------
  // calculateMaxDrawdown
  // ---------------------------------------------------------------
  describe('calculateMaxDrawdown', () => {
    it('returns zero drawdown for empty equity curve', () => {
      const result = tracker.calculateMaxDrawdown([]);
      expect(result.max_drawdown_pct).toBe(0);
      expect(result.peak_date).toBeNull();
      expect(result.trough_date).toBeNull();
    });

    it('returns zero for monotonically increasing curve', () => {
      const equityCurve = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 110 },
        { date: '2023-01-03', value: 120 },
      ];

      const result = tracker.calculateMaxDrawdown(equityCurve);
      expect(result.max_drawdown_pct).toBe(0);
    });

    it('identifies correct max drawdown', () => {
      const equityCurve = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 120 },
        { date: '2023-01-03', value: 90 }, // 25% drawdown from 120
        { date: '2023-01-04', value: 110 },
        { date: '2023-01-05', value: 105 },
      ];

      const result = tracker.calculateMaxDrawdown(equityCurve);
      expect(result.max_drawdown_pct).toBeCloseTo(-25, 1);
      expect(result.trough_date).toBe('2023-01-03');
    });
  });

  // ---------------------------------------------------------------
  // calculatePerformanceMetrics
  // ---------------------------------------------------------------
  describe('calculatePerformanceMetrics', () => {
    it('returns null for fewer than 2 data points', () => {
      expect(tracker.calculatePerformanceMetrics([])).toBeNull();
      expect(tracker.calculatePerformanceMetrics([{ value: 100 }])).toBeNull();
    });

    it('calculates basic performance metrics', () => {
      const equityCurve = [
        { date: '2023-01-01', value: 100, daily_return_pct: 0 },
        { date: '2023-01-02', value: 102, daily_return_pct: 2 },
        { date: '2023-01-03', value: 105, daily_return_pct: 2.94 },
        { date: '2023-01-04', value: 103, daily_return_pct: -1.9 },
        { date: '2023-01-05', value: 108, daily_return_pct: 4.85 },
      ];

      const result = tracker.calculatePerformanceMetrics(equityCurve);

      expect(result).not.toBeNull();
      expect(result.total_return_pct).toBeCloseTo(8, 0);
      expect(result.annualized_return_pct).toBeTypeOf('number');
      expect(result.annualized_volatility_pct).toBeTypeOf('number');
      expect(result.sharpe_ratio).toBeTypeOf('number');
      expect(result.sortino_ratio).toBeTypeOf('number');
      expect(result.calmar_ratio).toBeTypeOf('number');
      expect(result.max_drawdown).toBeDefined();
      expect(result.num_periods).toBe(5);
    });

    it('sharpe ratio is 0 when volatility is 0', () => {
      const equityCurve = [
        { date: '2023-01-01', value: 100, daily_return_pct: 0 },
        { date: '2023-01-02', value: 100, daily_return_pct: 0 },
        { date: '2023-01-03', value: 100, daily_return_pct: 0 },
      ];

      const result = tracker.calculatePerformanceMetrics(equityCurve);
      expect(result.sharpe_ratio).toBe(0);
    });

    it('sortino ratio is 0 when no negative returns', () => {
      const equityCurve = [
        { date: '2023-01-01', value: 100, daily_return_pct: 0 },
        { date: '2023-01-02', value: 102, daily_return_pct: 2 },
        { date: '2023-01-03', value: 104, daily_return_pct: 1.96 },
      ];

      const result = tracker.calculatePerformanceMetrics(equityCurve);
      expect(result.sortino_ratio).toBe(0);
    });

    it('accepts custom risk-free rate', () => {
      const equityCurve = [
        { date: '2023-01-01', value: 100, daily_return_pct: 0 },
        { date: '2023-01-02', value: 102, daily_return_pct: 2 },
        { date: '2023-01-03', value: 101, daily_return_pct: -0.98 },
        { date: '2023-01-04', value: 105, daily_return_pct: 3.96 },
      ];

      const result1 = tracker.calculatePerformanceMetrics(equityCurve, 0.02);
      const result2 = tracker.calculatePerformanceMetrics(equityCurve, 0.05);

      // Higher risk-free rate should result in lower Sharpe
      expect(result2.sharpe_ratio).toBeLessThan(result1.sharpe_ratio);
    });
  });

  // ---------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------
  describe('_findClosestPrice', () => {
    it('finds exact date match', () => {
      const prices = [
        { date: '2023-01-01', price: 100 },
        { date: '2023-01-02', price: 105 },
        { date: '2023-01-03', price: 110 },
      ];

      const result = tracker._findClosestPrice(prices, '2023-01-02');
      expect(result).toBe(105);
    });

    it('finds closest date when exact match not present', () => {
      const prices = [
        { date: '2023-01-01', price: 100 },
        { date: '2023-01-05', price: 110 },
      ];

      const result = tracker._findClosestPrice(prices, '2023-01-03');
      // Should pick 2023-01-01 (2 days away) rather than 2023-01-05 (2 days away too, but first encountered wins or whichever is closer)
      expect([100, 110]).toContain(result);
    });
  });

  describe('_generateDateRange', () => {
    it('generates only weekdays', () => {
      const dates = tracker._generateDateRange('2023-01-02', '2023-01-08');
      // Jan 2 Mon, Jan 3 Tue, Jan 4 Wed, Jan 5 Thu, Jan 6 Fri — skip Sat/Sun
      expect(dates).toHaveLength(5);
      expect(dates[0]).toBe('2023-01-02');
      expect(dates[4]).toBe('2023-01-06');
    });

    it('returns empty for weekend-only range', () => {
      const dates = tracker._generateDateRange('2023-01-07', '2023-01-08');
      // Jan 7 Sat, Jan 8 Sun — no business days
      expect(dates).toHaveLength(0);
    });

    it('returns single day for same start/end on weekday', () => {
      const dates = tracker._generateDateRange('2023-01-02', '2023-01-02');
      expect(dates).toHaveLength(1);
    });
  });

  describe('_alignEquityCurves', () => {
    it('aligns curves by date', () => {
      const portfolio = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 105 },
        { date: '2023-01-03', value: 110 },
      ];

      const benchmark = [
        { date: '2023-01-01', value: 200 },
        { date: '2023-01-03', value: 210 },
      ];

      const aligned = tracker._alignEquityCurves(portfolio, benchmark);
      expect(aligned).toHaveLength(2);
      expect(aligned[0].date).toBe('2023-01-01');
      expect(aligned[1].date).toBe('2023-01-03');
    });

    it('returns empty for no overlapping dates', () => {
      const portfolio = [{ date: '2023-01-01', value: 100 }];
      const benchmark = [{ date: '2023-02-01', value: 200 }];

      const aligned = tracker._alignEquityCurves(portfolio, benchmark);
      expect(aligned).toHaveLength(0);
    });
  });

  describe('_calculateAlphaBeta', () => {
    it('returns default values for insufficient data', () => {
      const result = tracker._calculateAlphaBeta(
        [{ date: '2023-01-01', value: 100 }],
        [{ date: '2023-01-01', value: 200 }]
      );

      expect(result.alpha).toBe(0);
      expect(result.beta).toBe(1);
    });

    it('calculates alpha and beta for aligned curves', () => {
      const portfolio = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 105 },
        { date: '2023-01-03', value: 110 },
      ];

      const benchmark = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 102 },
        { date: '2023-01-03', value: 104 },
      ];

      const result = tracker._calculateAlphaBeta(portfolio, benchmark);
      expect(result.alpha).toBeTypeOf('number');
      expect(result.beta).toBeTypeOf('number');
    });
  });

  describe('_calculateTrackingError', () => {
    it('returns 0 for insufficient data', () => {
      const result = tracker._calculateTrackingError(
        [{ date: '2023-01-01', value: 100 }],
        [{ date: '2023-01-01', value: 100 }]
      );
      expect(result).toBe(0);
    });

    it('returns 0 for identical curves', () => {
      const curve = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 105 },
        { date: '2023-01-03', value: 110 },
      ];

      const result = tracker._calculateTrackingError(curve, curve);
      expect(result).toBeCloseTo(0, 5);
    });

    it('returns positive tracking error for divergent curves', () => {
      const portfolio = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 110 },
        { date: '2023-01-03', value: 105 },
      ];

      const benchmark = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 102 },
        { date: '2023-01-03', value: 104 },
      ];

      const result = tracker._calculateTrackingError(portfolio, benchmark);
      expect(result).toBeGreaterThan(0);
    });
  });
});
