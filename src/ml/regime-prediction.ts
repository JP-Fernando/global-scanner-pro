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

import { RandomForestRegressor as _RandomForestRegressor, DecisionTree, standardizeArray as _standardizeArray } from './ml-engine.js';
import _i18n from '../i18n/i18n.js';

// =====================================================
// TYPES
// =====================================================

interface RegimePredictionConfig {
  regimes: Record<number, string>;
  model: {
    n_estimators: number;
    max_depth: number;
    min_samples_split: number;
    min_samples_leaf: number;
  };
  windows: {
    short: number;
    medium: number;
    long: number;
  };
  confidence_thresholds: {
    high: number;
    medium: number;
    low: number;
  };
}

interface RegimeFeatures {
  trend_short: number;
  trend_medium: number;
  trend_long: number;
  ema_alignment: number;
  vol_20: number;
  vol_60: number;
  vol_ratio: number;
  roc_20: number;
  roc_60: number;
  breadth_score: number;
  avg_correlation: number;
  volume_trend: number;
}

interface MarketData {
  benchmarkPrices: number[];
  assetPrices?: number[][];
  volumes?: number[];
  correlations?: number[][];
}

interface ClassifierOptions {
  nEstimators?: number;
  maxDepth?: number;
  minSamplesSplit?: number;
  minSamplesLeaf?: number;
  numClasses?: number;
}

interface HistoricalSample {
  marketData: MarketData;
  actualRegime: string;
}

interface TrainingResult {
  success: boolean;
  error?: string;
  model: RandomForestClassifier | null;
  accuracy?: number;
  trainingSize?: number;
  featureNames?: string[];
}

interface RegimePredictionResult {
  regime: string;
  confidence: number;
  probabilities: {
    risk_off: number;
    neutral: number;
    risk_on: number;
  };
  features?: RegimeFeatures;
  error?: string;
  timestamp?: number;
}

// =====================================================
// CONFIGURATION
// =====================================================

export const REGIME_PREDICTION_CONFIG: RegimePredictionConfig = {
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
export function extractRegimeFeatures(marketData: MarketData): RegimeFeatures | null {
  const { benchmarkPrices, assetPrices, volumes, correlations } = marketData;

  if (!benchmarkPrices || benchmarkPrices.length < 200) {
    return null;
  }

  const lastPrice: number = benchmarkPrices[benchmarkPrices.length - 1];

  // === TREND FEATURES ===
  const ema20: number = calculateEMA(benchmarkPrices, 20);
  const ema50: number = calculateEMA(benchmarkPrices, 50);
  const ema200: number = calculateEMA(benchmarkPrices, 200);

  const trend_short: number = ((lastPrice / ema20) - 1) * 100;
  const trend_medium: number = ((lastPrice / ema50) - 1) * 100;
  const trend_long: number = ((lastPrice / ema200) - 1) * 100;
  const ema_alignment: number = (ema20 > ema50 && ema50 > ema200) ? 1 : -1;

  // === VOLATILITY FEATURES ===
  const vol_20: number = calculateVolatility(benchmarkPrices.slice(-20));
  const vol_60: number = calculateVolatility(benchmarkPrices.slice(-60));
  const vol_ratio: number = vol_20 / (vol_60 + 0.01); // Recent vs longer-term vol

  // === MOMENTUM FEATURES ===
  const roc_20: number = benchmarkPrices.length >= 20
    ? ((lastPrice / benchmarkPrices[benchmarkPrices.length - 20]) - 1) * 100
    : 0;

  const roc_60: number = benchmarkPrices.length >= 60
    ? ((lastPrice / benchmarkPrices[benchmarkPrices.length - 60]) - 1) * 100
    : roc_20;

  // === BREADTH FEATURES ===
  let breadth_score: number = 0.5; // Default neutral

  if (assetPrices && assetPrices.length > 0) {
    let bullish_count: number = 0;

    assetPrices.forEach((prices: number[]): void => {
      if (prices.length >= 20) {
        const last: number = prices[prices.length - 1];
        const ema: number = calculateEMA(prices, 20);

        if (last > ema) bullish_count++;
      }
    });

    breadth_score = bullish_count / assetPrices.length;
  }

  // === CORRELATION FEATURES ===
  let avg_correlation: number = 0.5;

  if (correlations && correlations.length > 0) {
    const flatCorrelations: number[] = [];

    for (let i: number = 0; i < correlations.length; i++) {
      for (let j: number = i + 1; j < correlations[i].length; j++) {
        flatCorrelations.push(Math.abs(correlations[i][j]));
      }
    }

    if (flatCorrelations.length > 0) {
      avg_correlation = flatCorrelations.reduce((sum: number, c: number): number => sum + c, 0) / flatCorrelations.length;
    }
  }

  // === VOLUME FEATURES ===
  let volume_trend: number = 1.0;

  if (volumes && volumes.length >= 60) {
    const recent_avg: number = volumes.slice(-20).reduce((sum: number, v: number): number => sum + v, 0) / 20;
    const historical_avg: number = volumes.slice(-60).reduce((sum: number, v: number): number => sum + v, 0) / 60;

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
  if (prices.length < 2) return 10; // Default

  const returns: number[] = [];
  for (let i: number = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }

  const mean: number = returns.reduce((sum: number, r: number): number => sum + r, 0) / returns.length;
  const variance: number = returns.reduce((sum: number, r: number): number => sum + Math.pow(r - mean, 2), 0) / returns.length;

  return Math.sqrt(variance * 252) * 100;
}

// =====================================================
// CLASSIFICATION MODEL (Simplified)
// =====================================================

/**
 * Random Forest Classifier (using regression trees with rounding)
 */
export class RandomForestClassifier {
  nEstimators: number;
  maxDepth: number;
  minSamplesSplit: number;
  minSamplesLeaf: number;
  trees: DecisionTree[];
  numClasses: number;

  constructor(options: ClassifierOptions = {}) {
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
  _bootstrapSample(X: number[][], y: number[]): { X: number[][]; y: number[] } {
    const n: number = X.length;
    const indices: number[] = Array.from({ length: n }, (): number => Math.floor(Math.random() * n));

    return {
      X: indices.map((i: number): number[] => X[i]),
      y: indices.map((i: number): number => y[i])
    };
  }

  /**
   * Train the forest
   */
  fit(X: number[][], y: number[]): this {
    this.trees = [];

    for (let i: number = 0; i < this.nEstimators; i++) {
      const { X: X_sample, y: y_sample } = this._bootstrapSample(X, y);

      const tree: DecisionTree = new DecisionTree({
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
  predict(X: number[][]): number[] {
    const probabilities: number[][] = this.predictProba(X);

    return probabilities.map((probs: number[]): number => {
      return probs.indexOf(Math.max(...probs));
    });
  }

  /**
   * Predict class probabilities
   */
  predictProba(X: number[][]): number[][] {
    if (this.trees.length === 0) {
      throw new Error('Model not trained yet. Call fit() first.');
    }

    // Get predictions from all trees
    const allPredictions: number[][] = this.trees.map((tree: DecisionTree): number[] => tree.predict(X));

    // Convert to probabilities (voting)
    return X.map((_: number[], i: number): number[] => {
      const votes: number[] = Array(this.numClasses).fill(0) as number[];

      allPredictions.forEach((predictions: number[]): void => {
        const classLabel: number = Math.round(predictions[i]);
        const clampedLabel: number = Math.max(0, Math.min(this.numClasses - 1, classLabel));
        votes[clampedLabel]++;
      });

      // Normalize to probabilities
      const total: number = votes.reduce((sum: number, v: number): number => sum + v, 0);
      return votes.map((v: number): number => v / total);
    });
  }
}

// =====================================================
// TRAINING
// =====================================================

/**
 * Prepare training data from historical regimes
 */
export function prepareRegimeTrainingData(historicalData: HistoricalSample[]): { X: number[][]; y: number[] } {
  const X: number[][] = [];
  const y: number[] = [];

  historicalData.forEach((sample: HistoricalSample): void => {
    const { marketData, actualRegime } = sample;

    const features: RegimeFeatures | null = extractRegimeFeatures(marketData);

    if (!features) return;

    // Convert features to array
    const featureArray: number[] = [
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
    const label: number = actualRegime === 'risk_on' ? 2 : actualRegime === 'risk_off' ? 0 : 1;

    X.push(featureArray);
    y.push(label);
  });

  return { X, y };
}

/**
 * Train regime classifier
 */
export function trainRegimeClassifier(
  X: number[][],
  y: number[],
  config: RegimePredictionConfig = REGIME_PREDICTION_CONFIG
): TrainingResult {
  if (X.length < 30) {
    return {
      success: false,
      error: 'Insufficient training samples',
      model: null
    };
  }

  // Standardize features
  const X_standardized: number[][] = X.map((row: number[], _i: number): number[] => {
    return row.map((val: number, j: number): number => {
      const column: number[] = X.map((r: number[]): number => r[j]);
      const mean: number = column.reduce((sum: number, v: number): number => sum + v, 0) / column.length;
      const std: number = Math.sqrt(
        column.reduce((sum: number, v: number): number => sum + Math.pow(v - mean, 2), 0) / column.length
      );
      return std > 0 ? (val - mean) / std : 0;
    });
  });

  // Train classifier
  const model: RandomForestClassifier = new RandomForestClassifier({
    nEstimators: config.model.n_estimators,
    maxDepth: config.model.max_depth,
    minSamplesSplit: config.model.min_samples_split,
    minSamplesLeaf: config.model.min_samples_leaf,
    numClasses: 3
  });

  model.fit(X_standardized, y);

  // Evaluate accuracy
  const predictions: number[] = model.predict(X_standardized);
  const correct: number = predictions.filter((pred: number, i: number): boolean => pred === y[i]).length;
  const accuracy: number = correct / predictions.length;

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
export function predictRegime(
  marketData: MarketData,
  model: RandomForestClassifier,
  config: RegimePredictionConfig = REGIME_PREDICTION_CONFIG
): RegimePredictionResult {
  const features: RegimeFeatures | null = extractRegimeFeatures(marketData);

  if (!features) {
    return {
      regime: 'neutral',
      confidence: 0,
      probabilities: { risk_off: 0.33, neutral: 0.34, risk_on: 0.33 },
      error: 'Insufficient market data'
    };
  }

  // Convert to feature array
  const featureArray: number[] = [
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
  const probabilities: number[] = model.predictProba([featureArray])[0];
  const prediction: number = probabilities.indexOf(Math.max(...probabilities));

  const regime: string = config.regimes[prediction];
  const confidence: number = Math.max(...probabilities);

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
