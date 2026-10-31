import { test, expect } from '@playwright/test';
import { setupAllMocks, setupSimulationMock, setupUniverseMock } from './helpers/api-mocks.js';

async function openAndroid(page) {
  await setupAllMocks(page);
  await page.goto('/android.html#/scan');
  await expect(page.locator('#androidApp')).toHaveAttribute('aria-busy', 'false');
}

async function scan(page) {
  await page.locator('#scanForm button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/results$/);
  await expect(page.locator('.asset-card')).toHaveCount(5);
}

async function selectOne(page) {
  await page.locator('.asset-card [data-toggle]').first().click();
  await page.locator('.selection-dock a').click();
  await expect(page.locator('[data-action="calculate"]')).toBeEnabled();
}

for (const width of [360, 390, 430]) {
  test.describe(`Android task flow ${width}px`, () => {
    test.use({ viewport: { width, height: 820 }, hasTouch: true });
    test('scan, filter, drill down, select and calculate using shared services', async ({ page }, testInfo) => {
      const requests = await setupSimulationMock(page);
      await openAndroid(page);
      await scan(page);
      await page.screenshot({ path: testInfo.outputPath('results.png') });
      await page.locator('[name="query"]').fill('Banco');
      await expect(page.locator('.asset-card')).toHaveCount(1);
      await page.locator('.asset-title').click();
      await expect(page.getByRole('heading', { name: 'SAN', exact: true })).toBeVisible();
      await page.locator('[data-toggle="SAN.MC"]').click();
      await page.locator('.back-link').click();
      await expect(page.locator('[name="query"]')).toHaveValue('Banco');
      await page.locator('[name="query"]').fill('');
      await expect(page.locator('.asset-card')).toHaveCount(5);
      for (let i = 0; i < 3; i++) {
        await page.locator('.asset-card button[aria-pressed="false"]:not([disabled])').first().click();
      }
      await expect(page.locator('.asset-card button[aria-pressed="true"]')).toHaveCount(4);
      await expect(page.locator('.asset-card button[aria-pressed="false"]')).toBeDisabled();
      await page.locator('.selection-dock a').click();
      expect(requests).toHaveLength(0); // Opening a view is always read-only.
      await page.locator('[name="amount"]').first().fill('175');
      await page.locator('[name="preset"]').selectOption('custom');
      await page.locator('[name="customValue"]').fill('2');
      await page.locator('[name="customUnit"]').selectOption('years');
      await page.locator('[data-action="calculate"]').click();
      await expect(page.locator('#projection')).toContainText('$11,400');
      expect(requests).toHaveLength(1);
      expect(requests[0].horizonMonths).toBe(24);
      expect(requests[0].tickers.every(ticker => ticker.endsWith('.MC'))).toBe(true);
      await expect(page.locator('.projection-chart')).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('simulator.png') });
      await page.locator('[name="language"]').selectOption('en');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('[name="amount"]').first()).toHaveValue('175');
      await expect(page.locator('[name="customUnit"]')).toHaveValue('years');
      expect(requests).toHaveLength(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  });
}

test.describe('Android recovery and identity', () => {
  test.use({ viewport: { width: 390, height: 820 }, hasTouch: true });

  test('keeps same-ticker instruments from different markets separate', async ({ page }) => {
    const requests = await setupSimulationMock(page);
    // Warm both presentation shells before exercising their shared offline records.
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await openAndroid(page);
    await setupUniverseMock(page, { universe: [{ ticker: 'SAN', name: 'Santander', sector: 'Financial Services' }] });
    await page.locator('[name="market"]').selectOption('all');
    await page.locator('#scanForm button').click();
    await expect(page.locator('#scanConfirmation')).toBeVisible();
    await page.locator('[data-action="cancel-scan"]').click();
    await expect(page.locator('#scanForm button')).toBeEnabled();
    await page.locator('#scanForm button').click();
    await page.locator('[data-action="confirm-scan"]').click();
    await expect(page).toHaveURL(/#\/results$/);
    await page.locator('[data-symbol="SAN.MC"] button').click();
    await page.locator('[data-symbol="SAN"] button').click();
    await page.locator('.selection-dock a').click();
    await page.locator('[name="amount"][data-symbol="SAN.MC"]').fill('50');
    await page.locator('[name="amount"][data-symbol="SAN"]').fill('150');
    await page.locator('[data-action="calculate"]').click();
    await expect(page.locator('#projection')).toContainText('$12,000');
    expect(requests[0]).toEqual({ tickers: ['SAN.MC', 'SAN'],
      tickerInvestments: { 'SAN.MC': 50, SAN: 150 }, horizonMonths: 60 });
    await page.context().setOffline(true);
    try {
      await page.goto('/');
      await expect(page.locator('.sim-select-toggle[aria-pressed="true"]')).toHaveCount(2);
      await page.locator('#mainTabSimulator').click();
      await expect(page.locator('.sim-ticker-amount[data-ticker="SAN.MC"]')).toHaveValue('50');
      await expect(page.locator('.sim-ticker-amount[data-ticker="SAN"]')).toHaveValue('150');
      expect(requests).toHaveLength(1);
    } finally { await page.context().setOffline(false); }
    await page.locator('#simCalculateBtn').click();
    await expect(page.locator('#simSummary')).toContainText('$12,000');
    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1]).toEqual(requests[0]);
  });

  test('API error/retry and late responses preserve the latest projection', async ({ page }) => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let calls = 0;
    const requests = await setupSimulationMock(page, { failFirst: 1,
      beforeRespond: () => ++calls === 2 ? gate : undefined });
    await openAndroid(page); await scan(page); await selectOne(page);
    await page.locator('[data-action="calculate"]').click();
    await expect(page.locator('#simStatus')).toContainText('temporarily unavailable');
    await page.locator('[data-action="calculate"]').click();
    await expect(page.locator('[data-action="calculate"]')).toBeDisabled();
    await page.locator('[name="preset"]').selectOption('12');
    await page.locator('[data-action="calculate"]').click();
    await expect(page.locator('#projection')).toContainText('$1,200');
    const old = page.waitForResponse(res => res.url().endsWith('/api/v1/simulate')
      && res.request().postDataJSON().horizonMonths === 60);
    release(); await (await old).finished();
    await page.evaluate(() => new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));
    await expect(page.locator('#projection')).toContainText('$1,200');
    expect(requests).toHaveLength(3);
    await page.locator('[name="amount"]').fill('0');
    await expect(page.locator('[data-action="calculate"]')).toBeDisabled();
    await expect(page.locator('#projectionStale')).toBeVisible();
  });

  test('reload restores the Android shell and saved simulation offline without requests', async ({ page }) => {
    const requests = await setupSimulationMock(page);
    await openAndroid(page); await scan(page); await selectOne(page);
    await page.locator('[name="amount"]').fill('175');
    await page.locator('[data-action="calculate"]').click();
    await expect(page.locator('#projection')).toContainText('$10,500');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect(page.locator('#androidApp')).toHaveAttribute('aria-busy', 'false');
    await page.waitForLoadState('networkidle');
    await page.context().setOffline(true);
    try {
      await page.reload();
      await expect(page.locator('#networkStatus')).toBeVisible();
      await expect(page.locator('[name="amount"]')).toHaveValue('175');
      await expect(page.locator('#projection')).toContainText('$10,500');
      await expect(page.locator('[data-action="calculate"]')).toBeDisabled();
      expect(requests).toHaveLength(1);
      await page.goto('/');
      await expect(page.locator('#btnRunScan')).toBeVisible();
      await expect(page.locator('#androidApp')).toHaveCount(0);
    } finally { await page.context().setOffline(false); }
  });

  test('bad routes are safe and a failed scan can be retried', async ({ page }) => {
    await openAndroid(page);
    await page.goto('/android.html#/asset/%ZZ');
    await expect(page.locator('main')).toContainText('ya no está');
    await page.goto('/android.html#/scan');
    const fail = route => route.abort();
    await page.route('**/universes/**', fail);
    await page.locator('#scanForm button').click();
    await expect(page.locator('#scanProgress')).toContainText('reintentar');
    await expect(page.locator('#scanForm button')).toBeEnabled();
    await page.unroute('**/universes/**', fail);
    await scan(page);
  });

  test('blocked browser storage keeps scanning usable and reports unsaved state', async ({ page }) => {
    await page.addInitScript(() => {
      window.Storage.prototype.getItem = () => { throw new Error('storage blocked'); };
      window.Storage.prototype.setItem = () => { throw new Error('storage blocked'); };
      Object.defineProperty(window, 'indexedDB', { value: {
        open: () => { throw new Error('IndexedDB blocked'); },
      } });
    });
    await openAndroid(page);
    await scan(page);
    await expect(page.locator('#appNotice')).toContainText('No se ha podido guardar');
    await page.locator('[name="query"]').fill('SAN');
    await expect(page.locator('.asset-card')).toHaveCount(1);
  });
});
