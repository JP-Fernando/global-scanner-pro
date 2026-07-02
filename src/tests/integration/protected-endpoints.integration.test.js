import { describe, expect, it } from 'vitest';
import app from '../../../server.js';

function findRouteLayer(path, method) {
  return app._router.stack.find((layer) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });
}

function getRouteHandlers(path, method) {
  const layer = findRouteLayer(path, method);
  expect(layer, `Expected route ${method.toUpperCase()} ${path} to exist`).toBeTruthy();
  return layer.route.stack.map((routeLayer) => routeLayer.handle);
}

describe('Protected application endpoints', () => {
  it('leaves /api/v1/yahoo public (no login flow exists yet) but Yahoo-rate-limited', () => {
    const handlers = getRouteHandlers('/api/v1/yahoo', 'get');
    expect(handlers.some((handle) => handle.authGuard === 'requireAuth')).toBe(false);
  });

  it('protects analyst job endpoints with requireAuth and requireRole(admin,analyst)', () => {
    const routeSpecs = [
      ['post', '/api/v1/jobs/optimize'],
      ['post', '/api/v1/jobs/report'],
      ['post', '/api/v1/jobs/ml-train'],
      ['get', '/api/v1/jobs/:jobId'],
      ['get', '/api/v1/jobs']
    ];

    for (const [method, path] of routeSpecs) {
      const handlers = getRouteHandlers(path, method);
      expect(handlers.some((handle) => handle.authGuard === 'requireAuth')).toBe(true);
      expect(handlers.some((handle) => handle.roleGuard === 'admin,analyst')).toBe(true);
    }
  });

  it('protects /metrics with requireAuth and requireRole(admin)', () => {
    const handlers = getRouteHandlers('/metrics', 'get');
    expect(handlers.some((handle) => handle.authGuard === 'requireAuth')).toBe(true);
    expect(handlers.some((handle) => handle.roleGuard === 'admin')).toBe(true);
  });
});
