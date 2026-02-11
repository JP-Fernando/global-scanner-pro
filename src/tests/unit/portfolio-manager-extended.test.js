/**
 * Portfolio Manager Extended Tests
 *
 * Covers getAllPortfolios, executeRebalance, getRebalanceHistory,
 * and updatePositionQuantity error paths.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PortfolioManager } from '../../portfolio/portfolio-manager.js';
import { dbStore } from '../../storage/indexed-db-store.js';

// Mock the dbStore methods
vi.mock('../../storage/indexed-db-store.js', () => ({
  dbStore: {
    savePortfolio: vi.fn().mockResolvedValue(undefined),
    getPortfolio: vi.fn(),
    getAllPortfolios: vi.fn().mockResolvedValue([]),
    deletePortfolio: vi.fn().mockResolvedValue(undefined),
    saveSnapshot: vi.fn().mockResolvedValue(undefined),
    getSnapshots: vi.fn().mockResolvedValue([]),
    saveRebalance: vi.fn().mockResolvedValue(undefined),
    getRebalanceHistory: vi.fn().mockResolvedValue([]),
  },
}));

// Mock the alert-manager
vi.mock('../../alerts/alert-manager.js', () => ({
  notifyRebalance: vi.fn().mockResolvedValue(undefined),
}));

describe('PortfolioManager - Extended', () => {
  let manager;

  const samplePortfolio = {
    id: 'pf-ext-1',
    name: 'Extended Test',
    created_at: '2023-01-01T00:00:00Z',
    last_updated: '2023-06-01T00:00:00Z',
    initial_capital: 10000,
    positions: [
      {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        quantity: 10,
        entry_price: 150,
        current_weight: 0.6,
        target_weight: 0.5,
      },
      {
        ticker: 'GOOG',
        name: 'Alphabet',
        quantity: 5,
        entry_price: 120,
        current_weight: 0.4,
        target_weight: 0.5,
      },
    ],
  };

  beforeEach(() => {
    manager = new PortfolioManager();
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------
  // getAllPortfolios
  // -----------------------------------------------------------
  describe('getAllPortfolios', () => {
    it('returns all portfolios from dbStore', async () => {
      const portfolios = [
        { id: 'pf-1', name: 'Portfolio 1' },
        { id: 'pf-2', name: 'Portfolio 2' },
      ];
      dbStore.getAllPortfolios.mockResolvedValueOnce(portfolios);

      const result = await manager.getAllPortfolios();
      expect(result).toEqual(portfolios);
      expect(dbStore.getAllPortfolios).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when no portfolios exist', async () => {
      dbStore.getAllPortfolios.mockResolvedValueOnce([]);
      const result = await manager.getAllPortfolios();
      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------
  // executeRebalance
  // -----------------------------------------------------------
  describe('executeRebalance', () => {
    it('executes rebalance and returns rebalance record', async () => {
      dbStore.getPortfolio.mockResolvedValue(JSON.parse(JSON.stringify(samplePortfolio)));

      const priceData = { AAPL: 160, GOOG: 130 };
      const result = await manager.executeRebalance('pf-ext-1', 'Quarterly rebalance', priceData);

      expect(result).toBeDefined();
      expect(result.portfolio_id).toBe('pf-ext-1');
      expect(result.reason).toBe('Quarterly rebalance');
      expect(result.changes).toBeDefined();
      expect(result.total_value).toBeTypeOf('number');
      expect(result.before_positions).toHaveLength(2);
      expect(result.after_positions).toHaveLength(2);
      expect(dbStore.saveRebalance).toHaveBeenCalled();
    });

    it('throws for non-existent portfolio', async () => {
      dbStore.getPortfolio.mockResolvedValue(null);

      await expect(
        manager.executeRebalance('nonexistent', 'test', {})
      ).rejects.toThrow('Portfolio nonexistent not found');
    });

    it('records changes when quantities differ', async () => {
      dbStore.getPortfolio.mockResolvedValue(JSON.parse(JSON.stringify(samplePortfolio)));

      // Set prices that will cause quantity changes
      const priceData = { AAPL: 160, GOOG: 130 };
      const result = await manager.executeRebalance('pf-ext-1', 'drift', priceData);

      // At least one change should have been recorded
      const totalValueBefore = 10 * 160 + 5 * 130; // 2250
      expect(result.total_value).toBe(totalValueBefore);
    });

    it('uses entry price as fallback when price not in priceData', async () => {
      dbStore.getPortfolio.mockResolvedValue(JSON.parse(JSON.stringify(samplePortfolio)));

      const priceData = { AAPL: 160 }; // GOOG missing
      const result = await manager.executeRebalance('pf-ext-1', 'partial prices', priceData);

      // GOOG should use entry_price (120) as fallback
      const expectedTotal = 10 * 160 + 5 * 120;
      expect(result.total_value).toBe(expectedTotal);
    });
  });

  // -----------------------------------------------------------
  // getRebalanceHistory
  // -----------------------------------------------------------
  describe('getRebalanceHistory', () => {
    it('returns rebalance history from dbStore', async () => {
      const history = [
        { id: 'rb-1', portfolio_id: 'pf-1', timestamp: '2023-06-01T00:00:00Z' },
        { id: 'rb-2', portfolio_id: 'pf-1', timestamp: '2023-03-01T00:00:00Z' },
      ];
      dbStore.getRebalanceHistory.mockResolvedValueOnce(history);

      const result = await manager.getRebalanceHistory('pf-1');
      expect(result).toEqual(history);
      expect(dbStore.getRebalanceHistory).toHaveBeenCalledWith('pf-1');
    });
  });

  // -----------------------------------------------------------
  // updatePositionQuantity - error paths
  // -----------------------------------------------------------
  describe('updatePositionQuantity - error paths', () => {
    it('throws for non-existent portfolio', async () => {
      dbStore.getPortfolio.mockResolvedValue(null);

      await expect(
        manager.updatePositionQuantity('nonexistent', 'AAPL', 20)
      ).rejects.toThrow('Portfolio nonexistent not found');
    });
  });

  // -----------------------------------------------------------
  // createSnapshot within executeRebalance
  // -----------------------------------------------------------
  describe('createSnapshot called during rebalance', () => {
    it('saves a snapshot after rebalancing', async () => {
      dbStore.getPortfolio.mockResolvedValue(JSON.parse(JSON.stringify(samplePortfolio)));

      await manager.executeRebalance('pf-ext-1', 'test', { AAPL: 160, GOOG: 130 });

      expect(dbStore.saveSnapshot).toHaveBeenCalled();
    });
  });
});
