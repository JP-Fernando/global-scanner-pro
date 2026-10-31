/**
 * Scan result filtering/sorting shared by the desktop table and the Android card list.
 * Callers read filter values from their own controls and pass them in.
 */

export type ResultsFilterState = {
  query: string;
  signal: string;
  minScore: number;
  volume: string;
};

export const DEFAULT_RESULTS_FILTER: ResultsFilterState = {
  query: '',
  signal: 'all',
  minScore: 0,
  volume: 'all'
};

export const HIGH_VOLUME_RATIO = 2;

export function getViewScore(result: any, viewKey: string): number {
  return Number(result?.[viewKey] ?? result?.scoreTotal ?? 0);
}

export function matchesResultsFilter(
  result: any,
  filter: ResultsFilterState,
  viewKey: string
): boolean {
  const query = filter.query.trim().toLowerCase();
  const matchesQuery = !query
    || result.ticker?.toLowerCase().includes(query)
    || result.name?.toLowerCase().includes(query);
  const matchesSignal = filter.signal === 'all' || result.signal?.key === filter.signal;
  const matchesScore = getViewScore(result, viewKey) >= filter.minScore;
  const matchesVolume = filter.volume === 'all' || Number(result.vRatio || 0) >= HIGH_VOLUME_RATIO;

  return Boolean(matchesQuery && matchesSignal && matchesScore && matchesVolume);
}

/** Returns a new array of matching results, sorted by the active view score (desc). */
export function filterAndSortResults(
  results: any[],
  filter: ResultsFilterState,
  viewKey = 'scoreTotal'
): any[] {
  return results
    .filter(result => matchesResultsFilter(result, filter, viewKey))
    .sort((a, b) => getViewScore(b, viewKey) - getViewScore(a, viewKey));
}
