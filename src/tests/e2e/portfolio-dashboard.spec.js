/** Desktop dashboard regressions exercise a saved portfolio, not placeholder markup. */
import { test, expect } from '@playwright/test';
import { setupWithCompletedScan } from './helpers/test-utils.js';
import { PortfolioPage } from './pages/PortfolioPage.js';
import { DashboardPage } from './pages/DashboardPage.js';

async function saveBuiltPortfolio(page) {
  await page.locator('#savePortfolioBtn').click();
  await expect(page.locator('#portfolioSelector option')).toHaveCount(2);
  await expect(page.locator('#portfolioSelector')).not.toHaveValue('');
  await expect(page.locator('#positionsTableBody tr')).toHaveCount(5);
  await expect(page.locator('#totalValueCard')).toContainText('$');
  return page.locator('#portfolioSelector').inputValue();
}

async function chartState(page) {
  return page.evaluate(() => {
    const chart = window.Chart?.getChart('portfolioChart');
    return chart ? { id: chart.id, type: chart.config.type, datasets: chart.data.datasets.length,
      points: chart.data.labels.length } : null;
  });
}

test.describe('Portfolio dashboard', () => {
  test.use({ viewport: { width: 1400, height: 1000 } });
  let dashboard;
  let errors;

  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => {
      if (/error/i.test(dialog.message())) errors.push(dialog.message());
      await dialog.accept(dialog.type() === 'prompt' ? 'Desktop regression' : undefined);
    });
    await setupWithCompletedScan(page);
    const portfolio = new PortfolioPage(page);
    dashboard = new DashboardPage(page);
    await portfolio.configure({ method: 'equal_weight', topN: 5 });
    await portfolio.buildPortfolio();
    await expect(dashboard.dashboardSection).toBeVisible();
  });

  test.afterEach(() => { expect(errors).toEqual([]); });

  test('saving loads actual positions and populated summary cards', async ({ page }) => {
    const id = await saveBuiltPortfolio(page);
    const saved = await page.evaluate(portfolioId => new Promise((resolve, reject) => {
      const open = window.indexedDB.open('GlobalQuantScannerDB');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const transaction = db.transaction('portfolios', 'readonly');
        const read = transaction.objectStore('portfolios').get(portfolioId);
        read.onsuccess = () => resolve(read.result);
        read.onerror = () => reject(read.error);
        transaction.oncomplete = () => db.close();
      };
    }), id);
    expect(saved.initial_capital).toBe(20000);
    expect(saved.allocation_method).toBe('equal_weight');
    expect(saved.positions).toHaveLength(5);
    expect(saved.positions.every(position => position.ticker.endsWith('.MC'))).toBe(true);
    expect(saved.positions.every(position => Number.isFinite(position.entry_price)
      && position.quantity > 0)).toBe(true);
    await expect(dashboard.portfolioSelector.locator('option:checked')).toContainText('Desktop regression');
    await expect(dashboard.deletePortfolioBtn).toBeVisible();
    await expect(dashboard.positionsTable.locator('tr')).toHaveCount(5);
    for (const row of await dashboard.positionsTable.locator('tr').all()) {
      await expect(row.locator('td')).toHaveCount(9);
    }
    for (const id of ['totalValueCard', 'totalReturnCard']) {
      await expect(page.locator(`#${id}`)).not.toHaveText('--');
      await expect(page.locator(`#${id}`)).not.toContainText(/NaN|undefined/);
    }
    // A newly created portfolio has one snapshot: historical ratios are unavailable.
    await expect(dashboard.sharpeRatioCard).toHaveText('--');
    const cards = await page.locator('#portfolioSummary .risk-card').evaluateAll(items =>
      items.map(item => item.getBoundingClientRect().top));
    expect(new Set(cards).size).toBeLessThan(cards.length);
  });

  test('each chart tab activates and renders its corresponding chart', async ({ page }) => {
    await saveBuiltPortfolio(page);
    await expect.poll(() => chartState(page)).not.toBeNull();
    for (const [tab, type, datasets] of [
      ['equity', 'line', 1], ['drawdown', 'line', 1],
      ['benchmark', 'line', 2], ['allocation', 'doughnut', 1],
    ]) {
      const previousId = (await chartState(page)).id;
      await page.locator(`.chart-tab[data-tab="${tab}"]`).click();
      await expect(page.locator('.chart-tab.active')).toHaveAttribute('data-tab', tab);
      await expect.poll(async () => (await chartState(page))?.id).toBeGreaterThan(previousId);
      await expect.poll(() => chartState(page)).toMatchObject({ type, datasets });
      expect((await chartState(page)).points).toBeGreaterThan(0);
      await expect(dashboard.portfolioChart).toBeVisible();
    }
  });

  test('saved portfolio can be reselected and reopened after reload', async ({ page }) => {
    const id = await saveBuiltPortfolio(page);
    await dashboard.portfolioSelector.selectOption('');
    await expect(dashboard.totalValueCard).toHaveText('--');
    await dashboard.portfolioSelector.selectOption(id);
    await expect(dashboard.positionsTable.locator('tr')).toHaveCount(5);
    await expect(dashboard.totalValueCard).toContainText('$');

    await page.reload();
    await expect(dashboard.portfolioSelector.locator('option')).toHaveCount(2);
    await dashboard.portfolioSelector.selectOption(id);
    await expect(dashboard.positionsTable.locator('tr')).toHaveCount(5);
    await expect(dashboard.totalValueCard).toContainText('$');
  });

  test('refresh recalculates the loaded portfolio and preserves positions', async ({ page }) => {
    await saveBuiltPortfolio(page);
    const values = await dashboard.positionsTable.locator('tr').allTextContents();
    await expect.poll(() => chartState(page)).not.toBeNull();
    const chartId = (await chartState(page)).id;
    await dashboard.refreshBtn.click();
    await expect.poll(async () => (await chartState(page))?.id).toBeGreaterThan(chartId);
    await expect(dashboard.positionsTable.locator('tr')).toHaveCount(5);
    await expect(dashboard.positionsTable.locator('tr')).toHaveText(values);
    await expect.poll(() => chartState(page)).not.toBeNull();
  });
});
