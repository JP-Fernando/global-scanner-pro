/**
 * Integration test helpers — shared fixtures and utilities.
 *
 * Re-exports unit-test helpers and adds builders that produce
 * data structures matching the contracts between modules.
 */

export { buildPriceSeries, buildAssetSeries, buildStrategyConfig, setupReportMocks } from '../helpers.js';

// ------------------------------------------------------------------
// Scored-asset builder (output shape of scoring → input of allocation)
// ------------------------------------------------------------------

export const buildScoredAssets = (n = 5) => {
  const tickers = ['AAPL', 'MSFT', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'JNJ', 'WMT'];
  const names   = ['Apple', 'Microsoft', 'Alphabet', 'Amazon', 'Meta', 'NVIDIA', 'Tesla', 'JPMorgan', 'J&J', 'Walmart'];
  const vols    = [22, 24, 26, 30, 35, 40, 45, 20, 15, 18];
  const scores  = [85, 78, 72, 68, 64, 60, 55, 50, 45, 40];

  return Array.from({ length: Math.min(n, tickers.length) }, (_, i) => ({
    ticker: tickers[i],
    name: names[i],
    scoreTotal: scores[i],
    price: 100 + i * 20,
    sectorRaw: 800 - i * 100,
    weight: 1 / n,
    details: {
      trend: { score: 60 + i, positionScore: 30, consistencyScore: '15.0', adxScore: '15.0', ema50: '100.00', ema200: '95.00' },
      momentum: { score: 65 + i, mom6Score: 15, mom12Score: 25, thrustScore: 10, rsiScore: 15 },
      risk: { score: 70 - i * 2, volatility: vols[i].toFixed(2), atrPct: '3.50', maxDrawdown: '15.00' },
      liquidity: { score: 80, avgVol20: '5000000', avgVol60: '4800000', volRatio: '1.10' },
    },
  }));
};

// ------------------------------------------------------------------
// Price-matrix builder (correlated series for risk_engine)
// ------------------------------------------------------------------

export const buildPriceMatrix = (tickers, days = 252) => {
  // Each ticker gets a slightly different upward trend + minor noise
  return tickers.map((ticker, idx) => {
    const basePrice = 100 + idx * 20;
    const dailyDrift = 0.0003 + idx * 0.0001;
    const prices = [];
    let p = basePrice;
    for (let d = 0; d < days; d++) {
      // Deterministic "noise" seeded by day and index
      const noise = Math.sin(d * (idx + 1) * 0.1) * 0.005;
      p *= 1 + dailyDrift + noise;
      prices.push({ date: dateOffset(d), close: Number(p.toFixed(4)) });
    }
    return { ticker, prices };
  });
};

// ------------------------------------------------------------------
// Portfolio builder (for portfolio-manager tests)
// ------------------------------------------------------------------

export const buildPortfolioWithPositions = (n = 3) => {
  const scored = buildScoredAssets(n);
  return {
    id: 'test-portfolio-1',
    name: 'Test Portfolio',
    description: '',
    created_at: '2024-01-01T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    positions: scored.map(a => ({
      ticker: a.ticker,
      name: a.name,
      sector: a.sectorRaw,
      entry_price: a.price,
      entry_date: '2024-01-01',
      quantity: Math.floor((10000 / n) / a.price),
      target_weight: 1 / n,
      current_weight: 1 / n,
      score: a.scoreTotal,
      volatility: parseFloat(a.details.risk.volatility),
    })),
    benchmark: '^GSPC',
    strategy: 'balanced',
    allocation_method: 'equal_weight',
    initial_capital: 10000,
    current_value: 10000,
    total_return: 0,
    total_return_pct: 0,
    status: 'active',
  };
};

// ------------------------------------------------------------------
// Yahoo-API mock response builder
// ------------------------------------------------------------------

export const buildYahooApiResponse = (ticker, days = 100) => {
  const timestamps = [];
  const closes = [];
  const highs = [];
  const lows = [];
  const volumes = [];
  const opens = [];

  let price = 150;
  const baseTs = Math.floor(new Date('2023-01-01').getTime() / 1000);

  for (let d = 0; d < days; d++) {
    timestamps.push(baseTs + d * 86400);
    const drift = Math.sin(d * 0.1) * 0.005;
    price *= 1 + 0.0003 + drift;
    closes.push(Number(price.toFixed(2)));
    highs.push(Number((price * 1.01).toFixed(2)));
    lows.push(Number((price * 0.99).toFixed(2)));
    opens.push(Number((price * 1.002).toFixed(2)));
    volumes.push(1000000 + d * 5000);
  }

  return {
    chart: {
      result: [{
        meta: { symbol: ticker },
        timestamp: timestamps,
        indicators: {
          quote: [{ close: closes, high: highs, low: lows, volume: volumes, open: opens }],
        },
      }],
    },
  };
};

// ------------------------------------------------------------------
// Alert settings builder
// ------------------------------------------------------------------

export const buildAlertSettings = (overrides = {}) => ({
  id: 'default:momentum',
  user_id: 'default',
  strategy: 'momentum',
  thresholds: { volatility_pct: 25, drawdown_pct: -15, score: 80 },
  channels: { email: '', webhook: '', slack: '', teams: '', zapier: '' },
  notifyOn: { strongSignals: true, rebalances: true, riskEvents: true },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ------------------------------------------------------------------
// In-memory mock DB store
// ------------------------------------------------------------------

export const createMockDbStore = () => {
  const portfolios = new Map();
  const snapshots = [];
  const rebalances = [];
  const alerts = [];
  const alertSettings = new Map();
  const priceCache = [];

  return {
    // Portfolios
    savePortfolio: vi.fn(async (p) => { portfolios.set(p.id, JSON.parse(JSON.stringify(p))); return p.id; }),
    getPortfolio: vi.fn(async (id) => { const p = portfolios.get(id); return p ? JSON.parse(JSON.stringify(p)) : null; }),
    getAllPortfolios: vi.fn(async () => [...portfolios.values()]),
    deletePortfolio: vi.fn(async (id) => { portfolios.delete(id); }),

    // Snapshots
    saveSnapshot: vi.fn(async (s) => { snapshots.push(JSON.parse(JSON.stringify(s))); }),
    getSnapshots: vi.fn(async (portfolioId, from, to) =>
      snapshots
        .filter(s => s.portfolio_id === portfolioId)
        .filter(s => (!from || s.date >= from) && (!to || s.date <= to))
    ),

    // Rebalances
    saveRebalance: vi.fn(async (r) => { rebalances.push(JSON.parse(JSON.stringify(r))); return r.id; }),
    getRebalanceHistory: vi.fn(async (portfolioId) => rebalances.filter(r => r.portfolio_id === portfolioId)),

    // Alerts
    saveAlert: vi.fn(async (a) => {
      const idx = alerts.findIndex(x => x.id === a.id);
      if (idx >= 0) alerts[idx] = JSON.parse(JSON.stringify(a));
      else alerts.push(JSON.parse(JSON.stringify(a)));
    }),
    getAlerts: vi.fn(async ({ strategy, userId, limit = 50 } = {}) =>
      alerts
        .filter(a => (!strategy || a.strategy === strategy) && (!userId || a.user_id === userId))
        .slice(0, limit)
    ),

    // Alert settings
    saveAlertSettings: vi.fn(async (s) => { alertSettings.set(s.id, JSON.parse(JSON.stringify(s))); }),
    getAlertSettings: vi.fn(async (id) => { const s = alertSettings.get(id); return s ? JSON.parse(JSON.stringify(s)) : null; }),

    // Price cache
    savePriceCache: vi.fn(async (ticker, date, price) => { priceCache.push({ ticker, date, price }); }),
    getPriceCache: vi.fn(async () => []),

    // Expose internals for assertions
    _portfolios: portfolios,
    _snapshots: snapshots,
    _rebalances: rebalances,
    _alerts: alerts,
    _alertSettings: alertSettings,
    _priceCache: priceCache,
  };
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function dateOffset(dayIndex) {
  const d = new Date('2023-01-02');
  d.setDate(d.getDate() + dayIndex);
  return d.toISOString().split('T')[0];
}

/**
 * Build a realistic OHLC + volume series for scoring functions.
 * Returns { data (OHLC array), prices (close[]), volumes (number[]) }.
 */
export const buildOHLCVSeries = (days = 300, startPrice = 100) => {
  const data = [];
  const prices = [];
  const volumes = [];
  let p = startPrice;

  for (let d = 0; d < days; d++) {
    const noise = Math.sin(d * 0.05) * 0.003;
    p *= 1 + 0.0004 + noise;
    const c = Number(p.toFixed(4));
    const h = Number((c * 1.012).toFixed(4));
    const l = Number((c * 0.988).toFixed(4));
    const v = 50000 + Math.floor(Math.sin(d * 0.2) * 10000 + 10000);

    data.push({ c, h, l });
    prices.push(c);
    volumes.push(v);
  }

  return { data, prices, volumes };
};
