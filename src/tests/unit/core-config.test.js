import { describe, it, expect } from 'vitest';
import {
  BACKTESTING_CONFIG,
  STRATEGY_PROFILES,
  MARKET_BENCHMARKS,
} from '../../core/config.js';

// -----------------------------------------------------------
// BACKTESTING_CONFIG
// -----------------------------------------------------------
describe('BACKTESTING_CONFIG', () => {
  it('has initial capital set', () => {
    expect(BACKTESTING_CONFIG.INITIAL_CAPITAL).toBe(10000);
  });

  it('has trading days per year set', () => {
    expect(BACKTESTING_CONFIG.TRADING_DAYS_PER_YEAR).toBe(252);
  });
});

// -----------------------------------------------------------
// STRATEGY_PROFILES
// -----------------------------------------------------------
describe('STRATEGY_PROFILES', () => {
  const profileKeys = ['momentum_aggressive', 'trend_conservative', 'balanced', 'sector_rotation'];

  it('defines all 4 strategy profiles', () => {
    profileKeys.forEach((key) => {
      expect(STRATEGY_PROFILES[key]).toBeDefined();
    });
  });

  profileKeys.forEach((key) => {
    describe(`${key}`, () => {
      const profile = STRATEGY_PROFILES[key];

      it('has name and description getters', () => {
        expect(typeof profile.name).toBe('string');
        expect(profile.name.length).toBeGreaterThan(0);
        expect(typeof profile.description).toBe('string');
        expect(profile.description.length).toBeGreaterThan(0);
      });

      it('has weights that sum to ~1.0', () => {
        const weights = profile.weights;
        expect(weights.trend).toBeDefined();
        expect(weights.momentum).toBeDefined();
        expect(weights.risk).toBeDefined();
        expect(weights.liquidity).toBeDefined();

        const sum = weights.trend + weights.momentum + weights.risk + weights.liquidity;
        expect(sum).toBeCloseTo(1.0, 2);
      });

      it('has all required indicator parameters', () => {
        const ind = profile.indicators;
        expect(ind.ema_short).toBeDefined();
        expect(ind.ema_medium).toBeDefined();
        expect(ind.ema_long).toBeDefined();
        expect(ind.rsi_period).toBeDefined();
        expect(ind.atr_period).toBeDefined();
        expect(ind.bb_period).toBeDefined();
        expect(ind.adx_period).toBeDefined();
        expect(ind.williams_period).toBeDefined();
        expect(ind.roc_short).toBeDefined();
        expect(ind.roc_long).toBeDefined();
      });

      it('has all required filter parameters', () => {
        const filters = profile.filters;
        expect(filters.min_volume_20d).toBeGreaterThan(0);
        expect(filters.min_volume_60d).toBeGreaterThan(0);
        expect(filters.max_atr_pct).toBeGreaterThan(0);
        expect(filters.min_days_history).toBeGreaterThan(0);
        expect(filters.max_drawdown_52w).toBeGreaterThan(0);
      });

      it('has all required signal thresholds', () => {
        const signals = profile.signals;
        expect(signals.strong_buy).toBeGreaterThan(signals.buy);
        expect(signals.buy).toBeGreaterThan(signals.hold_upper);
        expect(signals.hold_upper).toBeGreaterThanOrEqual(signals.hold_lower);
      });
    });
  });

  it('momentum_aggressive emphasizes momentum weight', () => {
    const weights = STRATEGY_PROFILES.momentum_aggressive.weights;
    expect(weights.momentum).toBeGreaterThan(weights.trend);
    expect(weights.momentum).toBeGreaterThan(weights.risk);
    expect(weights.momentum).toBeGreaterThan(weights.liquidity);
  });

  it('trend_conservative emphasizes trend weight', () => {
    const weights = STRATEGY_PROFILES.trend_conservative.weights;
    expect(weights.trend).toBeGreaterThan(weights.momentum);
    expect(weights.trend).toBeGreaterThan(weights.risk);
    expect(weights.trend).toBeGreaterThan(weights.liquidity);
  });

  it('balanced has roughly equal trend and momentum', () => {
    const weights = STRATEGY_PROFILES.balanced.weights;
    expect(Math.abs(weights.trend - weights.momentum)).toBeLessThanOrEqual(0.05);
  });

  it('sector_rotation uses shorter ROC periods', () => {
    const ind = STRATEGY_PROFILES.sector_rotation.indicators;
    expect(ind.roc_short).toBeLessThan(STRATEGY_PROFILES.balanced.indicators.roc_short);
    expect(ind.roc_long).toBeLessThan(STRATEGY_PROFILES.balanced.indicators.roc_long);
  });

  it('sector_rotation has stricter volume filters', () => {
    const filters = STRATEGY_PROFILES.sector_rotation.filters;
    expect(filters.min_volume_20d).toBeGreaterThan(
      STRATEGY_PROFILES.balanced.filters.min_volume_20d,
    );
  });
});

// -----------------------------------------------------------
// MARKET_BENCHMARKS
// -----------------------------------------------------------
describe('MARKET_BENCHMARKS', () => {
  it('maps exchange suffixes to benchmark tickers', () => {
    expect(MARKET_BENCHMARKS['.MC']).toBe('^IBEX');
    expect(MARKET_BENCHMARKS['.PA']).toBe('^FCHI');
    expect(MARKET_BENCHMARKS['.DE']).toBe('^GDAXI');
    expect(MARKET_BENCHMARKS['.L']).toBe('^FTSE');
    expect(MARKET_BENCHMARKS['.MI']).toBe('FTSEMIB.MI');
  });

  it('uses S&P 500 as default for US stocks', () => {
    expect(MARKET_BENCHMARKS['']).toBe('^GSPC');
  });

  it('covers major Asian markets', () => {
    expect(MARKET_BENCHMARKS['.T']).toBe('^N225');
    expect(MARKET_BENCHMARKS['.HK']).toBe('^HSI');
    expect(MARKET_BENCHMARKS['.SS']).toBe('000001.SS');
    expect(MARKET_BENCHMARKS['.SZ']).toBe('399001.SZ');
    expect(MARKET_BENCHMARKS['.KS']).toBe('^KS11');
  });

  it('covers Latin American markets', () => {
    expect(MARKET_BENCHMARKS['.SA']).toBe('^BVSP');
    expect(MARKET_BENCHMARKS['.MX']).toBe('^MXX');
  });

  it('covers Canadian market', () => {
    expect(MARKET_BENCHMARKS['.TO']).toBe('^GSPTSE');
  });
});
