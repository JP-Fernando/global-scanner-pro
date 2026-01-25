// =====================================================
// ML ENGINE CORE
// =====================================================

/**
 * Machine Learning Engine Core
 *
 * Central Machine Learning system that coordinates all ML modules:
 * - Factor weighting optimization
 * - Score adaptation based on performance
 * - Market regime prediction
 * - Recommendation system
 * - Anomaly detection
 *
 * Uses lightweight browser-compatible ML algorithms.
 * No external ML libraries required - pure JavaScript implementation.
 */

import _i18n from '../i18n/i18n.js';

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Normalize array to [0, 1] range
 */
export function normalizeArray(arr) {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min;

  if (range === 0) return arr.map(() => 0.5);

  return arr.map(val => (val - min) / range);
}

/**
 * Standardize array (mean=0, std=1)
 */
export function standardizeArray(arr) {
  const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  const std = Math.sqrt(variance);

  if (std === 0) return arr.map(() => 0);

  return arr.map(val => (val - mean) / std);
}

/**
 * Calculate correlation between two arrays
 */
export function calculateCorrelation(arr1, arr2) {
  if (arr1.length !== arr2.length || arr1.length === 0) {
    return 0;
  }

  const mean1 = arr1.reduce((sum, val) => sum + val, 0) / arr1.length;
  const mean2 = arr2.reduce((sum, val) => sum + val, 0) / arr2.length;

  let numerator = 0;
  let sum1 = 0;
  let sum2 = 0;

  for (let i = 0; i < arr1.length; i++) {
    const diff1 = arr1[i] - mean1;
    const diff2 = arr2[i] - mean2;
    numerator += diff1 * diff2;
    sum1 += diff1 * diff1;
    sum2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(sum1 * sum2);

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate R-squared (coefficient of determination)
 */
export function calculateR2(actual, predicted) {
  if (actual.length !== predicted.length || actual.length === 0) {
    return 0;
  }

  const mean = actual.reduce((sum, val) => sum + val, 0) / actual.length;

  let ssTotal = 0;
  let ssResidual = 0;

  for (let i = 0; i < actual.length; i++) {
    ssTotal += Math.pow(actual[i] - mean, 2);
    ssResidual += Math.pow(actual[i] - predicted[i], 2);
  }

  return ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);
}

/**
 * Mean Absolute Error
 */
export function calculateMAE(actual, predicted) {
  if (actual.length !== predicted.length || actual.length === 0) {
    return Infinity;
  }

  const sum = actual.reduce((acc, val, i) => acc + Math.abs(val - predicted[i]), 0);
  return sum / actual.length;
}

/**
 * Root Mean Squared Error
 */
export function calculateRMSE(actual, predicted) {
  if (actual.length !== predicted.length || actual.length === 0) {
    return Infinity;
  }

  const sum = actual.reduce((acc, val, i) => acc + Math.pow(val - predicted[i], 2), 0);
  return Math.sqrt(sum / actual.length);
}

/**
 * Train/Test Split
 */
export function trainTestSplit(X, y, testRatio = 0.2, shuffle = true) {
  const n = X.length;
  const testSize = Math.floor(n * testRatio);
  const trainSize = n - testSize;

  const indices = Array.from({ length: n }, (_, i) => i);

  if (shuffle) {
    // Fisher-Yates shuffle
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
  }

  const trainIndices = indices.slice(0, trainSize);
  const testIndices = indices.slice(trainSize);

  return {
    X_train: trainIndices.map(i => X[i]),
    X_test: testIndices.map(i => X[i]),
    y_train: trainIndices.map(i => y[i]),
    y_test: testIndices.map(i => y[i])
  };
}

/**
 * K-Fold Cross Validation indices
 */
export function kFoldSplit(n, k = 5) {
  const foldSize = Math.floor(n / k);
  const indices = Array.from({ length: n }, (_, i) => i);
  const folds = [];

  for (let i = 0; i < k; i++) {
    const start = i * foldSize;
    const end = i === k - 1 ? n : (i + 1) * foldSize;
    const testIndices = indices.slice(start, end);
    const trainIndices = [...indices.slice(0, start), ...indices.slice(end)];

    folds.push({ trainIndices, testIndices });
  }

  return folds;
}

// =====================================================
// LINEAR REGRESSION
// =====================================================

export class LinearRegression {
  constructor() {
    this.weights = null;
    this.bias = null;
    this.learningRate = 0.01;
    this.epochs = 1000;
    this.regularization = 0.01; // L2 regularization
  }

  /**
   * Fit the model using gradient descent
   */
  fit(X, y, options = {}) {
    const { learningRate = 0.01, epochs = 1000, regularization = 0.01 } = options;

    this.learningRate = learningRate;
    this.epochs = epochs;
    this.regularization = regularization;

    const n = X.length;
    const m = X[0].length;

    // Initialize weights and bias
    this.weights = Array(m).fill(0);
    this.bias = 0;

    // Gradient descent
    for (let epoch = 0; epoch < this.epochs; epoch++) {
      const predictions = this.predict(X);

      // Calculate gradients
      const dWeights = Array(m).fill(0);
      let dBias = 0;

      for (let i = 0; i < n; i++) {
        const error = predictions[i] - y[i];
        dBias += error;

        for (let j = 0; j < m; j++) {
          dWeights[j] += error * X[i][j];
        }
      }

      // Update weights with L2 regularization
      for (let j = 0; j < m; j++) {
        this.weights[j] -= this.learningRate * (
          (dWeights[j] / n) + (this.regularization * this.weights[j])
        );
      }

      this.bias -= this.learningRate * (dBias / n);
    }

    return this;
  }

  /**
   * Predict using the trained model
   */
  predict(X) {
    if (!this.weights) {
      throw new Error('Model not trained yet. Call fit() first.');
    }

    return X.map(row => {
      let sum = this.bias;
      for (let j = 0; j < row.length; j++) {
        sum += this.weights[j] * row[j];
      }
      return sum;
    });
  }

  /**
   * Get feature importance (absolute weight values)
   */
  getFeatureImportance() {
    if (!this.weights) return null;

    return this.weights.map(Math.abs);
  }
}

// =====================================================
// DECISION TREE (for Random Forest)
// =====================================================

export class DecisionTree {
  constructor(options = {}) {
    this.maxDepth = options.maxDepth || 10;
    this.minSamplesSplit = options.minSamplesSplit || 2;
    this.minSamplesLeaf = options.minSamplesLeaf || 1;
    this.maxFeatures = options.maxFeatures || null;
    this.tree = null;
  }

  /**
   * Calculate Gini impurity for classification or variance for regression
   */
  _calculateImpurity(y, isClassification = false) {
    if (y.length === 0) return 0;

    if (isClassification) {
      // Gini impurity
      const counts = {};
      y.forEach(val => {
        counts[val] = (counts[val] || 0) + 1;
      });

      let gini = 1;
      for (const count of Object.values(counts)) {
        const prob = count / y.length;
        gini -= prob * prob;
      }

      return gini;
    } else {
      // Variance for regression
      const mean = y.reduce((sum, val) => sum + val, 0) / y.length;
      const variance = y.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / y.length;
      return variance;
    }
  }

  /**
   * Find best split
   */
  _findBestSplit(X, y, featureIndices) {
    let bestGain = -Infinity;
    let bestFeature = null;
    let bestThreshold = null;

    const currentImpurity = this._calculateImpurity(y);

    for (const featureIdx of featureIndices) {
      const values = X.map(row => row[featureIdx]);
      const uniqueValues = [...new Set(values)].sort((a, b) => a - b);

      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;

        const leftIndices = [];
        const rightIndices = [];

        X.forEach((row, idx) => {
          if (row[featureIdx] <= threshold) {
            leftIndices.push(idx);
          } else {
            rightIndices.push(idx);
          }
        });

        if (leftIndices.length === 0 || rightIndices.length === 0) continue;

        const leftY = leftIndices.map(idx => y[idx]);
        const rightY = rightIndices.map(idx => y[idx]);

        const leftImpurity = this._calculateImpurity(leftY);
        const rightImpurity = this._calculateImpurity(rightY);

        const n = y.length;
        const weightedImpurity =
          (leftY.length / n) * leftImpurity +
          (rightY.length / n) * rightImpurity;

        const gain = currentImpurity - weightedImpurity;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = featureIdx;
          bestThreshold = threshold;
        }
      }
    }

    return { feature: bestFeature, threshold: bestThreshold, gain: bestGain };
  }

  /**
   * Build tree recursively
   */
  _buildTree(X, y, depth = 0) {
    const n = y.length;

    // Stopping criteria
    if (n < this.minSamplesSplit || depth >= this.maxDepth) {
      const mean = y.reduce((sum, val) => sum + val, 0) / y.length;
      return { type: 'leaf', value: mean };
    }

    // Select random features if maxFeatures is set
    const numFeatures = X[0].length;
    let featureIndices;

    if (this.maxFeatures && this.maxFeatures < numFeatures) {
      featureIndices = [];
      const available = Array.from({ length: numFeatures }, (_, i) => i);

      for (let i = 0; i < this.maxFeatures; i++) {
        const idx = Math.floor(Math.random() * available.length);
        featureIndices.push(available[idx]);
        available.splice(idx, 1);
      }
    } else {
      featureIndices = Array.from({ length: numFeatures }, (_, i) => i);
    }

    const { feature, threshold, gain } = this._findBestSplit(X, y, featureIndices);

    if (feature === null || gain <= 0) {
      const mean = y.reduce((sum, val) => sum + val, 0) / y.length;
      return { type: 'leaf', value: mean };
    }

    // Split data
    const leftIndices = [];
    const rightIndices = [];

    X.forEach((row, idx) => {
      if (row[feature] <= threshold) {
        leftIndices.push(idx);
      } else {
        rightIndices.push(idx);
      }
    });

    // Check min samples leaf
    if (leftIndices.length < this.minSamplesLeaf || rightIndices.length < this.minSamplesLeaf) {
      const mean = y.reduce((sum, val) => sum + val, 0) / y.length;
      return { type: 'leaf', value: mean };
    }

    const leftX = leftIndices.map(idx => X[idx]);
    const leftY = leftIndices.map(idx => y[idx]);
    const rightX = rightIndices.map(idx => X[idx]);
    const rightY = rightIndices.map(idx => y[idx]);

    return {
      type: 'split',
      feature,
      threshold,
      left: this._buildTree(leftX, leftY, depth + 1),
      right: this._buildTree(rightX, rightY, depth + 1)
    };
  }

  /**
   * Train the tree
   */
  fit(X, y) {
    this.tree = this._buildTree(X, y);
    return this;
  }

  /**
   * Predict for single sample
   */
  _predictOne(x, node) {
    if (node.type === 'leaf') {
      return node.value;
    }

    if (x[node.feature] <= node.threshold) {
      return this._predictOne(x, node.left);
    } else {
      return this._predictOne(x, node.right);
    }
  }

  /**
   * Predict for multiple samples
   */
  predict(X) {
    if (!this.tree) {
      throw new Error('Model not trained yet. Call fit() first.');
    }

    return X.map(x => this._predictOne(x, this.tree));
  }
}

// =====================================================
// RANDOM FOREST REGRESSOR
// =====================================================

export class RandomForestRegressor {
  constructor(options = {}) {
    this.nEstimators = options.nEstimators || 100;
    this.maxDepth = options.maxDepth || 10;
    this.minSamplesSplit = options.minSamplesSplit || 2;
    this.minSamplesLeaf = options.minSamplesLeaf || 1;
    this.maxFeatures = options.maxFeatures || 'sqrt'; // 'sqrt', 'log2', or number
    this.bootstrap = options.bootstrap !== false;
    this.trees = [];
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
   * Calculate max features based on string option
   */
  _getMaxFeatures(numFeatures) {
    if (typeof this.maxFeatures === 'number') {
      return Math.min(this.maxFeatures, numFeatures);
    }

    if (this.maxFeatures === 'sqrt') {
      return Math.floor(Math.sqrt(numFeatures));
    }

    if (this.maxFeatures === 'log2') {
      return Math.floor(Math.log2(numFeatures));
    }

    return numFeatures;
  }

  /**
   * Train the forest
   */
  fit(X, y, onProgress = null) {
    this.trees = [];
    const maxFeatures = this._getMaxFeatures(X[0].length);

    for (let i = 0; i < this.nEstimators; i++) {
      const { X: X_sample, y: y_sample } = this.bootstrap
        ? this._bootstrapSample(X, y)
        : { X, y };

      const tree = new DecisionTree({
        maxDepth: this.maxDepth,
        minSamplesSplit: this.minSamplesSplit,
        minSamplesLeaf: this.minSamplesLeaf,
        maxFeatures
      });

      tree.fit(X_sample, y_sample);
      this.trees.push(tree);

      if (onProgress) {
        onProgress((i + 1) / this.nEstimators);
      }
    }

    return this;
  }

  /**
   * Predict (average of all trees)
   */
  predict(X) {
    if (this.trees.length === 0) {
      throw new Error('Model not trained yet. Call fit() first.');
    }

    const predictions = this.trees.map(tree => tree.predict(X));

    // Average predictions from all trees
    return X.map((_, i) => {
      const sum = predictions.reduce((acc, pred) => acc + pred[i], 0);
      return sum / this.trees.length;
    });
  }

  /**
   * Get feature importance (average across all trees)
   */
  getFeatureImportance(X) {
    // Simplified feature importance:
    // Count how many times each feature is used for splitting
    const numFeatures = X[0].length;
    const importance = Array(numFeatures).fill(0);

    const countSplits = (node) => {
      if (node.type === 'leaf') return;

      importance[node.feature]++;

      if (node.left) countSplits(node.left);
      if (node.right) countSplits(node.right);
    };

    this.trees.forEach(tree => {
      countSplits(tree.tree);
    });

    // Normalize
    const total = importance.reduce((sum, val) => sum + val, 0);
    if (total > 0) {
      return importance.map(val => val / total);
    }

    return importance;
  }
}

// =====================================================
// K-MEANS CLUSTERING
// =====================================================

export class KMeans {
  constructor(options = {}) {
    this.k = options.k || 3;
    this.maxIterations = options.maxIterations || 100;
    this.tolerance = options.tolerance || 1e-4;
    this.centroids = null;
    this.labels = null;
  }

  /**
   * Initialize centroids using k-means++
   */
  _initializeCentroids(X) {
    const n = X.length;
    const _m = X[0].length;
    const centroids = [];

    // First centroid: random point
    centroids.push(X[Math.floor(Math.random() * n)].slice());

    // Remaining centroids: k-means++
    for (let i = 1; i < this.k; i++) {
      const distances = X.map(point => {
        const minDist = Math.min(...centroids.map(centroid =>
          this._euclideanDistance(point, centroid)
        ));
        return minDist * minDist;
      });

      const sum = distances.reduce((acc, d) => acc + d, 0);
      const probabilities = distances.map(d => d / sum);

      const r = Math.random();
      let cumulativeProb = 0;
      let selectedIdx = 0;

      for (let j = 0; j < probabilities.length; j++) {
        cumulativeProb += probabilities[j];
        if (r <= cumulativeProb) {
          selectedIdx = j;
          break;
        }
      }

      centroids.push(X[selectedIdx].slice());
    }

    return centroids;
  }

  /**
   * Calculate Euclidean distance
   */
  _euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Assign points to nearest centroid
   */
  _assignClusters(X, centroids) {
    return X.map(point => {
      const distances = centroids.map(centroid =>
        this._euclideanDistance(point, centroid)
      );
      return distances.indexOf(Math.min(...distances));
    });
  }

  /**
   * Update centroids
   */
  _updateCentroids(X, labels) {
    const m = X[0].length;
    const centroids = [];

    for (let i = 0; i < this.k; i++) {
      const clusterPoints = X.filter((_, idx) => labels[idx] === i);

      if (clusterPoints.length === 0) {
        // If cluster is empty, reinitialize randomly
        centroids.push(X[Math.floor(Math.random() * X.length)].slice());
      } else {
        const centroid = Array(m).fill(0);

        clusterPoints.forEach(point => {
          point.forEach((val, j) => {
            centroid[j] += val;
          });
        });

        centroids.push(centroid.map(val => val / clusterPoints.length));
      }
    }

    return centroids;
  }

  /**
   * Fit the model
   */
  fit(X) {
    this.centroids = this._initializeCentroids(X);

    for (let iter = 0; iter < this.maxIterations; iter++) {
      // Assign clusters
      const newLabels = this._assignClusters(X, this.centroids);

      // Update centroids
      const newCentroids = this._updateCentroids(X, newLabels);

      // Check convergence
      const shift = this.centroids.reduce((sum, centroid, i) => {
        return sum + this._euclideanDistance(centroid, newCentroids[i]);
      }, 0);

      this.centroids = newCentroids;
      this.labels = newLabels;

      if (shift < this.tolerance) {
        break;
      }
    }

    return this;
  }

  /**
   * Predict cluster labels
   */
  predict(X) {
    if (!this.centroids) {
      throw new Error('Model not trained yet. Call fit() first.');
    }

    return this._assignClusters(X, this.centroids);
  }

  /**
   * Calculate inertia (sum of squared distances to centroids)
   */
  getInertia(X) {
    if (!this.centroids || !this.labels) {
      return Infinity;
    }

    let inertia = 0;

    X.forEach((point, idx) => {
      const centroid = this.centroids[this.labels[idx]];
      inertia += Math.pow(this._euclideanDistance(point, centroid), 2);
    });

    return inertia;
  }
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  // Utilities
  normalizeArray,
  standardizeArray,
  calculateCorrelation,
  calculateR2,
  calculateMAE,
  calculateRMSE,
  trainTestSplit,
  kFoldSplit,

  // Models
  LinearRegression,
  DecisionTree,
  RandomForestRegressor,
  KMeans
};
