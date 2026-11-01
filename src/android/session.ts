import { canonicalSelection } from '../shared/frontend/asset-identity.js';
import { MARKET_OPTIONS } from '../shared/frontend/market-options.js';
import type { HorizonInput } from '../shared/frontend/simulator-service.js';
import type { ResultsFilterState } from '../shared/frontend/results-filter.js';

export const ANDROID_SESSION_KEY = 'gsp.android.session.v1';
export const VIEW_KEYS = ['scoreTotal', 'scoreShort', 'scoreMedium', 'scoreLong'] as const;
export type AndroidSession = {
  hasDraft: boolean;
  pendingTask: 'scan' | 'simulation' | null;
  market: string;
  strategy: string;
  filter: ResultsFilterState;
  viewKey: string;
  selection: string[];
  investments: Record<string, number>;
  horizon: HorizonInput;
  resultsScroll: number;
};
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): StorageLike | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function defaultSession(): AndroidSession {
  return {
    hasDraft: false, pendingTask: null, market: 'spain', strategy: 'balanced',
    filter: { query: '', signal: 'all', minScore: 0, volume: 'all' }, viewKey: 'scoreTotal',
    selection: [], investments: {}, resultsScroll: 0,
    horizon: { preset: 60, useCustom: false, customValue: 18, customUnit: 'months' }
  };
}

export function loadAndroidSession(storage: StorageLike | null = browserStorage()): AndroidSession {
  const session = defaultSession();
  try {
    const raw = storage?.getItem(ANDROID_SESSION_KEY);
    if (!raw) return session;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return session;
    session.hasDraft = true;
    if (saved.pendingTask === 'scan' || saved.pendingTask === 'simulation') session.pendingTask = saved.pendingTask;
    if (saved.market === 'all' || MARKET_OPTIONS.some(market => market.key === saved.market)) {
      session.market = saved.market;
    }
    if (['balanced', 'momentum_aggressive', 'trend_conservative', 'sector_rotation'].includes(saved.strategy)) {
      session.strategy = saved.strategy;
    }
    session.selection = canonicalSelection(saved.selection);
    session.investments = Object.fromEntries(session.selection.map(symbol => {
      const amount = saved.investments?.[symbol];
      return [symbol, Number.isFinite(amount) && amount >= 0 ? amount : 100];
    }));
    if (VIEW_KEYS.includes(saved.viewKey)) session.viewKey = saved.viewKey;
    const filter = saved.filter;
    if (typeof filter?.query === 'string') session.filter.query = filter.query.slice(0, 200);
    if (['all', 'strong_buy', 'buy', 'hold_upper', 'hold', 'sell'].includes(filter?.signal)) {
      session.filter.signal = filter.signal;
    }
    if (Number.isFinite(filter?.minScore)) session.filter.minScore = Math.max(0, Math.min(100, filter.minScore));
    if (filter?.volume === 'high') session.filter.volume = 'high';
    const horizon = saved.horizon;
    if ([12, 36, 60, 120].includes(horizon?.preset)) session.horizon.preset = horizon.preset;
    if (typeof horizon?.useCustom === 'boolean') session.horizon.useCustom = horizon.useCustom;
    if (Number.isFinite(horizon?.customValue)) session.horizon.customValue = horizon.customValue;
    if (horizon?.customUnit === 'years') session.horizon.customUnit = 'years';
    if (Number.isFinite(saved.resultsScroll)) session.resultsScroll = Math.max(0, saved.resultsScroll);
  } catch { /* Corrupt or inaccessible storage never prevents opening the app. */ }
  return session;
}

export function saveAndroidSession(session: AndroidSession, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(ANDROID_SESSION_KEY, JSON.stringify(session));
    return true;
  } catch { return false; }
}
