import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { TEST_UNIVERSE_BME, buildYahooChartResponse } from './fixtures/yahoo-responses.js';
import { setupAllMocks, setupSimulationMock } from './helpers/api-mocks.js';
async function open(page, path = 'scan') {
  await setupAllMocks(page);
  await page.goto(`/android.html#/${path}`);
  await expect(page.locator('#androidApp')).toHaveAttribute('aria-busy', 'false');
}
async function scan(page) {
  await page.locator('#scanForm button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/results$/);
  await expect(page.locator('.asset-card')).toHaveCount(5);
}
for (const width of [360, 390, 430]) {
  test.describe(`Android C4 ${width}px`, () => {
    test.use({ viewport: { width, height: 820 }, hasTouch: true });
    test('audits every operational screen with WCAG rules enabled and preserves keyboard context', async ({ page }, testInfo) => {
      await open(page);
      async function audit() {
        const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(result.violations).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
      await page.keyboard.press('Tab');
      await expect(page.locator('.skip-link')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#screen')).toBeFocused();
      await audit();
      await scan(page); await audit();
      await page.locator('.asset-title').first().click(); await audit();
      await page.locator('[data-toggle]').first().click();
      await page.locator('.selection-dock a').click(); await audit();
      await page.locator('.bottom-nav a[href="#/portfolios"]').click();
      await expect(page.locator('#portfolioBuildForm button')).toBeEnabled();
      await page.locator('#portfolioBuildForm button').click(); await audit();
      await page.locator('[name="portfolio-name"]').fill('Accessible portfolio');
      await page.locator('#portfolioSaveForm button').click();
      await expect(page.locator('#portfolioStatus')).toHaveText('Cartera guardada.'); await audit();
      await page.locator('#portfolioHistory summary').click();
      await page.locator('[data-position-link]').first().click(); await audit();
      await page.locator('.back-link').click();
      await expect(page.locator('#portfolioHistory')).toHaveAttribute('open', '');
      await page.locator('[data-action="portfolio-alerts"]').click();
      await expect(page.locator('#alertSettingsForm button')).toBeEnabled(); await audit();
      const email = page.locator('[name="alert-channel-email"]');
      await email.fill('draft@example.test'); await email.focus();
      await page.context().setOffline(true);
      await expect(page.locator('#networkStatus')).toBeVisible(); await expect(email).toBeFocused();
      await page.context().setOffline(false);
      await expect(email).toHaveValue('draft@example.test'); await expect(email).toBeFocused();
      // Emulate visual viewport contraction; physical keyboard checks remain separate.
      await page.evaluate(() => {
        Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: 350 });
        window.visualViewport.dispatchEvent(new Event('resize'));
      });
      await expect(page.locator('.bottom-nav')).toBeHidden();
      await expect(email).toBeFocused();
      await page.evaluate(() => {
        delete window.visualViewport.height;
        window.visualViewport.dispatchEvent(new Event('resize'));
      });
      await expect(page.locator('.bottom-nav')).toBeVisible();
      await page.setViewportSize({ width, height: 420 });
      await expect(page.locator('.bottom-nav')).toBeHidden();
      await page.setViewportSize({ width, height: 820 });
      await expect(page.locator('.bottom-nav')).toBeVisible();

      await page.locator('[name="language"]').focus();
      await page.locator('[name="language"]').selectOption('en');
      await expect(page.locator('[name="language"]')).toBeFocused();
      await expect(email).toHaveValue('draft@example.test'); await audit();
      await page.screenshot({ path: testInfo.outputPath('alerts-en.png'), fullPage: true });
    });
  });
}

test('restores the last route, disclosures and drafts after reload without network calculations', async ({ page }) => {
  const simulations = await setupSimulationMock(page);
  await open(page, 'alerts');
  await expect(page.locator('#alertSettingsForm button')).toBeEnabled();
  await page.locator('[name="alert-channel-email"]').fill('resume@example.test');
  await page.locator('#alertHistory summary').click();
  await page.locator('[name="alert-channel-email"]').focus();
  await page.evaluate(() => window.scrollTo(0, 700));
  const scroll = await page.evaluate(() => window.scrollY);
  await page.reload();
  await expect(page.locator('[name="alert-channel-email"]')).toHaveValue('resume@example.test');
  await expect(page.locator('#alertHistory')).toHaveAttribute('open', '');
  await expect(page.locator('#alertSettingsForm button')).toBeEnabled();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scroll, 0);
  await expect(page.locator('[name="alert-channel-email"]')).toBeFocused();
  await page.goto('/android.html');
  await expect(page).toHaveURL(/#\/alerts$/);
  await expect(page.locator('[name="alert-channel-email"]')).toHaveValue('resume@example.test');
  expect(simulations).toHaveLength(0);
  await page.goto('/android.html#/scan'); // Explicit links take priority over the saved route.
  await expect(page.locator('#scanForm')).toBeVisible();
});

test('shows interrupted work after reload and never retries it automatically', async ({ page }) => {
  await open(page); await scan(page);
  await page.locator('.asset-card [data-toggle]').first().click();
  await page.locator('.selection-dock a').click();
  let held;
  let requests = 0;
  await page.route('**/api/v1/simulate', route => { held = route; requests++; });
  await page.locator('[data-action="calculate"]').click();
  await expect.poll(() => requests).toBe(1);
  await page.reload();
  await expect(page.locator('#appNotice')).toContainText('se interrumpió');
  await held.abort().catch(() => {});
  expect(requests).toBe(1);
  await expect(page.locator('[name="amount"]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#appNotice')).not.toContainText('se interrumpió');
  expect(requests).toBe(1);
});

test('uses an Android manifest and consumes each install prompt once', async ({ page }) => {
  await open(page);
  const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifest).toBe('android.webmanifest');
  const data = await (await page.request.get('/android.webmanifest')).json();
  expect(data.start_url).toBe('/android.html'); expect(data.id).toBe('/android.html');
  await page.evaluate(() => {
    window.installCalls = 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => { window.installCalls++; };
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    window.dispatchEvent(event);
  });
  await page.locator('#installation summary').click();
  await page.locator('[data-action="install-app"]').click();
  await expect(page.locator('[data-action="install-app"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.installCalls)).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(page.locator('#scanForm')).toBeVisible();
});

test('an IndexedDB upgrade blocked by another tab does not leave startup loading forever', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: { open: () => {
      const request = {};
      setTimeout(() => request.onblocked?.(), 0); return request;
    } } });
  });
  await open(page, 'alerts');
  await expect(page.locator('#alertStatus')).toContainText('No se han podido leer');
  await expect(page.locator('#alertSettingsForm button')).toBeEnabled();
  await page.locator('[name="alert-channel-email"]').fill('memory@example.test');
  await page.locator('#alertSettingsForm button').click();
  await expect(page.locator('#alertStatus')).toContainText('No se ha podido guardar');
  await expect(page.locator('[name="alert-channel-email"]')).toHaveValue('memory@example.test');
});

test('retains the previous complete scan after connection loss and does not retry on reconnect', async ({ page, context }) => {
  await open(page); await scan(page);
  const saved = await page.locator('.snapshot').first().textContent();
  await page.locator('.bottom-nav a[href="#/scan"]').click();
  await page.locator('[name="market"]').selectOption('france');
  let held, starts = 0;
  await page.route('**/universes/**', route => { held = route; starts++; });
  await page.locator('#scanForm button[type="submit"]').click();
  await expect.poll(() => starts).toBe(1);
  await context.setOffline(true);
  await expect(page.locator('#networkStatus')).toBeVisible();
  await context.setOffline(false);
  await held.fulfill({ json: TEST_UNIVERSE_BME });
  await expect(page.locator('#scanProgress')).toContainText('No se ha podido completar');
  await expect(page.locator('#scanForm button[type="submit"]')).toBeEnabled();
  expect(starts).toBe(1);
  await page.locator('.bottom-nav a[href="#/results"]').click();
  await expect(page.locator('.asset-card')).toHaveCount(5);
  const symbols = await page.locator('.asset-card').evaluateAll(cards => cards.map(card => card.dataset.symbol));
  expect(symbols.every(symbol => symbol.endsWith('.MC'))).toBe(true);
  await expect(page.locator('.snapshot').first()).toHaveText(saved);
});

test('opens the latest requested position after an earlier portfolio refresh finishes', async ({ page }) => {
  await open(page, 'portfolios');
  await expect(page.locator('[data-action="portfolio-reload"]')).toBeEnabled();
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = window.indexedDB.open('GlobalQuantScannerDB');
    request.onsuccess = () => {
      const db = request.result, transaction = db.transaction('portfolios', 'readwrite');
      for (const id of ['A', 'B']) transaction.objectStore('portfolios').put({ id, name: id,
        created_at: '2026-11-01T00:00:00Z', last_updated: '2026-11-01T00:00:00Z', initial_capital: 1000,
        allocation_method: 'equal_weight', strategy: 'balanced', positions: [{ ticker: 'T' + id,
          name: id, entry_price: 10, quantity: 10 }] });
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    };
  }));
  await page.locator('[data-action="portfolio-reload"]').click();
  await expect(page.locator('[name="savedPortfolio"]')).toBeEnabled();
  await page.locator('[name="savedPortfolio"]').selectOption('A');
  await expect(page.locator('#portfolioReview')).toHaveAttribute('data-portfolio-id', 'A');
  let held, quotes = 0;
  await page.route('**/api/yahoo**', route => { held = route; quotes++; });
  await page.locator('[data-action="portfolio-refresh"]').click();
  await expect.poll(() => quotes).toBe(1);
  await page.evaluate(() => { location.hash = '/position/B/TB'; });
  await held.fulfill({ json: buildYahooChartResponse('TA', 300) });
  await expect(page.locator('#screen h1')).toHaveText('TB');
  await expect(page.locator('#positionReview')).toContainText('Cantidad');
  expect(quotes).toBe(1);
});
