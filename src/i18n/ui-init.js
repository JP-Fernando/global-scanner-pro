// =====================================================
// UI INITIALIZATION
// Initialize i18n system and expose global functions
// =====================================================

import uiTranslator, { i18n } from './ui-translator.js';

/**
 * Global function to change language
 * Called from the language selector in index.html
 * @param {string} lang - Language code (es, en)
 */
window.changeLanguage = function(lang) {
  if (!lang) return;

  uiTranslator.setLanguage(lang);

  // Update language selector value
  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    languageSelect.value = lang;
  }

  console.log(`Language changed to: ${lang}`);
};

/**
 * Get translation helper
 * Exposed globally for use in other scripts
 * @param {string} key - Translation key
 * @param {object} params - Optional parameters
 * @returns {string} Translated text
 */
window.getTranslation = function(key, params = {}) {
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
