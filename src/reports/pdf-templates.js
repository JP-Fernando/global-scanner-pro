// =====================================================
// PDF REPORT TEMPLATES
// Professional PDF templates for different audiences
// =====================================================

import { PDFReportGenerator, ExecutiveSummaryGenerator } from './report-generator.js';
import _i18n from '../i18n/i18n.js';

/**
 * AUDIT REPORT TEMPLATE
 * Comprehensive compliance and governance report for auditors
 */
export function generateAuditReport(portfolio, governance, riskData, performanceData) {
  const pdf = new PDFReportGenerator({ portfolio, governance, riskData, performanceData });

  // Title Page
  pdf.addTitle('PORTFOLIO AUDIT REPORT');
  pdf.addSubtitle(`Portfolio: ${portfolio.name || 'N/A'}`);
  pdf.addSubtitle(`Report Generated: ${pdf.generatedAt}`);
  pdf.currentY += 10;

  // Executive Summary
  pdf.addSectionHeader('1. Executive Summary');
  const summaryData = { ...performanceData, positions: portfolio.positions };
  const summary = new ExecutiveSummaryGenerator(summaryData);
  const execSummary = summary.generate();
  pdf.addText(execSummary.overview);
  pdf.currentY += 5;

  // Portfolio Overview
  pdf.addSectionHeader('2. Portfolio Overview');
  const overviewMetrics = [
    { label: 'Portfolio Name', value: portfolio.name || 'N/A' },
    { label: 'Strategy', value: portfolio.strategy || 'N/A' },
    { label: 'Benchmark', value: portfolio.benchmark || '^GSPC' },
    { label: 'Total Value', value: pdf.formatCurrency(performanceData?.totalValue || 0) },
    { label: 'Number of Positions', value: portfolio.positions?.length || 0 },
    { label: 'Last Rebalance', value: portfolio.last_rebalance ? new Date(portfolio.last_rebalance).toLocaleDateString() : 'Never' }
  ];
  pdf.addMetricsBox(overviewMetrics, 2);

  // Compliance Status
  pdf.addSectionHeader('3. Compliance Status');
  if (governance && governance.compliance) {
    const complianceStatus = governance.compliance.passed ? '✓ PASSED' : '✗ FAILED';
    const _statusColor = governance.compliance.passed ? 'green' : 'red';
    pdf.addText(`Overall Compliance Status: ${complianceStatus}`);

    if (governance.compliance.issues && governance.compliance.issues.length > 0) {
      pdf.addText(`Issues Found: ${governance.compliance.issues.length}`);
      pdf.currentY += 5;

      const issuesTable = governance.compliance.issues.map(issue => [
        issue.level || 'MEDIUM',
        issue.rule || '',
        issue.description || '',
        issue.affected_assets?.join(', ') || ''
      ]);

      pdf.addTable(
        ['Level', 'Rule', 'Description', 'Affected Assets'],
        issuesTable
      );
    } else {
      pdf.addText('No compliance issues found.');
    }
  } else {
    pdf.addText('No governance data available.');
  }

  // Governance Rules Applied
  pdf.addSectionHeader('4. Governance Rules Applied');
  if (governance && governance.rules_applied) {
    const rulesTable = Object.entries(governance.rules_applied).map(([rule, value]) => [
      rule,
      String(value)
    ]);
    pdf.addTable(['Rule', 'Value'], rulesTable);
  }

  // Risk Assessment
  pdf.addSectionHeader('5. Risk Assessment');
  const riskMetrics = [
    { label: 'VaR (95%)', value: pdf.formatPercent(riskData?.var95 / 100 || 0) },
    { label: 'CVaR (95%)', value: pdf.formatPercent(riskData?.cvar95 / 100 || 0) },
    { label: 'Max Drawdown', value: pdf.formatPercent(performanceData?.maxDrawdown / 100 || 0) },
    { label: 'Volatility', value: pdf.formatPercent(performanceData?.volatility / 100 || 0) },
    { label: 'Sharpe Ratio', value: pdf.formatNumber(performanceData?.sharpeRatio || 0) },
    { label: 'Beta', value: pdf.formatNumber(performanceData?.beta || 0) }
  ];
  pdf.addMetricsBox(riskMetrics, 3);

  // Position Details
  pdf.addSectionHeader('6. Current Positions');
  if (portfolio.positions && portfolio.positions.length > 0) {
    const positionsTable = portfolio.positions.map(p => [
      p.ticker || '',
      p.quantity || '',
      pdf.formatCurrency(p.entry_price || 0),
      pdf.formatCurrency(p.current_price || 0),
      pdf.formatPercent((p.weight || 0)),
      pdf.formatCurrency(p.unrealized_pnl || 0)
    ]);

    pdf.addTable(
      ['Ticker', 'Qty', 'Entry Price', 'Current', 'Weight', 'P&L'],
      positionsTable
    );
  }

  // Rebalance History (last 10)
  if (portfolio.rebalanceHistory && portfolio.rebalanceHistory.length > 0) {
    pdf.addSectionHeader('7. Recent Rebalancing Activity');
    const rebalanceTable = portfolio.rebalanceHistory.slice(0, 10).map(r => [
      new Date(r.timestamp).toLocaleDateString(),
      r.reason || '',
      r.changes?.length || 0,
      pdf.formatCurrency(r.total_value || 0)
    ]);

    pdf.addTable(
      ['Date', 'Reason', 'Changes', 'Portfolio Value'],
      rebalanceTable
    );
  }

  // Audit Trail
  pdf.addSectionHeader('8. Audit Trail');
  pdf.addText(`Portfolio Created: ${  portfolio.created_at ? new Date(portfolio.created_at).toLocaleString() : 'Unknown'}`);
  pdf.addText(`Last Updated: ${  portfolio.last_updated ? new Date(portfolio.last_updated).toLocaleString() : 'Unknown'}`);
  pdf.addText(`Last Rebalance: ${  portfolio.last_rebalance ? new Date(portfolio.last_rebalance).toLocaleString() : 'Never'}`);

  // Auditor Notes Section
  pdf.addSectionHeader('9. Auditor Notes');
  pdf.addText('_'.repeat(100));
  pdf.currentY += 20;
  pdf.addText('_'.repeat(100));
  pdf.currentY += 20;
  pdf.addText('_'.repeat(100));

  // Download
  const filename = pdf.getFilename(`audit_report_${portfolio.name || 'portfolio'}`, 'pdf');
  pdf.download(filename);
}

/**
 * INVESTMENT COMMITTEE REPORT TEMPLATE
 * Strategic report for investment decision makers
 */
export function generateInvestmentCommitteeReport(
  portfolio, performanceData, riskData, marketContext
) {
  const pdf = new PDFReportGenerator({ portfolio, performanceData, riskData, marketContext });

  // Title Page
  pdf.addTitle('INVESTMENT COMMITTEE REPORT');
  pdf.addSubtitle(`Portfolio: ${portfolio.name || 'N/A'}`);
  pdf.addSubtitle(`Strategy: ${portfolio.strategy || 'N/A'}`);
  pdf.addSubtitle(`Report Date: ${pdf.generatedAt}`);
  pdf.currentY += 15;

  // Executive Summary
  pdf.addSectionHeader('EXECUTIVE SUMMARY');
  const summaryGen = new ExecutiveSummaryGenerator({
    ...performanceData,
    positions: portfolio.positions,
    strategyName: portfolio.strategy
  });
  const execSummary = summaryGen.generate();
  pdf.addText(execSummary.overview);
  pdf.currentY += 10;

  // Key Performance Metrics
  pdf.addSectionHeader('KEY PERFORMANCE METRICS');
  const perfMetrics = [
    { label: 'Total Return', value: pdf.formatPercent((performanceData?.totalReturn || 0) / 100) },
    { label: 'Annualized Return', value: pdf.formatPercent((performanceData?.annualizedReturn || 0) / 100) },
    { label: 'Sharpe Ratio', value: pdf.formatNumber(performanceData?.sharpeRatio || 0) },
    { label: 'Sortino Ratio', value: pdf.formatNumber(performanceData?.sortinoRatio || 0) },
    { label: 'Max Drawdown', value: pdf.formatPercent((performanceData?.maxDrawdown || 0) / 100) },
    { label: 'Volatility', value: pdf.formatPercent((performanceData?.volatility || 0) / 100) }
  ];
  pdf.addMetricsBox(perfMetrics, 3);

  // Market Context
  pdf.addSectionHeader('MARKET CONTEXT');
  const regime = execSummary.marketContext?.regime || 'UNKNOWN';
  const sentiment = execSummary.marketContext?.sentiment || 'NEUTRAL';
  pdf.addText(`Current Market Regime: ${regime}`);
  pdf.addText(`Market Sentiment: ${sentiment}`);
  pdf.currentY += 10;

  // Strategic Positioning
  pdf.addSectionHeader('STRATEGIC POSITIONING');
  pdf.addText(`This portfolio follows a ${portfolio.strategy || 'custom'} strategy, ` +
             `targeting ${portfolio.positions?.length || 0} positions across multiple sectors.`);
  pdf.currentY += 5;

  // Top Holdings
  if (portfolio.positions && portfolio.positions.length > 0) {
    const topHoldings = [...portfolio.positions]
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, 10);

    const holdingsTable = topHoldings.map(p => [
      p.ticker || '',
      p.name || '',
      pdf.formatPercent(p.weight || 0),
      pdf.formatCurrency(p.current_price || 0),
      pdf.formatPercent((p.unrealized_pnl_pct || 0))
    ]);

    pdf.addTable(
      ['Ticker', 'Name', 'Weight', 'Price', 'P&L %'],
      holdingsTable
    );
  }

  // Risk Analysis
  pdf.addSectionHeader('RISK ANALYSIS');

  // Main Risks
  if (execSummary.mainRisks && execSummary.mainRisks.length > 0) {
    pdf.addText('Identified Risks:');
    pdf.currentY += 3;

    const risksTable = execSummary.mainRisks.map(risk => [
      risk.level || 'MEDIUM',
      risk.type || '',
      risk.description || ''
    ]);

    pdf.addTable(
      ['Level', 'Type', 'Description'],
      risksTable,
      {
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 40 },
          2: { cellWidth: 110 }
        }
      }
    );
  }

  // Risk Metrics
  const riskMetrics = [
    { label: 'VaR (95%)', value: pdf.formatPercent((riskData?.var95 || 0) / 100) },
    { label: 'CVaR (95%)', value: pdf.formatPercent((riskData?.cvar95 || 0) / 100) },
    { label: 'Concentration', value: pdf.formatPercent((riskData?.concentration || 0)) },
    { label: 'Beta', value: pdf.formatNumber(performanceData?.beta || 0) }
  ];
  pdf.addMetricsBox(riskMetrics, 2);

  // Benchmark Comparison
  pdf.addSectionHeader('BENCHMARK COMPARISON');
  const benchmarkMetrics = [
    { label: 'Benchmark', value: portfolio.benchmark || '^GSPC' },
    { label: 'Alpha', value: pdf.formatPercent((performanceData?.alpha || 0)) },
    { label: 'Beta', value: pdf.formatNumber(performanceData?.beta || 0) },
    { label: 'Tracking Error', value: pdf.formatPercent((performanceData?.trackingError || 0) / 100) },
    { label: 'Excess Return', value: pdf.formatPercent((performanceData?.excessReturn || 0) / 100) },
    { label: 'Info Ratio', value: pdf.formatNumber(performanceData?.informationRatio || 0) }
  ];
  pdf.addMetricsBox(benchmarkMetrics, 3);

  // Recommendations
  pdf.addSectionHeader('RECOMMENDATIONS');
  if (execSummary.recommendations && execSummary.recommendations.length > 0) {
    execSummary.recommendations.forEach((rec, idx) => {
      pdf.addText(`${idx + 1}. ${rec.action} (${rec.priority})`);
      pdf.addText(`   Rationale: ${rec.rationale}`);
      pdf.addText(`   Suggestion: ${rec.suggestion}`);
      pdf.currentY += 3;
    });
  } else {
    pdf.addText('No specific recommendations at this time. Portfolio is performing within expected parameters.');
  }

  // Download
  const filename = pdf.getFilename(`investment_committee_${portfolio.name || 'portfolio'}`, 'pdf');
  pdf.download(filename);
}

/**
 * CLIENT REPORT TEMPLATE
 * Simplified, client-friendly report
 */
export function generateClientReport(portfolio, performanceData, riskData) {
  const pdf = new PDFReportGenerator({ portfolio, performanceData, riskData });

  // Title Page
  pdf.addTitle('PORTFOLIO PERFORMANCE REPORT');
  pdf.addSubtitle(`${portfolio.name || 'Your Portfolio'}`);
  pdf.addSubtitle(`Report Period: ${pdf.generatedAt}`);
  pdf.currentY += 15;

  // Portfolio Snapshot
  pdf.addSectionHeader('Portfolio Snapshot');
  const snapshotMetrics = [
    { label: 'Current Value', value: pdf.formatCurrency(performanceData?.totalValue || 0) },
    { label: 'Total Gain/Loss', value: pdf.formatCurrency(performanceData?.totalPnL || 0) },
    { label: 'Return', value: pdf.formatPercent((performanceData?.totalPnLPct || 0) / 100) },
    { label: 'Holdings', value: portfolio.positions?.length || 0 }
  ];
  pdf.addMetricsBox(snapshotMetrics, 2);

  // Performance Summary
  pdf.addSectionHeader('How Your Portfolio Performed');
  const performanceText = performanceData?.totalPnLPct > 0
    ? `Your portfolio gained ${pdf.formatPercent((performanceData.totalPnLPct || 0) / 100)} during this period.`
    : `Your portfolio experienced a ${pdf.formatPercent(Math.abs((performanceData?.totalPnLPct || 0) / 100))} decline during this period.`;

  pdf.addText(performanceText);
  pdf.currentY += 5;

  const perfSummary = [
    { label: 'Total Return', value: pdf.formatPercent((performanceData?.totalReturn || 0) / 100) },
    { label: 'Annual Return', value: pdf.formatPercent((performanceData?.annualizedReturn || 0) / 100) },
    { label: 'Best Month', value: 'N/A' }, // Would need monthly data
    { label: 'Worst Month', value: 'N/A' }  // Would need monthly data
  ];
  pdf.addMetricsBox(perfSummary, 2);

  // Your Holdings
  pdf.addSectionHeader('Your Holdings');
  if (portfolio.positions && portfolio.positions.length > 0) {
    const holdingsTable = portfolio.positions
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .map(p => [
        p.ticker || '',
        p.name || '',
        pdf.formatPercent(p.weight || 0),
        pdf.formatCurrency(p.current_price || 0),
        pdf.formatCurrency(p.unrealized_pnl || 0)
      ]);

    pdf.addTable(
      ['Symbol', 'Company', 'Portfolio %', 'Price', 'Gain/Loss'],
      holdingsTable
    );
  }

  // Risk Level (Simplified)
  pdf.addSectionHeader('Portfolio Risk Level');
  const volatility = performanceData?.volatility || 0;
  let riskLevel = 'MODERATE';
  let riskDescription = 'Your portfolio has moderate volatility.';

  if (volatility < 15) {
    riskLevel = 'LOW';
    riskDescription = 'Your portfolio has low volatility, suggesting conservative holdings.';
  } else if (volatility > 25) {
    riskLevel = 'HIGH';
    riskDescription = 'Your portfolio has high volatility, suggesting aggressive holdings.';
  }

  pdf.addText(`Risk Level: ${riskLevel}`);
  pdf.addText(riskDescription);
  pdf.currentY += 5;

  const riskMetrics = [
    { label: 'Volatility', value: pdf.formatPercent((performanceData?.volatility || 0) / 100) },
    { label: 'Largest Decline', value: pdf.formatPercent((performanceData?.maxDrawdown || 0) / 100) }
  ];
  pdf.addMetricsBox(riskMetrics, 2);

  // Comparison to Market
  pdf.addSectionHeader('Comparison to Market');
  const benchmark = portfolio.benchmark || 'S&P 500';
  const alpha = performanceData?.alpha || 0;
  const comparisonText = alpha > 0
    ? `Your portfolio outperformed the ${benchmark} by ${pdf.formatPercent(alpha)}.`
    : `Your portfolio underperformed the ${benchmark} by ${pdf.formatPercent(Math.abs(alpha))}.`;

  pdf.addText(comparisonText);
  pdf.currentY += 5;

  // Simple Glossary
  pdf.addSectionHeader('Understanding Your Report');
  pdf.addText('Total Return: The overall percentage gain or loss on your investment.');
  pdf.addText('Volatility: A measure of how much your portfolio value fluctuates. Lower is generally less risky.');
  pdf.addText('Maximum Drawdown: The largest peak-to-trough decline in your portfolio value.');
  pdf.addText('Sharpe Ratio: Risk-adjusted return measure. Higher values indicate better risk-adjusted performance.');

  // Disclaimer
  pdf.currentY += 10;
  pdf.pdf.setFontSize(7);
  pdf.pdf.setTextColor(100);
  pdf.addText('This report is for informational purposes only and should not be considered investment advice. ' +
              'Past performance does not guarantee future results. Please consult with a financial advisor ' +
              'before making investment decisions.');

  // Download
  const filename = pdf.getFilename(`client_report_${portfolio.name || 'portfolio'}`, 'pdf');
  pdf.download(filename);
}



/**
 * ATTRIBUTION REPORT TEMPLATE
 * Performance attribution analysis report for portfolio reviews
 */
export function generateAttributionReport(portfolio, attributionData) {
  const pdf = new PDFReportGenerator({ portfolio, attributionData });

  pdf.addTitle('ATTRIBUTION ANALYSIS REPORT');
  pdf.addSubtitle(`Portfolio: ${portfolio.name || 'N/A'}`);
  pdf.addSubtitle(`Benchmark: ${portfolio.benchmark || '^GSPC'}`);
  pdf.addSubtitle(`Report Date: ${pdf.generatedAt}`);
  pdf.currentY += 10;

  const summary = attributionData?.summary || {};
  pdf.addSectionHeader('SUMMARY');
  const summaryMetrics = [
    { label: 'Total Return', value: pdf.formatPercent(summary.total_return || 0) },
    { label: 'Benchmark Return', value: pdf.formatPercent(summary.benchmark_return || 0) },
    { label: 'Excess Return', value: pdf.formatPercent(summary.excess_return || 0) },
    { label: 'Active Positions', value: summary.active_positions ?? 0 }
  ];
  pdf.addMetricsBox(summaryMetrics, 2);

  pdf.addSectionHeader('BRINSON ATTRIBUTION');
  if (attributionData?.brinson?.allocation_effect?.by_sector?.length) {
    const brinsonRows = attributionData.brinson.allocation_effect.by_sector.map(sector => [
      sector.sector,
      `${sector.portfolio_weight.toFixed(2)}%`,
      `${sector.benchmark_weight.toFixed(2)}%`,
      `${sector.weight_difference.toFixed(2)}%`,
      `${sector.contribution.toFixed(2)}%`
    ]);

    pdf.addTable(
      ['Sector', 'Portfolio W', 'Benchmark W', 'Diff', 'Contribution'],
      brinsonRows
    );
  } else {
    pdf.addText('No Brinson attribution data available.');
  }

  pdf.addSectionHeader('FACTOR ATTRIBUTION');
  if (attributionData?.factors) {
    const factorRows = [
      ['Trend', `${attributionData.factors.trend.total_contribution.toFixed(2)  }%`],
      ['Momentum', `${attributionData.factors.momentum.total_contribution.toFixed(2)  }%`],
      ['Risk', `${attributionData.factors.risk.total_contribution.toFixed(2)  }%`],
      ['Liquidity', `${attributionData.factors.liquidity.total_contribution.toFixed(2)  }%`]
    ];
    pdf.addTable(['Factor', 'Total Contribution'], factorRows);
  } else {
    pdf.addText('No factor attribution data available.');
  }

  pdf.addSectionHeader('ASSET CONTRIBUTION (TOP 10)');
  if (attributionData?.assets?.top_contributors?.length) {
    const assetRows = attributionData.assets.top_contributors.map(asset => [
      asset.ticker,
      asset.name,
      asset.sector,
      `${asset.weight.toFixed(2)}%`,
      `${asset.return.toFixed(2)}%`,
      `${asset.contribution.toFixed(2)}%`
    ]);
    pdf.addTable(
      ['Ticker', 'Name', 'Sector', 'Weight', 'Return', 'Contribution'],
      assetRows
    );
  } else {
    pdf.addText('No asset contribution data available.');
  }

  pdf.addSectionHeader('PERIOD ATTRIBUTION (LAST 12 MONTHS)');
  if (attributionData?.periods?.monthly?.length) {
    const periodRows = attributionData.periods.monthly.slice(-12).reverse().map(period => [
      period.period,
      `${period.portfolio_return.toFixed(2)}%`,
      `${period.benchmark_return.toFixed(2)}%`,
      `${period.excess_return.toFixed(2)}%`
    ]);
    pdf.addTable(
      ['Period', 'Portfolio Return', 'Benchmark Return', 'Excess Return'],
      periodRows
    );
  } else {
    pdf.addText('No period attribution data available.');
  }

  pdf.addSectionHeader('MARKET EVENT ATTRIBUTION');
  if (attributionData?.events?.events?.length) {
    const eventRows = attributionData.events.events.map(event => [
      event.event_name,
      `${event.portfolio_return.toFixed(2)}%`,
      `${event.benchmark_return.toFixed(2)}%`,
      `${event.excess_return.toFixed(2)}%`,
      `${event.portfolio_max_drawdown.toFixed(2)}%`
    ]);
    pdf.addTable(
      ['Event', 'Portfolio Return', 'Benchmark Return', 'Excess Return', 'Max Drawdown'],
      eventRows
    );
  } else {
    pdf.addText('No market event attribution data available.');
  }

  const filename = pdf.getFilename(`attribution_report_${portfolio.name || 'portfolio'}`, 'pdf');
  pdf.download(filename);
}



/**
 * BACKTEST RESULTS PDF
 * Comprehensive backtest analysis report
 */
export function generateBacktestPDF(results, _options = {}) {
  const pdf = new PDFReportGenerator(results);

  // Title
  pdf.addTitle('BACKTEST ANALYSIS REPORT');
  pdf.addSubtitle(`Strategies Tested: ${results.length}`);
  pdf.addSubtitle(`Report Generated: ${pdf.generatedAt}`);
  pdf.currentY += 15;

  // Performance Comparison
  pdf.addSectionHeader('Performance Comparison');
  const perfTable = results.map(r => [
    r.strategyName || '',
    pdf.formatPercent((r.metrics?.cagr || 0)),
    pdf.formatNumber(r.metrics?.sharpeRatio || 0),
    pdf.formatPercent((r.metrics?.maxDrawdown || 0)),
    pdf.formatPercent((r.metrics?.volatility || 0))
  ]);

  pdf.addTable(
    ['Strategy', 'CAGR', 'Sharpe', 'Max DD', 'Volatility'],
    perfTable
  );

  // Best Strategy Details
  const bestStrategy = results[0];
  if (bestStrategy) {
    pdf.addSectionHeader(`Best Performing Strategy: ${bestStrategy.strategyName || 'N/A'}`);

    const bestMetrics = [
      { label: 'CAGR', value: pdf.formatPercent((bestStrategy.metrics?.cagr || 0)) },
      { label: 'Sharpe Ratio', value: pdf.formatNumber(bestStrategy.metrics?.sharpeRatio || 0) },
      { label: 'Sortino Ratio', value: pdf.formatNumber(bestStrategy.metrics?.sortinoRatio || 0) },
      { label: 'Calmar Ratio', value: pdf.formatNumber(bestStrategy.metrics?.calmarRatio || 0) },
      { label: 'Max Drawdown', value: pdf.formatPercent((bestStrategy.metrics?.maxDrawdown || 0)) },
      { label: 'Win Rate', value: pdf.formatPercent((bestStrategy.metrics?.winRate || 0)) }
    ];
    pdf.addMetricsBox(bestMetrics, 3);
  }

  // Detailed Metrics for All Strategies
  results.forEach((result, idx) => {
    pdf.addSectionHeader(`${idx + 1}. ${result.strategyName || 'Strategy'}`);

    const detailedTable = [
      ['Metric', 'Value'],
      ['Total Return', pdf.formatPercent((result.metrics?.totalReturn || 0))],
      ['CAGR', pdf.formatPercent((result.metrics?.cagr || 0))],
      ['Sharpe Ratio', pdf.formatNumber(result.metrics?.sharpeRatio || 0)],
      ['Sortino Ratio', pdf.formatNumber(result.metrics?.sortinoRatio || 0)],
      ['Calmar Ratio', pdf.formatNumber(result.metrics?.calmarRatio || 0)],
      ['Max Drawdown', pdf.formatPercent((result.metrics?.maxDrawdown || 0))],
      ['Volatility', pdf.formatPercent((result.metrics?.volatility || 0))],
      ['Win Rate', pdf.formatPercent((result.metrics?.winRate || 0))],
      ['Profit Factor', pdf.formatNumber(result.metrics?.profitFactor || 0)],
      ['Alpha', pdf.formatPercent((result.metrics?.alpha || 0))],
      ['Beta', pdf.formatNumber(result.metrics?.beta || 0)]
    ];

    pdf.addTable(
      detailedTable[0],
      detailedTable.slice(1)
    );
  });

  // Download
  const filename = pdf.getFilename('backtest_analysis', 'pdf');
  pdf.download(filename);
}