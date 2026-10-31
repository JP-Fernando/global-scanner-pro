/**
 * Alert configuration E2E tests.
 *
 * The alerts section lives inside the portfolio dashboard, which is only
 * visible after building a portfolio. Tests first perform a scan + portfolio build.
 */

import { test, expect } from '@playwright/test';
import { setupWithCompletedScan } from './helpers/test-utils.js';
import { AlertsPage } from './pages/AlertsPage.js';

async function openAlertsDashboard(page) {
  // Scan + build portfolio to make dashboard (and alerts) visible
  await setupWithCompletedScan(page);
  await page.locator('#topNAssets').fill('5');
  await page.locator('#allocationMethod').selectOption('equal_weight');
  await page.locator('button[onclick="buildPortfolio()"]').click();
  await page.locator('#portfolioResults').waitFor({ state: 'visible', timeout: 15_000 });
  await page.locator('#portfolioDashboardSection').waitFor({ state: 'visible', timeout: 15_000 });
  await page.locator('#alertVolatilityThreshold').waitFor({ state: 'visible', timeout: 15_000 });
}

test.describe('Alert configuration', () => {
  let alerts;

  test.beforeEach(async ({ page }) => {
    await openAlertsDashboard(page);

    alerts = new AlertsPage(page);
  });

  test('alert threshold inputs exist', async () => {
    await expect(alerts.volatilityThreshold).toBeVisible();
    await expect(alerts.drawdownThreshold).toBeVisible();
    await expect(alerts.scoreThreshold).toBeVisible();
  });

  test('alert channel inputs exist', async () => {
    await expect(alerts.emailInput).toBeVisible();
    await expect(alerts.webhookInput).toBeVisible();
  });

  test('can fill threshold values', async () => {
    await alerts.fillThresholds({ volatility: 25, drawdown: -15, score: 70 });

    expect(await alerts.volatilityThreshold.inputValue()).toBe('25');
    expect(await alerts.drawdownThreshold.inputValue()).toBe('-15');
    expect(await alerts.scoreThreshold.inputValue()).toBe('70');
  });

  test('can fill channel inputs', async () => {
    await alerts.fillChannels({
      email: 'test@example.com',
      webhook: 'https://hooks.example.com/test',
    });

    expect(await alerts.emailInput.inputValue()).toBe('test@example.com');
    expect(await alerts.webhookInput.inputValue()).toBe('https://hooks.example.com/test');
  });

  test('notification checkboxes can be toggled', async () => {
    await alerts.toggleNotifications({ signals: true, rebalances: true, risk: true });

    expect(await alerts.notifySignals.isChecked()).toBe(true);
    expect(await alerts.notifyRebalances.isChecked()).toBe(true);
    expect(await alerts.notifyRisk.isChecked()).toBe(true);
  });

  test('save button triggers save and shows status', async () => {
    await alerts.fillThresholds({ volatility: 20, drawdown: -10, score: 60 });
    await alerts.fillChannels({ email: 'alerts@test.com' });
    await alerts.saveSettings();

    const status = await alerts.getStatusText();
    expect(status.length).toBeGreaterThan(0);
  });

  test('saved settings survive reload with normalized drawdown and disabled notifications', async ({ page }) => {
    await alerts.fillThresholds({ volatility: 22, drawdown: 18, score: 75 });
    await alerts.fillChannels({ webhook: 'https://example.test/alerts' });
    await alerts.notifySignals.uncheck();
    await alerts.notifyRebalances.uncheck();
    await alerts.notifyRisk.uncheck();
    await alerts.saveButton.click();
    await expect(alerts.drawdownThreshold).toHaveValue('-18');

    // Reopen the dashboard with the same origin and IndexedDB after a full navigation.
    await openAlertsDashboard(page);
    await expect(alerts.volatilityThreshold).toHaveValue('22');
    await expect(alerts.drawdownThreshold).toHaveValue('-18');
    await expect(alerts.scoreThreshold).toHaveValue('75');
    await expect(alerts.webhookInput).toHaveValue('https://example.test/alerts');
    await expect(alerts.notifySignals).not.toBeChecked();
    await expect(alerts.notifyRebalances).not.toBeChecked();
    await expect(alerts.notifyRisk).not.toBeChecked();
  });
});
