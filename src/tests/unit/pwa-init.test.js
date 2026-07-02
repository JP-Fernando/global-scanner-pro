/**
 * PWA Init Tests — Phase 5.5.3.1 (local-first PWA foundation)
 *
 * The module registers a service worker and wires up the install-prompt /
 * offline-banner listeners as a side effect of being imported. To keep that
 * side effect harmless under the Node-only Vitest environment (no real DOM),
 * minimal document/navigator/window mocks are installed before import —
 * mirroring the in-memory browser API mocks already used by
 * indexed-db-store.test.js and performance-tracker-extended.test.js.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock scanner.js so importing pwa-init.ts does not pull in the full,
// DOM-heavy scanner module.
vi.mock('../../core/scanner.js', () => ({
  restoreLastScanFromCache: vi.fn().mockResolvedValue(null),
  restoreLastSimulationFromCache: vi.fn().mockResolvedValue(null),
}));

// Minimal browser globals so the module's top-level init doesn't throw.
globalThis.navigator = { onLine: true };
globalThis.document = {
  readyState: 'complete',
  getElementById: () => null,
  addEventListener: () => {},
};
globalThis.window = {
  ...(globalThis.window || {}),
  addEventListener: () => {},
  matchMedia: () => ({ matches: false }),
};

const pwaInit = await import('../../pwa/pwa-init.js');
const scannerMock = await import('../../core/scanner.js');

describe('pwa-init', () => {
  beforeEach(() => {
    scannerMock.restoreLastScanFromCache.mockClear();
  });

  describe('isStandaloneDisplay', () => {
    it('returns true when the display-mode media query matches', () => {
      globalThis.window.matchMedia = () => ({ matches: true });
      expect(pwaInit.isStandaloneDisplay()).toBe(true);
    });

    it('returns false when the display-mode media query does not match', () => {
      globalThis.window.matchMedia = () => ({ matches: false });
      expect(pwaInit.isStandaloneDisplay()).toBe(false);
    });
  });

  describe('setInstallButtonVisible', () => {
    it('shows the button', () => {
      const button = { style: {} };
      pwaInit.setInstallButtonVisible(button, true);
      expect(button.style.display).toBe('inline-block');
    });

    it('hides the button', () => {
      const button = { style: { display: 'inline-block' } };
      pwaInit.setInstallButtonVisible(button, false);
      expect(button.style.display).toBe('none');
    });

    it('does nothing when the button element is missing', () => {
      expect(() => pwaInit.setInstallButtonVisible(null, true)).not.toThrow();
    });
  });

  describe('setOfflineBannerState', () => {
    it('hides the banner and clears the timestamp when online', () => {
      const banner = { style: {} };
      const timestampEl = { textContent: 'stale' };
      pwaInit.setOfflineBannerState(banner, timestampEl, true, 1700000000000);

      expect(banner.style.display).toBe('none');
      expect(timestampEl.textContent).toBe('');
    });

    it('shows the banner with a formatted timestamp when offline', () => {
      const banner = { style: {} };
      const timestampEl = { textContent: '' };
      pwaInit.setOfflineBannerState(banner, timestampEl, false, 1700000000000);

      expect(banner.style.display).toBe('flex');
      expect(timestampEl.textContent).not.toBe('');
    });

    it('shows the banner with an empty timestamp when nothing was saved', () => {
      const banner = { style: {} };
      const timestampEl = { textContent: '' };
      pwaInit.setOfflineBannerState(banner, timestampEl, false, null);

      expect(banner.style.display).toBe('flex');
      expect(timestampEl.textContent).toBe('');
    });

    it('does nothing when the banner element is missing', () => {
      expect(() => pwaInit.setOfflineBannerState(null, null, false, null)).not.toThrow();
    });
  });

  describe('registerServiceWorker', () => {
    it('registers /sw.js when the browser supports service workers', async () => {
      const register = vi.fn().mockResolvedValue({ scope: '/' });
      globalThis.navigator.serviceWorker = {
        register,
        ready: Promise.resolve({ active: { scriptURL: '/sw.js' } }),
      };

      await pwaInit.registerServiceWorker();
      expect(register).toHaveBeenCalledWith('/sw.js');

      delete globalThis.navigator.serviceWorker;
    });

    it('does nothing when the browser does not support service workers', async () => {
      delete globalThis.navigator.serviceWorker;
      await expect(pwaInit.registerServiceWorker()).resolves.toBeUndefined();
    });

    it('does not throw when registration fails', async () => {
      globalThis.navigator.serviceWorker = {
        register: vi.fn().mockRejectedValue(new Error('registration blocked')),
        ready: Promise.resolve({ active: { scriptURL: '/sw.js' } }),
      };

      await expect(pwaInit.registerServiceWorker()).resolves.toBeUndefined();
      delete globalThis.navigator.serviceWorker;
    });
  });
});
