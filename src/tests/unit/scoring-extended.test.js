import { describe, it, expect } from 'vitest';
import {
  normalizeToPercentile,
  calculateAlpha,
  calculateRelativeVolatility,
  calculateShortTermScore,
  calculateMediumTermScore,
  calculateLongTermScore,
  calculateTrendScore,
  calculateMomentumScore,
  calculateRiskScore,
  calculateLiquidityScore,
  applyHardFilters,
  calculateFinalScore,
  generateSignal,
} from '../../indicators/scoring.js';
import { buildStrategyConfig } from '../helpers.js';

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function buildPrices(days, startPrice = 100, trend = 0.002) {
  const prices = [];
  let price = startPrice;
  for (let i = 0; i < days; i++) {
    price *= 1 + trend + (Math.random() - 0.48) * 0.01;
    prices.push(price);
  }
  return prices;
}

function buildOHLCV(days, startPrice = 100) {
  const data = [];
  let close = startPrice;
  for (let i = 0; i < days; i++) {
    close *= 1 + (Math.random() - 0.48) * 0.02;
    data.push({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      close,
      high: close * 1.01,
      low: close * 0.99,
      volume: 50000 + Math.random() * 50000,
    });
  }
  return data;
}

function buildVolumes(days, baseVol = 50000) {
  return Array.from({ length: days }, () => baseVol + Math.random() * 30000);
}

// -----------------------------------------------------------
// normalizeToPercentile
// -----------------------------------------------------------
describe('normalizeToPercentile', () => {
  it('returns 100 for the maximum value', () => {
    const result = normalizeToPercentile(10, [1, 2, 3, 10]);
    expect(result).toBe(100);
  });

  it('returns 25 for the minimum of 4 values', () => {
    const result = normalizeToPercentile(1, [1, 2, 3, 4]);
    expect(result).toBe(25);
  });

  it('handles single value array', () => {
    const result = normalizeToPercentile(5, [5]);
    expect(result).toBe(100);
  });
});

// -----------------------------------------------------------
// calculateAlpha / calculateRelativeVolatility
// -----------------------------------------------------------
describe('calculateAlpha', () => {
  it('returns the difference between asset and benchmark ROC', () => {
    expect(calculateAlpha(15, 10)).toBe(5);
    expect(calculateAlpha(10, 15)).toBe(-5);
    expect(calculateAlpha(0, 0)).toBe(0);
  });
});

describe('calculateRelativeVolatility', () => {
  it('returns ratio of asset to benchmark volatility', () => {
    expect(calculateRelativeVolatility(20, 20)).toBe(1.0);
    expect(calculateRelativeVolatility(40, 20)).toBe(2.0);
  });

  it('returns 1.0 when benchmark volatility is 0', () => {
    expect(calculateRelativeVolatility(20, 0)).toBe(1.0);
  });
});

// -----------------------------------------------------------
// calculateShortTermScore
// -----------------------------------------------------------
describe('calculateShortTermScore', () => {
  it('returns a score between 0 and 100', () => {
    const prices = buildPrices(200);
    const volumes = buildVolumes(200);
    const score = calculateShortTermScore(null, prices, volumes);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('handles short price arrays gracefully', () => {
    const prices = buildPrices(10);
    const volumes = buildVolumes(10);
    const score = calculateShortTermScore(null, prices, volumes);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('handles short volume arrays', () => {
    const prices = buildPrices(50);
    const volumes = buildVolumes(10);
    const score = calculateShortTermScore(null, prices, volumes);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// -----------------------------------------------------------
// calculateMediumTermScore
// -----------------------------------------------------------
describe('calculateMediumTermScore', () => {
  it('returns a score between 0 and 100', () => {
    const prices = buildPrices(400);
    const score = calculateMediumTermScore(null, prices);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('handles prices too short for EMA200', () => {
    const prices = buildPrices(60);
    const score = calculateMediumTermScore(null, prices);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('handles prices too short for ROC 126', () => {
    const prices = buildPrices(50);
    const score = calculateMediumTermScore(null, prices);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// -----------------------------------------------------------
// calculateLongTermScore
// -----------------------------------------------------------
describe('calculateLongTermScore', () => {
  it('returns a score between 0 and 100', () => {
    const prices = buildPrices(500);
    const score = calculateLongTermScore(null, prices);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('handles insufficient data for ROC 252', () => {
    const prices = buildPrices(100);
    const score = calculateLongTermScore(null, prices);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('handles insufficient data for DaysAboveEMA', () => {
    const prices = buildPrices(300);
    const score = calculateLongTermScore(null, prices);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// -----------------------------------------------------------
// calculateTrendScore
// -----------------------------------------------------------
describe('calculateTrendScore', () => {
  it('returns score and details', () => {
    const data = buildOHLCV(300);
    const prices = data.map((d) => d.close);
    const config = { ...buildStrategyConfig().indicators, ema_medium: 50, ema_long: 200, adx_period: 14 };

    const result = calculateTrendScore(data, prices, config);
    expect(typeof result.score).toBe('number');
    expect(result.details).toBeDefined();
  });

  it('returns error details with insufficient data', () => {
    const data = buildOHLCV(5);
    const prices = data.map((d) => d.close);
    const config = { ema_medium: 50, ema_long: 200, adx_period: 14 };

    const result = calculateTrendScore(data, prices, config);
    expect(result.score).toBe(0);
    expect(result.details.error).toBeDefined();
  });

  it('handles data with only EMA50 available', () => {
    const data = buildOHLCV(100);
    const prices = data.map((d) => d.close);
    const config = { ema_medium: 50, ema_long: 200, adx_period: 14 };

    const result = calculateTrendScore(data, prices, config);
    expect(typeof result.score).toBe('number');
  });
});

// -----------------------------------------------------------
// calculateMomentumScore
// -----------------------------------------------------------
describe('calculateMomentumScore', () => {
  it('returns score and details with benchmark', () => {
    const prices = buildPrices(300);
    const config = buildStrategyConfig().indicators;

    const result = calculateMomentumScore(prices, config, 10, 15);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.details.mom6Score).toBeDefined();
    expect(result.details.mom12Score).toBeDefined();
    expect(result.details.thrustScore).toBeDefined();
    expect(result.details.rsiScore).toBeDefined();
    expect(result.details.alpha6m).toBeDefined();
  });

  it('uses asset ROC as alpha when no benchmark', () => {
    const prices = buildPrices(300);
    const config = buildStrategyConfig().indicators;

    const result = calculateMomentumScore(prices, config, null, null);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('handles short data gracefully', () => {
    const prices = buildPrices(10);
    const config = buildStrategyConfig().indicators;

    const result = calculateMomentumScore(prices, config);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// -----------------------------------------------------------
// calculateRiskScore
// -----------------------------------------------------------
describe('calculateRiskScore', () => {
  it('returns score and details', () => {
    const data = buildOHLCV(300);
    const prices = data.map((d) => d.close);
    const config = buildStrategyConfig().indicators;

    const result = calculateRiskScore(data, prices, config);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.details.atrScore).toBeDefined();
    expect(result.details.volScore).toBeDefined();
    expect(result.details.ddScore).toBeDefined();
  });

  it('uses benchmark volatility when provided', () => {
    const data = buildOHLCV(300);
    const prices = data.map((d) => d.close);
    const config = buildStrategyConfig().indicators;

    const result = calculateRiskScore(data, prices, config, 15);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('handles short data', () => {
    const data = buildOHLCV(10);
    const prices = data.map((d) => d.close);
    const config = buildStrategyConfig().indicators;

    const result = calculateRiskScore(data, prices, config);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// -----------------------------------------------------------
// calculateLiquidityScore
// -----------------------------------------------------------
describe('calculateLiquidityScore', () => {
  it('returns score and details', () => {
    const volumes = buildVolumes(100, 50000);
    const config = buildStrategyConfig().filters;

    const result = calculateLiquidityScore(volumes, config);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.details.vol20Score).toBeDefined();
    expect(result.details.vol60Score).toBeDefined();
    expect(result.details.ratioScore).toBeDefined();
  });

  it('scores high for abundant volume', () => {
    const volumes = buildVolumes(100, 500000);
    const config = { min_volume_20d: 5000, min_volume_60d: 2000 };

    const result = calculateLiquidityScore(volumes, config);
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it('handles short volume array', () => {
    const volumes = buildVolumes(10);
    const config = buildStrategyConfig().filters;

    const result = calculateLiquidityScore(volumes, config);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// -----------------------------------------------------------
// applyHardFilters
// -----------------------------------------------------------
describe('applyHardFilters', () => {
  it('rejects insufficient price history', () => {
    const data = buildOHLCV(10);
    const prices = data.map((d) => d.close);
    const volumes = data.map((d) => d.volume);
    const config = buildStrategyConfig().filters;

    const result = applyHardFilters(data, prices, volumes, config);
    expect(result.passed).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('passes valid data', () => {
    const data = buildOHLCV(200);
    const prices = data.map((d) => d.close);
    const volumes = Array(200).fill(100000);
    const config = { ...buildStrategyConfig().filters, min_days_history: 15 };

    const result = applyHardFilters(data, prices, volumes, config);
    expect(result.passed).toBe(true);
  });

  it('rejects critically illiquid assets (volume < 1000)', () => {
    const data = buildOHLCV(50);
    const prices = data.map((d) => d.close);
    const volumes = Array(50).fill(500); // Very low volume
    const config = { ...buildStrategyConfig().filters, min_days_history: 15 };

    const result = applyHardFilters(data, prices, volumes, config);
    expect(result.passed).toBe(false);
  });

  it('passes but warns for low volume (above 1000 but below threshold)', () => {
    const data = buildOHLCV(50);
    const prices = data.map((d) => d.close);
    const volumes = Array(50).fill(2000); // Low but not critical
    const config = { ...buildStrategyConfig().filters, min_days_history: 15, min_volume_20d: 5000 };

    const result = applyHardFilters(data, prices, volumes, config);
    expect(result.passed).toBe(true);
    expect(result.reasons.some((r) => r.includes('Volumen bajo'))).toBe(true);
  });

  it('adds drawdown warning but does not reject', () => {
    // Build data with a clear drawdown pattern
    const data = [];
    for (let i = 0; i < 150; i++) {
      const close = i < 50 ? 100 + i : 150 - (i - 50) * 1.5;
      data.push({
        close: Math.max(close, 10),
        high: Math.max(close, 10) * 1.01,
        low: Math.max(close, 10) * 0.99,
        volume: 100000,
      });
    }
    const prices = data.map((d) => d.close);
    const volumes = data.map((d) => d.volume);
    const config = { ...buildStrategyConfig().filters, min_days_history: 15, max_drawdown_52w: 10 };

    const result = applyHardFilters(data, prices, volumes, config);
    // Deep drawdown should not reject, just warn
    expect(result.passed).toBe(true);
    expect(result.reasons.some((r) => r.includes('DD Profundo'))).toBe(true);
  });
});

// -----------------------------------------------------------
// calculateFinalScore
// -----------------------------------------------------------
describe('calculateFinalScore', () => {
  it('calculates weighted final score', () => {
    const weights = { trend: 0.3, momentum: 0.3, risk: 0.2, liquidity: 0.2 };
    const score = calculateFinalScore(80, 70, 60, 50, weights);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('returns 100 for all 100 scores', () => {
    const weights = { trend: 0.25, momentum: 0.25, risk: 0.25, liquidity: 0.25 };
    const score = calculateFinalScore(100, 100, 100, 100, weights);
    expect(score).toBe(100);
  });

  it('returns 0 for all 0 scores', () => {
    const weights = { trend: 0.3, momentum: 0.3, risk: 0.2, liquidity: 0.2 };
    const score = calculateFinalScore(0, 0, 0, 0, weights);
    expect(score).toBe(0);
  });

  it('clamps to 0-100 range', () => {
    const weights = { trend: 0.3, momentum: 0.3, risk: 0.2, liquidity: 0.2 };
    const score = calculateFinalScore(150, 150, 150, 150, weights);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// -----------------------------------------------------------
// generateSignal
// -----------------------------------------------------------
describe('generateSignal', () => {
  // We need signal thresholds from the strategy
  const signalConfig = {
    strong_buy: 80,
    buy: 65,
    hold_upper: 45,
    hold_lower: 35,
  };

  it('returns strong_buy for score >= strong_buy threshold', () => {
    const signal = generateSignal(85, signalConfig);
    expect(signal.key).toBe('strong_buy');
    expect(signal.confidence).toBe(95);
  });

  it('returns buy for score >= buy threshold', () => {
    const signal = generateSignal(70, signalConfig);
    expect(signal.key).toBe('buy');
    expect(signal.confidence).toBe(75);
  });

  it('returns hold_upper for score >= hold_upper threshold', () => {
    const signal = generateSignal(50, signalConfig);
    expect(signal.key).toBe('hold_upper');
    expect(signal.confidence).toBe(55);
  });

  it('returns hold for score >= hold_lower threshold', () => {
    const signal = generateSignal(40, signalConfig);
    expect(signal.key).toBe('hold');
    expect(signal.confidence).toBe(40);
  });

  it('returns sell for low score', () => {
    const signal = generateSignal(20, signalConfig);
    expect(signal.key).toBe('sell');
    expect(signal.confidence).toBe(25);
  });
});
