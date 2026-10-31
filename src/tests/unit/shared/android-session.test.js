import { describe, expect, it } from 'vitest';
import { ANDROID_SESSION_KEY, defaultSession, loadAndroidSession, saveAndroidSession }
  from '../../../android/session.js';

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

describe('Android presentation session', () => {
  it('persists draft inputs under a dedicated key and preserves the desktop selection', () => {
    const store = storage({ simulatorSelection: '["SAN"]' });
    const draft = defaultSession();
    draft.selection = ['SAN.MC', 'SAN'];
    draft.investments = { 'SAN.MC': 50, SAN: 100 };
    draft.filter.query = 'bank';
    draft.resultsScroll = 400;
    expect(saveAndroidSession(draft, store)).toBe(true);
    expect(loadAndroidSession(store)).toEqual({ ...draft, hasDraft: true });
    expect(store.getItem('simulatorSelection')).toBe('["SAN"]');
  });

  it('tolerates malformed and unavailable storage', () => {
    for (const value of ['broken', 'null', '[]']) {
      expect(loadAndroidSession(storage({ [ANDROID_SESSION_KEY]: value }))).toEqual(defaultSession());
    }
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadAndroidSession(blocked)).toEqual(defaultSession());
    expect(saveAndroidSession(defaultSession(), blocked)).toBe(false);
    expect(saveAndroidSession(defaultSession(), null)).toBe(false);
  });

  it('validates restored view state and clamps selected instruments and amounts', () => {
    const store = storage({ [ANDROID_SESSION_KEY]: JSON.stringify({
      market: '../bad', strategy: 'missing', viewKey: '__proto__',
      selection: [' san.mc ', 'SAN.MC', 'SAN'], investments: { SAN: -10 },
      filter: { query: 'test', minScore: 999, signal: 'bad', volume: 'high' },
      horizon: { preset: -1, useCustom: true, customUnit: 'years', customValue: 3 },
    }) });
    const restored = loadAndroidSession(store);
    expect(restored.market).toBe('spain');
    expect(restored.strategy).toBe('balanced');
    expect(restored.viewKey).toBe('scoreTotal');
    expect(restored.selection).toEqual(['SAN.MC', 'SAN']);
    expect(restored.investments).toEqual({ 'SAN.MC': 100, SAN: 100 });
    expect(restored.filter).toEqual({ query: 'test', minScore: 100, signal: 'all', volume: 'high' });
    expect(restored.horizon).toEqual({ preset: 60, useCustom: true, customValue: 3, customUnit: 'years' });
  });
});
