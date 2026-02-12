/**
 * Integration tests: Portfolio Lifecycle
 *
 * Tests the full portfolio lifecycle through PortfolioManager and PerformanceTracker:
 * Create → Positions → Snapshots → Equity Curve → Drawdowns →
 * Rebalance → Performance Metrics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDbStore, buildScoredAssets } from './helpers.js';

// Mock dbStore used by PortfolioManager and PerformanceTracker
const mockStore = createMockDbStore();
vi.mock('../../storage/indexed-db-store.js', () => ({ dbStore: mockStore }));

// Mock notifyRebalance (called at the end of executeRebalance)
vi.mock('../../alerts/alert-manager.js', () => ({
  notifyRebalance: vi.fn(async () => null),
}));

// Dynamic imports so the mocks are in place before modules resolve
const { PortfolioManager } = await import('../../portfolio/portfolio-manager.js');
const { PerformanceTracker } = await import('../../portfolio/performance-tracker.js');

// ---------------------------------------------------------------------------
// Fresh instances per test
// ---------------------------------------------------------------------------

let pm;
let tracker;

beforeEach(() => {
  // Clear in-memory mock store
  mockStore._portfolios.clear();
  mockStore._snapshots.length = 0;
  mockStore._rebalances.length = 0;
  vi.clearAllMocks();

  pm = new PortfolioManager();
  tracker = new PerformanceTracker();
});

// ---------------------------------------------------------------------------
// Helper: build scanner-output assets matching createPortfolio's expected shape
// ---------------------------------------------------------------------------

function scannerAssets(n = 3) {
  return buildScoredAssets(n).map(a => ({
    ticker: a.ticker,
    name: a.name,
    price: a.price,
    scoreTotal: a.scoreTotal,
    sectorRaw: 'Technology',
    weight: 1 / n,
    details: a.details,
  }));
}

// ---------------------------------------------------------------------------
// 1. Portfolio CRUD
// ---------------------------------------------------------------------------

describe('Portfolio CRUD lifecycle', () => {
  it('creates a portfolio with positions and saves to store', async () => {
    const assets = scannerAssets(3);
    const portfolio = await pm.createPortfolio('Test Alpha', assets, {
      initial_capital: 30000,
      strategy: 'momentum',
    });

    expect(portfolio.id).toBeTruthy();
    expect(portfolio.name).toBe('Test Alpha');
    expect(portfolio.positions).toHaveLength(3);
    expect(portfolio.initial_capital).toBe(30000);
    expect(portfolio.status).toBe('active');

    // Each position has quantity calculated from capital & weight
    for (const pos of portfolio.positions) {
      expect(pos.quantity).toBeGreaterThan(0);
      expect(pos.entry_price).toBeGreaterThan(0);
    }

    // Stored in mock
    expect(mockStore.savePortfolio).toHaveBeenCalled();
    expect(mockStore._portfolios.size).toBe(1);
  });

  it('loads a portfolio by ID', async () => {
    const assets = scannerAssets(2);
    const created = await pm.createPortfolio('Loader', assets);

    const loaded = await pm.loadPortfolio(created.id);
    expect(loaded.name).toBe('Loader');
    expect(loaded.positions).toHaveLength(2);
  });

  it('updates a portfolio and persists changes', async () => {
    const assets = scannerAssets(2);
    const created = await pm.createPortfolio('Before', assets);

    const updated = await pm.updatePortfolio(created.id, { name: 'After', status: 'archived' });
    expect(updated.name).toBe('After');
    expect(updated.status).toBe('archived');
    expect(new Date(updated.last_updated).getTime()).toBeGreaterThanOrEqual(
      new Date(created.last_updated).getTime()
    );
  });

  it('lists all portfolios', async () => {
    await pm.createPortfolio('P1', scannerAssets(2));
    await pm.createPortfolio('P2', scannerAssets(3));

    const all = await pm.getAllPortfolios();
    expect(all).toHaveLength(2);
  });

  it('deletes a portfolio and clears currentPortfolio', async () => {
    const created = await pm.createPortfolio('ToDelete', scannerAssets(2));
    expect(pm.currentPortfolio).not.toBeNull();

    await pm.deletePortfolio(created.id);
    expect(pm.currentPortfolio).toBeNull();
    expect(mockStore.deletePortfolio).toHaveBeenCalledWith(created.id);
  });
});

// ---------------------------------------------------------------------------
// 2. Position management
// ---------------------------------------------------------------------------

describe('Position management', () => {
  it('adds a new position and rebalances weights', async () => {
    const created = await pm.createPortfolio('Pos Test', scannerAssets(2));
    const id = created.id;

    const updated = await pm.addPosition(id, {
      ticker: 'NVDA',
      name: 'NVIDIA',
      entry_price: 800,
      quantity: 5,
      target_weight: 0,
      current_weight: 0,
      score: 75,
    });

    expect(updated.positions).toHaveLength(3);
    // Weights should be rebalanced to equal (1/3 each)
    updated.positions.forEach(p => {
      expect(p.target_weight).toBeCloseTo(1 / 3, 2);
    });
  });

  it('rejects duplicate ticker', async () => {
    const assets = scannerAssets(2);
    const created = await pm.createPortfolio('Dup', assets);

    await expect(
      pm.addPosition(created.id, { ticker: assets[0].ticker, entry_price: 100, quantity: 1 })
    ).rejects.toThrow(/already exists/);
  });

  it('removes a position and rebalances weights', async () => {
    const created = await pm.createPortfolio('Remove', scannerAssets(3));
    const updated = await pm.removePosition(created.id, created.positions[0].ticker);

    expect(updated.positions).toHaveLength(2);
    updated.positions.forEach(p => {
      expect(p.target_weight).toBeCloseTo(0.5, 2);
    });
  });

  it('updates position quantity', async () => {
    const created = await pm.createPortfolio('Qty', scannerAssets(2));
    const ticker = created.positions[0].ticker;

    const updated = await pm.updatePositionQuantity(created.id, ticker, 999);
    const pos = updated.positions.find(p => p.ticker === ticker);
    expect(pos.quantity).toBe(999);
  });
});

// ---------------------------------------------------------------------------
// 3. Snapshots and equity curve
// ---------------------------------------------------------------------------

describe('Snapshots → Equity curve', () => {
  it('creates a snapshot with calculated values', async () => {
    const portfolio = await pm.createPortfolio('Snap', scannerAssets(3), {
      initial_capital: 30000,
    });

    // Price data with 10% gain for each ticker
    const priceData = {};
    portfolio.positions.forEach(p => {
      priceData[p.ticker] = p.entry_price * 1.1;
    });

    const snap = await pm.createSnapshot(portfolio, priceData);

    expect(snap.portfolio_id).toBe(portfolio.id);
    expect(snap.total_value).toBeGreaterThan(0);
    // Each position's unrealized PnL should be positive (10% gain)
    snap.positions.forEach(p => {
      expect(p.unrealized_pnl).toBeGreaterThanOrEqual(0);
    });
    // Weights should sum to ~1
    const weightSum = snap.positions.reduce((s, p) => s + p.weight, 0);
    expect(weightSum).toBeCloseTo(1, 1);
  });

  it('builds equity curve from stored snapshots', async () => {
    const portfolio = await pm.createPortfolio('Equity', scannerAssets(2), {
      initial_capital: 20000,
    });

    // Simulate 5 daily snapshots with ascending values
    for (let day = 0; day < 5; day++) {
      const priceData = {};
      portfolio.positions.forEach(p => {
        priceData[p.ticker] = p.entry_price * (1 + day * 0.02);
      });
      // Manually push snapshots into mock store
      const snap = {
        portfolio_id: portfolio.id,
        date: `2024-01-${String(day + 1).padStart(2, '0')}`,
        total_value: 20000 * (1 + day * 0.02),
        cumulative_return: day * 2,
        daily_return: day === 0 ? 0 : 2,
      };
      mockStore._snapshots.push(snap);
    }

    const curve = await pm.getEquityCurve(portfolio.id, '2024-01-01', '2024-01-05');
    expect(curve).toHaveLength(5);
    // Values should be ascending
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].value).toBeGreaterThanOrEqual(curve[i - 1].value);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Drawdown calculations (synchronous from PerformanceTracker)
// ---------------------------------------------------------------------------

describe('Drawdowns', () => {
  const equityCurve = [
    { date: '2024-01-01', value: 10000, daily_return_pct: 0, return_pct: 0 },
    { date: '2024-01-02', value: 10500, daily_return_pct: 5, return_pct: 5 },
    { date: '2024-01-03', value: 10200, daily_return_pct: -2.86, return_pct: 2 },
    { date: '2024-01-04', value: 9800, daily_return_pct: -3.92, return_pct: -2 },
    { date: '2024-01-05', value: 10800, daily_return_pct: 10.2, return_pct: 8 },
    { date: '2024-01-06', value: 11000, daily_return_pct: 1.85, return_pct: 10 },
  ];

  it('calculates drawdown series with peak tracking', () => {
    const dd = tracker.calculateDrawdowns(equityCurve);

    expect(dd).toHaveLength(6);
    // First point is at peak
    expect(dd[0].drawdown_pct).toBe(0);
    // After peak of 10500, drawdown at 9800
    const ddAt9800 = dd.find(d => d.value === 9800);
    expect(ddAt9800.drawdown_pct).toBeLessThan(0);
    expect(ddAt9800.peak).toBe(10500);
  });

  it('calculates maximum drawdown with dates', () => {
    const maxDD = tracker.calculateMaxDrawdown(equityCurve);

    // Max drawdown is from peak 10500 to trough 9800 = -6.67%
    expect(maxDD.max_drawdown_pct).toBeCloseTo(-6.67, 0);
    expect(maxDD.peak_value).toBe(10500);
    expect(maxDD.trough_value).toBe(9800);
    expect(maxDD.peak_date).toBe('2024-01-02');
    expect(maxDD.trough_date).toBe('2024-01-04');
  });

  it('handles monotonically increasing equity (no drawdown)', () => {
    const upOnly = [
      { date: '2024-01-01', value: 10000, daily_return_pct: 0 },
      { date: '2024-01-02', value: 10100, daily_return_pct: 1 },
      { date: '2024-01-03', value: 10200, daily_return_pct: 1 },
    ];

    const maxDD = tracker.calculateMaxDrawdown(upOnly);
    expect(maxDD.max_drawdown_pct).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Performance metrics
// ---------------------------------------------------------------------------

describe('Performance metrics (Sharpe, Sortino, Calmar)', () => {
  it('calculates risk-adjusted metrics from equity curve', () => {
    // 30 days of mostly positive returns
    const equityCurve = Array.from({ length: 30 }, (_, i) => {
      const dailyReturn = 0.3 + Math.sin(i * 0.5) * 0.8; // ~0.3% avg with noise
      return {
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        value: 10000 * (1 + i * 0.003 + Math.sin(i * 0.5) * 0.005),
        daily_return_pct: dailyReturn,
        return_pct: i * 0.3,
      };
    });

    const metrics = tracker.calculatePerformanceMetrics(equityCurve);

    expect(metrics).toBeDefined();
    expect(typeof metrics.sharpe_ratio).toBe('number');
    expect(typeof metrics.sortino_ratio).toBe('number');
    expect(typeof metrics.calmar_ratio).toBe('number');
    expect(typeof metrics.annualized_return_pct).toBe('number');
    expect(typeof metrics.annualized_volatility_pct).toBe('number');
    expect(metrics.total_return_pct).toBeDefined();
    expect(metrics.num_periods).toBe(30);
  });

  it('returns null for curves with fewer than 2 points', () => {
    const metrics = tracker.calculatePerformanceMetrics([
      { date: '2024-01-01', value: 10000, daily_return_pct: 0 },
    ]);
    expect(metrics).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6. Rebalancing lifecycle
// ---------------------------------------------------------------------------

describe('Rebalancing lifecycle', () => {
  it('detects drift above threshold', async () => {
    const portfolio = await pm.createPortfolio('Drift', scannerAssets(3), {
      initial_capital: 30000,
    });

    // Simulate drift: one position's current weight has drifted 10%
    portfolio.positions[0].current_weight = 0.43;
    portfolio.positions[1].current_weight = 0.30;
    portfolio.positions[2].current_weight = 0.27;

    expect(pm.needsRebalancing(portfolio, 0.05)).toBe(true);
  });

  it('does not flag rebalancing when drift is within threshold', async () => {
    const portfolio = await pm.createPortfolio('NoDrift', scannerAssets(3), {
      initial_capital: 30000,
    });
    // All weights are 1/3 (equal) and target is 1/3 → no drift
    expect(pm.needsRebalancing(portfolio, 0.05)).toBe(false);
  });

  it('executes rebalance, saves record, and creates post-rebalance snapshot', async () => {
    const created = await pm.createPortfolio('Rebal', scannerAssets(3), {
      initial_capital: 30000,
    });

    // Price data where first asset grew significantly
    const priceData = {
      [created.positions[0].ticker]: created.positions[0].entry_price * 1.5,
      [created.positions[1].ticker]: created.positions[1].entry_price * 1.0,
      [created.positions[2].ticker]: created.positions[2].entry_price * 0.9,
    };

    const rebalance = await pm.executeRebalance(created.id, 'quarterly', priceData);

    expect(rebalance.id).toBeTruthy();
    expect(rebalance.portfolio_id).toBe(created.id);
    expect(rebalance.reason).toBe('quarterly');
    expect(rebalance.changes.length).toBeGreaterThan(0);
    expect(rebalance.total_value).toBeGreaterThan(0);
    expect(rebalance.before_positions).toBeDefined();
    expect(rebalance.after_positions).toBeDefined();

    // Rebalance record saved
    expect(mockStore.saveRebalance).toHaveBeenCalled();
    expect(mockStore._rebalances).toHaveLength(1);

    // Post-rebalance snapshot was created (createPortfolio creates 1, executeRebalance creates 1)
    // saveSnapshot is called for initial snapshot + rebalance snapshot
    expect(mockStore.saveSnapshot.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('retrieves rebalance history', async () => {
    const created = await pm.createPortfolio('History', scannerAssets(2), {
      initial_capital: 20000,
    });

    const priceData = {
      [created.positions[0].ticker]: created.positions[0].entry_price * 1.2,
      [created.positions[1].ticker]: created.positions[1].entry_price * 0.8,
    };

    await pm.executeRebalance(created.id, 'drift', priceData);
    await pm.executeRebalance(created.id, 'quarterly', priceData);

    const history = await pm.getRebalanceHistory(created.id);
    expect(history).toHaveLength(2);
    expect(history[0].reason).toBe('drift');
    expect(history[1].reason).toBe('quarterly');
  });
});

// ---------------------------------------------------------------------------
// 7. Full lifecycle: create → snapshot → drawdown → metrics → rebalance
// ---------------------------------------------------------------------------

describe('Full portfolio lifecycle chain', () => {
  it('runs the complete lifecycle from creation through performance analysis', async () => {
    // Step 1: Create portfolio
    const assets = scannerAssets(4);
    const portfolio = await pm.createPortfolio('Full Lifecycle', assets, {
      initial_capital: 40000,
      strategy: 'momentum',
    });

    expect(portfolio.positions).toHaveLength(4);

    // Step 2: Simulate equity curve (10 days with mixed returns)
    const equityCurve = [];
    let value = 40000;
    for (let d = 0; d < 20; d++) {
      const dailyReturn = Math.sin(d * 0.4) * 2; // -2% to +2%
      value *= 1 + dailyReturn / 100;
      equityCurve.push({
        date: `2024-01-${String(d + 1).padStart(2, '0')}`,
        value,
        daily_return_pct: dailyReturn,
        return_pct: ((value - 40000) / 40000) * 100,
      });
    }

    // Step 3: Calculate drawdowns
    const drawdowns = tracker.calculateDrawdowns(equityCurve);
    expect(drawdowns).toHaveLength(20);
    const maxDD = tracker.calculateMaxDrawdown(equityCurve);
    expect(maxDD.max_drawdown_pct).toBeLessThanOrEqual(0);

    // Step 4: Calculate performance metrics
    const metrics = tracker.calculatePerformanceMetrics(equityCurve);
    expect(metrics).not.toBeNull();
    expect(typeof metrics.sharpe_ratio).toBe('number');
    expect(typeof metrics.sortino_ratio).toBe('number');

    // Step 5: Check rebalancing need & execute
    portfolio.positions[0].current_weight = 0.45; // drift
    portfolio.positions[1].current_weight = 0.25;
    portfolio.positions[2].current_weight = 0.15;
    portfolio.positions[3].current_weight = 0.15;
    expect(pm.needsRebalancing(portfolio, 0.05)).toBe(true);

    const priceData = {};
    portfolio.positions.forEach(p => {
      priceData[p.ticker] = p.entry_price * 1.05;
    });

    const rebalance = await pm.executeRebalance(portfolio.id, 'drift', priceData);
    expect(rebalance.changes.length).toBeGreaterThan(0);

    // Step 6: Verify post-rebalance state
    const reloaded = await pm.loadPortfolio(portfolio.id);
    // After rebalance, weights should be closer to target (1/4 each)
    reloaded.positions.forEach(p => {
      expect(p.current_weight).toBeCloseTo(0.25, 2);
    });
  });
});
