// =====================================================
// DYNAMIC FACTOR WEIGHTING WITH MACHINE LEARNING
// =====================================================

/**
 * Factor Weighting Optimizer
 *
 * Dynamically optimises quantitative factor weights using ML:
 * - Random Forest to capture non-linear interactions
 * - Linear regression with L2 regularisation
 * - Feature importance analysis
 * - Cross-validation to prevent overfitting
 *
 * Factors considered:
 * - Momentum (ROC, RSI, price vs EMAs)
 * - Value (P/E-like proxies, discounts vs benchmark)
 * - Volatility (historical volatility, drawdown)
 * - Volume (liquidity, relative volume)
 * - Quality (signal consistency, trend stability)
 */

import {
  LinearRegression,
  RandomForestRegressor,
  trainTestSplit,
  kFoldSplit,
  calculateR2,
  calculateMAE,
  calculateRMSE,
  standardizeArray
} from './ml-engine.js';
import i18n from '../i18n/i18n.js';

// =====================================================
// CONFIGURATION
// =====================================================

export const FACTOR_WEIGHTS_CONFIG = {
  // Default static weights (baseline)
  default_weights: {
    momentum: 0.30,
    value: 0.20,
    volatility: 0.15,
    volume: 0.15,
    quality: 0.20
  },

  // ML model configuration
  model_type: 'random_forest', // 'linear_regression' or 'random_forest'

  random_forest: {
    n_estimators: 50,
    max_depth: 8,
    min_samples_split: 5,
    min_samples_leaf: 2,
    max_features: 'sqrt'
  },

  linear_regression: {
    learning_rate: 0.01,
    epochs: 1000,
    regularization: 0.1
  },

  // Training configuration
  min_training_samples: 20,
  test_ratio: 0.2,
  cross_validation_folds: 5,

  // Performance window
  lookback_days: 60, // 60 days forward return for training target

  // Retraining frequency
  retrain_interval_days: 30
};

// =====================================================
// FEATURE EXTRACTION
// =====================================================

/**
 * Extract factor features from asset data
 */
export function extractFactorFeatures(asset, marketData) {
  const { prices, volumes, scores } = asset;

  if (!prices || prices.length < 50) {
    return null; // Not enough data
  }

  const lastPrice = prices[prices.length - 1];

  // === MOMENTUM FEATURES ===
  const roc_20 = ((lastPrice / prices[prices.length - 20]) - 1) * 100;
  const roc_60 = prices.length >= 60
    ? ((lastPrice / prices[prices.length - 60]) - 1) * 100
    : roc_20;

  const roc_120 = prices.length >= 120
    ? ((lastPrice / prices[prices.length - 120]) - 1) * 100
    : roc_60;

  // Price vs moving averages
  const ema_20 = calculateEMA(prices, 20);
  const ema_50 = calculateEMA(prices, 50);
  const ema_200 = calculateEMA(prices, 200);

  const price_vs_ema20 = ((lastPrice / ema_20) - 1) * 100;
  const price_vs_ema50 = ((lastPrice / ema_50) - 1) * 100;
  const price_vs_ema200 = ema_200 ? ((lastPrice / ema_200) - 1) * 100 : 0;

  // === VOLATILITY FEATURES ===
  const volatility_20 = calculateVolatility(prices.slice(-20));
  const volatility_60 = calculateVolatility(prices.slice(-60));

  const drawdown = calculateMaxDrawdown(prices);

  // === VOLUME FEATURES ===
  let volume_ratio = 1.0;
  if (volumes && volumes.length >= 20) {
    const recent_volume = volumes[volumes.length - 1];
    const avg_volume = volumes.slice(-20).reduce((sum, v) => sum + v, 0) / 20;
    volume_ratio = avg_volume > 0 ? recent_volume / avg_volume : 1.0;
  }

  // === QUALITY FEATURES ===
  // Trend consistency: % of days above EMA20 in last 60 days
  const trend_consistency = prices.length >= 60
    ? calculateTrendConsistency(prices.slice(-60))
    : 0.5;

  // Signal stability: volatility of daily returns
  const return_stability = 1 / (1 + calculateVolatility(prices.slice(-20)));

  // === COMPOSITE SCORES ===
  const momentum_score = (roc_20 + roc_60 * 0.5 + roc_120 * 0.3) / 1.8;
  const volatility_score = -volatility_60; // Lower is better
  const volume_score = Math.min(volume_ratio, 3); // Cap at 3x
  const quality_score = (trend_consistency + return_stability) / 2;

  return {
    // Raw features
    roc_20,
    roc_60,
    roc_120,
    price_vs_ema20,
    price_vs_ema50,
    price_vs_ema200,
    volatility_20,
    volatility_60,
    drawdown,
    volume_ratio,
    trend_consistency,
    return_stability,

    // Composite scores
    momentum_score,
    volatility_score,
    volume_score,
    quality_score
  };
}

/**
 * Calculate EMA
 */
function calculateEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];

  const k = 2 / (period + 1);
  let ema = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }

  return ema;
}

/**
 * Calculate volatility (annualized)
 */
function calculateVolatility(prices) {
  if (prices.length < 2) return 0;

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

  return Math.sqrt(variance * 252) * 100; // Annualized %
}

/**
 * Calculate maximum drawdown
 */
function calculateMaxDrawdown(prices) {
  let maxDrawdown = 0;
  let peak = prices[0];

  for (const price of prices) {
    if (price > peak) {
      peak = price;
    }

    const drawdown = ((peak - price) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

/**
 * Calculate trend consistency
 */
function calculateTrendConsistency(prices) {
  if (prices.length < 20) return 0.5;

  const ema20 = calculateEMA(prices, 20);
  let daysAbove = 0;

  prices.forEach(price => {
    if (price > ema20) daysAbove++;
  });

  return daysAbove / prices.length;
}

// =====================================================
// TRAINING DATA PREPARATION
// =====================================================

/**
 * Prepare training dataset from historical asset data
 */
export function prepareTrainingData(historicalAssets, config = FACTOR_WEIGHTS_CONFIG) {
  const X = []; // Features
  const y = []; // Forward returns (target)

  historicalAssets.forEach(asset => {
    const features = extractFactorFeatures(asset, null);

    if (!features) return; // Skip if insufficient data

    // Calculate forward return (target variable)
    const { prices } = asset;
    const lookback = Math.min(config.lookback_days, 60);

    if (prices.length < lookback + 20) return;

    const currentPrice = prices[prices.length - lookback - 1];
    const futurePrice = prices[prices.length - 1];
    const forwardReturn = ((futurePrice / currentPrice) - 1) * 100;

    // Convert features to array
    const featureArray = [
      features.roc_20,
      features.roc_60,
      features.roc_120,
      features.price_vs_ema20,
      features.price_vs_ema50,
      features.price_vs_ema200,
      features.volatility_20,
      features.volatility_60,
      features.drawdown,
      features.volume_ratio,
      features.trend_consistency,
      features.return_stability
    ];

    X.push(featureArray);
    y.push(forwardReturn);
  });

  return { X, y };
}

// =====================================================
// MODEL TRAINING
// =====================================================

/**
 * Train factor weighting model
 */
export function trainFactorWeightingModel(X, y, config = FACTOR_WEIGHTS_CONFIG) {
  if (X.length < config.min_training_samples) {
    return {
      success: false,
      error: 'Insufficient training samples',
      model: null
    };
  }

  // Standardize features
  const X_standardized = X.map((row, i) => {
    const featureArrays = X.map(r => r.map((val, j) => val));
    return row.map((val, j) => {
      const column = featureArrays.map(r => r[j]);
      const mean = column.reduce((sum, v) => sum + v, 0) / column.length;
      const std = Math.sqrt(
        column.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / column.length
      );
      return std > 0 ? (val - mean) / std : 0;
    });
  });

  // Train/test split
  const { X_train, X_test, y_train, y_test } = trainTestSplit(
    X_standardized,
    y,
    config.test_ratio,
    true
  );

  let model;
  let modelType;

  // Train model based on configuration
  if (config.model_type === 'random_forest') {
    model = new RandomForestRegressor({
      nEstimators: config.random_forest.n_estimators,
      maxDepth: config.random_forest.max_depth,
      minSamplesSplit: config.random_forest.min_samples_split,
      minSamplesLeaf: config.random_forest.min_samples_leaf,
      maxFeatures: config.random_forest.max_features
    });

    modelType = 'Random Forest';
  } else {
    model = new LinearRegression();
    modelType = 'Linear Regression';
  }

  // Train
  model.fit(X_train, y_train, config.linear_regression);

  // Evaluate on test set
  const y_pred_train = model.predict(X_train);
  const y_pred_test = model.predict(X_test);

  const metrics = {
    train: {
      r2: calculateR2(y_train, y_pred_train),
      mae: calculateMAE(y_train, y_pred_train),
      rmse: calculateRMSE(y_train, y_pred_train)
    },
    test: {
      r2: calculateR2(y_test, y_pred_test),
      mae: calculateMAE(y_test, y_pred_test),
      rmse: calculateRMSE(y_test, y_pred_test)
    }
  };

  // Cross-validation
  const cvScores = crossValidate(model, X_standardized, y, config);

  // Feature importance
  const featureImportance = model.getFeatureImportance
    ? model.getFeatureImportance(X_train)
    : null;

  return {
    success: true,
    model,
    modelType,
    metrics,
    cvScores,
    featureImportance,
    featureNames: [
      'roc_20',
      'roc_60',
      'roc_120',
      'price_vs_ema20',
      'price_vs_ema50',
      'price_vs_ema200',
      'volatility_20',
      'volatility_60',
      'drawdown',
      'volume_ratio',
      'trend_consistency',
      'return_stability'
    ],
    trainingSize: X_train.length,
    testSize: X_test.length
  };
}

/**
 * Cross-validation
 */
function crossValidate(modelClass, X, y, config) {
  const folds = kFoldSplit(X.length, config.cross_validation_folds);
  const scores = [];

  folds.forEach(({ trainIndices, testIndices }) => {
    const X_train = trainIndices.map(i => X[i]);
    const X_test = testIndices.map(i => X[i]);
    const y_train = trainIndices.map(i => y[i]);
    const y_test = testIndices.map(i => y[i]);

    // Create fresh model
    let model;
    if (config.model_type === 'random_forest') {
      model = new RandomForestRegressor({
        nEstimators: config.random_forest.n_estimators,
        maxDepth: config.random_forest.max_depth,
        minSamplesSplit: config.random_forest.min_samples_split,
        minSamplesLeaf: config.random_forest.min_samples_leaf,
        maxFeatures: config.random_forest.max_features
      });
    } else {
      model = new LinearRegression();
    }

    model.fit(X_train, y_train, config.linear_regression);

    const y_pred = model.predict(X_test);
    const r2 = calculateR2(y_test, y_pred);

    scores.push(r2);
  });

  return {
    mean: scores.reduce((sum, s) => sum + s, 0) / scores.length,
    std: Math.sqrt(
      scores.reduce((sum, s) => sum + Math.pow(s - scores.reduce((a, b) => a + b, 0) / scores.length, 2), 0) / scores.length
    ),
    scores
  };
}

// =====================================================
// FACTOR WEIGHT OPTIMIZATION
// =====================================================

/**
 * Convert feature importance to factor weights
 */
export function featureImportanceToFactorWeights(featureImportance, featureNames) {
  // Map features to factors
  const factorMapping = {
    momentum: ['roc_20', 'roc_60', 'roc_120', 'price_vs_ema20', 'price_vs_ema50', 'price_vs_ema200'],
    volatility: ['volatility_20', 'volatility_60', 'drawdown'],
    volume: ['volume_ratio'],
    quality: ['trend_consistency', 'return_stability']
  };

  const factorScores = {
    momentum: 0,
    value: 0, // Not directly available in current features
    volatility: 0,
    volume: 0,
    quality: 0
  };

  // Sum importance for each factor
  featureNames.forEach((name, idx) => {
    const importance = featureImportance[idx];

    for (const [factor, features] of Object.entries(factorMapping)) {
      if (features.includes(name)) {
        factorScores[factor] += importance;
      }
    }
  });

  // Value gets a default weight (not ML-derived in this version)
  factorScores.value = 0.15;

  // Normalize to sum to 1.0
  const total = Object.values(factorScores).reduce((sum, val) => sum + val, 0);

  const factorWeights = {};
  for (const [factor, score] of Object.entries(factorScores)) {
    factorWeights[factor] = total > 0 ? score / total : FACTOR_WEIGHTS_CONFIG.default_weights[factor];
  }

  // Apply smoothing with default weights (60% ML, 40% default)
  const smoothing = 0.6;
  const defaultWeights = FACTOR_WEIGHTS_CONFIG.default_weights;

  for (const factor in factorWeights) {
    factorWeights[factor] = smoothing * factorWeights[factor] +
                            (1 - smoothing) * defaultWeights[factor];
  }

  return factorWeights;
}

/**
 * Optimize factor weights using trained model
 */
export function optimizeFactorWeights(trainingResult) {
  if (!trainingResult.success || !trainingResult.featureImportance) {
    return {
      success: false,
      weights: FACTOR_WEIGHTS_CONFIG.default_weights,
      useDefault: true
    };
  }

  const { featureImportance, featureNames, metrics } = trainingResult;

  // Check if model is good enough (R² > 0.1 on test set)
  if (metrics.test.r2 < 0.1) {
    console.warn('Model R² too low, using default weights');
    return {
      success: false,
      weights: FACTOR_WEIGHTS_CONFIG.default_weights,
      useDefault: true,
      reason: 'Low model performance'
    };
  }

  const optimizedWeights = featureImportanceToFactorWeights(
    featureImportance,
    featureNames
  );

  return {
    success: true,
    weights: optimizedWeights,
    useDefault: false,
    modelMetrics: metrics,
    featureImportance: featureImportance.map((imp, idx) => ({
      feature: featureNames[idx],
      importance: imp
    })).sort((a, b) => b.importance - a.importance)
  };
}

// =====================================================
// MAIN API
// =====================================================

/**
 * Full pipeline: train model and optimize factor weights
 */
export async function trainAndOptimizeFactorWeights(historicalAssets, config = FACTOR_WEIGHTS_CONFIG) {
  // 1. Prepare training data
  const { X, y } = prepareTrainingData(historicalAssets, config);

  if (X.length < config.min_training_samples) {
    return {
      success: false,
      error: `Insufficient data. Need at least ${config.min_training_samples} samples, got ${X.length}`,
      weights: config.default_weights,
      useDefault: true
    };
  }

  // 2. Train model
  const trainingResult = trainFactorWeightingModel(X, y, config);

  if (!trainingResult.success) {
    return {
      success: false,
      error: trainingResult.error,
      weights: config.default_weights,
      useDefault: true
    };
  }

  // 3. Optimize weights
  const optimizationResult = optimizeFactorWeights(trainingResult);

  return {
    ...optimizationResult,
    trainingResult: {
      modelType: trainingResult.modelType,
      metrics: trainingResult.metrics,
      cvScores: trainingResult.cvScores,
      trainingSize: trainingResult.trainingSize,
      testSize: trainingResult.testSize
    }
  };
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  FACTOR_WEIGHTS_CONFIG,
  extractFactorFeatures,
  prepareTrainingData,
  trainFactorWeightingModel,
  optimizeFactorWeights,
  trainAndOptimizeFactorWeights
};
