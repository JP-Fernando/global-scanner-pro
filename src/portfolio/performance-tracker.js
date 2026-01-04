/**
 * Performance Tracker
 * Calculates real-time P&L, equity curves, drawdowns, and risk metrics
 */

import { dbStore } from '../storage/indexed-db-store.js';
import { calculatePortfolioMetrics } from '../analytics/risk_engine.js';

export class PerformanceTracker {
  constructor() {
    this.priceCache = new Map();
  }

  /**
   * Load historical price data for a ticker
   * @param {string} ticker - Stock ticker
   * @param {string} fromDate - Start date (YYYY-MM-DD)
   * @param {string} toDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of {date, price}
   */
  async loadPriceData(ticker, fromDate, toDate) {
    const cacheKey = `${ticker}_${fromDate}_${toDate}`;

    if (this.priceCache.has(cacheKey)) {
      return this.priceCache.get(cacheKey);
    }

    // Try to get from IndexedDB cache first
    let cached = await dbStore.getPriceCache(ticker, fromDate, toDate);

    if (cached.length > 0) {
      this.priceCache.set(cacheKey, cached);
      return cached;
    }

    // If not in cache, fetch from API (via existing Yahoo API proxy)
    const from = Math.floor(new Date(fromDate).getTime() / 1000);
    const to = Math.floor(new Date(toDate).getTime() / 1000);

    try {
      const response = await fetch(`/api/yahoo?symbol=${ticker}&from=${from}&to=${to}`);
      if (!response.ok) {
        console.warn(`Failed to fetch price data for ${ticker}`);
        return [];
      }

      const data = await response.json();
      const prices = data.map(item => ({
        date: item.date,
        price: item.close
      }));

      // Cache in IndexedDB
      for (const p of prices) {
        await dbStore.savePriceCache(ticker, p.date, p.price);
      }

      this.priceCache.set(cacheKey, prices);
      return prices;
    } catch (error) {
      console.error(`Error fetching price data for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Load current prices for portfolio positions
   * @param {Array} tickers - Array of tickers
   * @returns {Promise<Object>} Object with ticker: price mapping
   */
  async loadCurrentPrices(tickers) {
    const prices = {};
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const ticker of tickers) {
      const data = await this.loadPriceData(ticker, oneWeekAgo, today);
      if (data.length > 0) {
        prices[ticker] = data[data.length - 1].price; // Most recent price
      }
    }

    return prices;
  }

  /**
   * Calculate portfolio value at a specific date
   * @param {Object} portfolio - Portfolio object
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<number>} Portfolio value
   */
  async calculatePortfolioValue(portfolio, date) {
    let totalValue = 0;

    for (const position of portfolio.positions) {
      const fromDate = new Date(new Date(date).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const prices = await this.loadPriceData(position.ticker, fromDate, date);

      if (prices.length > 0) {
        const closestPrice = this._findClosestPrice(prices, date);
        totalValue += position.quantity * closestPrice;
      } else {
        // Use entry price as fallback
        totalValue += position.quantity * position.entry_price;
      }
    }

    return totalValue;
  }

  /**
   * Calculate current P&L for portfolio
   * @param {Object} portfolio - Portfolio object
   * @returns {Promise<Object>} P&L data
   */
  async calculatePnL(portfolio) {
    const currentPrices = await this.loadCurrentPrices(portfolio.positions.map(p => p.ticker));

    const positions = portfolio.positions.map(pos => {
      const currentPrice = currentPrices[pos.ticker] || pos.entry_price;
      const currentValue = pos.quantity * currentPrice;
      const costBasis = pos.quantity * pos.entry_price;
      const unrealizedPnL = currentValue - costBasis;
      const unrealizedPnLPct = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;

      return {
        ticker: pos.ticker,
        name: pos.name,
        quantity: pos.quantity,
        entry_price: pos.entry_price,
        current_price: currentPrice,
        cost_basis: costBasis,
        current_value: currentValue,
        unrealized_pnl: unrealizedPnL,
        unrealized_pnl_pct: unrealizedPnLPct,
        weight: 0 // Will be calculated below
      };
    });

    const totalValue = positions.reduce((sum, p) => sum + p.current_value, 0);
    const totalCost = positions.reduce((sum, p) => sum + p.cost_basis, 0);
    const totalPnL = totalValue - totalCost;
    const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    // Calculate weights
    positions.forEach(p => {
      p.weight = totalValue > 0 ? (p.current_value / totalValue) * 100 : 0;
    });

    return {
      positions,
      total_value: totalValue,
      total_cost: totalCost,
      total_pnl: totalPnL,
      total_pnl_pct: totalPnLPct,
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Calculate equity curve for portfolio
   * @param {Object} portfolio - Portfolio object
   * @param {string} fromDate - Start date (optional)
   * @param {string} toDate - End date (optional)
   * @returns {Promise<Array>} Equity curve data
   */
  async calculateEquityCurve(portfolio, fromDate = null, toDate = null) {
    const from = fromDate || portfolio.created_at.split('T')[0];
    const to = toDate || new Date().toISOString().split('T')[0];

    // Get snapshots from database
    const snapshots = await dbStore.getSnapshots(portfolio.id, from, to);

    if (snapshots.length > 0) {
      return snapshots.map(s => ({
        date: s.date,
        value: s.total_value,
        return_pct: s.cumulative_return,
        daily_return_pct: s.daily_return
      }));
    }

    // If no snapshots, calculate from price data
    const dates = this._generateDateRange(from, to);
    const equityCurve = [];

    for (const date of dates) {
      const value = await this.calculatePortfolioValue(portfolio, date);
      const returnPct = portfolio.initial_capital > 0
        ? ((value - portfolio.initial_capital) / portfolio.initial_capital) * 100
        : 0;

      equityCurve.push({
        date,
        value,
        return_pct: returnPct,
        daily_return_pct: equityCurve.length > 0
          ? ((value - equityCurve[equityCurve.length - 1].value) / equityCurve[equityCurve.length - 1].value) * 100
          : 0
      });
    }

    return equityCurve;
  }

  /**
   * Calculate drawdown series
   * @param {Array} equityCurve - Equity curve data
   * @returns {Array} Drawdown data
   */
  calculateDrawdowns(equityCurve) {
    const drawdowns = [];
    let peak = equityCurve[0]?.value || 0;

    for (const point of equityCurve) {
      if (point.value > peak) {
        peak = point.value;
      }

      const drawdown = peak > 0 ? ((point.value - peak) / peak) * 100 : 0;

      drawdowns.push({
        date: point.date,
        value: point.value,
        peak,
        drawdown_pct: drawdown
      });
    }

    return drawdowns;
  }

  /**
   * Calculate maximum drawdown
   * @param {Array} equityCurve - Equity curve data
   * @returns {Object} Max drawdown info
   */
  calculateMaxDrawdown(equityCurve) {
    const drawdowns = this.calculateDrawdowns(equityCurve);

    if (drawdowns.length === 0) {
      return { max_drawdown_pct: 0, peak_date: null, trough_date: null };
    }

    const maxDD = Math.min(...drawdowns.map(d => d.drawdown_pct));
    const troughPoint = drawdowns.find(d => d.drawdown_pct === maxDD);

    // Find peak before trough
    const troughIndex = drawdowns.indexOf(troughPoint);
    let peakPoint = drawdowns[0];
    for (let i = 0; i <= troughIndex; i++) {
      if (drawdowns[i].value === drawdowns[i].peak) {
        peakPoint = drawdowns[i];
      }
    }

    return {
      max_drawdown_pct: maxDD,
      peak_date: peakPoint.date,
      peak_value: peakPoint.peak,
      trough_date: troughPoint.date,
      trough_value: troughPoint.value
    };
  }

  /**
   * Calculate performance metrics (Sharpe, Sortino, etc.)
   * @param {Array} equityCurve - Equity curve data
   * @param {number} riskFreeRate - Annual risk-free rate (default 2%)
   * @returns {Object} Performance metrics
   */
  calculatePerformanceMetrics(equityCurve, riskFreeRate = 0.02) {
    if (equityCurve.length < 2) {
      return null;
    }

    const returns = equityCurve.map(p => p.daily_return_pct / 100);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // Annualized metrics (assuming daily data)
    const annualizedReturn = avgReturn * 252;
    const annualizedVolatility = volatility * Math.sqrt(252);
    const dailyRiskFreeRate = riskFreeRate / 252;

    // Sharpe Ratio
    const excessReturn = avgReturn - dailyRiskFreeRate;
    const sharpeRatio = volatility > 0 ? (excessReturn * Math.sqrt(252)) / annualizedVolatility : 0;

    // Sortino Ratio (downside deviation)
    const negativeReturns = returns.filter(r => r < 0);
    const downsideVariance = negativeReturns.length > 0
      ? negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
      : 0;
    const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(252);
    const sortinoRatio = downsideDeviation > 0 ? annualizedReturn / downsideDeviation : 0;

    // Max drawdown
    const maxDD = this.calculateMaxDrawdown(equityCurve);

    // Calmar Ratio
    const calmarRatio = Math.abs(maxDD.max_drawdown_pct) > 0
      ? annualizedReturn / Math.abs(maxDD.max_drawdown_pct / 100)
      : 0;

    // Total return
    const totalReturn = equityCurve.length > 0
      ? ((equityCurve[equityCurve.length - 1].value - equityCurve[0].value) / equityCurve[0].value) * 100
      : 0;

    return {
      total_return_pct: totalReturn,
      annualized_return_pct: annualizedReturn * 100,
      annualized_volatility_pct: annualizedVolatility * 100,
      sharpe_ratio: sharpeRatio,
      sortino_ratio: sortinoRatio,
      calmar_ratio: calmarRatio,
      max_drawdown: maxDD,
      num_periods: equityCurve.length
    };
  }

  /**
   * Calculate risk metrics using the risk engine
   * @param {Object} portfolio - Portfolio object
   * @param {Array} historicalData - Historical price data for each position
   * @returns {Promise<Object>} Risk metrics
   */
  async calculateRiskMetrics(portfolio, historicalData = null) {
    // If historical data not provided, fetch it
    if (!historicalData) {
      historicalData = [];
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      for (const position of portfolio.positions) {
        const prices = await this.loadPriceData(position.ticker, sixMonthsAgo, today);
        historicalData.push({
          ticker: position.ticker,
          weight: position.current_weight,
          prices: prices.map(p => ({ date: p.date, close: p.price }))
        });
      }
    }

    // Use existing risk engine to calculate portfolio metrics
    const riskMetrics = calculatePortfolioMetrics(historicalData);

    return riskMetrics;
  }

  /**
   * Compare portfolio with benchmark
   * @param {Object} portfolio - Portfolio object
   * @param {Array} portfolioEquity - Portfolio equity curve
   * @returns {Promise<Object>} Comparison metrics
   */
  async compareToBenchmark(portfolio, portfolioEquity) {
    const benchmark = portfolio.benchmark || '^GSPC';
    const fromDate = portfolioEquity[0]?.date || portfolio.created_at.split('T')[0];
    const toDate = portfolioEquity[portfolioEquity.length - 1]?.date || new Date().toISOString().split('T')[0];

    // Load benchmark data
    const benchmarkPrices = await this.loadPriceData(benchmark, fromDate, toDate);

    if (benchmarkPrices.length === 0) {
      return null;
    }

    // Normalize benchmark to portfolio initial value
    const initialBenchmarkPrice = benchmarkPrices[0].price;
    const initialPortfolioValue = portfolioEquity[0].value;

    const benchmarkEquity = benchmarkPrices.map(p => ({
      date: p.date,
      value: (p.price / initialBenchmarkPrice) * initialPortfolioValue,
      return_pct: ((p.price - initialBenchmarkPrice) / initialBenchmarkPrice) * 100
    }));

    // Calculate alpha and beta
    const { alpha, beta } = this._calculateAlphaBeta(portfolioEquity, benchmarkEquity);

    // Calculate tracking error
    const trackingError = this._calculateTrackingError(portfolioEquity, benchmarkEquity);

    const portfolioReturn = portfolioEquity[portfolioEquity.length - 1].return_pct;
    const benchmarkReturn = benchmarkEquity[benchmarkEquity.length - 1].return_pct;

    return {
      benchmark_ticker: benchmark,
      portfolio_return_pct: portfolioReturn,
      benchmark_return_pct: benchmarkReturn,
      excess_return_pct: portfolioReturn - benchmarkReturn,
      alpha,
      beta,
      tracking_error,
      benchmark_equity: benchmarkEquity
    };
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Find the closest price to a given date
   * @private
   */
  _findClosestPrice(prices, targetDate) {
    const target = new Date(targetDate).getTime();

    let closest = prices[0];
    let minDiff = Math.abs(new Date(prices[0].date).getTime() - target);

    for (const p of prices) {
      const diff = Math.abs(new Date(p.date).getTime() - target);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }

    return closest.price;
  }

  /**
   * Generate date range (business days)
   * @private
   */
  _generateDateRange(fromDate, toDate) {
    const dates = [];
    const current = new Date(fromDate);
    const end = new Date(toDate);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Calculate alpha and beta vs benchmark
   * @private
   */
  _calculateAlphaBeta(portfolioEquity, benchmarkEquity) {
    // Align dates
    const aligned = this._alignEquityCurves(portfolioEquity, benchmarkEquity);

    if (aligned.length < 2) {
      return { alpha: 0, beta: 1 };
    }

    // Calculate returns
    const portfolioReturns = [];
    const benchmarkReturns = [];

    for (let i = 1; i < aligned.length; i++) {
      const pRet = (aligned[i].portfolio - aligned[i - 1].portfolio) / aligned[i - 1].portfolio;
      const bRet = (aligned[i].benchmark - aligned[i - 1].benchmark) / aligned[i - 1].benchmark;
      portfolioReturns.push(pRet);
      benchmarkReturns.push(bRet);
    }

    // Calculate beta (covariance / variance)
    const avgP = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
    const avgB = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;

    let covariance = 0;
    let variance = 0;

    for (let i = 0; i < portfolioReturns.length; i++) {
      covariance += (portfolioReturns[i] - avgP) * (benchmarkReturns[i] - avgB);
      variance += Math.pow(benchmarkReturns[i] - avgB, 2);
    }

    covariance /= portfolioReturns.length;
    variance /= portfolioReturns.length;

    const beta = variance > 0 ? covariance / variance : 1;

    // Calculate alpha (annualized)
    const portfolioAnnualReturn = avgP * 252;
    const benchmarkAnnualReturn = avgB * 252;
    const alpha = portfolioAnnualReturn - (beta * benchmarkAnnualReturn);

    return { alpha: alpha * 100, beta };
  }

  /**
   * Calculate tracking error
   * @private
   */
  _calculateTrackingError(portfolioEquity, benchmarkEquity) {
    const aligned = this._alignEquityCurves(portfolioEquity, benchmarkEquity);

    if (aligned.length < 2) {
      return 0;
    }

    const differences = [];

    for (let i = 1; i < aligned.length; i++) {
      const pRet = (aligned[i].portfolio - aligned[i - 1].portfolio) / aligned[i - 1].portfolio;
      const bRet = (aligned[i].benchmark - aligned[i - 1].benchmark) / aligned[i - 1].benchmark;
      differences.push(pRet - bRet);
    }

    const variance = differences.reduce((sum, d) => sum + Math.pow(d, 2), 0) / differences.length;
    const trackingError = Math.sqrt(variance) * Math.sqrt(252) * 100;

    return trackingError;
  }

  /**
   * Align two equity curves by date
   * @private
   */
  _alignEquityCurves(portfolioEquity, benchmarkEquity) {
    const aligned = [];

    for (const p of portfolioEquity) {
      const b = benchmarkEquity.find(b => b.date === p.date);
      if (b) {
        aligned.push({
          date: p.date,
          portfolio: p.value,
          benchmark: b.value
        });
      }
    }

    return aligned;
  }
}

// Singleton instance
export const performanceTracker = new PerformanceTracker();
