/**
 * Page Object for the backtesting section.
 */
import { BasePage } from './BasePage.js';

export class BacktestPage extends BasePage {
  get topNAssets()        { return this.page.locator('#backtestTopN'); }
  get rebalanceDays()     { return this.page.locator('#backtestRebalance'); }
  get allocationMethod()  { return this.page.locator('#backtestAllocationMethod'); }
  get initialCapital()    { return this.page.locator('#backtestInitialCapital'); }
  get runButton()         { return this.page.locator('button[onclick="runBacktest()"]'); }
  get statusText()        { return this.page.locator('#backtestStatus'); }
  get resultsContainer()  { return this.page.locator('#backtestResults'); }

  async configure({ topN, rebalance, method, capital } = {}) {
    if (topN) {
      await this.topNAssets.fill('');
      await this.topNAssets.fill(String(topN));
    }
    if (rebalance) {
      await this.rebalanceDays.fill('');
      await this.rebalanceDays.fill(String(rebalance));
    }
    if (method) await this.allocationMethod.selectOption(method);
    if (capital) {
      await this.initialCapital.fill('');
      await this.initialCapital.fill(String(capital));
    }
  }

  async runBacktest() {
    await this.runButton.click();
    // Wait for results to become visible
    await this.resultsContainer.waitFor({ state: 'visible', timeout: 45_000 });
  }

  async isResultsVisible() {
    return this.resultsContainer.isVisible();
  }

  async getResultsText() {
    return this.resultsContainer.textContent();
  }
}
