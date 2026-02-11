import { describe, it, expect, beforeAll } from 'vitest';
import { setupReportMocks } from '../helpers.js';
import {
  generateAuditReport,
  generateInvestmentCommitteeReport,
  generateClientReport,
  generateAttributionReport,
  generateBacktestPDF,
} from '../../reports/pdf-templates.js';

beforeAll(() => {
  setupReportMocks();
});

// ---------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------

const buildPortfolio = (opts = {}) => ({
  name: 'Test Portfolio',
  strategy: 'balanced',
  benchmark: '^GSPC',
  created_at: '2023-01-01T00:00:00Z',
  last_updated: '2024-06-15T12:00:00Z',
  last_rebalance: opts.withRebalance ? '2024-06-01T10:00:00Z' : undefined,
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
  ],
  rebalanceHistory: opts.withRebalance ? [
    { timestamp: Date.now() - 86400000, reason: 'Scheduled', changes: ['AAPL +5%'], total_value: 100500 },
    { timestamp: Date.now() - 172800000, reason: 'Drift threshold', changes: ['GOOGL -3%'], total_value: 99800 },
  ] : undefined,
});

const buildPerformanceData = (overrides = {}) => ({
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
  informationRatio: 0.8,
  ...overrides,
});

const buildRiskData = () => ({
  var95: -2.5,
  cvar95: -3.8,
  dailyVol: 1.2,
  annualVol: 19.0,
  concentration: 0.35,
  numPositions: 2,
});

const buildGovernance = (opts = {}) => ({
  compliance: {
    passed: opts.passed !== false,
    issues: opts.issues || [],
  },
  rules_applied: {
    max_single_position: '25%',
    min_positions: 3,
    max_sector_exposure: '40%',
  },
});

const buildMarketContext = () => ({
  regime: 'risk_on',
  volatility: 18,
  sentiment: 'BULLISH',
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

const buildBacktestResults = () => [
  {
    strategyName: 'Momentum',
    metrics: {
      totalReturn: 0.25, cagr: 0.12, sharpeRatio: 1.5, sortinoRatio: 1.8,
      calmarRatio: 1.4, maxDrawdown: -0.08, volatility: 0.18, winRate: 0.65,
      profitFactor: 2.1, alpha: 0.03, beta: 0.95,
    },
  },
  {
    strategyName: 'Value',
    metrics: {
      totalReturn: 0.18, cagr: 0.09, sharpeRatio: 1.2, sortinoRatio: 1.4,
      calmarRatio: 0.75, maxDrawdown: -0.12, volatility: 0.22, winRate: 0.55,
      profitFactor: 1.7, alpha: 0.01, beta: 1.1,
    },
  },
];

// ---------------------------------------------------------------
// generateAuditReport
// ---------------------------------------------------------------
describe('generateAuditReport', () => {
  it('generates without throwing with full data', () => {
    expect(() =>
      generateAuditReport(
        buildPortfolio({ withRebalance: true }),
        buildGovernance(),
        buildRiskData(),
        buildPerformanceData()
      )
    ).not.toThrow();
  });

  it('calls pdf.save with correct filename', () => {
    const saveCalls = [];
    const origJsPDF = window.jspdf.jsPDF;
    const MockJsPDF = class extends origJsPDF {
      save(filename) { saveCalls.push(filename); }
    };
    window.jspdf.jsPDF = MockJsPDF;

    generateAuditReport(buildPortfolio(), buildGovernance(), buildRiskData(), buildPerformanceData());

    expect(saveCalls.length).toBe(1);
    expect(saveCalls[0]).toContain('audit_report_Test Portfolio');
    expect(saveCalls[0]).toMatch(/\.pdf$/);

    window.jspdf.jsPDF = origJsPDF;
  });

  it('handles governance with compliance issues', () => {
    const gov = buildGovernance({
      passed: false,
      issues: [
        { level: 'HIGH', rule: 'concentration', description: 'Position AAPL exceeds 25%', affected_assets: ['AAPL'] },
        { level: 'MEDIUM', rule: 'sector_limit', description: 'Tech sector exceeds 40%', affected_assets: ['AAPL', 'GOOGL'] },
      ],
    });

    expect(() =>
      generateAuditReport(buildPortfolio(), gov, buildRiskData(), buildPerformanceData())
    ).not.toThrow();
  });

  it('handles null governance data', () => {
    expect(() =>
      generateAuditReport(buildPortfolio(), null, buildRiskData(), buildPerformanceData())
    ).not.toThrow();
  });

  it('handles empty governance (no compliance)', () => {
    expect(() =>
      generateAuditReport(buildPortfolio(), {}, buildRiskData(), buildPerformanceData())
    ).not.toThrow();
  });

  it('handles portfolio without positions', () => {
    const portfolio = { ...buildPortfolio(), positions: [] };
    expect(() =>
      generateAuditReport(portfolio, buildGovernance(), buildRiskData(), buildPerformanceData())
    ).not.toThrow();
  });

  it('handles null performance and risk data', () => {
    expect(() =>
      generateAuditReport(buildPortfolio(), buildGovernance(), null, null)
    ).not.toThrow();
  });

  it('handles portfolio without rebalance history', () => {
    expect(() =>
      generateAuditReport(buildPortfolio(), buildGovernance(), buildRiskData(), buildPerformanceData())
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------
// generateInvestmentCommitteeReport
// ---------------------------------------------------------------
describe('generateInvestmentCommitteeReport', () => {
  it('generates without throwing with full data', () => {
    expect(() =>
      generateInvestmentCommitteeReport(
        buildPortfolio(),
        buildPerformanceData(),
        buildRiskData(),
        buildMarketContext()
      )
    ).not.toThrow();
  });

  it('includes all sections (title, executive summary, metrics, market, risk, benchmark, recommendations)', () => {
    const textCalls = [];
    const origJsPDF = window.jspdf.jsPDF;
    const MockJsPDF = class extends origJsPDF {
      text(str) { textCalls.push(String(str)); }
    };
    window.jspdf.jsPDF = MockJsPDF;

    generateInvestmentCommitteeReport(
      buildPortfolio(),
      buildPerformanceData(),
      buildRiskData(),
      buildMarketContext()
    );

    const allText = textCalls.join(' ');
    expect(allText).toContain('INVESTMENT COMMITTEE REPORT');
    expect(allText).toContain('EXECUTIVE SUMMARY');
    expect(allText).toContain('KEY PERFORMANCE METRICS');
    expect(allText).toContain('MARKET CONTEXT');
    expect(allText).toContain('STRATEGIC POSITIONING');
    expect(allText).toContain('RISK ANALYSIS');
    expect(allText).toContain('BENCHMARK COMPARISON');
    expect(allText).toContain('RECOMMENDATIONS');

    window.jspdf.jsPDF = origJsPDF;
  });

  it('handles portfolio without positions', () => {
    const portfolio = { ...buildPortfolio(), positions: null };
    expect(() =>
      generateInvestmentCommitteeReport(portfolio, buildPerformanceData(), buildRiskData(), null)
    ).not.toThrow();
  });

  it('handles null performance data', () => {
    expect(() =>
      generateInvestmentCommitteeReport(buildPortfolio(), null, null, null)
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------
// generateClientReport
// ---------------------------------------------------------------
describe('generateClientReport', () => {
  it('generates without throwing with full data', () => {
    expect(() =>
      generateClientReport(buildPortfolio(), buildPerformanceData(), buildRiskData())
    ).not.toThrow();
  });

  it('shows positive performance text when gains are positive', () => {
    const textCalls = [];
    const origJsPDF = window.jspdf.jsPDF;
    const MockJsPDF = class extends origJsPDF {
      text(str) { textCalls.push(String(str)); }
    };
    window.jspdf.jsPDF = MockJsPDF;

    generateClientReport(buildPortfolio(), buildPerformanceData({ totalPnLPct: 25 }), buildRiskData());

    const allText = textCalls.join(' ');
    expect(allText).toContain('gained');
    // "decline" appears in the glossary, so check the performance paragraph specifically
    expect(allText).not.toContain('experienced a');

    window.jspdf.jsPDF = origJsPDF;
  });

  it('shows negative performance text when losses occur', () => {
    const textCalls = [];
    const origJsPDF = window.jspdf.jsPDF;
    const MockJsPDF = class extends origJsPDF {
      text(str) { textCalls.push(String(str)); }
    };
    window.jspdf.jsPDF = MockJsPDF;

    generateClientReport(buildPortfolio(), buildPerformanceData({ totalPnLPct: -10 }), buildRiskData());

    const allText = textCalls.join(' ');
    expect(allText).toContain('decline');

    window.jspdf.jsPDF = origJsPDF;
  });

  it('determines LOW risk level for volatility < 15', () => {
    const textCalls = [];
    const origJsPDF = window.jspdf.jsPDF;
    const MockJsPDF = class extends origJsPDF {
      text(str) { textCalls.push(String(str)); }
    };
    window.jspdf.jsPDF = MockJsPDF;

    generateClientReport(buildPortfolio(), buildPerformanceData({ volatility: 10 }), buildRiskData());

    const allText = textCalls.join(' ');
    expect(allText).toContain('Risk Level: LOW');

    window.jspdf.jsPDF = origJsPDF;
  });

  it('determines HIGH risk level for volatility > 25', () => {
    const textCalls = [];
    const origJsPDF = window.jspdf.jsPDF;
    const MockJsPDF = class extends origJsPDF {
      text(str) { textCalls.push(String(str)); }
    };
    window.jspdf.jsPDF = MockJsPDF;

    generateClientReport(buildPortfolio(), buildPerformanceData({ volatility: 30 }), buildRiskData());

    const allText = textCalls.join(' ');
    expect(allText).toContain('Risk Level: HIGH');

    window.jspdf.jsPDF = origJsPDF;
  });

  it('determines MODERATE risk level for volatility between 15-25', () => {
    const textCalls = [];
    const origJsPDF = window.jspdf.jsPDF;
    const MockJsPDF = class extends origJsPDF {
      text(str) { textCalls.push(String(str)); }
    };
    window.jspdf.jsPDF = MockJsPDF;

    generateClientReport(buildPortfolio(), buildPerformanceData({ volatility: 20 }), buildRiskData());

    const allText = textCalls.join(' ');
    expect(allText).toContain('Risk Level: MODERATE');

    window.jspdf.jsPDF = origJsPDF;
  });

  it('shows outperformance text when alpha > 0', () => {
    const textCalls = [];
    const origJsPDF = window.jspdf.jsPDF;
    const MockJsPDF = class extends origJsPDF {
      text(str) { textCalls.push(String(str)); }
    };
    window.jspdf.jsPDF = MockJsPDF;

    generateClientReport(buildPortfolio(), buildPerformanceData({ alpha: 0.05 }), buildRiskData());

    const allText = textCalls.join(' ');
    expect(allText).toContain('outperformed');

    window.jspdf.jsPDF = origJsPDF;
  });

  it('shows underperformance text when alpha < 0', () => {
    const textCalls = [];
    const origJsPDF = window.jspdf.jsPDF;
    const MockJsPDF = class extends origJsPDF {
      text(str) { textCalls.push(String(str)); }
    };
    window.jspdf.jsPDF = MockJsPDF;

    generateClientReport(buildPortfolio(), buildPerformanceData({ alpha: -0.02 }), buildRiskData());

    const allText = textCalls.join(' ');
    expect(allText).toContain('underperformed');

    window.jspdf.jsPDF = origJsPDF;
  });

  it('handles null performance data', () => {
    expect(() =>
      generateClientReport(buildPortfolio(), null, null)
    ).not.toThrow();
  });

  it('handles portfolio with no positions', () => {
    const portfolio = { ...buildPortfolio(), positions: [] };
    expect(() =>
      generateClientReport(portfolio, buildPerformanceData(), buildRiskData())
    ).not.toThrow();
  });

  it('includes glossary section', () => {
    const textCalls = [];
    const origJsPDF = window.jspdf.jsPDF;
    const MockJsPDF = class extends origJsPDF {
      text(str) { textCalls.push(String(str)); }
    };
    window.jspdf.jsPDF = MockJsPDF;

    generateClientReport(buildPortfolio(), buildPerformanceData(), buildRiskData());

    const allText = textCalls.join(' ');
    expect(allText).toContain('Understanding Your Report');
    expect(allText).toContain('Total Return:');
    expect(allText).toContain('Volatility:');

    window.jspdf.jsPDF = origJsPDF;
  });
});

// ---------------------------------------------------------------
// generateAttributionReport
// ---------------------------------------------------------------
describe('generateAttributionReport', () => {
  it('generates without throwing with full data', () => {
    expect(() =>
      generateAttributionReport(buildPortfolio(), buildAttributionData())
    ).not.toThrow();
  });

  it('includes all attribution sections', () => {
    const textCalls = [];
    const origJsPDF = window.jspdf.jsPDF;
    const MockJsPDF = class extends origJsPDF {
      text(str) { textCalls.push(String(str)); }
    };
    window.jspdf.jsPDF = MockJsPDF;

    generateAttributionReport(buildPortfolio(), buildAttributionData());

    const allText = textCalls.join(' ');
    expect(allText).toContain('ATTRIBUTION ANALYSIS REPORT');
    expect(allText).toContain('SUMMARY');
    expect(allText).toContain('BRINSON ATTRIBUTION');
    expect(allText).toContain('FACTOR ATTRIBUTION');
    expect(allText).toContain('ASSET CONTRIBUTION');
    expect(allText).toContain('PERIOD ATTRIBUTION');
    expect(allText).toContain('MARKET EVENT ATTRIBUTION');

    window.jspdf.jsPDF = origJsPDF;
  });

  it('handles null attribution data', () => {
    expect(() =>
      generateAttributionReport(buildPortfolio(), null)
    ).not.toThrow();
  });

  it('handles attribution without brinson data', () => {
    const data = { ...buildAttributionData(), brinson: null };
    expect(() =>
      generateAttributionReport(buildPortfolio(), data)
    ).not.toThrow();
  });

  it('handles attribution without factors', () => {
    const data = { ...buildAttributionData(), factors: null };
    expect(() =>
      generateAttributionReport(buildPortfolio(), data)
    ).not.toThrow();
  });

  it('handles attribution without assets', () => {
    const data = { ...buildAttributionData(), assets: null };
    expect(() =>
      generateAttributionReport(buildPortfolio(), data)
    ).not.toThrow();
  });

  it('handles attribution without periods', () => {
    const data = { ...buildAttributionData(), periods: null };
    expect(() =>
      generateAttributionReport(buildPortfolio(), data)
    ).not.toThrow();
  });

  it('handles attribution without events', () => {
    const data = { ...buildAttributionData(), events: null };
    expect(() =>
      generateAttributionReport(buildPortfolio(), data)
    ).not.toThrow();
  });

  it('generates correct filename', () => {
    const saveCalls = [];
    const origJsPDF = window.jspdf.jsPDF;
    const MockJsPDF = class extends origJsPDF {
      save(filename) { saveCalls.push(filename); }
    };
    window.jspdf.jsPDF = MockJsPDF;

    generateAttributionReport({ name: 'MyPortfolio', benchmark: '^GSPC' }, buildAttributionData());

    expect(saveCalls[0]).toContain('attribution_report_MyPortfolio');
    expect(saveCalls[0]).toMatch(/\.pdf$/);

    window.jspdf.jsPDF = origJsPDF;
  });
});

// ---------------------------------------------------------------
// generateBacktestPDF
// ---------------------------------------------------------------
describe('generateBacktestPDF', () => {
  it('generates without throwing with full data', () => {
    expect(() =>
      generateBacktestPDF(buildBacktestResults())
    ).not.toThrow();
  });

  it('includes all backtest sections', () => {
    const textCalls = [];
    const origJsPDF = window.jspdf.jsPDF;
    const MockJsPDF = class extends origJsPDF {
      text(str) { textCalls.push(String(str)); }
    };
    window.jspdf.jsPDF = MockJsPDF;

    generateBacktestPDF(buildBacktestResults());

    const allText = textCalls.join(' ');
    expect(allText).toContain('BACKTEST ANALYSIS REPORT');
    expect(allText).toContain('Performance Comparison');
    expect(allText).toContain('Best Performing Strategy: Momentum');
    expect(allText).toContain('1. Momentum');
    expect(allText).toContain('2. Value');

    window.jspdf.jsPDF = origJsPDF;
  });

  it('handles empty results array', () => {
    expect(() =>
      generateBacktestPDF([])
    ).not.toThrow();
  });

  it('handles results with missing metrics', () => {
    const sparse = [{ strategyName: 'Sparse' }];
    expect(() =>
      generateBacktestPDF(sparse)
    ).not.toThrow();
  });

  it('handles single strategy result', () => {
    const single = [buildBacktestResults()[0]];
    expect(() =>
      generateBacktestPDF(single)
    ).not.toThrow();
  });

  it('generates correct filename', () => {
    const saveCalls = [];
    const origJsPDF = window.jspdf.jsPDF;
    const MockJsPDF = class extends origJsPDF {
      save(filename) { saveCalls.push(filename); }
    };
    window.jspdf.jsPDF = MockJsPDF;

    generateBacktestPDF(buildBacktestResults());

    expect(saveCalls[0]).toContain('backtest_analysis');
    expect(saveCalls[0]).toMatch(/\.pdf$/);

    window.jspdf.jsPDF = origJsPDF;
  });
});
