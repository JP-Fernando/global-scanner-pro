import { describe, expect, it } from 'vitest';
import { canonicalSelection, getAssetSymbol, getSimulatorSelectionKey } from '../../../shared/frontend/asset-identity.js';
import { RequestCoordinator } from '../../../shared/frontend/request-coordinator.js';
import { buildSimulationRequest, isSimulationProjection } from '../../../shared/frontend/simulator-service.js';
import { buildSimulationResponse } from '../../e2e/fixtures/simulation-responses.js';
import { buildSimulationReviewModel } from '../../../shared/frontend/offline-review-restore.js';
import { canBuildPortfolio } from '../../../shared/frontend/portfolio-builder.js';

describe('dual frontend contracts', () => {
  const results = [{ ticker: 'SAN', yahooSymbol: 'SAN.MC' }, { ticker: 'SAN', marketSuffix: '' }];

  it('keeps instruments with identical display tickers separate in requests and restore', () => {
    expect(results.map(getAssetSymbol)).toEqual(['SAN.MC', 'SAN']);
    const request = buildSimulationRequest(['SAN.MC', 'SAN'], { 'SAN.MC': 75, SAN: 125 }, 24, results, 'symbol');
    expect(request.tickers).toEqual(['SAN.MC', 'SAN']);
    expect(request.tickerInvestments).toEqual({ 'SAN.MC': 75, SAN: 125 });
    const restored = buildSimulationReviewModel({ request, response: {}, timestamp: 123 }, results, 'symbol');
    expect(restored.selection).toEqual(request.tickers);
    expect(restored.tickerInvestments).toEqual(request.tickerInvestments);
    // Existing desktop display-ticker callers retain their previous resolution behaviour.
    expect(buildSimulationRequest(['SAN'], { SAN: 50 }, 12, results).tickers).toEqual(['SAN.MC']);
    const desktop = buildSimulationReviewModel({ request, response: {} }, results);
    expect(desktop.selection).toEqual(['SAN.MC', 'SAN']);
    expect(results.map(item => getSimulatorSelectionKey(item, results))).toEqual(['SAN.MC', 'SAN']);
    expect(buildSimulationRequest(desktop.selection, desktop.tickerInvestments, 24, results, 'selection'))
      .toEqual(request);
  });

  it('normalises and deduplicates canonical selections without merging markets', () => {
    expect(canonicalSelection([' san.mc ', 'SAN.MC', 'SAN', null, 'A', 'B', 'C']))
      .toEqual(['SAN.MC', 'SAN', 'A', 'B']);
    expect(getAssetSymbol({ ticker: 'san', marketSuffix: '.mc' })).toBe('SAN.MC');
    expect(getAssetSymbol({ ticker: 'BMW.DE', marketSuffix: '.F' })).toBe('BMW.DE');
    expect(getAssetSymbol({})).toBe('');
    expect(canonicalSelection(null)).toEqual([]);
  });

  it('permits only current asynchronous work to commit results, including explicit invalidation', async () => {
    const coordinator = new RequestCoordinator();
    let release;
    const delayed = new Promise(resolve => { release = resolve; });
    const committed = [];
    const old = coordinator.start();
    const task = delayed.then(value => { if (coordinator.isCurrent(old)) committed.push(value); });
    const current = coordinator.start();
    if (coordinator.isCurrent(current)) committed.push('new');
    release('old');
    await task;
    expect(committed).toEqual(['new']);
    coordinator.invalidate();
    expect(coordinator.isCurrent(current)).toBe(false);
  });

  it('shares portfolio eligibility across presentations', () => {
    const full = { pricesWithDates: Array.from({ length: 30 }, () => ({ close: 100 })) };
    expect(canBuildPortfolio([full, full, full])).toBe(true);
    expect(canBuildPortfolio([full, full, { pricesWithDates: [] }])).toBe(false);
    expect(canBuildPortfolio([])).toBe(false);
  });

  it('rejects incomplete cached/API projections before they reach a renderer', () => {
    const valid = buildSimulationResponse({ tickers: ['SAN.MC'], tickerInvestments: { 'SAN.MC': 100 }, horizonMonths: 12 });
    expect(isSimulationProjection(valid)).toBe(true);
    for (const payload of [null, {}, { ...valid, perTicker: {} },
      { ...valid, monthlyProjection: [null] }, { ...valid, scenarios: {} }]) {
      expect(isSimulationProjection(payload)).toBe(false);
    }
  });
});
