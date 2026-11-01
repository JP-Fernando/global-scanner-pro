import { test, expect } from '@playwright/test';
import express from 'express';
import { readFileSync } from 'node:fs';
import { setupAllMocks, setupSimulationMock } from '../e2e/helpers/api-mocks.js';
let server, origin;
let workerRevision = '';
const prefix = '/global-scanner-pro';
test.beforeAll(async () => {
  const app = express();
  app.get(`${prefix}/sw.js`, (_request, response, next) => {
    if (!workerRevision) return next();
    const worker = readFileSync('dist/public/sw.js', 'utf-8').replace(/const CACHE_VERSION = '[^']+';/,
      `const CACHE_VERSION = '${workerRevision}';`);
    response.type('application/javascript').send(worker);
  });
  app.use(prefix, express.static('dist/public'));
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
test('production subpath entry, navigation and cold offline shell', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await setupAllMocks(page);
  const requests = await setupSimulationMock(page);
  await page.goto(origin + '/global-scanner-pro/android.html#/scan');
  await expect(page.locator('#androidApp')).toHaveAttribute('aria-busy', 'false');
  const androidManifest = await (await page.request.get(origin + prefix + '/android.webmanifest')).json();
  expect(androidManifest.start_url).toBe(prefix + '/android.html');
  expect(androidManifest.id).toBe(prefix + '/android.html');
  expect(androidManifest.scope).toBe(prefix + '/');
  expect(androidManifest.icons.every(icon => icon.src.startsWith(prefix + '/icons/'))).toBe(true);
  const desktopManifest = await (await page.request.get(origin + prefix + '/manifest.webmanifest')).json();
  expect(desktopManifest.start_url).toBe(prefix + '/');

  expect(await page.evaluate(() => typeof window.runScan)).toBe('undefined');
  await page.locator('#scanForm button').click();
  await expect(page).toHaveURL(/#\/results$/);
  await expect(page.locator('.asset-card')).toHaveCount(5);
  await page.screenshot({ path: testInfo.outputPath('android-results.png') });
  await page.locator('.asset-card button').first().click();
  await page.locator('.selection-dock a').click();
  await page.locator('[data-action="calculate"]').click();
  await expect(page.locator('#projection')).toContainText('$6,000');
  await page.screenshot({ path: testInfo.outputPath('android-simulator.png'), fullPage: true });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.context().setOffline(true);
  try {
    await page.reload();
    await expect(page.locator('#networkStatus')).toBeVisible();
    await expect(page.locator('#projection')).toContainText('$6,000');
    expect(requests).toHaveLength(1);
    await page.locator('.bottom-nav a[href="#/portfolios"]').click();
    await expect(page.locator('#portfolioBuildForm button')).toBeEnabled();
    await page.locator('#portfolioBuildForm button').click();
    await page.locator('[name="portfolio-name"]').fill('Subpath offline');
    await page.locator('#portfolioSaveForm button').click();
    await expect(page.locator('#portfolioReview .position-card')).toHaveCount(5);
    await page.reload();
    await expect(page.locator('#portfolioReview h2')).toHaveText('Subpath offline');
    await expect(page.locator('[data-action="portfolio-refresh"]')).toBeDisabled();
    await page.locator('[data-action="portfolio-alerts"]').click();
    await expect(page.locator('#alertSettingsForm button')).toBeEnabled();
    await page.locator('[name="alert-threshold-score"]').fill('81');
    await page.locator('#alertSettingsForm button').click();
    await expect(page.locator('#alertStatus')).toHaveText('Ajustes guardados.');
    await page.reload();
    await expect(page.locator('[name="alert-threshold-score"]')).toHaveValue('81');

    await page.goto(origin + '/global-scanner-pro/');
    await expect(page.locator('#btnRunScan')).toBeVisible();
    await expect(page.locator('#androidApp')).toHaveCount(0);
  } finally { await page.context().setOffline(false); }
  expect(errors).toEqual([]);
});

test('updates only after an explicit action and restores Android drafts after activation', async ({ page }) => {
  await setupAllMocks(page);
  await page.goto(origin + prefix + '/android.html#/alerts');
  await expect(page.locator('#alertSettingsForm button')).toBeEnabled();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.locator('#alertSettingsForm button')).toBeEnabled();
  await page.locator('[name="alert-channel-email"]').fill('update@example.test');
  workerRevision = 'c4-update-check';
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration.update(); });
  await expect(page.locator('[data-action="update-app"]')).toBeEnabled();
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting))).toBe(true);
  await expect(page.locator('[name="alert-channel-email"]')).toHaveValue('update@example.test');
  await Promise.all([page.waitForEvent('load'), page.locator('[data-action="update-app"]').click()]);
  await expect(page.locator('[name="alert-channel-email"]')).toHaveValue('update@example.test');
  await expect(page).toHaveURL(/#\/alerts$/);
  await expect(page.locator('[data-action="update-app"]')).toHaveCount(0);
  workerRevision = '';
});
