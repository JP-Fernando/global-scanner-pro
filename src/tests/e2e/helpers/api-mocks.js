/**
 * Playwright route interceptors for deterministic E2E tests.
 *
 * Intercepts browser-level fetch calls so the real Express server runs
 * but external API requests return fixture data.
 */

import { buildYahooChartResponse, TEST_UNIVERSE_BME } from '../fixtures/yahoo-responses.js';

/**
 * Intercept all /api/yahoo requests and return deterministic fixture data.
 * @param {import('@playwright/test').Page} page
 * @param {Object} [options]
 * @param {number} [options.delay=0] - Artificial delay in ms per response
 * @param {string[]} [options.failSymbols=[]] - Symbols that should return 500
 */
export async function setupYahooMock(page, options = {}) {
  const { delay = 0, failSymbols = [] } = options;

  await page.route('**/api/yahoo**', async (route) => {
    const url = new URL(route.request().url());
    const symbol = url.searchParams.get('symbol');

    if (failSymbols.includes(symbol)) {
      return route.fulfill({ status: 500, body: JSON.stringify({ error: 'Simulated failure' }) });
    }

    const response = buildYahooChartResponse(symbol, 300);

    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Intercept universe JSON file fetches and return a small test universe.
 * @param {import('@playwright/test').Page} page
 * @param {Object} [options]
 * @param {Array} [options.universe] - Custom universe array (defaults to BME 5 tickers)
 */
export async function setupUniverseMock(page, options = {}) {
  const { universe = TEST_UNIVERSE_BME } = options;

  await page.route('**/universes/**', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(universe),
    });
  });
}

/**
 * Set up all API mocks (Yahoo + universes) in one call.
 * @param {import('@playwright/test').Page} page
 * @param {Object} [options] - Options passed to setupYahooMock
 */
export async function setupAllMocks(page, options = {}) {
  await setupYahooMock(page, options);
  await setupUniverseMock(page, options);
}
