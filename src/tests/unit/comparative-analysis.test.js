import { describe, it, expect, beforeAll } from 'vitest';
import { setupReportMocks } from '../helpers.js';
import {
  compareBacktestStrategies,
  comparePerformancePeriods,
  compareTwoPeriods,
  generateComparativePDF,
  generateComparativeExcel,
  generatePeriodComparisonPDF,
} from '../../reports/comparative-analysis.js';

// -----------------------------------------------------------
// Setup
// -----------------------------------------------------------
beforeAll(() => {
  setupReportMocks();
});

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function buildDataset(overrides = {}) {
  return {
    strategyName: 'Test Strategy',
    name: 'Test',
    metrics: {
      cagr: 0.12,
      totalReturn: 0.48,
      sharpeRatio: 1.5,
      sortinoRatio: 2.0,
      calmarRatio: 1.2,
      maxDrawdown: -0.15,
      volatility: 0.18,
      winRate: 0.55,
      profitFactor: 1.8,
      avgWin: 0.03,
      avgLoss: -0.02,
      alpha: 0.05,
      beta: 0.9,
      informationRatio: 0.8,
      trackingError: 0.06,
      avgDrawdown: -0.08,
    },
    ...overrides,
  };
}

function buildDatasets() {
  return [
    buildDataset({ strategyName: 'Momentum', name: 'Momentum' }),
    buildDataset({
      strategyName: 'Conservative',
      name: 'Conservative',
      metrics: {
        cagr: 0.08,
        totalReturn: 0.32,
        sharpeRatio: 1.2,
        sortinoRatio: 1.5,
        calmarRatio: 1.0,
        maxDrawdown: -0.10,
        volatility: 0.12,
        winRate: 0.52,
        alpha: 0.03,
        beta: 0.7,
      },
    }),
    buildDataset({
      strategyName: 'Balanced',
      name: 'Balanced',
      metrics: {
        cagr: 0.10,
        totalReturn: 0.40,
        sharpeRatio: 1.35,
        sortinoRatio: 1.8,
        calmarRatio: 1.1,
        maxDrawdown: -0.12,
        volatility: 0.15,
        winRate: 0.53,
        alpha: 0.04,
        beta: 0.8,
      },
    }),
  ];
}

// -----------------------------------------------------------
// compareBacktestStrategies
// -----------------------------------------------------------
describe('compareBacktestStrategies', () => {
  it('returns a comparison object', () => {
    const datasets = buildDatasets();
    const result = compareBacktestStrategies(datasets);
    expect(result).toBeDefined();
  });
});

// -----------------------------------------------------------
// comparePerformancePeriods
// -----------------------------------------------------------
describe('comparePerformancePeriods', () => {
  it('returns period comparison result', () => {
    const performanceData = buildDatasets();
    const periods = ['Q1 2025', 'Q2 2025'];
    const result = comparePerformancePeriods(performanceData, periods);
    expect(result).toBeDefined();
  });
});

// -----------------------------------------------------------
// compareTwoPeriods
// -----------------------------------------------------------
describe('compareTwoPeriods', () => {
  it('compares two periods and determines winner', () => {
    const period1 = { cagr: 0.15, sharpeRatio: 1.8, maxDrawdown: -0.10, volatility: 0.16 };
    const period2 = { cagr: 0.08, sharpeRatio: 1.2, maxDrawdown: -0.18, volatility: 0.20 };

    const result = compareTwoPeriods(period1, period2, ['YTD', 'Last Year']);

    expect(result.period1.label).toBe('YTD');
    expect(result.period2.label).toBe('Last Year');
    expect(result.differences.cagr).toBeCloseTo(0.07, 5);
    expect(result.differences.sharpeRatio).toBeCloseTo(0.6, 5);
    expect(result.winner).toBe('YTD');
  });

  it('determines winner based on sharpeRatio', () => {
    const period1 = { sharpeRatio: 1.0 };
    const period2 = { sharpeRatio: 2.0 };

    const result = compareTwoPeriods(period1, period2);
    expect(result.winner).toBe('Period 2');
  });

  it('returns TIE when sharpeRatio is equal', () => {
    const period1 = { sharpeRatio: 1.5 };
    const period2 = { sharpeRatio: 1.5 };

    const result = compareTwoPeriods(period1, period2);
    expect(result.winner).toBe('TIE');
  });

  it('uses default labels when none provided', () => {
    const result = compareTwoPeriods({ sharpeRatio: 1 }, { sharpeRatio: 2 });
    expect(result.period1.label).toBe('Period 1');
    expect(result.period2.label).toBe('Period 2');
  });

  it('handles missing metric values with 0 defaults', () => {
    const result = compareTwoPeriods({}, {});
    expect(result.differences.cagr).toBe(0);
    expect(result.differences.sharpeRatio).toBe(0);
    expect(result.differences.maxDrawdown).toBe(0);
    expect(result.differences.volatility).toBe(0);
    expect(result.winner).toBe('TIE');
  });
});

// -----------------------------------------------------------
// generateComparativePDF
// -----------------------------------------------------------
describe('generateComparativePDF', () => {
  it('generates PDF without throwing', () => {
    const datasets = buildDatasets();
    expect(() => generateComparativePDF(datasets)).not.toThrow();
  });

  it('handles custom title', () => {
    const datasets = buildDatasets();
    expect(() => generateComparativePDF(datasets, 'Custom Title')).not.toThrow();
  });

  it('handles datasets without strategyName', () => {
    const datasets = [buildDataset({ strategyName: undefined, name: 'NameOnly' })];
    expect(() => generateComparativePDF(datasets)).not.toThrow();
  });

  it('handles datasets with missing metrics', () => {
    const datasets = [buildDataset({ metrics: {} })];
    expect(() => generateComparativePDF(datasets)).not.toThrow();
  });
});

// -----------------------------------------------------------
// generateComparativeExcel
// -----------------------------------------------------------
describe('generateComparativeExcel', () => {
  it('generates Excel without throwing', () => {
    const datasets = buildDatasets();
    expect(() => generateComparativeExcel(datasets)).not.toThrow();
  });

  it('handles datasets with missing metrics', () => {
    const datasets = [buildDataset({ metrics: {} })];
    expect(() => generateComparativeExcel(datasets)).not.toThrow();
  });

  it('handles single dataset', () => {
    const datasets = [buildDataset()];
    expect(() => generateComparativeExcel(datasets)).not.toThrow();
  });

  it('truncates long strategy names in sheet names', () => {
    const datasets = [
      buildDataset({ strategyName: 'Very Long Strategy Name That Exceeds Limits' }),
    ];
    expect(() => generateComparativeExcel(datasets)).not.toThrow();
  });
});

// -----------------------------------------------------------
// generatePeriodComparisonPDF
// -----------------------------------------------------------
describe('generatePeriodComparisonPDF', () => {
  it('generates period comparison PDF without throwing', () => {
    const comparisons = [
      compareTwoPeriods(
        { cagr: 0.12, sharpeRatio: 1.5, maxDrawdown: -0.15, volatility: 0.18 },
        { cagr: 0.08, sharpeRatio: 1.2, maxDrawdown: -0.20, volatility: 0.22 },
        ['YTD', 'Last Year'],
      ),
    ];

    expect(() => generatePeriodComparisonPDF(comparisons)).not.toThrow();
  });

  it('handles multiple period comparisons', () => {
    const comparisons = [
      compareTwoPeriods({ cagr: 0.10, sharpeRatio: 1.3, maxDrawdown: -0.12, volatility: 0.16 }, { cagr: 0.08 }),
      compareTwoPeriods({ cagr: 0.15, sharpeRatio: 1.8 }, { cagr: 0.12, sharpeRatio: 1.5 }),
    ];

    expect(() => generatePeriodComparisonPDF(comparisons)).not.toThrow();
  });
});
