/**
 * Reports Index Module Tests
 *
 * Verifies that reports/index.js correctly re-exports all report
 * generators and functions from submodules.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { setupReportMocks } from '../helpers.js';

beforeAll(() => {
  setupReportMocks();
});

// Import through the index module
import {
  ReportGenerator,
  ExcelReportGenerator,
  PDFReportGenerator,
  ComparativeAnalysisGenerator,
  ExecutiveSummaryGenerator,
  exportBacktestToExcel,
  exportAttributionToExcel,
  exportPortfolioToExcel,
  exportScanResultsToExcel,
  generateAuditReport,
  generateAttributionReport,
  generateInvestmentCommitteeReport,
  generateClientReport,
  generateBacktestPDF,
  compareBacktestStrategies,
  comparePerformancePeriods,
  generateComparativePDF,
  generateComparativeExcel,
  compareTwoPeriods,
  generatePeriodComparisonPDF,
} from '../../reports/index.js';

describe('Reports Index Module - re-exports', () => {
  it('re-exports report generator classes', () => {
    expect(ReportGenerator).toBeDefined();
    expect(ExcelReportGenerator).toBeDefined();
    expect(PDFReportGenerator).toBeDefined();
    expect(ComparativeAnalysisGenerator).toBeDefined();
    expect(ExecutiveSummaryGenerator).toBeDefined();
  });

  it('re-exports Excel export functions', () => {
    expect(exportBacktestToExcel).toBeTypeOf('function');
    expect(exportAttributionToExcel).toBeTypeOf('function');
    expect(exportPortfolioToExcel).toBeTypeOf('function');
    expect(exportScanResultsToExcel).toBeTypeOf('function');
  });

  it('re-exports PDF template functions', () => {
    expect(generateAuditReport).toBeTypeOf('function');
    expect(generateAttributionReport).toBeTypeOf('function');
    expect(generateInvestmentCommitteeReport).toBeTypeOf('function');
    expect(generateClientReport).toBeTypeOf('function');
    expect(generateBacktestPDF).toBeTypeOf('function');
  });

  it('re-exports comparative analysis functions', () => {
    expect(compareBacktestStrategies).toBeTypeOf('function');
    expect(comparePerformancePeriods).toBeTypeOf('function');
    expect(generateComparativePDF).toBeTypeOf('function');
    expect(generateComparativeExcel).toBeTypeOf('function');
    expect(compareTwoPeriods).toBeTypeOf('function');
    expect(generatePeriodComparisonPDF).toBeTypeOf('function');
  });
});
