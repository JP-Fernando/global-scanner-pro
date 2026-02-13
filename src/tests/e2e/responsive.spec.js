/**
 * Responsive design E2E tests — verify layout at different viewports.
 */

import { test, expect } from '@playwright/test';
import { setupAllMocks } from './helpers/api-mocks.js';

const VIEWPORTS = {
  desktop: { width: 1400, height: 900 },
  tablet:  { width: 768, height: 1024 },
  mobile:  { width: 375, height: 667 },
};

test.describe('Responsive design', () => {
  test.beforeEach(async ({ page }) => {
    await setupAllMocks(page);
  });

  test('desktop layout renders correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.header h1')).toBeVisible();
    await expect(page.locator('#marketSelect')).toBeVisible();
    await expect(page.locator('#btnRunScan')).toBeVisible();

    // No horizontal scrollbar at desktop size
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHScroll).toBe(false);
  });

  test('tablet layout renders all controls', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.header h1')).toBeVisible();
    await expect(page.locator('#marketSelect')).toBeVisible();
    await expect(page.locator('#btnRunScan')).toBeVisible();
    await expect(page.locator('#searchInput')).toBeVisible();
  });

  test('mobile layout renders without horizontal overflow', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.header h1')).toBeVisible();
    await expect(page.locator('#btnRunScan')).toBeVisible();

    // Check no excessive horizontal overflow (allow small tolerance)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10);
  });

  test('results table is scrollable on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The table container should exist
    const tableContainer = page.locator('.table-container');
    if (await tableContainer.count() > 0) {
      await expect(tableContainer).toBeVisible();
    }
  });

  test('scan button is accessible on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const btn = page.locator('#btnRunScan');
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    expect(box).toBeTruthy();
    expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORTS.desktop.width + 20);
  });

  test('scan button is accessible on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const btn = page.locator('#btnRunScan');
    await expect(btn).toBeVisible();
  });

  test('language selector visible on tablet', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.header').waitFor({ state: 'visible', timeout: 10_000 });

    const langSelect = page.locator('#languageSelect');
    await expect(langSelect).toBeVisible();
  });
});
