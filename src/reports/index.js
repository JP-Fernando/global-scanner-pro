// =====================================================
// REPORTS MODULE INDEX
// Central export point for all reporting functionality
// =====================================================
// Base generators
export {
  ReportGenerator,
  ExcelReportGenerator,
  PDFReportGenerator,
  ComparativeAnalysisGenerator,
  ExecutiveSummaryGenerator
} from './report-generator.js';
// Excel exports
export {
  exportBacktestToExcel,
  exportAttributionToExcel,
  exportPortfolioToExcel,
  exportScanResultsToExcel
} from './excel-exporter.js';
// PDF templates
export {
  generateAuditReport,
  generateAttributionReport,
  generateInvestmentCommitteeReport,
  generateClientReport,
  generateBacktestPDF
} from './pdf-templates.js';
// Comparative analysis
export {
  compareBacktestStrategies,
  comparePerformancePeriods,
  generateComparativePDF,
  generateComparativeExcel,
  compareTwoPeriods,
  generatePeriodComparisonPDF
} from './comparative-analysis.js';