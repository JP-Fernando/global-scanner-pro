// =====================================================
// EXCEL EXPORTER
// Multi-sheet Excel export with comprehensive data
// =====================================================

import { ExcelReportGenerator } from './report-generator.js';
import i18n from '../i18n/i18n.js';

/**
 * Export backtest results to Excel with multiple sheets
 */
export function exportBacktestToExcel(results, options = {}) {
  const generator = new ExcelReportGenerator(results);

  // Sheet 1: Performance Summary
  const summaryData = _createPerformanceSummarySheet(results);
  generator.addWorksheet('Performance Summary', summaryData, {
    columnWidths: [30, 15, 15, 15, 15, 15, 15, 15]
  });

  // Sheet 2: Risk Metrics
  const riskData = _createRiskMetricsSheet(results);
  generator.addWorksheet('Risk Metrics', riskData, {
    columnWidths: [30, 15, 15, 15, 15, 15]
  });

  // Sheet 3: Trading Metrics
  const tradingData = _createTradingMetricsSheet(results);
  generator.addWorksheet('Trading Metrics', tradingData, {
    columnWidths: [30, 15, 15, 15, 15]
  });

  // Sheet 4: Detailed Comparison
  const comparisonData = _createDetailedComparisonSheet(results);
  generator.addWorksheet('Strategy Comparison', comparisonData, {
    columnWidths: [25, 12, 12, 12, 12, 12, 12, 12, 12, 12]
  });

  // Download the file
  const filename = generator.getFilename('backtest_report', 'xlsx');
  generator.download(filename);
}

/**
 * Export portfolio to Excel with positions and analytics
 */
export function exportPortfolioToExcel(portfolio, performanceData, riskData) {
  const generator = new ExcelReportGenerator({ portfolio, performanceData, riskData });

  // Sheet 1: Portfolio Overview
  const overviewData = _createPortfolioOverviewSheet(portfolio, performanceData);
  generator.addWorksheet('Portfolio Overview', overviewData, {
    columnWidths: [25, 20]
  });

  // Sheet 2: Current Positions
  const positionsData = _createPositionsSheet(portfolio);
  generator.addWorksheet('Current Positions', positionsData, {
    columnWidths: [12, 25, 12, 12, 12, 12, 15, 15]
  });

  // Sheet 3: Performance Metrics
  const perfData = _createPerformanceMetricsSheet(performanceData);
  generator.addWorksheet('Performance', perfData, {
    columnWidths: [30, 15]
  });

  // Sheet 4: Risk Analysis
  const riskAnalysisData = _createRiskAnalysisSheet(riskData);
  generator.addWorksheet('Risk Analysis', riskAnalysisData, {
    columnWidths: [30, 15]
  });

  // Sheet 5: Rebalance History
  if (portfolio.rebalanceHistory && portfolio.rebalanceHistory.length > 0) {
    const rebalanceData = _createRebalanceHistorySheet(portfolio.rebalanceHistory);
    generator.addWorksheet('Rebalance History', rebalanceData, {
      columnWidths: [15, 12, 30, 12]
    });
  }

  // Download the file
  const filename = generator.getFilename(`portfolio_${portfolio.name}`, 'xlsx');
  generator.download(filename);
}

/**
 * Export scan results to Excel
 */
export function exportScanResultsToExcel(scanResults, allocation, riskMetrics) {
  const generator = new ExcelReportGenerator({ scanResults, allocation, riskMetrics });

  // Sheet 1: Top Ranked Assets
  const topAssetsData = _createTopAssetsSheet(scanResults);
  generator.addWorksheet('Top Ranked Assets', topAssetsData, {
    columnWidths: [12, 30, 12, 12, 12, 12, 12, 12, 12, 12]
  });

  // Sheet 2: Allocation
  if (allocation) {
    const allocationData = _createAllocationSheet(allocation);
    generator.addWorksheet('Allocation', allocationData, {
      columnWidths: [12, 30, 12, 12, 12, 12, 15]
    });
  }

  // Sheet 3: Risk Metrics
  if (riskMetrics) {
    const riskData = _createScanRiskMetricsSheet(riskMetrics);
    generator.addWorksheet('Portfolio Risk', riskData, {
      columnWidths: [30, 15]
    });
  }

  // Sheet 4: Detailed Scores
  const scoresData = _createDetailedScoresSheet(scanResults);
  generator.addWorksheet('Detailed Scores', scoresData, {
    columnWidths: [12, 30, 10, 10, 10, 10, 10, 10]
  });

  // Download the file
  const filename = generator.getFilename('scanner_results', 'xlsx');
  generator.download(filename);
}

// =====================================================
// SHEET CREATION HELPERS
// =====================================================

function _createPerformanceSummarySheet(results) {
  const headers = [
    'Strategy',
    'Initial Capital',
    'Final Value',
    'Total Return',
    'CAGR',
    'Sharpe Ratio',
    'Max Drawdown',
    'Win Rate'
  ];

  const rows = results.map(r => [
    r.strategyName || '',
    r.initialCapital || '',
    r.metrics?.finalValue || '',
    r.metrics?.totalReturn ? `${(r.metrics.totalReturn * 100).toFixed(2)}%` : '',
    r.metrics?.cagr ? `${(r.metrics.cagr * 100).toFixed(2)}%` : '',
    r.metrics?.sharpeRatio?.toFixed(2) || '',
    r.metrics?.maxDrawdown ? `${(r.metrics.maxDrawdown * 100).toFixed(2)}%` : '',
    r.metrics?.winRate ? `${(r.metrics.winRate * 100).toFixed(2)}%` : ''
  ]);

  return [headers, ...rows];
}

function _createRiskMetricsSheet(results) {
  const headers = [
    'Strategy',
    'Volatility',
    'Max Drawdown',
    'Avg Drawdown',
    'Recovery Days',
    'Sortino Ratio'
  ];

  const rows = results.map(r => [
    r.strategyName || '',
    r.metrics?.volatility ? `${(r.metrics.volatility * 100).toFixed(2)}%` : '',
    r.metrics?.maxDrawdown ? `${(r.metrics.maxDrawdown * 100).toFixed(2)}%` : '',
    r.metrics?.avgDrawdown ? `${(r.metrics.avgDrawdown * 100).toFixed(2)}%` : '',
    r.metrics?.avgRecoveryDays?.toFixed(0) || '',
    r.metrics?.sortinoRatio?.toFixed(2) || ''
  ]);

  return [headers, ...rows];
}

function _createTradingMetricsSheet(results) {
  const headers = [
    'Strategy',
    'Profit Factor',
    'Avg Win',
    'Avg Loss',
    'Transaction Costs'
  ];

  const rows = results.map(r => [
    r.strategyName || '',
    r.metrics?.profitFactor?.toFixed(2) || '',
    r.metrics?.avgWin ? `${(r.metrics.avgWin * 100).toFixed(2)}%` : '',
    r.metrics?.avgLoss ? `${(r.metrics.avgLoss * 100).toFixed(2)}%` : '',
    r.metrics?.totalTransactionCosts ? `${(r.metrics.totalTransactionCosts * 100).toFixed(2)}%` : ''
  ]);

  return [headers, ...rows];
}

function _createDetailedComparisonSheet(results) {
  const headers = [
    'Strategy',
    'CAGR',
    'Sharpe',
    'Sortino',
    'Calmar',
    'Max DD',
    'Volatility',
    'Alpha',
    'Beta',
    'Info Ratio'
  ];

  const rows = results.map(r => [
    r.strategyName || '',
    r.metrics?.cagr?.toFixed(4) || '',
    r.metrics?.sharpeRatio?.toFixed(2) || '',
    r.metrics?.sortinoRatio?.toFixed(2) || '',
    r.metrics?.calmarRatio?.toFixed(2) || '',
    r.metrics?.maxDrawdown?.toFixed(4) || '',
    r.metrics?.volatility?.toFixed(4) || '',
    r.metrics?.alpha?.toFixed(4) || '',
    r.metrics?.beta?.toFixed(2) || '',
    r.metrics?.informationRatio?.toFixed(2) || ''
  ]);

  return [headers, ...rows];
}

function _createPortfolioOverviewSheet(portfolio, performanceData) {
  const data = [
    ['Portfolio Overview', ''],
    ['', ''],
    ['Portfolio Name', portfolio.name || ''],
    ['Created', portfolio.created_at ? new Date(portfolio.created_at).toLocaleDateString() : ''],
    ['Last Updated', portfolio.last_updated ? new Date(portfolio.last_updated).toLocaleDateString() : ''],
    ['Strategy', portfolio.strategy || ''],
    ['Benchmark', portfolio.benchmark || '^GSPC'],
    ['', ''],
    ['Performance Summary', ''],
    ['Total Value', performanceData?.totalValue?.toFixed(2) || ''],
    ['Cost Basis', performanceData?.costBasis?.toFixed(2) || ''],
    ['Total P&L', performanceData?.totalPnL?.toFixed(2) || ''],
    ['Total P&L %', performanceData?.totalPnLPct ? `${performanceData.totalPnLPct.toFixed(2)}%` : ''],
    ['', ''],
    ['Risk Metrics', ''],
    ['Sharpe Ratio', performanceData?.sharpeRatio?.toFixed(2) || ''],
    ['Max Drawdown', performanceData?.maxDrawdown ? `${performanceData.maxDrawdown.toFixed(2)}%` : ''],
    ['Volatility', performanceData?.volatility ? `${performanceData.volatility.toFixed(2)}%` : '']
  ];

  return data;
}

function _createPositionsSheet(portfolio) {
  const headers = [
    'Ticker',
    'Name',
    'Quantity',
    'Entry Price',
    'Current Price',
    'Weight %',
    'Unrealized P&L',
    'Unrealized P&L %'
  ];

  const rows = (portfolio.positions || []).map(p => [
    p.ticker || '',
    p.name || '',
    p.quantity || '',
    p.entry_price?.toFixed(2) || '',
    p.current_price?.toFixed(2) || '',
    p.weight ? `${(p.weight * 100).toFixed(2)}%` : '',
    p.unrealized_pnl?.toFixed(2) || '',
    p.unrealized_pnl_pct ? `${(p.unrealized_pnl_pct * 100).toFixed(2)}%` : ''
  ]);

  return [headers, ...rows];
}

function _createPerformanceMetricsSheet(performanceData) {
  if (!performanceData) return [['No performance data available']];

  const data = [
    ['Performance Metrics', ''],
    ['', ''],
    ['Returns', ''],
    ['Total Return', performanceData.totalReturn ? `${performanceData.totalReturn.toFixed(2)}%` : ''],
    ['Annualized Return', performanceData.annualizedReturn ? `${performanceData.annualizedReturn.toFixed(2)}%` : ''],
    ['', ''],
    ['Risk-Adjusted Returns', ''],
    ['Sharpe Ratio', performanceData.sharpeRatio?.toFixed(2) || ''],
    ['Sortino Ratio', performanceData.sortinoRatio?.toFixed(2) || ''],
    ['Calmar Ratio', performanceData.calmarRatio?.toFixed(2) || ''],
    ['', ''],
    ['Risk Metrics', ''],
    ['Volatility', performanceData.volatility ? `${performanceData.volatility.toFixed(2)}%` : ''],
    ['Max Drawdown', performanceData.maxDrawdown ? `${performanceData.maxDrawdown.toFixed(2)}%` : ''],
    ['', ''],
    ['Benchmark Comparison', ''],
    ['Alpha', performanceData.alpha?.toFixed(4) || ''],
    ['Beta', performanceData.beta?.toFixed(2) || ''],
    ['Tracking Error', performanceData.trackingError ? `${performanceData.trackingError.toFixed(2)}%` : ''],
    ['Excess Return', performanceData.excessReturn ? `${performanceData.excessReturn.toFixed(2)}%` : '']
  ];

  return data;
}

function _createRiskAnalysisSheet(riskData) {
  if (!riskData) return [['No risk data available']];

  const data = [
    ['Risk Analysis', ''],
    ['', ''],
    ['Value at Risk (VaR)', ''],
    ['VaR 95%', riskData.var95 ? `${riskData.var95.toFixed(2)}%` : ''],
    ['CVaR 95%', riskData.cvar95 ? `${riskData.cvar95.toFixed(2)}%` : ''],
    ['', ''],
    ['Portfolio Risk', ''],
    ['Daily Volatility', riskData.dailyVol ? `${riskData.dailyVol.toFixed(2)}%` : ''],
    ['Annual Volatility', riskData.annualVol ? `${riskData.annualVol.toFixed(2)}%` : ''],
    ['', ''],
    ['Diversification', ''],
    ['Concentration Risk', riskData.concentration ? `${riskData.concentration.toFixed(2)}%` : ''],
    ['Number of Positions', riskData.numPositions || '']
  ];

  return data;
}

function _createRebalanceHistorySheet(rebalanceHistory) {
  const headers = [
    'Date',
    'Reason',
    'Changes',
    'Total Value'
  ];

  const rows = rebalanceHistory.slice(0, 100).map(r => [
    r.timestamp ? new Date(r.timestamp).toLocaleString() : '',
    r.reason || '',
    r.changes ? r.changes.length : 0,
    r.total_value?.toFixed(2) || ''
  ]);

  return [headers, ...rows];
}

function _createTopAssetsSheet(scanResults) {
  const headers = [
    'Rank',
    'Ticker',
    'Name',
    'Score',
    'Trend',
    'Momentum',
    'Risk',
    'Liquidity',
    'Price',
    'Volume'
  ];

  const rows = scanResults.slice(0, 100).map((r, idx) => [
    idx + 1,
    r.ticker || '',
    r.name || '',
    r.score?.toFixed(4) || '',
    r.trend?.toFixed(4) || '',
    r.momentum?.toFixed(4) || '',
    r.risk?.toFixed(4) || '',
    r.liquidity?.toFixed(4) || '',
    r.price?.toFixed(2) || '',
    r.volume || ''
  ]);

  return [headers, ...rows];
}

function _createAllocationSheet(allocation) {
  const headers = [
    'Ticker',
    'Name',
    'Score',
    'Weight %',
    'Volatility',
    'Recommended $',
    'Marginal Risk'
  ];

  const rows = (allocation.assets || []).map(a => [
    a.ticker || '',
    a.name || '',
    a.score?.toFixed(4) || '',
    a.weight ? `${(a.weight * 100).toFixed(2)}%` : '',
    a.volatility ? `${(a.volatility * 100).toFixed(2)}%` : '',
    a.recommended_capital?.toFixed(2) || '',
    a.marginal_risk?.toFixed(4) || ''
  ]);

  return [headers, ...rows];
}

function _createScanRiskMetricsSheet(riskMetrics) {
  const data = [
    ['Portfolio Risk Metrics', ''],
    ['', ''],
    ['Portfolio Statistics', ''],
    ['Expected Volatility', riskMetrics.portfolio_volatility ? `${(riskMetrics.portfolio_volatility * 100).toFixed(2)}%` : ''],
    ['Diversification Ratio', riskMetrics.diversification_ratio?.toFixed(2) || ''],
    ['Concentration', riskMetrics.concentration ? `${(riskMetrics.concentration * 100).toFixed(2)}%` : ''],
    ['', ''],
    ['Value at Risk', ''],
    ['Diversified VaR (95%)', riskMetrics.diversified_var ? `${(riskMetrics.diversified_var * 100).toFixed(2)}%` : ''],
    ['Undiversified VaR (95%)', riskMetrics.undiversified_var ? `${(riskMetrics.undiversified_var * 100).toFixed(2)}%` : '']
  ];

  return data;
}

function _createDetailedScoresSheet(scanResults) {
  const headers = [
    'Ticker',
    'Name',
    'Total Score',
    'Trend',
    'Momentum',
    'Risk',
    'Liquidity',
    'Final'
  ];

  const rows = scanResults.slice(0, 100).map(r => [
    r.ticker || '',
    r.name || '',
    r.totalScore?.toFixed(4) || '',
    r.trendScore?.toFixed(4) || '',
    r.momentumScore?.toFixed(4) || '',
    r.riskScore?.toFixed(4) || '',
    r.liquidityScore?.toFixed(4) || '',
    r.score?.toFixed(4) || ''
  ]);

  return [headers, ...rows];
}