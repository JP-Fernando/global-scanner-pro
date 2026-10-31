import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadOperationsSession, saveOperationsSession, OPERATIONS_SESSION_KEY } from '../../../android/operations-session.js';
import { createDefaultAlertSettings } from '../../../shared/frontend/alert-settings.js';

beforeEach(() => localStorage.clear());
describe('Android operational drafts', () => {
  it('restores builder, selected portfolio and per-strategy drafts independently of desktop', () => {
    const state = loadOperationsSession();
    state.builder.name = 'Draft'; state.builder.totalCapital = ''; state.portfolioId = 'p1';
    const record = createDefaultAlertSettings('balanced');
    state.alerts.balanced = { thresholds: record.thresholds, channels: record.channels, notifyOn: record.notifyOn, dirty: true };
    state.alerts.balanced.thresholds.score = NaN;
    localStorage.setItem('simulatorSelection', 'unchanged');
    expect(saveOperationsSession(state)).toBe(true);
    const restored = loadOperationsSession();
    expect(restored.portfolioId).toBe('p1');
    expect(restored.builder.totalCapital).toBe('');
    expect(restored.alerts.balanced.thresholds.score).toBeNaN();
    expect(localStorage.getItem('simulatorSelection')).toBe('unchanged');
  });
  it('rejects corrupt drafts and invalid catalogue values', () => {
    localStorage.setItem(OPERATIONS_SESSION_KEY, JSON.stringify({ builder: { method: 'bad', riskProfile: 'bad', name: 'A'.repeat(200) },
      portfolioScroll: -10, alertStrategy: 'constructor', alerts: { balanced: {}, unknown: {} } }));
    const restored = loadOperationsSession();
    expect(restored.builder.method).toBe('equal_weight');
    expect(restored.builder.riskProfile).toBe('moderate');
    expect(restored.builder.name).toHaveLength(120);
    expect(restored.alertStrategy).toBe('balanced');
    expect(restored.portfolioScroll).toBe(0);
    expect(restored.alerts).toEqual({});
    localStorage.setItem(OPERATIONS_SESSION_KEY, '{');
    expect(loadOperationsSession().portfolioId).toBe('');
  });
  it('allows in-memory use when local storage is blocked', () => {
    const get = vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const restored = loadOperationsSession();
    expect(saveOperationsSession(restored)).toBe(false);
    expect(restored.alertStrategy).toBe('balanced');
    get.mockRestore(); set.mockRestore();
  });
});
