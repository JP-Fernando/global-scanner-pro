// =====================================================
// ML COMPONENTS TEST SUITE
// =====================================================

import { i18n } from './setup-globals.js';

// ML imports
import {
  LinearRegression,
  RandomForestRegressor,
  KMeans,
  calculateR2,
  calculateMAE,
  trainTestSplit
} from '../ml/ml-engine.js';

import {
  trainAndOptimizeFactorWeights,
  extractFactorFeatures,
  FACTOR_WEIGHTS_CONFIG
} from '../ml/factor-weighting.js';

import {
  PerformanceTracker,
  PerformanceRecord,
  adjustScoreAdaptively,
  adjustScoresBatch
} from '../ml/adaptive-scoring.js';

import {
  RandomForestClassifier,
  trainRegimeClassifier,
  predictRegime
} from '../ml/regime-prediction.js';

import {
  generateRecommendations,
  RECOMMENDATION_TYPES
} from '../ml/recommendation-engine.js';

import {
  detectAllAnomalies,
  detectZScoreAnomalies,
  detectClusterAnomalies
} from '../ml/anomaly-detection.js';

// =====================================================
// TEST: LINEAR REGRESSION
// =====================================================

export function testLinearRegression() {
  console.log('\n🧪 Test: Linear Regression');

  try {
    // Simple linear relationship: y = 2x + 1
    const X = [[1], [2], [3], [4], [5]];
    const y = [3, 5, 7, 9, 11];

    const model = new LinearRegression();
    model.fit(X, y, { epochs: 1000, learningRate: 0.1 });

    const predictions = model.predict(X);
    const r2 = calculateR2(y, predictions);

    console.log(`  R² Score: ${r2.toFixed(4)}`);
    console.log(`  Weight: ${model.weights[0].toFixed(2)} (expected: ~2.0)`);
    console.log(`  Bias: ${model.bias.toFixed(2)} (expected: ~1.0)`);

    if (r2 > 0.95) {
      console.log('  ✅ Linear Regression working correctly');
      return true;
    } else {
      console.log('  ❌ Linear Regression R² too low');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return false;
  }
}

// =====================================================
// TEST: RANDOM FOREST
// =====================================================

export function testRandomForest() {
  console.log('\n🧪 Test: Random Forest Regressor');

  try {
    // Non-linear relationship
    const X = [];
    const y = [];

    for (let i = 0; i < 50; i++) {
      const x1 = Math.random() * 10;
      const x2 = Math.random() * 10;
      X.push([x1, x2]);
      y.push(x1 * x1 + x2); // y = x1² + x2
    }

    const { X_train, X_test, y_train, y_test } = trainTestSplit(X, y, 0.2, true);

    const model = new RandomForestRegressor({
      nEstimators: 20,
      maxDepth: 5,
      minSamplesSplit: 3
    });

    model.fit(X_train, y_train);

    const predictions = model.predict(X_test);
    const mae = calculateMAE(y_test, predictions);

    console.log(`  MAE: ${mae.toFixed(2)}`);
    console.log(`  Number of trees: ${model.trees.length}`);

    if (mae < 10) {
      console.log('  ✅ Random Forest working correctly');
      return true;
    } else {
      console.log('  ❌ Random Forest MAE too high');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return false;
  }
}

// =====================================================
// TEST: K-MEANS CLUSTERING
// =====================================================

export function testKMeans() {
  console.log('\n🧪 Test: K-Means Clustering');

  try {
    // Create 3 clusters
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

    console.log(`  Inertia: ${inertia.toFixed(2)}`);
    console.log(`  Centroids: ${model.centroids.length}`);
    console.log(`  Unique labels: ${new Set(labels).size}`);

    if (new Set(labels).size === 3 && inertia < 50) {
      console.log('  ✅ K-Means working correctly');
      return true;
    } else {
      console.log('  ❌ K-Means clustering issues');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return false;
  }
}

// =====================================================
// TEST: FACTOR WEIGHTING
// =====================================================

export function testFactorWeighting() {
  console.log('\n🧪 Test: Factor Weighting Optimization');

  try {
    // Create mock historical assets
    const historicalAssets = [];

    for (let i = 0; i < 30; i++) {
      const prices = [];
      let price = 100;

      for (let j = 0; j < 150; j++) {
        price *= (1 + (Math.random() - 0.5) * 0.02);
        prices.push(price);
      }

      historicalAssets.push({
        ticker: `ASSET_${i}`,
        prices,
        volumes: Array(150).fill(100000 * Math.random())
      });
    }

    // Extract features
    const features = extractFactorFeatures(historicalAssets[0], null);

    console.log(`  Features extracted: ${features ? Object.keys(features).length : 0}`);

    if (features && features.momentum_score !== undefined) {
      console.log('  ✅ Factor feature extraction working');
      return true;
    } else {
      console.log('  ❌ Factor feature extraction failed');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return false;
  }
}

// =====================================================
// TEST: ADAPTIVE SCORING
// =====================================================

export function testAdaptiveScoring() {
  console.log('\n🧪 Test: Adaptive Score Adjustment');

  try {
    const tracker = new PerformanceTracker();

    // Add performance records
    for (let i = 0; i < 20; i++) {
      const record = new PerformanceRecord(
        `ASSET_${i}`,
        Date.now() - i * 24 * 60 * 60 * 1000,
        70 + Math.random() * 20,
        (Math.random() - 0.3) * 10, // Slightly positive bias
        'neutral',
        'balanced'
      );

      tracker.addRecord(record);
    }

    const hitRate = tracker.calculateHitRate({ strategy: 'balanced' });
    console.log(`  Hit rate: ${(hitRate.hitRate * 100).toFixed(1)}%`);
    console.log(`  Sample size: ${hitRate.sampleSize}`);

    // Test score adjustment
    const adjustment = adjustScoreAdaptively(
      75,
      'balanced',
      'neutral',
      Date.now() - 5 * 24 * 60 * 60 * 1000,
      tracker
    );

    console.log(`  Base score: ${adjustment.baseScore}`);
    console.log(`  Adjusted score: ${adjustment.adjustedScore.toFixed(1)}`);
    console.log(`  Performance multiplier: ${adjustment.multipliers.performance.toFixed(2)}`);
    console.log(`  Decay multiplier: ${adjustment.multipliers.decay.toFixed(2)}`);

    if (adjustment.adjustedScore > 0 && adjustment.adjustedScore <= 150) {
      console.log('  ✅ Adaptive scoring working correctly');
      return true;
    } else {
      console.log('  ❌ Adaptive scoring issues');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return false;
  }
}

// =====================================================
// TEST: REGIME PREDICTION
// =====================================================

export function testRegimePrediction() {
  console.log('\n🧪 Test: Market Regime Prediction');

  try {
    // Create mock training data
    const X = [];
    const y = [];

    // Risk-on data (label: 2)
    for (let i = 0; i < 15; i++) {
      X.push([
        5 + Math.random(),   // trend_short (positive)
        3 + Math.random(),   // trend_medium
        2 + Math.random(),   // trend_long
        1,                   // ema_alignment
        12 + Math.random(),  // vol_20 (low)
        15 + Math.random(),  // vol_60
        0.8 + Math.random() * 0.2, // vol_ratio
        10 + Math.random() * 5,    // roc_20 (positive)
        8 + Math.random() * 3,     // roc_60
        0.7 + Math.random() * 0.2, // breadth_score (high)
        0.4 + Math.random() * 0.2, // avg_correlation
        1.2 + Math.random() * 0.3  // volume_trend
      ]);
      y.push(2);
    }

    // Risk-off data (label: 0)
    for (let i = 0; i < 15; i++) {
      X.push([
        -3 - Math.random(),  // trend_short (negative)
        -2 - Math.random(),  // trend_medium
        -1 - Math.random(),  // trend_long
        -1,                  // ema_alignment
        28 + Math.random() * 5, // vol_20 (high)
        25 + Math.random() * 3, // vol_60
        1.2 + Math.random() * 0.3, // vol_ratio
        -8 - Math.random() * 5,    // roc_20 (negative)
        -5 - Math.random() * 3,    // roc_60
        0.2 + Math.random() * 0.2, // breadth_score (low)
        0.7 + Math.random() * 0.2, // avg_correlation (high)
        0.8 + Math.random() * 0.2  // volume_trend
      ]);
      y.push(0);
    }

    const result = trainRegimeClassifier(X, y);

    console.log(`  Training success: ${result.success}`);
    console.log(`  Training accuracy: ${(result.accuracy * 100).toFixed(1)}%`);
    console.log(`  Training size: ${result.trainingSize}`);

    if (result.success && result.accuracy > 0.6) {
      console.log('  ✅ Regime prediction working correctly');
      return true;
    } else {
      console.log('  ❌ Regime prediction issues');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return false;
  }
}

// =====================================================
// TEST: RECOMMENDATION ENGINE
// =====================================================

export function testRecommendationEngine() {
  console.log('\n🧪 Test: Recommendation Engine');

  try {
    const portfolio = {
      total_value: 100000,
      positions: {
        'AAPL': { weight: 0.25, quant_score: 75 },
        'GOOGL': { weight: 0.20, quant_score: 80 },
        'MSFT': { weight: 0.18, quant_score: 35 } // Low score - should trigger alert
      },
      target_weights: {
        'AAPL': 0.20, // 5% deviation - should trigger rebalance
        'GOOGL': 0.20,
        'MSFT': 0.20
      },
      sector_exposure: {
        'Technology': 0.63, // High concentration - should trigger warning
        'Healthcare': 0.20,
        'Finance': 0.17
      }
    };

    const marketData = {
      volatility: 22,
      regime_prediction: {
        regime: 'neutral',
        confidence: 0.75,
        previous_regime: 'risk_on'
      },
      assets: [
        { ticker: 'TSLA', quant_score: 85 },
        { ticker: 'NVDA', quant_score: 78 }
      ]
    };

    const recommendations = generateRecommendations(portfolio, marketData, {});

    console.log(`  Total recommendations: ${recommendations.length}`);
    console.log(`  Recommendation types: ${new Set(recommendations.map(r => r.type)).size}`);

    const hasRebalance = recommendations.some(r => r.type === RECOMMENDATION_TYPES.REBALANCE);
    const hasRiskWarning = recommendations.some(r => r.type === RECOMMENDATION_TYPES.RISK_WARNING);
    const hasSellAlert = recommendations.some(r => r.type === RECOMMENDATION_TYPES.SELL_ALERT);

    console.log(`  Has rebalance recommendation: ${hasRebalance}`);
    console.log(`  Has risk warning: ${hasRiskWarning}`);
    console.log(`  Has sell alert: ${hasSellAlert}`);

    if (recommendations.length > 0 && hasRebalance) {
      console.log('  ✅ Recommendation engine working correctly');
      return true;
    } else {
      console.log('  ❌ Recommendation engine issues');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return false;
  }
}

// =====================================================
// TEST: ANOMALY DETECTION
// =====================================================

export function testAnomalyDetection() {
  console.log('\n🧪 Test: Anomaly Detection');

  try {
    // Create mock assets with anomalies
    const assets = [];

    // Normal assets
    for (let i = 0; i < 20; i++) {
      assets.push({
        ticker: `NORMAL_${i}`,
        quant_score: 50 + Math.random() * 20,
        volatility: 20 + Math.random() * 10,
        volume: 100000 + Math.random() * 50000,
        momentum: Math.random() * 10 - 5,
        correlation: 0.5 + Math.random() * 0.2
      });
    }

    // Anomalous assets
    assets.push({
      ticker: 'ANOMALY_HIGH',
      quant_score: 95, // Very high score
      volatility: 15,
      volume: 120000,
      momentum: 20,
      correlation: 0.6
    });

    assets.push({
      ticker: 'ANOMALY_LOW',
      quant_score: 10, // Very low score
      volatility: 45,  // High volatility
      volume: 80000,
      momentum: -15,
      correlation: 0.4
    });

    // Z-score anomalies
    const zScoreAnomalies = detectZScoreAnomalies(assets, 'quant_score');
    console.log(`  Z-score anomalies: ${zScoreAnomalies.length}`);

    // Cluster anomalies
    const { anomalies: clusterAnomalies } = detectClusterAnomalies(assets);
    console.log(`  Cluster anomalies: ${clusterAnomalies.length}`);

    // All anomalies
    const allAnomalies = detectAllAnomalies(assets, null);
    console.log(`  Total anomalies: ${allAnomalies.length}`);

    if (allAnomalies.length >= 2) {
      console.log('  ✅ Anomaly detection working correctly');
      return true;
    } else {
      console.log('  ❌ Anomaly detection issues');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return false;
  }
}

// =====================================================
// RUN ALL ML TESTS
// =====================================================

export async function runAllMLTests() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║   ML COMPONENT TEST SUITE (Phase 7)  ║');
  console.log('╚═══════════════════════════════════════╝');

  const tests = [
    testLinearRegression,
    testRandomForest,
    testKMeans,
    testFactorWeighting,
    testAdaptiveScoring,
    testRegimePrediction,
    testRecommendationEngine,
    testAnomalyDetection
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Error in ${test.name}:`, error.message);
      failed++;
    }
  }

  console.log('\n╔═══════════════════════════════════════╗');
  console.log(`║  ML TEST RESULTS: ${passed} ✅  ${failed} ❌`);
  console.log('╚═══════════════════════════════════════╝\n');

  return { passed, failed };
}

export default { runAllMLTests };
