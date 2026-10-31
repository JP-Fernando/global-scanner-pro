/**
 * PWA Foundation E2E tests — Phase 5.5.3.1
 *
 * Service worker + offline behaviour is only reliably testable via Playwright
 * on Chromium (the browser CI actually runs) — Firefox/WebKit have weaker
 * `browserContext.setOffline()` + Service Worker support, so those two
 * projects are skipped here rather than left flaky.
 */

import { test, expect } from '@playwright/test';
import { ScannerPage } from './pages/ScannerPage.js';
import { setupWithCompletedScan } from './helpers/test-utils.js';
import { setupSimulationMock } from './helpers/api-mocks.js';

test.describe('PWA foundation', () => {
  test('manifest.webmanifest is linked and valid', async ({ page, request }) => {
    await page.goto('/');

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBe('/manifest.webmanifest');

    const response = await request.get(manifestHref);
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toBe('Global Quant Scanner Pro');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });

  test('service worker registers and becomes active', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Service worker lifecycle is only reliably testable on Chromium');

    await page.goto('/');
    const scope = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.active?.scriptURL || null;
    });

    expect(scope).toContain('/sw.js');
  });

  test('last scan remains reviewable after going offline', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Offline emulation is only reliably testable on Chromium');

    const scannerPage = new ScannerPage(page);
    await setupWithCompletedScan(page);

    const onlineResultCount = await scannerPage.getResultCount();
    expect(onlineResultCount).toBeGreaterThan(0);

    // Let the now-active service worker take control of a normal (online) reload
    // so it has a chance to populate its runtime cache with the app's scripts —
    // this mirrors a real user's second visit, not their very first page load.
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.context().setOffline(true);
    try {
      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('#offlineBanner')).toBeVisible();
      const offlineResultCount = await scannerPage.getResultCount();
      expect(offlineResultCount).toBe(onlineResultCount);
    } finally {
      await page.context().setOffline(false);
    }
  });

  test('last simulation restores amounts, custom horizon and projection offline', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Offline emulation is only reliably testable on Chromium');
    const simulationRequests = await setupSimulationMock(page);

    await setupWithCompletedScan(page);
    const selection = page.locator('.sim-select-toggle').first();
    const ticker = await selection.getAttribute('data-ticker');
    await selection.click();
    await page.locator('#mainTabSimulator').click();
    await expect(page.locator('#simSummary')).toContainText('Total invested');
    await expect(page.locator('#simCalculateBtn')).toBeEnabled();
    await page.locator('.sim-ticker-amount').fill('175');
    await page.locator('#simPresetCustom').check();
    await page.locator('#simCalculateBtn').click();
    await expect(page.locator('#simSummary')).toContainText('$3,150');
    const summary = await page.locator('#simSummary').textContent();
    const requestsBeforeRestore = simulationRequests.length;

    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.context().setOffline(true);
    try {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#offlineBanner')).toBeVisible();
      await expect(page.locator('#simulatorSelectionBadge')).toContainText('1 / 4');
      await page.locator('#mainTabSimulator').click();
      await expect(page.locator('.sim-ticker-amount')).toHaveAttribute('data-ticker', ticker);
      await expect(page.locator('.sim-ticker-amount')).toHaveValue('175');
      await expect(page.locator('#simPresetCustom')).toBeChecked();
      await expect(page.locator('#simCustomValue')).toHaveValue('18');
      await expect(page.locator('#simCustomUnit')).toHaveValue('months');
      await expect(page.locator('#simSummary')).toHaveText(summary);
      expect(simulationRequests).toHaveLength(requestsBeforeRestore);
    } finally {
      await page.context().setOffline(false);
    }
  });
});
