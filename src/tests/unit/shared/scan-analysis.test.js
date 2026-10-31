import { describe, expect, it, vi } from 'vitest';
import { analyzeStock, loadBenchmark } from '../../../shared/frontend/scan-analysis.js';
import { STRATEGY_PROFILES } from '../../../core/config.js';
import { parseYahooChart } from '../../../shared/frontend/market-data-client.js';
import { buildYahooChartResponse } from '../../e2e/fixtures/yahoo-responses.js';

const stock = { ticker: 'SAN', name: 'Santander' };
const history = () => parseYahooChart(buildYahooChartResponse('SAN.MC', 300));

describe('shared scan analysis', () => {
  it('scores the deterministic market fixture without browser state', async () => {
    const read = vi.fn().mockResolvedValue(history());
    const result = await analyzeStock(stock, '.MC', STRATEGY_PROFILES.balanced, null, null, read);
    expect(read).toHaveBeenCalledWith('SAN', '.MC');
    expect(result.passed).toBe(true);
    expect(result.pricesWithDates).toHaveLength(300);
    for (const score of ['scoreTotal', 'scoreShort', 'scoreMedium', 'scoreLong']) {
      expect(result[score]).toBeGreaterThanOrEqual(0);
      expect(result[score]).toBeLessThanOrEqual(100);
    }
    expect(result.signal.key).toBeTruthy();
  });

  it('filters insufficient history and isolates a failed asset download', async () => {
    const result = await analyzeStock(stock, '.MC', STRATEGY_PROFILES.balanced, null, null,
      vi.fn().mockResolvedValue([]));
    expect(result).toEqual({ passed: false, reason: 'Insufficient history' });
    const failure = await analyzeStock(stock, '.MC', STRATEGY_PROFILES.balanced, null, null,
      vi.fn().mockRejectedValue(new Error('offline')));
    expect(failure).toMatchObject({ passed: false, ticker: 'SAN', reason: 'offline' });
  });

  it('loads benchmark metrics and tolerates missing/short benchmark data', async () => {
    const read = vi.fn().mockResolvedValue(history());
    const result = await loadBenchmark('.MC', read);
    expect(result.symbol).toBe('^IBEX');
    expect(Number.isFinite(result.rocs.roc6m)).toBe(true);
    expect(Number.isFinite(result.volatility)).toBe(true);
    read.mockResolvedValue([]);
    expect(await loadBenchmark('.MC', read)).toBeNull();
    read.mockClear();
    expect(await loadBenchmark('unknown', read)).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });
});
