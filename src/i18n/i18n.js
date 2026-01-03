// =====================================================
// INTERNATIONALISATION ENGINE
// =====================================================

import es from './translations/es.js';
import en from './translations/en.js';

const translations = {
  es,
  en
};

class I18n {
  constructor() {
    this.currentLang = this.getDefaultLanguage();
    this.translations = translations;
  }

  getDefaultLanguage() {
    // Check localStorage first
    const saved = localStorage.getItem('language');
    if (saved && translations[saved]) {
      return saved;
    }
    // Default to Spanish (European)
    return 'es';
  }

  setLanguage(lang) {
    if (!translations[lang]) {
      console.warn(`Language '${lang}' not available. Falling back to 'es'.`);
      lang = 'es';
    }
    this.currentLang = lang;
    localStorage.setItem('language', lang);

    // Trigger language change event
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }

  getCurrentLanguage() {
    return this.currentLang;
  }

  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations[this.currentLang];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        console.warn(`Translation key '${key}' not found for language '${this.currentLang}'`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation key '${key}' does not resolve to a string`);
      return key;
    }

    // Replace parameters in the format {param}
    return value.replace(/\{(\w+)\}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  }

  // Shorthand for translation
  get(key, params) {
    return this.t(key, params);
  }
}

// Create singleton instance
const i18n = new I18n();

// Export both the instance and the class
export default i18n;
export { I18n };
