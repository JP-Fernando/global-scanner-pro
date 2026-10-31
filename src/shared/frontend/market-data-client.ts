/**
 * Price history access via the backend Yahoo proxy, shared by the desktop and
 * Android frontends. Parsing is pure; fetching takes an injectable fetch + cache.
 */

import { API_BASE_URL } from '../../config/api-base.js';

export type PriceBar = {
  date: string;
  close: number;
  volume: number;
  high: number;
  low: number;
};

type FetchLike = (url: string) => Promise<{ json(): Promise<any> }>;
type CacheLike = Pick<Map<string, PriceBar[]>, 'get' | 'has' | 'set'>;

export const DEFAULT_HISTORY_YEARS = 4;

export function resolveFullSymbol(ticker: string, suffix: string): string {
  return ticker.includes('.') ? ticker : `${ticker}${suffix}`;
}

export function buildYahooHistoryUrl(
  symbol: string,
  nowMs: number = Date.now(),
  years: number = DEFAULT_HISTORY_YEARS,
  baseUrl: string = API_BASE_URL
): string {
  const from = Math.floor((nowMs / 1000) - (years * 365.25 * 86400));
  const to = Math.floor(nowMs / 1000);
  return `${baseUrl}/api/yahoo?symbol=${symbol}&from=${from}&to=${to}`;
}

/**
 * Converts a Yahoo chart payload into daily bars using adjusted close.
 * Returns null when the payload has no chart result.
 */
export function parseYahooChart(json: any): PriceBar[] | null {
  if (!json?.chart?.result?.[0]) return null;

  const r = json.chart.result[0];
  const q = r.indicators.quote[0];
  const adj = r.indicators.adjclose?.[0]?.adjclose || q.close;

  return r.timestamp.map((t: any, i: any) => {
    if (adj[i] == null || isNaN(adj[i])) return null;

    return {
      date: new Date(t * 1000).toISOString().split('T')[0], // YYYY-MM-DD
      close: adj[i],
      volume: q.volume?.[i] ?? 0,
      high: q.high?.[i] ?? adj[i],
      low: q.low?.[i] ?? adj[i]
    };
  }).filter(Boolean);
}

/**
 * Fetches price history for `ticker` (+ market suffix). Successful parses are cached
 * by full symbol; missing results return [] uncached; network/parse errors throw.
 */
export async function fetchPriceHistory(
  ticker: string,
  suffix: string,
  { cache, fetchImpl = (url: string) => fetch(url) }: { cache?: CacheLike; fetchImpl?: FetchLike } = {}
): Promise<PriceBar[]> {
  const fullSymbol = resolveFullSymbol(ticker, suffix);
  if (cache?.has(fullSymbol)) {
    return cache.get(fullSymbol)!;
  }

  const res = await fetchImpl(buildYahooHistoryUrl(fullSymbol));
  const series = parseYahooChart(await res.json());
  if (!series) return [];

  cache?.set(fullSymbol, series);
  return series;
}
