import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enrichScanResults } from '../../../shared/frontend/scan-enrichment.js';
import { loadPerformanceTracker, adjustScoresBatch } from '../../../ml/adaptive-scoring.js';
import { detectMarketRegime } from '../../../analytics/market_regime.js';
import { detectAllAnomalies } from '../../../ml/anomaly-detection.js';
import { generateRecommendations } from '../../../ml/recommendation-engine.js';

vi.mock('../../../ml/adaptive-scoring.js', () => ({
  PerformanceTracker: class {}, loadPerformanceTracker: vi.fn(), adjustScoresBatch: vi.fn(),
}));
vi.mock('../../../analytics/market_regime.js', () => ({ detectMarketRegime: vi.fn() }));
vi.mock('../../../ml/regime-prediction.js', () => ({ extractRegimeFeatures: vi.fn(() => ({})) }));
vi.mock('../../../ml/anomaly-detection.js', () => ({
  detectAllAnomalies: vi.fn(), getAnomalySummary: vi.fn(() => ({ total: 1 })),
}));
vi.mock('../../../ml/recommendation-engine.js', () => ({ generateRecommendations: vi.fn() }));

const state = () => ({
  currentResults: [{ ticker: 'SAN', scoreTotal: 80 }], benchmarkData: { symbol: '^IBEX' },
  strategyKey: 'balanced', mlEnabled: true, performanceTracker: null, currentRegime: null,
  mlRegimePrediction: null, mlAnomalies: [], mlRecommendations: [],
});
const read = () => vi.fn().mockResolvedValue(Array.from({ length: 252 }, (_, i) => ({
  date: `day-${i}`, close: i + 10,
})));

beforeEach(() => {
  vi.clearAllMocks();
  loadPerformanceTracker.mockReset().mockResolvedValue({ tracker: true });
  adjustScoresBatch.mockReset().mockImplementation(items => items.map(item => ({ ...item, scoreTotal: 85 })));
  detectMarketRegime.mockReset().mockReturnValue({ regime: 'bull' });
  detectAllAnomalies.mockReset().mockReturnValue([{ ticker: 'SAN' }]);
  generateRecommendations.mockReset().mockReturnValue([{ type: 'hold' }]);
});

describe('shared post-scan enrichment', () => {
  it('preserves stage ordering and exposes regime, adjusted results and ML state', async () => {
    const input = state();
    const onStage = vi.fn();
    const onRegime = vi.fn();
    const onAdjustedResults = vi.fn();
    const result = await enrichScanResults(input, {
      loadYahooData: read(), onStage, onRegime, onAdjustedResults,
    });
    expect(onStage.mock.calls.flat()).toEqual(['initializing_tracker', 'detecting_regime',
      'predicting_regime', 'adaptive_scoring', 'detecting_anomalies', 'recommendations']);
    expect(result.currentResults[0].scoreTotal).toBe(85);
    expect(input.currentResults[0].scoreTotal).toBe(80);
    expect(onRegime).toHaveBeenCalledWith({ regime: 'bull' });
    expect(onAdjustedResults).toHaveBeenCalledWith(result.currentResults);
    expect(result.stateUpdates).toEqual({ regime: { regime: 'bull' },
      mlAnomalies: [{ ticker: 'SAN' }], mlAnomalySummary: { total: 1 },
      mlRecommendations: [{ type: 'hold' }] });
  });

  it('still detects the rule-based regime when ML is disabled', async () => {
    const result = await enrichScanResults({ ...state(), mlEnabled: false }, { loadYahooData: read() });
    expect(result.currentRegime).toEqual({ regime: 'bull' });
    expect(loadPerformanceTracker).not.toHaveBeenCalled();
    expect(adjustScoresBatch).not.toHaveBeenCalled();
    expect(detectAllAnomalies).not.toHaveBeenCalled();
    expect(generateRecommendations).not.toHaveBeenCalled();
  });

  it('degrades independently when tracker loading, history and anomaly detection fail', async () => {
    loadPerformanceTracker.mockRejectedValue(new Error('storage unavailable'));
    detectAllAnomalies.mockImplementation(() => { throw new Error('ML unavailable'); });
    const result = await enrichScanResults(state(), {
      loadYahooData: vi.fn().mockRejectedValue(new Error('offline')),
    });
    expect(result.performanceTracker).toBeTruthy();
    expect(result.currentResults).toEqual(state().currentResults);
    expect(result.stateUpdates.mlAnomalies).toBeUndefined();
    expect(result.mlRecommendations).toEqual([{ type: 'hold' }]);
    expect(generateRecommendations).toHaveBeenCalled();
  });
});
