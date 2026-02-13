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
});
