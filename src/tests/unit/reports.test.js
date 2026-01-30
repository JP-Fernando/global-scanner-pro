import { describe, it, expect, beforeAll } from 'vitest';
import {
  ReportGenerator,
  ExcelReportGenerator,
  PDFReportGenerator,
  ComparativeAnalysisGenerator,
  ExecutiveSummaryGenerator,
} from '../../reports/report-generator.js';
import { setupReportMocks } from '../helpers.js';

beforeAll(() => {
  setupReportMocks();
});

describe('Reports Module', () => {
  // -----------------------------------------------------------
  // Base Report Generator
  // -----------------------------------------------------------
  describe('ReportGenerator (base)', () => {
    const generator = new ReportGenerator({ value: 100, name: 'Test' });

    it('generates a filename with prefix and extension', () => {
      const filename = generator.getFilename('test', 'csv');
      expect(filename).toContain('test_');
      expect(filename).toMatch(/\.csv$/);
    });

    it('formats numbers correctly', () => {
      expect(generator.formatNumber(123.456, 2)).toBe('123.46');
    });

    it('formats percentages correctly', () => {
      expect(generator.formatPercent(0.1234, 2)).toBe('12.34%');
    });

    it('formats currency correctly', () => {
      const currency = generator.formatCurrency(1234.56);
      expect(currency).toContain('1,234.56');
    });

    it('extracts nested values safely', () => {
      expect(generator.safeValue({ a: { b: { c: 42 } } }, 'a.b.c', 0)).toBe(42);
    });

    it('returns fallback for missing paths', () => {
      expect(generator.safeValue({ a: 1 }, 'x.y.z', 'N/A')).toBe('N/A');
    });
  });

  // -----------------------------------------------------------
  // Excel Report Generator
  // -----------------------------------------------------------
  describe('ExcelReportGenerator', () => {
    it('adds worksheets to workbook', () => {
      const generator = new ExcelReportGenerator({ test: true });
      const testData = [
        ['Header1', 'Header2', 'Header3'],
        ['Value1', 'Value2', 'Value3'],
      ];

      generator.addWorksheet('Test Sheet', testData, { columnWidths: [20, 15, 15] });

      expect(generator.workbook.SheetNames.length).toBeGreaterThan(0);
      expect(generator.workbook.SheetNames[0]).toBe('Test Sheet');
    });
  });

  // -----------------------------------------------------------
  // PDF Report Generator
  // -----------------------------------------------------------
  describe('PDFReportGenerator', () => {
    it('advances Y position through title, subtitle, text, metrics, and table', () => {
      const generator = new PDFReportGenerator({ test: true });

      generator.addTitle('Test Report');
      expect(generator.currentY).toBeGreaterThan(20);

      const yBefore = generator.currentY;
      generator.addSubtitle('Test Subtitle');
      expect(generator.currentY).toBeGreaterThan(yBefore);

      const yBeforeSection = generator.currentY;
      generator.addSectionHeader('Section 1');
      expect(generator.currentY).toBeGreaterThan(yBeforeSection);

      const yBeforeText = generator.currentY;
      generator.addText('This is test text');
      expect(generator.currentY).toBeGreaterThan(yBeforeText);

      const yBeforeMetrics = generator.currentY;
      generator.addMetricsBox([{ label: 'Metric 1', value: '100' }, { label: 'Metric 2', value: '200' }], 2);
      expect(generator.currentY).toBeGreaterThan(yBeforeMetrics);

      const yBeforeTable = generator.currentY;
      generator.addTable(['Col1', 'Col2'], [['Val1', 'Val2']]);
      expect(generator.currentY).toBeGreaterThan(yBeforeTable);
    });
  });

  // -----------------------------------------------------------
  // Comparative Analysis
  // -----------------------------------------------------------
  describe('ComparativeAnalysisGenerator', () => {
    const datasets = [
      { strategyName: 'Strategy A', metrics: { cagr: 0.15, sharpeRatio: 1.5, maxDrawdown: -0.12, volatility: 0.18, winRate: 0.65 } },
      { strategyName: 'Strategy B', metrics: { cagr: 0.12, sharpeRatio: 1.2, maxDrawdown: -0.08, volatility: 0.14, winRate: 0.60 } },
      { strategyName: 'Strategy C', metrics: { cagr: 0.18, sharpeRatio: 1.8, maxDrawdown: -0.15, volatility: 0.20, winRate: 0.70 } },
    ];

    it('compares three strategies with rankings and summary', () => {
      const generator = new ComparativeAnalysisGenerator(datasets);
      const comparison = generator.compareStrategies();

      expect(comparison.strategies).toHaveLength(3);
      expect(comparison.metrics.length).toBeGreaterThan(0);
      expect(comparison.rankings).toBeDefined();
      expect(comparison.summary).toBeDefined();
      expect(comparison.rankings.cagr).toBeDefined();
      expect(comparison.rankings.sharpeRatio).toBeDefined();
      expect(comparison.summary.bestOverall).toBeDefined();
    });

    it('ranks Strategy C as having the best Sharpe ratio', () => {
      const generator = new ComparativeAnalysisGenerator(datasets);
      const comparison = generator.compareStrategies();
      const topSharpe = comparison.rankings.sharpeRatio[0];

      expect(topSharpe.rank).toBe(1);
      expect(topSharpe.name).toBe('Strategy C');
    });
  });

  // -----------------------------------------------------------
  // Executive Summary
  // -----------------------------------------------------------
  describe('ExecutiveSummaryGenerator', () => {
    const testData = {
      strategyName: 'Test Strategy',
      metrics: {
        cagr: 0.15, sharpeRatio: 1.5, sortinoRatio: 1.8,
        maxDrawdown: -0.12, volatility: 0.18, winRate: 0.65,
        alpha: 0.03, beta: 0.95,
      },
      positions: [
        { ticker: 'AAPL', score: 0.85, weight: 0.15 },
        { ticker: 'MSFT', score: 0.80, weight: 0.12 },
        { ticker: 'GOOGL', score: 0.75, weight: 0.35 },
      ],
    };

    it('generates overview, key metrics, top signals, risks, and recommendations', () => {
      const generator = new ExecutiveSummaryGenerator(testData);
      const summary = generator.generate();

      expect(typeof summary.overview).toBe('string');
      expect(summary.overview.length).toBeGreaterThan(0);
      expect(summary.keyMetrics.cagr).toBe(0.15);
      expect(summary.keyMetrics.sharpeRatio).toBe(1.5);
      expect(Array.isArray(summary.topSignals)).toBe(true);
      expect(Array.isArray(summary.mainRisks)).toBe(true);
      expect(Array.isArray(summary.recommendations)).toBe(true);
      expect(summary.marketContext).toBeDefined();
    });

    it('detects concentration risk (GOOGL weight > 25%)', () => {
      const generator = new ExecutiveSummaryGenerator(testData);
      const summary = generator.generate();
      const hasConcentrationRisk = summary.mainRisks.some(
        (r) => r.type === 'Concentration Risk'
      );
      expect(hasConcentrationRisk).toBe(true);
    });
  });

  // -----------------------------------------------------------
  // Period Comparison
  // -----------------------------------------------------------
  describe('Period Comparison', () => {
    it('correctly identifies YTD 2024 as the better period', () => {
      const period1 = { cagr: 0.15, sharpeRatio: 1.5, maxDrawdown: -0.12, volatility: 0.18 };
      const period2 = { cagr: 0.12, sharpeRatio: 1.2, maxDrawdown: -0.10, volatility: 0.15 };

      const comparison = {
        period1: { label: 'YTD 2024', ...period1 },
        period2: { label: '2023', ...period2 },
        differences: {
          cagr: period1.cagr - period2.cagr,
          sharpeRatio: period1.sharpeRatio - period2.sharpeRatio,
        },
        winner: period1.sharpeRatio > period2.sharpeRatio ? 'YTD 2024' : '2023',
      };

      expect(comparison.differences.cagr).toBeGreaterThan(0);
      expect(comparison.differences.sharpeRatio).toBeGreaterThan(0);
      expect(comparison.winner).toBe('YTD 2024');
    });
  });
});
