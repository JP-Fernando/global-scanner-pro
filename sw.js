/* global Response */
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

const CACHE_VERSION = 'v3';
// Replaced at build time by scripts/inject-vite-assets.js for subpath
// deployments (e.g. a GitHub Pages project page). Defaults to root, matching
// self-hosted Express where the app is always served at the domain root.
const BASE_PATH = '/';
const CACHE_PREFIX = `gsp-${encodeURIComponent(BASE_PATH)}-`;
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${CACHE_VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, RUNTIME_CACHE];

const SHELL_URLS = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}android.html`,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}android.webmanifest`,
  `${BASE_PATH}icons/icon-192.png`,
  `${BASE_PATH}icons/icon-512.png`,
  `${BASE_PATH}icons/icon-512-maskable.png`,
  `${BASE_PATH}icons/apple-touch-icon.png`,
  `${BASE_PATH}icons/favicon.ico`
];

// Replaced at build time for production with the hashed Vite asset graph. In
// dev/test it falls back to the stable root-served module paths used by
// index.html, letting the second visit boot offline without requiring a prior
// runtime-caching pass.
const APP_SHELL_ASSETS = [
  '/src/android/android.css',
  '/dist/src/android/app.js',
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
      .then(() => { if (!self.registration.active) return self.skipWaiting(); })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.includes(name))
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

// Cache persistence is best effort: a quota failure must not discard a network response.
async function cachedResponse(request, cacheName) {
  try { return await caches.match(request, { cacheName }); } catch { return undefined; }
}
async function cacheResponse(request, response, cacheName) {
  if (!response?.ok) return;
  try { const cache = await caches.open(cacheName); await cache.put(request, response.clone()); } catch { /* Online use remains available. */ }
}
async function staleWhileRevalidate(request, event) {
  const cached = await cachedResponse(request, RUNTIME_CACHE) || await cachedResponse(request, SHELL_CACHE);
  const network = fetch(request).then(async response => {
    await cacheResponse(request, response, RUNTIME_CACHE);
    return response;
  }).catch(() => cached || Response.error());
  event.waitUntil(network.then(() => undefined));
  return cached || network;
}
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});

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
    // Server-rendered pages (Swagger UI, Prometheus, API responses opened in a tab)
    // are not SPA routes; answering them with the cached shell would hide them.
    const relative = url.pathname.slice(BASE_PATH.length);
    if (/^(api(-docs)?([/.]|$)|metrics$)/.test(relative)) return;
    const shell = url.pathname === `${BASE_PATH}android.html`
      ? `${BASE_PATH}android.html` : `${BASE_PATH}index.html`;
    event.respondWith((async () => {
      const cached = await cachedResponse(shell, SHELL_CACHE);
      // Keep HTML paired with this worker's precached asset graph until activation.
      if (cached) return cached;
      try {
        const response = await fetch(request);
        await cacheResponse(shell, response, SHELL_CACHE);
        return response;
      } catch { return Response.error(); }
    })());
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});
