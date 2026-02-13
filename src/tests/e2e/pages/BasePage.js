/**
 * Base Page Object — shared helpers for all page objects.
 */
export class BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /** Read the #status element's text content. */
  async getStatusText() {
    return this.page.locator('#status').textContent();
  }

  /** Wait for the scan button to re-enable (scan complete). */
  async waitForScanComplete() {
    await this.page.waitForFunction(
      () => {
        const btn = document.getElementById('btnRunScan');
        return btn && !btn.disabled;
      },
      { timeout: 45_000 },
    );
  }

  /** Get the page title text from header h1. */
  async getHeaderTitle() {
    return this.page.locator('.header h1').textContent();
  }

  /** Get the current language from #languageSelect. */
  async getCurrentLanguage() {
    return this.page.locator('#languageSelect').inputValue();
  }

  /** Switch UI language. */
  async setLanguage(lang) {
    await this.page.locator('#languageSelect').selectOption(lang);
    // Allow i18n to update the DOM
    await this.page.waitForTimeout(300);
  }
}
