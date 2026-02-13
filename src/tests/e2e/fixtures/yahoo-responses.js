/**
 * Deterministic Yahoo Finance API response fixtures for E2E tests.
 * Adapted from src/tests/integration/helpers.js buildYahooApiResponse().
 */

/**
 * Build a Yahoo Finance chart API response with deterministic OHLCV data.
 * Uses symbol-seeded variation so different tickers produce different (but
 * reproducible) price series.
 */
export function buildYahooChartResponse(symbol, days = 300) {
  const seed = hashSymbol(symbol);
  const timestamps = [];
  const closes = [];
  const highs = [];
  const lows = [];
  const volumes = [];
  const opens = [];

  let price = 100 + seed * 10;
  const baseTs = Math.floor(new Date('2023-01-01').getTime() / 1000);

  for (let d = 0; d < days; d++) {
    timestamps.push(baseTs + d * 86400);
    const drift = Math.sin(d * 0.1 + seed) * 0.005;
    price *= 1 + 0.0003 + drift;
    closes.push(Number(price.toFixed(2)));
    highs.push(Number((price * 1.01).toFixed(2)));
    lows.push(Number((price * 0.99).toFixed(2)));
    opens.push(Number((price * 1.002).toFixed(2)));
    volumes.push(1_000_000 + d * 5000 + seed * 50_000);
  }

  return {
    chart: {
      result: [{
        meta: { symbol },
        timestamp: timestamps,
        indicators: {
          quote: [{ close: closes, high: highs, low: lows, volume: volumes, open: opens }],
        },
      }],
    },
  };
}

/** Simple numeric hash from symbol string for deterministic seeding. */
function hashSymbol(symbol) {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) {
    h = ((h << 5) - h + symbol.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 10);
}

/** Small test universe: 5 BME tickers with suffix .MC */
export const TEST_UNIVERSE_BME = [
  { ticker: 'ITX', name: 'Inditex', sector: 'Consumer Cyclical', industry: 'Apparel Retail' },
  { ticker: 'IBE', name: 'Iberdrola', sector: 'Utilities', industry: 'Utilities - Diversified' },
  { ticker: 'SAN', name: 'Banco Santander', sector: 'Financial Services', industry: 'Banks' },
  { ticker: 'BBVA', name: 'BBVA', sector: 'Financial Services', industry: 'Banks' },
  { ticker: 'TEF', name: 'Telefonica', sector: 'Communication Services', industry: 'Telecom' },
];
