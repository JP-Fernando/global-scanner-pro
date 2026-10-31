import { describe, expect, it, vi } from 'vitest';
import {
  buildScanReviewModel,
  buildSimulationReviewModel,
  loadLastScanReview,
  loadLastSimulationReview,
} from '../../../shared/frontend/offline-review-restore.js';

const results = [{ ticker: 'SAN', yahooSymbol: 'SAN.MC', scoreTotal: 80 }];
const simulation = (horizonMonths = 60) => ({
  request: { tickers: ['SAN.MC', 'AAPL'], tickerInvestments: { 'SAN.MC': 75, AAPL: 125 }, horizonMonths },
  response: { totalInvested: 12000 },
  timestamp: 1700000000000,
});

describe('offline review restore models', () => {
  it('restores scan results and metadata without changing the stored payload', () => {
    const saved = {
      results, market: { file: 'universes/bme_universe.json', suffix: '.MC' },
      strategy: 'balanced', timestamp: 1700000000000,
    };
    const copy = globalThis.structuredClone(saved);
    expect(buildScanReviewModel(saved)).toEqual(saved);
    expect(saved).toEqual(copy);
  });

  it('rejects empty or malformed scan results and tolerates missing legacy metadata', () => {
    for (const saved of [null, {}, { results: [] }, { results: [null] }, { results: 'bad' }]) {
      expect(buildScanReviewModel(saved)).toBeNull();
    }
    expect(buildScanReviewModel({ results })).toEqual({
      results, market: null, strategy: null, timestamp: null,
    });
  });

  it('maps Yahoo symbols to display tickers and preserves unknown symbols and amounts', () => {
    const saved = simulation();
    const copy = globalThis.structuredClone(saved);
    expect(buildSimulationReviewModel(saved, results)).toEqual({
      selection: ['SAN', 'AAPL'], tickerInvestments: { SAN: 75, AAPL: 125 },
      horizon: { useCustom: false, preset: 60 }, response: saved.response, timestamp: saved.timestamp,
    });
    expect(saved).toEqual(copy);
    expect(buildSimulationReviewModel(saved, []).selection).toEqual(['SAN.MC', 'AAPL']);
  });

  it.each([12, 36, 60, 120])('restores the %i-month preset', months => {
    expect(buildSimulationReviewModel(simulation(months), results).horizon)
      .toEqual({ useCustom: false, preset: months });
  });

  it.each([[24, 2, 'years'], [18, 18, 'months'], [7.5, 8, 'months']])(
    'restores a custom %s-month horizon', (months, customValue, customUnit) => {
      expect(buildSimulationReviewModel(simulation(months), results).horizon)
        .toEqual({ useCustom: true, customValue, customUnit });
    }
  );

  it('leaves horizon defaults unchanged for invalid or absent legacy horizons', () => {
    for (const months of [null, 0, -1, 'bad', Infinity]) {
      expect(buildSimulationReviewModel(simulation(months), results).horizon).toEqual({});
    }
    const saved = simulation();
    delete saved.request.horizonMonths;
    expect(buildSimulationReviewModel(saved, results).horizon).toEqual({});
  });

  it('rejects missing simulations and unusable selections', () => {
    for (const saved of [null, {}, { response: {} }, { request: {}, response: {} },
      { request: { tickers: ['', null, 42] }, response: {} }]) {
      expect(buildSimulationReviewModel(saved, results)).toBeNull();
    }
  });

  it('clamps selection to four and defaults missing or invalid investments to zero', () => {
    const saved = simulation();
    saved.request.tickers = [' san.mc ', 'AAPL', 'B', 'C', 'D'];
    saved.request.tickerInvestments = { AAPL: NaN, B: 0 };
    expect(buildSimulationReviewModel(saved, results).selection).toEqual(['SAN', 'AAPL', 'B', 'C']);
    expect(buildSimulationReviewModel(saved, results).tickerInvestments)
      .toEqual({ SAN: 0, AAPL: 0, B: 0, C: 0, D: 0 });
  });

  it('reads through injected stores without fetching or writing data', async () => {
    const store = {
      getLastScan: vi.fn().mockResolvedValue({ results }),
      getLastSimulation: vi.fn().mockResolvedValue(simulation()),
    };
    expect((await loadLastScanReview(store)).results).toEqual(results);
    expect((await loadLastSimulationReview(results, store)).selection).toEqual(['SAN', 'AAPL']);
    expect(store.getLastScan).toHaveBeenCalledTimes(1);
    expect(store.getLastSimulation).toHaveBeenCalledTimes(1);
  });

  it('propagates storage failures to the caller', async () => {
    const store = {
      getLastScan: vi.fn().mockRejectedValue(new Error('blocked')),
      getLastSimulation: vi.fn().mockRejectedValue(new Error('blocked')),
    };
    await expect(loadLastScanReview(store)).rejects.toThrow('blocked');
    await expect(loadLastSimulationReview(results, store)).rejects.toThrow('blocked');
  });
});
