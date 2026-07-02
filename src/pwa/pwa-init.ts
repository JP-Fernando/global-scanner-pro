// =====================================================
// PWA INITIALISATION — Phase 5.5.3.1 (local-first PWA foundation)
// Registers the service worker, wires the custom "Install app" button via
// beforeinstallprompt, and shows an offline banner that restores the last
// successful scan from IndexedDB for offline review.
// =====================================================

import { restoreLastScanFromCache, restoreLastSimulationFromCache } from '../core/scanner.js';
import i18n from '../i18n/i18n.js';

/** Chrome/Edge-only event — not yet part of the standard lib.dom.d.ts Event map. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

/** True when the app is already running as an installed/standalone PWA. */
export function isStandaloneDisplay(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
}

/** Toggles the install button's visibility. Pure w.r.t. the element passed in — testable without a real DOM. */
export function setInstallButtonVisible(button: HTMLElement | null, visible: boolean): void {
  if (!button) return;
  button.style.display = visible ? 'inline-block' : 'none';
}

/**
 * Toggles the offline banner and fills in a locale-formatted "last saved" timestamp.
 * Pure w.r.t. the elements passed in — testable without a real DOM.
 */
export function setOfflineBannerState(
  banner: HTMLElement | null,
  timestampEl: HTMLElement | null,
  isOnline: boolean,
  lastSavedAt: number | null
): void {
  if (!banner) return;
  banner.style.display = isOnline ? 'none' : 'flex';
  if (timestampEl) {
    timestampEl.textContent =
      !isOnline && lastSavedAt ? new Date(lastSavedAt).toLocaleString(i18n.getCurrentLanguage()) : '';
  }
}

/** Registers the app-shell/offline service worker. Best-effort — never throws. */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  } catch (e: any) {
    console.warn('Service worker registration failed:', e?.message);
  }
}

async function restoreOfflineSession(): Promise<number | null> {
  const scanTimestamp = await restoreLastScanFromCache();
  const simulationTimestamp = scanTimestamp ? await restoreLastSimulationFromCache() : null;
  return Math.max(scanTimestamp ?? 0, simulationTimestamp ?? 0) || null;
}

function initInstallPrompt(): void {
  const btn = document.getElementById('btnInstallApp');

  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    setInstallButtonVisible(btn, !isStandaloneDisplay());
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    setInstallButtonVisible(btn, false);
  });

  btn?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    setInstallButtonVisible(btn, false);
  });

  if (isStandaloneDisplay()) {
    setInstallButtonVisible(btn, false);
  }
}

/**
 * Wires the offline banner. Restoring the last saved scan only happens once, at
 * cold load while already offline — later `offline` events during an active
 * session only toggle the banner, so a flaky connection never clobbers results
 * the user is actively looking at.
 */
function initOfflineBanner(): void {
  const banner = document.getElementById('offlineBanner');
  const timestampEl = document.getElementById('offlineBannerTimestamp');

  window.addEventListener('online', () => setOfflineBannerState(banner, timestampEl, true, null));
  window.addEventListener('offline', () => {
    setOfflineBannerState(banner, timestampEl, false, null);
  });

  if (!navigator.onLine) {
    restoreOfflineSession()
      .then((timestamp) => setOfflineBannerState(banner, timestampEl, false, timestamp))
      .catch(() => setOfflineBannerState(banner, timestampEl, false, null));
  }
}

export function initPwa(): void {
  registerServiceWorker();
  initInstallPrompt();
  initOfflineBanner();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPwa);
} else {
  initPwa();
}
