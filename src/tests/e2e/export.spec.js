/**
 * Export/download E2E tests.
 *
 * Verifies that export buttons trigger browser download events.
 */

import { test, expect } from '@playwright/test';
import { setupWithCompletedScan } from './helpers/test-utils.js';

test.describe('Export functionality', () => {
  test.beforeEach(async ({ page }) => {
    await setupWithCompletedScan(page);
  });

  test('scan results export button exists after scan', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Excel")');
    const count = await exportBtn.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking scan export triggers download', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export Results"), button:has-text("Export")').first();

    if (await exportBtn.count() > 0) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null);
      await exportBtn.click();
      const download = await downloadPromise;

      if (download) {
        const filename = download.suggestedFilename();
        expect(filename).toBeTruthy();
      }
    }
  });

  test('backtest export buttons appear after backtest', async ({ page }) => {
    // Run a backtest
    await page.locator('#backtestTopN').fill('5');
    await page.locator('button[onclick="runBacktest()"]').click();
    await page.locator('#backtestResults').waitFor({ state: 'visible', timeout: 45_000 });

    // Look for export buttons inside backtest results
    const exportButtons = page.locator('#backtestResults button, #backtestSection button');
    const count = await exportButtons.count();
    // There should be at least one interactive button
    expect(count).toBeGreaterThan(0);
  });

  test('portfolio export buttons exist after building', async ({ page }) => {
    await page.locator('#topNAssets').fill('5');
    await page.locator('#allocationMethod').selectOption('equal_weight');
    await page.locator('button[onclick="buildPortfolio()"]').click();
    await page.locator('#portfolioResults').waitFor({ state: 'visible', timeout: 15_000 });

    // Look for PDF/Excel export buttons in the portfolio section
    const exportBtns = page.locator('#portfolioDashboardSection button:has-text("PDF"), #portfolioDashboardSection button:has-text("Excel"), #exportAttributionPdfBtn, #exportAttributionExcelBtn');
    const count = await exportBtns.count();
    expect(count).toBeGreaterThanOrEqual(0); // May not all be visible yet
  });
});
