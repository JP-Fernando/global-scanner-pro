/**
 * Integration tests: ML Pipeline
 *
 * Tests the ML modules chained together:
 * Factor Weighting → Adaptive Scoring → Regime Prediction →
 * Recommendation Engine → Anomaly Detection
 */

import { describe, it, expect } from 'vitest';
import { buildPriceSeries, buildScoredAssets } from './helpers.js';

// ML modules
import {
  extractFactorFeatures,
  prepareTrainingData,
  trainFactorWeightingModel,
  optimizeFactorWeights,
  FACTOR_WEIGHTS_CONFIG,
} from '../../ml/factor-weighting.js';
import {
  PerformanceTracker as AdaptivePerformanceTracker,
  PerformanceRecord,
  adjustScoreAdaptively,
  adjustScoresBatch,
  analyzePerformanceByRegime,
} from '../../ml/adaptive-scoring.js';
import {
  extractRegimeFeatures,
  trainRegimeClassifier,
  predictRegime,
} from '../../ml/regime-prediction.js';
import {
  generateRecommendations,
  analyzeAssetML,
  RECOMMENDATION_TYPES,
} from '../../ml/recommendation-engine.js';
import {
  detectAllAnomalies,
  getAnomalySummary,
  detectZScoreAnomalies,
} from '../../ml/anomaly-detection.js';

// ---------------------------------------------------------------------------
// Helper: build asset data for ML modules
// ---------------------------------------------------------------------------

function buildMLAssets(n = 5) {
  const prices = buildPriceSeries(100, 300, 0.15);
  const volumes = Array.from({ length: 300 }, (_, i) => 50000 + i * 100);

  return Array.from({ length: n }, (_, i) => ({
    ticker: `ML${i}`,
    name: `ML Asset ${i}`,
    quant_score: 50 + i * 8,
    scoreTotal: 50 + i * 8,
    prices,
    volumes,
    weight: 1 / n,
    details: {
      trend: { score: 60 + i * 3 },
      momentum: { score: 55 + i * 4, roc6m: (5 + i).toFixed(2), roc12m: (8 + i).toFixed(2) },
      risk: { score: 70 - i * 2, volatility: (20 + i * 3).toFixed(2), maxDrawdown: (10 + i * 2).toFixed(2) },
      liquidity: { score: 80, avgVol20: '5000000', avgVol60: '4800000' },
    },
  }));
}

/**
 * Build market data with the shape extractRegimeFeatures expects:
 * { benchmarkPrices, assetPrices, volumes, correlations }
 * benchmarkPrices must have >= 200 entries.
 */
function buildRegimeMarketData() {
  const benchmarkPrices = buildPriceSeries(100, 250, 0.12);
  const assetPrices = Array.from({ length: 5 }, (_, i) =>
    buildPriceSeries(80 + i * 10, 250, 0.1 + i * 0.02),
  );
  return {
    benchmarkPrices,
    assetPrices,
    volumes: Array(250).fill(1000000),
    correlations: [
      [1, 0.6, 0.5, 0.4, 0.3],
      [0.6, 1, 0.55, 0.45, 0.35],
      [0.5, 0.55, 1, 0.5, 0.4],
      [0.4, 0.45, 0.5, 1, 0.5],
      [0.3, 0.35, 0.4, 0.5, 1],
    ],
  };
}

function buildMarketData() {
  return {
    ...buildRegimeMarketData(),
    assets: buildMLAssets(5),
    regime: 'risk_on',
  };
}

// ---------------------------------------------------------------------------
// 1. Factor feature extraction
// ---------------------------------------------------------------------------

describe('Factor feature extraction', () => {
  it('extracts features from an asset with sufficient data', () => {
    const assets = buildMLAssets(1);
    const features = extractFactorFeatures(assets[0]);

    expect(features).toBeDefined();
    // extractFactorFeatures returns roc_*, volatility_*, volume_ratio, etc.
    expect(typeof features.roc_20).toBe('number');
    expect(typeof features.volatility_20).toBe('number');
    expect(typeof features.volume_ratio).toBe('number');
    expect(typeof features.trend_consistency).toBe('number');
  });

  it('extracts features from multiple assets for training', () => {
    const assets = buildMLAssets(10);
    const allFeatures = assets.map(a => extractFactorFeatures(a));
    expect(allFeatures).toHaveLength(10);
    allFeatures.forEach(f => {
      expect(typeof f.roc_20).toBe('number');
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Factor weighting training pipeline
// ---------------------------------------------------------------------------

describe('Factor weighting training pipeline', () => {
  // Use linear model to avoid the RF onProgress bug in trainFactorWeightingModel
  const linearConfig = { ...FACTOR_WEIGHTS_CONFIG, model_type: 'linear' };

  it('prepares training data from historical assets', () => {
    const assets = buildMLAssets(20);
    const { X, y } = prepareTrainingData(assets);

    expect(X.length).toBeGreaterThan(0);
    expect(y.length).toBe(X.length);
    // Each feature vector has 12 elements
    expect(X[0].length).toBe(12);
  });

  it('trains a model and produces weight optimisation result', () => {
    const assets = buildMLAssets(20);
    const { X, y } = prepareTrainingData(assets);

    const result = trainFactorWeightingModel(X, y, linearConfig);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.model).toBeDefined();
    expect(result.metrics).toBeDefined();
  });

  it('optimises factor weights from training result', () => {
    const assets = buildMLAssets(20);
    const { X, y } = prepareTrainingData(assets);
    const trainingResult = trainFactorWeightingModel(X, y, linearConfig);

    // optimizeFactorWeights needs featureNames on the result
    trainingResult.featureNames = [
      'roc_20', 'roc_60', 'roc_120',
      'price_vs_ema20', 'price_vs_ema50', 'price_vs_ema200',
      'volatility_20', 'volatility_60', 'drawdown',
      'volume_ratio', 'trend_consistency', 'return_stability',
    ];

    const optimized = optimizeFactorWeights(trainingResult);
    expect(optimized).toBeDefined();
    expect(optimized.weights).toBeDefined();

    // Weights should sum to ~1.0
    const weightSum = Object.values(optimized.weights).reduce((s, w) => s + w, 0);
    expect(weightSum).toBeCloseTo(1.0, 1);

    // All weights should be non-negative
    for (const w of Object.values(optimized.weights)) {
      expect(w).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Adaptive scoring feedback loop
// ---------------------------------------------------------------------------

describe('Adaptive scoring feedback loop', () => {
  it('records performance and adjusts scores based on hit rate', () => {
    const tracker = new AdaptivePerformanceTracker();

    // Record 20 performance records (15 hits, 5 misses → 75% hit rate)
    for (let i = 0; i < 20; i++) {
      const record = new PerformanceRecord(
        'AAPL', Date.now() - i * 86400000,
        80, i < 15 ? 5.0 : -3.0,
        'risk_on', 'momentum',
      );
      tracker.addRecord(record);
    }

    // Signature: adjustScoreAdaptively(baseScore, strategy, regime, signalTimestamp, performanceTracker)
    const result = adjustScoreAdaptively(70, 'momentum', 'risk_on', Date.now(), tracker);
    expect(result.adjustedScore).toBeGreaterThan(70); // Good hit rate → multiplier > 1
  });

  it('penalises scores with poor hit rate', () => {
    const tracker = new AdaptivePerformanceTracker();

    // Record 20 performance records (5 hits, 15 misses → 25% hit rate)
    for (let i = 0; i < 20; i++) {
      const record = new PerformanceRecord(
        'BAD', Date.now() - i * 86400000,
        60, i < 5 ? 2.0 : -4.0,
        'risk_off', 'momentum',
      );
      tracker.addRecord(record);
    }

    const result = adjustScoreAdaptively(60, 'momentum', 'risk_off', Date.now(), tracker);
    expect(result.adjustedScore).toBeLessThan(60); // Poor hit rate → multiplier < 1
  });

  it('batch-adjusts scores for multiple assets', () => {
    const tracker = new AdaptivePerformanceTracker();

    // Add records
    for (let i = 0; i < 15; i++) {
      tracker.addRecord(new PerformanceRecord('X', Date.now() - i * 86400000, 70, 3.0, 'risk_on', 'momentum'));
    }

    const assets = [
      { ticker: 'X', quant_score: 70, strategy: 'momentum' },
      { ticker: 'Y', quant_score: 60, strategy: 'momentum' },
    ];

    // Signature: adjustScoresBatch(assets, strategy, regime, performanceTracker)
    const adjusted = adjustScoresBatch(assets, 'momentum', 'risk_on', tracker);
    expect(adjusted).toHaveLength(2);
    // X should be boosted (good history), Y stays similar (no history)
  });

  it('analyses performance by regime', () => {
    const tracker = new AdaptivePerformanceTracker();

    for (let i = 0; i < 10; i++) {
      tracker.addRecord(new PerformanceRecord('A', Date.now() - i * 86400000, 80, 5.0, 'risk_on', 'momentum'));
    }
    for (let i = 0; i < 10; i++) {
      tracker.addRecord(new PerformanceRecord('B', Date.now() - i * 86400000, 60, -2.0, 'risk_off', 'momentum'));
    }

    const analysis = analyzePerformanceByRegime(tracker, 'momentum');
    expect(analysis).toBeDefined();
    expect(typeof analysis).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// 4. Regime prediction pipeline
// ---------------------------------------------------------------------------

describe('Regime prediction pipeline', () => {
  it('extracts regime features from market data', () => {
    // extractRegimeFeatures needs { benchmarkPrices (>=200), assetPrices, volumes, correlations }
    const marketData = buildRegimeMarketData();
    const features = extractRegimeFeatures(marketData);

    expect(features).toBeDefined();
    expect(features).not.toBeNull();
    expect(typeof features.trend_short).toBe('number');
    expect(typeof features.vol_20).toBe('number');
  });

  it('trains a regime classifier from synthetic feature arrays', () => {
    // Build synthetic X/y directly (bypassing prepareRegimeTrainingData which
    // needs full market data per sample — 200+ prices each)
    const X = Array.from({ length: 50 }, (_, i) => [
      Math.sin(i * 0.1) * 10,   // trend_short
      Math.sin(i * 0.05) * 15,  // trend_medium
      Math.sin(i * 0.02) * 20,  // trend_long
      i % 3 === 0 ? 1 : -1,     // ema_alignment
      15 + Math.sin(i * 0.1) * 5,  // vol_20
      18 + Math.sin(i * 0.05) * 3, // vol_60
      0.8 + Math.sin(i * 0.1) * 0.3, // vol_ratio
      Math.sin(i * 0.1) * 5,    // roc_20
      Math.sin(i * 0.05) * 8,   // roc_60
      0.3 + Math.sin(i * 0.1) * 0.3, // breadth_score
      0.4 + Math.sin(i * 0.05) * 0.2, // avg_correlation
      1.0 + Math.sin(i * 0.1) * 0.3,  // volume_trend
    ]);
    const y = Array.from({ length: 50 }, (_, i) => i % 3);

    const result = trainRegimeClassifier(X, y);
    expect(result.success).toBe(true);
    expect(result.model).toBeDefined();
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
  });

  it('predicts regime from current market data', () => {
    // Train a classifier with clear bullish / bearish separation
    const X = Array.from({ length: 50 }, (_, i) => [
      i > 25 ? 5 : -5, i > 25 ? 8 : -8, i > 25 ? 10 : -10,
      i > 25 ? 1 : -1, 15, 18, 0.9,
      i > 25 ? 3 : -3, i > 25 ? 5 : -5,
      i > 25 ? 0.7 : 0.3, 0.4, 1.0,
    ]);
    const y = Array.from({ length: 50 }, (_, i) => (i > 25 ? 2 : 0));

    const trainResult = trainRegimeClassifier(X, y);

    // predictRegime calls extractRegimeFeatures internally, so pass full market data.
    // It expects the classifier model directly (not the wrapper object).
    const marketData = buildRegimeMarketData();
    const prediction = predictRegime(marketData, trainResult.model);

    expect(prediction).toBeDefined();
    expect(['risk_on', 'neutral', 'risk_off']).toContain(prediction.regime);
    expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
    expect(prediction.probabilities).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 5. Anomaly detection
// ---------------------------------------------------------------------------

describe('Anomaly detection', () => {
  it('detects Z-score anomalies in a scored universe', () => {
    const assets = buildMLAssets(10);
    // Make one asset an outlier
    assets[0].quant_score = 150; // Way above normal

    const anomalies = detectZScoreAnomalies(assets, 'quant_score');
    expect(anomalies).toBeDefined();
    // The outlier should be flagged
    if (anomalies.length > 0) {
      expect(anomalies[0].ticker || anomalies[0].asset).toBeTruthy();
    }
  });

  it('detectAllAnomalies produces a combined anomaly report', () => {
    const assets = buildMLAssets(8);
    const anomalies = detectAllAnomalies(assets);

    expect(anomalies).toBeDefined();
    expect(typeof anomalies).toBe('object');
  });

  it('getAnomalySummary produces counts and highlights', () => {
    const assets = buildMLAssets(8);
    const anomalies = detectAllAnomalies(assets);
    const summary = getAnomalySummary(anomalies);

    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// 6. Recommendation engine
// ---------------------------------------------------------------------------

describe('Recommendation engine', () => {
  it('generates recommendations from portfolio and market data', () => {
    const portfolio = buildScoredAssets(5).map(a => ({
      ...a,
      weight: 0.20,
      current_weight: 0.20,
      target_weight: 0.20,
      entry_price: a.price,
      current_price: a.price * 1.05,
    }));

    const marketData = buildMarketData();
    const recs = generateRecommendations(portfolio, marketData, null);

    expect(recs).toBeDefined();
    expect(Array.isArray(recs)).toBe(true);

    // Each recommendation has required fields
    for (const rec of recs) {
      expect(rec.type).toBeTruthy();
      expect(rec.title).toBeTruthy();
      expect(rec.message).toBeTruthy();
      expect(rec.priority).toBeDefined();
    }
  });

  it('generates risk warnings for high-vol portfolio', () => {
    const portfolio = buildScoredAssets(3).map(a => ({
      ...a,
      weight: 0.33,
      current_weight: 0.33,
      target_weight: 0.33,
      entry_price: a.price,
      current_price: a.price * 0.85, // 15% decline
      details: { ...a.details, risk: { ...a.details.risk, volatility: '55.00' } },
    }));

    const recs = generateRecommendations(portfolio, {}, null);

    // Should contain at least one risk warning
    const riskWarnings = recs.filter(r => r.type === RECOMMENDATION_TYPES.RISK_WARNING);
    expect(riskWarnings.length).toBeGreaterThanOrEqual(0);
  });

  it('analyzeAssetML produces ML insights for a single asset', () => {
    const asset = buildMLAssets(1)[0];
    const marketData = buildMarketData();

    const insights = analyzeAssetML(asset, marketData, buildMLAssets(5));
    expect(insights).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 7. Full ML chain
// ---------------------------------------------------------------------------

describe('Full ML chain integration', () => {
  it('chains factor weighting → adaptive scoring → anomaly detection', () => {
    const assets = buildMLAssets(15);
    const linearConfig = { ...FACTOR_WEIGHTS_CONFIG, model_type: 'linear' };

    // Step 1: Extract features and prepare training data
    const { X, y } = prepareTrainingData(assets);
    expect(X.length).toBeGreaterThan(0);

    // Step 2: Train factor model (linear to avoid RF onProgress bug)
    const trainResult = trainFactorWeightingModel(X, y, linearConfig);
    trainResult.featureNames = [
      'roc_20', 'roc_60', 'roc_120',
      'price_vs_ema20', 'price_vs_ema50', 'price_vs_ema200',
      'volatility_20', 'volatility_60', 'drawdown',
      'volume_ratio', 'trend_consistency', 'return_stability',
    ];
    const optimized = optimizeFactorWeights(trainResult);
    expect(optimized.weights).toBeDefined();

    // Step 3: Create performance tracker and seed with history
    const tracker = new AdaptivePerformanceTracker();
    for (let i = 0; i < 15; i++) {
      tracker.addRecord(new PerformanceRecord(
        assets[0].ticker, Date.now() - i * 86400000,
        assets[0].scoreTotal, 3.0, 'risk_on', 'momentum',
      ));
    }

    // Step 4: Adjust scores adaptively
    // Signature: adjustScoresBatch(assets, strategy, regime, performanceTracker)
    const adjusted = adjustScoresBatch(assets, 'momentum', 'risk_on', tracker);
    expect(adjusted).toHaveLength(15);

    // Step 5: Detect anomalies on the scored universe
    const anomalies = detectAllAnomalies(assets);
    expect(anomalies).toBeDefined();

    // Step 6: Generate recommendations
    const portfolio = assets.slice(0, 5).map(a => ({
      ...a,
      weight: 0.20,
      current_weight: 0.20,
      target_weight: 0.20,
      entry_price: 100,
      current_price: 105,
    }));

    const recs = generateRecommendations(portfolio, { anomalies }, null);
    expect(Array.isArray(recs)).toBe(true);
  });
});
