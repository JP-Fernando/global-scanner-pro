import { describe, it, expect, beforeEach } from 'vitest';
import {
  ADAPTIVE_SCORING_CONFIG,
  PerformanceRecord,
  PerformanceTracker,
  calculateAdaptiveMultiplier,
  calculateSignalDecay,
  adjustScoreAdaptively,
  adjustScoresBatch,
  analyzePerformanceByRegime,
  getStrategyPerformanceReport,
  savePerformanceTracker,
  loadPerformanceTracker,
} from '../../ml/adaptive-scoring.js';

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

function buildTracker(records) {
  const tracker = new PerformanceTracker();
  records.forEach((r) => tracker.addRecord(r));
  return tracker;
}

function makeRecord(overrides = {}) {
  return new PerformanceRecord(
    overrides.assetId ?? 'AAPL',
    overrides.timestamp ?? Date.now(),
    overrides.score ?? 70,
    overrides.actualReturn ?? 5,
    overrides.regime ?? 'neutral',
    overrides.strategy ?? 'balanced',
  );
}

function buildTrackerWithHitRate(hitRate, sampleSize, strategy = 'balanced', regime = 'neutral') {
  const records = [];
  const hits = Math.round(sampleSize * hitRate);
  for (let i = 0; i < sampleSize; i++) {
    records.push(
      makeRecord({
        assetId: `ASSET_${i}`,
        timestamp: Date.now() - i * DAY_MS,
        actualReturn: i < hits ? 5 : -5,
        strategy,
        regime,
      }),
    );
  }
  return buildTracker(records);
}

// -----------------------------------------------------------
// PerformanceRecord
// -----------------------------------------------------------
describe('PerformanceRecord', () => {
  it('stores all constructor parameters', () => {
    const ts = Date.now();
    const r = new PerformanceRecord('AAPL', ts, 80, 5.2, 'risk_on', 'momentum_aggressive');

    expect(r.assetId).toBe('AAPL');
    expect(r.timestamp).toBe(ts);
    expect(r.score).toBe(80);
    expect(r.actualReturn).toBe(5.2);
    expect(r.regime).toBe('risk_on');
    expect(r.strategy).toBe('momentum_aggressive');
  });

  it('marks hit=true for positive returns', () => {
    const r = new PerformanceRecord('X', Date.now(), 50, 0.1, 'neutral', 'balanced');
    expect(r.hit).toBe(true);
  });

  it('marks hit=false for zero return', () => {
    const r = new PerformanceRecord('X', Date.now(), 50, 0, 'neutral', 'balanced');
    expect(r.hit).toBe(false);
  });

  it('marks hit=false for negative return', () => {
    const r = new PerformanceRecord('X', Date.now(), 50, -3, 'neutral', 'balanced');
    expect(r.hit).toBe(false);
  });
});

// -----------------------------------------------------------
// PerformanceTracker
// -----------------------------------------------------------
describe('PerformanceTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new PerformanceTracker();
  });

  it('starts with empty records', () => {
    expect(tracker.records).toHaveLength(0);
  });

  it('addRecord adds a record', () => {
    tracker.addRecord(makeRecord());
    expect(tracker.records).toHaveLength(1);
  });

  it('addRecord evicts records older than 6 months', () => {
    const oldTimestamp = Date.now() - 200 * DAY_MS;
    tracker.addRecord(makeRecord({ timestamp: oldTimestamp }));
    // Adding a new record triggers eviction
    tracker.addRecord(makeRecord({ timestamp: Date.now() }));
    expect(tracker.records).toHaveLength(1);
  });

  describe('getRecords', () => {
    beforeEach(() => {
      tracker.addRecord(makeRecord({ strategy: 'balanced', regime: 'neutral', timestamp: Date.now() - DAY_MS }));
      tracker.addRecord(makeRecord({ strategy: 'momentum_aggressive', regime: 'risk_on', timestamp: Date.now() }));
    });

    it('returns all records with no filter', () => {
      expect(tracker.getRecords()).toHaveLength(2);
    });

    it('filters by strategy', () => {
      expect(tracker.getRecords({ strategy: 'balanced' })).toHaveLength(1);
    });

    it('filters by regime', () => {
      expect(tracker.getRecords({ regime: 'risk_on' })).toHaveLength(1);
    });

    it('filters by minTimestamp', () => {
      const result = tracker.getRecords({ minTimestamp: Date.now() - DAY_MS / 2 });
      expect(result).toHaveLength(1);
    });

    it('filters by maxTimestamp', () => {
      const result = tracker.getRecords({ maxTimestamp: Date.now() - DAY_MS / 2 });
      expect(result).toHaveLength(1);
    });
  });

  describe('calculateHitRate', () => {
    it('returns 0.5 and insufficient for empty records', () => {
      const result = tracker.calculateHitRate();
      expect(result.hitRate).toBe(0.5);
      expect(result.sampleSize).toBe(0);
      expect(result.insufficient).toBe(true);
    });

    it('calculates correct hit rate', () => {
      for (let i = 0; i < 10; i++) {
        tracker.addRecord(makeRecord({ actualReturn: i < 7 ? 5 : -5 }));
      }
      const result = tracker.calculateHitRate();
      expect(result.hitRate).toBe(0.7);
      expect(result.sampleSize).toBe(10);
    });

    it('marks insufficient when below min_samples_for_adjustment', () => {
      for (let i = 0; i < 5; i++) {
        tracker.addRecord(makeRecord({ actualReturn: 5 }));
      }
      const result = tracker.calculateHitRate();
      expect(result.insufficient).toBe(true);
    });

    it('marks sufficient when at or above min_samples', () => {
      for (let i = 0; i < ADAPTIVE_SCORING_CONFIG.min_samples_for_adjustment; i++) {
        tracker.addRecord(makeRecord({ actualReturn: 5 }));
      }
      const result = tracker.calculateHitRate();
      expect(result.insufficient).toBe(false);
    });
  });

  describe('calculateScoreCorrelation', () => {
    it('returns insufficient for fewer than 10 records', () => {
      for (let i = 0; i < 5; i++) {
        tracker.addRecord(makeRecord({ score: 50 + i, actualReturn: i }));
      }
      const result = tracker.calculateScoreCorrelation();
      expect(result.insufficient).toBe(true);
      expect(result.correlation).toBe(0);
    });

    it('returns correlation value for sufficient records', () => {
      for (let i = 0; i < 15; i++) {
        tracker.addRecord(makeRecord({ score: 50 + i * 2, actualReturn: 1 + i * 0.5 }));
      }
      const result = tracker.calculateScoreCorrelation();
      expect(result.insufficient).toBe(false);
      expect(result.correlation).toBeGreaterThan(0);
      expect(result.sampleSize).toBe(15);
    });
  });

  describe('getSummary', () => {
    it('returns default summary for empty records', () => {
      const summary = tracker.getSummary();
      expect(summary.hitRate).toBe(0.5);
      expect(summary.avgReturn).toBe(0);
      expect(summary.sampleSize).toBe(0);
    });

    it('calculates accurate summary for mixed records', () => {
      tracker.addRecord(makeRecord({ actualReturn: 10 }));
      tracker.addRecord(makeRecord({ actualReturn: -5 }));
      tracker.addRecord(makeRecord({ actualReturn: 8 }));
      tracker.addRecord(makeRecord({ actualReturn: -3 }));

      const summary = tracker.getSummary();
      expect(summary.hitRate).toBe(0.5);
      expect(summary.avgReturn).toBeCloseTo(2.5, 5);
      expect(summary.avgWin).toBeCloseTo(9, 5);
      expect(summary.avgLoss).toBeCloseTo(-4, 5);
      expect(summary.sampleSize).toBe(4);
    });

    it('handles all wins scenario', () => {
      tracker.addRecord(makeRecord({ actualReturn: 5 }));
      tracker.addRecord(makeRecord({ actualReturn: 10 }));

      const summary = tracker.getSummary();
      expect(summary.hitRate).toBe(1);
      expect(summary.avgLoss).toBe(0);
    });

    it('handles all losses scenario', () => {
      tracker.addRecord(makeRecord({ actualReturn: -5 }));
      tracker.addRecord(makeRecord({ actualReturn: -10 }));

      const summary = tracker.getSummary();
      expect(summary.hitRate).toBe(0);
      expect(summary.avgWin).toBe(0);
    });
  });

  describe('toJSON / fromJSON', () => {
    it('serializes and deserializes correctly', () => {
      tracker.addRecord(makeRecord({ assetId: 'AAPL', score: 80 }));
      tracker.addRecord(makeRecord({ assetId: 'GOOGL', score: 90 }));

      const json = tracker.toJSON();
      expect(json.recordCount).toBe(2);

      const restored = PerformanceTracker.fromJSON(json);
      expect(restored.records).toHaveLength(2);
    });

    it('fromJSON handles missing records array', () => {
      const restored = PerformanceTracker.fromJSON({});
      expect(restored.records).toHaveLength(0);
    });
  });
});

// -----------------------------------------------------------
// calculateAdaptiveMultiplier
// -----------------------------------------------------------
describe('calculateAdaptiveMultiplier', () => {
  it('returns neutral multiplier for insufficient data', () => {
    const tracker = buildTrackerWithHitRate(0.5, 5);
    const result = calculateAdaptiveMultiplier(tracker, 'balanced', 'neutral');

    expect(result.multiplier).toBe(ADAPTIVE_SCORING_CONFIG.multipliers.neutral);
    expect(result.reason).toBe('insufficient_data');
    expect(result.confidence).toBe('low');
  });

  it('returns excellent multiplier for >70% hit rate', () => {
    const tracker = buildTrackerWithHitRate(0.8, 20);
    const result = calculateAdaptiveMultiplier(tracker, 'balanced', 'neutral');

    expect(result.multiplier).toBe(ADAPTIVE_SCORING_CONFIG.multipliers.excellent);
    expect(result.category).toBe('excellent');
    expect(result.confidence).toBe('high');
  });

  it('returns good multiplier for 60-70% hit rate', () => {
    const tracker = buildTrackerWithHitRate(0.65, 20);
    const result = calculateAdaptiveMultiplier(tracker, 'balanced', 'neutral');

    expect(result.multiplier).toBe(ADAPTIVE_SCORING_CONFIG.multipliers.good);
    expect(result.category).toBe('good');
  });

  it('returns neutral multiplier for 50-60% hit rate', () => {
    const tracker = buildTrackerWithHitRate(0.55, 20);
    const result = calculateAdaptiveMultiplier(tracker, 'balanced', 'neutral');

    expect(result.multiplier).toBe(ADAPTIVE_SCORING_CONFIG.multipliers.neutral);
    expect(result.category).toBe('neutral');
  });

  it('returns poor multiplier for 40-50% hit rate', () => {
    const tracker = buildTrackerWithHitRate(0.45, 20);
    const result = calculateAdaptiveMultiplier(tracker, 'balanced', 'neutral');

    expect(result.multiplier).toBe(ADAPTIVE_SCORING_CONFIG.multipliers.poor);
    expect(result.category).toBe('poor');
  });

  it('returns very_poor multiplier for <40% hit rate', () => {
    const tracker = buildTrackerWithHitRate(0.3, 20);
    const result = calculateAdaptiveMultiplier(tracker, 'balanced', 'neutral');

    expect(result.multiplier).toBe(ADAPTIVE_SCORING_CONFIG.multipliers.very_poor);
    expect(result.category).toBe('very_poor');
  });
});

// -----------------------------------------------------------
// calculateSignalDecay
// -----------------------------------------------------------
describe('calculateSignalDecay', () => {
  it('returns 1.0 when decay is disabled', () => {
    const config = {
      ...ADAPTIVE_SCORING_CONFIG,
      decay_config: { ...ADAPTIVE_SCORING_CONFIG.decay_config, enabled: false },
    };
    const result = calculateSignalDecay(Date.now() - 30 * DAY_MS, Date.now(), config);
    expect(result).toBe(1.0);
  });

  it('returns 1.0 for zero-age signal', () => {
    const now = Date.now();
    const result = calculateSignalDecay(now, now);
    expect(result).toBe(1.0);
  });

  it('returns 1.0 for future signal (negative age)', () => {
    const result = calculateSignalDecay(Date.now() + DAY_MS, Date.now());
    expect(result).toBe(1.0);
  });

  it('returns ~0.5 at one half-life', () => {
    const halfLife = ADAPTIVE_SCORING_CONFIG.decay_config.half_life_days;
    const signalTs = Date.now() - halfLife * DAY_MS;
    const result = calculateSignalDecay(signalTs, Date.now());
    expect(result).toBeCloseTo(0.5, 1);
  });

  it('respects minimum multiplier floor', () => {
    const signalTs = Date.now() - 100 * DAY_MS; // Very old signal
    const result = calculateSignalDecay(signalTs, Date.now());
    expect(result).toBeGreaterThanOrEqual(ADAPTIVE_SCORING_CONFIG.decay_config.min_multiplier);
  });
});

// -----------------------------------------------------------
// adjustScoreAdaptively
// -----------------------------------------------------------
describe('adjustScoreAdaptively', () => {
  it('combines performance and decay multipliers', () => {
    const tracker = buildTrackerWithHitRate(0.8, 20);
    const signalTs = Date.now() - 5 * DAY_MS;

    const result = adjustScoreAdaptively(100, 'balanced', 'neutral', signalTs, tracker);

    expect(result.baseScore).toBe(100);
    expect(result.adjustedScore).toBeGreaterThan(0);
    expect(result.multipliers.performance).toBeDefined();
    expect(result.multipliers.decay).toBeDefined();
    expect(result.multipliers.combined).toBeCloseTo(
      result.multipliers.performance * result.multipliers.decay,
      5,
    );
    expect(result.metadata.strategy).toBe('balanced');
    expect(result.metadata.regime).toBe('neutral');
    expect(result.metadata.signalAge).toBeGreaterThan(0);
  });

  it('uses custom config when provided', () => {
    const config = {
      ...ADAPTIVE_SCORING_CONFIG,
      multipliers: { ...ADAPTIVE_SCORING_CONFIG.multipliers, excellent: 2.0 },
    };
    const tracker = buildTrackerWithHitRate(0.8, 20);
    const result = adjustScoreAdaptively(100, 'balanced', 'neutral', Date.now(), tracker, config);

    expect(result.multipliers.performance).toBe(2.0);
  });
});

// -----------------------------------------------------------
// adjustScoresBatch
// -----------------------------------------------------------
describe('adjustScoresBatch', () => {
  it('adjusts scores for all assets in the batch', () => {
    const tracker = buildTrackerWithHitRate(0.65, 20);
    const assets = [
      { ticker: 'AAPL', quant_score: 80, signal_timestamp: Date.now() - 2 * DAY_MS },
      { ticker: 'GOOGL', quant_score: 60, signal_timestamp: Date.now() - DAY_MS },
    ];

    const result = adjustScoresBatch(assets, 'balanced', 'neutral', tracker);

    expect(result).toHaveLength(2);
    result.forEach((asset) => {
      expect(asset.quant_score_original).toBeDefined();
      expect(asset.quant_score).toBeDefined();
      expect(asset.adaptive_adjustment).toBeDefined();
    });
  });

  it('handles missing signal_timestamp by using current time', () => {
    const tracker = buildTrackerWithHitRate(0.5, 5);
    const assets = [{ ticker: 'AAPL', quant_score: 70 }];

    const result = adjustScoresBatch(assets, 'balanced', 'neutral', tracker);
    expect(result[0].adaptive_adjustment.multipliers.decay).toBeCloseTo(1.0, 1);
  });
});

// -----------------------------------------------------------
// analyzePerformanceByRegime
// -----------------------------------------------------------
describe('analyzePerformanceByRegime', () => {
  it('analyzes all three regimes', () => {
    const tracker = new PerformanceTracker();

    // Add records for each regime
    for (let i = 0; i < 15; i++) {
      tracker.addRecord(makeRecord({ strategy: 'balanced', regime: 'risk_on', actualReturn: 5 }));
      tracker.addRecord(makeRecord({ strategy: 'balanced', regime: 'neutral', actualReturn: 2 }));
      tracker.addRecord(makeRecord({ strategy: 'balanced', regime: 'risk_off', actualReturn: -3 }));
    }

    const analysis = analyzePerformanceByRegime(tracker, 'balanced');

    expect(analysis.risk_on).toBeDefined();
    expect(analysis.neutral).toBeDefined();
    expect(analysis.risk_off).toBeDefined();

    expect(analysis.risk_on.multiplierRecommendation).toBe('increase');
    expect(analysis.risk_off.multiplierRecommendation).toBe('decrease');
  });

  it('returns maintain for regimes with moderate hit rate', () => {
    const tracker = buildTrackerWithHitRate(0.5, 20, 'balanced', 'neutral');
    const analysis = analyzePerformanceByRegime(tracker, 'balanced');

    expect(analysis.neutral.multiplierRecommendation).toBe('maintain');
  });
});

// -----------------------------------------------------------
// getStrategyPerformanceReport
// -----------------------------------------------------------
describe('getStrategyPerformanceReport', () => {
  it('generates a complete report', () => {
    const tracker = new PerformanceTracker();

    for (let i = 0; i < 20; i++) {
      tracker.addRecord(
        makeRecord({
          strategy: 'balanced',
          regime: i < 10 ? 'risk_on' : 'neutral',
          actualReturn: i < 14 ? 5 : -5,
          score: 50 + i * 2,
        }),
      );
    }

    const report = getStrategyPerformanceReport(tracker, 'balanced');

    expect(report.strategy).toBe('balanced');
    expect(report.overall).toBeDefined();
    expect(report.byRegime).toBeDefined();
    expect(report.scoreCorrelation).toBeDefined();
    expect(report.recommendations).toBeDefined();
    expect(report.timestamp).toBeDefined();
  });

  it('generates warning for low hit rate', () => {
    const tracker = buildTrackerWithHitRate(0.3, 20);
    const report = getStrategyPerformanceReport(tracker, 'balanced');

    const hasWarning = report.recommendations.some((r) => r.type === 'warning');
    expect(hasWarning).toBe(true);
  });

  it('generates success for high hit rate', () => {
    const tracker = buildTrackerWithHitRate(0.8, 20);
    const report = getStrategyPerformanceReport(tracker, 'balanced');

    const hasSuccess = report.recommendations.some((r) => r.type === 'success');
    expect(hasSuccess).toBe(true);
  });

  it('generates info for small sample size', () => {
    const tracker = buildTrackerWithHitRate(0.5, 15);
    const report = getStrategyPerformanceReport(tracker, 'balanced');

    const hasInfo = report.recommendations.some((r) => r.type === 'info');
    expect(hasInfo).toBe(true);
  });
});

// -----------------------------------------------------------
// Persistence: savePerformanceTracker / loadPerformanceTracker
// -----------------------------------------------------------
describe('Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads a tracker round-trip', async () => {
    const tracker = new PerformanceTracker();
    tracker.addRecord(makeRecord({ assetId: 'AAPL', score: 80 }));

    const saveResult = await savePerformanceTracker(tracker);
    expect(saveResult.success).toBe(true);

    const loaded = await loadPerformanceTracker();
    expect(loaded.records).toHaveLength(1);
    expect(loaded.records[0].assetId).toBe('AAPL');
  });

  it('returns empty tracker when nothing stored', async () => {
    const loaded = await loadPerformanceTracker();
    expect(loaded.records).toHaveLength(0);
  });

  it('returns empty tracker on corrupted data', async () => {
    localStorage.setItem('adaptive_scoring', 'not-valid-json{{{');
    const loaded = await loadPerformanceTracker();
    expect(loaded.records).toHaveLength(0);
  });

  it('save handles localStorage error gracefully', async () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('QuotaExceeded'); };

    const tracker = new PerformanceTracker();
    tracker.addRecord(makeRecord());

    const result = await savePerformanceTracker(tracker);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    localStorage.setItem = originalSetItem;
  });
});
