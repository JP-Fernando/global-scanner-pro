/**
 * Portfolio Manager
 * Manages portfolio CRUD operations and coordinates with storage layer
 */

import { dbStore } from '../storage/indexed-db-store.js';
import { notifyRebalance } from '../alerts/alert-manager.js';

export class PortfolioManager {
  constructor() {
    this.currentPortfolio = null;
  }

  /**
   * Generate a unique ID
   * @returns {string}
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create a new portfolio from selected assets
   * @param {string} name - Portfolio name
   * @param {Array} assets - Array of assets from scanner
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Created portfolio
   */
  async createPortfolio(name, assets, options = {}) {
    const {
      description = '',
      benchmark = '^GSPC',
      strategy = 'balanced',
      allocation_method = 'equal_weight',
      initial_capital = 10000
    } = options;

    // Transform assets to positions
    const positions = assets.map(asset => ({
      ticker: asset.ticker,
      name: asset.name,
      sector: asset.sectorRaw || 'Unknown',
      entry_price: asset.price,
      entry_date: new Date().toISOString().split('T')[0],
      quantity: 0, // Will be calculated based on capital and weight
      target_weight: asset.weight || (1 / assets.length),
      current_weight: asset.weight || (1 / assets.length),
      score: asset.scoreTotal || 0,
      volatility: asset.details?.risk?.volatility || 0
    }));

    // Calculate quantities based on initial capital
    positions.forEach(pos => {
      const allocation = initial_capital * pos.target_weight;
      pos.quantity = Math.floor(allocation / pos.entry_price);
    });

    const portfolio = {
      id: this.generateId(),
      name,
      description,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      positions,
      benchmark,
      strategy,
      allocation_method,
      initial_capital,
      current_value: initial_capital, // Will be updated with market data
      total_return: 0,
      total_return_pct: 0,
      status: 'active' // active, closed, archived
    };

    await dbStore.savePortfolio(portfolio);
    this.currentPortfolio = portfolio;

    // Create initial snapshot
    await this.createSnapshot(portfolio);

    return portfolio;
  }

  /**
   * Update an existing portfolio
   * @param {string} id - Portfolio ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated portfolio
   */
  async updatePortfolio(id, updates) {
    const portfolio = await dbStore.getPortfolio(id);
    if (!portfolio) {
      throw new Error(`Portfolio ${id} not found`);
    }

    const updated = {
      ...portfolio,
      ...updates,
      last_updated: new Date().toISOString()
    };

    await dbStore.savePortfolio(updated);

    if (this.currentPortfolio?.id === id) {
      this.currentPortfolio = updated;
    }

    return updated;
  }

  /**
   * Load a portfolio by ID
   * @param {string} id - Portfolio ID
   * @returns {Promise<Object>} Portfolio
   */
  async loadPortfolio(id) {
    const portfolio = await dbStore.getPortfolio(id);
    if (!portfolio) {
      throw new Error(`Portfolio ${id} not found`);
    }

    this.currentPortfolio = portfolio;
    return portfolio;
  }

  /**
   * Get all portfolios
   * @returns {Promise<Array>}
   */
  async getAllPortfolios() {
    return await dbStore.getAllPortfolios();
  }

  /**
   * Delete a portfolio
   * @param {string} id - Portfolio ID
   * @returns {Promise<void>}
   */
  async deletePortfolio(id) {
    await dbStore.deletePortfolio(id);

    if (this.currentPortfolio?.id === id) {
      this.currentPortfolio = null;
    }
  }

  /**
   * Add a position to the portfolio
   * @param {string} portfolioId - Portfolio ID
   * @param {Object} position - Position to add
   * @returns {Promise<Object>} Updated portfolio
   */
  async addPosition(portfolioId, position) {
    const portfolio = await dbStore.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    // Check if position already exists
    const existingIndex = portfolio.positions.findIndex(p => p.ticker === position.ticker);
    if (existingIndex >= 0) {
      throw new Error(`Position ${position.ticker} already exists in portfolio`);
    }

    portfolio.positions.push({
      ...position,
      entry_date: position.entry_date || new Date().toISOString().split('T')[0]
    });

    // Rebalance weights
    this._rebalanceWeights(portfolio);

    return await this.updatePortfolio(portfolioId, { positions: portfolio.positions });
  }

  /**
   * Remove a position from the portfolio
   * @param {string} portfolioId - Portfolio ID
   * @param {string} ticker - Ticker to remove
   * @returns {Promise<Object>} Updated portfolio
   */
  async removePosition(portfolioId, ticker) {
    const portfolio = await dbStore.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    portfolio.positions = portfolio.positions.filter(p => p.ticker !== ticker);

    // Rebalance weights
    this._rebalanceWeights(portfolio);

    return await this.updatePortfolio(portfolioId, { positions: portfolio.positions });
  }

  /**
   * Update position quantity
   * @param {string} portfolioId - Portfolio ID
   * @param {string} ticker - Ticker
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} Updated portfolio
   */
  async updatePositionQuantity(portfolioId, ticker, quantity) {
    const portfolio = await dbStore.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const position = portfolio.positions.find(p => p.ticker === ticker);
    if (!position) {
      throw new Error(`Position ${ticker} not found in portfolio`);
    }

    position.quantity = quantity;

    return await this.updatePortfolio(portfolioId, { positions: portfolio.positions });
  }

  /**
   * Create a daily snapshot of portfolio value
   * @param {Object} portfolio - Portfolio object
   * @param {Object} priceData - Optional price data {ticker: price}
   * @returns {Promise<Object>} Created snapshot
   */
  async createSnapshot(portfolio, priceData = null) {
    const date = new Date().toISOString().split('T')[0];

    // Calculate current values
    const positions = portfolio.positions.map(pos => {
      const currentPrice = priceData?.[pos.ticker] || pos.entry_price;
      const value = pos.quantity * currentPrice;

      return {
        ticker: pos.ticker,
        price: currentPrice,
        quantity: pos.quantity,
        value,
        weight: 0, // Will be calculated after total
        unrealized_pnl: value - (pos.quantity * pos.entry_price),
        unrealized_pnl_pct: ((currentPrice - pos.entry_price) / pos.entry_price) * 100
      };
    });

    const total_value = positions.reduce((sum, p) => sum + p.value, 0);

    // Calculate weights
    positions.forEach(p => {
      p.weight = total_value > 0 ? p.value / total_value : 0;
    });

    const daily_return = portfolio.current_value > 0
      ? ((total_value - portfolio.current_value) / portfolio.current_value) * 100
      : 0;

    const cumulative_return = portfolio.initial_capital > 0
      ? ((total_value - portfolio.initial_capital) / portfolio.initial_capital) * 100
      : 0;

    const snapshot = {
      portfolio_id: portfolio.id,
      date,
      positions,
      total_value,
      daily_return,
      cumulative_return,
      benchmark_value: null, // To be filled by performance tracker
      benchmark_return: null
    };

    await dbStore.saveSnapshot(snapshot);
    return snapshot;
  }

  /**
   * Get equity curve for a portfolio
   * @param {string} portfolioId - Portfolio ID
   * @param {string} fromDate - Start date (optional)
   * @param {string} toDate - End date (optional)
   * @returns {Promise<Array>} Array of {date, value, return}
   */
  async getEquityCurve(portfolioId, fromDate = null, toDate = null) {
    const snapshots = await dbStore.getSnapshots(portfolioId, fromDate, toDate);

    return snapshots.map(s => ({
      date: s.date,
      value: s.total_value,
      return: s.cumulative_return,
      daily_return: s.daily_return
    }));
  }

  /**
   * Rebalance portfolio weights (internal helper)
   * @param {Object} portfolio - Portfolio object
   * @private
   */
  _rebalanceWeights(portfolio) {
    const numPositions = portfolio.positions.length;
    if (numPositions === 0) return;

    if (portfolio.allocation_method === 'equal_weight') {
      const weight = 1 / numPositions;
      portfolio.positions.forEach(p => {
        p.target_weight = weight;
        p.current_weight = weight;
      });
    }
    // Other allocation methods can be implemented here
  }

  /**
   * Check if portfolio needs rebalancing
   * @param {Object} portfolio - Portfolio object
   * @param {number} threshold - Drift threshold (default 5%)
   * @returns {boolean}
   */
  needsRebalancing(portfolio, threshold = 0.05) {
    return portfolio.positions.some(pos => {
      const drift = Math.abs(pos.current_weight - pos.target_weight);
      return drift > threshold;
    });
  }

  /**
   * Execute a rebalancing
   * @param {string} portfolioId - Portfolio ID
   * @param {string} reason - Reason for rebalancing
   * @param {Object} priceData - Current prices {ticker: price}
   * @returns {Promise<Object>} Rebalance record
   */
  async executeRebalance(portfolioId, reason, priceData) {
    const portfolio = await dbStore.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const beforePositions = JSON.parse(JSON.stringify(portfolio.positions));

    // Calculate new quantities based on target weights
    const total_value = portfolio.positions.reduce((sum, pos) => {
      const price = priceData[pos.ticker] || pos.entry_price;
      return sum + (pos.quantity * price);
    }, 0);

    const changes = [];

    portfolio.positions.forEach(pos => {
      const currentPrice = priceData[pos.ticker] || pos.entry_price;
      const targetValue = total_value * pos.target_weight;
      const newQuantity = Math.floor(targetValue / currentPrice);
      const quantityChange = newQuantity - pos.quantity;

      if (quantityChange !== 0) {
        changes.push({
          ticker: pos.ticker,
          old_quantity: pos.quantity,
          new_quantity: newQuantity,
          quantity_change: quantityChange,
          price: currentPrice,
          old_weight: pos.current_weight,
          new_weight: pos.target_weight
        });

        pos.quantity = newQuantity;
        pos.current_weight = pos.target_weight;
      }
    });

    const rebalance = {
      id: this.generateId(),
      portfolio_id: portfolioId,
      timestamp: new Date().toISOString(),
      reason,
      before_positions: beforePositions,
      after_positions: JSON.parse(JSON.stringify(portfolio.positions)),
      changes,
      total_value
    };

    await dbStore.saveRebalance(rebalance);
    await this.updatePortfolio(portfolioId, { positions: portfolio.positions });

    // Create snapshot after rebalance
    await this.createSnapshot(portfolio, priceData);
    await notifyRebalance(portfolio, rebalance);

    return rebalance;
  }

  /**
   * Get rebalancing history
   * @param {string} portfolioId - Portfolio ID
   * @returns {Promise<Array>}
   */
  async getRebalanceHistory(portfolioId) {
    return await dbStore.getRebalanceHistory(portfolioId);
  }
}

// Singleton instance
export const portfolioManager = new PortfolioManager();
