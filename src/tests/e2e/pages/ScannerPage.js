/**
 * Page Object for the scanner control panel and results table.
 */
import { BasePage } from './BasePage.js';

export class ScannerPage extends BasePage {
  get marketSelect()   { return this.page.locator('#marketSelect'); }
  get strategySelect() { return this.page.locator('#strategySelect'); }
  get scanButton()     { return this.page.locator('#btnRunScan'); }
  get resultsTbody()   { return this.page.locator('#results'); }
  get viewModeSelect() { return this.page.locator('#viewMode'); }
  get statusText()     { return this.page.locator('#status'); }
  get portfolioSection() { return this.page.locator('#portfolioSection'); }
  get regimeIndicator() { return this.page.locator('#regimeIndicator'); }
  get sectorSummary()  { return this.page.locator('#sectorSummary'); }

  async selectMarket(value) {
    await this.marketSelect.selectOption(value);
  }

  async selectStrategy(value) {
    await this.strategySelect.selectOption(value);
  }

  async runScan() {
    await this.scanButton.click();
    await this.waitForScanComplete();
  }

  async getResultRows() {
    return this.resultsTbody.locator('tr');
  }

  async getResultCount() {
    return (await this.getResultRows()).count();
  }

  async clickResultRow(index) {
    const rows = await this.getResultRows();
    await rows.nth(index).click();
  }

  async changeViewMode(value) {
    await this.viewModeSelect.selectOption(value);
  }

  async isScanButtonDisabled() {
    return this.scanButton.isDisabled();
  }
}
