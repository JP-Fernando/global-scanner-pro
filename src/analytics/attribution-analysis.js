/**
 * Performance Attribution Analysis
 *
 * Breaks down portfolio returns into:
 * 1. Asset Selection Effect (Stock Picking)
 * 2. Sector Allocation Effect
 * 3. Factor Contribution (Trend, Momentum, Risk, Liquidity)
 * 4. Period-based Attribution
 * 5. Market Event Attribution
 */

import { SECTOR_TAXONOMY } from '../data/sectors.js';
import i18n from '../i18n/i18n.js';

/**
 * Brinson-Fachler Attribution Model
 * Decomposes excess return into allocation and selection effects
 *
 * Total Effect = Allocation Effect + Selection Effect + Interaction Effect
 *
 * - Allocation Effect: (w_p - w_b) × R_b (sector weights difference × benchmark sector return)
 * - Selection Effect: w_b × (R_p - R_b) (benchmark weight × return difference)
 * - Interaction Effect: (w_p - w_b) × (R_p - R_b)
 */
export class AttributionAnalyzer {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Calculate full attribution analysis for a portfolio
   * @param {Object} portfolio - Portfolio object with positions
   * @param {Array} portfolioReturns - Historical returns [{date, value, positions}]
   * @param {Array} benchmarkReturns - Benchmark returns [{date, value}]
   * @param {Object} factorScores - Factor scores for each position
   * @returns {Object} Complete attribution analysis
   */
  calculateAttribution(portfolio, portfolioReturns, benchmarkReturns, factorScores = null) {
    const totalReturn = this._calculateTotalReturn(portfolioReturns);
    const benchmarkReturn = this._calculateTotalReturn(benchmarkReturns);
    const excessReturn = totalReturn - benchmarkReturn;

    // 1. Brinson Attribution (Allocation vs Selection)
    const brinsonAttribution = this._calculateBrinsonAttribution(
      portfolio,
      portfolioReturns,
      benchmarkReturns
    );

    // 2. Factor Attribution
    const factorAttribution = factorScores
      ? this._calculateFactorAttribution(portfolio, portfolioReturns, factorScores)
      : null;

    // 3. Individual Asset Contribution
    const assetContribution = this._calculateAssetContribution(portfolio, portfolioReturns);

    // 4. Period-based Attribution (rolling periods)
    const periodAttribution = this._calculatePeriodAttribution(portfolioReturns, benchmarkReturns);

    return {
      summary: {
        total_return: totalReturn,
        benchmark_return: benchmarkReturn,
        excess_return: excessReturn,
        active_positions: portfolio.positions.length,
        analysis_period: {
          start: portfolioReturns[0]?.date,
          end: portfolioReturns[portfolioReturns.length - 1]?.date,
          days: portfolioReturns.length
        }
      },
      brinson: brinsonAttribution,
      factors: factorAttribution,
      assets: assetContribution,
      periods: periodAttribution
    };
  }

  /**
   * Brinson-Fachler Attribution
   * @private
   */
  _calculateBrinsonAttribution(portfolio, portfolioReturns, benchmarkReturns) {
    // Group positions by sector
    const sectorGroups = this._groupPositionsBySector(portfolio.positions);

    // Calculate sector returns for portfolio
    const portfolioSectorReturns = this._calculateSectorReturns(
      sectorGroups,
      portfolioReturns
    );

    // Estimate benchmark sector composition (using market cap weights)
    // In a real implementation, this would come from the benchmark index composition
    const benchmarkSectorWeights = this._estimateBenchmarkSectorWeights();

    // Calculate benchmark sector returns (simplified: use overall benchmark return)
    const benchmarkTotalReturn = this._calculateTotalReturn(benchmarkReturns);

    const allocationEffect = [];
    const selectionEffect = [];
    const interactionEffect = [];

    // Calculate effects for each sector
    for (const [sectorId, positions] of Object.entries(sectorGroups)) {
      const sectorName = this._getSectorName(parseInt(sectorId));

      // Portfolio sector weight
      const portfolioWeight = positions.reduce((sum, p) => sum + (p.current_weight || 0), 0);

      // Benchmark sector weight (estimated)
      const benchmarkWeight = benchmarkSectorWeights[sectorId] || 0;

      // Portfolio sector return
      const portfolioSectorReturn = portfolioSectorReturns[sectorId] || 0;

      // Benchmark sector return (simplified: use benchmark return)
      const benchmarkSectorReturn = benchmarkTotalReturn;

      // Brinson-Fachler decomposition
      const allocation = (portfolioWeight - benchmarkWeight) * benchmarkSectorReturn;
      const selection = benchmarkWeight * (portfolioSectorReturn - benchmarkSectorReturn);
      const interaction = (portfolioWeight - benchmarkWeight) * (portfolioSectorReturn - benchmarkSectorReturn);

      allocationEffect.push({
        sector: sectorName,
        sector_id: parseInt(sectorId),
        portfolio_weight: portfolioWeight * 100,
        benchmark_weight: benchmarkWeight * 100,
        weight_difference: (portfolioWeight - benchmarkWeight) * 100,
        contribution: allocation * 100
      });

      selectionEffect.push({
        sector: sectorName,
        sector_id: parseInt(sectorId),
        portfolio_return: portfolioSectorReturn * 100,
        benchmark_return: benchmarkSectorReturn * 100,
        return_difference: (portfolioSectorReturn - benchmarkSectorReturn) * 100,
        contribution: selection * 100
      });

      interactionEffect.push({
        sector: sectorName,
        sector_id: parseInt(sectorId),
        contribution: interaction * 100
      });
    }

    const totalAllocation = allocationEffect.reduce((sum, e) => sum + e.contribution, 0);
    const totalSelection = selectionEffect.reduce((sum, e) => sum + e.contribution, 0);
    const totalInteraction = interactionEffect.reduce((sum, e) => sum + e.contribution, 0);

    return {
      allocation_effect: {
        total: totalAllocation,
        by_sector: allocationEffect.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      },
      selection_effect: {
        total: totalSelection,
        by_sector: selectionEffect.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      },
      interaction_effect: {
        total: totalInteraction,
        by_sector: interactionEffect.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      },
      total_active_return: totalAllocation + totalSelection + totalInteraction,
      interpretation: this._interpretBrinsonResults(totalAllocation, totalSelection)
    };
  }

  /**
   * Factor-based Attribution
   * Attributes returns to specific factors: Trend, Momentum, Risk, Liquidity
   * @private
   */
  _calculateFactorAttribution(portfolio, portfolioReturns, factorScores) {
    const factorContributions = {
      trend: [],
      momentum: [],
      risk: [],
      liquidity: []
    };

    // For each position, calculate contribution weighted by factor exposure
    portfolio.positions.forEach(position => {
      const positionReturn = this._calculatePositionReturn(position, portfolioReturns);
      const scores = factorScores[position.ticker] || {};

      const weight = position.current_weight || 0;
      const contribution = positionReturn * weight;

      // Distribute contribution across factors based on factor scores
      const totalScore = (scores.trend || 0) + (scores.momentum || 0) +
                        (scores.risk || 0) + (scores.liquidity || 0);

      if (totalScore > 0) {
        const trendProportion = (scores.trend || 0) / totalScore;
        const momentumProportion = (scores.momentum || 0) / totalScore;
        const riskProportion = (scores.risk || 0) / totalScore;
        const liquidityProportion = (scores.liquidity || 0) / totalScore;

        factorContributions.trend.push({
          ticker: position.ticker,
          name: position.name,
          factor_score: scores.trend || 0,
          weight: weight * 100,
          contribution: contribution * trendProportion * 100
        });

        factorContributions.momentum.push({
          ticker: position.ticker,
          name: position.name,
          factor_score: scores.momentum || 0,
          weight: weight * 100,
          contribution: contribution * momentumProportion * 100
        });

        factorContributions.risk.push({
          ticker: position.ticker,
          name: position.name,
          factor_score: scores.risk || 0,
          weight: weight * 100,
          contribution: contribution * riskProportion * 100
        });

        factorContributions.liquidity.push({
          ticker: position.ticker,
          name: position.name,
          factor_score: scores.liquidity || 0,
          weight: weight * 100,
          contribution: contribution * liquidityProportion * 100
        });
      }
    });

    // Calculate totals
    const trendTotal = factorContributions.trend.reduce((sum, e) => sum + e.contribution, 0);
    const momentumTotal = factorContributions.momentum.reduce((sum, e) => sum + e.contribution, 0);
    const riskTotal = factorContributions.risk.reduce((sum, e) => sum + e.contribution, 0);
    const liquidityTotal = factorContributions.liquidity.reduce((sum, e) => sum + e.contribution, 0);

    return {
      trend: {
        total_contribution: trendTotal,
        top_contributors: factorContributions.trend
          .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
          .slice(0, 5)
      },
      momentum: {
        total_contribution: momentumTotal,
        top_contributors: factorContributions.momentum
          .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
          .slice(0, 5)
      },
      risk: {
        total_contribution: riskTotal,
        top_contributors: factorContributions.risk
          .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
          .slice(0, 5)
      },
      liquidity: {
        total_contribution: liquidityTotal,
        top_contributors: factorContributions.liquidity
          .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
          .slice(0, 5)
      },
      summary: {
        trend_pct: (trendTotal / (trendTotal + momentumTotal + riskTotal + liquidityTotal) * 100) || 0,
        momentum_pct: (momentumTotal / (trendTotal + momentumTotal + riskTotal + liquidityTotal) * 100) || 0,
        risk_pct: (riskTotal / (trendTotal + momentumTotal + riskTotal + liquidityTotal) * 100) || 0,
        liquidity_pct: (liquidityTotal / (trendTotal + momentumTotal + riskTotal + liquidityTotal) * 100) || 0
      }
    };
  }

  /**
   * Individual Asset Contribution
   * Shows how much each asset contributed to total return
   * @private
   */
  _calculateAssetContribution(portfolio, portfolioReturns) {
    const contributions = portfolio.positions.map(position => {
      const positionReturn = this._calculatePositionReturn(position, portfolioReturns);
      const weight = position.current_weight || 0;
      const contribution = positionReturn * weight;

      return {
        ticker: position.ticker,
        name: position.name,
        sector: this._getSectorName(position.sector),
        weight: weight * 100,
        return: positionReturn * 100,
        contribution: contribution * 100,
        entry_price: position.entry_price,
        current_price: this._getCurrentPrice(position, portfolioReturns),
        score: position.score
      };
    });

    // Sort by absolute contribution
    contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    const totalContribution = contributions.reduce((sum, c) => sum + c.contribution, 0);

    return {
      total_contribution: totalContribution,
      top_contributors: contributions.slice(0, 10),
      top_detractors: contributions.filter(c => c.contribution < 0).slice(0, 5),
      all_assets: contributions
    };
  }

  /**
   * Period-based Attribution
   * Breaks down performance by time periods (monthly, quarterly)
   * @private
   */
  _calculatePeriodAttribution(portfolioReturns, benchmarkReturns) {
    const periods = {
      monthly: [],
      quarterly: [],
      yearly: []
    };

    // Monthly attribution
    const monthlyGroups = this._groupByPeriod(portfolioReturns, 'month');
    const benchmarkMonthlyGroups = this._groupByPeriod(benchmarkReturns, 'month');

    for (const [period, returns] of Object.entries(monthlyGroups)) {
      const portfolioReturn = this._calculatePeriodReturn(returns);
      const benchReturn = this._calculatePeriodReturn(benchmarkMonthlyGroups[period] || []);

      periods.monthly.push({
        period,
        portfolio_return: portfolioReturn * 100,
        benchmark_return: benchReturn * 100,
        excess_return: (portfolioReturn - benchReturn) * 100,
        days: returns.length
      });
    }

    // Quarterly attribution
    const quarterlyGroups = this._groupByPeriod(portfolioReturns, 'quarter');
    const benchmarkQuarterlyGroups = this._groupByPeriod(benchmarkReturns, 'quarter');

    for (const [period, returns] of Object.entries(quarterlyGroups)) {
      const portfolioReturn = this._calculatePeriodReturn(returns);
      const benchReturn = this._calculatePeriodReturn(benchmarkQuarterlyGroups[period] || []);

      periods.quarterly.push({
        period,
        portfolio_return: portfolioReturn * 100,
        benchmark_return: benchReturn * 100,
        excess_return: (portfolioReturn - benchReturn) * 100,
        days: returns.length
      });
    }

    // Yearly attribution
    const yearlyGroups = this._groupByPeriod(portfolioReturns, 'year');
    const benchmarkYearlyGroups = this._groupByPeriod(benchmarkReturns, 'year');

    for (const [period, returns] of Object.entries(yearlyGroups)) {
      const portfolioReturn = this._calculatePeriodReturn(returns);
      const benchReturn = this._calculatePeriodReturn(benchmarkYearlyGroups[period] || []);

      periods.yearly.push({
        period,
        portfolio_return: portfolioReturn * 100,
        benchmark_return: benchReturn * 100,
        excess_return: (portfolioReturn - benchReturn) * 100,
        days: returns.length
      });
    }

    return periods;
  }

  /**
   * Market Event Attribution
   * Identifies how the portfolio performed during specific market events
   * @param {Array} portfolioReturns - Portfolio returns
   * @param {Array} benchmarkReturns - Benchmark returns
   * @param {Array} events - Market events [{name, start_date, end_date, description}]
   * @returns {Object} Event-based attribution
   */
  calculateEventAttribution(portfolioReturns, benchmarkReturns, events) {
    const eventAnalysis = events.map(event => {
      const portfolioEventReturns = this._getReturnsInPeriod(
        portfolioReturns,
        event.start_date,
        event.end_date
      );

      const benchmarkEventReturns = this._getReturnsInPeriod(
        benchmarkReturns,
        event.start_date,
        event.end_date
      );

      const portfolioReturn = this._calculatePeriodReturn(portfolioEventReturns);
      const benchmarkReturn = this._calculatePeriodReturn(benchmarkEventReturns);
      const excessReturn = portfolioReturn - benchmarkReturn;

      // Calculate maximum drawdown during event
      const maxDrawdown = this._calculateMaxDrawdownInPeriod(portfolioEventReturns);
      const benchmarkMaxDD = this._calculateMaxDrawdownInPeriod(benchmarkEventReturns);

      return {
        event_name: event.name,
        description: event.description,
        start_date: event.start_date,
        end_date: event.end_date,
        days: portfolioEventReturns.length,
        portfolio_return: portfolioReturn * 100,
        benchmark_return: benchmarkReturn * 100,
        excess_return: excessReturn * 100,
        portfolio_max_drawdown: maxDrawdown * 100,
        benchmark_max_drawdown: benchmarkMaxDD * 100,
        relative_performance: excessReturn > 0 ? 'Outperformed' : 'Underperformed',
        risk_adjusted_performance: this._calculateSharpeRatio(portfolioEventReturns)
      };
    });

    return {
      events: eventAnalysis,
      summary: {
        total_events: events.length,
        outperformed: eventAnalysis.filter(e => e.excess_return > 0).length,
        underperformed: eventAnalysis.filter(e => e.excess_return < 0).length,
        average_excess_return: eventAnalysis.reduce((sum, e) => sum + e.excess_return, 0) / events.length
      }
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Calculate total return from returns series
   * @private
   */
  _calculateTotalReturn(returns) {
    if (!returns || returns.length < 2) return 0;

    const firstValue = returns[0].value;
    const lastValue = returns[returns.length - 1].value;

    return (lastValue - firstValue) / firstValue;
  }

  /**
   * Group positions by sector
   * @private
   */
  _groupPositionsBySector(positions) {
    const groups = {};

    positions.forEach(position => {
      const sectorId = position.sector || 999;
      if (!groups[sectorId]) {
        groups[sectorId] = [];
      }
      groups[sectorId].push(position);
    });

    return groups;
  }

  /**
   * Calculate sector returns
   * @private
   */
  _calculateSectorReturns(sectorGroups, portfolioReturns) {
    const sectorReturns = {};

    for (const [sectorId, positions] of Object.entries(sectorGroups)) {
      let weightedReturn = 0;
      let totalWeight = 0;

      positions.forEach(position => {
        const positionReturn = this._calculatePositionReturn(position, portfolioReturns);
        const weight = position.current_weight || 0;

        weightedReturn += positionReturn * weight;
        totalWeight += weight;
      });

      sectorReturns[sectorId] = totalWeight > 0 ? weightedReturn / totalWeight : 0;
    }

    return sectorReturns;
  }

  /**
   * Estimate benchmark sector weights (simplified)
   * In production, this should come from actual benchmark composition
   * @private
   */
  _estimateBenchmarkSectorWeights() {
    // S&P 500 approximate sector weights (as of 2024)
    return {
      100: 0.04,   // Energy
      200: 0.03,   // Materials
      300: 0.08,   // Industrials
      400: 0.10,   // Consumer Discretionary
      500: 0.06,   // Consumer Staples
      600: 0.13,   // Health Care
      700: 0.13,   // Financials
      800: 0.28,   // Information Technology
      900: 0.09,   // Communication Services
      1000: 0.03,  // Utilities
      1100: 0.03,  // Real Estate
      999: 0.00    // Unknown
    };
  }

  /**
   * Get sector name from ID
   * @private
   */
  _getSectorName(sectorId) {
    const sector = SECTOR_TAXONOMY.find(s => s.sectorId === sectorId);
    return sector ? sector.name : 'Unknown';
  }

  /**
   * Calculate position return
   * @private
   */
  _calculatePositionReturn(position, portfolioReturns) {
    const currentPrice = this._getCurrentPrice(position, portfolioReturns);
    const entryPrice = position.entry_price;

    return entryPrice > 0 ? (currentPrice - entryPrice) / entryPrice : 0;
  }

  /**
   * Get current price for position
   * @private
   */
  _getCurrentPrice(position, portfolioReturns) {
    // Get latest price from portfolio returns
    const latestSnapshot = portfolioReturns[portfolioReturns.length - 1];

    if (latestSnapshot && latestSnapshot.positions) {
      const positionData = latestSnapshot.positions.find(p => p.ticker === position.ticker);
      if (positionData) {
        return positionData.price || position.entry_price;
      }
    }

    return position.entry_price;
  }

  /**
   * Group returns by period (month, quarter, year)
   * @private
   */
  _groupByPeriod(returns, periodType) {
    const groups = {};

    returns.forEach(point => {
      const date = new Date(point.date);
      let key;

      switch (periodType) {
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'year':
          key = `${date.getFullYear()}`;
          break;
        default:
          key = point.date;
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(point);
    });

    return groups;
  }

  /**
   * Calculate period return
   * @private
   */
  _calculatePeriodReturn(periodReturns) {
    if (!periodReturns || periodReturns.length < 2) return 0;

    const firstValue = periodReturns[0].value;
    const lastValue = periodReturns[periodReturns.length - 1].value;

    return (lastValue - firstValue) / firstValue;
  }

  /**
   * Get returns within a specific date range
   * @private
   */
  _getReturnsInPeriod(returns, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return returns.filter(point => {
      const date = new Date(point.date);
      return date >= start && date <= end;
    });
  }

  /**
   * Calculate max drawdown in a period
   * @private
   */
  _calculateMaxDrawdownInPeriod(returns) {
    if (!returns || returns.length < 2) return 0;

    let peak = returns[0].value;
    let maxDrawdown = 0;

    for (const point of returns) {
      if (point.value > peak) {
        peak = point.value;
      }

      const drawdown = (point.value - peak) / peak;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Calculate Sharpe ratio for a period
   * @private
   */
  _calculateSharpeRatio(returns, riskFreeRate = 0.02) {
    if (!returns || returns.length < 2) return 0;

    // Calculate daily returns
    const dailyReturns = [];
    for (let i = 1; i < returns.length; i++) {
      const ret = (returns[i].value - returns[i - 1].value) / returns[i - 1].value;
      dailyReturns.push(ret);
    }

    const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);

    const dailyRiskFreeRate = riskFreeRate / 252;
    const sharpe = stdDev > 0 ? (avgReturn - dailyRiskFreeRate) / stdDev : 0;

    return sharpe * Math.sqrt(252); // Annualized
  }

  /**
   * Interpret Brinson results
   * @private
   */
  _interpretBrinsonResults(allocationEffect, selectionEffect) {
    const interpretations = [];

    if (Math.abs(allocationEffect) > Math.abs(selectionEffect)) {
      if (allocationEffect > 0) {
        interpretations.push('Positive excess return primarily driven by superior sector allocation decisions.');
      } else {
        interpretations.push('Negative excess return primarily due to poor sector allocation choices.');
      }
    } else {
      if (selectionEffect > 0) {
        interpretations.push('Positive excess return primarily driven by strong stock selection within sectors.');
      } else {
        interpretations.push('Negative excess return primarily due to weak stock selection within sectors.');
      }
    }

    if (allocationEffect > 0 && selectionEffect > 0) {
      interpretations.push('Both allocation and selection contributed positively to performance.');
    } else if (allocationEffect < 0 && selectionEffect < 0) {
      interpretations.push('Both allocation and selection detracted from performance.');
    } else {
      interpretations.push('Allocation and selection effects offset each other.');
    }

    return interpretations;
  }
}

// Singleton instance
export const attributionAnalyzer = new AttributionAnalyzer();

export default {
  AttributionAnalyzer,
  attributionAnalyzer
};
