/**
 * Shared test helpers and fixtures for the Vitest test suite.
 *
 * Provides reusable data builders, mocking utilities, and custom matchers
 * used across multiple test modules.
 */

import { expect } from 'vitest';

// ------------------------------------------------------------------
// Custom matchers
// ------------------------------------------------------------------

expect.extend({
  /**
   * Assert a number is approximately equal to an expected value
   * within a fixed tolerance (absolute difference).
   *
   * Usage:  expect(actual).toBeApprox(expected, tolerance)
   */
  toBeApprox(received, expected, tolerance) {
    const diff = Math.abs(received - expected);
    const pass = diff <= tolerance;
    return {
      pass,
      message: () =>
        `expected ${received} to be within ${tolerance} of ${expected} (diff: ${diff})`,
    };
  },
});

// ------------------------------------------------------------------
// Data builders
// ------------------------------------------------------------------

export const buildPriceSeries = (startPrice, days, step = 0.4) =>
  Array.from({ length: days }, (_, i) => startPrice + i * step);

export const buildAssetSeries = (ticker, startPrice, days) => {
  const prices = buildPriceSeries(startPrice, days);
  return prices.map((close, i) => ({
    date: `2023-01-${String(i + 1).padStart(2, '0')}`,
    close,
    high: close + 1,
    low: close - 1,
    volume: 10000 + i * 50,
  }));
};

export const buildBacktestUniverse = () => [
  { ticker: 'AAA', name: 'Asset AAA', data: buildAssetSeries('AAA', 100, 80) },
  { ticker: 'BBB', name: 'Asset BBB', data: buildAssetSeries('BBB', 120, 80) },
];

export const buildStrategyConfig = () => ({
  name: 'Test Strategy',
  weights: {
    trend: 0.3,
    momentum: 0.3,
    risk: 0.2,
    liquidity: 0.2,
  },
  indicators: {
    ema_short: 5,
    ema_medium: 8,
    ema_long: 13,
    rsi_period: 14,
    atr_period: 14,
    bb_period: 20,
    adx_period: 14,
    williams_period: 14,
    roc_short: 10,
    roc_long: 20,
  },
  filters: {
    min_volume_20d: 5000,
    min_volume_60d: 3000,
    max_atr_pct: 40,
    min_days_history: 15,
    max_drawdown_52w: 90,
  },
});

export const buildAttributionFixtures = () => {
  const portfolio = {
    name: 'Attribution Test Portfolio',
    benchmark: '^GSPC',
    created_at: '2023-01-01T00:00:00Z',
    positions: [
      {
        ticker: 'AAA',
        name: 'Asset AAA',
        sector: 800,
        entry_price: 100,
        current_weight: 0.6,
      },
      {
        ticker: 'BBB',
        name: 'Asset BBB',
        sector: 700,
        entry_price: 120,
        current_weight: 0.4,
      },
    ],
  };

  const portfolioReturns = [
    { date: '2023-01-01', value: 100, positions: [{ ticker: 'AAA', price: 100 }, { ticker: 'BBB', price: 120 }] },
    { date: '2023-01-02', value: 101, positions: [{ ticker: 'AAA', price: 102 }, { ticker: 'BBB', price: 121 }] },
    { date: '2023-01-03', value: 103, positions: [{ ticker: 'AAA', price: 104 }, { ticker: 'BBB', price: 123 }] },
  ];

  const benchmarkReturns = [
    { date: '2023-01-01', value: 100 },
    { date: '2023-01-02', value: 100.5 },
    { date: '2023-01-03', value: 101.2 },
  ];

  return { portfolio, portfolioReturns, benchmarkReturns };
};

export const buildStressTestPortfolio = () => [
  {
    ticker: 'AAPL', name: 'Apple Inc.', sector: 800,
    current_weight: 0.25, weight: 0.25, volatility: 25,
    quantity: 100, entry_price: 150, current_price: 160, volume: 80000000,
  },
  {
    ticker: 'JPM', name: 'JPMorgan Chase', sector: 700,
    current_weight: 0.20, weight: 0.20, volatility: 22,
    quantity: 150, entry_price: 140, current_price: 145, volume: 15000000,
  },
  {
    ticker: 'XOM', name: 'Exxon Mobil', sector: 100,
    current_weight: 0.15, weight: 0.15, volatility: 28,
    quantity: 200, entry_price: 100, current_price: 105, volume: 20000000,
  },
  {
    ticker: 'JNJ', name: 'Johnson & Johnson', sector: 600,
    current_weight: 0.20, weight: 0.20, volatility: 15,
    quantity: 120, entry_price: 160, current_price: 165, volume: 10000000,
  },
  {
    ticker: 'WMT', name: 'Walmart', sector: 500,
    current_weight: 0.20, weight: 0.20, volatility: 18,
    quantity: 180, entry_price: 145, current_price: 150, volume: 12000000,
  },
];

export const buildOptimizationPortfolio = () => [
  {
    ticker: 'AAPL', name: 'Apple Inc.', sector: 800,
    weight: 0.25, prices: buildAssetSeries('AAPL', 150, 100),
  },
  {
    ticker: 'JPM', name: 'JPMorgan Chase', sector: 700,
    weight: 0.25, prices: buildAssetSeries('JPM', 140, 100),
  },
  {
    ticker: 'XOM', name: 'Exxon Mobil', sector: 100,
    weight: 0.25, prices: buildAssetSeries('XOM', 100, 100),
  },
  {
    ticker: 'JNJ', name: 'Johnson & Johnson', sector: 600,
    weight: 0.25, prices: buildAssetSeries('JNJ', 160, 100),
  },
];

// ------------------------------------------------------------------
// Mocking utilities
// ------------------------------------------------------------------

export const withMockedDbStore = async (dbStore, mocks, testFn) => {
  const original = {};
  Object.keys(mocks).forEach((key) => {
    original[key] = dbStore[key];
    dbStore[key] = mocks[key];
  });
  try {
    return await testFn();
  } finally {
    Object.keys(mocks).forEach((key) => {
      dbStore[key] = original[key];
    });
  }
};

export const withMockedFetch = async (mockFn, testFn) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFn;
  try {
    return await testFn();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

// Mock browser libraries used by report generators
export const setupReportMocks = () => {
  if (typeof window === 'undefined') {
    global.window = {};
  }

  window.XLSX = {
    utils: {
      book_new: () => ({ SheetNames: [], Sheets: {} }),
      aoa_to_sheet: (data) => ({ data }),
      book_append_sheet: (workbook, worksheet, sheetName) => {
        workbook.SheetNames.push(sheetName);
        workbook.Sheets[sheetName] = worksheet;
      },
    },
    writeFile: () => {},
  };

  class MockJsPDF {
    constructor(orientation) {
      this.orientation = orientation;
      this.lastAutoTable = { finalY: 100 };
      this._pages = 1;
    }
    internal = {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
      getNumberOfPages: () => this._pages,
    };
    setFontSize() {}
    setFont() {}
    setTextColor() {}
    setFillColor() {}
    text() {}
    splitTextToSize(_text) { return [_text]; }
    rect() {}
    addPage() { this._pages++; }
    setPage() {}
    autoTable() { this.lastAutoTable.finalY = 150; }
    save() {}
  }

  window.jspdf = { jsPDF: MockJsPDF };
};
