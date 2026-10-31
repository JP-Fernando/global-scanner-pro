/**
 * Simulator request shaping and API access shared by the desktop and Android frontends.
 * Holds no UI state: callers own selection/inputs and pass them in.
 */

import { API_BASE_URL } from '../../config/api-base.js';
import { buildSelectionKeyIndex } from './asset-identity.js';

export type HorizonInput = {
  preset: number;
  useCustom: boolean;
  customValue: number;
  customUnit: 'months' | 'years';
};

export type SimulationRequest = {
  tickers: string[];
  tickerInvestments: Record<string, number>;
  horizonMonths: number;
};

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** Check the projection fields consumed by either presentation before displaying cached data. */
export function isSimulationProjection(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Record<string, any>;
  return typeof value.currency === 'string' && /^[A-Z]{3}$/.test(value.currency)
    && Number.isFinite(value.totalInvested) && Number.isFinite(value.horizonMonths)
    && ['expected', 'optimistic', 'pessimistic'].every(key =>
      Number.isFinite(value.scenarios?.[key]?.finalValue) && Number.isFinite(value.scenarios?.[key]?.totalReturn))
    && Array.isArray(value.monthlyProjection) && value.monthlyProjection.every(point =>
      point && ['month', 'expected', 'optimistic', 'pessimistic'].every(key => Number.isFinite(point[key])))
    && Array.isArray(value.perTicker) && value.perTicker.every(item =>
      item && typeof item.ticker === 'string' && Number.isFinite(item.monthlyAmount));
}

export function getHorizonMonths(input: HorizonInput): number {
  if (!input.useCustom) return input.preset;

  const rawValue = Number(input.customValue);
  if (!Number.isFinite(rawValue) || rawValue < 1) return 0;
  if (input.customUnit === 'years') return Math.max(1, Math.round(rawValue * 12));
  return Math.max(1, Math.round(rawValue));
}

export function getTotalMonthlyInvestment(
  selection: string[],
  tickerInvestments: Record<string, number>
): number {
  return selection.reduce((sum, ticker) => sum + (tickerInvestments[ticker] ?? 0), 0);
}

export function isSimulationInputValid(
  selection: string[],
  tickerInvestments: Record<string, number>,
  horizonMonths: number
): boolean {
  const allNonNegative = selection.every(ticker => (tickerInvestments[ticker] ?? 0) >= 0);
  return (
    selection.length > 0 &&
    allNonNegative &&
    getTotalMonthlyInvestment(selection, tickerInvestments) > 0 &&
    horizonMonths >= 1
  );
}

/**
 * Maps a display ticker (as shown in the results) to the Yahoo symbol the backend
 * expects: explicit `yahooSymbol` first, then ticker + market suffix.
 */
export function resolveSimulatorSymbol(
  ticker: string, results: any[], identity: 'display' | 'symbol' | 'selection' = 'display'
): string {
  if (identity === 'symbol') return ticker.trim().toUpperCase();
  if (identity === 'selection') {
    const match = [...buildSelectionKeyIndex(results)].find(([, key]) => key === ticker);
    return match?.[0] || ticker;
  }
  const match = results.find((item: any) => String(item.ticker || '').toUpperCase() === ticker);
  if (!match) return ticker;

  const explicit = String(match.yahooSymbol || '').trim();
  if (explicit) return explicit;

  const marketSuffix = String(match.marketSuffix || '').trim();
  if (ticker.includes('.') || !marketSuffix) return ticker;
  return `${ticker}${marketSuffix}`;
}

export function buildSimulationRequest(
  selection: string[],
  tickerInvestments: Record<string, number>,
  horizonMonths: number,
  results: any[],
  identity: 'display' | 'symbol' | 'selection' = 'display'
): SimulationRequest {
  const tickers = selection.map(ticker => resolveSimulatorSymbol(ticker, results, identity));
  const investments: Record<string, number> = {};
  selection.forEach((displayTicker, i) => {
    investments[tickers[i]] = tickerInvestments[displayTicker] ?? 0;
  });

  return { tickers, tickerInvestments: investments, horizonMonths };
}

export async function requestSimulation(
  request: SimulationRequest,
  fetchImpl: FetchLike = (url, init) => fetch(url, init),
  baseUrl: string = API_BASE_URL
): Promise<any> {
  const response = await fetchImpl(`${baseUrl}/api/v1/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'Simulation API request failed');
  }
  return payload;
}
