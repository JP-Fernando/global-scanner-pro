import { describe, it, expect, beforeAll, vi } from 'vitest';
import { setupReportMocks } from '../helpers.js';
import {
  exportBacktestToExcel,
  exportPortfolioToExcel,
  exportAttributionToExcel,
  exportScanResultsToExcel,
} from '../../reports/excel-exporter.js';

beforeAll(() => {
  setupReportMocks();
});

// ---------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------

const buildBacktestResults = () => [
  {
    strategyName: 'Momentum',
    initialCapital: 100000,
    metrics: {
      finalValue: 125000,
      totalReturn: 0.25,
      cagr: 0.12,
      sharpeRatio: 1.5,
      maxDrawdown: -0.08,
      winRate: 0.65,
      volatility: 0.18,
      avgDrawdown: -0.04,
      avgRecoveryDays: 15,
      sortinoRatio: 1.8,
      profitFactor: 2.1,
      avgWin: 0.03,
      avgLoss: -0.015,
      totalTransactionCosts: 0.005,
      calmarRatio: 1.5,
      alpha: 0.03,
      beta: 0.95,
      informationRatio: 0.8,
    },
  },
  {
    strategyName: 'Value',
    initialCapital: 100000,
    metrics: {
      finalValue: 118000,
      totalReturn: 0.18,
      cagr: 0.09,
      sharpeRatio: 1.2,
      maxDrawdown: -0.12,
      winRate: 0.55,
      volatility: 0.22,
      avgDrawdown: -0.06,
      avgRecoveryDays: 22,
      sortinoRatio: 1.4,
      profitFactor: 1.7,
      avgWin: 0.025,
      avgLoss: -0.018,
      totalTransactionCosts: 0.003,
      calmarRatio: 0.75,
      alpha: 0.01,
      beta: 1.1,
      informationRatio: 0.5,
    },
  },
];

const buildPortfolio = (opts = {}) => ({
  name: 'Test Portfolio',
  strategy: 'balanced',
  benchmark: '^GSPC',
  created_at: '2023-01-01T00:00:00Z',
  last_updated: '2024-06-15T12:00:00Z',
  positions: [
    {
      ticker: 'AAPL', name: 'Apple Inc.',
      quantity: 100, entry_price: 150, current_price: 175,
      weight: 0.30, unrealized_pnl: 2500, unrealized_pnl_pct: 0.1667,
    },
    {
      ticker: 'GOOGL', name: 'Alphabet Inc.',
      quantity: 50, entry_price: 2800, current_price: 2950,
      weight: 0.25, unrealized_pnl: 7500, unrealized_pnl_pct: 0.0536,
    },
    {
      ticker: 'MSFT', name: 'Microsoft Corp.',
      quantity: 80, entry_price: 300, current_price: 340,
      weight: 0.20, unrealized_pnl: 3200, unrealized_pnl_pct: 0.1333,
    },
  ],
  rebalanceHistory: opts.withRebalance ? [
    { timestamp: Date.now() - 86400000, reason: 'Scheduled', changes: ['AAPL +5%'], total_value: 100500 },
    { timestamp: Date.now() - 172800000, reason: 'Drift threshold', changes: ['GOOGL -3%', 'MSFT +3%'], total_value: 99800 },
  ] : undefined,
});

const buildPerformanceData = () => ({
  totalValue: 125000,
  costBasis: 100000,
  totalPnL: 25000,
  totalPnLPct: 25,
  totalReturn: 25,
  annualizedReturn: 12.5,
  sharpeRatio: 1.5,
  sortinoRatio: 1.8,
  calmarRatio: 1.4,
  maxDrawdown: -8.5,
  volatility: 18.2,
  alpha: 0.035,
  beta: 0.92,
  trackingError: 5.2,
  excessReturn: 3.5,
});

const buildRiskData = () => ({
  var95: -2.5,
  cvar95: -3.8,
  dailyVol: 1.2,
  annualVol: 19.0,
  concentration: 35,
  numPositions: 3,
});

const buildAttributionData = () => ({
  summary: {
    analysis_period: { start: '2023-01-01', end: '2024-01-01' },
    active_positions: 5,
    total_return: 0.15,
    benchmark_return: 0.10,
    excess_return: 0.05,
  },
  brinson: {
    allocation_effect: {
      by_sector: [
        { sector: 'Technology', portfolio_weight: 40, benchmark_weight: 30, weight_difference: 10, contribution: 2.5 },
        { sector: 'Healthcare', portfolio_weight: 20, benchmark_weight: 25, weight_difference: -5, contribution: -0.8 },
      ],
    },
  },
  factors: {
    trend: { total_contribution: 3.2, top_contributors: [{ ticker: 'AAPL', weight: 15, contribution: 1.2 }] },
    momentum: { total_contribution: 2.1, top_contributors: [{ ticker: 'GOOGL', weight: 12, contribution: 0.9 }] },
    risk: { total_contribution: -0.5, top_contributors: [{ ticker: 'MSFT', weight: 10, contribution: -0.3 }] },
    liquidity: { total_contribution: 0.8, top_contributors: [{ ticker: 'AAPL', weight: 15, contribution: 0.4 }] },
  },
  assets: {
    top_contributors: [
      { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', weight: 15, return: 25, contribution: 3.75 },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', weight: 12, return: 18, contribution: 2.16 },
    ],
  },
  periods: {
    monthly: [
      { period: '2023-01', portfolio_return: 2.5, benchmark_return: 1.8, excess_return: 0.7 },
      { period: '2023-02', portfolio_return: -1.2, benchmark_return: -0.5, excess_return: -0.7 },
      { period: '2023-03', portfolio_return: 3.0, benchmark_return: 2.1, excess_return: 0.9 },
    ],
  },
  events: {
    events: [
      {
        event_name: 'Q1 Earnings',
        description: 'First quarter earnings season',
        start_date: '2023-04-01',
        end_date: '2023-04-30',
        portfolio_return: 4.5,
        benchmark_return: 3.2,
        excess_return: 1.3,
        portfolio_max_drawdown: -2.1,
      },
    ],
  },
});

const buildScanResults = () => [
  {
    ticker: 'AAPL', name: 'Apple Inc.', score: 0.85, trend: 0.9,
    momentum: 0.8, risk: 0.7, liquidity: 0.95, price: 175.50, volume: 80000000,
    totalScore: 0.85, trendScore: 0.9, momentumScore: 0.8,
    riskScore: 0.7, liquidityScore: 0.95,
  },
  {
    ticker: 'GOOGL', name: 'Alphabet Inc.', score: 0.78, trend: 0.82,
    momentum: 0.75, risk: 0.72, liquidity: 0.88, price: 2950, volume: 25000000,
    totalScore: 0.78, trendScore: 0.82, momentumScore: 0.75,
    riskScore: 0.72, liquidityScore: 0.88,
  },
];

// ---------------------------------------------------------------
// exportBacktestToExcel
// ---------------------------------------------------------------
describe('exportBacktestToExcel', () => {
  it('creates 4 sheets and calls download', () => {
    const writeSpy = vi.spyOn(window.XLSX, 'writeFile');
    exportBacktestToExcel(buildBacktestResults());

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const filename = writeSpy.mock.calls[0][1];
    expect(filename).toContain('backtest_report');
    expect(filename).toMatch(/\.xlsx$/);
    writeSpy.mockRestore();
  });

  it('handles empty results array without throwing', () => {
    expect(() => exportBacktestToExcel([])).not.toThrow();
  });

  it('handles results with missing metrics gracefully', () => {
    const results = [{ strategyName: 'Sparse' }];
    expect(() => exportBacktestToExcel(results)).not.toThrow();
  });

  it('handles results with partial metrics', () => {
    const results = [{
      strategyName: 'Partial',
      initialCapital: 50000,
      metrics: { finalValue: 55000, totalReturn: 0.10 },
    }];
    expect(() => exportBacktestToExcel(results)).not.toThrow();
  });

  it('creates Performance Summary sheet with correct headers', () => {
    const bookAppendSpy = vi.spyOn(window.XLSX.utils, 'book_append_sheet');
    exportBacktestToExcel(buildBacktestResults());

    const sheetNames = bookAppendSpy.mock.calls.map(c => c[2]);
    expect(sheetNames).toContain('Performance Summary');
    expect(sheetNames).toContain('Risk Metrics');
    expect(sheetNames).toContain('Trading Metrics');
    expect(sheetNames).toContain('Strategy Comparison');
    bookAppendSpy.mockRestore();
  });
});

// ---------------------------------------------------------------
// exportPortfolioToExcel
// ---------------------------------------------------------------
describe('exportPortfolioToExcel', () => {
  it('creates 4 sheets without rebalance history', () => {
    const writeSpy = vi.spyOn(window.XLSX, 'writeFile');
    const bookAppendSpy = vi.spyOn(window.XLSX.utils, 'book_append_sheet');

    exportPortfolioToExcel(buildPortfolio(), buildPerformanceData(), buildRiskData());

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const filename = writeSpy.mock.calls[0][1];
    expect(filename).toContain('portfolio_Test Portfolio');
    expect(filename).toMatch(/\.xlsx$/);

    const sheetNames = bookAppendSpy.mock.calls.map(c => c[2]);
    expect(sheetNames).toContain('Portfolio Overview');
    expect(sheetNames).toContain('Current Positions');
    expect(sheetNames).toContain('Performance');
    expect(sheetNames).toContain('Risk Analysis');
    expect(sheetNames).not.toContain('Rebalance History');

    writeSpy.mockRestore();
    bookAppendSpy.mockRestore();
  });

  it('creates 5 sheets with rebalance history', () => {
    const bookAppendSpy = vi.spyOn(window.XLSX.utils, 'book_append_sheet');

    exportPortfolioToExcel(
      buildPortfolio({ withRebalance: true }),
      buildPerformanceData(),
      buildRiskData()
    );

    const sheetNames = bookAppendSpy.mock.calls.map(c => c[2]);
    expect(sheetNames).toContain('Rebalance History');
    bookAppendSpy.mockRestore();
  });

  it('handles portfolio with no positions', () => {
    const portfolio = { ...buildPortfolio(), positions: [] };
    expect(() => exportPortfolioToExcel(portfolio, buildPerformanceData(), buildRiskData())).not.toThrow();
  });

  it('handles null performance and risk data', () => {
    expect(() => exportPortfolioToExcel(buildPortfolio(), null, null)).not.toThrow();
  });
});

// ---------------------------------------------------------------
// exportAttributionToExcel
// ---------------------------------------------------------------
describe('exportAttributionToExcel', () => {
  it('creates 6 sheets with full attribution data', () => {
    const bookAppendSpy = vi.spyOn(window.XLSX.utils, 'book_append_sheet');

    exportAttributionToExcel(buildPortfolio(), buildAttributionData());

    const sheetNames = bookAppendSpy.mock.calls.map(c => c[2]);
    expect(sheetNames).toContain('Attribution Summary');
    expect(sheetNames).toContain('Brinson Attribution');
    expect(sheetNames).toContain('Factor Attribution');
    expect(sheetNames).toContain('Asset Contribution');
    expect(sheetNames).toContain('Period Attribution');
    expect(sheetNames).toContain('Market Events');
    bookAppendSpy.mockRestore();
  });

  it('handles null attribution data without throwing', () => {
    expect(() => exportAttributionToExcel(buildPortfolio(), null)).not.toThrow();
  });

  it('handles partial attribution data (no brinson)', () => {
    const partial = { ...buildAttributionData(), brinson: null };
    expect(() => exportAttributionToExcel(buildPortfolio(), partial)).not.toThrow();
  });

  it('handles partial attribution data (no factors)', () => {
    const partial = { ...buildAttributionData(), factors: null };
    expect(() => exportAttributionToExcel(buildPortfolio(), partial)).not.toThrow();
  });

  it('handles partial attribution data (no assets)', () => {
    const partial = { ...buildAttributionData(), assets: null };
    expect(() => exportAttributionToExcel(buildPortfolio(), partial)).not.toThrow();
  });

  it('handles partial attribution data (no periods)', () => {
    const partial = { ...buildAttributionData(), periods: null };
    expect(() => exportAttributionToExcel(buildPortfolio(), partial)).not.toThrow();
  });

  it('handles partial attribution data (no events)', () => {
    const partial = { ...buildAttributionData(), events: null };
    expect(() => exportAttributionToExcel(buildPortfolio(), partial)).not.toThrow();
  });

  it('generates correct filename', () => {
    const writeSpy = vi.spyOn(window.XLSX, 'writeFile');
    exportAttributionToExcel({ name: 'MyPortfolio' }, buildAttributionData());

    const filename = writeSpy.mock.calls[0][1];
    expect(filename).toContain('attribution_MyPortfolio');
    writeSpy.mockRestore();
  });
});

// ---------------------------------------------------------------
// exportScanResultsToExcel
// ---------------------------------------------------------------
describe('exportScanResultsToExcel', () => {
  const allocation = {
    assets: [
      { ticker: 'AAPL', name: 'Apple', score: 0.85, weight: 0.4, volatility: 0.25, recommended_capital: 40000, marginal_risk: 0.012 },
      { ticker: 'GOOGL', name: 'Alphabet', score: 0.78, weight: 0.3, volatility: 0.22, recommended_capital: 30000, marginal_risk: 0.010 },
    ],
  };

  const riskMetrics = {
    portfolio_volatility: 0.18,
    diversification_ratio: 1.25,
    concentration: 0.42,
    diversified_var: 0.025,
    undiversified_var: 0.035,
  };

  it('creates 4 sheets with allocation and risk', () => {
    const bookAppendSpy = vi.spyOn(window.XLSX.utils, 'book_append_sheet');

    exportScanResultsToExcel(buildScanResults(), allocation, riskMetrics);

    const sheetNames = bookAppendSpy.mock.calls.map(c => c[2]);
    expect(sheetNames).toContain('Top Ranked Assets');
    expect(sheetNames).toContain('Allocation');
    expect(sheetNames).toContain('Portfolio Risk');
    expect(sheetNames).toContain('Detailed Scores');
    bookAppendSpy.mockRestore();
  });

  it('creates 2 sheets without allocation or risk', () => {
    const bookAppendSpy = vi.spyOn(window.XLSX.utils, 'book_append_sheet');

    exportScanResultsToExcel(buildScanResults(), null, null);

    const sheetNames = bookAppendSpy.mock.calls.map(c => c[2]);
    expect(sheetNames).toContain('Top Ranked Assets');
    expect(sheetNames).toContain('Detailed Scores');
    expect(sheetNames).not.toContain('Allocation');
    expect(sheetNames).not.toContain('Portfolio Risk');
    bookAppendSpy.mockRestore();
  });

  it('handles empty scan results', () => {
    expect(() => exportScanResultsToExcel([], null, null)).not.toThrow();
  });

  it('generates correct filename', () => {
    const writeSpy = vi.spyOn(window.XLSX, 'writeFile');
    exportScanResultsToExcel(buildScanResults(), null, null);

    const filename = writeSpy.mock.calls[0][1];
    expect(filename).toContain('scanner_results');
    expect(filename).toMatch(/\.xlsx$/);
    writeSpy.mockRestore();
  });

  it('handles scan results with missing optional fields', () => {
    const sparse = [{ ticker: 'TEST' }, { ticker: 'TEST2', score: 0.5 }];
    expect(() => exportScanResultsToExcel(sparse, null, null)).not.toThrow();
  });
});
