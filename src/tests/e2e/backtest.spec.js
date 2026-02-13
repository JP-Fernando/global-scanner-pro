/**
 * Backtesting workflow E2E tests.
 */

import { test, expect } from '@playwright/test';
import { setupWithCompletedScan } from './helpers/test-utils.js';
import { BacktestPage } from './pages/BacktestPage.js';

test.describe('Backtesting', () => {
  let backtest;

  test.beforeEach(async ({ page }) => {
    await setupWithCompletedScan(page);
    backtest = new BacktestPage(page);
  });

  test('backtest section is visible on page', async () => {
    await expect(backtest.runButton).toBeVisible();
    await expect(backtest.topNAssets).toBeVisible();
  });

  test('backtest parameters have default values', async () => {
    expect(await backtest.topNAssets.inputValue()).toBe('10');
    expect(await backtest.rebalanceDays.inputValue()).toBe('21');
    expect(await backtest.initialCapital.inputValue()).toBe('10000');
  });

  test('running backtest with custom parameters shows results', async () => {
    await backtest.configure({
      topN: 5,
      rebalance: 42,
      method: 'equal_weight',
      capital: 5000,
    });
    await backtest.runBacktest();

    expect(await backtest.isResultsVisible()).toBe(true);
  });

  test('backtest results contain strategy information', async () => {
    await backtest.configure({ topN: 5 });
    await backtest.runBacktest();

    const text = await backtest.getResultsText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('backtest status text updates during execution', async () => {
    await backtest.configure({ topN: 5 });

    const statusBefore = await backtest.statusText.textContent();
    await backtest.runBacktest();
    const statusAfter = await backtest.statusText.textContent();

    // Status should change during backtest
    expect(statusAfter).not.toBe(statusBefore);
  });

  test('different allocation methods produce results', async () => {
    const methods = ['equal_weight', 'score_weighted', 'hybrid'];
    for (const method of methods) {
      await backtest.configure({ topN: 5, method });
      await backtest.runButton.click();
      await backtest.resultsContainer.waitFor({ state: 'visible', timeout: 45_000 });
      expect(await backtest.isResultsVisible()).toBe(true);
    }
  });

  test('backtest results have export buttons', async ({ page }) => {
    await backtest.configure({ topN: 5 });
    await backtest.runBacktest();

    // Look for export/download buttons in the results area
    const buttons = await page.locator('#backtestResults button, #backtestSection button').allTextContents();
    expect(buttons.length).toBeGreaterThan(0);
  });
});
