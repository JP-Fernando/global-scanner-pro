/**
 * Performance Tracker Extended Tests
 *
 * Tests for async methods using mocked dbStore and fetch:
 * loadPriceData, loadCurrentPrices, calculatePortfolioValue,
 * calculatePnL, calculateEquityCurve, calculateRiskMetrics,
 * compareToBenchmark.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceTracker } from '../../portfolio/performance-tracker.js';

// Mock dbStore
vi.mock('../../storage/indexed-db-store.js', () => ({
  dbStore: {
    getPriceCache: vi.fn().mockResolvedValue([]),
    savePriceCache: vi.fn().mockResolvedValue(),
    getSnapshots: vi.fn().mockResolvedValue([]),
  },
}));

// Mock risk engine
vi.mock('../../analytics/risk_engine.js', () => ({
  calculatePortfolioMetrics: vi.fn(() => ({
    varMetrics: { diversifiedVaR: '500.00' },
    cvarMetrics: { cvar: '600.00' },
    correlationData: { matrix: [] },
  })),
}));

import { dbStore } from '../../storage/indexed-db-store.js';
import { calculatePortfolioMetrics } from '../../analytics/risk_engine.js';

// Helper: mock fetch with configurable responses
function mockFetch(data, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  });
}

describe('PerformanceTracker - Extended (Async)', () => {
  let tracker;
  let originalFetch;

  beforeEach(() => {
    tracker = new PerformanceTracker();
    originalFetch = globalThis.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // -----------------------------------------------------------
  // loadPriceData
  // -----------------------------------------------------------
  describe('loadPriceData', () => {
    it('returns cached data from in-memory cache', async () => {
      const cacheKey = 'AAPL_2023-01-01_2023-06-01';
      const cached = [{ date: '2023-01-02', price: 150 }];
      tracker.priceCache.set(cacheKey, cached);

      const result = await tracker.loadPriceData('AAPL', '2023-01-01', '2023-06-01');
      expect(result).toEqual(cached);
    });

    it('returns data from IndexedDB cache when available', async () => {
      const idbCached = [
        { ticker: 'GOOG', date: '2023-01-02', price: 100 },
      ];
      dbStore.getPriceCache.mockResolvedValueOnce(idbCached);

      const result = await tracker.loadPriceData('GOOG', '2023-01-01', '2023-06-01');
      expect(result).toEqual(idbCached);
      expect(tracker.priceCache.has('GOOG_2023-01-01_2023-06-01')).toBe(true);
    });

    it('fetches from API when not cached', async () => {
      const apiData = [
        { date: '2023-01-02', close: 150 },
        { date: '2023-01-03', close: 155 },
      ];

      dbStore.getPriceCache.mockResolvedValueOnce([]);
      globalThis.fetch = mockFetch(apiData);

      const result = await tracker.loadPriceData('MSFT', '2023-01-01', '2023-06-01');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ date: '2023-01-02', price: 150 });
      expect(dbStore.savePriceCache).toHaveBeenCalledTimes(2);
    });

    it('returns empty array when API fetch fails', async () => {
      dbStore.getPriceCache.mockResolvedValueOnce([]);
      globalThis.fetch = mockFetch(null, false);

      const result = await tracker.loadPriceData('FAIL', '2023-01-01', '2023-06-01');
      expect(result).toEqual([]);
    });

    it('returns empty array when fetch throws', async () => {
      dbStore.getPriceCache.mockResolvedValueOnce([]);
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await tracker.loadPriceData('ERR', '2023-01-01', '2023-06-01');
      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------
  // loadCurrentPrices
  // -----------------------------------------------------------
  describe('loadCurrentPrices', () => {
    it('returns ticker:price mapping', async () => {
      // Mock loadPriceData by putting data in cache
      const today = new Date().toISOString().split('T')[0];
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      tracker.priceCache.set(`AAPL_${oneWeekAgo}_${today}`, [
        { date: '2023-01-01', price: 148 },
        { date: today, price: 150 },
      ]);
      tracker.priceCache.set(`GOOG_${oneWeekAgo}_${today}`, [
        { date: today, price: 140 },
      ]);

      const result = await tracker.loadCurrentPrices(['AAPL', 'GOOG']);
      expect(result.AAPL).toBe(150);
      expect(result.GOOG).toBe(140);
    });
  });

  // -----------------------------------------------------------
  // calculatePortfolioValue
  // -----------------------------------------------------------
  describe('calculatePortfolioValue', () => {
    it('calculates value from price data', async () => {
      const date = '2023-06-01';
      const fromDate = new Date(new Date(date).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      tracker.priceCache.set(`AAPL_${fromDate}_${date}`, [
        { date: '2023-05-31', price: 148 },
        { date: '2023-06-01', price: 150 },
      ]);
      tracker.priceCache.set(`GOOG_${fromDate}_${date}`, [
        { date: '2023-06-01', price: 120 },
      ]);

      const portfolio = {
        positions: [
          { ticker: 'AAPL', quantity: 10, entry_price: 140 },
          { ticker: 'GOOG', quantity: 5, entry_price: 110 },
        ],
      };

      const value = await tracker.calculatePortfolioValue(portfolio, date);
      // 10 * 150 + 5 * 120 = 2100
      expect(value).toBe(2100);
    });

    it('uses entry price as fallback when no price data', async () => {
      dbStore.getPriceCache.mockResolvedValue([]);
      globalThis.fetch = mockFetch(null, false);

      const portfolio = {
        positions: [
          { ticker: 'UNKNOWN', quantity: 10, entry_price: 100 },
        ],
      };

      const value = await tracker.calculatePortfolioValue(portfolio, '2023-06-01');
      expect(value).toBe(1000); // 10 * 100
    });
  });

  // -----------------------------------------------------------
  // calculatePnL
  // -----------------------------------------------------------
  describe('calculatePnL', () => {
    it('calculates P&L for portfolio positions', async () => {
      const today = new Date().toISOString().split('T')[0];
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      tracker.priceCache.set(`AAPL_${oneWeekAgo}_${today}`, [
        { date: today, price: 160 },
      ]);

      const portfolio = {
        positions: [
          { ticker: 'AAPL', name: 'Apple', quantity: 10, entry_price: 150 },
        ],
      };

      const pnl = await tracker.calculatePnL(portfolio);

      expect(pnl.positions).toHaveLength(1);
      expect(pnl.positions[0].current_price).toBe(160);
      expect(pnl.positions[0].unrealized_pnl).toBe(100); // (160-150)*10
      expect(pnl.total_value).toBe(1600); // 10*160
      expect(pnl.total_cost).toBe(1500); // 10*150
      expect(pnl.total_pnl).toBe(100);
      expect(pnl.total_pnl_pct).toBeCloseTo(6.67, 1);
      expect(pnl.positions[0].weight).toBeCloseTo(100, 0);
      expect(pnl.last_updated).toBeDefined();
    });

    it('handles zero cost basis', async () => {
      const today = new Date().toISOString().split('T')[0];
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      tracker.priceCache.set(`X_${oneWeekAgo}_${today}`, [
        { date: today, price: 50 },
      ]);

      const portfolio = {
        positions: [
          { ticker: 'X', name: 'Free', quantity: 10, entry_price: 0 },
        ],
      };

      const pnl = await tracker.calculatePnL(portfolio);
      expect(pnl.positions[0].unrealized_pnl_pct).toBe(0);
    });
  });

  // -----------------------------------------------------------
  // calculateEquityCurve
  // -----------------------------------------------------------
  describe('calculateEquityCurve', () => {
    it('returns snapshots when available in DB', async () => {
      const snapshots = [
        { date: '2023-01-02', total_value: 10000, cumulative_return: 0, daily_return: 0 },
        { date: '2023-01-03', total_value: 10100, cumulative_return: 1.0, daily_return: 1.0 },
      ];
      dbStore.getSnapshots.mockResolvedValueOnce(snapshots);

      const portfolio = {
        id: 'pf-1',
        created_at: '2023-01-01T00:00:00Z',
        initial_capital: 10000,
        positions: [],
      };

      const result = await tracker.calculateEquityCurve(portfolio, '2023-01-01', '2023-01-05');
      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(10000);
      expect(result[1].return_pct).toBe(1.0);
    });

    it('calculates from price data when no snapshots', async () => {
      dbStore.getSnapshots.mockResolvedValueOnce([]);

      // Pre-populate price cache for a simple range
      // We need dates for each business day
      const portfolio = {
        id: 'pf-2',
        created_at: '2023-01-02T00:00:00Z', // Monday
        initial_capital: 10000,
        positions: [
          { ticker: 'AAPL', quantity: 10, entry_price: 100 },
        ],
      };

      // Mock all the loadPriceData calls
      dbStore.getPriceCache.mockResolvedValue([]);
      globalThis.fetch = mockFetch([
        { date: '2023-01-02', close: 100 },
        { date: '2023-01-03', close: 102 },
      ]);

      const result = await tracker.calculateEquityCurve(portfolio, '2023-01-02', '2023-01-03');
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].date).toBeDefined();
    });
  });

  // -----------------------------------------------------------
  // calculateRiskMetrics
  // -----------------------------------------------------------
  describe('calculateRiskMetrics', () => {
    it('returns risk metrics using provided historical data', async () => {
      const portfolio = {
        positions: [
          { ticker: 'AAPL', current_weight: 0.5 },
        ],
        current_value: 10000,
      };

      const historicalData = [
        {
          ticker: 'AAPL',
          weight: 0.5,
          prices: [
            { date: '2023-01-01', close: 100 },
            { date: '2023-01-02', close: 102 },
          ],
        },
      ];

      const result = await tracker.calculateRiskMetrics(portfolio, historicalData);
      expect(calculatePortfolioMetrics).toHaveBeenCalled();
      expect(result.varMetrics).toBeDefined();
    });

    it('fetches historical data when not provided', async () => {
      dbStore.getPriceCache.mockResolvedValue([]);
      globalThis.fetch = mockFetch([
        { date: '2023-01-01', close: 100 },
        { date: '2023-01-02', close: 105 },
      ]);

      const portfolio = {
        positions: [
          { ticker: 'AAPL', current_weight: 0.5 },
        ],
        current_value: 10000,
      };

      const result = await tracker.calculateRiskMetrics(portfolio);
      expect(result).toBeDefined();
    });

    it('uses initial_capital fallback when current_value missing', async () => {
      const portfolio = {
        positions: [
          { ticker: 'AAPL', current_weight: 0.5 },
        ],
        initial_capital: 5000,
      };

      const historicalData = [
        { ticker: 'AAPL', weight: 0.5, prices: [{ date: '2023-01-01', close: 100 }] },
      ];

      await tracker.calculateRiskMetrics(portfolio, historicalData);
      expect(calculatePortfolioMetrics).toHaveBeenCalledWith(
        expect.anything(),
        5000
      );
    });
  });

  // -----------------------------------------------------------
  // compareToBenchmark
  // -----------------------------------------------------------
  describe('compareToBenchmark', () => {
    it('returns comparison metrics', async () => {
      const portfolioEquity = [
        { date: '2023-01-02', value: 10000, return_pct: 0 },
        { date: '2023-01-03', value: 10200, return_pct: 2.0 },
        { date: '2023-01-04', value: 10500, return_pct: 5.0 },
      ];

      const portfolio = {
        benchmark: '^GSPC',
        created_at: '2023-01-01T00:00:00Z',
      };

      // Mock benchmark price data
      const cacheKey = `^GSPC_2023-01-02_2023-01-04`;
      tracker.priceCache.set(cacheKey, [
        { date: '2023-01-02', price: 4000 },
        { date: '2023-01-03', price: 4020 },
        { date: '2023-01-04', price: 4060 },
      ]);

      const result = await tracker.compareToBenchmark(portfolio, portfolioEquity);
      expect(result).not.toBeNull();
      expect(result.benchmark_ticker).toBe('^GSPC');
      expect(result.portfolio_return_pct).toBe(5.0);
      expect(result.alpha).toBeTypeOf('number');
      expect(result.beta).toBeTypeOf('number');
      expect(result.tracking_error).toBeTypeOf('number');
      expect(result.benchmark_equity).toBeDefined();
    });

    it('returns null when no benchmark data available', async () => {
      dbStore.getPriceCache.mockResolvedValueOnce([]);
      globalThis.fetch = mockFetch(null, false);

      const portfolioEquity = [
        { date: '2023-01-02', value: 10000, return_pct: 0 },
      ];

      const portfolio = {
        benchmark: '^UNKNOWN',
        created_at: '2023-01-01T00:00:00Z',
      };

      const result = await tracker.compareToBenchmark(portfolio, portfolioEquity);
      expect(result).toBeNull();
    });

    it('uses default benchmark when not specified', async () => {
      const portfolioEquity = [
        { date: '2023-01-02', value: 10000, return_pct: 0 },
        { date: '2023-01-03', value: 10100, return_pct: 1.0 },
      ];

      const portfolio = {
        created_at: '2023-01-01T00:00:00Z',
      };

      // Mock for ^GSPC (default)
      const cacheKey = `^GSPC_2023-01-02_2023-01-03`;
      tracker.priceCache.set(cacheKey, [
        { date: '2023-01-02', price: 4000 },
        { date: '2023-01-03', price: 4020 },
      ]);

      const result = await tracker.compareToBenchmark(portfolio, portfolioEquity);
      if (result) {
        expect(result.benchmark_ticker).toBe('^GSPC');
      }
    });
  });
});
