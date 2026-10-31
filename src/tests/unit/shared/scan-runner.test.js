import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectAnomalies } from '../../../data/anomalies.js';
import { runMarketScan } from '../../../shared/frontend/scan-runner.js';

vi.mock('../../../data/anomalies.js', () => ({ detectAnomalies: vi.fn() }));
beforeEach(() => {
  detectAnomalies.mockReset().mockReturnValue({ hasAnomalies: false });
});

const market = { file: 'bme.json', suffix: '.MC', name: 'Spain' };
const stock = ticker => ({ ticker, name: ticker, sector: 'Technology' });
const passed = ticker => ({ passed: true, ticker, scoreTotal: 80, volume: 100, vRatio: '2.5' });
const dependencies = () => ({
  loadUniverse: vi.fn().mockResolvedValue([stock('SAN')]),
  loadBenchmark: vi.fn().mockResolvedValue({ rocs: { roc6m: 1, roc12m: 2 }, volatility: 20 }),
  analyzeStock: vi.fn(async item => passed(item.ticker)),
  pause: vi.fn().mockResolvedValue(undefined),
  onProgress: vi.fn(), onPartialResults: vi.fn(),
});

describe('shared scan runner', () => {
  it('limits concurrency to five and emits detached partial arrays at the existing cadence', async () => {
    const deps = dependencies();
    deps.loadUniverse.mockResolvedValue(Array.from({ length: 12 }, (_, i) => stock(String(i))));
    let active = 0;
    let maxActive = 0;
    deps.analyzeStock.mockImplementation(async item => {
      maxActive = Math.max(maxActive, ++active);
      await Promise.resolve();
      active--;
      return passed(item.ticker);
    });
    const result = await runMarketScan([market], {}, deps);
    expect(maxActive).toBe(5);
    expect(result.analyzed).toBe(12);
    expect(result.filtered).toBe(0);
    expect(deps.pause.mock.calls).toEqual([[50], [50], [50]]);
    expect(deps.onPartialResults.mock.calls.map(([items]) => items.length)).toEqual([5, 12]);
    const progress = deps.onProgress.mock.calls.map(([event]) => event);
    expect(progress.filter(event => event.phase === 'analyzing').map(event => event.current))
      .toEqual([1, 6, 11]);
    expect(deps.onPartialResults.mock.calls[0][0]).not.toBe(result.results);
  });

  it('scans markets sequentially with separate benchmarks, suffixes and aggregate counts', async () => {
    const deps = dependencies();
    deps.loadUniverse.mockResolvedValueOnce([stock('SAN'), stock('FAIL')])
      .mockResolvedValueOnce([stock('BMW.DE')]);
    deps.loadBenchmark.mockResolvedValueOnce({ rocs: { roc6m: 1 }, volatility: 20 })
      .mockResolvedValueOnce({ rocs: { roc6m: 3 }, volatility: 30 });
    deps.analyzeStock.mockImplementation(async item =>
      item.ticker === 'FAIL' ? { passed: false } : passed(item.ticker));
    const result = await runMarketScan([market, { file: 'de.json', suffix: '.DE' }], {}, deps);
    expect(result.results.map(item => item.yahooSymbol)).toEqual(['SAN.MC', 'BMW.DE']);
    expect(result.results[0].vRatio).toBe(2.5);
    expect(result.results[0].sectorId).toBe(800);
    expect(result.analyzed).toBe(2);
    expect(result.filtered).toBe(1);
    expect(deps.analyzeStock.mock.calls.map(call => [call[1], call[3], call[4]]))
      .toEqual([['.MC', { roc6m: 1 }, 20], ['.MC', { roc6m: 1 }, 20], ['.DE', { roc6m: 3 }, 30]]);
    expect(deps.loadUniverse.mock.invocationCallOrder[1])
      .toBeGreaterThan(deps.analyzeStock.mock.invocationCallOrder[1]);
  });

  it('retains pre-penalty ordering, caps the anomaly penalty and merges warnings', async () => {
    const deps = dependencies();
    deps.loadUniverse.mockResolvedValue([stock('A'), stock('B')]);
    deps.analyzeStock.mockImplementation(async item => ({ ...passed(item.ticker),
      scoreTotal: item.ticker === 'B' ? 90 : 80, warnings: ['original'] }));
    detectAnomalies.mockImplementation(asset => asset.ticker === 'B' && asset.sectorId
      ? { hasAnomalies: true, metrics: { volumeZScore: 10 }, warnings: ['volume'] }
      : { hasAnomalies: false });
    const result = await runMarketScan([market], {}, deps);
    expect(result.results.map(item => [item.ticker, item.scoreTotal, item.anomalyPenalty]))
      .toEqual([['B', 75, 15], ['A', 80, 0]]);
    expect(result.results[0].warnings).toEqual(['original', 'volume']);
    expect(result.sectorStats['800'].count).toBe(2);
  });

  it('allows empty universes and absent benchmarks', async () => {
    const deps = dependencies();
    deps.loadBenchmark.mockResolvedValue(null);
    deps.loadUniverse.mockResolvedValue([]);
    const result = await runMarketScan([market], {}, deps);
    expect(result).toEqual({ results: [], sectorStats: {}, analyzed: 0, filtered: 0, benchmark: null });
    expect(deps.analyzeStock).not.toHaveBeenCalled();
  });

  it('propagates failures without starting later markets', async () => {
    const deps = dependencies();
    deps.loadUniverse.mockRejectedValue(new Error('universe unavailable'));
    await expect(runMarketScan([market, market], {}, deps)).rejects.toThrow('universe unavailable');
    expect(deps.loadBenchmark).toHaveBeenCalledTimes(1);
    expect(deps.onPartialResults).not.toHaveBeenCalled();
  });
});
