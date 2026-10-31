import { describe, expect, it, vi } from 'vitest';
import { loadPortfolioReview, refreshPortfolioReview } from '../../../shared/frontend/portfolio-review.js';
import { PerformanceTracker } from '../../../portfolio/performance-tracker.js';

function fixture(snapshots = []) {
  const portfolio = { id: 'p1', name: 'Saved', created_at: '2026-10-01T10:00:00Z', initial_capital: 1000,
    positions: [{ ticker: 'SAN.MC', quantity: 10, entry_price: 10 }, { ticker: 'SAN', quantity: 2, entry_price: 50 }] };
  const store = { getPortfolio: vi.fn(async () => portfolio), getSnapshots: vi.fn(async () => snapshots) };
  const tracker = new PerformanceTracker();
  vi.spyOn(tracker, 'loadCurrentPrices').mockResolvedValue({ 'SAN.MC': 12 });
  const manager = { updatePortfolio: vi.fn(async (_id, values) => Object.assign(portfolio, values)) };
  return { portfolio, store, tracker, manager };
}

describe('local portfolio review', () => {
  it('uses entry prices without a snapshot and never fetches or creates historical metrics', async () => {
    const { store, tracker } = fixture();
    const review = await loadPortfolioReview('p1', store, tracker);
    expect(tracker.loadCurrentPrices).not.toHaveBeenCalled();
    expect(review.pnl.total_value).toBe(200);
    expect(review.pnl.total_pnl).toBe(0);
    expect(review.metrics).toBeNull();
    expect(review.asOf).toBe('2026-10-01T10:00:00Z');
  });
  it('uses the latest stored snapshot, including real historical metrics', async () => {
    const { store, tracker } = fixture([
      { date: '2026-10-01', total_value: 200, cumulative_return: 0, daily_return: 0, positions: [] },
      { date: '2026-10-02', total_value: 220, cumulative_return: 10, daily_return: 10,
        positions: [{ ticker: 'SAN.MC', price: 12 }, { ticker: 'SAN', price: 50 }] }
    ]);
    const review = await loadPortfolioReview('p1', store, tracker);
    expect(review.pnl.total_value).toBe(220);
    expect(review.metrics.num_periods).toBe(2);
    expect(tracker.loadCurrentPrices).not.toHaveBeenCalled();
  });
  it('refreshes explicitly and persists partial quotes without fabricating snapshots', async () => {
    const { store, tracker, manager, portfolio } = fixture();
    const review = await refreshPortfolioReview('p1', store, tracker, manager);
    expect(tracker.loadCurrentPrices).toHaveBeenCalledWith(['SAN.MC', 'SAN'], true);
    expect(manager.updatePortfolio).toHaveBeenCalledOnce();
    expect(portfolio.price_review.missing_symbols).toEqual(['SAN']);
    expect(review.pnl.total_value).toBe(220);
    expect(review.metrics).toBeNull();
    expect(review.missingSymbols).toEqual(['SAN']);
    expect(review.asOf).toBe(portfolio.price_review.refreshed_at);
    const reopened = await loadPortfolioReview('p1', store, tracker);
    expect(reopened.pnl).toMatchObject({ total_value: 220 });
  });
  it('retains saved prices when refresh returns no usable quotes or saving fails', async () => {
    const { store, tracker, manager, portfolio } = fixture();
    tracker.loadCurrentPrices.mockResolvedValue({ SAN: NaN, 'SAN.MC': -1 });
    await expect(refreshPortfolioReview('p1', store, tracker, manager)).rejects.toThrow('prices_unavailable');
    expect(manager.updatePortfolio).not.toHaveBeenCalled();
    tracker.loadCurrentPrices.mockResolvedValue({ SAN: 60 });
    manager.updatePortfolio.mockRejectedValue(new Error('quota'));
    await expect(refreshPortfolioReview('p1', store, tracker, manager)).rejects.toThrow('quota');
    expect(portfolio.price_review).toBeUndefined();
  });
  it('ignores a review older than a subsequent snapshot and reports missing portfolios', async () => {
    const { store, tracker, portfolio } = fixture([{ date: '2026-10-30', total_value: 240,
      daily_return: 0, cumulative_return: 0, positions: [{ ticker: 'SAN', price: 70 }] }]);
    portfolio.price_review = { prices: { SAN: 1 }, refreshed_at: '2026-10-01', missing_symbols: ['SAN'] };
    const review = await loadPortfolioReview('p1', store, tracker);
    expect(review.pnl.total_value).toBe(240);
    expect(review.missingSymbols).toEqual([]);
    store.getPortfolio.mockResolvedValue(null);
    await expect(loadPortfolioReview('absent', store, tracker)).rejects.toThrow('portfolio_not_found');
  });
});

it('invalidates cached review quotes after a same-day snapshot or position change', async () => {
  const snapshots = [{ date: '2026-10-01', total_value: 200, daily_return: 0,
    positions: [{ ticker: 'SAN.MC', price: 10 }, { ticker: 'SAN', price: 50 }] }];
  const { store, tracker, manager, portfolio } = fixture(snapshots);
  await refreshPortfolioReview('p1', store, tracker, manager);
  snapshots[0].positions[0].price = 15;
  expect((await loadPortfolioReview('p1', store, tracker)).pnl.total_value).toBe(250);
  await refreshPortfolioReview('p1', store, tracker, manager);
  portfolio.positions[0].quantity = 5;
  const review = await loadPortfolioReview('p1', store, tracker);
  expect(review.pnl.total_value).toBe(175);
  expect(review.asOf).toBe('2026-10-01');
});
