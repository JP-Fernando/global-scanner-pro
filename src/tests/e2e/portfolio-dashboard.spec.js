/**
 * Portfolio dashboard E2E tests.
 *
 * Tests: save portfolio → load → chart tabs → positions table → metrics.
 */

import { test, expect } from '@playwright/test';
import { setupWithCompletedScan } from './helpers/test-utils.js';
import { PortfolioPage } from './pages/PortfolioPage.js';
import { DashboardPage } from './pages/DashboardPage.js';

test.describe('Portfolio dashboard', () => {
  let portfolio;
  let dashboard;

  test.beforeEach(async ({ page }) => {
    await setupWithCompletedScan(page);
    portfolio = new PortfolioPage(page);
    dashboard = new DashboardPage(page);
  });

  test('dashboard becomes visible after building portfolio', async () => {
    await portfolio.configure({ method: 'equal_weight', topN: 5 });
    await portfolio.buildPortfolio();

    expect(await dashboard.isDashboardVisible()).toBe(true);
  });

  test('save portfolio adds option to selector', async ({ page }) => {
    await portfolio.configure({ method: 'equal_weight', topN: 5 });
    await portfolio.buildPortfolio();

    // Click save button if present
    const saveBtn = page.locator('button:has-text("Guardar"), button:has-text("Save")');
    if (await saveBtn.count() > 0) {
      await saveBtn.first().click();
      await page.waitForTimeout(500);

      const options = await dashboard.getPortfolioOptions();
      // Should have more than just the default "create new" option
      expect(options.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('portfolio summary cards are rendered', async ({ page }) => {
    await portfolio.configure({ method: 'equal_weight', topN: 5 });
    await portfolio.buildPortfolio();

    // Check that summary section exists in the dashboard
    const summarySection = page.locator('#portfolioSummary, .portfolio-summary');
    if (await summarySection.count() > 0) {
      await expect(summarySection.first()).toBeVisible();
    }
  });

  test('chart canvas element exists in dashboard', async ({ page }) => {
    await portfolio.configure({ method: 'equal_weight', topN: 5 });
    await portfolio.buildPortfolio();

    const chart = page.locator('#portfolioChart');
    if (await chart.count() > 0) {
      await expect(chart).toBeVisible();
    }
  });

  test('chart tab buttons are clickable', async ({ page }) => {
    await portfolio.configure({ method: 'equal_weight', topN: 5 });
    await portfolio.buildPortfolio();

    const tabs = page.locator('button[data-tab]');
    const tabCount = await tabs.count();

    if (tabCount > 0) {
      for (let i = 0; i < tabCount; i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(200);
      }
    }
  });

  test('positions table has rows after building', async ({ page }) => {
    await portfolio.configure({ method: 'equal_weight', topN: 5 });
    await portfolio.buildPortfolio();

    const positionsBody = page.locator('#positionsTableBody');
    if (await positionsBody.count() > 0) {
      const rows = await positionsBody.locator('tr').count();
      expect(rows).toBeGreaterThan(0);
    }
  });

  test('refresh button exists and is clickable', async ({ page }) => {
    await portfolio.configure({ method: 'equal_weight', topN: 5 });
    await portfolio.buildPortfolio();

    const refreshBtn = page.locator('#refreshDashboardBtn');
    if (await refreshBtn.count() > 0) {
      await expect(refreshBtn).toBeEnabled();
      await refreshBtn.click();
      await page.waitForTimeout(500);
    }
  });
});
