/** Cache readers and restore models shared by both frontends. No UI state or rendering. */
import { dbStore } from '../../storage/indexed-db-store.js';
import { MAX_SIMULATOR_TICKERS, normalizeSimulatorTicker } from './simulator-selection.js';
import type { HorizonInput } from './simulator-service.js';
import { getAssetSymbol, getSimulatorSelectionKey } from './asset-identity.js';

type CachedResult = Record<string, unknown>;

export type ScanReviewModel = {
  results: CachedResult[];
  market: Record<string, unknown> | null;
  strategy: string | null;
  timestamp: number | null;
};

export type SimulationReviewModel = {
  selection: string[];
  tickerInvestments: Record<string, number>;
  /** A patch preserves current defaults when a legacy record has no valid horizon. */
  horizon: Partial<HorizonInput>;
  response: Record<string, unknown>;
  timestamp: number | null;
};

export interface OfflineReviewReader {
  getLastScan(): Promise<unknown>;
  getLastSimulation(): Promise<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readTimestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function buildScanReviewModel(saved: unknown): ScanReviewModel | null {
  if (!isRecord(saved) || !Array.isArray(saved.results) || !saved.results.length
    || !saved.results.every(isRecord)) return null;

  return {
    results: saved.results,
    market: isRecord(saved.market) ? saved.market : null,
    strategy: typeof saved.strategy === 'string' ? saved.strategy : null,
    timestamp: readTimestamp(saved.timestamp)
  };
}

function displayTickerForSymbol(symbol: string, results: CachedResult[]): string {
  const normalized = normalizeSimulatorTicker(symbol);
  const match = results.find(item => getAssetSymbol(item) === normalized)
    || results.find(item => normalizeSimulatorTicker(item.ticker) === normalized);
  return match ? getSimulatorSelectionKey(match, results) : normalized;
}

function restoreHorizon(value: unknown): Partial<HorizonInput> {
  const months = Number(value);
  if ([12, 36, 60, 120].includes(months)) return { useCustom: false, preset: months };
  if (!Number.isFinite(months) || months <= 0) return {};
  return {
    useCustom: true,
    customValue: Math.max(1, Math.round(months % 12 === 0 ? months / 12 : months)),
    customUnit: months % 12 === 0 ? 'years' : 'months'
  };
}

export function buildSimulationReviewModel(
  saved: unknown,
  results: CachedResult[],
  identity: 'display' | 'symbol' = 'display'
): SimulationReviewModel | null {
  if (!isRecord(saved) || !isRecord(saved.response) || !isRecord(saved.request)
    || !Array.isArray(saved.request.tickers)) return null;

  const tickers = saved.request.tickers.filter((ticker): ticker is string =>
    typeof ticker === 'string' && Boolean(ticker.trim()));
  const resolve = (ticker: string) => identity === 'symbol'
    ? normalizeSimulatorTicker(ticker) : displayTickerForSymbol(ticker, results);
  const selection = tickers.map(resolve)
    .filter(Boolean).slice(0, MAX_SIMULATOR_TICKERS);
  if (!selection.length) return null;

  const storedInvestments = isRecord(saved.request.tickerInvestments)
    ? saved.request.tickerInvestments : {};
  const tickerInvestments: Record<string, number> = {};
  for (const ticker of tickers) {
    const displayTicker = resolve(ticker);
    if (!displayTicker) continue;
    const amount = storedInvestments[ticker];
    tickerInvestments[displayTicker] = typeof amount === 'number' && Number.isFinite(amount)
      ? amount : 0;
  }

  return {
    selection,
    tickerInvestments,
    horizon: restoreHorizon(saved.request.horizonMonths),
    response: saved.response,
    timestamp: readTimestamp(saved.timestamp)
  };
}

/** Storage failures propagate; the PWA caller already handles unavailable IndexedDB. */
export async function loadLastScanReview(
  store: Pick<OfflineReviewReader, 'getLastScan'> = dbStore
): Promise<ScanReviewModel | null> {
  return buildScanReviewModel(await store.getLastScan());
}

export async function loadLastSimulationReview(
  results: CachedResult[],
  store: Pick<OfflineReviewReader, 'getLastSimulation'> = dbStore,
  identity: 'display' | 'symbol' = 'display'
): Promise<SimulationReviewModel | null> {
  return buildSimulationReviewModel(await store.getLastSimulation(), results, identity);
}
