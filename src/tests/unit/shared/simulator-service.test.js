import { describe, expect, it, vi } from 'vitest';

import {
  buildSimulationRequest,
  getHorizonMonths,
  getTotalMonthlyInvestment,
  isSimulationInputValid,
  requestSimulation,
  resolveSimulatorSymbol,
} from '../../../shared/frontend/simulator-service.js';

const horizon = { preset: 60, useCustom: false, customValue: 18, customUnit: 'months' };

describe('simulator-service shared helpers', () => {
  it('computes the horizon from preset or custom input', () => {
    expect(getHorizonMonths(horizon)).toBe(60);
    expect(getHorizonMonths({ ...horizon, useCustom: true })).toBe(18);
    expect(getHorizonMonths({ ...horizon, useCustom: true, customValue: 1.5, customUnit: 'years' })).toBe(18);
    expect(getHorizonMonths({ ...horizon, useCustom: true, customValue: 0 })).toBe(0);
    expect(getHorizonMonths({ ...horizon, useCustom: true, customValue: NaN })).toBe(0);
  });

  it('sums monthly investments, treating missing tickers as 0', () => {
    expect(getTotalMonthlyInvestment(['AAPL', 'MSFT'], { AAPL: 100 })).toBe(100);
  });

  it('validates selection, amounts and horizon', () => {
    expect(isSimulationInputValid(['AAPL'], { AAPL: 100 }, 12)).toBe(true);
    expect(isSimulationInputValid([], {}, 12)).toBe(false);
    expect(isSimulationInputValid(['AAPL'], { AAPL: 0 }, 12)).toBe(false);
    expect(isSimulationInputValid(['AAPL', 'MSFT'], { AAPL: 200, MSFT: -50 }, 12)).toBe(false);
    expect(isSimulationInputValid(['AAPL'], { AAPL: 100 }, 0)).toBe(false);
  });

  it('resolves Yahoo symbols from scan results', () => {
    const results = [
      { ticker: 'SAN', marketSuffix: '.MC' },
      { ticker: 'BMW', yahooSymbol: 'BMW.DE', marketSuffix: '.F' },
      { ticker: 'AAPL', marketSuffix: '' },
    ];
    expect(resolveSimulatorSymbol('SAN', results)).toBe('SAN.MC');
    expect(resolveSimulatorSymbol('BMW', results)).toBe('BMW.DE');
    expect(resolveSimulatorSymbol('AAPL', results)).toBe('AAPL');
    expect(resolveSimulatorSymbol('UNKNOWN', results)).toBe('UNKNOWN');
  });

  it('builds a request keyed by resolved symbols', () => {
    const request = buildSimulationRequest(
      ['SAN', 'AAPL'],
      { SAN: 50, AAPL: 150 },
      36,
      [{ ticker: 'SAN', marketSuffix: '.MC' }]
    );
    expect(request).toEqual({
      tickers: ['SAN.MC', 'AAPL'],
      tickerInvestments: { 'SAN.MC': 50, AAPL: 150 },
      horizonMonths: 36,
    });
  });

  it('posts the request and returns the payload', async () => {
    const payload = { totalInvested: 1000 };
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) });
    const request = { tickers: ['AAPL'], tickerInvestments: { AAPL: 100 }, horizonMonths: 12 };

    await expect(requestSimulation(request, fetchImpl, 'https://api.test')).resolves.toBe(payload);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.test/api/v1/simulate');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(request);
  });

  it('throws the API error message on failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Bad ticker' }) });
    await expect(requestSimulation({}, fetchImpl, '')).rejects.toThrow('Bad ticker');

    const noMessage = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    await expect(requestSimulation({}, noMessage, '')).rejects.toThrow('Simulation API request failed');
  });
});
