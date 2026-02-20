/**
 * Portfolio Manager
 * Manages portfolio CRUD operations and coordinates with storage layer
 */

import { dbStore } from '../storage/indexed-db-store.js';
import { notifyRebalance } from '../alerts/alert-manager.js';
import type {
  Portfolio,
  Position,
  PortfolioSnapshot,
  RebalanceEvent,
  AllocationMethod,
} from '../types/index.js';

/** Asset input from the scanner to be transformed into a position */
interface ScannerAsset {
  ticker: string;
  name: string;
  sectorRaw?: string;
  price: number;
  weight?: number;
  scoreTotal?: number;
  details?: {
    risk?: {
      volatility?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Options for creating a new portfolio */
interface CreatePortfolioOptions {
  description?: string;
  benchmark?: string;
  strategy?: string;
  allocation_method?: AllocationMethod;
  initial_capital?: number;
}

/** Extended position with portfolio-manager-specific fields */
interface PortfolioPosition extends Position {
  sector: string;
  entry_date: string;
  current_weight: number;
  target_weight: number;
  score: number;
  volatility: number;
}

/** Snapshot position recording value and P&L at a point in time */
interface SnapshotPosition {
  ticker: string;
  price: number;
  quantity: number;
  value: number;
  weight: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
}

/** A fully-constructed portfolio object as used internally */
interface ManagedPortfolio extends Omit<Portfolio, 'positions' | 'status'> {
  positions: PortfolioPosition[];
  allocation_method: AllocationMethod;
  initial_capital: number;
  current_value: number;
  total_return: number;
  total_return_pct: number;
  status: 'active' | 'closed' | 'archived';
}

/** Portfolio shape expected by alert-manager's notifyRebalance */
export interface PortfolioForAlert {
  name: string;
  strategy?: string;
  [key: string]: unknown;
}

/** An individual rebalance change record */
interface RebalanceChangeRecord {
  ticker: string;
  old_quantity: number;
  new_quantity: number;
  quantity_change: number;
  price: number;
  old_weight: number;
  new_weight: number;
}

/** Price data keyed by ticker */
type PriceData = Record<string, number>;

/** Snapshot produced by createSnapshot */
interface ManagedSnapshot {
  portfolio_id: string;
  date: string;
  positions: SnapshotPosition[];
  total_value: number;
  daily_return: number;
  cumulative_return: number;
  benchmark_value: null;
  benchmark_return: null;
}

/** Rebalance record produced by executeRebalance */
interface ManagedRebalanceRecord {
  id: string;
  portfolio_id: string;
  timestamp: string;
  reason: string;
  before_positions: PortfolioPosition[];
  after_positions: PortfolioPosition[];
  changes: RebalanceChangeRecord[];
  total_value: number;
}

/** Equity curve point returned by getEquityCurve */
interface EquityCurvePoint {
  date: string;
  value: number;
  return: number | undefined;
  daily_return: number | undefined;
}

export class PortfolioManager {
  currentPortfolio: ManagedPortfolio | null;

  constructor() {
    this.currentPortfolio = null;
  }

  /**
   * Generate a unique ID
   * @returns {string}
   */
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create a new portfolio from selected assets
   * @param {string} name - Portfolio name
   * @param {Array} assets - Array of assets from scanner
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Created portfolio
   */
  async createPortfolio(
    name: string,
    assets: ScannerAsset[],
    options: CreatePortfolioOptions = {}
  ): Promise<ManagedPortfolio> {
    const {
      description = '',
      benchmark = '^GSPC',
      strategy = 'balanced',
      allocation_method = 'equal_weight',
      initial_capital = 10000
    } = options;

    // Transform assets to positions
    const positions: PortfolioPosition[] = assets.map((asset: ScannerAsset) => ({
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
    positions.forEach((pos: PortfolioPosition) => {
      const allocation: number = initial_capital * pos.target_weight;
      pos.quantity = Math.floor(allocation / pos.entry_price);
    });

    const portfolio: ManagedPortfolio = {
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
  async updatePortfolio(
    id: string,
    updates: Partial<ManagedPortfolio>
  ): Promise<ManagedPortfolio> {
    const portfolio: ManagedPortfolio | undefined = await dbStore.getPortfolio(id) as ManagedPortfolio | undefined;
    if (!portfolio) {
      throw new Error(`Portfolio ${id} not found`);
    }

    const updated: ManagedPortfolio = {
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
  async loadPortfolio(id: string): Promise<ManagedPortfolio> {
    const portfolio: ManagedPortfolio | undefined = await dbStore.getPortfolio(id) as ManagedPortfolio | undefined;
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
  async getAllPortfolios(): Promise<Portfolio[]> {
    return await dbStore.getAllPortfolios() as Portfolio[];
  }

  /**
   * Delete a portfolio
   * @param {string} id - Portfolio ID
   * @returns {Promise<void>}
   */
  async deletePortfolio(id: string): Promise<void> {
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
  async addPosition(
    portfolioId: string,
    position: PortfolioPosition
  ): Promise<ManagedPortfolio> {
    const portfolio: ManagedPortfolio | undefined = await dbStore.getPortfolio(portfolioId) as ManagedPortfolio | undefined;
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    // Check if position already exists
    const existingIndex: number = portfolio.positions.findIndex(
      (p: PortfolioPosition) => p.ticker === position.ticker
    );
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
  async removePosition(
    portfolioId: string,
    ticker: string
  ): Promise<ManagedPortfolio> {
    const portfolio: ManagedPortfolio | undefined = await dbStore.getPortfolio(portfolioId) as ManagedPortfolio | undefined;
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    portfolio.positions = portfolio.positions.filter(
      (p: PortfolioPosition) => p.ticker !== ticker
    );

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
  async updatePositionQuantity(
    portfolioId: string,
    ticker: string,
    quantity: number
  ): Promise<ManagedPortfolio> {
    const portfolio: ManagedPortfolio | undefined = await dbStore.getPortfolio(portfolioId) as ManagedPortfolio | undefined;
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const position: PortfolioPosition | undefined = portfolio.positions.find(
      (p: PortfolioPosition) => p.ticker === ticker
    );
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
  async createSnapshot(
    portfolio: ManagedPortfolio,
    priceData: PriceData | null = null
  ): Promise<ManagedSnapshot> {
    const date: string = new Date().toISOString().split('T')[0];

    // Calculate current values
    const positions: SnapshotPosition[] = portfolio.positions.map((pos: PortfolioPosition) => {
      const currentPrice: number = priceData?.[pos.ticker] || pos.entry_price;
      const value: number = pos.quantity * currentPrice;

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

    const total_value: number = positions.reduce(
      (sum: number, p: SnapshotPosition) => sum + p.value, 0
    );

    // Calculate weights
    positions.forEach((p: SnapshotPosition) => {
      p.weight = total_value > 0 ? p.value / total_value : 0;
    });

    const daily_return: number = portfolio.current_value > 0
      ? ((total_value - portfolio.current_value) / portfolio.current_value) * 100
      : 0;

    const cumulative_return: number = portfolio.initial_capital > 0
      ? ((total_value - portfolio.initial_capital) / portfolio.initial_capital) * 100
      : 0;

    const snapshot: ManagedSnapshot = {
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
  async getEquityCurve(
    portfolioId: string,
    fromDate: string | null = null,
    toDate: string | null = null
  ): Promise<EquityCurvePoint[]> {
    const snapshots = await (dbStore as any).getSnapshots(
      portfolioId, fromDate, toDate
    ) as PortfolioSnapshot[];

    return snapshots.map((s: PortfolioSnapshot) => ({
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
  _rebalanceWeights(portfolio: ManagedPortfolio): void {
    const numPositions: number = portfolio.positions.length;
    if (numPositions === 0) return;

    if (portfolio.allocation_method === 'equal_weight') {
      const weight: number = 1 / numPositions;
      portfolio.positions.forEach((p: PortfolioPosition) => {
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
  needsRebalancing(portfolio: ManagedPortfolio, threshold: number = 0.05): boolean {
    return portfolio.positions.some((pos: PortfolioPosition) => {
      const drift: number = Math.abs(pos.current_weight - pos.target_weight);
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
  async executeRebalance(
    portfolioId: string,
    reason: string,
    priceData: PriceData
  ): Promise<ManagedRebalanceRecord> {
    const portfolio: ManagedPortfolio | undefined = await dbStore.getPortfolio(portfolioId) as ManagedPortfolio | undefined;
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const beforePositions: PortfolioPosition[] = JSON.parse(JSON.stringify(portfolio.positions));

    // Calculate new quantities based on target weights
    const total_value: number = portfolio.positions.reduce(
      (sum: number, pos: PortfolioPosition) => {
        const price: number = priceData[pos.ticker] || pos.entry_price;
        return sum + (pos.quantity * price);
      }, 0
    );

    const changes: RebalanceChangeRecord[] = [];

    portfolio.positions.forEach((pos: PortfolioPosition) => {
      const currentPrice: number = priceData[pos.ticker] || pos.entry_price;
      const targetValue: number = total_value * pos.target_weight;
      const newQuantity: number = Math.floor(targetValue / currentPrice);
      const quantityChange: number = newQuantity - pos.quantity;

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

    const rebalance: ManagedRebalanceRecord = {
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
    await (notifyRebalance as unknown as (p: unknown, r: unknown) => Promise<void>)(portfolio, rebalance);

    return rebalance;
  }

  /**
   * Get rebalancing history
   * @param {string} portfolioId - Portfolio ID
   * @returns {Promise<Array>}
   */
  async getRebalanceHistory(portfolioId: string): Promise<RebalanceEvent[]> {
    return await dbStore.getRebalanceHistory(portfolioId) as RebalanceEvent[];
  }
}

// Singleton instance
export const portfolioManager = new PortfolioManager();
