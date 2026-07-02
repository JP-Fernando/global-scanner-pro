/**
 * Service worker — PWA Foundation (local-first).
 *
 * Plain JS, served as-is from the repo root by Express in every mode (dev, test,
 * production). No build step touches this file, so it cannot precache hashed Vite
 * asset filenames (those only exist after `vite build`, which never runs in dev/test).
 * Instead it precaches a small set of stable-path shell files and relies on runtime
 * caching for whatever script/style URLs the browser actually requests — this works
 * whether those URLs are unhashed (dev/test) or content-hashed (production).
 *
 * Market data (`/universes/**`, `/api/v1/yahoo`, `/api/v1/health`) is deliberately
 * NOT intercepted here — it always goes straight to the network. Offline review of
 * the last scan/simulation is handled by the app itself (see persistLastScan /
 * restoreLastScanFromCache in src/core/scanner.ts), which stores the fully computed
 * results in IndexedDB rather than raw API responses. Keeping data requests out of
 * the service worker also keeps them script-mockable in tests (a SW-level `fetch()`
 * runs outside the page's own network stack and would bypass page-scoped mocks).
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `gsp-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `gsp-runtime-${CACHE_VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, RUNTIME_CACHE];

const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.ico'
];

// Replaced at build time for production with the hashed Vite asset graph. In
// dev/test it falls back to the stable root-served module paths used by
// index.html, letting the second visit boot offline without requiring a prior
// runtime-caching pass.
const APP_SHELL_ASSETS = [
  '/src/dashboard/attribution-dashboard.css',
  '/dist/src/core/scanner.js',
  '/dist/src/i18n/ui-translator.js',
  '/dist/src/i18n/ui-init.js',
  '/dist/src/pwa/pwa-init.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([...new Set([...SHELL_URLS, ...APP_SHELL_ASSETS])]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !CURRENT_CACHES.includes(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Static build assets: scripts/styles/fonts/images requested by the app shell. */
function isStaticAsset(request) {
  return ['script', 'style', 'font', 'image'].includes(request.destination);
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || networkFetch;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests — let cross-origin CDN scripts (chart.js, xlsx,
  // jsPDF) pass through natively rather than deal with opaque-response caching.
  if (url.origin !== self.location.origin) return;

  // Never intercept non-GET requests (POST /api/v1/simulate, /api/v1/auth/*, etc.) —
  // the Cache API cannot meaningfully cache/replay them.
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', response.clone()));
          }
          return response;
        })
        .catch(() => caches.match('/index.html', { cacheName: SHELL_CACHE }))
    );
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});
