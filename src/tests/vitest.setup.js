/**
 * Vitest Global Setup
 *
 * Sets up browser mocks and i18n for tests that depend on browser globals.
 * Equivalent to the old setup-globals.js but for the Vitest environment.
 */

// Browser global mocks (required by storage, UI, and report modules)
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
    },
  };
}

if (!globalThis.window) {
  globalThis.window = {
    dispatchEvent: () => {},
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

// Initialise i18n for modules that depend on it
const i18nModule = await import('../i18n/i18n.js');
const i18n = i18nModule.default;
i18n.setLanguage('en');

// Register custom Vitest matchers
import { expect } from 'vitest';

expect.extend({
  /**
   * Assert a number is approximately equal to an expected value
   * within a fixed absolute tolerance.
   *
   * Usage:  expect(actual).toBeApprox(expected, tolerance)
   */
  toBeApprox(received, expected, tolerance) {
    const diff = Math.abs(received - expected);
    const pass = diff <= tolerance;
    return {
      pass,
      message: () =>
        `expected ${received} to be within ${tolerance} of ${expected} (diff: ${diff})`,
    };
  },
});
