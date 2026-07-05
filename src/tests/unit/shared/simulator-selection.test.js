import { describe, expect, it, vi } from 'vitest';

import {
  MAX_SIMULATOR_TICKERS,
  clampSimulatorSelection,
  clearSimulatorSelection,
  loadSimulatorSelection,
  normalizeSimulatorTicker,
  reconcileSimulatorSelection,
  saveSimulatorSelection,
} from '../../../shared/frontend/simulator-selection.js';

describe('simulator-selection shared helpers', () => {
  it('normalizes tickers consistently', () => {
    expect(normalizeSimulatorTicker('  aapl ')).toBe('AAPL');
    expect(normalizeSimulatorTicker(null)).toBe('');
  });

  it('clamps and sanitizes restored selections', () => {
    const raw = [' aapl ', 'msft', '', 123, 'nvda', 'tsla', 'amzn'];
    expect(clampSimulatorSelection(raw)).toEqual(
      ['AAPL', 'MSFT', 'NVDA', 'TSLA'].slice(0, MAX_SIMULATOR_TICKERS)
    );
  });

  it('loads a valid selection from storage', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify([' aapl ', 'msft'])),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    expect(loadSimulatorSelection(storage)).toEqual(['AAPL', 'MSFT']);
  });

  it('returns an empty selection when storage contains invalid JSON', () => {
    const storage = {
      getItem: vi.fn().mockImplementation(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    expect(loadSimulatorSelection(storage)).toEqual([]);
  });

  it('saves a normalized selection to storage', () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    saveSimulatorSelection([' aapl ', 'msft'], storage);

    expect(storage.setItem).toHaveBeenCalledWith(
      'simulatorSelection',
      JSON.stringify(['AAPL', 'MSFT'])
    );
  });

  it('clears the stored selection', () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    clearSimulatorSelection(storage);
    expect(storage.removeItem).toHaveBeenCalledWith('simulatorSelection');
  });

  it('reconciles the selection against currently available tickers', () => {
    expect(reconcileSimulatorSelection(['AAPL', 'MSFT', 'NVDA'], ['msft', 'nvda'])).toEqual([
      'MSFT',
      'NVDA',
    ]);
  });
});
