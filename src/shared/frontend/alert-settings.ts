/**
 * Shared alert settings persistence and input shaping. No rendering or delivery effects.
 * The default adapter preserves the existing IndexedDB contract; callers can inject a store.
 */
import { dbStore } from '../../storage/indexed-db-store.js';

export interface AlertThresholds {
  volatility_pct: number;
  drawdown_pct: number;
  score: number;
}

export interface AlertChannels {
  email: string;
  webhook: string;
  slack: string;
  teams: string;
  zapier: string;
}

export interface AlertNotifyOn {
  strongSignals: boolean;
  rebalances: boolean;
  riskEvents: boolean;
}

export interface AlertSettingsRecord {
  id: string;
  user_id: string;
  strategy: string;
  thresholds: AlertThresholds;
  channels: AlertChannels;
  notifyOn: AlertNotifyOn;
  created_at: string;
  updated_at: string;
}

/** Accept partial nested settings when loading legacy records or saving defaults. */
export type AlertSettingsInput = Partial<Omit<AlertSettingsRecord,
  'thresholds' | 'channels' | 'notifyOn'>> & {
  thresholds?: Partial<AlertThresholds>;
  channels?: Partial<AlertChannels>;
  notifyOn?: Partial<AlertNotifyOn>;
};

export interface AlertSettingsStore {
  getAlertSettings(id: string): Promise<AlertSettingsInput | null>;
  saveAlertSettings(settings: AlertSettingsRecord): Promise<unknown>;
}

export const DEFAULT_USER_ID: string = 'default';
export const DEFAULT_THRESHOLDS: AlertThresholds = {
  volatility_pct: 25,
  drawdown_pct: -15,
  score: 80
};
const DEFAULT_CHANNELS: AlertChannels = {
  email: '',
  webhook: '',
  slack: '',
  teams: '',
  zapier: ''
};
const DEFAULT_NOTIFY: AlertNotifyOn = {
  strongSignals: true,
  rebalances: true,
  riskEvents: true
};

const toSettingsId = (userId: string, strategy: string): string => `${userId}:${strategy}`;

const normalizeDrawdownThreshold = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_THRESHOLDS.drawdown_pct;
  }
  return value > 0 ? -Math.abs(value) : value;
};

export async function getAlertSettings(
  strategy: string,
  userId: string = DEFAULT_USER_ID,
  store: AlertSettingsStore = dbStore
): Promise<AlertSettingsRecord> {
  const settingsId: string = toSettingsId(userId, strategy);
  let settings = await store.getAlertSettings(settingsId) as AlertSettingsRecord | null;

  if (!settings) {
    settings = {
      id: settingsId,
      user_id: userId,
      strategy,
      thresholds: { ...DEFAULT_THRESHOLDS },
      channels: { ...DEFAULT_CHANNELS },
      notifyOn: { ...DEFAULT_NOTIFY },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await store.saveAlertSettings(settings);
  } else {
    // Keep the strategy/user_id indexes populated when a legacy record is re-saved.
    settings.strategy = settings.strategy || strategy;
    settings.user_id = settings.user_id || userId;
    settings.thresholds = { ...DEFAULT_THRESHOLDS, ...(settings.thresholds || {}) };
    settings.channels = { ...DEFAULT_CHANNELS, ...(settings.channels || {}) };
    settings.notifyOn = { ...DEFAULT_NOTIFY, ...(settings.notifyOn || {}) };
    settings.thresholds.drawdown_pct = normalizeDrawdownThreshold(settings.thresholds.drawdown_pct);
  }

  return settings;
}

export async function saveAlertSettings(
  settings: AlertSettingsInput,
  store: AlertSettingsStore = dbStore
): Promise<AlertSettingsRecord> {
  const sanitized: AlertSettingsRecord = {
    ...settings,
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      ...(settings.thresholds || {})
    },
    channels: {
      ...DEFAULT_CHANNELS,
      ...(settings.channels || {})
    },
    notifyOn: {
      ...DEFAULT_NOTIFY,
      ...(settings.notifyOn || {})
    },
    updated_at: new Date().toISOString()
  } as AlertSettingsRecord;

  sanitized.thresholds.drawdown_pct = normalizeDrawdownThreshold(sanitized.thresholds.drawdown_pct);

  await store.saveAlertSettings(sanitized);
  return sanitized;
}

/** Values read by either frontend; NaN thresholds retain the saved value. */
export type AlertSettingsValues = {
  thresholds: AlertThresholds;
  channels: AlertChannels;
  notifyOn: AlertNotifyOn;
};

export function buildAlertSettingsUpdate(
  existing: AlertSettingsRecord,
  values: AlertSettingsValues
): AlertSettingsRecord {
  return {
    ...existing,
    thresholds: {
      volatility_pct: Number.isNaN(values.thresholds.volatility_pct)
        ? existing.thresholds.volatility_pct : values.thresholds.volatility_pct,
      drawdown_pct: Number.isNaN(values.thresholds.drawdown_pct)
        ? existing.thresholds.drawdown_pct : values.thresholds.drawdown_pct,
      score: Number.isNaN(values.thresholds.score)
        ? existing.thresholds.score : values.thresholds.score
    },
    channels: { ...values.channels },
    notifyOn: { ...values.notifyOn }
  };
}
