import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyLogReturns,
  calculateCagr,
  simulateInvestment
} from '../../../simulation/simulation-service.js';

function buildYahooPayload(symbol, closes) {
  return {
    chart: {
      result: [{
        meta: { symbol, currency: 'USD' },
        indicators: {
          quote: [{ close: closes }]
        }
      }]
    }
  };
}

describe('simulation-service', () => {
  it('calculates monthly log-returns from known prices', () => {
    const prices = [100, 110, 121];
    const returns = calculateMonthlyLogReturns(prices);

    expect(returns).toHaveLength(2);
    expect(returns[0]).toBeCloseTo(Math.log(1.1), 8);
    expect(returns[1]).toBeCloseTo(Math.log(1.1), 8);
  });

  it('calculates CAGR correctly', () => {
    const cagr = calculateCagr(12000, 10000, 12);
    expect(cagr).toBeCloseTo(0.2, 8);
  });

  it('runs DCA simulation and returns projection with scenarios', async () => {
    const closes = Array.from({ length: 72 }, (_, i) => Number((100 + i * 1.5).toFixed(2)));
    const fetchMock = async () => ({
      ok: true,
      json: async () => buildYahooPayload('AAPL', closes)
    });

    const result = await simulateInvestment({
      tickers: ['AAPL'],
      tickerInvestments: { AAPL: 500 },
      horizonMonths: 60
    }, { fetchImpl: fetchMock });

    expect(result.data.totalInvested).toBe(30000);
    expect(result.data.totalMonthlyInvestment).toBe(500);
    expect(result.data.monthlyProjection).toHaveLength(60);
    expect(result.data.scenarios.expected.finalValue).toBeGreaterThan(0);
    expect(result.data.perTicker).toHaveLength(1);
    expect(result.data.perTicker[0].monthlyAmount).toBe(500);
    expect(result.data.perTicker[0].tickerTotalInvested).toBe(30000);
  });

  it('returns error for ticker with less than 12 months of data', async () => {
    const fetchMock = async () => ({
      ok: true,
      json: async () => buildYahooPayload('AAPL', [100, 101, 102, 103, 104])
    });

    await expect(simulateInvestment({
      tickers: ['SHORT1'],
      tickerInvestments: { SHORT1: 100 },
      horizonMonths: 12
    }, { fetchImpl: fetchMock })).rejects.toThrow('insufficient monthly history');
  });

  it('returns error when ticker has no valid price data', async () => {
    const fetchMock = async () => ({
      ok: true,
      json: async () => buildYahooPayload('AAPL', [null, null, null])
    });

    await expect(simulateInvestment({
      tickers: ['EMPTY1'],
      tickerInvestments: { EMPTY1: 100 },
      horizonMonths: 12
    }, { fetchImpl: fetchMock })).rejects.toThrow('no valid price data');
  });

  it('computes weighted portfolio stats for two tickers with different amounts', async () => {
    const rising = Array.from({ length: 80 }, (_, i) => 100 + (i * 2));
    const mild = Array.from({ length: 80 }, (_, i) => 100 + (i * 0.8));

    const fetchMock = async (url) => {
      if (String(url).includes('AAPL')) {
        return { ok: true, json: async () => buildYahooPayload('AAPL', rising) };
      }
      return { ok: true, json: async () => buildYahooPayload('MSFT', mild) };
    };

    const result = await simulateInvestment({
      tickers: ['AAPL', 'MSFT'],
      tickerInvestments: { AAPL: 300, MSFT: 200 },
      horizonMonths: 24
    }, { fetchImpl: fetchMock });

    expect(result.data.perTicker).toHaveLength(2);
    expect(result.data.totalMonthlyInvestment).toBe(500);
    expect(result.data.totalInvested).toBe(12000);

    const aaplItem = result.data.perTicker.find(p => p.ticker === 'AAPL');
    const msftItem = result.data.perTicker.find(p => p.ticker === 'MSFT');
    expect(aaplItem.weight).toBeCloseTo(0.6, 8);
    expect(msftItem.weight).toBeCloseTo(0.4, 8);
    expect(aaplItem.monthlyAmount).toBe(300);
    expect(msftItem.monthlyAmount).toBe(200);
  });

  it('accepts zero amount for one ticker when another has positive amount', async () => {
    const closes = Array.from({ length: 72 }, (_, i) => 100 + i * 1.5);
    const fetchMock = async (url) => {
      if (String(url).includes('AAPL')) {
        return { ok: true, json: async () => buildYahooPayload('AAPL', closes) };
      }
      return { ok: true, json: async () => buildYahooPayload('MSFT', closes) };
    };

    const result = await simulateInvestment({
      tickers: ['AAPL', 'MSFT'],
      tickerInvestments: { AAPL: 500, MSFT: 0 },
      horizonMonths: 12
    }, { fetchImpl: fetchMock });

    expect(result.data.totalMonthlyInvestment).toBe(500);
    const msftItem = result.data.perTicker.find(p => p.ticker === 'MSFT');
    expect(msftItem.monthlyAmount).toBe(0);
    expect(msftItem.tickerTotalInvested).toBe(0);
  });

  it('rejects when total monthly investment is zero', async () => {
    const closes = Array.from({ length: 72 }, (_, i) => 100 + i * 1.5);
    const fetchMock = async () => ({
      ok: true,
      json: async () => buildYahooPayload('AAPL', closes)
    });

    await expect(simulateInvestment({
      tickers: ['AAPL'],
      tickerInvestments: { AAPL: 0 },
      horizonMonths: 12
    }, { fetchImpl: fetchMock })).rejects.toThrow('Total monthly investment must be greater than 0');
  });

  it('rejects negative ticker amount', async () => {
    const closes = Array.from({ length: 72 }, (_, i) => 100 + i * 1.5);
    const fetchMock = async () => ({
      ok: true,
      json: async () => buildYahooPayload('AAPL', closes)
    });

    await expect(simulateInvestment({
      tickers: ['AAPL'],
      tickerInvestments: { AAPL: -50 },
      horizonMonths: 12
    }, { fetchImpl: fetchMock })).rejects.toThrow('non-negative');
  });

  it('rejects when a ticker is missing from tickerInvestments', async () => {
    const closes = Array.from({ length: 72 }, (_, i) => 100 + i * 1.5);
    const fetchMock = async () => ({
      ok: true,
      json: async () => buildYahooPayload('AAPL', closes)
    });

    await expect(simulateInvestment({
      tickers: ['AAPL'],
      tickerInvestments: {},
      horizonMonths: 12
    }, { fetchImpl: fetchMock })).rejects.toThrow('tickerInvestments must contain an entry for ticker');
  });

  it('per-ticker scenarios are populated in response', async () => {
    const closes = Array.from({ length: 72 }, (_, i) => 100 + i * 1.5);
    const fetchMock = async () => ({
      ok: true,
      json: async () => buildYahooPayload('AAPL', closes)
    });

    const result = await simulateInvestment({
      tickers: ['AAPL'],
      tickerInvestments: { AAPL: 200 },
      horizonMonths: 24
    }, { fetchImpl: fetchMock });

    const item = result.data.perTicker[0];
    expect(item.scenarios).toBeDefined();
    expect(item.scenarios.expected.finalValue).toBeGreaterThan(0);
    expect(item.scenarios.optimistic.finalValue).toBeGreaterThan(0);
    expect(item.scenarios.pessimistic.finalValue).toBeGreaterThan(0);
  });
});
