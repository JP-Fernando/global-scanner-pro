import { dbStore } from '../storage/indexed-db-store.js';
import i18n from '../i18n/i18n.js';

// ============================================================
// Types
// ============================================================

interface AlertThresholds {
  volatility_pct: number;
  drawdown_pct: number;
  score: number;
}

interface AlertChannels {
  email: string;
  webhook: string;
  slack: string;
  teams: string;
  zapier: string;
}

interface AlertNotifyOn {
  strongSignals: boolean;
  rebalances: boolean;
  riskEvents: boolean;
}

interface AlertSettingsRecord {
  id: string;
  user_id: string;
  strategy: string;
  thresholds: AlertThresholds;
  channels: AlertChannels;
  notifyOn: AlertNotifyOn;
  created_at: string;
  updated_at: string;
}

type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

interface AlertMetadata {
  [key: string]: unknown;
}

interface AlertInput {
  userId?: string;
  strategy: string;
  type: string;
  severity?: AlertSeverity;
  title: string;
  message: string;
  metadata?: AlertMetadata;
  dedupeKey?: string | null;
  throttleMs?: number;
}

interface DeliveryResult {
  channel: string;
  status: 'delivered' | 'failed' | 'queued';
  status_code?: number;
  response: string;
  delivered_at: string;
}

type DeliveryStatus = 'pending' | 'delivered' | 'partial' | 'queued' | 'failed' | 'skipped';

interface AlertRecord {
  id: string;
  user_id: string;
  strategy: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: AlertMetadata;
  created_at: string;
  delivery_status: DeliveryStatus;
  delivery_results: DeliveryResult[];
  delivered_at?: string | null;
}

interface AlertPayload {
  id: string;
  strategy: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  created_at: string;
  metadata: AlertMetadata;
}

interface ScoredResult {
  ticker: string;
  scoreTotal: number;
  [key: string]: unknown;
}

interface PortfolioForAlert {
  id: string;
  name: string;
  strategy: string;
  [key: string]: unknown;
}

interface RebalanceChange {
  ticker: string;
  old_weight: number;
  new_weight: number;
  [key: string]: unknown;
}

interface RebalanceForAlert {
  id: string;
  reason: string;
  changes: RebalanceChange[];
  [key: string]: unknown;
}

interface RiskEventInput {
  strategy: string;
  userId?: string;
  title: string;
  message: string;
  metadata?: AlertMetadata;
  dedupeKey?: string;
  throttleMs?: number;
}

interface GetAlertLogsOptions {
  strategy?: string;
  userId?: string;
  limit?: number;
}

// ============================================================
// Constants
// ============================================================

const DEFAULT_USER_ID: string = 'default';
const DEFAULT_THRESHOLDS: AlertThresholds = {
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
const DEFAULT_THROTTLE_MS: number = 30 * 60 * 1000;
const alertThrottleCache: Map<string, number> = new Map();

// ============================================================
// Helpers
// ============================================================

const toSettingsId = (userId: string, strategy: string): string => `${userId}:${strategy}`;

const normalizeDrawdownThreshold = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_THRESHOLDS.drawdown_pct;
  }
  return value > 0 ? -Math.abs(value) : value;
};

const shouldThrottleAlert = (key: string, ttlMs: number = DEFAULT_THROTTLE_MS): boolean => {
  if (!key) return false;
  const last: number | undefined = alertThrottleCache.get(key);
  const now: number = Date.now();
  if (last && now - last < ttlMs) {
    return true;
  }
  alertThrottleCache.set(key, now);
  return false;
};

// ============================================================
// Exported functions
// ============================================================

export async function getAlertSettings(strategy: string, userId: string = DEFAULT_USER_ID): Promise<AlertSettingsRecord> {
  const settingsId: string = toSettingsId(userId, strategy);
  let settings: AlertSettingsRecord | null = await dbStore.getAlertSettings(settingsId) as AlertSettingsRecord | null;

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
    await dbStore.saveAlertSettings(settings);
  } else {
    settings.thresholds = { ...DEFAULT_THRESHOLDS, ...(settings.thresholds || {}) };
    settings.channels = { ...DEFAULT_CHANNELS, ...(settings.channels || {}) };
    settings.notifyOn = { ...DEFAULT_NOTIFY, ...(settings.notifyOn || {}) };
    settings.thresholds.drawdown_pct = normalizeDrawdownThreshold(settings.thresholds.drawdown_pct);
  }

  return settings;
}

export async function saveAlertSettings(settings: Partial<AlertSettingsRecord> & { thresholds?: Partial<AlertThresholds>; channels?: Partial<AlertChannels>; notifyOn?: Partial<AlertNotifyOn> }): Promise<AlertSettingsRecord> {
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

  await dbStore.saveAlertSettings(sanitized);
  return sanitized;
}

export async function getAlertLogs({ strategy, userId = DEFAULT_USER_ID, limit = 50 }: GetAlertLogsOptions = {}): Promise<AlertRecord[]> {
  return dbStore.getAlerts({ strategy: strategy ?? null, userId: userId ?? null, limit } as Record<string, unknown>) as Promise<AlertRecord[]>;
}

const buildAlertPayload = (alert: AlertRecord): AlertPayload => ({
  id: alert.id,
  strategy: alert.strategy,
  type: alert.type,
  severity: alert.severity,
  title: alert.title,
  message: alert.message,
  created_at: alert.created_at,
  metadata: alert.metadata || {}
});

const buildEmailLink = (email: string, title: string, message: string): string => {
  const subject: string = encodeURIComponent(title);
  const body: string = encodeURIComponent(message);
  return `mailto:${email}?subject=${subject}&body=${body}`;
};

const sendWebhook = async (url: string, payload: Record<string, unknown>, channel: string): Promise<DeliveryResult> => {
  try {
    const response: Response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const responseText: string = await response.text();
    return {
      channel,
      status: response.ok ? 'delivered' : 'failed',
      status_code: response.status,
      response: responseText || response.statusText,
      delivered_at: new Date().toISOString()
    };
  } catch (error: unknown) {
    return {
      channel,
      status: 'failed',
      response: error instanceof Error ? error.message : String(error),
      delivered_at: new Date().toISOString()
    };
  }
};

const deliveryStatusFromResults = (results: DeliveryResult[], hasChannels: boolean): DeliveryStatus => {
  if (!hasChannels) return 'skipped';
  const statuses: string[] = results.map((r: DeliveryResult) => r.status);
  if (statuses.every((status: string) => status === 'delivered')) return 'delivered';
  if (statuses.some((status: string) => status === 'delivered')) return 'partial';
  if (statuses.every((status: string) => status === 'queued')) return 'queued';
  return 'failed';
};

export async function createAlert(alertInput: AlertInput, settingsOverride: AlertSettingsRecord | null = null): Promise<AlertRecord | null> {
  const {
    userId = DEFAULT_USER_ID,
    strategy,
    type,
    severity = 'info',
    title,
    message,
    metadata = {},
    dedupeKey = null,
    throttleMs = DEFAULT_THROTTLE_MS
  } = alertInput;

  if (dedupeKey && shouldThrottleAlert(dedupeKey, throttleMs)) {
    return null;
  }

  const settings: AlertSettingsRecord = settingsOverride || await getAlertSettings(strategy, userId);

  const alert: AlertRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    user_id: userId,
    strategy,
    type,
    severity,
    title,
    message,
    metadata,
    created_at: new Date().toISOString(),
    delivery_status: 'pending',
    delivery_results: []
  };

  await dbStore.saveAlert(alert);

  const payload: AlertPayload = buildAlertPayload(alert);
  const deliveries: DeliveryResult[] = [];
  const channels: AlertChannels = settings.channels || {} as AlertChannels;
  const hasChannels: boolean = Object.values(channels).some((value: string) => (value || '').trim().length > 0);

  if (channels.email?.trim()) {
    const mailto: string = buildEmailLink(channels.email.trim(), title, message);
    if (typeof window !== 'undefined' && window.open) {
      window.open(mailto, '_blank');
    }
    deliveries.push({
      channel: 'email',
      status: 'queued',
      response: i18n.t('alerts.delivery_opened_client'),
      delivered_at: new Date().toISOString()
    });
  }

  if (channels.webhook?.trim()) {
    deliveries.push(await sendWebhook(channels.webhook.trim(), { alert: payload }, 'webhook'));
  }

  if (channels.slack?.trim()) {
    deliveries.push(await sendWebhook(channels.slack.trim(), { text: `${title}\n${message}` }, 'slack'));
  }

  if (channels.teams?.trim()) {
    deliveries.push(await sendWebhook(channels.teams.trim(), { text: `${title}\n${message}` }, 'teams'));
  }

  if (channels.zapier?.trim()) {
    deliveries.push(await sendWebhook(channels.zapier.trim(), { alert: payload }, 'zapier'));
  }

  const updatedAlert: AlertRecord = {
    ...alert,
    delivery_status: deliveryStatusFromResults(deliveries, hasChannels),
    delivery_results: deliveries,
    delivered_at: deliveries.length ? new Date().toISOString() : null
  };

  await dbStore.saveAlert(updatedAlert);
  return updatedAlert;
}

export async function notifyStrongSignals(results: ScoredResult[], strategy: string, userId: string = DEFAULT_USER_ID): Promise<AlertRecord | null> {
  const settings: AlertSettingsRecord = await getAlertSettings(strategy, userId);
  if (!settings.notifyOn?.strongSignals) return null;

  const threshold: number = settings.thresholds?.score ?? DEFAULT_THRESHOLDS.score;
  const strongSignals: ScoredResult[] = results
    .filter((r: ScoredResult) => r.scoreTotal >= threshold)
    .sort((a: ScoredResult, b: ScoredResult) => b.scoreTotal - a.scoreTotal)
    .slice(0, 5);

  if (!strongSignals.length) return null;

  const signalList: string = strongSignals
    .map((r: ScoredResult) => `${r.ticker} (${r.scoreTotal.toFixed(1)})`)
    .join(', ');

  // Get translated strategy name
  const strategyName: string = i18n.t(`strategies.${strategy}`, { defaultValue: strategy });

  return createAlert({
    userId,
    strategy,
    type: 'signal',
    severity: 'info',
    title: i18n.t('alerts.strong_signals_title'),
    message: i18n.t('alerts.strong_signals_message', {
      strategy: strategyName,
      signals: signalList
    }),
    metadata: {
      count: strongSignals.length,
      threshold
    },
    dedupeKey: `strong-signals:${strategy}:${new Date().toISOString().split('T')[0]}`,
    throttleMs: 12 * 60 * 60 * 1000
  }, settings);
}

export async function notifyRebalance(portfolio: PortfolioForAlert, rebalance: RebalanceForAlert, userId: string = DEFAULT_USER_ID): Promise<AlertRecord | null> {
  const settings: AlertSettingsRecord = await getAlertSettings(portfolio.strategy, userId);
  if (!settings.notifyOn?.rebalances) return null;

  const changeSummary: string = rebalance.changes
    .slice(0, 5)
    .map((change: RebalanceChange) => `${change.ticker} (${change.old_weight.toFixed(2)}% → ${change.new_weight.toFixed(2)}%)`)
    .join(', ');

  return createAlert({
    userId,
    strategy: portfolio.strategy,
    type: 'rebalance',
    severity: 'info',
    title: i18n.t('alerts.rebalance_title'),
    message: i18n.t('alerts.rebalance_message', {
      portfolio: portfolio.name,
      reason: rebalance.reason,
      changes: changeSummary || i18n.t('alerts.rebalance_no_changes')
    }),
    metadata: {
      portfolio_id: portfolio.id,
      rebalance_id: rebalance.id,
      changes: rebalance.changes.length
    },
    dedupeKey: `rebalance:${portfolio.id}:${rebalance.id}`
  }, settings);
}

export async function notifyRiskEvent({
  strategy,
  userId = DEFAULT_USER_ID,
  title,
  message,
  metadata = {},
  dedupeKey,
  throttleMs = DEFAULT_THROTTLE_MS
}: RiskEventInput): Promise<AlertRecord | null> {
  const settings: AlertSettingsRecord = await getAlertSettings(strategy, userId);
  if (!settings.notifyOn?.riskEvents) return null;

  return createAlert({
    userId,
    strategy,
    type: 'risk',
    severity: 'warning',
    title,
    message,
    metadata,
    dedupeKey,
    throttleMs
  }, settings);
}
