import fetch from 'node-fetch';
import { ExternalServiceError } from '../middleware/error-handler.js';
import { buildYahooCacheKey, getYahooCache, setYahooCache } from '../utils/cache.js';

export interface SimulationRequest {
  tickers: string[];
  tickerInvestments: Record<string, number>;
  horizonMonths: number;
}

export interface SimulationScenario {
  finalValue: number;
  cagr: number;
  totalReturn: number;
}

export interface MonthlyProjectionPoint {
  month: number;
  expected: number;
  optimistic: number;
  pessimistic: number;
}

export interface PerTickerStats {
  ticker: string;
  weight: number;
  monthlyAmount: number;
  tickerTotalInvested: number;
  historicalMonthlyReturn: number;
  historicalMonthlyVolatility: number;
  dataYears: number;
  scenarios: {
    expected: SimulationScenario;
    optimistic: SimulationScenario;
    pessimistic: SimulationScenario;
  };
}

export interface SimulationResponse {
  tickers: string[];
  totalMonthlyInvestment: number;
  horizonMonths: number;
  currency: string;
  totalInvested: number;
  scenarios: {
    expected: SimulationScenario;
    optimistic: SimulationScenario;
    pessimistic: SimulationScenario;
  };
  monthlyProjection: MonthlyProjectionPoint[];
  perTicker: PerTickerStats[];
}

export interface SimulationMeta {
  cacheHits: number;
  cacheMisses: number;
}

export interface SimulationResult {
  data: SimulationResponse;
  meta: SimulationMeta;
}

interface YahooSeriesResult {
  ticker: string;
  currency: string;
  closes: number[];
  fromCache: boolean;
}

interface ServiceOptions {
  fetchImpl?: typeof fetch;
}

const MAX_HISTORY_YEARS = 15;

export class SimulationInputError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function calculateMonthlyLogReturns(prices: number[]): number[] {
  if (prices.length < 2) return [];

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i += 1) {
    const prev = prices[i - 1];
    const current = prices[i];
    if (!Number.isFinite(prev) || !Number.isFinite(current) || prev <= 0 || current <= 0) {
      continue;
    }
    returns.push(Math.log(current / prev));
  }
  return returns;
}

export function calculateMean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateStdDev(values: number[]): number {
  if (!values.length) return 0;
  const mean = calculateMean(values);
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(Math.max(variance, 0));
}

export function calculateCagr(finalValue: number, totalInvested: number, horizonMonths: number): number {
  if (totalInvested <= 0 || finalValue <= 0 || horizonMonths <= 0) return 0;
  return ((finalValue / totalInvested) ** (12 / horizonMonths)) - 1;
}

function runScenario(monthlyInvestment: number, horizonMonths: number, monthlyRate: number): {
  finalValue: number;
  series: number[];
} {
  const series: number[] = [];
  let portfolioValue = 0;

  for (let month = 1; month <= horizonMonths; month += 1) {
    portfolioValue = (portfolioValue + monthlyInvestment) * (1 + monthlyRate);
    series.push(portfolioValue);
  }

  return {
    finalValue: portfolioValue,
    series
  };
}

async function fetchTickerMonthlySeries(
  ticker: string,
  fetchImpl: typeof fetch
): Promise<YahooSeriesResult> {
  const normalizedTicker = ticker.trim().toUpperCase();
  if (!normalizedTicker) {
    throw new SimulationInputError('Ticker cannot be empty');
  }

  const to = Math.floor(Date.now() / 1000);
  const from = Math.floor((Date.now() / 1000) - (MAX_HISTORY_YEARS * 365.25 * 24 * 60 * 60));
  const cacheKey = buildYahooCacheKey(`${normalizedTicker}:1mo`, from, to);
  const cached = await getYahooCache(cacheKey) as YahooSeriesResult | undefined;

  if (cached) {
    return {
      ...cached,
      fromCache: true
    };
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${normalizedTicker}?period1=${from}&period2=${to}&interval=1mo`;

  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new ExternalServiceError('Yahoo Finance', {
      status: response.status,
      ticker: normalizedTicker
    });
  }

  const payload = await response.json() as any;
  const result = payload?.chart?.result?.[0];
  if (!result) {
    throw new SimulationInputError(`No historical data available for ticker ${normalizedTicker}`);
  }

  const quote = result.indicators?.quote?.[0];
  const adjClose = result.indicators?.adjclose?.[0]?.adjclose as Array<number | null> | undefined;
  const close = (adjClose || quote?.close || []) as Array<number | null>;
  const closes = close.filter((value): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0
  );

  if (!closes.length) {
    throw new SimulationInputError(`Ticker ${normalizedTicker} returned no valid price data`);
  }

  const series: YahooSeriesResult = {
    ticker: normalizedTicker,
    currency: result.meta?.currency || 'USD',
    closes,
    fromCache: false
  };

  await setYahooCache(cacheKey, series);
  return series;
}

export async function simulateInvestment(
  request: SimulationRequest,
  options: ServiceOptions = {}
): Promise<SimulationResult> {
  const fetchImpl = options.fetchImpl || fetch;
  const tickers = (request.tickers || []).map(ticker => ticker.trim().toUpperCase()).filter(Boolean);

  if (!tickers.length || tickers.length > 4) {
    throw new SimulationInputError('tickers must contain between 1 and 4 symbols');
  }

  if (!Number.isInteger(request.horizonMonths) || request.horizonMonths < 1) {
    throw new SimulationInputError('horizonMonths must be a positive integer');
  }

  const uniqueTickers = [...new Set(tickers)];

  // Validate per-ticker investment amounts
  for (const ticker of uniqueTickers) {
    const amount = request.tickerInvestments[ticker];
    if (amount === undefined) {
      throw new SimulationInputError(`tickerInvestments must contain an entry for ticker ${ticker}`);
    }
    if (!Number.isFinite(amount) || amount < 0) {
      throw new SimulationInputError(`Monthly amount for ${ticker} must be a non-negative number`);
    }
  }
  const totalMonthlyInvestment = uniqueTickers.reduce(
    (sum, ticker) => sum + (request.tickerInvestments[ticker] ?? 0), 0
  );
  if (totalMonthlyInvestment <= 0) {
    throw new SimulationInputError('Total monthly investment must be greater than 0');
  }

  const seriesResults = await Promise.all(uniqueTickers.map(ticker => fetchTickerMonthlySeries(ticker, fetchImpl)));

  const cacheHits = seriesResults.filter(item => item.fromCache).length;
  const cacheMisses = seriesResults.length - cacheHits;

  const perTicker: PerTickerStats[] = [];

  // Per-ticker scenario series (indexed by ticker position)
  const expectedSeriesPerTicker: number[][] = [];
  const optimisticSeriesPerTicker: number[][] = [];
  const pessimisticSeriesPerTicker: number[][] = [];

  for (let i = 0; i < seriesResults.length; i += 1) {
    const tickerSeries = seriesResults[i];
    const tickerAmount = request.tickerInvestments[tickerSeries.ticker] ?? 0;

    if (tickerSeries.closes.length < 12) {
      throw new SimulationInputError(
        `Ticker ${tickerSeries.ticker} has insufficient monthly history (< 12 months)`
      );
    }

    const monthlyReturns = calculateMonthlyLogReturns(tickerSeries.closes);
    if (monthlyReturns.length < 1) {
      throw new SimulationInputError(`Ticker ${tickerSeries.ticker} does not have enough return observations`);
    }

    const mean = calculateMean(monthlyReturns);
    const stdDev = calculateStdDev(monthlyReturns);

    const tickerExpected = runScenario(tickerAmount, request.horizonMonths, mean);
    const tickerOptimistic = runScenario(tickerAmount, request.horizonMonths, mean + stdDev);
    const tickerPessimistic = runScenario(tickerAmount, request.horizonMonths, mean - stdDev);

    expectedSeriesPerTicker.push(tickerExpected.series);
    optimisticSeriesPerTicker.push(tickerOptimistic.series);
    pessimisticSeriesPerTicker.push(tickerPessimistic.series);

    const tickerTotalInvested = tickerAmount * request.horizonMonths;

    perTicker.push({
      ticker: tickerSeries.ticker,
      weight: totalMonthlyInvestment > 0 ? tickerAmount / totalMonthlyInvestment : 0,
      monthlyAmount: tickerAmount,
      tickerTotalInvested,
      historicalMonthlyReturn: mean,
      historicalMonthlyVolatility: stdDev,
      dataYears: Number((tickerSeries.closes.length / 12).toFixed(1)),
      scenarios: {
        expected: {
          finalValue: tickerExpected.finalValue,
          cagr: calculateCagr(tickerExpected.finalValue, tickerTotalInvested, request.horizonMonths),
          totalReturn: tickerTotalInvested > 0 ? (tickerExpected.finalValue / tickerTotalInvested) - 1 : 0
        },
        optimistic: {
          finalValue: tickerOptimistic.finalValue,
          cagr: calculateCagr(tickerOptimistic.finalValue, tickerTotalInvested, request.horizonMonths),
          totalReturn: tickerTotalInvested > 0 ? (tickerOptimistic.finalValue / tickerTotalInvested) - 1 : 0
        },
        pessimistic: {
          finalValue: tickerPessimistic.finalValue,
          cagr: calculateCagr(tickerPessimistic.finalValue, tickerTotalInvested, request.horizonMonths),
          totalReturn: tickerTotalInvested > 0 ? (tickerPessimistic.finalValue / tickerTotalInvested) - 1 : 0
        }
      }
    });
  }

  const totalInvested = totalMonthlyInvestment * request.horizonMonths;

  // Sum per-ticker series to get portfolio projection
  const monthlyProjection: MonthlyProjectionPoint[] = [];
  for (let month = 1; month <= request.horizonMonths; month += 1) {
    const idx = month - 1;
    monthlyProjection.push({
      month,
      expected: expectedSeriesPerTicker.reduce((sum, series) => sum + (series[idx] ?? 0), 0),
      optimistic: optimisticSeriesPerTicker.reduce((sum, series) => sum + (series[idx] ?? 0), 0),
      pessimistic: pessimisticSeriesPerTicker.reduce((sum, series) => sum + (series[idx] ?? 0), 0)
    });
  }

  const expectedFinal = expectedSeriesPerTicker.reduce(
    (sum, series) => sum + (series[request.horizonMonths - 1] ?? 0), 0
  );
  const optimisticFinal = optimisticSeriesPerTicker.reduce(
    (sum, series) => sum + (series[request.horizonMonths - 1] ?? 0), 0
  );
  const pessimisticFinal = pessimisticSeriesPerTicker.reduce(
    (sum, series) => sum + (series[request.horizonMonths - 1] ?? 0), 0
  );

  const response: SimulationResponse = {
    tickers: uniqueTickers,
    totalMonthlyInvestment,
    horizonMonths: request.horizonMonths,
    currency: seriesResults[0]?.currency || 'USD',
    totalInvested,
    scenarios: {
      expected: {
        finalValue: expectedFinal,
        cagr: calculateCagr(expectedFinal, totalInvested, request.horizonMonths),
        totalReturn: (expectedFinal / totalInvested) - 1
      },
      optimistic: {
        finalValue: optimisticFinal,
        cagr: calculateCagr(optimisticFinal, totalInvested, request.horizonMonths),
        totalReturn: (optimisticFinal / totalInvested) - 1
      },
      pessimistic: {
        finalValue: pessimisticFinal,
        cagr: calculateCagr(pessimisticFinal, totalInvested, request.horizonMonths),
        totalReturn: (pessimisticFinal / totalInvested) - 1
      }
    },
    monthlyProjection,
    perTicker
  };

  return {
    data: response,
    meta: {
      cacheHits,
      cacheMisses
    }
  };
}
