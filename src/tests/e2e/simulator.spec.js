import { test, expect } from '@playwright/test';
import { setupWithCompletedScan } from './helpers/test-utils.js';
import { setupSimulationMock } from './helpers/api-mocks.js';

test.describe('Desktop simulator', () => {
  test.use({ viewport: { width: 1400, height: 1000 } });

  test('sends Yahoo symbols, amounts and horizon and preserves them across tabs', async ({ page }) => {
    const requests = await setupSimulationMock(page);
    await setupWithCompletedScan(page);
    const toggles = page.locator('.sim-select-toggle');
    const first = await toggles.nth(0).getAttribute('data-ticker');
    const second = await toggles.nth(1).getAttribute('data-ticker');
    await toggles.nth(0).click();
    await toggles.nth(1).click();
    await expect(page.locator('#detailModal')).not.toBeVisible();
    await page.locator('#mainTabSimulator').click();
    await expect(page.locator('#simCalculateBtn')).toBeEnabled();
    const amounts = page.locator('.sim-ticker-amount');
    await amounts.nth(0).fill('175');
    await amounts.nth(1).fill('225');
    await page.locator('#simPresetCustom').check();
    await page.locator('#simCalculateBtn').click();
    await expect(page.locator('#simSummary')).toContainText('$7,200');
    expect(requests.at(-1)).toEqual({
      tickers: [`${first}.MC`, `${second}.MC`],
      tickerInvestments: { [`${first}.MC`]: 175, [`${second}.MC`]: 225 }, horizonMonths: 18,
    });
    await expect(page.locator('#simBreakdownBody .sim-breakdown-row')).toHaveCount(2);
    const left = await page.locator('.sim-left').boundingBox();
    const right = await page.locator('.sim-right').boundingBox();
    expect(right.x).toBeGreaterThanOrEqual(left.x + left.width);
    await expect(page.locator('#simulatorChartCanvas')).toBeVisible();

    const requestCount = requests.length;
    await page.locator('#mainTabResults').click();
    await expect(page.locator('#tab-results')).toBeVisible();
    await expect(toggles).toHaveCount(5);
    await page.locator('#mainTabSimulator').click();
    await expect(amounts.nth(0)).toHaveValue('175');
    await expect(amounts.nth(1)).toHaveValue('225');
    await expect(page.locator('#simPresetCustom')).toBeChecked();
    await expect(page.locator('#simSummary')).toContainText('$7,200');
    expect(requests).toHaveLength(requestCount);
  });

  test('enforces four selections and clears the simulator after removing every security', async ({ page }) => {
    await setupSimulationMock(page);
    await setupWithCompletedScan(page);
    const toggles = page.locator('.sim-select-toggle');
    for (let i = 0; i < 4; i++) await toggles.nth(i).click();
    await expect(page.locator('.sim-select-toggle[aria-pressed="true"]')).toHaveCount(4);
    await expect(toggles.nth(4)).toBeDisabled();
    await toggles.nth(0).click();
    await expect(toggles.nth(4)).toBeEnabled();
    await toggles.nth(4).click();
    await page.locator('#mainTabSimulator').click();
    await expect(page.locator('.sim-ticker-amount')).toHaveCount(4);
    while (await page.locator('.sim-remove-btn').count()) {
      await page.locator('.sim-remove-btn').first().click();
    }
    await expect(page.locator('.sim-empty-state')).toBeVisible();
    await expect(page.locator('#simCalculateBtn')).toHaveCount(0);
    await page.locator('#mainTabResults').click();
    await expect(page.locator('.sim-select-toggle[aria-pressed="true"]')).toHaveCount(0);
    for (const toggle of await toggles.all()) await expect(toggle).toBeEnabled();
  });

  test('converts custom years to months and disables invalid inputs', async ({ page }) => {
    const requests = await setupSimulationMock(page);
    await setupWithCompletedScan(page);
    await page.locator('.sim-select-toggle').first().click();
    await page.locator('#mainTabSimulator').click();
    await expect(page.locator('#simCalculateBtn')).toBeEnabled();
    await page.locator('#simPresetCustom').check();
    await page.locator('#simCustomValue').fill('2');
    await expect(page.locator('#simCalculateBtn')).toBeEnabled();
    await page.locator('#simCustomUnit').selectOption('years');
    await expect(page.locator('#simSummary')).toContainText('$2,400');
    expect(requests.at(-1).horizonMonths).toBe(24);
    const requestCount = requests.length;
    await page.locator('#simCustomValue').fill('0');
    await expect(page.locator('#simCalculateBtn')).toBeDisabled();
    expect(requests).toHaveLength(requestCount);
    await page.locator('#simCustomValue').fill('3');
    await expect(page.locator('#simCalculateBtn')).toBeEnabled();
    await page.locator('.sim-ticker-amount').fill('0');
    await expect(page.locator('#simCalculateBtn')).toBeDisabled();
  });

  test('shows loading, surfaces API errors and allows retry', async ({ page }) => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const requests = await setupSimulationMock(page, { failFirst: 1, beforeRespond: () => gate });
    await setupWithCompletedScan(page);
    await page.locator('.sim-select-toggle').first().click();
    await page.locator('#mainTabSimulator').click();
    await expect(page.locator('#simLoading')).toBeVisible();
    await expect(page.locator('#simCalculateBtn')).toBeDisabled();
    release();
    await expect(page.locator('#simError')).toHaveText('Simulation temporarily unavailable');
    await expect(page.locator('#simLoading')).not.toBeVisible();
    await expect(page.locator('#simCalculateBtn')).toBeEnabled();
    await page.locator('#simCalculateBtn').click();
    await expect(page.locator('#simSummary')).toContainText('$6,000');
    await expect(page.locator('#simError')).toBeEmpty();
    expect(requests).toHaveLength(2);
  });

  test('changing the selection recalculates instead of reusing the previous projection', async ({ page }) => {
    const requests = await setupSimulationMock(page);
    await setupWithCompletedScan(page);
    await page.locator('.sim-select-toggle').nth(0).click();
    await page.locator('#mainTabSimulator').click();
    await expect(page.locator('#simSummary')).toContainText('$6,000');
    await page.locator('#mainTabResults').click();
    await page.locator('.sim-select-toggle').nth(0).click();
    const ticker = await page.locator('.sim-select-toggle').nth(1).getAttribute('data-ticker');
    await page.locator('.sim-select-toggle').nth(1).click();
    await page.locator('#mainTabSimulator').click();
    await expect(page.locator('#simBreakdownBody')).toContainText(`${ticker}.MC`);
    expect(requests.at(-1).tickers).toEqual([`${ticker}.MC`]);
  });

  test('a late response cannot overwrite a newer horizon projection', async ({ page }) => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let calls = 0;
    await setupSimulationMock(page, { beforeRespond: () => ++calls === 1 ? gate : undefined });
    await setupWithCompletedScan(page);
    await page.locator('.sim-select-toggle').first().click();
    await page.locator('#mainTabSimulator').click();
    await expect(page.locator('#simLoading')).toBeVisible();
    await page.locator('input[name="simHorizonPreset"][value="12"]').check();
    await expect(page.locator('#simSummary')).toContainText('$1,200');
    await expect(page.locator('#simCalculateBtn')).toBeEnabled();
    const oldResponse = page.waitForResponse(response =>
      response.url().endsWith('/api/v1/simulate')
      && response.request().postDataJSON().horizonMonths === 60);
    release();
    await (await oldResponse).finished();
    // Let the delivered response and its rendering callbacks finish before asserting.
    await page.evaluate(() => new Promise(resolve =>
      window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));
    await expect(page.locator('#simSummary')).toContainText('$1,200');
  });
});
