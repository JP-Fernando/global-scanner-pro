/**
 * Integration tests: Alert Manager → Storage → Delivery
 *
 * Verifies the alert lifecycle: creation, persistence, throttling,
 * notification via channels, and log retrieval.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDbStore, buildAlertSettings } from './helpers.js';

// We need to mock the dbStore before importing alert-manager
const mockStore = createMockDbStore();

vi.mock('../../storage/indexed-db-store.js', () => ({
  dbStore: mockStore,
}));

// Import after mock
const {
  createAlert,
  getAlertSettings,
  saveAlertSettings,
  getAlertLogs,
  notifyStrongSignals,
  notifyRebalance,
} = await import('../../alerts/alert-manager.js');

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Clear mock store state
  mockStore._alerts.length = 0;
  mockStore._alertSettings.clear();
  vi.clearAllMocks();

  // Reset fetch mock
  globalThis.fetch = vi.fn();
});

// ---------------------------------------------------------------------------
// 1. Alert creation and persistence
// ---------------------------------------------------------------------------

describe('Alert creation and persistence', () => {
  it('creates an alert and persists it to storage', async () => {
    const settings = buildAlertSettings();
    mockStore._alertSettings.set(settings.id, settings);

    const alert = await createAlert({
      strategy: 'momentum',
      type: 'signal',
      severity: 'info',
      title: 'Test Alert',
      message: 'This is a test alert',
    });

    expect(alert).not.toBeNull();
    expect(alert.id).toBeTruthy();
    expect(alert.strategy).toBe('momentum');
    expect(alert.type).toBe('signal');
    expect(alert.title).toBe('Test Alert');
    expect(alert.created_at).toBeTruthy();

    // Verify persisted
    expect(mockStore.saveAlert).toHaveBeenCalled();
    expect(mockStore._alerts.length).toBeGreaterThan(0);
    expect(mockStore._alerts[0].strategy).toBe('momentum');
  });

  it('retrieves alert logs by strategy', async () => {
    // Create two alerts with different strategies
    const settings1 = buildAlertSettings({ id: 'default:momentum', strategy: 'momentum' });
    const settings2 = buildAlertSettings({ id: 'default:balanced', strategy: 'balanced' });
    mockStore._alertSettings.set(settings1.id, settings1);
    mockStore._alertSettings.set(settings2.id, settings2);

    await createAlert({
      strategy: 'momentum', type: 'signal', severity: 'info',
      title: 'Alert A', message: 'msg A',
      dedupeKey: 'unique-a-1',
    });
    await createAlert({
      strategy: 'balanced', type: 'risk', severity: 'warning',
      title: 'Alert B', message: 'msg B',
      dedupeKey: 'unique-b-1',
    });

    const momentumLogs = await getAlertLogs({ strategy: 'momentum' });
    expect(momentumLogs.length).toBeGreaterThanOrEqual(1);
    expect(momentumLogs.every(a => a.strategy === 'momentum')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Alert settings CRUD
// ---------------------------------------------------------------------------

describe('Alert settings CRUD', () => {
  it('creates default settings when none exist', async () => {
    const settings = await getAlertSettings('new_strategy');
    expect(settings).toBeDefined();
    expect(settings.strategy).toBe('new_strategy');
    expect(settings.thresholds.score).toBe(80);
    expect(settings.notifyOn.strongSignals).toBe(true);
  });

  it('saves and retrieves custom settings', async () => {
    const custom = buildAlertSettings({
      strategy: 'custom',
      id: 'default:custom',
      thresholds: { volatility_pct: 30, drawdown_pct: -20, score: 90 },
      channels: { webhook: 'https://example.com/hook' },
    });

    const saved = await saveAlertSettings(custom);
    expect(saved.thresholds.score).toBe(90);
    expect(saved.channels.webhook).toBe('https://example.com/hook');

    // Retrieve
    const retrieved = await getAlertSettings('custom');
    expect(retrieved.thresholds.score).toBe(90);
  });

  it('normalises positive drawdown_pct to negative', async () => {
    const settings = buildAlertSettings({
      id: 'default:test',
      strategy: 'test',
      thresholds: { drawdown_pct: 15 },
    });

    const saved = await saveAlertSettings(settings);
    expect(saved.thresholds.drawdown_pct).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Strong signals notification
// ---------------------------------------------------------------------------

describe('Strong signals notification', () => {
  it('creates alert for assets exceeding score threshold', async () => {
    const settings = buildAlertSettings({
      thresholds: { score: 75 },
    });
    mockStore._alertSettings.set(settings.id, settings);

    const results = [
      { ticker: 'AAPL', scoreTotal: 85 },
      { ticker: 'MSFT', scoreTotal: 80 },
      { ticker: 'GOOG', scoreTotal: 70 },
    ];

    const alert = await notifyStrongSignals(results, 'momentum');
    expect(alert).not.toBeNull();
    expect(alert.type).toBe('signal');
    expect(alert.metadata.count).toBe(2); // AAPL and MSFT above 75
    expect(alert.message).toContain('AAPL');
    expect(alert.message).toContain('MSFT');
  });

  it('returns null if no signals exceed threshold', async () => {
    const settings = buildAlertSettings({
      thresholds: { score: 90 },
    });
    mockStore._alertSettings.set(settings.id, settings);

    const results = [
      { ticker: 'LOW1', scoreTotal: 40 },
      { ticker: 'LOW2', scoreTotal: 50 },
    ];

    const alert = await notifyStrongSignals(results, 'momentum');
    expect(alert).toBeNull();
  });

  it('returns null if strongSignals notification is disabled', async () => {
    const settings = buildAlertSettings({
      notifyOn: { strongSignals: false, rebalances: true, riskEvents: true },
    });
    mockStore._alertSettings.set(settings.id, settings);

    const results = [{ ticker: 'X', scoreTotal: 95 }];
    const alert = await notifyStrongSignals(results, 'momentum');
    expect(alert).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Rebalance notification
// ---------------------------------------------------------------------------

describe('Rebalance notification', () => {
  it('creates rebalance alert with change summary', async () => {
    const settings = buildAlertSettings();
    mockStore._alertSettings.set(settings.id, settings);

    const portfolio = {
      id: 'p1',
      name: 'My Portfolio',
      strategy: 'momentum',
    };
    const rebalance = {
      id: 'r1',
      changes: [
        { ticker: 'AAPL', old_weight: 25, new_weight: 20 },
        { ticker: 'MSFT', old_weight: 15, new_weight: 20 },
      ],
    };

    const alert = await notifyRebalance(portfolio, rebalance);
    expect(alert).not.toBeNull();
    expect(alert.type).toBe('rebalance');
    expect(alert.metadata.portfolio_id).toBe('p1');
    expect(alert.metadata.rebalance_id).toBe('r1');
  });
});

// ---------------------------------------------------------------------------
// 5. Throttling
// ---------------------------------------------------------------------------

describe('Alert throttling', () => {
  it('throttles duplicate alerts within window', async () => {
    const settings = buildAlertSettings();
    mockStore._alertSettings.set(settings.id, settings);

    const alertInput = {
      strategy: 'momentum',
      type: 'signal',
      title: 'Dup',
      message: 'Dup msg',
      dedupeKey: 'same-key',
      throttleMs: 60000,
    };

    const first = await createAlert(alertInput);
    expect(first).not.toBeNull();

    const second = await createAlert(alertInput);
    expect(second).toBeNull(); // Throttled
  });

  it('allows different dedupeKeys', async () => {
    const settings = buildAlertSettings();
    mockStore._alertSettings.set(settings.id, settings);

    const a1 = await createAlert({
      strategy: 'momentum', type: 'signal', title: 'A', message: 'a',
      dedupeKey: 'key-a',
    });
    const a2 = await createAlert({
      strategy: 'momentum', type: 'signal', title: 'B', message: 'b',
      dedupeKey: 'key-b',
    });

    expect(a1).not.toBeNull();
    expect(a2).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6. Delivery via channels
// ---------------------------------------------------------------------------

describe('Alert delivery channels', () => {
  it('delivers to webhook and records result', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve('ok'),
    });

    const settings = buildAlertSettings({
      channels: { webhook: 'https://hook.example.com/test' },
    });
    mockStore._alertSettings.set(settings.id, settings);

    const alert = await createAlert({
      strategy: 'momentum', type: 'signal', title: 'Web', message: 'wh',
      dedupeKey: `wh-${Date.now()}`,
    });

    expect(alert.delivery_status).toBe('delivered');
    expect(alert.delivery_results).toHaveLength(1);
    expect(alert.delivery_results[0].channel).toBe('webhook');
    expect(alert.delivery_results[0].status).toBe('delivered');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://hook.example.com/test',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('records failure when webhook returns error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve('error'),
    });

    const settings = buildAlertSettings({
      channels: { webhook: 'https://hook.example.com/fail' },
    });
    mockStore._alertSettings.set(settings.id, settings);

    const alert = await createAlert({
      strategy: 'momentum', type: 'risk', title: 'Fail', message: 'fail',
      dedupeKey: `fail-${Date.now()}`,
    });

    expect(alert.delivery_status).toBe('failed');
    expect(alert.delivery_results[0].status).toBe('failed');
    expect(alert.delivery_results[0].status_code).toBe(500);
  });

  it('records failure when fetch throws network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const settings = buildAlertSettings({
      channels: { slack: 'https://hooks.slack.com/test' },
    });
    mockStore._alertSettings.set(settings.id, settings);

    const alert = await createAlert({
      strategy: 'momentum', type: 'risk', title: 'Net', message: 'net',
      dedupeKey: `net-${Date.now()}`,
    });

    expect(alert.delivery_status).toBe('failed');
    expect(alert.delivery_results[0].response).toBe('Network error');
  });

  it('skips delivery when no channels configured', async () => {
    const settings = buildAlertSettings({
      channels: { email: '', webhook: '', slack: '', teams: '', zapier: '' },
    });
    mockStore._alertSettings.set(settings.id, settings);

    const alert = await createAlert({
      strategy: 'momentum', type: 'signal', title: 'No Ch', message: 'nc',
      dedupeKey: `nc-${Date.now()}`,
    });

    expect(alert.delivery_status).toBe('skipped');
    expect(alert.delivery_results).toHaveLength(0);
  });

  it('delivers to multiple channels and reports partial success', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('ok') });
      }
      return Promise.resolve({ ok: false, status: 500, statusText: 'Error', text: () => Promise.resolve('err') });
    });

    const settings = buildAlertSettings({
      channels: {
        webhook: 'https://hook.example.com/a',
        slack: 'https://hooks.slack.com/b',
      },
    });
    mockStore._alertSettings.set(settings.id, settings);

    const alert = await createAlert({
      strategy: 'momentum', type: 'signal', title: 'Multi', message: 'mc',
      dedupeKey: `mc-${Date.now()}`,
    });

    expect(alert.delivery_status).toBe('partial');
    expect(alert.delivery_results).toHaveLength(2);
  });
});
