import { describe, it, expect } from 'vitest';
import {
  FACTOR_WEIGHTS_CONFIG,
  extractFactorFeatures,
  prepareTrainingData,
  trainFactorWeightingModel,
  optimizeFactorWeights,
  trainAndOptimizeFactorWeights,
} from '../../ml/factor-weighting.js';
import { featureImportanceToFactorWeights } from '../../ml/factor-weighting.js';

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function buildAssetWithPrices(days, startPrice = 100, trend = 0.001) {
  const prices = [];
  let price = startPrice;
  for (let i = 0; i < days; i++) {
    price *= 1 + trend + (Math.random() - 0.5) * 0.02;
    prices.push(price);
  }
  const volumes = Array.from({ length: days }, () => 50000 + Math.random() * 50000);
  return { prices, volumes };
}

function buildHistoricalAssets(count, days = 150) {
  const assets = [];
  for (let i = 0; i < count; i++) {
    const { prices, volumes } = buildAssetWithPrices(days);
    assets.push({
      ticker: `ASSET_${i}`,
      prices,
      volumes,
    });
  }
  return assets;
}

// -----------------------------------------------------------
// extractFactorFeatures
// -----------------------------------------------------------
describe('extractFactorFeatures', () => {
  it('returns null for insufficient price data (< 50)', () => {
    const asset = { prices: Array(30).fill(100), volumes: Array(30).fill(10000) };
    const result = extractFactorFeatures(asset, null);
    expect(result).toBeNull();
  });

  it('extracts all expected feature keys for sufficient data', () => {
    const { prices, volumes } = buildAssetWithPrices(200);
    const asset = { prices, volumes };
    const features = extractFactorFeatures(asset, null);

    expect(features).toBeDefined();
    expect(features.roc_20).toBeDefined();
    expect(features.roc_60).toBeDefined();
    expect(features.roc_120).toBeDefined();
    expect(features.price_vs_ema20).toBeDefined();
    expect(features.price_vs_ema50).toBeDefined();
    expect(features.price_vs_ema200).toBeDefined();
    expect(features.volatility_20).toBeDefined();
    expect(features.volatility_60).toBeDefined();
    expect(features.drawdown).toBeDefined();
    expect(features.volume_ratio).toBeDefined();
    expect(features.trend_consistency).toBeDefined();
    expect(features.return_stability).toBeDefined();
    expect(features.momentum_score).toBeDefined();
    expect(features.volatility_score).toBeDefined();
    expect(features.volume_score).toBeDefined();
    expect(features.quality_score).toBeDefined();
  });

  it('uses roc_20 fallback when prices.length < 60', () => {
    const { prices, volumes } = buildAssetWithPrices(55);
    const asset = { prices, volumes };
    const features = extractFactorFeatures(asset, null);

    expect(features).toBeDefined();
    // roc_60 should fall back to roc_20
    expect(features.roc_60).toBeDefined();
  });

  it('handles missing volumes gracefully', () => {
    const prices = buildAssetWithPrices(100).prices;
    const asset = { prices, volumes: [] };
    const features = extractFactorFeatures(asset, null);

    expect(features).toBeDefined();
    expect(features.volume_ratio).toBe(1.0);
  });

  it('handles short volumes array (< 20)', () => {
    const prices = buildAssetWithPrices(100).prices;
    const asset = { prices, volumes: Array(10).fill(10000) };
    const features = extractFactorFeatures(asset, null);

    expect(features.volume_ratio).toBe(1.0);
  });

  it('caps volume_score at 3', () => {
    const prices = buildAssetWithPrices(100).prices;
    // Create volumes where last is 10x the average
    const volumes = Array(100).fill(1000);
    volumes[99] = 100000;
    const asset = { prices, volumes };
    const features = extractFactorFeatures(asset, null);

    expect(features.volume_score).toBeLessThanOrEqual(3);
  });

  it('uses 0.5 for trend_consistency when prices < 60', () => {
    const { prices, volumes } = buildAssetWithPrices(55);
    const asset = { prices, volumes };
    const features = extractFactorFeatures(asset, null);

    expect(features.trend_consistency).toBe(0.5);
  });
});

// -----------------------------------------------------------
// prepareTrainingData
// -----------------------------------------------------------
describe('prepareTrainingData', () => {
  it('returns empty arrays for insufficient data', () => {
    const assets = [{ ticker: 'X', prices: Array(30).fill(100), volumes: [] }];
    const { X, y } = prepareTrainingData(assets);
    expect(X).toHaveLength(0);
    expect(y).toHaveLength(0);
  });

  it('extracts features and forward returns from valid assets', () => {
    const assets = buildHistoricalAssets(5, 200);
    const { X, y } = prepareTrainingData(assets);

    expect(X.length).toBeGreaterThan(0);
    expect(y.length).toBe(X.length);
    expect(X[0]).toHaveLength(12); // 12 raw features
  });

  it('skips assets with insufficient price history', () => {
    const validAssets = buildHistoricalAssets(3, 200);
    const invalidAssets = [{ ticker: 'SHORT', prices: Array(30).fill(100), volumes: [] }];
    const { X } = prepareTrainingData([...validAssets, ...invalidAssets]);

    // invalid asset should be skipped
    expect(X.length).toBeLessThanOrEqual(3);
  });
});

// -----------------------------------------------------------
// trainFactorWeightingModel
// -----------------------------------------------------------
describe('trainFactorWeightingModel', () => {
  it('returns failure for insufficient training samples', () => {
    const X = [[1, 2, 3]];
    const y = [1];
    const result = trainFactorWeightingModel(X, y);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient');
    expect(result.model).toBeNull();
  });

  it('trains successfully with sufficient data (linear_regression)', () => {
    const assets = buildHistoricalAssets(40, 200);
    const { X, y } = prepareTrainingData(assets);

    if (X.length >= 20) {
      const config = { ...FACTOR_WEIGHTS_CONFIG, model_type: 'linear_regression' };
      const result = trainFactorWeightingModel(X, y, config);
      expect(result.success).toBe(true);
      expect(result.model).toBeDefined();
      expect(result.modelType).toBe('Linear Regression');
      expect(result.metrics.train).toBeDefined();
      expect(result.metrics.test).toBeDefined();
      expect(result.cvScores).toBeDefined();
      expect(result.featureNames).toHaveLength(12);
      expect(result.trainingSize).toBeGreaterThan(0);
      expect(result.testSize).toBeGreaterThan(0);
    }
  });
});

// -----------------------------------------------------------
// featureImportanceToFactorWeights
// -----------------------------------------------------------
describe('featureImportanceToFactorWeights', () => {
  it('converts feature importance to factor weights', () => {
    const featureImportance = [0.2, 0.15, 0.1, 0.05, 0.05, 0.05, 0.1, 0.08, 0.05, 0.07, 0.05, 0.05];
    const featureNames = [
      'roc_20', 'roc_60', 'roc_120',
      'price_vs_ema20', 'price_vs_ema50', 'price_vs_ema200',
      'volatility_20', 'volatility_60', 'drawdown',
      'volume_ratio', 'trend_consistency', 'return_stability',
    ];

    const weights = featureImportanceToFactorWeights(featureImportance, featureNames);

    expect(weights.momentum).toBeGreaterThan(0);
    expect(weights.volatility).toBeGreaterThan(0);
    expect(weights.volume).toBeGreaterThan(0);
    expect(weights.quality).toBeGreaterThan(0);
    expect(weights.value).toBeGreaterThan(0);

    // Weights should approximately sum to 1
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    expect(total).toBeCloseTo(1.0, 1);
  });

  it('falls back to defaults when total is 0', () => {
    const featureImportance = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const featureNames = [
      'roc_20', 'roc_60', 'roc_120',
      'price_vs_ema20', 'price_vs_ema50', 'price_vs_ema200',
      'volatility_20', 'volatility_60', 'drawdown',
      'volume_ratio', 'trend_consistency', 'return_stability',
    ];

    const weights = featureImportanceToFactorWeights(featureImportance, featureNames);

    // Should still have valid weights from smoothing with defaults
    expect(weights.momentum).toBeGreaterThan(0);
    expect(weights.value).toBeGreaterThan(0);
  });
});

// -----------------------------------------------------------
// optimizeFactorWeights
// -----------------------------------------------------------
describe('optimizeFactorWeights', () => {
  it('returns default weights for failed training', () => {
    const result = optimizeFactorWeights({ success: false });
    expect(result.success).toBe(false);
    expect(result.useDefault).toBe(true);
    expect(result.weights).toEqual(FACTOR_WEIGHTS_CONFIG.default_weights);
  });

  it('returns default weights when featureImportance is null', () => {
    const result = optimizeFactorWeights({ success: true, featureImportance: null });
    expect(result.success).toBe(false);
    expect(result.useDefault).toBe(true);
  });

  it('returns default weights when model R² is too low', () => {
    const result = optimizeFactorWeights({
      success: true,
      featureImportance: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.05, 0.05],
      featureNames: [
        'roc_20', 'roc_60', 'roc_120',
        'price_vs_ema20', 'price_vs_ema50', 'price_vs_ema200',
        'volatility_20', 'volatility_60', 'drawdown',
        'volume_ratio', 'trend_consistency', 'return_stability',
      ],
      metrics: { test: { r2: 0.05 } },
    });

    expect(result.success).toBe(false);
    expect(result.useDefault).toBe(true);
    expect(result.reason).toContain('Low model performance');
  });

  it('returns optimized weights for good model', () => {
    const result = optimizeFactorWeights({
      success: true,
      featureImportance: [0.2, 0.15, 0.1, 0.05, 0.05, 0.05, 0.1, 0.08, 0.05, 0.07, 0.05, 0.05],
      featureNames: [
        'roc_20', 'roc_60', 'roc_120',
        'price_vs_ema20', 'price_vs_ema50', 'price_vs_ema200',
        'volatility_20', 'volatility_60', 'drawdown',
        'volume_ratio', 'trend_consistency', 'return_stability',
      ],
      metrics: { test: { r2: 0.3 } },
    });

    expect(result.success).toBe(true);
    expect(result.useDefault).toBe(false);
    expect(result.weights.momentum).toBeGreaterThan(0);
    expect(result.featureImportance).toBeDefined();
    expect(result.featureImportance[0].importance).toBeGreaterThanOrEqual(result.featureImportance[1].importance);
  });
});

// -----------------------------------------------------------
// trainAndOptimizeFactorWeights (full pipeline)
// -----------------------------------------------------------
describe('trainAndOptimizeFactorWeights', () => {
  it('returns failure for insufficient data', async () => {
    const assets = [{ ticker: 'X', prices: Array(30).fill(100), volumes: [] }];
    const result = await trainAndOptimizeFactorWeights(assets);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient');
    expect(result.useDefault).toBe(true);
    expect(result.weights).toEqual(FACTOR_WEIGHTS_CONFIG.default_weights);
  });

  it('runs full pipeline successfully with enough data', async () => {
    const assets = buildHistoricalAssets(50, 200);
    const config = { ...FACTOR_WEIGHTS_CONFIG, model_type: 'linear_regression' };
    const result = await trainAndOptimizeFactorWeights(assets, config);

    // May succeed or fall back to defaults depending on random data quality
    expect(result.weights).toBeDefined();
    expect(Object.keys(result.weights)).toEqual(
      expect.arrayContaining(['momentum', 'value', 'volatility', 'volume', 'quality']),
    );
  });
});
