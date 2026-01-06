// =====================================================
// MARKET REGIME PREDICTION WITH ML
// =====================================================

/**
 * ML-Based Market Regime Classifier
 *
 * Predicts market regime using ML classification:
 * - Random Forest Classifier (voting ensemble)
 * - Features: VIX-like, trend, breadth, momentum, correlations
 * - 3 classes: Risk-On, Neutral, Risk-Off
 * - Probabilistic predictions for confidence
 *
 * Improvement over heuristic rules:
 * - Captures non-linear interactions
 * - Learns from historical regimes
 * - Provides prediction confidence
 */

import { RandomForestRegressor, DecisionTree, standardizeArray } from './ml-engine.js';
import i18n from '../i18n/i18n.js';

// =====================================================
// CONFIGURATION
// =====================================================

export const REGIME_PREDICTION_CONFIG = {
  // Regime labels
  regimes: {
    0: 'risk_off',
    1: 'neutral',
    2: 'risk_on'
  },

  // Model configuration
  model: {
    n_estimators: 30,
    max_depth: 6,
    min_samples_split: 10,
    min_samples_leaf: 5
  },

  // Feature calculation windows
  windows: {
    short: 20,
    medium: 60,
    long: 200
  },

  // Confidence thresholds
  confidence_thresholds: {
    high: 0.7,
    medium: 0.5,
    low: 0.3
  }
};

// =====================================================
// FEATURE EXTRACTION
// =====================================================

/**
 * Extract market features for regime classification
 */
export function extractRegimeFeatures(marketData) {
  const { benchmarkPrices, assetPrices, volumes, correlations } = marketData;

  if (!benchmarkPrices || benchmarkPrices.length < 200) {
    return null;
  }

  const lastPrice = benchmarkPrices[benchmarkPrices.length - 1];

  // === TREND FEATURES ===
  const ema20 = calculateEMA(benchmarkPrices, 20);
  const ema50 = calculateEMA(benchmarkPrices, 50);
  const ema200 = calculateEMA(benchmarkPrices, 200);

  const trend_short = ((lastPrice / ema20) - 1) * 100;
  const trend_medium = ((lastPrice / ema50) - 1) * 100;
  const trend_long = ((lastPrice / ema200) - 1) * 100;
  const ema_alignment = (ema20 > ema50 && ema50 > ema200) ? 1 : -1;

  // === VOLATILITY FEATURES ===
  const vol_20 = calculateVolatility(benchmarkPrices.slice(-20));
  const vol_60 = calculateVolatility(benchmarkPrices.slice(-60));
  const vol_ratio = vol_20 / (vol_60 + 0.01); // Recent vs longer-term vol

  // === MOMENTUM FEATURES ===
  const roc_20 = benchmarkPrices.length >= 20
    ? ((lastPrice / benchmarkPrices[benchmarkPrices.length - 20]) - 1) * 100
    : 0;

  const roc_60 = benchmarkPrices.length >= 60
    ? ((lastPrice / benchmarkPrices[benchmarkPrices.length - 60]) - 1) * 100
    : roc_20;

  // === BREADTH FEATURES ===
  let breadth_score = 0.5; // Default neutral

  if (assetPrices && assetPrices.length > 0) {
    let bullish_count = 0;

    assetPrices.forEach(prices => {
      if (prices.length >= 20) {
        const last = prices[prices.length - 1];
        const ema = calculateEMA(prices, 20);

        if (last > ema) bullish_count++;
      }
    });

    breadth_score = bullish_count / assetPrices.length;
  }

  // === CORRELATION FEATURES ===
  let avg_correlation = 0.5;

  if (correlations && correlations.length > 0) {
    const flatCorrelations = [];

    for (let i = 0; i < correlations.length; i++) {
      for (let j = i + 1; j < correlations[i].length; j++) {
        flatCorrelations.push(Math.abs(correlations[i][j]));
      }
    }

    if (flatCorrelations.length > 0) {
      avg_correlation = flatCorrelations.reduce((sum, c) => sum + c, 0) / flatCorrelations.length;
    }
  }

  // === VOLUME FEATURES ===
  let volume_trend = 1.0;

  if (volumes && volumes.length >= 60) {
    const recent_avg = volumes.slice(-20).reduce((sum, v) => sum + v, 0) / 20;
    const historical_avg = volumes.slice(-60).reduce((sum, v) => sum + v, 0) / 60;

    volume_trend = historical_avg > 0 ? recent_avg / historical_avg : 1.0;
  }

  return {
    trend_short,
    trend_medium,
    trend_long,
    ema_alignment,
    vol_20,
    vol_60,
    vol_ratio,
    roc_20,
    roc_60,
    breadth_score,
    avg_correlation,
    volume_trend
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
  if (prices.length < 2) return 10; // Default

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

  return Math.sqrt(variance * 252) * 100;
}

// =====================================================
// CLASSIFICATION MODEL (Simplified)
// =====================================================

/**
 * Random Forest Classifier (using regression trees with rounding)
 */
export class RandomForestClassifier {
  constructor(options = {}) {
    this.nEstimators = options.nEstimators || 30;
    this.maxDepth = options.maxDepth || 6;
    this.minSamplesSplit = options.minSamplesSplit || 10;
    this.minSamplesLeaf = options.minSamplesLeaf || 5;
    this.trees = [];
    this.numClasses = options.numClasses || 3;
  }

  /**
   * Bootstrap sample
   */
  _bootstrapSample(X, y) {
    const n = X.length;
    const indices = Array.from({ length: n }, () => Math.floor(Math.random() * n));

    return {
      X: indices.map(i => X[i]),
      y: indices.map(i => y[i])
    };
  }

  /**
   * Train the forest
   */
  fit(X, y) {
    this.trees = [];

    for (let i = 0; i < this.nEstimators; i++) {
      const { X: X_sample, y: y_sample } = this._bootstrapSample(X, y);

      const tree = new DecisionTree({
        maxDepth: this.maxDepth,
        minSamplesSplit: this.minSamplesSplit,
        minSamplesLeaf: this.minSamplesLeaf,
        maxFeatures: Math.floor(Math.sqrt(X[0].length))
      });

      tree.fit(X_sample, y_sample);
      this.trees.push(tree);
    }

    return this;
  }

  /**
   * Predict class labels
   */
  predict(X) {
    const probabilities = this.predictProba(X);

    return probabilities.map(probs => {
      return probs.indexOf(Math.max(...probs));
    });
  }

  /**
   * Predict class probabilities
   */
  predictProba(X) {
    if (this.trees.length === 0) {
      throw new Error('Model not trained yet. Call fit() first.');
    }

    // Get predictions from all trees
    const allPredictions = this.trees.map(tree => tree.predict(X));

    // Convert to probabilities (voting)
    return X.map((_, i) => {
      const votes = Array(this.numClasses).fill(0);

      allPredictions.forEach(predictions => {
        const classLabel = Math.round(predictions[i]);
        const clampedLabel = Math.max(0, Math.min(this.numClasses - 1, classLabel));
        votes[clampedLabel]++;
      });

      // Normalize to probabilities
      const total = votes.reduce((sum, v) => sum + v, 0);
      return votes.map(v => v / total);
    });
  }
}

// =====================================================
// TRAINING
// =====================================================

/**
 * Prepare training data from historical regimes
 */
export function prepareRegimeTrainingData(historicalData) {
  const X = [];
  const y = [];

  historicalData.forEach(sample => {
    const { marketData, actualRegime } = sample;

    const features = extractRegimeFeatures(marketData);

    if (!features) return;

    // Convert features to array
    const featureArray = [
      features.trend_short,
      features.trend_medium,
      features.trend_long,
      features.ema_alignment,
      features.vol_20,
      features.vol_60,
      features.vol_ratio,
      features.roc_20,
      features.roc_60,
      features.breadth_score,
      features.avg_correlation,
      features.volume_trend
    ];

    // Convert regime to numeric label
    const label = actualRegime === 'risk_on' ? 2 : actualRegime === 'risk_off' ? 0 : 1;

    X.push(featureArray);
    y.push(label);
  });

  return { X, y };
}

/**
 * Train regime classifier
 */
export function trainRegimeClassifier(X, y, config = REGIME_PREDICTION_CONFIG) {
  if (X.length < 30) {
    return {
      success: false,
      error: 'Insufficient training samples',
      model: null
    };
  }

  // Standardize features
  const X_standardized = X.map((row, i) => {
    return row.map((val, j) => {
      const column = X.map(r => r[j]);
      const mean = column.reduce((sum, v) => sum + v, 0) / column.length;
      const std = Math.sqrt(
        column.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / column.length
      );
      return std > 0 ? (val - mean) / std : 0;
    });
  });

  // Train classifier
  const model = new RandomForestClassifier({
    nEstimators: config.model.n_estimators,
    maxDepth: config.model.max_depth,
    minSamplesSplit: config.model.min_samples_split,
    minSamplesLeaf: config.model.min_samples_leaf,
    numClasses: 3
  });

  model.fit(X_standardized, y);

  // Evaluate accuracy
  const predictions = model.predict(X_standardized);
  const correct = predictions.filter((pred, i) => pred === y[i]).length;
  const accuracy = correct / predictions.length;

  return {
    success: true,
    model,
    accuracy,
    trainingSize: X.length,
    featureNames: [
      'trend_short',
      'trend_medium',
      'trend_long',
      'ema_alignment',
      'vol_20',
      'vol_60',
      'vol_ratio',
      'roc_20',
      'roc_60',
      'breadth_score',
      'avg_correlation',
      'volume_trend'
    ]
  };
}

// =====================================================
// PREDICTION
// =====================================================

/**
 * Predict market regime
 */
export function predictRegime(marketData, model, config = REGIME_PREDICTION_CONFIG) {
  const features = extractRegimeFeatures(marketData);

  if (!features) {
    return {
      regime: 'neutral',
      confidence: 0,
      probabilities: { risk_off: 0.33, neutral: 0.34, risk_on: 0.33 },
      error: 'Insufficient market data'
    };
  }

  // Convert to feature array
  const featureArray = [
    features.trend_short,
    features.trend_medium,
    features.trend_long,
    features.ema_alignment,
    features.vol_20,
    features.vol_60,
    features.vol_ratio,
    features.roc_20,
    features.roc_60,
    features.breadth_score,
    features.avg_correlation,
    features.volume_trend
  ];

  // Predict
  const probabilities = model.predictProba([featureArray])[0];
  const prediction = probabilities.indexOf(Math.max(...probabilities));

  const regime = config.regimes[prediction];
  const confidence = Math.max(...probabilities);

  return {
    regime,
    confidence,
    probabilities: {
      risk_off: probabilities[0],
      neutral: probabilities[1],
      risk_on: probabilities[2]
    },
    features,
    timestamp: Date.now()
  };
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  REGIME_PREDICTION_CONFIG,
  extractRegimeFeatures,
  RandomForestClassifier,
  prepareRegimeTrainingData,
  trainRegimeClassifier,
  predictRegime
};
