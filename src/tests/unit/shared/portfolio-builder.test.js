import { describe, expect, it } from 'vitest';

import {
  MIN_RISK_PRICE_POINTS,
  applyRegimeAdjustment,
  buildPortfolioModel,
  buildPortfolioSaveRequest,
  enrichAllocationWithScanData,
  validatePortfolioRequest,
} from '../../../shared/frontend/portfolio-builder.js';

it('adapts allocation to saved positions without losing capital, method or Yahoo symbols', () => {
  const portfolio = { method: 'score_weighted', totalCapital: 25000, allocation: [
    { ticker: 'SAN', yahooSymbol: 'SAN.MC', price: 5, weight: 0.4 },
    { ticker: 'AAPL', price: 200, weight: 0.6 },
  ] };
  const request = buildPortfolioSaveRequest(portfolio, 'balanced', '^IBEX');
  expect(request.assets.map(asset => asset.ticker)).toEqual(['SAN.MC', 'AAPL']);
  expect(request.assets.map(asset => asset.weight)).toEqual([0.4, 0.6]);
  expect(request.options).toEqual({ strategy: 'balanced', benchmark: '^IBEX',
    allocation_method: 'score_weighted', initial_capital: 25000 });
  expect(portfolio.allocation[0].ticker).toBe('SAN');
});

function priceSeries(length, seed) {
  return Array.from({ length }, (_, i) => ({
    date: new Date(Date.UTC(2024, 0, 1 + i)).toISOString().split('T')[0],
    close: 100 + Math.sin(i / (3 + seed)) * 5 + i * 0.1 * (seed + 1),
  }));
}

function scanResults(n, priceLength = 60) {
  return Array.from({ length: n }, (_, i) => ({
    ticker: `T${i}`,
    name: `Asset ${i}`,
    scoreTotal: 90 - i * 3,
    pricesWithDates: priceSeries(priceLength, i),
    details: { risk: { volatility: (15 + i).toFixed(2) } },
  }));
}

const baseOptions = {
  method: 'equal_weight',
  topN: 10,
  totalCapital: 10000,
  riskProfile: 'moderate',
  strategy: 'balanced',
};

describe('portfolio-builder shared service', () => {
  it('validates the scan results against topN', () => {
    expect(validatePortfolioRequest([], 5)).toEqual({ code: 'no_results' });
    expect(validatePortfolioRequest(scanResults(3), 5)).toEqual({ code: 'not_enough_assets', available: 3 });
    expect(validatePortfolioRequest(scanResults(5), 5)).toBeNull();
  });

  it('applies regime adjustments with 0–100 clamping and re-sorts without mutating input', () => {
    const assets = [
      { ticker: 'A', scoreTotal: 95 },
      { ticker: 'B', scoreTotal: 10 },
      { ticker: 'C', scoreTotal: 50 },
    ];
    expect(applyRegimeAdjustment(assets, { min_score: 10 }).map(a => [a.ticker, a.scoreTotal]))
      .toEqual([['A', 100], ['C', 60], ['B', 20]]);
    expect(applyRegimeAdjustment(assets, { min_score: -20 }).map(a => a.scoreTotal)).toEqual([75, 30, 0]);
    expect(assets[0].scoreTotal).toBe(95);
  });

  it('enriches positions with scan prices and falls back to a default volatility', () => {
    const results = [{ ticker: 'A', price: 12, yahooSymbol: 'A.MC', sectorRaw: 'Technology',
      pricesWithDates: [{ close: 1 }], details: { risk: { volatility: '30' } } }];
    const [known, unknown] = enrichAllocationWithScanData(
      [{ ticker: 'A', weight: 0.5, score: 85 }, { ticker: 'Z', weight: 0.5 }],
      results
    );
    expect(known).toMatchObject({ prices: [{ close: 1 }], volatility: '30', details: results[0].details });
    expect(known).toMatchObject({ price: 12, yahooSymbol: 'A.MC', sectorRaw: 'Technology', scoreTotal: 85 });
    expect(unknown).toMatchObject({ prices: [], volatility: '20', details: undefined });
  });

  it('builds a full portfolio model from the top N results', () => {
    const { portfolio } = buildPortfolioModel(scanResults(12), baseOptions);

    expect(portfolio.totalCapital).toBe(10000);
    expect(portfolio.allocation.map(a => a.ticker)).toEqual(scanResults(10).map(r => r.ticker));
    const totalWeight = portfolio.allocation.reduce((sum, a) => sum + a.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 5);
    expect(portfolio.allocation.every(a => a.prices.length === 60)).toBe(true);
    expect(portfolio.riskReport.meta).toEqual({ degraded: false, excludedAssets: [] });
    expect(portfolio.governanceReport).toBeDefined();
    expect(portfolio.complianceCheck).toHaveProperty('compliant');
  });

  it('applies governance corrections when the allocation breaches concentration limits', () => {
    // Three equal-weight positions (~33% each) exceed the 15% max position weight
    const { portfolio, violations, corrections } = buildPortfolioModel(scanResults(3), {
      ...baseOptions,
      topN: 3,
    });

    expect(portfolio.complianceCheck.compliant).toBe(false);
    expect(violations.length).toBeGreaterThan(0);
    expect(corrections.length).toBeGreaterThan(0);
    expect(violations).toEqual(portfolio.complianceCheck.violations);
    for (const position of portfolio.allocation) {
      expect(Number(position.recommended_capital)).toBeCloseTo(position.weight * 10000, 1);
    }
  });

  it('excludes assets with short history from the risk report but keeps them in the allocation', () => {
    const results = scanResults(10);
    results[4].pricesWithDates = priceSeries(MIN_RISK_PRICE_POINTS - 1, 4);

    const { portfolio } = buildPortfolioModel(results, baseOptions);

    expect(portfolio.riskReport.meta).toEqual({ degraded: true, excludedAssets: ['T4'] });
    expect(portfolio.allocation.map(a => a.ticker)).toContain('T4');
  });
});

it('keeps colliding display tickers distinct through allocation and save shaping', () => {
  const assets = scanResults(3).map((asset, index) => ({ ...asset, ticker: index < 2 ? 'SAN' : 'OTHER',
    yahooSymbol: ['SAN.MC', 'SAN', 'OTHER'][index], price: [5, 50, 100][index] }));
  const { portfolio } = buildPortfolioModel(assets, { ...baseOptions, topN: 3 });
  expect(portfolio.allocation.map(asset => [asset.yahooSymbol, asset.price])).toEqual([
    ['SAN.MC', 5], ['SAN', 50], ['OTHER', 100]
  ]);
  expect(buildPortfolioSaveRequest(portfolio).assets.map(asset => asset.ticker)).toEqual(['SAN.MC', 'SAN', 'OTHER']);
  expect(assets[0].ticker).toBe('SAN');
});

it.each([{ topN: 0 }, { topN: 1.5 }, { topN: NaN }, { totalCapital: 0 },
  { totalCapital: Infinity }, { method: 'unknown' }, { riskProfile: 'unknown' }])('rejects invalid builder inputs %o', patch => {
  expect(() => buildPortfolioModel(scanResults(10), { ...baseOptions, ...patch })).toThrow();
});

it('preserves construction corrections, exclusions and risk/regime context in the save contract', () => {
  const assets = scanResults(3);
  assets[0].pricesWithDates = [];
  const built = buildPortfolioModel(assets, { ...baseOptions, topN: 3, regimeAdjustment: { min_score: 5 } });
  const request = buildPortfolioSaveRequest(built.portfolio);
  expect(request.options.construction_report).toEqual({ risk_profile: 'moderate',
    regime_adjustment: { min_score: 5 }, corrections: built.corrections, violations: built.violations,
    risk_excluded_assets: ['T0'] });
});
