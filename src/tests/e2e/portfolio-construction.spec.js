/**
 * Portfolio construction E2E tests.
 *
 * Tests: configure allocation → build portfolio → verify results.
 */

import { test, expect } from '@playwright/test';
import { setupWithCompletedScan } from './helpers/test-utils.js';
import { PortfolioPage } from './pages/PortfolioPage.js';

test.describe('Portfolio construction', () => {
  let portfolio;

  test.beforeEach(async ({ page }) => {
    await setupWithCompletedScan(page);
    portfolio = new PortfolioPage(page);
  });

  test('portfolio section is visible after scan', async () => {
    expect(await portfolio.isPortfolioSectionVisible()).toBe(true);
  });

  test('building portfolio shows results', async () => {
    await portfolio.configure({ method: 'equal_weight', topN: 5 });
    await portfolio.buildPortfolio();
    expect(await portfolio.isResultsVisible()).toBe(true);
  });

  test('equal weight allocation produces results', async () => {
    await portfolio.configure({ method: 'equal_weight', topN: 5, capital: 10000 });
    await portfolio.buildPortfolio();

    const text = await portfolio.getResultsText();
    expect(text.length).toBeGreaterThan(0);
  });

  test('score weighted allocation produces results', async () => {
    await portfolio.configure({ method: 'score_weighted', topN: 3, capital: 5000 });
    await portfolio.buildPortfolio();

    expect(await portfolio.isResultsVisible()).toBe(true);
  });

  test('hybrid allocation produces results', async () => {
    await portfolio.configure({ method: 'hybrid', topN: 5, capital: 20000 });
    await portfolio.buildPortfolio();

    expect(await portfolio.isResultsVisible()).toBe(true);
  });

  test('changing risk profile produces results', async () => {
    await portfolio.configure({
      method: 'equal_weight',
      topN: 5,
      capital: 10000,
      risk: 'aggressive',
    });
    await portfolio.buildPortfolio();

    expect(await portfolio.isResultsVisible()).toBe(true);
  });

  test('portfolio results contain allocation content', async () => {
    await portfolio.configure({ method: 'equal_weight', topN: 5 });
    await portfolio.buildPortfolio();

    // Results should contain structured content
    const text = await portfolio.getResultsText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('dashboard section becomes visible after building', async ({ page }) => {
    await portfolio.configure({ method: 'equal_weight', topN: 5 });
    await portfolio.buildPortfolio();

    const dashboard = page.locator('#portfolioDashboardSection');
    await expect(dashboard).toBeVisible({ timeout: 5_000 });
  });
});
