import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const { Response } = globalThis;
const source = readFileSync(new URL('../../../sw.js', import.meta.url), 'utf8');
function worker({ active = null, cached, failWrites = false, offline = false } = {}) {
  const listeners = {};
  const cache = { addAll: vi.fn(async () => {}), put: vi.fn(async () => { if (failWrites) throw new Error('quota'); }) };
  const caches = { open: vi.fn(async () => cache), match: vi.fn(async request => cached?.(request)),
    keys: vi.fn(async () => ['unrelated-app', 'gsp-%2F-shell-old']), delete: vi.fn(async () => true) };
  const self = { location: { origin: 'https://scanner.test' }, registration: { active },
    addEventListener: (name, callback) => { listeners[name] = callback; },
    skipWaiting: vi.fn(async () => {}), clients: { claim: vi.fn(async () => {}) } };
  const fetch = vi.fn(async () => { if (offline) throw new Error('offline'); return new Response('online'); });
  runInNewContext(source, { self, caches, fetch, Response, URL });
  async function lifecycle(name, extra = {}) {
    const promises = [];
    listeners[name]({ ...extra, waitUntil: promise => promises.push(promise) });
    await Promise.all(promises);
  }
  async function request(url, options = {}) {
    let response; const background = [];
    listeners.fetch({ request: { url: 'https://scanner.test' + url, method: 'GET', mode: 'cors', destination: 'script', ...options },
      respondWith: promise => { response = promise; }, waitUntil: promise => background.push(promise) });
    const result = await response; await Promise.all(background); return result;
  }
  return { self, caches, cache, fetch, lifecycle, request };
}
describe('versioned offline shell', () => {
  it('keeps Android and desktop HTML paired with the installed asset graph', async () => {
    const runtime = worker({ cached: request => new Response(String(request)) });
    expect(await (await runtime.request('/android.html', { mode: 'navigate' })).text()).toBe('/android.html');
    expect(await (await runtime.request('/', { mode: 'navigate' })).text()).toBe('/index.html');
    expect(runtime.fetch).not.toHaveBeenCalled();
  });
  it('leaves server-rendered navigations (Swagger UI, metrics, API) to the network', async () => {
    const runtime = worker({ cached: request => new Response(String(request)) });
    for (const path of ['/api-docs/', '/api-docs.json', '/metrics', '/api/v1/health']) {
      expect(await runtime.request(path, { mode: 'navigate' })).toBeUndefined();
    }
  });
  it('serves network assets even when cache writes fail', async () => {
    const runtime = worker({ failWrites: true });
    expect(await (await runtime.request('/assets/app.js')).text()).toBe('online');
  });
  it('serves a cached static asset offline and excludes API POSTs and cross-origin resources', async () => {
    const runtime = worker({ offline: true, cached: () => new Response('saved') });
    expect(await (await runtime.request('/assets/app.js')).text()).toBe('saved');
    expect(await runtime.request('/api/v1/simulate', { method: 'POST' })).toBeUndefined();
    expect(await runtime.request('/api/yahoo', { destination: '' })).toBeUndefined();
    expect(await runtime.request('/other.js', { url: 'https://other.test/app.js' })).toBeUndefined();
  });
  it('requires explicit activation when an old worker is active and limits cleanup to its scope', async () => {
    const runtime = worker({ active: {} });
    await runtime.lifecycle('install'); expect(runtime.self.skipWaiting).not.toHaveBeenCalled();
    await runtime.lifecycle('message', { data: { type: 'ACTIVATE_UPDATE' } });
    expect(runtime.self.skipWaiting).toHaveBeenCalledOnce();
    await runtime.lifecycle('activate');
    expect(runtime.caches.delete).toHaveBeenCalledWith('gsp-%2F-shell-old');
    expect(runtime.caches.delete).not.toHaveBeenCalledWith('unrelated-app');
  });
  it('activates the first install after a complete precache and leaves a failed update inactive', async () => {
    const runtime = worker(); await runtime.lifecycle('install');
    expect(runtime.cache.addAll.mock.calls[0][0]).toContain('/android.webmanifest');
    expect(runtime.self.skipWaiting).toHaveBeenCalledOnce();
    const update = worker({ active: {} }); update.cache.addAll.mockRejectedValueOnce(new Error('missing asset'));
    await expect(update.lifecycle('install')).rejects.toThrow('missing asset');
    expect(update.self.skipWaiting).not.toHaveBeenCalled();
  });
});
