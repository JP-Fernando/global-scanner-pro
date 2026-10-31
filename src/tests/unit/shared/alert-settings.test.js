import { describe, expect, it, vi } from 'vitest';
import {
  buildAlertSettingsUpdate,
  getAlertSettings,
  saveAlertSettings,
} from '../../../shared/frontend/alert-settings.js';

function createStore() {
  const records = new Map();
  return {
    records,
    getAlertSettings: vi.fn(async id => globalThis.structuredClone(records.get(id) ?? null)),
    saveAlertSettings: vi.fn(async record => records.set(record.id, globalThis.structuredClone(record))),
  };
}

describe('shared alert settings service', () => {
  it('persists defaults independently for each user and strategy', async () => {
    const store = createStore();
    const initial = await getAlertSettings('balanced', 'alice', store);
    await saveAlertSettings({ ...initial, thresholds: { score: 95 } }, store);

    expect((await getAlertSettings('balanced', 'alice', store)).thresholds).toEqual({
      volatility_pct: 25, drawdown_pct: -15, score: 95,
    });
    const otherUser = await getAlertSettings('balanced', 'bob', store);
    const otherStrategy = await getAlertSettings('aggressive', 'alice', store);
    expect(otherUser.id).toBe('bob:balanced');
    expect(otherStrategy.id).toBe('alice:aggressive');
    expect(otherUser.thresholds.score).toBe(80);
    expect(otherStrategy.thresholds.score).toBe(80);
    expect(initial.created_at).toBeTruthy();
  });

  it('reads partial legacy records without losing channels or disabled notifications', async () => {
    const store = createStore();
    store.records.set('default:balanced', {
      id: 'default:balanced', strategy: 'balanced',
      thresholds: { drawdown_pct: 20 },
      channels: { slack: 'https://example.test/slack' },
      notifyOn: { riskEvents: false },
    });
    const settings = await getAlertSettings('balanced', 'default', store);
    expect(settings.thresholds).toEqual({ volatility_pct: 25, drawdown_pct: -20, score: 80 });
    expect(settings.channels.email).toBe('');
    expect(settings.channels.slack).toBe('https://example.test/slack');
    expect(settings.notifyOn).toEqual({ strongSignals: true, rebalances: true, riskEvents: false });
    expect(store.saveAlertSettings).not.toHaveBeenCalled();
  });

  it('backfills index fields missing from legacy records', async () => {
    const store = createStore();
    store.records.set('alice:balanced', { id: 'alice:balanced' });
    const settings = await getAlertSettings('balanced', 'alice', store);
    expect(settings.strategy).toBe('balanced');
    expect(settings.user_id).toBe('alice');
  });

  it('retains blank thresholds and metadata, while allowing cleared channels and false toggles', async () => {
    const store = createStore();
    const existing = await getAlertSettings('balanced', 'default', store);
    const update = buildAlertSettingsUpdate(existing, {
      thresholds: { volatility_pct: NaN, drawdown_pct: 18, score: 0 },
      channels: { email: '', webhook: '', slack: '', teams: '', zapier: '' },
      notifyOn: { strongSignals: false, rebalances: false, riskEvents: false },
    });
    expect(existing.thresholds.drawdown_pct).toBe(-15);
    expect(update.thresholds.volatility_pct).toBe(25);
    expect(update.id).toBe(existing.id);
    expect(update.created_at).toBe(existing.created_at);
    const saved = await saveAlertSettings(update, store);
    const loaded = await getAlertSettings('balanced', 'default', store);
    expect(loaded).toEqual(saved);
    expect(loaded.thresholds).toEqual({ volatility_pct: 25, drawdown_pct: -18, score: 0 });
    expect(loaded.notifyOn.riskEvents).toBe(false);
    expect(update.thresholds.drawdown_pct).toBe(18);
  });

  it('propagates storage failures so the caller cannot report a successful save', async () => {
    const store = createStore();
    const settings = await getAlertSettings('balanced', 'default', store);
    store.saveAlertSettings.mockRejectedValue(new Error('storage unavailable'));
    await expect(saveAlertSettings(settings, store)).rejects.toThrow('storage unavailable');
    store.getAlertSettings.mockRejectedValue(new Error('read failed'));
    await expect(getAlertSettings('balanced', 'default', store)).rejects.toThrow('read failed');
  });
});
