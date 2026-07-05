import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  persistLastScanReview,
  persistLastSimulationReview,
} from '../../../shared/frontend/offline-review-cache.js';

describe('offline-review-cache shared helpers', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    warnSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('persists the last scan through the provided store', async () => {
    const store = {
      saveLastScan: vi.fn().mockResolvedValue(undefined),
      saveLastSimulation: vi.fn(),
    };

    persistLastScanReview({ results: [] }, store);
    await Promise.resolve();

    expect(store.saveLastScan).toHaveBeenCalledWith({ results: [] });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('persists the last simulation through the provided store', async () => {
    const store = {
      saveLastScan: vi.fn(),
      saveLastSimulation: vi.fn().mockResolvedValue(undefined),
    };

    persistLastSimulationReview({ response: {} }, store);
    await Promise.resolve();

    expect(store.saveLastSimulation).toHaveBeenCalledWith({ response: {} });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs a warning when scan persistence fails', async () => {
    const store = {
      saveLastScan: vi.fn().mockRejectedValue(new Error('indexeddb blocked')),
      saveLastSimulation: vi.fn(),
    };

    persistLastScanReview({ results: [] }, store);
    await Promise.resolve();
    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalled();
  });
});
