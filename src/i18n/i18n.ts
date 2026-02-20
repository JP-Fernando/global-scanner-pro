// =====================================================
// INTERNATIONALISATION ENGINE
// =====================================================

import es from './translations/es.js';
import en from './translations/en.js';

type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationMap = Record<string, TranslationValue>;

const translations: Record<string, TranslationMap> = {
  es,
  en
};

class I18n {
  currentLang: string;
  translations: Record<string, TranslationMap>;

  constructor() {
    this.currentLang = this.getDefaultLanguage();
    this.translations = translations;
  }

  getDefaultLanguage(): string {
    // Check localStorage first
    const saved = localStorage.getItem('language');
    if (saved && translations[saved]) {
      return saved;
    }
    // Default to Spanish (European)
    return 'es';
  }

  setLanguage(newLang: string): void {
    let langToUse = newLang;
    if (!translations[langToUse]) {
      console.warn(`Language '${langToUse}' not available. Falling back to 'es'.`);
      langToUse = 'es';
    }
    this.currentLang = langToUse;
    localStorage.setItem('language', langToUse);

    // Trigger language change event (CustomEvent is a global browser API)
     
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: langToUse } }));
  }

  getCurrentLanguage(): string {
    return this.currentLang;
  }

  t(key: string, params: Record<string, string> = {}): string {
    const keys = key.split('.');
    let value: TranslationValue | undefined = this.translations[this.currentLang] as TranslationValue;

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, TranslationValue>)[k];
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
    return value.replace(/\{(\w+)\}/g, (match: string, param: string) => {
      return params[param] !== undefined ? params[param] : match;
    });
  }

  // Shorthand for translation
  get(key: string, params?: Record<string, string>): string {
    return this.t(key, params);
  }
}

// Create singleton instance
const i18n = new I18n();

// Export both the instance and the class
export default i18n;
export { I18n };
