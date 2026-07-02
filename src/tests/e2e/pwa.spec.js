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
});
