import { test, expect } from '@playwright/test';
import { setupAllMocks } from './helpers/api-mocks.js';

async function open(page, path = 'scan') {
  await setupAllMocks(page);
  await page.goto(`/android.html#/${path}`);
  await expect(page.locator('#androidApp')).toHaveAttribute('aria-busy', 'false');
}
async function build(page) {
  await open(page);
  await page.locator('#scanForm button').click();
  await expect(page).toHaveURL(/#\/results$/);
  await page.locator('[name="query"]').fill('Banco');
  await page.locator('#screen a[href="#/portfolios"]').click();
  await expect(page.locator('[name="portfolio-topN"]')).toBeEnabled();
  await page.locator('[name="portfolio-totalCapital"]').fill('25000');
  await page.locator('[name="portfolio-method"]').selectOption('score_weighted');
  await page.locator('#portfolioBuildForm button').click();
  await expect(page.locator('#portfolioPreview .breakdown-row')).toHaveCount(5);
}
for (const width of [360, 390, 430]) {
  test.describe(`Android C3 ${width}px`, () => {
    test.use({ viewport: { width, height: 820 }, hasTouch: true });
    test('builds from the full scan, saves, reopens positions and edits strategy alerts', async ({ page }, testInfo) => {
      await build(page);
      await page.locator('[name="portfolio-name"]').fill('Mi cartera');
      await page.locator('#portfolioSaveForm button').click();
      await expect(page.locator('#portfolioStatus')).toHaveText('Cartera guardada.');
      await expect(page.locator('#portfolioReview .position-card')).toHaveCount(5);
      const portfolioId = await page.locator('#portfolioReview').getAttribute('data-portfolio-id');
      const stored = await page.evaluate(async id => {
        return new Promise((resolve, reject) => {
          const open = window.indexedDB.open('GlobalQuantScannerDB');
          open.onsuccess = () => {
            const db = open.result;
            const read = db.transaction('portfolios').objectStore('portfolios').get(id);
            read.onsuccess = () => { resolve(read.result); db.close(); };
            read.onerror = () => reject(read.error);
          };
        });
      }, portfolioId);
      expect(stored.initial_capital).toBe(25000);
      expect(stored.allocation_method).toBe('score_weighted');
      expect(stored.benchmark).toBe('^IBEX');
      expect(stored.construction_report.risk_profile).toBe('moderate');
      expect(stored.construction_report.corrections.length).toBeGreaterThan(0);
      expect(stored.positions.every(position => position.ticker.endsWith('.MC'))).toBe(true);
      expect(stored.positions.reduce((sum, position) => sum + position.target_weight, 0)).toBeCloseTo(1);
      await page.locator('#portfolioReview details summary').filter({ hasText: 'Historial y métricas' }).click();
      await expect(page.locator('#portfolioReview')).toContainText('Historial insuficiente');
      await page.locator('[data-position-link]').first().click();
      await expect(page).toHaveURL(/#\/position\//);
      await expect(page.locator('#positionReview .detail-facts')).toContainText('Cantidad');
      await page.reload();
      await expect(page.locator('#positionReview .detail-facts')).toContainText('Precio de entrada');
      await page.locator('.back-link').click();
      await expect(page.locator('[name="savedPortfolio"]')).toHaveValue(portfolioId);
      await page.screenshot({ path: testInfo.outputPath('portfolio.png'), fullPage: true });
      await page.locator('[data-action="portfolio-alerts"]').click();
      await expect(page.locator('[name="alertStrategy"]')).toHaveValue('balanced');
      await expect(page.locator('#alertSettingsForm button')).toBeEnabled();
      await page.locator('[name="alert-threshold-drawdown_pct"]').fill('18');
      await page.locator('[name="alert-threshold-score"]').fill('77');
      await page.locator('[name="alert-channel-email"]').fill('android@example.test');
      await page.locator('[name="alert-notify-strongSignals"]').uncheck();
      await page.locator('#alertSettingsForm button').click();
      await expect(page.locator('#alertStatus')).toHaveText('Ajustes guardados.');
      await expect(page.locator('[name="alert-threshold-drawdown_pct"]')).toHaveValue('-18');
      await page.locator('[name="alertStrategy"]').selectOption('momentum_aggressive');
      await expect(page.locator('#alertSettingsForm button')).toBeEnabled();
      await expect(page.locator('[name="alert-threshold-score"]')).toHaveValue('80');
      await page.locator('[name="alert-threshold-score"]').fill('91');
      await page.locator('[name="alertStrategy"]').selectOption('balanced');
      await expect(page.locator('[name="alert-threshold-score"]')).toHaveValue('77');
      await page.locator('[name="language"]').selectOption('en');
      await expect(page.locator('#screen h1')).toHaveText('Alerts');
      await page.reload();
      await expect(page.locator('[name="alert-channel-email"]')).toHaveValue('android@example.test');
      await expect(page.locator('[name="alert-notify-strongSignals"]')).not.toBeChecked();
      await page.locator('[name="alertStrategy"]').selectOption('momentum_aggressive');
      await expect(page.locator('[name="alert-threshold-score"]')).toHaveValue('91');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('alerts.png'), fullPage: true });
    });
  });
}

test.describe('Android C3 recovery', () => {
  test.use({ viewport: { width: 390, height: 820 } });
  test('retains portfolio and alert drafts after save failure and allows retry', async ({ page }) => {
    await build(page);
    await page.locator('[name="portfolio-name"]').fill('Retry portfolio');
    await page.evaluate(async () => {
      const original = window.IDBObjectStore.prototype.put;
      window.IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'portfolios') { window.IDBObjectStore.prototype.put = original; throw new Error('quota'); }
        return original.apply(this, args);
      };
    });
    await page.locator('#portfolioSaveForm button').click();
    await expect(page.locator('#portfolioStatus')).toContainText('No se ha podido guardar');
    await expect(page.locator('[name="portfolio-name"]')).toHaveValue('Retry portfolio');
    // Failure writing the first snapshot must roll back the portfolio definition as well.
    await page.evaluate(() => {
      const original = window.IDBObjectStore.prototype.put;
      window.IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'snapshots') { window.IDBObjectStore.prototype.put = original; throw new Error('quota'); }
        return original.apply(this, args);
      };
    });
    await page.locator('#portfolioSaveForm button').click();
    await expect(page.locator('#portfolioStatus')).toContainText('No se ha podido guardar');
    const savedCount = await page.evaluate(() => new Promise(resolve => {
      const open = window.indexedDB.open('GlobalQuantScannerDB');
      open.onsuccess = () => {
        const db = open.result;
        const count = db.transaction('portfolios').objectStore('portfolios').count();
        count.onsuccess = () => { resolve(count.result); db.close(); };
      };
    }));
    expect(savedCount).toBe(0);

    await page.locator('#portfolioSaveForm button').click();
    await expect(page.locator('#portfolioStatus')).toHaveText('Cartera guardada.');
    await page.locator('[data-action="portfolio-alerts"]').click();
    await expect(page.locator('#alertSettingsForm button')).toBeEnabled();
    await page.locator('[name="alert-threshold-score"]').fill('88');
    await page.evaluate(async () => {
      const original = window.IDBObjectStore.prototype.put;
      window.IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'alert_settings') { window.IDBObjectStore.prototype.put = original; throw new Error('quota'); }
        return original.apply(this, args);
      };
    });
    await page.locator('#alertSettingsForm button').click();
    await expect(page.locator('#alertStatus')).toContainText('No se ha podido guardar');
    await expect(page.locator('[name="alert-threshold-score"]')).toHaveValue('88');
    await page.locator('#alertSettingsForm button').click();
    await expect(page.locator('#alertStatus')).toHaveText('Ajustes guardados.');
  });
  test('reviews and saves locally offline without implicit quote requests', async ({ page, context }) => {
    await build(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    // Express test mode serves an unbundled graph: warm it under SW control, as in C2.
    // The production-build test separately checks the immediate cold offline reload.
    await page.reload();
    await expect(page.locator('#portfolioBuildForm button')).toBeEnabled();
    await page.waitForLoadState('networkidle');
    await page.locator('#portfolioBuildForm button').click();
    let quotes = 0;
    page.on('request', request => { if (request.url().includes('/api/yahoo')) quotes++; });
    await context.setOffline(true);
    await page.locator('[name="portfolio-name"]').fill('Offline portfolio');
    await page.locator('#portfolioSaveForm button').click();
    await expect(page.locator('#portfolioStatus')).toHaveText('Cartera guardada.');
    await expect(page.locator('[data-action="portfolio-refresh"]')).toBeDisabled();
    await page.reload();
    await expect(page.locator('#portfolioReview h2')).toHaveText('Offline portfolio');
    await page.locator('[data-position-link]').first().click();
    await expect(page.locator('#positionReview .detail-facts')).toContainText('Cantidad');
    await page.locator('.back-link').click();
    await page.locator('[data-action="portfolio-alerts"]').click();
    await expect(page.locator('#alertSettingsForm button')).toBeEnabled();
    await page.locator('[name="alert-threshold-score"]').fill('83');
    await page.locator('#alertSettingsForm button').click();
    await expect(page.locator('#alertStatus')).toHaveText('Ajustes guardados.');
    expect(quotes).toBe(0);
  });
});

test('refreshes quotes explicitly, keeps the previous review on failure and shares saved data with desktop', async ({ page }) => {
  await build(page);
  await page.locator('[name="portfolio-name"]').fill('Shared portfolio');
  await page.locator('#portfolioSaveForm button').click();
  await expect(page.locator('#portfolioStatus')).toHaveText('Cartera guardada.');
  const id = await page.locator('#portfolioReview').getAttribute('data-portfolio-id');
  let quotes = 0;
  page.on('request', request => { if (request.url().includes('/api/yahoo')) quotes++; });
  await page.locator('[data-position-link]').first().click();
  await expect(page.locator('#positionReview')).toBeVisible();
  await page.locator('.back-link').click();
  await expect(page.locator('[data-action="portfolio-refresh"]')).toBeVisible();
  expect(quotes).toBe(0);
  await page.locator('[data-action="portfolio-refresh"]').click();
  await expect(page.locator('#portfolioStatus')).toContainText('Precios actualizados');
  expect(quotes).toBe(5);
  await page.route('**/api/yahoo**', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }));
  const previous = await page.locator('#portfolioReview .detail-facts').first().textContent();
  await page.locator('[data-action="portfolio-refresh"]').click();
  await expect(page.locator('#portfolioStatus')).toContainText('No se ha podido actualizar');
  await expect(page.locator('#portfolioReview .detail-facts').first()).toHaveText(previous);
  await page.reload();
  await expect(page.locator('#portfolioReview .detail-facts').first()).toHaveText(previous);
  await page.unroute('**/api/yahoo**');
  await setupAllMocks(page);
  await page.locator('[data-action="portfolio-alerts"]').click();
  await expect(page.locator('#alertSettingsForm button')).toBeEnabled();
  await page.locator('[name="alert-threshold-score"]').fill('84');
  await page.locator('#alertSettingsForm button').click();
  await expect(page.locator('#alertStatus')).toHaveText('Ajustes guardados.');
  await page.goto('/');
  await expect(page.locator(`#portfolioSelector option[value="${id}"]`)).toContainText('Shared portfolio');
  await page.locator('#portfolioSelector').selectOption(id);
  await expect(page.locator('#positionsTableBody tr')).toHaveCount(5);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#alertScoreThreshold')).toHaveValue('84');
  await page.locator('#alertScoreThreshold').fill('86');
  await page.locator('#saveAlertSettingsBtn').click();
  await expect(page.locator('#alertSettingsStatus')).toHaveText('Configuración de alertas guardada.');
  await page.goto('/android.html#/alerts');
  await expect(page.locator('#alertSettingsForm button')).toBeEnabled();
  await expect(page.locator('[name="alert-threshold-score"]')).toHaveValue('86');
});

test('opens empty and invalid routes and preserves blank alert drafts across reload', async ({ page }) => {
  await open(page, 'portfolios');
  await expect(page.getByText('Todavía no hay carteras guardadas.', { exact: false })).toBeVisible();
  await expect(page.locator('#portfolioBuildForm button')).toBeDisabled();
  await page.goto('/android.html#/position/missing/SAN.MC');
  await expect(page.locator('#screen h1')).toContainText('No se encuentra esta posición');
  await page.locator('.back-link').click();
  await expect(page.getByText('Todavía no hay carteras guardadas.', { exact: false })).toBeVisible();
  await page.locator('.bottom-nav a[href="#/alerts"]').click();
  await expect(page.locator('#alertSettingsForm button')).toBeEnabled();
  await page.locator('[name="alert-threshold-score"]').fill('');
  await page.reload();
  await expect(page.locator('#alertSettingsForm button')).toBeEnabled();
  await expect(page.locator('[name="alert-threshold-score"]')).toHaveValue('');
  await page.locator('[name="alert-threshold-score"]').fill('90');
  await page.locator('#alertSettingsForm button').click();
  await expect(page.locator('#alertStatus')).toHaveText('Ajustes guardados.');
});
