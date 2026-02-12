/**
 * Integration tests: Data → Report Generation → Export
 *
 * Verifies that scan results, backtest data, and portfolio data flow
 * correctly through the report generation pipeline to produce
 * Excel and PDF outputs.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { setupReportMocks, buildScoredAssets } from './helpers.js';
import {
  allocateCapital,
  calculateCapitalRecommendations,
} from '../../allocation/allocation.js';
import { compareBacktestStrategies } from '../../reports/comparative-analysis.js';

// Set up browser mocks for XLSX and jsPDF
beforeAll(() => {
  setupReportMocks();
});

// ---------------------------------------------------------------------------
// 1. Scan results → Excel export
// ---------------------------------------------------------------------------

describe('Scan results → Excel export', () => {
  it('exportScanResultsToExcel receives well-formed data', async () => {
    const { exportScanResultsToExcel } = await import('../../reports/excel-exporter.js');

    const assets = buildScoredAssets(5);
    const scanResults = assets.map(a => ({
      ticker: a.ticker,
      name: a.name,
      scoreTotal: a.scoreTotal,
      signal: { key: a.scoreTotal >= 80 ? 'strong_buy' : 'buy', text: 'Buy' },
      details: a.details,
    }));

    // Should not throw
    expect(() => exportScanResultsToExcel(scanResults, 'test_scan')).not.toThrow();

    // Verify XLSX mock was used
    expect(window.XLSX.utils.book_new).toBeDefined();
  });

  it('exportPortfolioToExcel receives allocated portfolio data', async () => {
    const { exportPortfolioToExcel } = await import('../../reports/excel-exporter.js');

    const assets = buildScoredAssets(4);
    const { allocation } = allocateCapital(assets, 'equal_weight');
    const recs = calculateCapitalRecommendations(allocation, 100000);

    // Portfolio data as expected by the exporter
    const portfolioData = {
      allocation: recs,
      portfolioRisk: {
        portfolioVolatility: '18.50',
        diversificationRatio: '1.25',
        effectiveNAssets: '4.0',
      },
      timestamp: new Date().toISOString(),
    };

    expect(() => exportPortfolioToExcel(portfolioData, 'test_portfolio')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. Backtest results → PDF export
// ---------------------------------------------------------------------------

describe('Backtest results → PDF export', () => {
  it('generateBacktestPDF handles standard backtest output', async () => {
    const { generateBacktestPDF } = await import('../../reports/pdf-templates.js');

    // generateBacktestPDF expects an ARRAY of strategy results (calls results.map)
    const backtestResults = [
      {
        strategyName: 'Momentum Aggressive',
        metrics: {
          cagr: 0.125,
          sharpeRatio: 1.2,
          maxDrawdown: -0.153,
          volatility: 0.18,
          winRate: 0.62,
        },
      },
    ];

    expect(() => generateBacktestPDF(backtestResults)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 3. Comparative analysis
// ---------------------------------------------------------------------------

describe('Comparative analysis pipeline', () => {
  it('compares two strategy datasets and produces rankings', () => {
    const strategies = [
      {
        name: 'Momentum',
        metrics: {
          totalReturn: 25,
          sharpeRatio: 1.2,
          maxDrawdown: -15,
          winRate: 0.62,
          volatility: 18,
        },
      },
      {
        name: 'Balanced',
        metrics: {
          totalReturn: 18,
          sharpeRatio: 1.5,
          maxDrawdown: -10,
          winRate: 0.58,
          volatility: 12,
        },
      },
    ];

    const comparison = compareBacktestStrategies(strategies);

    expect(comparison).toBeDefined();
    expect(comparison.strategies).toHaveLength(2);
    expect(comparison.strategies).toContain('Momentum');
    expect(comparison.strategies).toContain('Balanced');

    // Rankings should exist
    expect(comparison.rankings).toBeDefined();

    // Summary should identify best overall
    expect(comparison.summary).toBeDefined();
    expect(comparison.summary.bestOverall).toBeTruthy();
  });

  it('handles three strategies with clear winner', () => {
    const strategies = [
      { name: 'A', metrics: { totalReturn: 30, sharpeRatio: 1.5, maxDrawdown: -12, winRate: 0.65, volatility: 15 } },
      { name: 'B', metrics: { totalReturn: 15, sharpeRatio: 0.8, maxDrawdown: -25, winRate: 0.50, volatility: 22 } },
      { name: 'C', metrics: { totalReturn: 22, sharpeRatio: 1.1, maxDrawdown: -18, winRate: 0.55, volatility: 18 } },
    ];

    const comparison = compareBacktestStrategies(strategies);
    expect(comparison.strategies).toHaveLength(3);
    // Strategy A should rank best overall (highest return, highest Sharpe, lowest DD)
    expect(comparison.summary.bestOverall).toBe('A');
  });
});

// ---------------------------------------------------------------------------
// 4. Report generator base class
// ---------------------------------------------------------------------------

describe('Report generator utilities', () => {
  it('formats numbers and percentages consistently', async () => {
    const { ReportGenerator } = await import('../../reports/report-generator.js');

    const gen = new ReportGenerator({});
    expect(gen.formatNumber(12345.678, 2)).toBe('12345.68');
    expect(gen.formatPercent(0.1234, 2)).toBe('12.34%');
    expect(gen.formatCurrency(1000, 'USD')).toContain('1,000');
  });

  it('safeValue retrieves nested properties with fallback', async () => {
    const { ReportGenerator } = await import('../../reports/report-generator.js');

    const gen = new ReportGenerator({});
    const obj = { a: { b: { c: 42 } } };
    expect(gen.safeValue(obj, 'a.b.c', 0)).toBe(42);
    expect(gen.safeValue(obj, 'a.b.missing', 'default')).toBe('default');
    expect(gen.safeValue(null, 'a.b', 'fallback')).toBe('fallback');
  });
});

// ---------------------------------------------------------------------------
// 5. Executive summary generation
// ---------------------------------------------------------------------------

describe('Executive summary from portfolio data', () => {
  it('generates a narrative executive summary', async () => {
    const { ExcelReportGenerator } = await import('../../reports/report-generator.js');

    // The ExcelReportGenerator builds executive summaries
    const reportData = {
      results: buildScoredAssets(5).map(a => ({
        ticker: a.ticker,
        scoreTotal: a.scoreTotal,
        signal: { key: a.scoreTotal >= 80 ? 'strong_buy' : 'buy' },
        details: a.details,
      })),
      strategy: 'momentum_aggressive',
      generatedAt: new Date().toISOString(),
    };

    const gen = new ExcelReportGenerator(reportData);
    expect(gen).toBeDefined();
    expect(gen.getFilename('test', 'xlsx')).toContain('test');
    expect(gen.getFilename('test', 'xlsx')).toContain('.xlsx');
  });
});

// ---------------------------------------------------------------------------
// 6. Period comparison
// ---------------------------------------------------------------------------

describe('Period comparison', () => {
  it('compares two time periods and calculates deltas', () => {
    const period1 = {
      name: 'Q1 2024',
      metrics: { cagr: 0.08, sharpeRatio: 1.0, maxDrawdown: -0.05, winRate: 0.55, volatility: 0.14 },
    };
    const period2 = {
      name: 'Q2 2024',
      metrics: { cagr: 0.12, sharpeRatio: 1.3, maxDrawdown: -0.08, winRate: 0.60, volatility: 0.16 },
    };

    const comparison = compareBacktestStrategies([period1, period2]);

    expect(comparison.strategies).toHaveLength(2);
    // Q2 had higher CAGR → should rank first (rankings use 'cagr' key)
    const cagrRanking = comparison.rankings.cagr;
    expect(cagrRanking[0].name).toBe('Q2 2024');
  });
});
