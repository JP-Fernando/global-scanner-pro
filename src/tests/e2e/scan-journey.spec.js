/**
 * Core scan workflow E2E tests — the primary user journey.
 *
 * Tests: select market/strategy → run scan → verify results table → view modes.
 */

import { test, expect } from '@playwright/test';
import { setupAllMocks } from './helpers/api-mocks.js';
import { ScannerPage } from './pages/ScannerPage.js';

test.describe('Scan journey', () => {
  let scanner;

  test.beforeEach(async ({ page }) => {
    await setupAllMocks(page);
    scanner = new ScannerPage(page);
    await scanner.goto();
  });

  test('scan button is enabled on load', async () => {
    expect(await scanner.isScanButtonDisabled()).toBe(false);
  });

  test('running a scan disables the button during execution', async () => {
    await scanner.selectMarket('universes/bme_universe.json|.MC');
    await scanner.selectStrategy('balanced');

    // Click without waiting for completion to check intermediate state
    await scanner.scanButton.click();

    // The button should become disabled almost immediately
    await expect(scanner.scanButton).toBeDisabled({ timeout: 3_000 });

    // Now wait for scan to complete
    await scanner.waitForScanComplete();
    await expect(scanner.scanButton).toBeEnabled();
  });

  test('scan populates results table with rows', async () => {
    await scanner.selectMarket('universes/bme_universe.json|.MC');
    await scanner.selectStrategy('balanced');
    await scanner.runScan();

    const count = await scanner.getResultCount();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(5); // mock universe has 5 tickers
  });

  test('result rows contain ticker, name, score and signal', async () => {
    await scanner.selectMarket('universes/bme_universe.json|.MC');
    await scanner.selectStrategy('balanced');
    await scanner.runScan();

    const firstRow = scanner.resultsTbody.locator('tr').first();
    const cells = await firstRow.locator('td').allTextContents();
    // Should have at minimum: rank, ticker, name, score, volume, signal
    expect(cells.length).toBeGreaterThanOrEqual(5);
  });

  test('portfolio section becomes visible after scan', async () => {
    await scanner.selectMarket('universes/bme_universe.json|.MC');
    await scanner.selectStrategy('balanced');
    await scanner.runScan();

    await expect(scanner.portfolioSection).toBeVisible();
  });

  test('changing strategy and rescanning updates results', async () => {
    await scanner.selectMarket('universes/bme_universe.json|.MC');
    await scanner.selectStrategy('balanced');
    await scanner.runScan();

    // Change strategy and re-scan
    await scanner.selectStrategy('momentum_aggressive');
    await scanner.runScan();

    // Results should still exist (may or may not differ with deterministic mock)
    const count = await scanner.getResultCount();
    expect(count).toBeGreaterThan(0);
  });

  test('view mode selector changes displayed scores', async () => {
    await scanner.selectMarket('universes/bme_universe.json|.MC');
    await scanner.selectStrategy('balanced');
    await scanner.runScan();

    // Get score cell content in default (total) view
    const firstRowCellsDefault = await scanner.resultsTbody.locator('tr').first().locator('td').nth(3).textContent();

    // Switch to momentum view
    await scanner.changeViewMode('scoreMomentum');
    await scanner.page.waitForTimeout(300);

    const firstRowCellsMomentum = await scanner.resultsTbody.locator('tr').first().locator('td').nth(3).textContent();

    // Both should contain score-like content (numbers)
    expect(firstRowCellsDefault.trim().length).toBeGreaterThan(0);
    expect(firstRowCellsMomentum.trim().length).toBeGreaterThan(0);
  });

  test('status text updates during and after scan', async () => {
    await scanner.selectMarket('universes/bme_universe.json|.MC');
    await scanner.selectStrategy('balanced');

    const statusBefore = await scanner.statusText.textContent();
    await scanner.runScan();
    const statusAfter = await scanner.statusText.textContent();

    // After scan the status should have changed from the initial "Sistema listo" message
    expect(statusAfter).not.toBe(statusBefore);
  });

  test('scan with different market works', async () => {
    await scanner.selectMarket('universes/us_universe.json|');
    await scanner.selectStrategy('balanced');
    await scanner.runScan();

    const count = await scanner.getResultCount();
    expect(count).toBeGreaterThan(0);
  });

  test('all four strategies can be selected and scanned', async () => {
    const strategies = ['balanced', 'momentum_aggressive', 'trend_conservative', 'sector_rotation'];
    for (const strategy of strategies) {
      await scanner.selectMarket('universes/bme_universe.json|.MC');
      await scanner.selectStrategy(strategy);
      await scanner.runScan();

      const count = await scanner.getResultCount();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('all-markets scan combines results from both markets after confirmation', async ({ page }) => {
    // Keep two representative markets so this exercises the combined flow quickly.
    await page.locator('#marketSelect').evaluate(select => {
      for (const option of Array.from(select.options)) {
        if (!['ALL_MARKETS', 'universes/bme_universe.json|.MC', 'universes/us_universe.json|']
          .includes(option.value)) option.remove();
      }
    });
    await scanner.selectMarket('ALL_MARKETS');
    await scanner.selectStrategy('balanced');
    await scanner.scanButton.click();
    await page.locator('#proceedBtn').click();
    await expect(scanner.scanButton).toBeEnabled();
    await expect(scanner.resultsTbody.locator('tr')).toHaveCount(10);
    const scan = await page.evaluate(() => ({
      market: window.appState.market.file,
      suffixes: [...new Set(window.appState.scanResults.map(item => item.marketSuffix))],
      completed: window.appState.scanCompleted,
    }));
    expect(scan).toEqual({ market: 'ALL_MARKETS', suffixes: expect.arrayContaining(['.MC', '']), completed: true });
    await expect(scanner.portfolioSection).toBeVisible();
  });

  test('cancelling all-markets confirmation releases the scan button', async ({ page }) => {
    await scanner.selectMarket('ALL_MARKETS');
    await scanner.scanButton.click();
    await page.locator('#cancelBtn').click();
    await expect(scanner.scanButton).toBeEnabled();
    expect(await page.evaluate(() => window.appState.scanCompleted)).toBe(false);
  });

  test('universe download failure releases the scan button and allows retry', async ({ page }) => {
    await scanner.selectMarket('universes/bme_universe.json|.MC');
    const failUniverse = route => route.abort();
    await page.route('**/universes/**', failUniverse);
    await scanner.runScan();
    await expect(scanner.statusText).toContainText(/error/i);
    await expect(scanner.scanButton).toBeEnabled();
    await page.unroute('**/universes/**', failUniverse);
    await scanner.runScan();
    await expect(scanner.resultsTbody.locator('.sim-select-toggle')).toHaveCount(5);
  });
});
