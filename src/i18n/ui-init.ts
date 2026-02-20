// =====================================================
// UI INITIALIZATION
// Initialize i18n system and expose global functions
// =====================================================

import uiTranslator, { i18n } from './ui-translator.js';

// Augment the Window interface with our global helpers
declare global {
  interface Window {
    changeLanguage: (lang: string) => void;
    getTranslation: (key: string, params?: Record<string, string>) => string;
  }
}

/**
 * Global function to change language
 * Called from the language selector in index.html
 * @param lang - Language code (es, en)
 */
window.changeLanguage = function(lang: string): void {
  if (!lang) return;

  uiTranslator.setLanguage(lang);

  // Update language selector value
  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    (languageSelect as HTMLSelectElement).value = lang;
  }

  console.log(`Language changed to: ${lang}`);
};

/**
 * Get translation helper
 * Exposed globally for use in other scripts
 * @param key - Translation key
 * @param params - Optional parameters
 * @returns Translated text
 */
window.getTranslation = function(key: string, params: Record<string, string> = {}): string {
  return i18n.t(key, params);
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('UI i18n initialized');
  });
} else {
  console.log('UI i18n initialized');
}

// Export for module usage
export { uiTranslator, i18n };
