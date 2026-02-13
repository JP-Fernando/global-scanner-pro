/**
 * Smoke tests — validate that the app loads, critical elements exist,
 * and the Playwright infrastructure is working correctly.
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('page loads without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Allow known CDN/Sentry errors that don't affect functionality
    const criticalErrors = errors.filter(
      (e) => !e.includes('sentry') && !e.includes('cdn') && !e.includes('Sentry'),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('memory');
    expect(body).toHaveProperty('features');
  });

  test('header title is visible', async ({ page }) => {
    await page.goto('/');
    const title = page.locator('.header h1');
    await expect(title).toBeVisible();
    await expect(title).toContainText('Global Quant Scanner Pro');
  });

  test('control panel elements exist', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#marketSelect')).toBeVisible();
    await expect(page.locator('#strategySelect')).toBeVisible();
    await expect(page.locator('#btnRunScan')).toBeVisible();
  });

  test('filter panel elements exist', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#searchInput')).toBeVisible();
    await expect(page.locator('#signalFilter')).toBeVisible();
    await expect(page.locator('#minScore')).toBeVisible();
    await expect(page.locator('#volumeFilter')).toBeVisible();
  });

  test('language selector defaults to Spanish', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('#languageSelect').inputValue();
    expect(lang).toBe('es');
  });

  test('market selector has expected options', async ({ page }) => {
    await page.goto('/');
    const values = await page.locator('#marketSelect option').evaluateAll(
      (els) => els.map((el) => el.value),
    );
    expect(values.length).toBeGreaterThan(5);
    expect(values.some((v) => v.includes('bme_universe'))).toBe(true);
    expect(values.some((v) => v.includes('us_universe'))).toBe(true);
  });

  test('strategy selector has expected options', async ({ page }) => {
    await page.goto('/');
    const options = await page.locator('#strategySelect option').allTextContents();
    expect(options.length).toBe(4);
  });
});
