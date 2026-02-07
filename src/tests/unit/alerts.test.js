import { describe, it, expect } from 'vitest';
import {
  createAlert,
  notifyStrongSignals,
  getAlertSettings,
  saveAlertSettings,
  getAlertLogs,
  notifyRebalance,
  notifyRiskEvent,
} from '../../alerts/alert-manager.js';
import { dbStore } from '../../storage/indexed-db-store.js';
import { withMockedDbStore, withMockedFetch } from '../helpers.js';

describe('Alert System', () => {
  // -----------------------------------------------------------
  // Default settings
  // -----------------------------------------------------------
  describe('getAlertSettings', () => {
    it('returns default thresholds when no settings exist', async () => {
      const savedSettings = [];

      await withMockedDbStore(dbStore, {
        getAlertSettings: async () => null,
        saveAlertSettings: async (settings) => {
          savedSettings.push(settings);
          return settings.id;
        },
      }, async () => {
        const settings = await getAlertSettings('balanced');

        expect(settings.thresholds.volatility_pct).toBe(25);
        expect(settings.thresholds.drawdown_pct).toBe(-15);
        expect(settings.thresholds.score).toBe(80);
        expect(savedSettings).toHaveLength(1);
      });
    });

    it('merges existing settings with defaults', async () => {
      await withMockedDbStore(dbStore, {
        getAlertSettings: async () => ({
          id: 'default:aggressive',
          strategy: 'aggressive',
          thresholds: { score: 90 }, // only score set
          channels: { webhook: 'https://test.com' },
          notifyOn: { strongSignals: false },
        }),
      }, async () => {
        const settings = await getAlertSettings('aggressive');

        // Should have merged with defaults
        expect(settings.thresholds.score).toBe(90);
        expect(settings.thresholds.volatility_pct).toBe(25);
        expect(settings.channels.webhook).toBe('https://test.com');
        expect(settings.channels.email).toBe('');
        expect(settings.notifyOn.strongSignals).toBe(false);
        expect(settings.notifyOn.rebalances).toBe(true);
      });
    });

    it('normalizes positive drawdown threshold to negative', async () => {
      await withMockedDbStore(dbStore, {
        getAlertSettings: async () => ({
          id: 'default:test',
          strategy: 'test',
          thresholds: { drawdown_pct: 15 }, // positive value
        }),
      }, async () => {
        const settings = await getAlertSettings('test');
        expect(settings.thresholds.drawdown_pct).toBe(-15);
      });
    });

    it('handles NaN drawdown threshold', async () => {
      await withMockedDbStore(dbStore, {
        getAlertSettings: async () => ({
          id: 'default:test',
          strategy: 'test',
          thresholds: { drawdown_pct: NaN },
        }),
      }, async () => {
        const settings = await getAlertSettings('test');
        expect(settings.thresholds.drawdown_pct).toBe(-15); // default
      });
    });
  });

  // -----------------------------------------------------------
  // Save alert settings
  // -----------------------------------------------------------
  describe('saveAlertSettings', () => {
    it('saves settings with normalized thresholds', async () => {
      const savedSettings = [];

      await withMockedDbStore(dbStore, {
        saveAlertSettings: async (settings) => {
          savedSettings.push(settings);
          return settings.id;
        },
      }, async () => {
        const result = await saveAlertSettings({
          id: 'test:balanced',
          strategy: 'balanced',
          thresholds: { score: 85, drawdown_pct: 20 }, // positive
        });

        expect(result.thresholds.drawdown_pct).toBe(-20);
        expect(result.thresholds.score).toBe(85);
        expect(result.updated_at).toBeDefined();
        expect(savedSettings).toHaveLength(1);
      });
    });
  });

  // -----------------------------------------------------------
  // Get alert logs
  // -----------------------------------------------------------
  describe('getAlertLogs', () => {
    it('calls dbStore with correct parameters', async () => {
      let calledWith = null;

      await withMockedDbStore(dbStore, {
        getAlerts: async (params) => {
          calledWith = params;
          return [];
        },
      }, async () => {
        await getAlertLogs({ strategy: 'balanced', limit: 25 });

        expect(calledWith).toEqual({
          strategy: 'balanced',
          userId: 'default',
          limit: 25,
        });
      });
    });
  });

  // -----------------------------------------------------------
  // Webhook delivery
  // -----------------------------------------------------------
  describe('createAlert with webhook', () => {
    it('marks delivery as delivered and stores results', async () => {
      const savedAlerts = [];

      await withMockedDbStore(dbStore, {
        saveAlert: async (alert) => {
          savedAlerts.push(alert);
          return alert.id;
        },
      }, () => withMockedFetch(async () => ({
        ok: true,
        status: 200,
        text: async () => 'ok',
      }), async () => {
        const settingsOverride = {
          thresholds: { volatility_pct: 25, drawdown_pct: -15, score: 80 },
          channels: { webhook: 'https://example.com/webhook' },
          notifyOn: { strongSignals: true, rebalances: true, riskEvents: true },
        };

        const alert = await createAlert({
          strategy: 'balanced',
          type: 'signal',
          title: 'Test alert',
          message: 'Alert body',
          metadata: { test: true },
        }, settingsOverride);

        expect(alert.delivery_status).toBe('delivered');
        expect(alert.delivery_results).toHaveLength(1);
        expect(savedAlerts.length).toBeGreaterThanOrEqual(2);
      }));
    });

    it('marks delivery as failed when webhook returns error', async () => {
      const savedAlerts = [];

      await withMockedDbStore(dbStore, {
        saveAlert: async (alert) => {
          savedAlerts.push(alert);
          return alert.id;
        },
      }, () => withMockedFetch(async () => ({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      }), async () => {
        const settingsOverride = {
          channels: { webhook: 'https://example.com/webhook' },
          notifyOn: {},
        };

        const alert = await createAlert({
          strategy: 'balanced',
          type: 'signal',
          title: 'Test',
          message: 'Body',
        }, settingsOverride);

        expect(alert.delivery_status).toBe('failed');
        expect(alert.delivery_results[0].status).toBe('failed');
        expect(alert.delivery_results[0].status_code).toBe(500);
      }));
    });

    it('handles webhook network error', async () => {
      const savedAlerts = [];

      await withMockedDbStore(dbStore, {
        saveAlert: async (alert) => {
          savedAlerts.push(alert);
          return alert.id;
        },
      }, () => withMockedFetch(async () => {
        throw new Error('Network error');
      }, async () => {
        const settingsOverride = {
          channels: { webhook: 'https://example.com/webhook' },
          notifyOn: {},
        };

        const alert = await createAlert({
          strategy: 'balanced',
          type: 'signal',
          title: 'Test',
          message: 'Body',
        }, settingsOverride);

        expect(alert.delivery_status).toBe('failed');
        expect(alert.delivery_results[0].response).toBe('Network error');
      }));
    });

    it('skips delivery when no channels configured', async () => {
      const savedAlerts = [];

      await withMockedDbStore(dbStore, {
        saveAlert: async (alert) => {
          savedAlerts.push(alert);
          return alert.id;
        },
      }, async () => {
        const settingsOverride = {
          channels: { email: '', webhook: '' },
          notifyOn: {},
        };

        const alert = await createAlert({
          strategy: 'balanced',
          type: 'signal',
          title: 'Test',
          message: 'Body',
        }, settingsOverride);

        expect(alert.delivery_status).toBe('skipped');
        expect(alert.delivery_results).toHaveLength(0);
      });
    });

    it('returns null when throttled by dedupeKey', async () => {
      const savedAlerts = [];
      const dedupeKey = `test-dedupe-${Date.now()}`;

      await withMockedDbStore(dbStore, {
        saveAlert: async (alert) => {
          savedAlerts.push(alert);
          return alert.id;
        },
      }, async () => {
        const settingsOverride = {
          channels: {},
          notifyOn: {},
        };

        // First call should succeed
        const alert1 = await createAlert({
          strategy: 'balanced',
          type: 'signal',
          title: 'Test',
          message: 'Body',
          dedupeKey,
          throttleMs: 60000,
        }, settingsOverride);

        expect(alert1).toBeTruthy();

        // Second call with same dedupeKey should be throttled
        const alert2 = await createAlert({
          strategy: 'balanced',
          type: 'signal',
          title: 'Test',
          message: 'Body',
          dedupeKey,
          throttleMs: 60000,
        }, settingsOverride);

        expect(alert2).toBeNull();
      });
    });

    it('sends to multiple channels and reports partial success', async () => {
      const savedAlerts = [];
      let callCount = 0;

      await withMockedDbStore(dbStore, {
        saveAlert: async (alert) => {
          savedAlerts.push(alert);
          return alert.id;
        },
      }, () => withMockedFetch(async () => {
        callCount++;
        // First call succeeds, second fails
        if (callCount === 1) {
          return { ok: true, status: 200, text: async () => 'ok' };
        }
        return { ok: false, status: 500, text: async () => 'error' };
      }, async () => {
        const settingsOverride = {
          channels: {
            webhook: 'https://example.com/webhook',
            slack: 'https://hooks.slack.com/test',
          },
          notifyOn: {},
        };

        const alert = await createAlert({
          strategy: 'balanced',
          type: 'signal',
          title: 'Test',
          message: 'Body',
        }, settingsOverride);

        expect(alert.delivery_status).toBe('partial');
        expect(alert.delivery_results).toHaveLength(2);
      }));
    });
  });

  // -----------------------------------------------------------
  // Strong signals notification
  // -----------------------------------------------------------
  describe('notifyStrongSignals', () => {
    it('creates alert for signals above threshold', async () => {
      const savedAlerts = [];

      await withMockedDbStore(dbStore, {
        getAlertSettings: async () => ({
          id: 'default:balanced',
          strategy: 'balanced',
          thresholds: { volatility_pct: 25, drawdown_pct: -15, score: 90 },
          channels: {},
          notifyOn: { strongSignals: true, rebalances: true, riskEvents: true },
        }),
        saveAlertSettings: async (settings) => settings.id,
        saveAlert: async (alert) => {
          savedAlerts.push(alert);
          return alert.id;
        },
      }, async () => {
        const results = [
          { ticker: 'AAA', scoreTotal: 95 },
          { ticker: 'BBB', scoreTotal: 85 },
        ];

        const alert = await notifyStrongSignals(results, 'balanced');

        expect(alert).toBeTruthy();
        expect(alert.metadata.count).toBe(1);
        expect(savedAlerts.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('returns null when no signals above threshold', async () => {
      await withMockedDbStore(dbStore, {
        getAlertSettings: async () => ({
          id: 'default:balanced',
          strategy: 'balanced',
          thresholds: { score: 90 },
          channels: {},
          notifyOn: { strongSignals: true },
        }),
        saveAlertSettings: async (settings) => settings.id,
      }, async () => {
        const results = [
          { ticker: 'AAA', scoreTotal: 80 },
          { ticker: 'BBB', scoreTotal: 85 },
        ];

        const alert = await notifyStrongSignals(results, 'balanced');
        expect(alert).toBeNull();
      });
    });

    it('returns null when strongSignals notification is disabled', async () => {
      await withMockedDbStore(dbStore, {
        getAlertSettings: async () => ({
          id: 'default:balanced',
          strategy: 'balanced',
          thresholds: { score: 80 },
          channels: {},
          notifyOn: { strongSignals: false },
        }),
        saveAlertSettings: async (settings) => settings.id,
      }, async () => {
        const results = [
          { ticker: 'AAA', scoreTotal: 95 },
        ];

        const alert = await notifyStrongSignals(results, 'balanced');
        expect(alert).toBeNull();
      });
    });

    it('includes signals above threshold in metadata', async () => {
      const savedAlerts = [];
      // Use unique strategy name to avoid throttle cache conflicts with other tests
      const uniqueStrategy = `test-strategy-${Date.now()}`;

      await withMockedDbStore(dbStore, {
        getAlertSettings: async () => ({
          id: `default:${uniqueStrategy}`,
          strategy: uniqueStrategy,
          thresholds: { score: 95 }, // High threshold to limit signals
          channels: {},
          notifyOn: { strongSignals: true },
        }),
        saveAlertSettings: async (settings) => settings.id,
        saveAlert: async (alert) => {
          savedAlerts.push(alert);
          return alert.id;
        },
      }, async () => {
        // Only 3 signals above threshold of 95
        const results = [
          { ticker: 'STOCK1', scoreTotal: 96 },
          { ticker: 'STOCK2', scoreTotal: 97 },
          { ticker: 'STOCK3', scoreTotal: 98 },
          { ticker: 'STOCK4', scoreTotal: 90 }, // Below threshold
          { ticker: 'STOCK5', scoreTotal: 85 }, // Below threshold
        ];

        const alert = await notifyStrongSignals(results, uniqueStrategy);
        expect(alert).toBeTruthy();
        expect(alert.metadata.count).toBe(3);
      });
    });
  });

  // -----------------------------------------------------------
  // Rebalance notification
  // -----------------------------------------------------------
  describe('notifyRebalance', () => {
    it('creates alert for portfolio rebalance', async () => {
      const savedAlerts = [];

      await withMockedDbStore(dbStore, {
        getAlertSettings: async () => ({
          id: 'default:balanced',
          strategy: 'balanced',
          thresholds: {},
          channels: {},
          notifyOn: { rebalances: true },
        }),
        saveAlertSettings: async (settings) => settings.id,
        saveAlert: async (alert) => {
          savedAlerts.push(alert);
          return alert.id;
        },
      }, async () => {
        const portfolio = {
          id: 'port-1',
          name: 'Test Portfolio',
          strategy: 'balanced',
        };

        const rebalance = {
          id: 'reb-1',
          reason: 'Scheduled rebalance',
          changes: [
            { ticker: 'AAPL', old_weight: 25, new_weight: 30 },
            { ticker: 'MSFT', old_weight: 25, new_weight: 20 },
          ],
        };

        const alert = await notifyRebalance(portfolio, rebalance);

        expect(alert).toBeTruthy();
        expect(alert.type).toBe('rebalance');
        expect(alert.metadata.portfolio_id).toBe('port-1');
        expect(alert.metadata.changes).toBe(2);
      });
    });

    it('returns null when rebalance notifications disabled', async () => {
      await withMockedDbStore(dbStore, {
        getAlertSettings: async () => ({
          id: 'default:balanced',
          strategy: 'balanced',
          thresholds: {},
          channels: {},
          notifyOn: { rebalances: false },
        }),
        saveAlertSettings: async (settings) => settings.id,
      }, async () => {
        const portfolio = { id: 'p1', name: 'Test', strategy: 'balanced' };
        const rebalance = { id: 'r1', reason: 'Test', changes: [] };

        const alert = await notifyRebalance(portfolio, rebalance);
        expect(alert).toBeNull();
      });
    });
  });

  // -----------------------------------------------------------
  // Risk event notification
  // -----------------------------------------------------------
  describe('notifyRiskEvent', () => {
    it('creates alert for volatility breach', async () => {
      const savedAlerts = [];

      await withMockedDbStore(dbStore, {
        getAlertSettings: async () => ({
          id: 'default:balanced',
          strategy: 'balanced',
          thresholds: { volatility_pct: 25 },
          channels: {},
          notifyOn: { riskEvents: true },
        }),
        saveAlertSettings: async (settings) => settings.id,
        saveAlert: async (alert) => {
          savedAlerts.push(alert);
          return alert.id;
        },
      }, async () => {
        const alert = await notifyRiskEvent({
          strategy: 'balanced',
          title: 'Volatility breach detected',
          message: 'AAPL volatility (35%) exceeded threshold (25%)',
          metadata: {
            eventType: 'volatility_breach',
            ticker: 'AAPL',
            currentValue: 35,
            threshold: 25,
          },
        });

        expect(alert).toBeTruthy();
        expect(alert.type).toBe('risk');
        expect(alert.severity).toBe('warning');
        expect(alert.metadata.eventType).toBe('volatility_breach');
      });
    });

    it('returns null when riskEvents notifications disabled', async () => {
      await withMockedDbStore(dbStore, {
        getAlertSettings: async () => ({
          id: 'default:balanced',
          strategy: 'balanced',
          thresholds: {},
          channels: {},
          notifyOn: { riskEvents: false },
        }),
        saveAlertSettings: async (settings) => settings.id,
      }, async () => {
        const alert = await notifyRiskEvent({
          strategy: 'balanced',
          title: 'Drawdown alert',
          message: 'Drawdown exceeded threshold',
          metadata: {
            eventType: 'drawdown_breach',
          },
        });

        expect(alert).toBeNull();
      });
    });
  });
});
