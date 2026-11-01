import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AndroidNavigation, NAVIGATION_KEY, isAndroidRoute } from '../../../android/navigation.js';
beforeEach(() => localStorage.clear());
describe('Android route recovery', () => {
  it('accepts known routes and encoded symbols and rejects malformed paths', () => {
    for (const path of ['scan', 'results', 'alerts', 'portfolios', 'simulator', 'asset/%5EGSPC', 'position/p1/SAN.MC']) {
      expect(isAndroidRoute(path)).toBe(true);
    }
    for (const path of ['', null, 'unknown', 'asset/%ZZ', 'position/p1', 'asset/', 'scan/extra', 'asset/' + 'A'.repeat(501)]) {
      expect(isAndroidRoute(path)).toBe(false);
    }
  });
  it('restores only validated bounded context and tolerates corrupt storage', () => {
    localStorage.setItem(NAVIGATION_KEY, JSON.stringify({ route: 'alerts', views: {
      alerts: { scroll: 99999999, details: { alertHistory: true, invalid: 'yes' }, focus: { name: 'alert-channel-email', selection: [2, 4] } },
      bad: { scroll: 50, details: {} }
    } }));
    const navigation = new AndroidNavigation(); expect(navigation.lastRoute).toBe('alerts');
    navigation.save();
    const stored = JSON.parse(localStorage.getItem(NAVIGATION_KEY));
    expect(stored.views.alerts.scroll).toBe(1e7);
    expect(stored.views.alerts.details).toEqual({ alertHistory: true });
    expect(stored.views.alerts.focus.selection).toEqual([2, 4]);
    expect(stored.views).not.toHaveProperty('bad');
    localStorage.setItem(NAVIGATION_KEY, '{'); expect(new AndroidNavigation().lastRoute).toBe('scan');
  });
  it('keeps a saved focus target only while the screen is still waiting to restore it', () => {
    // Minimal DOM: the suite runs in the node environment.
    const body = {};
    const input = { id: '', dataset: {}, getAttribute: name => (name === 'name' ? 'alert-channel-email' : null),
      focus: () => { globalThis.document.activeElement = input; } };
    const root = { dataset: {}, contains: node => node === input,
      querySelectorAll: selector => (selector === 'details[id]' ? [] : [input]) };
    const blur = () => { globalThis.document.activeElement = body; };
    vi.stubGlobal('document', { activeElement: body });
    vi.stubGlobal('window', { scrollY: 0, scrollTo: () => {} });
    try {
      const navigation = new AndroidNavigation();
      navigation.restore(root, 'alerts');
      input.focus(); navigation.capture(root);
      blur(); navigation.capture(root);
      navigation.restore(root, 'alerts');
      expect(document.activeElement).toBe(body);

      input.focus(); navigation.capture(root);
      blur();
      navigation.restore(root, 'alerts', false, false); navigation.capture(root);
      navigation.restore(root, 'alerts');
      expect(document.activeElement).toBe(input);
    } finally { vi.unstubAllGlobals(); }
  });
});
