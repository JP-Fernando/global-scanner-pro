/**
 * Shared E2E test utilities.
 */

import { setupAllMocks } from './api-mocks.js';

/**
 * Standard setup for tests that need scan results:
 * 1. Mock all APIs
 * 2. Navigate to page
 * 3. Run scan
 * 4. Wait for completion
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} [options]
 * @param {string} [options.market] - Market selector value
 * @param {string} [options.strategy] - Strategy selector value
 */
export async function setupWithCompletedScan(page, options = {}) {
  const {
    market = 'universes/bme_universe.json|.MC',
    strategy = 'balanced',
  } = options;

  await setupAllMocks(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Ensure critical elements are rendered before interacting
  await page.locator('#marketSelect').waitFor({ state: 'visible', timeout: 10_000 });

  await page.locator('#marketSelect').selectOption(market);
  await page.locator('#strategySelect').selectOption(strategy);

  await page.locator('#btnRunScan').click();

  // Wait for scan to complete (button re-enables)
  await page.waitForFunction(
    () => {
      const btn = document.getElementById('btnRunScan');
      return btn && !btn.disabled;
    },
    { timeout: 45_000 },
  );
}

/**
 * Clear IndexedDB databases to ensure clean state between tests.
 * @param {import('@playwright/test').Page} page
 */
export async function clearBrowserState(page) {
  await page.evaluate(async () => {
    // Clear localStorage
    localStorage.clear();
    // Delete known IndexedDB databases
    const dbs = await window.indexedDB.databases?.() || [];
    for (const db of dbs) {
      if (db.name) window.indexedDB.deleteDatabase(db.name);
    }
  });
}

/**
 * Get visible row count in the results table.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
export async function getVisibleResultCount(page) {
  return page.locator('#results tr').count();
}
