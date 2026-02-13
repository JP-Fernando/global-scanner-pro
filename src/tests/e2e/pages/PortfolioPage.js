/**
 * Page Object for the portfolio builder section.
 */
import { BasePage } from './BasePage.js';

export class PortfolioPage extends BasePage {
  get allocationMethod() { return this.page.locator('#allocationMethod'); }
  get topNAssets()       { return this.page.locator('#topNAssets'); }
  get totalCapital()     { return this.page.locator('#totalCapital'); }
  get riskProfile()      { return this.page.locator('#riskProfile'); }
  get buildButton()      { return this.page.locator('button[onclick="buildPortfolio()"]'); }
  get portfolioResults() { return this.page.locator('#portfolioResults'); }
  get portfolioSection() { return this.page.locator('#portfolioSection'); }

  async configure({ method, topN, capital, risk } = {}) {
    if (method) await this.allocationMethod.selectOption(method);
    if (topN) {
      await this.topNAssets.fill('');
      await this.topNAssets.fill(String(topN));
    }
    if (capital) {
      await this.totalCapital.fill('');
      await this.totalCapital.fill(String(capital));
    }
    if (risk) await this.riskProfile.selectOption(risk);
  }

  async buildPortfolio() {
    await this.buildButton.click();
    await this.portfolioResults.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async isPortfolioSectionVisible() {
    return this.portfolioSection.isVisible();
  }

  async isResultsVisible() {
    return this.portfolioResults.isVisible();
  }

  async getResultsText() {
    return this.portfolioResults.textContent();
  }
}
