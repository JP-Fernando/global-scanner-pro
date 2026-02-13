/**
 * Page Object for the portfolio tracking dashboard.
 */
import { BasePage } from './BasePage.js';

export class DashboardPage extends BasePage {
  get dashboardSection()  { return this.page.locator('#portfolioDashboardSection'); }
  get portfolioSelector() { return this.page.locator('#portfolioSelector'); }
  get positionsTable()    { return this.page.locator('#positionsTableBody'); }
  get portfolioChart()    { return this.page.locator('#portfolioChart'); }
  get totalValueCard()    { return this.page.locator('#totalValueCard'); }
  get totalReturnCard()   { return this.page.locator('#totalReturnCard'); }
  get sharpeRatioCard()   { return this.page.locator('#sharpeRatioCard'); }
  get maxDrawdownCard()   { return this.page.locator('#maxDrawdownCard'); }
  get deletePortfolioBtn() { return this.page.locator('#deletePortfolioBtn'); }
  get refreshBtn()        { return this.page.locator('#refreshDashboardBtn'); }

  async isDashboardVisible() {
    return this.dashboardSection.isVisible();
  }

  async selectPortfolio(value) {
    await this.portfolioSelector.selectOption(value);
    await this.page.waitForTimeout(500);
  }

  async getPortfolioOptions() {
    return this.portfolioSelector.locator('option').allTextContents();
  }

  async switchChartTab(tab) {
    await this.page.locator(`button[data-tab="${tab}"]`).click();
    await this.page.waitForTimeout(300);
  }

  async getPositionRowCount() {
    return this.positionsTable.locator('tr').count();
  }
}
