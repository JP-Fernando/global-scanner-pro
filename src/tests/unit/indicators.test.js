import { describe, it, expect } from 'vitest';
import * as ind from '../../indicators/indicators.js';

describe('Technical Indicators', () => {
  // -----------------------------------------------------------
  // SMA
  // -----------------------------------------------------------
  describe('SMA', () => {
    it('computes SMA(5) correctly on a simple series', () => {
      const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      const sma = ind.SMA(prices, 5);
      expect(sma).toBeApprox(18, 0.01);
    });
  });

  // -----------------------------------------------------------
  // EMA
  // -----------------------------------------------------------
  describe('EMA', () => {
    it('returns a value within the expected range for a gentle uptrend', () => {
      const prices = Array.from({ length: 150 }, (_, i) => 100 + i * 0.5);
      const ema = ind.EMA(prices, 20);
      expect(ema).not.toBeNull();
      expect(ema).toBeGreaterThan(100);
      expect(ema).toBeLessThan(prices[prices.length - 1]);
    });

    it('returns null when data is insufficient', () => {
      const shortPrices = [100, 101, 102];
      const ema = ind.EMA(shortPrices, 20);
      expect(ema).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // RSI
  // -----------------------------------------------------------
  describe('RSI', () => {
    it('returns high RSI (>70) for a strong uptrend', () => {
      const upPrices = Array.from({ length: 50 }, (_, i) => 100 + i * 2);
      const rsi = ind.RSI(upPrices, 14);
      expect(rsi).toBeGreaterThan(70);
    });

    it('returns low RSI (<30) for a strong downtrend', () => {
      const downPrices = Array.from({ length: 50 }, (_, i) => 200 - i * 2);
      const rsi = ind.RSI(downPrices, 14);
      expect(rsi).toBeLessThan(30);
    });

    it('returns neutral RSI (~50) for a sideways market', () => {
      const flatPrices = Array.from({ length: 50 }, () => 100);
      const rsi = ind.RSI(flatPrices, 14);
      expect(rsi).toBeApprox(50, 5);
    });
  });

  // -----------------------------------------------------------
  // ATR
  // -----------------------------------------------------------
  describe('ATR', () => {
    const data = Array.from({ length: 15 }, (_, i) => ({
      c: 100 + i,
      h: 102 + i,
      l: 98 + i,
    }));

    it('computes ATR within a reasonable range', () => {
      const atr = ind.ATR(data, 14);
      expect(atr).toBeGreaterThan(0);
      expect(atr).toBeLessThan(10);
    });

    it('computes ATR% within a reasonable range', () => {
      const atrPct = ind.ATR_Percent(data, 14);
      expect(atrPct).toBeGreaterThan(0);
      expect(atrPct).toBeLessThan(5);
    });
  });

  // -----------------------------------------------------------
  // Bollinger Bands
  // -----------------------------------------------------------
  describe('Bollinger Bands', () => {
    it('returns upper > middle > lower with positive bandwidth', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 5);
      const bb = ind.BollingerBands(prices, 20);

      expect(bb.upper).toBeGreaterThan(bb.middle);
      expect(bb.middle).toBeGreaterThan(bb.lower);
      expect(bb.bandwidth).toBeGreaterThan(0);
      expect(bb.percentB).toBeGreaterThanOrEqual(0);
      expect(bb.percentB).toBeLessThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------
  // ADX
  // -----------------------------------------------------------
  describe('ADX', () => {
    it('returns high ADX (>20) for a trending market', () => {
      const trendData = Array.from({ length: 50 }, (_, i) => ({
        c: 100 + i * 2,
        h: 102 + i * 2,
        l: 98 + i * 2,
      }));
      const adx = ind.ADX(trendData, 14);
      expect(adx).toBeGreaterThan(20);
    });

    it('returns low ADX (<25) for a sideways market', () => {
      const flatData = Array.from({ length: 50 }, (_, i) => ({
        c: 100 + (i % 2 === 0 ? 1 : -1),
        h: 102,
        l: 98,
      }));
      const adx = ind.ADX(flatData, 14);
      expect(adx).toBeLessThan(25);
    });
  });

  // -----------------------------------------------------------
  // Williams %R
  // -----------------------------------------------------------
  describe('Williams %R', () => {
    it('returns near 0 when price is at highs', () => {
      const highData = Array.from({ length: 30 }, (_, i) => ({
        c: 100 + i,
        h: 101 + i,
        l: 99 + i,
      }));
      const wr = ind.WilliamsR(highData, 14);
      expect(wr).toBeGreaterThan(-20);
    });

    it('returns near -100 when price is at lows', () => {
      const lowData = Array.from({ length: 30 }, (_, i) => ({
        c: 200 - i,
        h: 201 - i,
        l: 199 - i,
      }));
      const wr = ind.WilliamsR(lowData, 14);
      expect(wr).toBeLessThan(-80);
    });
  });

  // -----------------------------------------------------------
  // ROC
  // -----------------------------------------------------------
  describe('ROC', () => {
    it('computes 20% rate of change correctly', () => {
      const prices = [100, 105, 110, 115, 120];
      const roc = ind.ROC(prices, 4);
      expect(roc).toBeApprox(20, 0.1);
    });
  });

  // -----------------------------------------------------------
  // Volatility
  // -----------------------------------------------------------
  describe('Volatility', () => {
    it('returns low volatility for a stable series', () => {
      const stable = Array.from({ length: 300 }, () => 100 + Math.random() * 0.5);
      const vol = ind.Volatility(stable, 252);
      expect(vol).toBeLessThan(5);
    });

    it('returns higher volatility for an oscillating series', () => {
      const stable = Array.from({ length: 300 }, () => 100 + Math.random() * 0.5);
      const volatile = Array.from({ length: 300 }, (_, i) => 100 + Math.sin(i / 3) * 20);

      const volStable = ind.Volatility(stable, 252);
      const volHigh = ind.Volatility(volatile, 252);
      expect(volHigh).toBeGreaterThan(volStable);
    });
  });

  // -----------------------------------------------------------
  // Max Drawdown
  // -----------------------------------------------------------
  describe('MaxDrawdown', () => {
    it('computes ~30% drawdown from 140 to 98', () => {
      const prices = [100, 110, 120, 130, 140, 130, 120, 110, 100, 98];
      const dd = ind.MaxDrawdown(prices, prices.length);
      expect(dd).toBeApprox(30, 1);
    });
  });

  // -----------------------------------------------------------
  // Days Above EMA
  // -----------------------------------------------------------
  describe('DaysAboveEMA', () => {
    it('returns high percentage for a consistent uptrend', () => {
      const prices = Array.from({ length: 300 }, (_, i) => 100 + i * 0.5);
      const daysAbove = ind.DaysAboveEMA(prices, 50, 200);
      expect(daysAbove).toBeGreaterThan(80);
    });
  });

  // -----------------------------------------------------------
  // Volume Ratio
  // -----------------------------------------------------------
  describe('VolumeRatio', () => {
    it('returns ratio > 1 for rising volume', () => {
      const volumes = Array.from({ length: 100 }, (_, i) => 10000 + i * 100);
      const ratio = ind.VolumeRatio(volumes, 20, 60);
      expect(ratio).toBeGreaterThan(1);
    });
  });

  // -----------------------------------------------------------
  // Input Validation
  // -----------------------------------------------------------
  describe('Input Validation', () => {
    it('throws on empty array', () => {
      expect(() => ind.SMA([], 5)).toThrow();
    });

    it('throws on array with NaN', () => {
      expect(() => ind.SMA([1, 2, NaN, 4, 5], 5)).toThrow();
    });

    it('throws on array with null', () => {
      expect(() => ind.RSI([100, 101, null, 103], 3)).toThrow();
    });

    it('throws on insufficient data length', () => {
      expect(() => ind.RSI([100, 101, 102], 14)).toThrow();
    });
  });
});
