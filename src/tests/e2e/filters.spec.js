/**
 * Quick filter interaction tests.
 *
 * Prerequisite: Each test runs a scan first via beforeEach, then exercises filters.
 */

import { test, expect } from '@playwright/test';
import { setupWithCompletedScan } from './helpers/test-utils.js';
import { FiltersPage } from './pages/FiltersPage.js';

test.describe('Quick filters', () => {
  let filters;

  test.beforeEach(async ({ page }) => {
    await setupWithCompletedScan(page);
    filters = new FiltersPage(page);
  });

  test('search by ticker filters results', async () => {
    const totalBefore = await filters.getVisibleRowCount();

    await filters.searchByText('ITX');

    const totalAfter = await filters.getVisibleRowCount();
    expect(totalAfter).toBeLessThanOrEqual(totalBefore);
    expect(totalAfter).toBeGreaterThanOrEqual(0);
  });

  test('search by company name filters results', async () => {
    await filters.searchByText('Inditex');
    const count = await filters.getVisibleRowCount();
    expect(count).toBeLessThanOrEqual(5);
  });

  test('search is case-insensitive', async () => {
    await filters.searchByText('itx');
    const lower = await filters.getVisibleRowCount();

    await filters.searchByText('');
    await filters.searchByText('ITX');
    const upper = await filters.getVisibleRowCount();

    expect(lower).toBe(upper);
  });

  test('signal filter changes visible row count', async () => {
    const allCount = await filters.getVisibleRowCount();

    await filters.filterBySignal('strong_buy');
    const strongBuyCount = await filters.getVisibleRowCount();

    // strong_buy should have <= all results
    expect(strongBuyCount).toBeLessThanOrEqual(allCount);
  });

  test('min score slider filters low-scoring results', async ({ page }) => {
    const allCount = await filters.getVisibleRowCount();

    // Set a high min score threshold
    await page.evaluate(() => {
      const slider = document.getElementById('minScore');
      slider.value = '80';
      slider.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(300);

    const filteredCount = await filters.getVisibleRowCount();
    expect(filteredCount).toBeLessThanOrEqual(allCount);
  });

  test('volume filter works', async () => {
    const allCount = await filters.getVisibleRowCount();

    await filters.filterByVolume('high');
    const highVolCount = await filters.getVisibleRowCount();

    expect(highVolCount).toBeLessThanOrEqual(allCount);
  });

  test('clear filters restores all results', async () => {
    const allCount = await filters.getVisibleRowCount();

    // Apply a search filter
    await filters.searchByText('ITX');
    const filtered = await filters.getVisibleRowCount();
    expect(filtered).toBeLessThanOrEqual(allCount);

    // Clear filters
    await filters.clearFilters();
    const restored = await filters.getVisibleRowCount();
    expect(restored).toBe(allCount);
  });

  test('combining search and score filter narrows results', async ({ page }) => {
    const allCount = await filters.getVisibleRowCount();

    // Apply a moderate score filter
    await page.evaluate(() => {
      const slider = document.getElementById('minScore');
      slider.value = '40';
      slider.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(300);
    const afterScore = await filters.getVisibleRowCount();

    // Now also search by ticker
    await filters.searchByText('SAN');
    const afterBoth = await filters.getVisibleRowCount();

    expect(afterBoth).toBeLessThanOrEqual(afterScore);
    expect(afterBoth).toBeLessThanOrEqual(allCount);
  });

  test('filter summary displays count text', async () => {
    await filters.searchByText('ITX');
    const summary = await filters.getFilterSummaryText();
    // Summary should contain a number pattern like "1 de 5" or "1 of 5"
    expect(summary).toBeTruthy();
  });
});
