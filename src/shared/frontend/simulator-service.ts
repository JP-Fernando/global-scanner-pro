/**
 * Simulator request shaping and API access shared by the desktop and Android frontends.
 * Holds no UI state: callers own selection/inputs and pass them in.
 */

import { API_BASE_URL } from '../../config/api-base.js';

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
export function resolveSimulatorSymbol(ticker: string, results: any[]): string {
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
  results: any[]
): SimulationRequest {
  const tickers = selection.map(ticker => resolveSimulatorSymbol(ticker, results));
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
