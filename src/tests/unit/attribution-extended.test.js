/**
 * Attribution Analysis Extended Tests
 *
 * Covers _calculateFactorAttribution, calculateEventAttribution,
 * helper methods (_calculateSharpeRatio, _interpretBrinsonResults,
 * _groupByPeriod, _calculateMaxDrawdownInPeriod), and edge cases
 * for _calculatePositionReturn and _getCurrentPrice.
 */

import { describe, it, expect } from 'vitest';
import { AttributionAnalyzer } from '../../analytics/attribution-analysis.js';
import { buildAttributionFixtures } from '../helpers.js';

const analyzer = new AttributionAnalyzer();

// ---------- fixtures ----------
const { portfolio, portfolioReturns, benchmarkReturns } = buildAttributionFixtures();

const factorScores = {
  AAA: { trend: 30, momentum: 40, risk: 20, liquidity: 10 },
  BBB: { trend: 10, momentum: 20, risk: 40, liquidity: 30 },
};

// ---------- _calculateFactorAttribution ----------
describe('AttributionAnalyzer - _calculateFactorAttribution', () => {
  it('returns all four factor buckets with totals', () => {
    const result = analyzer._calculateFactorAttribution(portfolio, portfolioReturns, factorScores);

    expect(result.trend).toBeDefined();
    expect(result.momentum).toBeDefined();
    expect(result.risk).toBeDefined();
    expect(result.liquidity).toBeDefined();

    expect(result.trend.total_contribution).toBeTypeOf('number');
    expect(result.trend.top_contributors).toBeInstanceOf(Array);
  });

  it('includes summary percentages that sum close to 100', () => {
    const result = analyzer._calculateFactorAttribution(portfolio, portfolioReturns, factorScores);

    const { trend_pct, momentum_pct, risk_pct, liquidity_pct } = result.summary;
    const total = trend_pct + momentum_pct + risk_pct + liquidity_pct;

    // Percentages should sum to ~100 (small float tolerance)
    expect(total).toBeCloseTo(100, 0);
  });

  it('distributes contribution proportionally to factor scores', () => {
    const result = analyzer._calculateFactorAttribution(portfolio, portfolioReturns, factorScores);

    // AAA has trend=30, momentum=40 → momentum should get more from AAA
    const aaaInTrend = result.trend.top_contributors.find(c => c.ticker === 'AAA');
    const aaaInMomentum = result.momentum.top_contributors.find(c => c.ticker === 'AAA');

    if (aaaInTrend && aaaInMomentum) {
      // momentum proportion (40/100) > trend proportion (30/100) for AAA
      expect(Math.abs(aaaInMomentum.contribution)).toBeGreaterThanOrEqual(
        Math.abs(aaaInTrend.contribution) * 0.9
      );
    }
  });

  it('skips positions with zero total factor scores', () => {
    const zeroScores = {
      AAA: { trend: 0, momentum: 0, risk: 0, liquidity: 0 },
      BBB: { trend: 10, momentum: 20, risk: 30, liquidity: 40 },
    };

    const result = analyzer._calculateFactorAttribution(portfolio, portfolioReturns, zeroScores);

    // AAA should not appear in contributors (totalScore == 0)
    const aaaInTrend = result.trend.top_contributors.find(c => c.ticker === 'AAA');
    expect(aaaInTrend).toBeUndefined();

    // BBB should appear
    const bbbInTrend = result.trend.top_contributors.find(c => c.ticker === 'BBB');
    expect(bbbInTrend).toBeDefined();
  });

  it('handles missing factor scores for a position', () => {
    const partialScores = {
      AAA: { trend: 50, momentum: 50 },
      // BBB missing entirely
    };

    const result = analyzer._calculateFactorAttribution(portfolio, portfolioReturns, partialScores);

    // Should not throw and should have some contributions
    expect(result.trend).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  it('limits top_contributors to 5 entries', () => {
    // Create portfolio with many positions
    const manyPositions = {
      positions: Array.from({ length: 8 }, (_, i) => ({
        ticker: `POS_${i}`,
        name: `Position ${i}`,
        entry_price: 100,
        current_weight: 1 / 8,
        sector: 800,
      })),
    };

    const manyReturns = [
      {
        date: '2023-01-01',
        value: 100,
        positions: manyPositions.positions.map(p => ({ ticker: p.ticker, price: 100 })),
      },
      {
        date: '2023-01-03',
        value: 110,
        positions: manyPositions.positions.map(p => ({ ticker: p.ticker, price: 110 })),
      },
    ];

    const manyScores = {};
    manyPositions.positions.forEach(p => {
      manyScores[p.ticker] = { trend: 25, momentum: 25, risk: 25, liquidity: 25 };
    });

    const result = analyzer._calculateFactorAttribution(manyPositions, manyReturns, manyScores);
    expect(result.trend.top_contributors.length).toBeLessThanOrEqual(5);
  });
});

// ---------- calculateAttribution with factorScores ----------
describe('AttributionAnalyzer - calculateAttribution with factors', () => {
  it('includes factor attribution when factorScores provided', () => {
    const result = analyzer.calculateAttribution(
      portfolio, portfolioReturns, benchmarkReturns, factorScores
    );

    expect(result.factors).not.toBeNull();
    expect(result.factors.trend).toBeDefined();
    expect(result.factors.summary).toBeDefined();
  });

  it('sets factors to null when factorScores not provided', () => {
    const result = analyzer.calculateAttribution(
      portfolio, portfolioReturns, benchmarkReturns
    );

    expect(result.factors).toBeNull();
  });
});

// ---------- calculateEventAttribution ----------
describe('AttributionAnalyzer - calculateEventAttribution', () => {
  it('returns event analysis with correct fields', () => {
    const events = [
      {
        name: 'Market Rally',
        start_date: '2023-01-01',
        end_date: '2023-01-03',
        description: 'Short rally period',
      },
    ];

    const result = analyzer.calculateEventAttribution(portfolioReturns, benchmarkReturns, events);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].event_name).toBe('Market Rally');
    expect(result.events[0].portfolio_return).toBeTypeOf('number');
    expect(result.events[0].benchmark_return).toBeTypeOf('number');
    expect(result.events[0].excess_return).toBeTypeOf('number');
    expect(result.events[0].portfolio_max_drawdown).toBeTypeOf('number');
    expect(result.events[0].risk_adjusted_performance).toBeTypeOf('number');
  });

  it('provides summary with outperformed/underperformed counts', () => {
    const events = [
      { name: 'E1', start_date: '2023-01-01', end_date: '2023-01-03', description: 'Test' },
    ];

    const result = analyzer.calculateEventAttribution(portfolioReturns, benchmarkReturns, events);

    expect(result.summary.total_events).toBe(1);
    expect(result.summary.outperformed + result.summary.underperformed).toBe(1);
    expect(result.summary.average_excess_return).toBeTypeOf('number');
  });

  it('marks relative_performance correctly', () => {
    const events = [
      { name: 'E1', start_date: '2023-01-01', end_date: '2023-01-03', description: 'Test' },
    ];

    const result = analyzer.calculateEventAttribution(portfolioReturns, benchmarkReturns, events);
    const event = result.events[0];

    if (event.excess_return > 0) {
      expect(event.relative_performance).toBe('Outperformed');
    } else {
      expect(event.relative_performance).toBe('Underperformed');
    }
  });
});

// ---------- _interpretBrinsonResults ----------
describe('AttributionAnalyzer - _interpretBrinsonResults', () => {
  it('identifies allocation-driven positive return', () => {
    const interpretations = analyzer._interpretBrinsonResults(5, 2);
    expect(interpretations[0]).toContain('sector allocation');
    expect(interpretations[1]).toContain('Both allocation and selection contributed positively');
  });

  it('identifies selection-driven negative return', () => {
    const interpretations = analyzer._interpretBrinsonResults(-2, -5);
    expect(interpretations[0]).toContain('stock selection');
    expect(interpretations[1]).toContain('Both allocation and selection detracted');
  });

  it('identifies offsetting effects', () => {
    const interpretations = analyzer._interpretBrinsonResults(3, -5);
    expect(interpretations[1]).toContain('offset each other');
  });
});

// ---------- _calculateMaxDrawdownInPeriod ----------
describe('AttributionAnalyzer - _calculateMaxDrawdownInPeriod', () => {
  it('returns 0 for ascending values', () => {
    const returns = [
      { value: 100 }, { value: 105 }, { value: 110 },
    ];
    expect(analyzer._calculateMaxDrawdownInPeriod(returns)).toBe(0);
  });

  it('calculates correct drawdown', () => {
    const returns = [
      { value: 100 }, { value: 120 }, { value: 90 }, { value: 110 },
    ];
    // Peak 120, trough 90 → (90-120)/120 = -0.25
    const dd = analyzer._calculateMaxDrawdownInPeriod(returns);
    expect(dd).toBeCloseTo(-0.25, 4);
  });

  it('returns 0 for empty or short arrays', () => {
    expect(analyzer._calculateMaxDrawdownInPeriod([])).toBe(0);
    expect(analyzer._calculateMaxDrawdownInPeriod([{ value: 100 }])).toBe(0);
  });
});

// ---------- _calculateSharpeRatio ----------
describe('AttributionAnalyzer - _calculateSharpeRatio', () => {
  it('returns 0 for insufficient data', () => {
    expect(analyzer._calculateSharpeRatio([])).toBe(0);
    expect(analyzer._calculateSharpeRatio([{ value: 100 }])).toBe(0);
  });

  it('returns positive Sharpe for uptrending returns', () => {
    const returns = [
      { value: 100 }, { value: 102 }, { value: 104 },
      { value: 106 }, { value: 108 },
    ];
    const sharpe = analyzer._calculateSharpeRatio(returns);
    expect(sharpe).toBeGreaterThan(0);
  });

  it('returns negative Sharpe for downtrending returns', () => {
    const returns = [
      { value: 100 }, { value: 98 }, { value: 96 },
      { value: 94 }, { value: 92 },
    ];
    const sharpe = analyzer._calculateSharpeRatio(returns);
    expect(sharpe).toBeLessThan(0);
  });
});

// ---------- _groupByPeriod ----------
describe('AttributionAnalyzer - _groupByPeriod', () => {
  const returns = [
    { date: '2023-01-15', value: 100 },
    { date: '2023-01-20', value: 102 },
    { date: '2023-04-10', value: 105 },
    { date: '2023-07-05', value: 108 },
    { date: '2024-01-10', value: 112 },
  ];

  it('groups by month', () => {
    const groups = analyzer._groupByPeriod(returns, 'month');
    expect(groups['2023-01']).toHaveLength(2);
    expect(groups['2023-04']).toHaveLength(1);
  });

  it('groups by quarter', () => {
    const groups = analyzer._groupByPeriod(returns, 'quarter');
    expect(groups['2023-Q1']).toHaveLength(2);
    expect(groups['2023-Q2']).toHaveLength(1);
    expect(groups['2023-Q3']).toHaveLength(1);
  });

  it('groups by year', () => {
    const groups = analyzer._groupByPeriod(returns, 'year');
    expect(groups['2023']).toHaveLength(4);
    expect(groups['2024']).toHaveLength(1);
  });

  it('uses date as key for unknown period type', () => {
    const groups = analyzer._groupByPeriod(returns, 'unknown');
    expect(Object.keys(groups)).toHaveLength(5);
  });
});

// ---------- _getCurrentPrice ----------
describe('AttributionAnalyzer - _getCurrentPrice', () => {
  it('returns price from latest snapshot positions', () => {
    const position = { ticker: 'AAA', entry_price: 100 };
    const price = analyzer._getCurrentPrice(position, portfolioReturns);
    // Latest snapshot has AAA price 104
    expect(price).toBe(104);
  });

  it('falls back to entry_price when position not in snapshot', () => {
    const position = { ticker: 'MISSING', entry_price: 50 };
    const price = analyzer._getCurrentPrice(position, portfolioReturns);
    expect(price).toBe(50);
  });

  it('falls back to entry_price when no positions in snapshot', () => {
    const position = { ticker: 'AAA', entry_price: 100 };
    const returnsNoPositions = [
      { date: '2023-01-01', value: 100 },
    ];
    const price = analyzer._getCurrentPrice(position, returnsNoPositions);
    expect(price).toBe(100);
  });
});
