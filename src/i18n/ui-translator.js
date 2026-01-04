// =====================================================
// UI TRANSLATOR
// Dynamic UI translation helper
// =====================================================

import i18n from './i18n.js';

class UITranslator {
  constructor() {
    this.i18n = i18n;
    this.initialize();
  }

  initialize() {
    // Listen for language changes
    window.addEventListener('languageChanged', () => {
      this.translatePage();
    });

    // Initial translation
    this.translatePage();
  }

  translatePage() {
    // Update HTML lang attribute
    document.documentElement.lang = this.i18n.getCurrentLanguage();

    // Translate all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.i18n.t(key);

      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = translation;
      } else if (element.tagName === 'IMG') {
        element.alt = translation;
      } else {
        element.textContent = translation;
      }
    });

    // Translate all elements with data-i18n-html attribute (for HTML content)
    document.querySelectorAll('[data-i18n-html]').forEach(element => {
      const key = element.getAttribute('data-i18n-html');
      element.innerHTML = this.i18n.t(key);
    });

    // Translate all elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.i18n.t(key);
    });

    // Translate all elements with data-i18n-label attribute (e.g. optgroup labels)
    document.querySelectorAll('[data-i18n-label]').forEach(element => {
      const key = element.getAttribute('data-i18n-label');
      element.setAttribute('label', this.i18n.t(key));
    });

  }

  setLanguage(lang) {
    this.i18n.setLanguage(lang);
  }

  getCurrentLanguage() {
    return this.i18n.getCurrentLanguage();
  }

  t(key, params) {
    return this.i18n.t(key, params);
  }
}

// Create singleton instance
const uiTranslator = new UITranslator();

// Helper function for getting translations directly
export function getTranslation(key, params = {}) {
  return i18n.t(key, params);
}

// Export both the instance and the i18n for direct access
export default uiTranslator;
export { i18n };
