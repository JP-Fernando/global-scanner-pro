import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RESULTS_FILTER,
  filterAndSortResults,
  getViewScore,
  matchesResultsFilter,
} from '../../../shared/frontend/results-filter.js';

const results = [
  { ticker: 'AAPL', name: 'Apple Inc', scoreTotal: 70, scoreShort: 40, signal: { key: 'buy' }, vRatio: 1.2 },
  { ticker: 'MSFT', name: 'Microsoft', scoreTotal: 85, scoreShort: 90, signal: { key: 'strong_buy' }, vRatio: 2.5 },
  { ticker: 'TEF.MC', name: 'Telefonica', scoreTotal: 40, signal: { key: 'sell' }, vRatio: 3 },
];

describe('results-filter shared helpers', () => {
  it('falls back to scoreTotal when the view score is missing', () => {
    expect(getViewScore(results[2], 'scoreShort')).toBe(40);
    expect(getViewScore({}, 'scoreShort')).toBe(0);
  });

  it('returns every result sorted by score with the default filter', () => {
    const filtered = filterAndSortResults(results, DEFAULT_RESULTS_FILTER);
    expect(filtered.map(r => r.ticker)).toEqual(['MSFT', 'AAPL', 'TEF.MC']);
  });

  it('does not mutate the input array', () => {
    const copy = [...results];
    filterAndSortResults(results, DEFAULT_RESULTS_FILTER);
    expect(results).toEqual(copy);
  });

  it('matches query against ticker or name, case-insensitively', () => {
    const byName = filterAndSortResults(results, { ...DEFAULT_RESULTS_FILTER, query: 'telef' });
    expect(byName.map(r => r.ticker)).toEqual(['TEF.MC']);
    const byTicker = filterAndSortResults(results, { ...DEFAULT_RESULTS_FILTER, query: ' aapl ' });
    expect(byTicker.map(r => r.ticker)).toEqual(['AAPL']);
  });

  it('filters by signal, min score and high volume', () => {
    expect(matchesResultsFilter(results[0], { ...DEFAULT_RESULTS_FILTER, signal: 'sell' }, 'scoreTotal')).toBe(false);
    expect(matchesResultsFilter(results[0], { ...DEFAULT_RESULTS_FILTER, minScore: 71 }, 'scoreTotal')).toBe(false);
    const highVolume = filterAndSortResults(results, { ...DEFAULT_RESULTS_FILTER, volume: 'high' });
    expect(highVolume.map(r => r.ticker)).toEqual(['MSFT', 'TEF.MC']);
  });

  it('applies min score and sorting against the active view', () => {
    const filtered = filterAndSortResults(results, { ...DEFAULT_RESULTS_FILTER, minScore: 41 }, 'scoreShort');
    expect(filtered.map(r => r.ticker)).toEqual(['MSFT']);
  });
});
