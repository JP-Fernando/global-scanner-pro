// =====================================================
// GLOBAL TEST SETUP (Node-friendly browser mocks)
// =====================================================

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