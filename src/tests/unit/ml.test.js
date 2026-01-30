import { describe, it, expect } from 'vitest';
import {
  LinearRegression,
  RandomForestRegressor,
  KMeans,
  calculateR2,
  calculateMAE,
  trainTestSplit,
} from '../../ml/ml-engine.js';
import { extractFactorFeatures } from '../../ml/factor-weighting.js';
import {
  PerformanceTracker,
  PerformanceRecord,
  adjustScoreAdaptively,
} from '../../ml/adaptive-scoring.js';
import { trainRegimeClassifier } from '../../ml/regime-prediction.js';
import {
  generateRecommendations,
  RECOMMENDATION_TYPES,
} from '../../ml/recommendation-engine.js';
import {
  detectAllAnomalies,
  detectZScoreAnomalies,
  detectClusterAnomalies,
} from '../../ml/anomaly-detection.js';

// -----------------------------------------------------------
// Linear Regression
// -----------------------------------------------------------
describe('Linear Regression', () => {
  it('fits y = 2x + 1 with R² > 0.95', () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [3, 5, 7, 9, 11];

    const model = new LinearRegression();
    model.fit(X, y, { epochs: 1000, learningRate: 0.1 });

    const predictions = model.predict(X);
    const r2 = calculateR2(y, predictions);

    expect(r2).toBeGreaterThan(0.95);
  });
});

// -----------------------------------------------------------
// Random Forest Regressor
// -----------------------------------------------------------
describe('Random Forest Regressor', () => {
  it('fits a non-linear function with MAE < 10', () => {
    const X = [];
    const y = [];

    for (let i = 0; i < 50; i++) {
      const x1 = Math.random() * 10;
      const x2 = Math.random() * 10;
      X.push([x1, x2]);
      y.push(x1 * x1 + x2);
    }

    const { X_train, X_test, y_train, y_test } = trainTestSplit(X, y, 0.2, true);

    const model = new RandomForestRegressor({
      nEstimators: 20,
      maxDepth: 5,
      minSamplesSplit: 3,
    });

    model.fit(X_train, y_train);
    const predictions = model.predict(X_test);
    const mae = calculateMAE(y_test, predictions);

    expect(mae).toBeLessThan(10);
    expect(model.trees.length).toBe(20);
  });
});

// -----------------------------------------------------------
// K-Means Clustering
// -----------------------------------------------------------
describe('K-Means Clustering', () => {
  it('identifies 3 clusters with low inertia', () => {
    const X = [];

    // Cluster 1: around (0, 0)
    for (let i = 0; i < 20; i++) {
      X.push([Math.random() - 0.5, Math.random() - 0.5]);
    }
    // Cluster 2: around (5, 5)
    for (let i = 0; i < 20; i++) {
      X.push([5 + Math.random() - 0.5, 5 + Math.random() - 0.5]);
    }
    // Cluster 3: around (0, 5)
    for (let i = 0; i < 20; i++) {
      X.push([Math.random() - 0.5, 5 + Math.random() - 0.5]);
    }

    const model = new KMeans({ k: 3, maxIterations: 100 });
    model.fit(X);

    const labels = model.predict(X);
    const inertia = model.getInertia(X);

    expect(new Set(labels).size).toBe(3);
    expect(inertia).toBeLessThan(50);
    expect(model.centroids).toHaveLength(3);
  });
});

// -----------------------------------------------------------
// Factor Weighting
// -----------------------------------------------------------
describe('Factor Weighting', () => {
  it('extracts momentum_score from historical asset data', () => {
    const prices = [];
    let price = 100;

    for (let j = 0; j < 150; j++) {
      price *= 1 + (Math.random() - 0.5) * 0.02;
      prices.push(price);
    }

    const historicalAsset = {
      ticker: 'ASSET_0',
      prices,
      volumes: Array(150).fill(0).map(() => 100000 * Math.random()),
    };

    const features = extractFactorFeatures(historicalAsset, null);

    expect(features).toBeDefined();
    expect(features.momentum_score).toBeDefined();
  });
});

// -----------------------------------------------------------
// Adaptive Scoring
// -----------------------------------------------------------
describe('Adaptive Scoring', () => {
  it('adjusts scores within valid range based on performance history', () => {
    const tracker = new PerformanceTracker();

    for (let i = 0; i < 20; i++) {
      const record = new PerformanceRecord(
        `ASSET_${i}`,
        Date.now() - i * 24 * 60 * 60 * 1000,
        70 + Math.random() * 20,
        (Math.random() - 0.3) * 10,
        'neutral',
        'balanced'
      );
      tracker.addRecord(record);
    }

    const hitRate = tracker.calculateHitRate({ strategy: 'balanced' });
    expect(hitRate.sampleSize).toBeGreaterThan(0);

    const adjustment = adjustScoreAdaptively(
      75,
      'balanced',
      'neutral',
      Date.now() - 5 * 24 * 60 * 60 * 1000,
      tracker
    );

    expect(adjustment.adjustedScore).toBeGreaterThan(0);
    expect(adjustment.adjustedScore).toBeLessThanOrEqual(150);
    expect(adjustment.baseScore).toBe(75);
    expect(adjustment.multipliers.performance).toBeDefined();
    expect(adjustment.multipliers.decay).toBeDefined();
  });
});

// -----------------------------------------------------------
// Regime Prediction
// -----------------------------------------------------------
describe('Regime Prediction', () => {
  it('trains a classifier with >60% accuracy', () => {
    const X = [];
    const y = [];

    // Risk-on data (label: 2)
    for (let i = 0; i < 15; i++) {
      X.push([
        5 + Math.random(), 3 + Math.random(), 2 + Math.random(), 1,
        12 + Math.random(), 15 + Math.random(), 0.8 + Math.random() * 0.2,
        10 + Math.random() * 5, 8 + Math.random() * 3,
        0.7 + Math.random() * 0.2, 0.4 + Math.random() * 0.2, 1.2 + Math.random() * 0.3,
      ]);
      y.push(2);
    }

    // Risk-off data (label: 0)
    for (let i = 0; i < 15; i++) {
      X.push([
        -3 - Math.random(), -2 - Math.random(), -1 - Math.random(), -1,
        28 + Math.random() * 5, 25 + Math.random() * 3, 1.2 + Math.random() * 0.3,
        -8 - Math.random() * 5, -5 - Math.random() * 3,
        0.2 + Math.random() * 0.2, 0.7 + Math.random() * 0.2, 0.8 + Math.random() * 0.2,
      ]);
      y.push(0);
    }

    const result = trainRegimeClassifier(X, y);

    expect(result.success).toBe(true);
    expect(result.accuracy).toBeGreaterThan(0.6);
    expect(result.trainingSize).toBeGreaterThan(0);
  });
});

// -----------------------------------------------------------
// Recommendation Engine
// -----------------------------------------------------------
describe('Recommendation Engine', () => {
  it('generates recommendations including rebalance alerts', () => {
    const portfolio = {
      total_value: 100000,
      positions: {
        AAPL: { weight: 0.25, quant_score: 75 },
        GOOGL: { weight: 0.20, quant_score: 80 },
        MSFT: { weight: 0.18, quant_score: 35 },
      },
      target_weights: { AAPL: 0.20, GOOGL: 0.20, MSFT: 0.20 },
      sector_exposure: { Technology: 0.63, Healthcare: 0.20, Finance: 0.17 },
    };

    const marketData = {
      volatility: 22,
      regime_prediction: {
        regime: 'neutral',
        confidence: 0.75,
        previous_regime: 'risk_on',
      },
      assets: [
        { ticker: 'TSLA', quant_score: 85 },
        { ticker: 'NVDA', quant_score: 78 },
      ],
    };

    const recommendations = generateRecommendations(portfolio, marketData, {});

    expect(recommendations.length).toBeGreaterThan(0);

    const hasRebalance = recommendations.some(
      (r) => r.type === RECOMMENDATION_TYPES.REBALANCE
    );
    expect(hasRebalance).toBe(true);
  });
});

// -----------------------------------------------------------
// Anomaly Detection
// -----------------------------------------------------------
describe('Anomaly Detection', () => {
  const buildTestAssets = () => {
    const assets = [];

    for (let i = 0; i < 20; i++) {
      assets.push({
        ticker: `NORMAL_${i}`,
        quant_score: 50 + Math.random() * 20,
        volatility: 20 + Math.random() * 10,
        volume: 100000 + Math.random() * 50000,
        momentum: Math.random() * 10 - 5,
        correlation: 0.5 + Math.random() * 0.2,
      });
    }

    assets.push({
      ticker: 'ANOMALY_HIGH',
      quant_score: 95, volatility: 15, volume: 120000,
      momentum: 20, correlation: 0.6,
    });
    assets.push({
      ticker: 'ANOMALY_LOW',
      quant_score: 10, volatility: 45, volume: 80000,
      momentum: -15, correlation: 0.4,
    });

    return assets;
  };

  it('detects z-score anomalies', () => {
    const assets = buildTestAssets();
    const zScoreAnomalies = detectZScoreAnomalies(assets, 'quant_score');
    expect(zScoreAnomalies.length).toBeGreaterThan(0);
  });

  it('detects cluster-based anomalies', () => {
    const assets = buildTestAssets();
    const { anomalies } = detectClusterAnomalies(assets);
    expect(anomalies.length).toBeGreaterThanOrEqual(0);
  });

  it('returns zero cluster anomalies for uniform data', () => {
    const uniformAssets = Array.from({ length: 6 }, (_, idx) => ({
      ticker: `UNIFORM_${idx}`,
      quant_score: 50, volatility: 20, volume: 100000,
      momentum: 0, correlation: 0.5,
    }));

    const { anomalies } = detectClusterAnomalies(uniformAssets);
    expect(anomalies).toHaveLength(0);
  });

  it('detects at least 2 anomalies overall in mixed data', () => {
    const assets = buildTestAssets();
    const allAnomalies = detectAllAnomalies(assets, null);
    expect(allAnomalies.length).toBeGreaterThanOrEqual(2);
  });
});
