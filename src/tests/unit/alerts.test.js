import { describe, it, expect } from 'vitest';
import {
  createAlert,
  notifyStrongSignals,
  getAlertSettings,
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
  });
});
