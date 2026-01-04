// =====================================================
// GLOBAL TEST SETUP (Node-friendly browser mocks)
// =====================================================
// IMPORTANT: Browser globals must be set up BEFORE importing i18n

if (!globalThis.localStorage) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
}

if (!globalThis.window) {
  globalThis.window = {
    dispatchEvent: () => {}
  };
}

if (!globalThis.CustomEvent) {
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, detail = {}) {
      this.type = type;
      this.detail = detail;
    }
  };
}

// =====================================================
// I18N TEST CONFIGURATION
// =====================================================
// Force British English for all test outputs

// Import i18n AFTER setting up browser globals
const i18nModule = await import('../i18n/i18n.js');
const i18n = i18nModule.default;

// Set testing language to British English
i18n.setLanguage('en');

export { i18n };