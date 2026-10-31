import { describe, expect, it, vi } from 'vitest';

import {
  buildYahooHistoryUrl,
  fetchPriceHistory,
  parseYahooChart,
  resolveFullSymbol,
} from '../../../shared/frontend/market-data-client.js';

const chart = (overrides = {}) => ({
  chart: {
    result: [
      {
        timestamp: [1700000000, 1700086400],
        indicators: {
          quote: [{ close: [10, 11], high: [12, 13], low: [9, 10], volume: [100, 200] }],
          adjclose: [{ adjclose: [9.5, 10.5] }],
        },
        ...overrides,
      },
    ],
  },
});

describe('market-data-client shared helpers', () => {
  it('appends the market suffix only to bare tickers', () => {
    expect(resolveFullSymbol('SAN', '.MC')).toBe('SAN.MC');
    expect(resolveFullSymbol('TEF.MC', '.MC')).toBe('TEF.MC');
  });

  it('builds a 4-year history URL by default', () => {
    const now = 1_700_000_000_000;
    const url = buildYahooHistoryUrl('AAPL', now, 4, 'https://api.test');
    const to = 1_700_000_000;
    const from = Math.floor(to - 4 * 365.25 * 86400);
    expect(url).toBe(`https://api.test/api/yahoo?symbol=AAPL&from=${from}&to=${to}`);
  });

  it('parses bars using adjusted close', () => {
    const bars = parseYahooChart(chart());
    expect(bars).toEqual([
      { date: '2023-11-14', close: 9.5, volume: 100, high: 12, low: 9 },
      { date: '2023-11-15', close: 10.5, volume: 200, high: 13, low: 10 },
    ]);
  });

  it('falls back to raw close and drops null points', () => {
    const json = chart();
    json.chart.result[0].indicators.adjclose = undefined;
    json.chart.result[0].indicators.quote[0].close = [null, 11];
    expect(parseYahooChart(json)).toEqual([{ date: '2023-11-15', close: 11, volume: 200, high: 13, low: 10 }]);
  });

  it('returns null when the payload has no result', () => {
    expect(parseYahooChart({ chart: { result: null } })).toBeNull();
    expect(parseYahooChart(null)).toBeNull();
  });

  it('caches successful fetches by full symbol', async () => {
    const cache = new Map();
    const fetchImpl = vi.fn().mockResolvedValue({ json: () => Promise.resolve(chart()) });

    const first = await fetchPriceHistory('SAN', '.MC', { cache, fetchImpl });
    const second = await fetchPriceHistory('SAN', '.MC', { cache, fetchImpl });
    expect(second).toBe(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toContain('symbol=SAN.MC');
  });

  it('returns [] without caching when the result is missing', async () => {
    const cache = new Map();
    const fetchImpl = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ chart: { result: [] } }) });
    expect(await fetchPriceHistory('X', '', { cache, fetchImpl })).toEqual([]);
    expect(cache.size).toBe(0);
  });

  it('propagates network errors to the caller', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(fetchPriceHistory('X', '', { fetchImpl })).rejects.toThrow('offline');
  });
});
