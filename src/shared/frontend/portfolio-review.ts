/** Local review never fetches quotes or manufactures historical observations. */
import { dbStore } from '../../storage/indexed-db-store.js';
import { performanceTracker } from '../../portfolio/performance-tracker.js';
import { portfolioManager } from '../../portfolio/portfolio-manager.js';
import type { PortfolioPriceReview } from '../../types/index.js';

export async function loadPortfolioReview(id: string, store = dbStore, tracker = performanceTracker) {
  const portfolio = await store.getPortfolio(id);
  if (!portfolio) throw new Error('portfolio_not_found');
  const snapshots = await store.getSnapshots(id);
  const latest = snapshots.at(-1);
  const prices: Record<string, number> = Object.fromEntries(
    (latest?.positions || []).map((position: any) => [position.ticker, position.price]));
  const basis = JSON.stringify({ positions: portfolio.positions, snapshot: latest || null });
  const quoteReview = portfolio.price_review as PortfolioPriceReview | undefined;
  const useReview = quoteReview && quoteReview.basis === basis
    && (!latest || quoteReview.refreshed_at >= latest.date);
  if (useReview) Object.assign(prices, quoteReview.prices);
  const equityCurve = snapshots.map((snapshot: any) => ({ date: snapshot.date,
    value: snapshot.total_value, return_pct: snapshot.cumulative_return,
    daily_return_pct: snapshot.daily_return }));
  return { portfolio, pnl: await tracker.calculatePnL(portfolio, prices), equityCurve,
    metrics: tracker.calculatePerformanceMetrics(equityCurve),
    asOf: useReview ? quoteReview.refreshed_at : latest?.date || portfolio.created_at,
    missingSymbols: useReview ? quoteReview.missing_symbols : [], prices, basis };
}

/** Explicit refresh bypasses quote caches. Missing prices retain the saved valuation. */
export async function refreshPortfolioReview(id: string, store = dbStore, tracker = performanceTracker,
  manager = portfolioManager) {
  const review = await loadPortfolioReview(id, store, tracker);
  const tickers = review.portfolio.positions.map((position: any) => position.ticker);
  const fetched = await tracker.loadCurrentPrices(tickers, true);
  const valid = Object.fromEntries(Object.entries(fetched).filter(([, price]) =>
    typeof price === 'number' && Number.isFinite(price) && price > 0)) as Record<string, number>;
  if (!Object.keys(valid).length) throw new Error('prices_unavailable');
  const price_review: PortfolioPriceReview = { basis: review.basis, prices: { ...review.prices, ...valid },
    refreshed_at: new Date().toISOString(), missing_symbols: tickers.filter((ticker: string) => !(ticker in valid)) };
  await manager.updatePortfolio(id, { price_review });
  return loadPortfolioReview(id, store, tracker);
}

export type PortfolioReview = Awaited<ReturnType<typeof loadPortfolioReview>>;
