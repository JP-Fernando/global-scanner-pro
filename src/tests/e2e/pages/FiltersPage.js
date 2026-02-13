/**
 * Page Object for the quick filters panel.
 */
import { BasePage } from './BasePage.js';

export class FiltersPage extends BasePage {
  get searchInput()     { return this.page.locator('#searchInput'); }
  get signalFilter()    { return this.page.locator('#signalFilter'); }
  get minScoreSlider()  { return this.page.locator('#minScore'); }
  get minScoreValue()   { return this.page.locator('#minScoreValue'); }
  get volumeFilter()    { return this.page.locator('#volumeFilter'); }
  get clearFiltersBtn() { return this.page.locator('#clearFiltersBtn'); }
  get filterSummary()   { return this.page.locator('#filterSummary'); }
  get resultRows()      { return this.page.locator('#results tr'); }

  async searchByText(text) {
    await this.searchInput.fill(text);
    await this.page.waitForTimeout(400);
  }

  async filterBySignal(signal) {
    await this.signalFilter.selectOption(signal);
    await this.page.waitForTimeout(200);
  }

  async setMinScore(value) {
    await this.minScoreSlider.fill(String(value));
    await this.minScoreSlider.dispatchEvent('input');
    await this.page.waitForTimeout(200);
  }

  async filterByVolume(value) {
    await this.volumeFilter.selectOption(value);
    await this.page.waitForTimeout(200);
  }

  async clearFilters() {
    await this.clearFiltersBtn.click();
    await this.page.waitForTimeout(200);
  }

  async getVisibleRowCount() {
    return this.resultRows.count();
  }

  async getFilterSummaryText() {
    return this.filterSummary.textContent();
  }
}
