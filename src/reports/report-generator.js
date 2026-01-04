// =====================================================
// ADVANCED REPORT GENERATOR
// Professional export system for portfolio analysis
// =====================================================

// NOTE: XLSX and jsPDF are loaded via CDN in HTML
// Access them via window.XLSX and window.jspdf
import i18n from '../i18n/i18n.js';

/**
 * Base Report Generator Class
 * Provides common functionality for all report types
 */
export class ReportGenerator {
  constructor(data) {
    this.data = data;
    this.timestamp = new Date().toISOString();
    this.generatedAt = new Date().toLocaleString();
  }

  /**
   * Generate filename with timestamp
   */
  getFilename(prefix, extension) {
    const date = new Date().toISOString().split('T')[0];
    return `${prefix}_${date}.${extension}`;
  }

  /**
   * Format number for display
   */
  formatNumber(value, decimals = 2) {
    if (value == null || isNaN(value)) return 'N/A';
    return Number(value).toFixed(decimals);
  }

  /**
   * Format percentage
   */
  formatPercent(value, decimals = 2) {
    if (value == null || isNaN(value)) return 'N/A';
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * Format currency
   */
  formatCurrency(value, currency = '$') {
    if (value == null || isNaN(value)) return 'N/A';
    return `${currency}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Safe value extraction with fallback
   */
  safeValue(obj, path, defaultValue = 'N/A') {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value == null) return defaultValue;
      value = value[key];
    }
    return value != null ? value : defaultValue;
  }
}

/**
 * Excel Export Generator
 */
export class ExcelReportGenerator extends ReportGenerator {
  constructor(data) {
    super(data);
    this.XLSX = window.XLSX;
    if (!this.XLSX) {
      throw new Error('XLSX library not loaded. Please include it via CDN.');
    }
    this.workbook = this.XLSX.utils.book_new();
  }

  /**
   * Add worksheet with data
   */
  addWorksheet(sheetName, data, options = {}) {
    const ws = this.XLSX.utils.aoa_to_sheet(data);

    // Apply column widths if provided
    if (options.columnWidths) {
      ws['!cols'] = options.columnWidths.map(w => ({ wch: w }));
    }

    this.XLSX.utils.book_append_sheet(this.workbook, ws, sheetName);
  }

  /**
   * Download the Excel file
   */
  download(filename) {
    this.XLSX.writeFile(this.workbook, filename);
  }
}

/**
 * PDF Export Generator
 */
export class PDFReportGenerator extends ReportGenerator {
  constructor(data, options = {}) {
    super(data);
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
      throw new Error('jsPDF library not loaded. Please include it via CDN.');
    }
    this.pdf = new jsPDF(options.orientation || 'portrait');
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.currentY = 20;
    this.margin = 20;
  }

  /**
   * Add title to PDF
   */
  addTitle(text, fontSize = 18) {
    this.pdf.setFontSize(fontSize);
    this.pdf.setFont(undefined, 'bold');
    this.pdf.text(text, this.margin, this.currentY);
    this.currentY += fontSize / 2 + 5;
  }

  /**
   * Add subtitle
   */
  addSubtitle(text, fontSize = 12) {
    this.pdf.setFontSize(fontSize);
    this.pdf.setFont(undefined, 'normal');
    this.pdf.setTextColor(100);
    this.pdf.text(text, this.margin, this.currentY);
    this.pdf.setTextColor(0);
    this.currentY += fontSize / 2 + 5;
  }

  /**
   * Add section header
   */
  addSectionHeader(text, fontSize = 14) {
    this.checkPageBreak(20);
    this.currentY += 5;
    this.pdf.setFontSize(fontSize);
    this.pdf.setFont(undefined, 'bold');
    this.pdf.text(text, this.margin, this.currentY);
    this.currentY += fontSize / 2 + 3;
  }

  /**
   * Add paragraph text
   */
  addText(text, fontSize = 10) {
    this.pdf.setFontSize(fontSize);
    this.pdf.setFont(undefined, 'normal');
    const lines = this.pdf.splitTextToSize(text, this.pageWidth - 2 * this.margin);

    lines.forEach(line => {
      this.checkPageBreak(10);
      this.pdf.text(line, this.margin, this.currentY);
      this.currentY += fontSize / 2 + 2;
    });
  }

  /**
   * Add table using jspdf-autotable
   */
  addTable(headers, rows, options = {}) {
    this.checkPageBreak(30);

    this.pdf.autoTable({
      head: [headers],
      body: rows,
      startY: this.currentY,
      margin: { left: this.margin, right: this.margin },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [30, 41, 59], // #1e293b
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // #f8fafc
      },
      ...options
    });

    this.currentY = this.pdf.lastAutoTable.finalY + 10;
  }

  /**
   * Add key-value pairs in a box
   */
  addMetricsBox(metrics, columns = 2) {
    this.checkPageBreak(20);

    const boxWidth = (this.pageWidth - 2 * this.margin) / columns;
    const boxHeight = 15;
    let xOffset = this.margin;
    let yOffset = this.currentY;

    metrics.forEach((metric, idx) => {
      if (idx > 0 && idx % columns === 0) {
        yOffset += boxHeight + 5;
        xOffset = this.margin;
      }

      // Draw box
      this.pdf.setFillColor(241, 245, 249); // #f1f5f9
      this.pdf.rect(xOffset, yOffset, boxWidth - 5, boxHeight, 'F');

      // Add label
      this.pdf.setFontSize(8);
      this.pdf.setTextColor(100);
      this.pdf.text(metric.label, xOffset + 5, yOffset + 5);

      // Add value
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(0);
      this.pdf.setFont(undefined, 'bold');
      this.pdf.text(String(metric.value), xOffset + 5, yOffset + 12);
      this.pdf.setFont(undefined, 'normal');

      xOffset += boxWidth;
    });

    this.currentY = yOffset + boxHeight + 10;
  }

  /**
   * Check if we need a page break
   */
  checkPageBreak(requiredSpace) {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }
  }

  /**
   * Add footer with page numbers
   */
  addFooter() {
    const pageCount = this.pdf.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i);
      this.pdf.setFontSize(8);
      this.pdf.setTextColor(150);
      this.pdf.text(
        `Page ${i} of ${pageCount} | Generated: ${this.generatedAt}`,
        this.margin,
        this.pageHeight - 10
      );
    }
  }

  /**
   * Download the PDF
   */
  download(filename) {
    this.addFooter();
    this.pdf.save(filename);
  }
}

/**
 * Comparative Analysis Generator
 * Compares multiple strategies or time periods
 */
export class ComparativeAnalysisGenerator extends ReportGenerator {
  constructor(datasets) {
    super(datasets);
    this.datasets = datasets;
  }

  /**
   * Compare strategies side by side
   */
  compareStrategies() {
    const comparison = {
      strategies: this.datasets.map(d => d.strategyName || d.name),
      metrics: this._extractCommonMetrics(),
      rankings: this._calculateRankings(),
      summary: this._generateComparisonSummary()
    };

    return comparison;
  }

  /**
   * Compare time periods
   */
  comparePeriods(periods) {
    const comparison = periods.map(period => ({
      period: period.label,
      data: this._filterDataByPeriod(period.start, period.end),
      metrics: this._calculatePeriodMetrics(period)
    }));

    return comparison;
  }

  /**
   * Extract common metrics from all datasets
   */
  _extractCommonMetrics() {
    const metricKeys = ['cagr', 'sharpeRatio', 'maxDrawdown', 'volatility', 'winRate'];

    return metricKeys.map(key => ({
      metric: key,
      values: this.datasets.map(d => this.safeValue(d, `metrics.${key}`, null))
    }));
  }

  /**
   * Calculate rankings for each metric
   */
  _calculateRankings() {
    const rankings = {};
    const metricKeys = ['cagr', 'sharpeRatio', 'maxDrawdown', 'volatility', 'winRate'];

    metricKeys.forEach(key => {
      const values = this.datasets.map((d, idx) => ({
        idx,
        value: this.safeValue(d, `metrics.${key}`, null),
        name: d.strategyName || d.name
      }));

      // Sort by value (descending for most metrics, ascending for drawdown)
      const ascending = key === 'maxDrawdown' || key === 'volatility';
      values.sort((a, b) => ascending ? a.value - b.value : b.value - a.value);

      rankings[key] = values.map((v, rank) => ({
        name: v.name,
        value: v.value,
        rank: rank + 1
      }));
    });

    return rankings;
  }

  /**
   * Generate comparison summary
   */
  _generateComparisonSummary() {
    const rankings = this._calculateRankings();
    const avgRanks = {};

    this.datasets.forEach((d, idx) => {
      const name = d.strategyName || d.name;
      const ranks = Object.values(rankings).map(r =>
        r.find(item => item.name === name)?.rank || 999
      );
      avgRanks[name] = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    });

    const sorted = Object.entries(avgRanks).sort((a, b) => a[1] - b[1]);

    return {
      bestOverall: sorted[0]?.[0],
      rankings: sorted.map(([name, avgRank]) => ({ name, avgRank: avgRank.toFixed(2) }))
    };
  }

  /**
   * Filter data by period
   */
  _filterDataByPeriod(start, end) {
    // This would filter equity curve or returns data by date range
    // Implementation depends on data structure
    return this.data;
  }

  /**
   * Calculate metrics for a specific period
   */
  _calculatePeriodMetrics(period) {
    // Calculate metrics for the filtered period
    // This is a placeholder - implement based on your data structure
    return {};
  }
}

/**
 * Executive Summary Generator
 * Creates concise, high-level summaries for decision makers
 */
export class ExecutiveSummaryGenerator extends ReportGenerator {
  constructor(data) {
    super(data);
  }

  /**
   * Generate executive summary
   */
  generate() {
    return {
      overview: this._generateOverview(),
      keyMetrics: this._extractKeyMetrics(),
      topSignals: this._identifyTopSignals(),
      mainRisks: this._identifyMainRisks(),
      recommendations: this._generateRecommendations(),
      marketContext: this._getMarketContext()
    };
  }

  /**
   * Generate overview paragraph
   */
  _generateOverview() {
    const strategy = this.data.strategyName || 'Portfolio';
    const performance = this.safeValue(this.data, 'metrics.cagr', 0);
    const sharpe = this.safeValue(this.data, 'metrics.sharpeRatio', 0);

    return `${strategy} generated a ${this.formatPercent(performance)} annualized return ` +
           `with a Sharpe ratio of ${this.formatNumber(sharpe)}. ` +
           this._getPerformanceQualifier(performance, sharpe);
  }

  /**
   * Get performance qualifier
   */
  _getPerformanceQualifier(cagr, sharpe) {
    if (sharpe > 2) return 'This represents excellent risk-adjusted returns.';
    if (sharpe > 1) return 'This demonstrates strong risk-adjusted performance.';
    if (sharpe > 0.5) return 'This shows moderate risk-adjusted returns.';
    return 'This indicates below-average risk-adjusted performance.';
  }

  /**
   * Extract key metrics for summary
   */
  _extractKeyMetrics() {
    return {
      totalReturn: this.safeValue(this.data, 'metrics.totalReturn'),
      cagr: this.safeValue(this.data, 'metrics.cagr'),
      sharpeRatio: this.safeValue(this.data, 'metrics.sharpeRatio'),
      maxDrawdown: this.safeValue(this.data, 'metrics.maxDrawdown'),
      volatility: this.safeValue(this.data, 'metrics.volatility'),
      winRate: this.safeValue(this.data, 'metrics.winRate'),
      alpha: this.safeValue(this.data, 'metrics.alpha'),
      beta: this.safeValue(this.data, 'metrics.beta')
    };
  }

  /**
   * Identify top signals/opportunities
   */
  _identifyTopSignals() {
    const signals = [];

    // Analyze portfolio for strong signals
    if (this.data.positions) {
      const topPositions = this.data.positions
        .filter(p => p.score > 0.7)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      signals.push(...topPositions.map(p => ({
        type: 'Strong Position',
        ticker: p.ticker,
        score: p.score,
        description: `${p.ticker} shows strong multi-factor score of ${this.formatNumber(p.score * 100)}%`
      })));
    }

    // Check for momentum signals
    const momentum = this.safeValue(this.data, 'signals.momentum', null);
    if (momentum && momentum > 0.6) {
      signals.push({
        type: 'Market Momentum',
        value: momentum,
        description: `Strong positive momentum detected (${this.formatPercent(momentum)})`
      });
    }

    return signals.slice(0, 5); // Top 5 signals
  }

  /**
   * Identify main risks
   */
  _identifyMainRisks() {
    const risks = [];

    // Drawdown risk
    const maxDD = this.safeValue(this.data, 'metrics.maxDrawdown', 0);
    if (Math.abs(maxDD) > 0.15) {
      risks.push({
        level: 'HIGH',
        type: 'Drawdown Risk',
        value: maxDD,
        description: `Maximum drawdown of ${this.formatPercent(maxDD)} exceeds 15% threshold`
      });
    }

    // Concentration risk
    if (this.data.positions) {
      const maxWeight = Math.max(...this.data.positions.map(p => p.weight || 0));
      if (maxWeight > 0.25) {
        risks.push({
          level: 'MEDIUM',
          type: 'Concentration Risk',
          value: maxWeight,
          description: `Single position exceeds 25% of portfolio (${this.formatPercent(maxWeight)})`
        });
      }
    }

    // Volatility risk
    const vol = this.safeValue(this.data, 'metrics.volatility', 0);
    if (vol > 0.25) {
      risks.push({
        level: 'MEDIUM',
        type: 'Volatility Risk',
        value: vol,
        description: `Portfolio volatility of ${this.formatPercent(vol)} is elevated`
      });
    }

    // Beta risk
    const beta = this.safeValue(this.data, 'metrics.beta', 1);
    if (Math.abs(beta) > 1.5) {
      risks.push({
        level: 'MEDIUM',
        type: 'Market Sensitivity',
        value: beta,
        description: `High beta of ${this.formatNumber(beta)} indicates significant market sensitivity`
      });
    }

    return risks;
  }

  /**
   * Generate recommendations
   */
  _generateRecommendations() {
    const recommendations = [];

    // Based on Sharpe ratio
    const sharpe = this.safeValue(this.data, 'metrics.sharpeRatio', 0);
    if (sharpe < 1) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Improve Risk-Adjusted Returns',
        rationale: 'Current Sharpe ratio below 1.0 suggests poor risk-adjusted performance',
        suggestion: 'Consider rebalancing to higher-quality assets or reducing position sizes'
      });
    }

    // Based on concentration
    if (this.data.positions) {
      const maxWeight = Math.max(...this.data.positions.map(p => p.weight || 0));
      if (maxWeight > 0.25) {
        recommendations.push({
          priority: 'MEDIUM',
          action: 'Reduce Concentration',
          rationale: 'Portfolio has excessive concentration in single position',
          suggestion: 'Redistribute weights to improve diversification'
        });
      }
    }

    // Based on drawdown
    const maxDD = Math.abs(this.safeValue(this.data, 'metrics.maxDrawdown', 0));
    if (maxDD > 0.2) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Implement Downside Protection',
        rationale: `Maximum drawdown of ${this.formatPercent(-maxDD)} is concerning`,
        suggestion: 'Consider adding defensive positions or implementing stop-loss rules'
      });
    }

    return recommendations;
  }

  /**
   * Get market context if available
   */
  _getMarketContext() {
    return {
      regime: this.safeValue(this.data, 'marketRegime.current', 'UNKNOWN'),
      volatility: this.safeValue(this.data, 'marketRegime.volatility', null),
      trend: this.safeValue(this.data, 'marketRegime.trend', null),
      sentiment: this.safeValue(this.data, 'marketRegime.sentiment', 'NEUTRAL')
    };
  }
}