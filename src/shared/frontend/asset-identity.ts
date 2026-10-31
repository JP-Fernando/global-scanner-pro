import { normalizeSimulatorTicker, MAX_SIMULATOR_TICKERS } from './simulator-selection.js';

export type AssetIdentity = {
  ticker?: unknown;
  yahooSymbol?: unknown;
  marketSuffix?: unknown;
};

/** The same display ticker can represent different instruments on different markets. */
export function getAssetSymbol(asset: AssetIdentity): string {
  const explicit = normalizeSimulatorTicker(asset.yahooSymbol);
  if (explicit) return explicit;
  const ticker = normalizeSimulatorTicker(asset.ticker);
  if (!ticker) return '';
  return ticker.includes('.') ? ticker : ticker + normalizeSimulatorTicker(asset.marketSuffix);
}

export function canonicalSelection(selection: unknown): string[] {
  if (!Array.isArray(selection)) return [];
  return [...new Set(selection.filter(item => typeof item === 'string')
    .map(normalizeSimulatorTicker).filter(Boolean))].slice(0, MAX_SIMULATOR_TICKERS);
}

/** Retain desktop display keys where unique; qualify collisions with the Yahoo symbol. */
export function getSimulatorSelectionKey(asset: AssetIdentity, results: AssetIdentity[]): string {
  return buildSelectionKeyIndex(results).get(getAssetSymbol(asset)) || normalizeSimulatorTicker(asset.ticker);
}

/** Compute once per result batch/table render, rather than rescanning the universe per row. */
export function buildSelectionKeyIndex(results: AssetIdentity[]): Map<string, string> {
  const groups = new Map<string, Set<string>>();
  for (const asset of results) {
    const ticker = normalizeSimulatorTicker(asset.ticker);
    if (!groups.has(ticker)) groups.set(ticker, new Set());
    groups.get(ticker)!.add(getAssetSymbol(asset));
  }
  return new Map(results.map(asset => {
    const symbol = getAssetSymbol(asset);
    const ticker = normalizeSimulatorTicker(asset.ticker);
    return [symbol, groups.get(ticker)!.size > 1 ? symbol : ticker];
  }));
}
