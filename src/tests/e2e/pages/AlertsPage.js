/**
 * Page Object for the alert configuration section.
 */
import { BasePage } from './BasePage.js';

export class AlertsPage extends BasePage {
  get volatilityThreshold() { return this.page.locator('#alertVolatilityThreshold'); }
  get drawdownThreshold()   { return this.page.locator('#alertDrawdownThreshold'); }
  get scoreThreshold()      { return this.page.locator('#alertScoreThreshold'); }
  get emailInput()          { return this.page.locator('#alertEmail'); }
  get webhookInput()        { return this.page.locator('#alertWebhook'); }
  get slackInput()          { return this.page.locator('#alertSlack'); }
  get teamsInput()          { return this.page.locator('#alertTeams'); }
  get zapierInput()         { return this.page.locator('#alertZapier'); }
  get notifySignals()       { return this.page.locator('#alertNotifySignals'); }
  get notifyRebalances()    { return this.page.locator('#alertNotifyRebalances'); }
  get notifyRisk()          { return this.page.locator('#alertNotifyRisk'); }
  get saveButton()          { return this.page.locator('#saveAlertSettingsBtn'); }
  get statusMessage()       { return this.page.locator('#alertSettingsStatus'); }
  get clearLogBtn()         { return this.page.locator('#clearAlertsLogBtn'); }
  get alertsLogContainer()  { return this.page.locator('#alertsLogContainer'); }

  async fillThresholds({ volatility, drawdown, score } = {}) {
    if (volatility !== undefined) {
      await this.volatilityThreshold.fill('');
      await this.volatilityThreshold.fill(String(volatility));
    }
    if (drawdown !== undefined) {
      await this.drawdownThreshold.fill('');
      await this.drawdownThreshold.fill(String(drawdown));
    }
    if (score !== undefined) {
      await this.scoreThreshold.fill('');
      await this.scoreThreshold.fill(String(score));
    }
  }

  async fillChannels({ email, webhook, slack } = {}) {
    if (email)   await this.emailInput.fill(email);
    if (webhook) await this.webhookInput.fill(webhook);
    if (slack)   await this.slackInput.fill(slack);
  }

  async toggleNotifications({ signals, rebalances, risk } = {}) {
    if (signals)    await this.notifySignals.check();
    if (rebalances) await this.notifyRebalances.check();
    if (risk)       await this.notifyRisk.check();
  }

  async saveSettings() {
    await this.saveButton.click();
    await this.page.waitForTimeout(500);
  }

  async getStatusText() {
    return this.statusMessage.textContent();
  }
}
