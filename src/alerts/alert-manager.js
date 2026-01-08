import { dbStore } from '../storage/indexed-db-store.js';
import i18n from '../i18n/i18n.js';

const DEFAULT_USER_ID = 'default';
const DEFAULT_THRESHOLDS = {
  volatility_pct: 25,
  drawdown_pct: -15,
  score: 80
};
const DEFAULT_CHANNELS = {
  email: '',
  webhook: '',
  slack: '',
  teams: '',
  zapier: ''
};
const DEFAULT_NOTIFY = {
  strongSignals: true,
  rebalances: true,
  riskEvents: true
};
const DEFAULT_THROTTLE_MS = 30 * 60 * 1000;
const alertThrottleCache = new Map();

const toSettingsId = (userId, strategy) => `${userId}:${strategy}`;

const normalizeDrawdownThreshold = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_THRESHOLDS.drawdown_pct;
  }
  return value > 0 ? -Math.abs(value) : value;
};

const shouldThrottleAlert = (key, ttlMs = DEFAULT_THROTTLE_MS) => {
  if (!key) return false;
  const last = alertThrottleCache.get(key);
  const now = Date.now();
  if (last && now - last < ttlMs) {
    return true;
  }
  alertThrottleCache.set(key, now);
  return false;
};

export async function getAlertSettings(strategy, userId = DEFAULT_USER_ID) {
  const settingsId = toSettingsId(userId, strategy);
  let settings = await dbStore.getAlertSettings(settingsId);

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

export async function saveAlertSettings(settings) {
  const sanitized = {
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
  };

  sanitized.thresholds.drawdown_pct = normalizeDrawdownThreshold(sanitized.thresholds.drawdown_pct);

  await dbStore.saveAlertSettings(sanitized);
  return sanitized;
}

export async function getAlertLogs({ strategy, userId = DEFAULT_USER_ID, limit = 50 } = {}) {
  return dbStore.getAlerts({ strategy, userId, limit });
}

const buildAlertPayload = (alert) => ({
  id: alert.id,
  strategy: alert.strategy,
  type: alert.type,
  severity: alert.severity,
  title: alert.title,
  message: alert.message,
  created_at: alert.created_at,
  metadata: alert.metadata || {}
});

const buildEmailLink = (email, title, message) => {
  const subject = encodeURIComponent(title);
  const body = encodeURIComponent(message);
  return `mailto:${email}?subject=${subject}&body=${body}`;
};

const sendWebhook = async (url, payload, channel) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const responseText = await response.text();
    return {
      channel,
      status: response.ok ? 'delivered' : 'failed',
      status_code: response.status,
      response: responseText || response.statusText,
      delivered_at: new Date().toISOString()
    };
  } catch (error) {
    return {
      channel,
      status: 'failed',
      response: error.message,
      delivered_at: new Date().toISOString()
    };
  }
};

const deliveryStatusFromResults = (results, hasChannels) => {
  if (!hasChannels) return 'skipped';
  const statuses = results.map(r => r.status);
  if (statuses.every(status => status === 'delivered')) return 'delivered';
  if (statuses.some(status => status === 'delivered')) return 'partial';
  if (statuses.every(status => status === 'queued')) return 'queued';
  return 'failed';
};

export async function createAlert(alertInput, settingsOverride = null) {
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

  const settings = settingsOverride || await getAlertSettings(strategy, userId);

  const alert = {
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

  const payload = buildAlertPayload(alert);
  const deliveries = [];
  const channels = settings.channels || {};
  const hasChannels = Object.values(channels).some(value => (value || '').trim().length > 0);

  if (channels.email?.trim()) {
    const mailto = buildEmailLink(channels.email.trim(), title, message);
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

  const updatedAlert = {
    ...alert,
    delivery_status: deliveryStatusFromResults(deliveries, hasChannels),
    delivery_results: deliveries,
    delivered_at: deliveries.length ? new Date().toISOString() : null
  };

  await dbStore.saveAlert(updatedAlert);
  return updatedAlert;
}

export async function notifyStrongSignals(results, strategy, userId = DEFAULT_USER_ID) {
  const settings = await getAlertSettings(strategy, userId);
  if (!settings.notifyOn?.strongSignals) return null;

  const threshold = settings.thresholds?.score ?? DEFAULT_THRESHOLDS.score;
  const strongSignals = results
    .filter(r => r.scoreTotal >= threshold)
    .sort((a, b) => b.scoreTotal - a.scoreTotal)
    .slice(0, 5);

  if (!strongSignals.length) return null;

  const signalList = strongSignals
    .map(r => `${r.ticker} (${r.scoreTotal.toFixed(1)})`)
    .join(', ');

  // Get translated strategy name
  const strategyName = i18n.t(`strategies.${strategy}`, { defaultValue: strategy });

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

export async function notifyRebalance(portfolio, rebalance, userId = DEFAULT_USER_ID) {
  const settings = await getAlertSettings(portfolio.strategy, userId);
  if (!settings.notifyOn?.rebalances) return null;

  const changeSummary = rebalance.changes
    .slice(0, 5)
    .map(change => `${change.ticker} (${change.old_weight.toFixed(2)}% → ${change.new_weight.toFixed(2)}%)`)
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
}) {
  const settings = await getAlertSettings(strategy, userId);
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