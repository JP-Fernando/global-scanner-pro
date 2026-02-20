// =====================================================
// UI TRANSLATOR
// Dynamic UI translation helper
// =====================================================

import i18n from './i18n.js';

class UITranslator {
  i18n: typeof i18n;

  constructor() {
    this.i18n = i18n;
    this.initialize();
  }

  initialize(): void {
    // Listen for language changes
    window.addEventListener('languageChanged', () => {
      this.translatePage();
    });

    // Initial translation
    this.translatePage();
  }

  translatePage(): void {
    // Update HTML lang attribute
    document.documentElement.lang = this.i18n.getCurrentLanguage();

    // Translate all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.getAttribute('data-i18n');
      if (!key) return;
      const translation = this.i18n.t(key);

      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        (element as HTMLInputElement).placeholder = translation;
      } else if (element.tagName === 'IMG') {
        (element as HTMLImageElement).alt = translation;
      } else {
        element.textContent = translation;
      }
    });

    // Translate all elements with data-i18n-html attribute (for HTML content)
    document.querySelectorAll('[data-i18n-html]').forEach((element) => {
      const key = element.getAttribute('data-i18n-html');
      if (!key) return;
      element.innerHTML = this.i18n.t(key);
    });

    // Translate all elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach((element) => {
      const key = element.getAttribute('data-i18n-title');
      if (!key) return;
      (element as HTMLElement).title = this.i18n.t(key);
    });

    // Translate all elements with data-i18n-label attribute (e.g. optgroup labels)
    document.querySelectorAll('[data-i18n-label]').forEach((element) => {
      const key = element.getAttribute('data-i18n-label');
      if (!key) return;
      element.setAttribute('label', this.i18n.t(key));
    });

  }

  setLanguage(lang: string): void {
    this.i18n.setLanguage(lang);
  }

  getCurrentLanguage(): string {
    return this.i18n.getCurrentLanguage();
  }

  t(key: string, params?: Record<string, string>): string {
    return this.i18n.t(key, params);
  }
}

// Create singleton instance
const uiTranslator = new UITranslator();

// Helper function for getting translations directly
export function getTranslation(key: string, params: Record<string, string> = {}): string {
  return i18n.t(key, params);
}

// Export both the instance and the i18n for direct access
export default uiTranslator;
export { i18n };
