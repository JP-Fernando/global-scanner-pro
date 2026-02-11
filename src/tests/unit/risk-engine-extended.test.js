/**
 * Risk Engine Extended Tests
 *
 * Additional tests for uncovered functions: calculatePortfolioMetrics,
 * runStressTest, generateRiskReport.
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePortfolioVaR,
  calculatePortfolioCVaR,
  calculateCorrelationMatrix,
  calculatePortfolioMetrics,
  runStressTest,
  generateRiskReport,
} from '../../analytics/risk_engine.js';
import { buildAssetSeries } from '../helpers.js';

// Helper: build aligned asset data with proper date/close format
function buildRiskAssets(count = 3, days = 60) {
  const tickers = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE'].slice(0, count);
  const weight = 1 / count;
  return tickers.map((ticker, idx) => ({
    ticker,
    weight,
    prices: buildAssetSeries(ticker, 100 + idx * 20, days).map(p => ({
      date: p.date,
      close: p.close,
    })),
  }));
}

describe('Risk Engine - Extended', () => {
  // -----------------------------------------------------------
  // calculatePortfolioMetrics
  // -----------------------------------------------------------
  describe('calculatePortfolioMetrics', () => {
    it('returns varMetrics, cvarMetrics, and correlationData', () => {
      const assets = buildRiskAssets(2, 60);
      const result = calculatePortfolioMetrics(assets, 10000, 0.95);

      expect(result.varMetrics).toBeDefined();
      expect(result.cvarMetrics).toBeDefined();
      expect(result.correlationData).toBeDefined();
    });

    it('VaR and CVaR produce numeric values', () => {
      const assets = buildRiskAssets(2, 60);
      const result = calculatePortfolioMetrics(assets, 50000, 0.99);

      expect(parseFloat(result.varMetrics.diversifiedVaR)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(result.cvarMetrics.cvar)).toBeGreaterThanOrEqual(0);
    });

    it('uses default capital of 10000 when not specified', () => {
      const assets = buildRiskAssets(2, 60);
      const result = calculatePortfolioMetrics(assets);

      expect(result.varMetrics).toBeDefined();
    });
  });

  // -----------------------------------------------------------
  // CVaR additional tests
  // -----------------------------------------------------------
  describe('calculatePortfolioCVaR', () => {
    it('returns error message for insufficient data', () => {
      const shortAssets = [
        { ticker: 'X', weight: 0.5, prices: [{ date: '2023-01-01', close: 100 }] },
        { ticker: 'Y', weight: 0.5, prices: [{ date: '2023-01-01', close: 200 }] },
      ];

      const result = calculatePortfolioCVaR(shortAssets, 10000, 0.95);
      expect(result.error).toBeDefined();
    });

    it('CVaR is at least as large as VaR', () => {
      const assets = buildRiskAssets(2, 60);
      const var95 = calculatePortfolioVaR(assets, 10000, 0.95);
      const cvar95 = calculatePortfolioCVaR(assets, 10000, 0.95);

      // CVaR (expected shortfall) >= VaR by definition
      expect(parseFloat(cvar95.cvar)).toBeGreaterThanOrEqual(parseFloat(var95.diversifiedVaR) - 0.01);
    });

    it('returns confidence level in result', () => {
      const assets = buildRiskAssets(2, 60);
      const result = calculatePortfolioCVaR(assets, 10000, 0.99);
      expect(result.confidence).toBe('99');
    });
  });

  // -----------------------------------------------------------
  // Correlation matrix additional
  // -----------------------------------------------------------
  describe('calculateCorrelationMatrix - extended', () => {
    it('returns empty for insufficient data', () => {
      const result = calculateCorrelationMatrix([]);
      expect(result.matrix).toEqual([]);
    });

    it('includes stats with average, max, and min', () => {
      const assets = buildRiskAssets(3, 60);
      const result = calculateCorrelationMatrix(assets);

      expect(result.stats.average).toBeDefined();
      expect(result.stats.max).toBeDefined();
      expect(result.stats.min).toBeDefined();
    });

    it('returns rawDistanceMatrix', () => {
      const assets = buildRiskAssets(2, 60);
      const result = calculateCorrelationMatrix(assets);
      expect(result.rawDistanceMatrix).toBeDefined();
    });
  });

  // -----------------------------------------------------------
  // runStressTest
  // -----------------------------------------------------------
  describe('runStressTest', () => {
    const portfolio = [
      {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        volatility: 25,
        weight: 0.4,
        recommended_capital: 4000,
      },
      {
        ticker: 'JPM',
        name: 'JPMorgan Chase',
        volatility: 22,
        weight: 0.3,
        recommended_capital: 3000,
      },
      {
        ticker: 'JNJ',
        name: 'Johnson & Johnson',
        volatility: 15,
        weight: 0.3,
        recommended_capital: 3000,
      },
    ];

    it('returns 4 stress scenarios', () => {
      const results = runStressTest(portfolio, 10000);
      expect(results).toHaveLength(4);
    });

    it('each scenario has required fields', () => {
      const results = runStressTest(portfolio, 10000);
      results.forEach(scenario => {
        expect(scenario.scenario).toBeTypeOf('string');
        expect(scenario.description).toBeTypeOf('string');
        expect(scenario.marketDrop).toBeTypeOf('string');
        expect(scenario.estimatedLoss).toBeTypeOf('string');
        expect(scenario.lossPct).toBeTypeOf('string');
        expect(scenario.remainingCapital).toBeTypeOf('string');
        expect(scenario.topImpacts).toBeDefined();
      });
    });

    it('losses increase with severity', () => {
      const results = runStressTest(portfolio, 10000);
      const losses = results.map(r => parseFloat(r.estimatedLoss));

      // Each scenario should have a larger loss than the previous
      for (let i = 1; i < losses.length; i++) {
        expect(losses[i]).toBeGreaterThanOrEqual(losses[i - 1]);
      }
    });

    it('remaining capital decreases with severity', () => {
      const results = runStressTest(portfolio, 10000);
      const remaining = results.map(r => parseFloat(r.remainingCapital));

      for (let i = 1; i < remaining.length; i++) {
        expect(remaining[i]).toBeLessThanOrEqual(remaining[i - 1]);
      }
    });

    it('topImpacts has at most 3 entries', () => {
      const results = runStressTest(portfolio, 10000);
      results.forEach(r => {
        expect(r.topImpacts.length).toBeLessThanOrEqual(3);
      });
    });

    it('handles portfolio with missing volatility (defaults to 20)', () => {
      const noVol = [
        { ticker: 'X', weight: 1, recommended_capital: 10000 },
      ];
      const results = runStressTest(noVol, 10000);
      expect(results).toHaveLength(4);
      // volatility defaults to 20 via `parseFloat(asset.volatility || 20)`
      // beta = 20/15 ≈ 1.33, so losses should be non-zero
      expect(parseFloat(results[0].estimatedLoss)).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------
  // generateRiskReport
  // -----------------------------------------------------------
  describe('generateRiskReport', () => {
    const portfolio = buildRiskAssets(3, 60).map(a => ({
      ...a,
      name: `Asset ${a.ticker}`,
      volatility: 20,
      recommended_capital: 3333,
    }));

    it('returns a complete risk report', () => {
      const report = generateRiskReport(portfolio, 10000);

      expect(report.portfolioVaR).toBeDefined();
      expect(report.portfolioVaR.diversifiedVaR).toBeDefined();
      expect(report.portfolioVaR.cvar).toBeDefined();
      expect(report.correlationData).toBeDefined();
      expect(report.stressTests).toBeDefined();
      expect(report.riskMetrics).toBeDefined();
    });

    it('identifies riskiest asset', () => {
      const mixedPortfolio = [
        { ticker: 'HV', name: 'High Vol', weight: 0.3, volatility: 40, recommended_capital: 3000,
          prices: buildAssetSeries('HV', 100, 60).map(p => ({ date: p.date, close: p.close })) },
        { ticker: 'LV', name: 'Low Vol', weight: 0.7, volatility: 10, recommended_capital: 7000,
          prices: buildAssetSeries('LV', 100, 60).map(p => ({ date: p.date, close: p.close })) },
      ];

      const report = generateRiskReport(mixedPortfolio, 10000);
      expect(report.riskMetrics.riskiestAsset.ticker).toBe('HV');
    });

    it('calculates concentration risk', () => {
      const report = generateRiskReport(portfolio, 10000);
      expect(report.riskMetrics.concentrationRisk).toBeDefined();
    });

    it('includes diversification score', () => {
      const report = generateRiskReport(portfolio, 10000);
      expect(report.riskMetrics.diversificationScore).toBeDefined();
    });

    it('returns safe fallback on error', () => {
      // Pass invalid portfolio to trigger error path
      const report = generateRiskReport(null, 10000);
      expect(report.portfolioVaR.error).toBeDefined();
      expect(report.stressTests).toEqual([]);
    });
  });
});
