/**
 * Portfolio Manager Tests
 *
 * Tests for CRUD operations, position management, rebalancing,
 * and snapshot creation. External dependencies (IndexedDB) are mocked.
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

describe('PortfolioManager', () => {
  let manager;

  beforeEach(() => {
    manager = new PortfolioManager();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------
  // generateId
  // ---------------------------------------------------------------
  describe('generateId', () => {
    it('returns a non-empty string', () => {
      const id = manager.generateId();
      expect(id).toBeTypeOf('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('generates unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => manager.generateId()));
      expect(ids.size).toBe(100);
    });
  });

  // ---------------------------------------------------------------
  // createPortfolio
  // ---------------------------------------------------------------
  describe('createPortfolio', () => {
    const assets = [
      { ticker: 'AAPL', name: 'Apple', price: 150, sectorRaw: 'Technology', scoreTotal: 80 },
      { ticker: 'GOOG', name: 'Google', price: 100, sectorRaw: 'Technology', scoreTotal: 75 },
    ];

    it('creates a portfolio with positions from assets', async () => {
      const portfolio = await manager.createPortfolio('Test Portfolio', assets);

      expect(portfolio.name).toBe('Test Portfolio');
      expect(portfolio.positions).toHaveLength(2);
      expect(portfolio.status).toBe('active');
      expect(portfolio.initial_capital).toBe(10000);
      expect(portfolio.id).toBeTypeOf('string');
    });

    it('calculates position quantities based on capital', async () => {
      const portfolio = await manager.createPortfolio('Test', assets, {
        initial_capital: 10000,
      });

      portfolio.positions.forEach(pos => {
        expect(pos.quantity).toBeTypeOf('number');
        expect(pos.quantity).toBeGreaterThanOrEqual(0);
      });
    });

    it('sets equal weights when assets have no weight', async () => {
      const portfolio = await manager.createPortfolio('Test', assets);

      portfolio.positions.forEach(pos => {
        expect(pos.target_weight).toBeCloseTo(0.5, 5);
      });
    });

    it('saves portfolio to dbStore', async () => {
      await manager.createPortfolio('Test', assets);
      expect(dbStore.savePortfolio).toHaveBeenCalledTimes(1);
    });

    it('creates initial snapshot', async () => {
      await manager.createPortfolio('Test', assets);
      expect(dbStore.saveSnapshot).toHaveBeenCalledTimes(1);
    });

    it('sets currentPortfolio', async () => {
      const portfolio = await manager.createPortfolio('Test', assets);
      expect(manager.currentPortfolio).toBe(portfolio);
    });

    it('respects custom options', async () => {
      const portfolio = await manager.createPortfolio('Test', assets, {
        description: 'Test description',
        benchmark: '^IXIC',
        strategy: 'momentum_aggressive',
        allocation_method: 'score_weighted',
        initial_capital: 50000,
      });

      expect(portfolio.description).toBe('Test description');
      expect(portfolio.benchmark).toBe('^IXIC');
      expect(portfolio.strategy).toBe('momentum_aggressive');
      expect(portfolio.allocation_method).toBe('score_weighted');
      expect(portfolio.initial_capital).toBe(50000);
    });
  });

  // ---------------------------------------------------------------
  // updatePortfolio
  // ---------------------------------------------------------------
  describe('updatePortfolio', () => {
    it('updates portfolio fields', async () => {
      const existing = { id: 'test-id', name: 'Old', positions: [] };
      dbStore.getPortfolio.mockResolvedValue(existing);

      const updated = await manager.updatePortfolio('test-id', { name: 'New' });

      expect(updated.name).toBe('New');
      expect(updated.last_updated).toBeTypeOf('string');
      expect(dbStore.savePortfolio).toHaveBeenCalledTimes(1);
    });

    it('throws for non-existent portfolio', async () => {
      dbStore.getPortfolio.mockResolvedValue(null);

      await expect(manager.updatePortfolio('missing-id', {}))
        .rejects.toThrow('Portfolio missing-id not found');
    });

    it('updates currentPortfolio if it matches', async () => {
      const existing = { id: 'test-id', name: 'Old', positions: [] };
      dbStore.getPortfolio.mockResolvedValue(existing);
      manager.currentPortfolio = { id: 'test-id' };

      await manager.updatePortfolio('test-id', { name: 'New' });
      expect(manager.currentPortfolio.name).toBe('New');
    });
  });

  // ---------------------------------------------------------------
  // loadPortfolio
  // ---------------------------------------------------------------
  describe('loadPortfolio', () => {
    it('loads and sets currentPortfolio', async () => {
      const portfolio = { id: 'test-id', name: 'Test', positions: [] };
      dbStore.getPortfolio.mockResolvedValue(portfolio);

      const result = await manager.loadPortfolio('test-id');
      expect(result).toEqual(portfolio);
      expect(manager.currentPortfolio).toBe(portfolio);
    });

    it('throws for non-existent portfolio', async () => {
      dbStore.getPortfolio.mockResolvedValue(null);

      await expect(manager.loadPortfolio('missing'))
        .rejects.toThrow('Portfolio missing not found');
    });
  });

  // ---------------------------------------------------------------
  // deletePortfolio
  // ---------------------------------------------------------------
  describe('deletePortfolio', () => {
    it('deletes portfolio from store', async () => {
      await manager.deletePortfolio('test-id');
      expect(dbStore.deletePortfolio).toHaveBeenCalledWith('test-id');
    });

    it('clears currentPortfolio if it matches', async () => {
      manager.currentPortfolio = { id: 'test-id' };
      await manager.deletePortfolio('test-id');
      expect(manager.currentPortfolio).toBeNull();
    });

    it('does not clear currentPortfolio if different ID', async () => {
      manager.currentPortfolio = { id: 'other-id' };
      await manager.deletePortfolio('test-id');
      expect(manager.currentPortfolio).toEqual({ id: 'other-id' });
    });
  });

  // ---------------------------------------------------------------
  // addPosition
  // ---------------------------------------------------------------
  describe('addPosition', () => {
    it('adds a new position', async () => {
      const portfolio = {
        id: 'test-id', name: 'Test', positions: [],
        allocation_method: 'equal_weight',
      };
      dbStore.getPortfolio.mockResolvedValue(portfolio);

      const position = { ticker: 'AAPL', entry_price: 150, quantity: 10 };
      await manager.addPosition('test-id', position);

      expect(dbStore.savePortfolio).toHaveBeenCalled();
    });

    it('throws for non-existent portfolio', async () => {
      dbStore.getPortfolio.mockResolvedValue(null);

      await expect(manager.addPosition('missing', { ticker: 'AAPL' }))
        .rejects.toThrow('Portfolio missing not found');
    });

    it('throws for duplicate ticker', async () => {
      const portfolio = {
        id: 'test-id', positions: [{ ticker: 'AAPL' }],
        allocation_method: 'equal_weight',
      };
      dbStore.getPortfolio.mockResolvedValue(portfolio);

      await expect(manager.addPosition('test-id', { ticker: 'AAPL' }))
        .rejects.toThrow('Position AAPL already exists');
    });
  });

  // ---------------------------------------------------------------
  // removePosition
  // ---------------------------------------------------------------
  describe('removePosition', () => {
    it('removes a position by ticker', async () => {
      const portfolio = {
        id: 'test-id',
        positions: [{ ticker: 'AAPL' }, { ticker: 'GOOG' }],
        allocation_method: 'equal_weight',
      };
      dbStore.getPortfolio.mockResolvedValue(portfolio);

      await manager.removePosition('test-id', 'AAPL');

      const savedCall = dbStore.savePortfolio.mock.calls[0][0];
      expect(savedCall.positions).toHaveLength(1);
      expect(savedCall.positions[0].ticker).toBe('GOOG');
    });

    it('throws for non-existent portfolio', async () => {
      dbStore.getPortfolio.mockResolvedValue(null);

      await expect(manager.removePosition('missing', 'AAPL'))
        .rejects.toThrow('Portfolio missing not found');
    });
  });

  // ---------------------------------------------------------------
  // updatePositionQuantity
  // ---------------------------------------------------------------
  describe('updatePositionQuantity', () => {
    it('updates quantity of existing position', async () => {
      const portfolio = {
        id: 'test-id',
        positions: [{ ticker: 'AAPL', quantity: 10 }],
      };
      dbStore.getPortfolio.mockResolvedValue(portfolio);

      await manager.updatePositionQuantity('test-id', 'AAPL', 20);

      expect(dbStore.savePortfolio).toHaveBeenCalled();
    });

    it('throws for non-existent position', async () => {
      const portfolio = {
        id: 'test-id',
        positions: [{ ticker: 'GOOG', quantity: 10 }],
      };
      dbStore.getPortfolio.mockResolvedValue(portfolio);

      await expect(manager.updatePositionQuantity('test-id', 'AAPL', 20))
        .rejects.toThrow('Position AAPL not found');
    });
  });

  // ---------------------------------------------------------------
  // needsRebalancing
  // ---------------------------------------------------------------
  describe('needsRebalancing', () => {
    it('returns false when no drift exceeds threshold', () => {
      const portfolio = {
        positions: [
          { current_weight: 0.50, target_weight: 0.50 },
          { current_weight: 0.50, target_weight: 0.50 },
        ],
      };

      expect(manager.needsRebalancing(portfolio)).toBe(false);
    });

    it('returns true when drift exceeds threshold', () => {
      const portfolio = {
        positions: [
          { current_weight: 0.60, target_weight: 0.50 },
          { current_weight: 0.40, target_weight: 0.50 },
        ],
      };

      expect(manager.needsRebalancing(portfolio)).toBe(true);
    });

    it('respects custom threshold', () => {
      const portfolio = {
        positions: [
          { current_weight: 0.54, target_weight: 0.50 },
          { current_weight: 0.46, target_weight: 0.50 },
        ],
      };

      expect(manager.needsRebalancing(portfolio, 0.05)).toBe(false);
      expect(manager.needsRebalancing(portfolio, 0.03)).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // _rebalanceWeights
  // ---------------------------------------------------------------
  describe('_rebalanceWeights', () => {
    it('sets equal weights for equal_weight method', () => {
      const portfolio = {
        allocation_method: 'equal_weight',
        positions: [
          { ticker: 'A', target_weight: 0, current_weight: 0 },
          { ticker: 'B', target_weight: 0, current_weight: 0 },
          { ticker: 'C', target_weight: 0, current_weight: 0 },
        ],
      };

      manager._rebalanceWeights(portfolio);

      portfolio.positions.forEach(pos => {
        expect(pos.target_weight).toBeCloseTo(1 / 3, 5);
        expect(pos.current_weight).toBeCloseTo(1 / 3, 5);
      });
    });

    it('handles empty positions', () => {
      const portfolio = { allocation_method: 'equal_weight', positions: [] };
      expect(() => manager._rebalanceWeights(portfolio)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------
  // createSnapshot
  // ---------------------------------------------------------------
  describe('createSnapshot', () => {
    it('creates snapshot with entry prices as fallback', async () => {
      const portfolio = {
        id: 'test-id',
        positions: [
          { ticker: 'AAPL', entry_price: 150, quantity: 10 },
          { ticker: 'GOOG', entry_price: 100, quantity: 20 },
        ],
        current_value: 3500,
        initial_capital: 3500,
      };

      const snapshot = await manager.createSnapshot(portfolio);

      expect(snapshot.portfolio_id).toBe('test-id');
      expect(snapshot.total_value).toBe(3500);
      expect(snapshot.positions).toHaveLength(2);
      expect(dbStore.saveSnapshot).toHaveBeenCalled();
    });

    it('uses provided price data when available', async () => {
      const portfolio = {
        id: 'test-id',
        positions: [
          { ticker: 'AAPL', entry_price: 150, quantity: 10 },
        ],
        current_value: 1500,
        initial_capital: 1500,
      };

      const snapshot = await manager.createSnapshot(portfolio, { AAPL: 160 });

      expect(snapshot.total_value).toBe(1600);
    });

    it('calculates position weights', async () => {
      const portfolio = {
        id: 'test-id',
        positions: [
          { ticker: 'AAPL', entry_price: 100, quantity: 10 },
          { ticker: 'GOOG', entry_price: 100, quantity: 10 },
        ],
        current_value: 2000,
        initial_capital: 2000,
      };

      const snapshot = await manager.createSnapshot(portfolio);
      snapshot.positions.forEach(p => {
        expect(p.weight).toBeCloseTo(0.5, 2);
      });
    });
  });

  // ---------------------------------------------------------------
  // getEquityCurve
  // ---------------------------------------------------------------
  describe('getEquityCurve', () => {
    it('returns snapshots from dbStore', async () => {
      dbStore.getSnapshots.mockResolvedValue([
        { date: '2023-01-01', total_value: 1000, cumulative_return: 0, daily_return: 0 },
        { date: '2023-01-02', total_value: 1050, cumulative_return: 5, daily_return: 5 },
      ]);

      const result = await manager.getEquityCurve('test-id');
      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(1000);
      expect(result[1].value).toBe(1050);
    });
  });
});
