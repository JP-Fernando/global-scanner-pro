// =====================================================
// COMPARATIVE ANALYSIS
// Compare strategies, periods, and portfolios
// =====================================================

import { ComparativeAnalysisGenerator, PDFReportGenerator, ExcelReportGenerator } from './report-generator.js';

/**
 * Compare multiple backtest results
 */
export function compareBacktestStrategies(results) {
  const generator = new ComparativeAnalysisGenerator(results);
  return generator.compareStrategies();
}

/**
 * Compare portfolio performance across time periods
 */
export function comparePerformancePeriods(performanceData, periods) {
  const generator = new ComparativeAnalysisGenerator(performanceData);
  return generator.comparePeriods(periods);
}

/**
 * Generate comparative PDF report
 */
export function generateComparativePDF(datasets, title = 'Comparative Analysis') {
  const pdf = new PDFReportGenerator(datasets);

  // Title
  pdf.addTitle(title.toUpperCase());
  pdf.addSubtitle(`Comparing ${datasets.length} datasets`);
  pdf.addSubtitle(`Report Generated: ${pdf.generatedAt}`);
  pdf.currentY += 15;

  // Summary Comparison Table
  pdf.addSectionHeader('Performance Comparison Summary');

  const summaryTable = datasets.map(d => [
    d.strategyName || d.name || 'N/A',
    pdf.formatPercent((d.metrics?.cagr || 0)),
    pdf.formatNumber(d.metrics?.sharpeRatio || 0),
    pdf.formatNumber(d.metrics?.sortinoRatio || 0),
    pdf.formatPercent((d.metrics?.maxDrawdown || 0)),
    pdf.formatPercent((d.metrics?.volatility || 0))
  ]);

  pdf.addTable(
    ['Strategy', 'CAGR', 'Sharpe', 'Sortino', 'Max DD', 'Volatility'],
    summaryTable
  );

  // Rankings Analysis
  pdf.addSectionHeader('Performance Rankings');
  const generator = new ComparativeAnalysisGenerator(datasets);
  const comparison = generator.compareStrategies();

  if (comparison.rankings) {
    Object.entries(comparison.rankings).forEach(([metric, rankings]) => {
      pdf.addText(`${metric.toUpperCase()} Rankings:`);
      pdf.currentY += 2;

      const rankTable = rankings.map(r => [
        `#${r.rank}`,
        r.name || '',
        typeof r.value === 'number' ? pdf.formatNumber(r.value) : r.value
      ]);

      pdf.addTable(
        ['Rank', 'Strategy', 'Value'],
        rankTable,
        {
          margin: { left: pdf.margin + 10 },
          tableWidth: pdf.pageWidth - 2 * pdf.margin - 20
        }
      );
    });
  }

  // Best Overall Strategy
  if (comparison.summary && comparison.summary.bestOverall) {
    pdf.addSectionHeader('Overall Winner');
    pdf.addText(`Best Performing Strategy (by average rank): ${comparison.summary.bestOverall}`);
    pdf.currentY += 5;

    const overallRankings = comparison.summary.rankings || [];
    const rankTable = overallRankings.map(r => [
      r.name || '',
      r.avgRank || 'N/A'
    ]);

    pdf.addTable(
      ['Strategy', 'Avg Rank'],
      rankTable
    );
  }

  // Detailed Comparison
  pdf.addSectionHeader('Detailed Metric Comparison');
  datasets.forEach((dataset, idx) => {
    pdf.addText(`${idx + 1}. ${dataset.strategyName || dataset.name || 'Dataset'}`);

    const metrics = [
      { label: 'CAGR', value: pdf.formatPercent((dataset.metrics?.cagr || 0)) },
      { label: 'Total Return', value: pdf.formatPercent((dataset.metrics?.totalReturn || 0)) },
      { label: 'Sharpe Ratio', value: pdf.formatNumber(dataset.metrics?.sharpeRatio || 0) },
      { label: 'Sortino Ratio', value: pdf.formatNumber(dataset.metrics?.sortinoRatio || 0) },
      { label: 'Max Drawdown', value: pdf.formatPercent((dataset.metrics?.maxDrawdown || 0)) },
      { label: 'Volatility', value: pdf.formatPercent((dataset.metrics?.volatility || 0)) }
    ];

    pdf.addMetricsBox(metrics, 3);
    pdf.currentY += 5;
  });

  // Download
  const filename = pdf.getFilename('comparative_analysis', 'pdf');
  pdf.download(filename);
}

/**
 * Generate comparative Excel report
 */
export function generateComparativeExcel(datasets, title = 'Comparative Analysis') {
  const excel = new ExcelReportGenerator(datasets);

  // Sheet 1: Summary Comparison
  const summaryData = [
    ['Strategy', 'CAGR', 'Sharpe', 'Sortino', 'Calmar', 'Max DD', 'Volatility', 'Win Rate', 'Alpha', 'Beta'],
    ...datasets.map(d => [
      d.strategyName || d.name || 'N/A',
      d.metrics?.cagr?.toFixed(4) || '',
      d.metrics?.sharpeRatio?.toFixed(2) || '',
      d.metrics?.sortinoRatio?.toFixed(2) || '',
      d.metrics?.calmarRatio?.toFixed(2) || '',
      d.metrics?.maxDrawdown?.toFixed(4) || '',
      d.metrics?.volatility?.toFixed(4) || '',
      d.metrics?.winRate?.toFixed(4) || '',
      d.metrics?.alpha?.toFixed(4) || '',
      d.metrics?.beta?.toFixed(2) || ''
    ])
  ];

  excel.addWorksheet('Summary Comparison', summaryData, {
    columnWidths: [25, 12, 12, 12, 12, 12, 12, 12, 12, 12]
  });

  // Sheet 2: Rankings
  const generator = new ComparativeAnalysisGenerator(datasets);
  const comparison = generator.compareStrategies();

  if (comparison.rankings) {
    const rankingsData = [['Metric', 'Rank', 'Strategy', 'Value']];

    Object.entries(comparison.rankings).forEach(([metric, rankings]) => {
      rankings.forEach(r => {
        rankingsData.push([
          metric,
          r.rank,
          r.name || '',
          typeof r.value === 'number' ? r.value.toFixed(4) : r.value
        ]);
      });
    });

    excel.addWorksheet('Rankings', rankingsData, {
      columnWidths: [20, 10, 25, 15]
    });
  }

  // Sheet 3: Detailed Metrics for each strategy
  datasets.forEach((dataset, idx) => {
    const detailData = [
      ['Metric', 'Value'],
      ['Strategy Name', dataset.strategyName || dataset.name || 'N/A'],
      ['', ''],
      ['Returns', ''],
      ['Total Return', dataset.metrics?.totalReturn?.toFixed(4) || ''],
      ['CAGR', dataset.metrics?.cagr?.toFixed(4) || ''],
      ['', ''],
      ['Risk-Adjusted Returns', ''],
      ['Sharpe Ratio', dataset.metrics?.sharpeRatio?.toFixed(2) || ''],
      ['Sortino Ratio', dataset.metrics?.sortinoRatio?.toFixed(2) || ''],
      ['Calmar Ratio', dataset.metrics?.calmarRatio?.toFixed(2) || ''],
      ['', ''],
      ['Risk Metrics', ''],
      ['Volatility', dataset.metrics?.volatility?.toFixed(4) || ''],
      ['Max Drawdown', dataset.metrics?.maxDrawdown?.toFixed(4) || ''],
      ['Average Drawdown', dataset.metrics?.avgDrawdown?.toFixed(4) || ''],
      ['', ''],
      ['Trading Metrics', ''],
      ['Win Rate', dataset.metrics?.winRate?.toFixed(4) || ''],
      ['Profit Factor', dataset.metrics?.profitFactor?.toFixed(2) || ''],
      ['Avg Win', dataset.metrics?.avgWin?.toFixed(4) || ''],
      ['Avg Loss', dataset.metrics?.avgLoss?.toFixed(4) || ''],
      ['', ''],
      ['Benchmark Comparison', ''],
      ['Alpha', dataset.metrics?.alpha?.toFixed(4) || ''],
      ['Beta', dataset.metrics?.beta?.toFixed(2) || ''],
      ['Information Ratio', dataset.metrics?.informationRatio?.toFixed(2) || ''],
      ['Tracking Error', dataset.metrics?.trackingError?.toFixed(4) || '']
    ];

    const sheetName = `${idx + 1}_${(dataset.strategyName || dataset.name || 'Dataset').substring(0, 20)}`;
    excel.addWorksheet(sheetName, detailData, {
      columnWidths: [30, 15]
    });
  });

  // Download
  const filename = excel.getFilename('comparative_analysis', 'xlsx');
  excel.download(filename);
}

/**
 * Compare two specific periods (e.g., YTD vs Last Year)
 */
export function compareTwoPeriods(periodData1, periodData2, labels = ['Period 1', 'Period 2']) {
  const comparison = {
    period1: {
      label: labels[0],
      ...periodData1
    },
    period2: {
      label: labels[1],
      ...periodData2
    },
    differences: {
      cagr: (periodData1.cagr || 0) - (periodData2.cagr || 0),
      sharpeRatio: (periodData1.sharpeRatio || 0) - (periodData2.sharpeRatio || 0),
      maxDrawdown: (periodData1.maxDrawdown || 0) - (periodData2.maxDrawdown || 0),
      volatility: (periodData1.volatility || 0) - (periodData2.volatility || 0)
    },
    winner: null
  };

  // Determine winner based on Sharpe ratio
  if (periodData1.sharpeRatio > periodData2.sharpeRatio) {
    comparison.winner = labels[0];
  } else if (periodData2.sharpeRatio > periodData1.sharpeRatio) {
    comparison.winner = labels[1];
  } else {
    comparison.winner = 'TIE';
  }

  return comparison;
}

/**
 * Generate period comparison report (PDF)
 */
export function generatePeriodComparisonPDF(periodComparisons) {
  const pdf = new PDFReportGenerator(periodComparisons);

  pdf.addTitle('PERIOD COMPARISON REPORT');
  pdf.addSubtitle(`Comparing ${periodComparisons.length} time periods`);
  pdf.addSubtitle(`Report Generated: ${pdf.generatedAt}`);
  pdf.currentY += 15;

  // Comparison table
  const compTable = periodComparisons.map(p => [
    p.period1?.label || 'Period 1',
    pdf.formatPercent((p.period1?.cagr || 0)),
    pdf.formatNumber(p.period1?.sharpeRatio || 0),
    pdf.formatPercent((p.period1?.maxDrawdown || 0)),
    pdf.formatPercent((p.period1?.volatility || 0))
  ]);

  compTable.push(
    ...periodComparisons.map(p => [
      p.period2?.label || 'Period 2',
      pdf.formatPercent((p.period2?.cagr || 0)),
      pdf.formatNumber(p.period2?.sharpeRatio || 0),
      pdf.formatPercent((p.period2?.maxDrawdown || 0)),
      pdf.formatPercent((p.period2?.volatility || 0))
    ])
  );

  pdf.addTable(
    ['Period', 'CAGR', 'Sharpe', 'Max DD', 'Volatility'],
    compTable
  );

  // Differences
  pdf.addSectionHeader('Period-over-Period Changes');
  periodComparisons.forEach(comp => {
    pdf.addText(`${comp.period1?.label} vs ${comp.period2?.label}:`);
    pdf.addText(`  CAGR Change: ${pdf.formatPercent(comp.differences?.cagr || 0)}`);
    pdf.addText(`  Sharpe Change: ${pdf.formatNumber(comp.differences?.sharpeRatio || 0)}`);
    pdf.addText(`  Winner: ${comp.winner || 'N/A'}`);
    pdf.currentY += 5;
  });

  const filename = pdf.getFilename('period_comparison', 'pdf');
  pdf.download(filename);
}