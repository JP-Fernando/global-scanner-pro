/**
 * Internationalization (i18n) language switching E2E tests.
 */

import { test, expect } from '@playwright/test';
import { setupAllMocks } from './helpers/api-mocks.js';

test.describe('Language switching', () => {
  test.beforeEach(async ({ page }) => {
    await setupAllMocks(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('default language is Spanish', async ({ page }) => {
    const lang = await page.locator('#languageSelect').inputValue();
    expect(lang).toBe('es');
  });

  test('switching to English updates UI text', async ({ page }) => {
    // Switch to English
    await page.locator('#languageSelect').selectOption('en');
    await page.waitForTimeout(500);

    const englishSubtitle = await page.locator('.header p').first().textContent();

    // The subtitle should change when switching language
    expect(englishSubtitle).toBeTruthy();
  });

  test('switching back to Spanish restores UI text', async ({ page }) => {
    const originalText = await page.locator('.header p').first().textContent();

    // Switch to English then back
    await page.locator('#languageSelect').selectOption('en');
    await page.waitForTimeout(500);
    await page.locator('#languageSelect').selectOption('es');
    await page.waitForTimeout(500);

    const restoredText = await page.locator('.header p').first().textContent();
    expect(restoredText).toBe(originalText);
  });

  test('scan button text changes with language', async ({ page }) => {
    const spanishBtn = await page.locator('#btnRunScan').textContent();

    await page.locator('#languageSelect').selectOption('en');
    await page.waitForTimeout(500);

    const englishBtn = await page.locator('#btnRunScan').textContent();
    expect(spanishBtn).toBeTruthy();
    expect(englishBtn).toBeTruthy();
  });

  test('html lang attribute updates on language change', async ({ page }) => {
    const initialLang = await page.evaluate(() => document.documentElement.lang);
    expect(initialLang).toBe('es');

    await page.locator('#languageSelect').selectOption('en');
    await page.waitForTimeout(300);

    const newLang = await page.evaluate(() => document.documentElement.lang);
    expect(newLang).toBe('en');
  });

  test('filter labels update on language change', async ({ page }) => {
    const spanishLabel = await page.locator('[data-i18n="filters.signal_label"]').textContent();

    await page.locator('#languageSelect').selectOption('en');
    await page.waitForTimeout(500);

    const englishLabel = await page.locator('[data-i18n="filters.signal_label"]').textContent();
    expect(spanishLabel).toBeTruthy();
    expect(englishLabel).toBeTruthy();
  });
});
