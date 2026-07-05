export const SIMULATOR_SELECTION_KEY = 'simulatorSelection';
export const MAX_SIMULATOR_TICKERS = 4;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getBrowserStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function normalizeSimulatorTicker(rawTicker: unknown): string {
  return String(rawTicker || '').trim().toUpperCase();
}

export function clampSimulatorSelection(selection: unknown): string[] {
  if (!Array.isArray(selection)) return [];

  return selection
    .filter(item => typeof item === 'string')
    .map(item => normalizeSimulatorTicker(item))
    .filter(Boolean)
    .slice(0, MAX_SIMULATOR_TICKERS);
}

export function loadSimulatorSelection(storage: StorageLike | null = getBrowserStorage()): string[] {
  if (!storage) return [];

  try {
    const raw = storage.getItem(SIMULATOR_SELECTION_KEY);
    if (!raw) return [];
    return clampSimulatorSelection(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveSimulatorSelection(
  selection: string[],
  storage: StorageLike | null = getBrowserStorage()
): void {
  if (!storage) return;

  try {
    storage.setItem(SIMULATOR_SELECTION_KEY, JSON.stringify(clampSimulatorSelection(selection)));
  } catch {
    // Ignore storage failures in private mode / restricted environments
  }
}

export function clearSimulatorSelection(storage: StorageLike | null = getBrowserStorage()): void {
  if (!storage) return;

  try {
    storage.removeItem(SIMULATOR_SELECTION_KEY);
  } catch {
    // Ignore storage failures in private mode / restricted environments
  }
}

export function reconcileSimulatorSelection(
  selection: string[],
  availableTickers: Iterable<string>
): string[] {
  const available = new Set(Array.from(availableTickers, ticker => normalizeSimulatorTicker(ticker)));
  return clampSimulatorSelection(selection).filter(ticker => available.has(ticker));
}
