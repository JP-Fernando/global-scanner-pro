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
  standardizeArray as _standardizeArray
} from './ml-engine.js';
import _i18n from '../i18n/i18n.js';

// =====================================================
// TYPES
// =====================================================

/** Factor weight keys */
type FactorName = 'momentum' | 'value' | 'volatility' | 'volume' | 'quality';

/** Factor weights map */
type FactorWeights = Record<FactorName, number>;

/** Factor weighting configuration */
interface FactorWeightsConfig {
  default_weights: FactorWeights;
  model_type: string;
  random_forest: {
    n_estimators: number;
    max_depth: number;
    min_samples_split: number;
    min_samples_leaf: number;
    max_features: string;
  };
  linear_regression: {
    learning_rate: number;
    epochs: number;
    regularization: number;
  };
  min_training_samples: number;
  test_ratio: number;
  cross_validation_folds: number;
  lookback_days: number;
  retrain_interval_days: number;
}

/** Asset data with price/volume history */
interface AssetData {
  prices: number[];
  volumes?: number[];
  scores?: Record<string, number>;
  [key: string]: unknown;
}

/** Extracted factor features */
interface FactorFeatures {
  roc_20: number;
  roc_60: number;
  roc_120: number;
  price_vs_ema20: number;
  price_vs_ema50: number;
  price_vs_ema200: number;
  volatility_20: number;
  volatility_60: number;
  drawdown: number;
  volume_ratio: number;
  trend_consistency: number;
  return_stability: number;
  momentum_score: number;
  volatility_score: number;
  volume_score: number;
  quality_score: number;
}

/** Training data result */
interface TrainingData {
  X: number[][];
  y: number[];
}

/** Model metrics for train/test sets */
interface MetricsSet {
  r2: number;
  mae: number;
  rmse: number;
}

/** Training result */
interface TrainingResult {
  success: boolean;
  error?: string;
  model?: LinearRegression | RandomForestRegressor | null;
  modelType?: string;
  metrics?: { train: MetricsSet; test: MetricsSet };
  cvScores?: CrossValidationResult;
  featureImportance?: number[] | null;
  featureNames?: string[];
  trainingSize?: number;
  testSize?: number;
}

/** Cross-validation result */
interface CrossValidationResult {
  mean: number;
  std: number;
  scores: number[];
}

/** Feature importance entry */
interface FeatureImportanceEntry {
  feature: string;
  importance: number;
}

/** Optimization result */
interface OptimizationResult {
  success: boolean;
  weights: FactorWeights;
  useDefault: boolean;
  reason?: string;
  modelMetrics?: { train: MetricsSet; test: MetricsSet };
  featureImportance?: FeatureImportanceEntry[];
}

/** Full pipeline result */
interface TrainAndOptimizeResult {
  success: boolean;
  error?: string;
  weights: FactorWeights;
  useDefault: boolean;
  reason?: string;
  modelMetrics?: { train: MetricsSet; test: MetricsSet };
  featureImportance?: FeatureImportanceEntry[];
  trainingResult?: {
    modelType: string;
    metrics: { train: MetricsSet; test: MetricsSet };
    cvScores: CrossValidationResult;
    trainingSize: number;
    testSize: number;
  };
}

/** Factor-to-feature mapping */
type FactorMapping = Record<string, string[]>;

// =====================================================
// CONFIGURATION
// =====================================================

export const FACTOR_WEIGHTS_CONFIG: FactorWeightsConfig = {
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
export function extractFactorFeatures(asset: AssetData, _marketData: unknown): FactorFeatures | null {
  const { prices, volumes, scores: _scores } = asset;

  if (!prices || prices.length < 50) {
    return null; // Not enough data
  }

  const lastPrice: number = prices[prices.length - 1];

  // === MOMENTUM FEATURES ===
  const roc_20: number = ((lastPrice / prices[prices.length - 20]) - 1) * 100;
  const roc_60: number = prices.length >= 60
    ? ((lastPrice / prices[prices.length - 60]) - 1) * 100
    : roc_20;

  const roc_120: number = prices.length >= 120
    ? ((lastPrice / prices[prices.length - 120]) - 1) * 100
    : roc_60;

  // Price vs moving averages
  const ema_20: number = calculateEMA(prices, 20);
  const ema_50: number = calculateEMA(prices, 50);
  const ema_200: number = calculateEMA(prices, 200);

  const price_vs_ema20: number = ((lastPrice / ema_20) - 1) * 100;
  const price_vs_ema50: number = ((lastPrice / ema_50) - 1) * 100;
  const price_vs_ema200: number = ema_200 ? ((lastPrice / ema_200) - 1) * 100 : 0;

  // === VOLATILITY FEATURES ===
  const volatility_20: number = calculateVolatility(prices.slice(-20));
  const volatility_60: number = calculateVolatility(prices.slice(-60));

  const drawdown: number = calculateMaxDrawdown(prices);

  // === VOLUME FEATURES ===
  let volume_ratio: number = 1.0;
  if (volumes && volumes.length >= 20) {
    const recent_volume: number = volumes[volumes.length - 1];
    const avg_volume: number = volumes.slice(-20).reduce((sum: number, v: number): number => sum + v, 0) / 20;
    volume_ratio = avg_volume > 0 ? recent_volume / avg_volume : 1.0;
  }

  // === QUALITY FEATURES ===
  // Trend consistency: % of days above EMA20 in last 60 days
  const trend_consistency: number = prices.length >= 60
    ? calculateTrendConsistency(prices.slice(-60))
    : 0.5;

  // Signal stability: volatility of daily returns
  const return_stability: number = 1 / (1 + calculateVolatility(prices.slice(-20)));

  // === COMPOSITE SCORES ===
  const momentum_score: number = (roc_20 + roc_60 * 0.5 + roc_120 * 0.3) / 1.8;
  const volatility_score: number = -volatility_60; // Lower is better
  const volume_score: number = Math.min(volume_ratio, 3); // Cap at 3x
  const quality_score: number = (trend_consistency + return_stability) / 2;

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
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];

  const k: number = 2 / (period + 1);
  let ema: number = prices[0];

  for (let i: number = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }

  return ema;
}

/**
 * Calculate volatility (annualized)
 */
function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;

  const returns: number[] = [];
  for (let i: number = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }

  const mean: number = returns.reduce((sum: number, r: number): number => sum + r, 0) / returns.length;
  const variance: number = returns.reduce((sum: number, r: number): number => sum + Math.pow(r - mean, 2), 0) / returns.length;

  return Math.sqrt(variance * 252) * 100; // Annualized %
}

/**
 * Calculate maximum drawdown
 */
function calculateMaxDrawdown(prices: number[]): number {
  let maxDrawdown: number = 0;
  let peak: number = prices[0];

  for (const price of prices) {
    if (price > peak) {
      peak = price;
    }

    const drawdown: number = ((peak - price) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

/**
 * Calculate trend consistency
 */
function calculateTrendConsistency(prices: number[]): number {
  if (prices.length < 20) return 0.5;

  const ema20: number = calculateEMA(prices, 20);
  let daysAbove: number = 0;

  prices.forEach((price: number): void => {
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
export function prepareTrainingData(historicalAssets: AssetData[], config: FactorWeightsConfig = FACTOR_WEIGHTS_CONFIG): TrainingData {
  const X: number[][] = []; // Features
  const y: number[] = []; // Forward returns (target)

  historicalAssets.forEach((asset: AssetData): void => {
    const features: FactorFeatures | null = extractFactorFeatures(asset, null);

    if (!features) return; // Skip if insufficient data

    // Calculate forward return (target variable)
    const { prices } = asset;
    const lookback: number = Math.min(config.lookback_days, 60);

    if (prices.length < lookback + 20) return;

    const currentPrice: number = prices[prices.length - lookback - 1];
    const futurePrice: number = prices[prices.length - 1];
    const forwardReturn: number = ((futurePrice / currentPrice) - 1) * 100;

    // Convert features to array
    const featureArray: number[] = [
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
export function trainFactorWeightingModel(X: number[][], y: number[], config: FactorWeightsConfig = FACTOR_WEIGHTS_CONFIG): TrainingResult {
  if (X.length < config.min_training_samples) {
    return {
      success: false,
      error: 'Insufficient training samples',
      model: null
    };
  }

  // Standardize features
  const X_standardized: number[][] = X.map((row: number[], _i: number): number[] => {
    const featureArrays: number[][] = X.map((r: number[]): number[] => r.map((val: number, _j: number): number => val));
    return row.map((val: number, j: number): number => {
      const column: number[] = featureArrays.map((r: number[]): number => r[j]);
      const mean: number = column.reduce((sum: number, v: number): number => sum + v, 0) / column.length;
      const std: number = Math.sqrt(
        column.reduce((sum: number, v: number): number => sum + Math.pow(v - mean, 2), 0) / column.length
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

  let model: LinearRegression | RandomForestRegressor;
  let modelType: string;

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
  (model as LinearRegression).fit(X_train, y_train, config.linear_regression);

  // Evaluate on test set
  const y_pred_train: number[] = model.predict(X_train);
  const y_pred_test: number[] = model.predict(X_test);

  const metrics: { train: MetricsSet; test: MetricsSet } = {
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
  const cvScores: CrossValidationResult = crossValidate(model, X_standardized, y, config);

  // Feature importance
  const featureImportance: number[] | null = (model as RandomForestRegressor).getFeatureImportance
    ? (model as RandomForestRegressor).getFeatureImportance(X_train)
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
function crossValidate(_modelClass: LinearRegression | RandomForestRegressor, X: number[][], y: number[], config: FactorWeightsConfig): CrossValidationResult {
  const folds = kFoldSplit(X.length, config.cross_validation_folds);
  const scores: number[] = [];

  folds.forEach(({ trainIndices, testIndices }: { trainIndices: number[]; testIndices: number[] }): void => {
    const X_train: number[][] = trainIndices.map((i: number): number[] => X[i]);
    const X_test: number[][] = testIndices.map((i: number): number[] => X[i]);
    const y_train: number[] = trainIndices.map((i: number): number => y[i]);
    const y_test: number[] = testIndices.map((i: number): number => y[i]);

    // Create fresh model
    let model: LinearRegression | RandomForestRegressor;
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

    (model as LinearRegression).fit(X_train, y_train, config.linear_regression);

    const y_pred: number[] = model.predict(X_test);
    const r2: number = calculateR2(y_test, y_pred);

    scores.push(r2);
  });

  return {
    mean: scores.reduce((sum: number, s: number): number => sum + s, 0) / scores.length,
    std: Math.sqrt(
      scores.reduce((sum: number, s: number): number => {
        const mean: number = scores.reduce((a: number, b: number): number => a + b, 0) / scores.length;
        return sum + Math.pow(s - mean, 2);
      }, 0) / scores.length
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
export function featureImportanceToFactorWeights(featureImportance: number[], featureNames: string[]): FactorWeights {
  // Map features to factors
  const factorMapping: FactorMapping = {
    momentum: ['roc_20', 'roc_60', 'roc_120', 'price_vs_ema20', 'price_vs_ema50', 'price_vs_ema200'],
    volatility: ['volatility_20', 'volatility_60', 'drawdown'],
    volume: ['volume_ratio'],
    quality: ['trend_consistency', 'return_stability']
  };

  const factorScores: FactorWeights = {
    momentum: 0,
    value: 0, // Not directly available in current features
    volatility: 0,
    volume: 0,
    quality: 0
  };

  // Sum importance for each factor
  featureNames.forEach((name: string, idx: number): void => {
    const importance: number = featureImportance[idx];

    for (const [factor, features] of Object.entries(factorMapping)) {
      if (features.includes(name)) {
        factorScores[factor as FactorName] += importance;
      }
    }
  });

  // Value gets a default weight (not ML-derived in this version)
  factorScores.value = 0.15;

  // Normalize to sum to 1.0
  const total: number = Object.values(factorScores).reduce((sum: number, val: number): number => sum + val, 0);

  const factorWeights: FactorWeights = { momentum: 0, value: 0, volatility: 0, volume: 0, quality: 0 };
  for (const [factor, score] of Object.entries(factorScores)) {
    factorWeights[factor as FactorName] =
      total > 0 ? score / total : FACTOR_WEIGHTS_CONFIG.default_weights[factor as FactorName];
  }

  // Apply smoothing with default weights (60% ML, 40% default)
  const smoothing: number = 0.6;
  const defaultWeights: FactorWeights = FACTOR_WEIGHTS_CONFIG.default_weights;

  for (const factor in factorWeights) {
    factorWeights[factor as FactorName] = smoothing * factorWeights[factor as FactorName] +
                            (1 - smoothing) * defaultWeights[factor as FactorName];
  }

  return factorWeights;
}

/**
 * Optimize factor weights using trained model
 */
export function optimizeFactorWeights(trainingResult: TrainingResult): OptimizationResult {
  if (!trainingResult.success || !trainingResult.featureImportance) {
    return {
      success: false,
      weights: FACTOR_WEIGHTS_CONFIG.default_weights,
      useDefault: true
    };
  }

  const { featureImportance, featureNames, metrics } = trainingResult;

  // Check if model is good enough (R² > 0.1 on test set)
  if (metrics!.test.r2 < 0.1) {
    console.warn('Model R² too low, using default weights');
    return {
      success: false,
      weights: FACTOR_WEIGHTS_CONFIG.default_weights,
      useDefault: true,
      reason: 'Low model performance'
    };
  }

  const optimizedWeights: FactorWeights = featureImportanceToFactorWeights(
    featureImportance,
    featureNames!
  );

  return {
    success: true,
    weights: optimizedWeights,
    useDefault: false,
    modelMetrics: metrics,
    featureImportance: featureImportance.map((imp: number, idx: number): FeatureImportanceEntry => ({
      feature: featureNames![idx],
      importance: imp
    })).sort((a: FeatureImportanceEntry, b: FeatureImportanceEntry): number => b.importance - a.importance)
  };
}

// =====================================================
// MAIN API
// =====================================================

/**
 * Full pipeline: train model and optimize factor weights
 */
export async function trainAndOptimizeFactorWeights(
  historicalAssets: AssetData[], config: FactorWeightsConfig = FACTOR_WEIGHTS_CONFIG
): Promise<TrainAndOptimizeResult> {
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
  const trainingResult: TrainingResult = trainFactorWeightingModel(X, y, config);

  if (!trainingResult.success) {
    return {
      success: false,
      error: trainingResult.error,
      weights: config.default_weights,
      useDefault: true
    };
  }

  // 3. Optimize weights
  const optimizationResult: OptimizationResult = optimizeFactorWeights(trainingResult);

  return {
    ...optimizationResult,
    trainingResult: {
      modelType: trainingResult.modelType!,
      metrics: trainingResult.metrics!,
      cvScores: trainingResult.cvScores!,
      trainingSize: trainingResult.trainingSize!,
      testSize: trainingResult.testSize!
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
