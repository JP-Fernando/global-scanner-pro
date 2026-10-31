import { PORTFOLIO_METHOD_KEYS, PORTFOLIO_RISK_KEYS } from '../shared/frontend/portfolio-builder.js';
import { STRATEGY_PROFILES } from '../core/config.js';
import type { AlertSettingsValues } from '../shared/frontend/alert-settings.js';

export type AlertDraft = AlertSettingsValues & { dirty: boolean };
export type OperationsSession = {
  portfolioId: string; portfolioScroll: number; alertStrategy: string;
  builder: { method: string; topN: string; totalCapital: string; riskProfile: string; name: string; applyRegime: boolean };
  alerts: Record<string, AlertDraft>;
};
export const OPERATIONS_SESSION_KEY = 'gsp.android.operations.v1';
export function loadOperationsSession(): OperationsSession {
  const state: OperationsSession = { portfolioId: '', portfolioScroll: 0, alertStrategy: 'balanced',
    builder: { method: 'equal_weight', topN: '5', totalCapital: '10000', riskProfile: 'moderate', name: '', applyRegime: true }, alerts: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(OPERATIONS_SESSION_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return state;
    if (typeof saved.portfolioId === 'string') state.portfolioId = saved.portfolioId;
    if (Number.isFinite(saved.portfolioScroll)) state.portfolioScroll = Math.max(0, saved.portfolioScroll);
    if (Object.hasOwn(STRATEGY_PROFILES, saved.alertStrategy)) state.alertStrategy = saved.alertStrategy;
    const builder = saved.builder;
    if (builder) {
      if (PORTFOLIO_METHOD_KEYS.includes(builder.method)) state.builder.method = builder.method;
      if (PORTFOLIO_RISK_KEYS.includes(builder.riskProfile)) state.builder.riskProfile = builder.riskProfile;
      for (const key of ['topN', 'totalCapital', 'name'] as const) {
        if (typeof builder[key] === 'string') state.builder[key] = builder[key].slice(0, 120);
      }
      if (typeof builder.applyRegime === 'boolean') state.builder.applyRegime = builder.applyRegime;
    }
    for (const [strategy, raw] of Object.entries(saved.alerts || {})) {
      const draft = raw as AlertDraft;
      if (!Object.hasOwn(STRATEGY_PROFILES, strategy) || !draft?.thresholds || !draft.channels || !draft.notifyOn) continue;
      if (!['volatility_pct', 'drawdown_pct', 'score'].every(key => (Number.isFinite((draft.thresholds as any)[key]) || (draft.thresholds as any)[key] === null))) continue;
      if (!['email', 'webhook', 'slack', 'teams', 'zapier'].every(key => typeof (draft.channels as any)[key] === 'string')) continue;
      if (!['strongSignals', 'rebalances', 'riskEvents'].every(key => typeof (draft.notifyOn as any)[key] === 'boolean')) continue;
      state.alerts[strategy] = { ...draft, thresholds: Object.fromEntries(Object.entries(draft.thresholds).map(([key, value]) => [key, value === null ? NaN : value])) as AlertDraft['thresholds'], dirty: draft.dirty === true };
    }
  } catch { /* Keep usable in-memory state when storage is unavailable. */ }
  return state;
}
export function saveOperationsSession(state: OperationsSession): boolean {
  try { localStorage.setItem(OPERATIONS_SESSION_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
