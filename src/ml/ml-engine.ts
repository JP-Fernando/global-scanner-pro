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
// TYPES
// =====================================================

/** Options for LinearRegression.fit() */
interface LinearRegressionFitOptions {
  learningRate?: number;
  epochs?: number;
  regularization?: number;
}

/** Options for DecisionTree constructor */
interface DecisionTreeOptions {
  maxDepth?: number;
  minSamplesSplit?: number;
  minSamplesLeaf?: number;
  maxFeatures?: number | null;
}

/** A tree node: either a leaf or a split node */
interface TreeLeafNode {
  type: 'leaf';
  value: number;
}

interface TreeSplitNode {
  type: 'split';
  feature: number;
  threshold: number;
  left: TreeNode;
  right: TreeNode;
}

type TreeNode = TreeLeafNode | TreeSplitNode;

/** Result from _findBestSplit */
interface SplitResult {
  feature: number | null;
  threshold: number | null;
  gain: number;
}

/** Options for RandomForestRegressor constructor */
interface RandomForestOptions {
  nEstimators?: number;
  maxDepth?: number;
  minSamplesSplit?: number;
  minSamplesLeaf?: number;
  maxFeatures?: string | number;
  bootstrap?: boolean;
}

/** Options for KMeans constructor */
interface KMeansOptions {
  k?: number;
  maxIterations?: number;
  tolerance?: number;
}

/** Result from trainTestSplit */
interface TrainTestSplitResult {
  X_train: number[][];
  X_test: number[][];
  y_train: number[];
  y_test: number[];
}

/** Result from kFoldSplit */
interface KFoldResult {
  trainIndices: number[];
  testIndices: number[];
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Normalize array to [0, 1] range
 */
export function normalizeArray(arr: number[]): number[] {
  const min: number = Math.min(...arr);
  const max: number = Math.max(...arr);
  const range: number = max - min;

  if (range === 0) return arr.map((): number => 0.5);

  return arr.map((val: number): number => (val - min) / range);
}

/**
 * Standardize array (mean=0, std=1)
 */
export function standardizeArray(arr: number[]): number[] {
  const mean: number = arr.reduce((sum: number, val: number): number => sum + val, 0) / arr.length;
  const variance: number = arr.reduce((sum: number, val: number): number => sum + Math.pow(val - mean, 2), 0) / arr.length;
  const std: number = Math.sqrt(variance);

  if (std === 0) return arr.map((): number => 0);

  return arr.map((val: number): number => (val - mean) / std);
}

/**
 * Calculate correlation between two arrays
 */
export function calculateCorrelation(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length || arr1.length === 0) {
    return 0;
  }

  const mean1: number = arr1.reduce((sum: number, val: number): number => sum + val, 0) / arr1.length;
  const mean2: number = arr2.reduce((sum: number, val: number): number => sum + val, 0) / arr2.length;

  let numerator: number = 0;
  let sum1: number = 0;
  let sum2: number = 0;

  for (let i: number = 0; i < arr1.length; i++) {
    const diff1: number = arr1[i] - mean1;
    const diff2: number = arr2[i] - mean2;
    numerator += diff1 * diff2;
    sum1 += diff1 * diff1;
    sum2 += diff2 * diff2;
  }

  const denominator: number = Math.sqrt(sum1 * sum2);

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate R-squared (coefficient of determination)
 */
export function calculateR2(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) {
    return 0;
  }

  const mean: number = actual.reduce((sum: number, val: number): number => sum + val, 0) / actual.length;

  let ssTotal: number = 0;
  let ssResidual: number = 0;

  for (let i: number = 0; i < actual.length; i++) {
    ssTotal += Math.pow(actual[i] - mean, 2);
    ssResidual += Math.pow(actual[i] - predicted[i], 2);
  }

  return ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);
}

/**
 * Mean Absolute Error
 */
export function calculateMAE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) {
    return Infinity;
  }

  const sum: number = actual.reduce((acc: number, val: number, i: number): number => acc + Math.abs(val - predicted[i]), 0);
  return sum / actual.length;
}

/**
 * Root Mean Squared Error
 */
export function calculateRMSE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) {
    return Infinity;
  }

  const sum: number = actual.reduce((acc: number, val: number, i: number): number => acc + Math.pow(val - predicted[i], 2), 0);
  return Math.sqrt(sum / actual.length);
}

/**
 * Train/Test Split
 */
export function trainTestSplit(X: number[][], y: number[], testRatio: number = 0.2, shuffle: boolean = true): TrainTestSplitResult {
  const n: number = X.length;
  const testSize: number = Math.floor(n * testRatio);
  const trainSize: number = n - testSize;

  const indices: number[] = Array.from({ length: n }, (_: unknown, i: number): number => i);

  if (shuffle) {
    // Fisher-Yates shuffle
    for (let i: number = n - 1; i > 0; i--) {
      const j: number = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
  }

  const trainIndices: number[] = indices.slice(0, trainSize);
  const testIndices: number[] = indices.slice(trainSize);

  return {
    X_train: trainIndices.map((i: number): number[] => X[i]),
    X_test: testIndices.map((i: number): number[] => X[i]),
    y_train: trainIndices.map((i: number): number => y[i]),
    y_test: testIndices.map((i: number): number => y[i])
  };
}

/**
 * K-Fold Cross Validation indices
 */
export function kFoldSplit(n: number, k: number = 5): KFoldResult[] {
  const foldSize: number = Math.floor(n / k);
  const indices: number[] = Array.from({ length: n }, (_: unknown, i: number): number => i);
  const folds: KFoldResult[] = [];

  for (let i: number = 0; i < k; i++) {
    const start: number = i * foldSize;
    const end: number = i === k - 1 ? n : (i + 1) * foldSize;
    const testIndices: number[] = indices.slice(start, end);
    const trainIndices: number[] = [...indices.slice(0, start), ...indices.slice(end)];

    folds.push({ trainIndices, testIndices });
  }

  return folds;
}

// =====================================================
// LINEAR REGRESSION
// =====================================================

export class LinearRegression {
  weights: number[] | null;
  bias: number | null;
  learningRate: number;
  epochs: number;
  regularization: number;

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
  fit(X: number[][], y: number[], options: LinearRegressionFitOptions = {}): this {
    const { learningRate = 0.01, epochs = 1000, regularization = 0.01 } = options;

    this.learningRate = learningRate;
    this.epochs = epochs;
    this.regularization = regularization;

    const n: number = X.length;
    const m: number = X[0].length;

    // Initialize weights and bias
    this.weights = Array(m).fill(0) as number[];
    this.bias = 0;

    // Gradient descent
    for (let epoch: number = 0; epoch < this.epochs; epoch++) {
      const predictions: number[] = this.predict(X);

      // Calculate gradients
      const dWeights: number[] = Array(m).fill(0) as number[];
      let dBias: number = 0;

      for (let i: number = 0; i < n; i++) {
        const error: number = predictions[i] - y[i];
        dBias += error;

        for (let j: number = 0; j < m; j++) {
          dWeights[j] += error * X[i][j];
        }
      }

      // Update weights with L2 regularization
      for (let j: number = 0; j < m; j++) {
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
  predict(X: number[][]): number[] {
    if (!this.weights) {
      throw new Error('Model not trained yet. Call fit() first.');
    }

    return X.map((row: number[]): number => {
      let sum: number = this.bias!;
      for (let j: number = 0; j < row.length; j++) {
        sum += this.weights![j] * row[j];
      }
      return sum;
    });
  }

  /**
   * Get feature importance (absolute weight values)
   */
  getFeatureImportance(): number[] | null {
    if (!this.weights) return null;

    return this.weights.map(Math.abs);
  }
}

// =====================================================
// DECISION TREE (for Random Forest)
// =====================================================

export class DecisionTree {
  maxDepth: number;
  minSamplesSplit: number;
  minSamplesLeaf: number;
  maxFeatures: number | null;
  tree: TreeNode | null;

  constructor(options: DecisionTreeOptions = {}) {
    this.maxDepth = options.maxDepth || 10;
    this.minSamplesSplit = options.minSamplesSplit || 2;
    this.minSamplesLeaf = options.minSamplesLeaf || 1;
    this.maxFeatures = options.maxFeatures || null;
    this.tree = null;
  }

  /**
   * Calculate Gini impurity for classification or variance for regression
   */
  _calculateImpurity(y: number[], isClassification: boolean = false): number {
    if (y.length === 0) return 0;

    if (isClassification) {
      // Gini impurity
      const counts: Record<number, number> = {};
      y.forEach((val: number): void => {
        counts[val] = (counts[val] || 0) + 1;
      });

      let gini: number = 1;
      for (const count of Object.values(counts)) {
        const prob: number = count / y.length;
        gini -= prob * prob;
      }

      return gini;
    } else {
      // Variance for regression
      const mean: number = y.reduce((sum: number, val: number): number => sum + val, 0) / y.length;
      const variance: number = y.reduce((sum: number, val: number): number => sum + Math.pow(val - mean, 2), 0) / y.length;
      return variance;
    }
  }

  /**
   * Find best split
   */
  _findBestSplit(X: number[][], y: number[], featureIndices: number[]): SplitResult {
    let bestGain: number = -Infinity;
    let bestFeature: number | null = null;
    let bestThreshold: number | null = null;

    const currentImpurity: number = this._calculateImpurity(y);

    for (const featureIdx of featureIndices) {
      const values: number[] = X.map((row: number[]): number => row[featureIdx]);
      const uniqueValues: number[] = [...new Set(values)].sort((a: number, b: number): number => a - b);

      for (let i: number = 0; i < uniqueValues.length - 1; i++) {
        const threshold: number = (uniqueValues[i] + uniqueValues[i + 1]) / 2;

        const leftIndices: number[] = [];
        const rightIndices: number[] = [];

        X.forEach((row: number[], idx: number): void => {
          if (row[featureIdx] <= threshold) {
            leftIndices.push(idx);
          } else {
            rightIndices.push(idx);
          }
        });

        if (leftIndices.length === 0 || rightIndices.length === 0) continue;

        const leftY: number[] = leftIndices.map((idx: number): number => y[idx]);
        const rightY: number[] = rightIndices.map((idx: number): number => y[idx]);

        const leftImpurity: number = this._calculateImpurity(leftY);
        const rightImpurity: number = this._calculateImpurity(rightY);

        const n: number = y.length;
        const weightedImpurity: number =
          (leftY.length / n) * leftImpurity +
          (rightY.length / n) * rightImpurity;

        const gain: number = currentImpurity - weightedImpurity;

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
  _buildTree(X: number[][], y: number[], depth: number = 0): TreeNode {
    const n: number = y.length;

    // Stopping criteria
    if (n < this.minSamplesSplit || depth >= this.maxDepth) {
      const mean: number = y.reduce((sum: number, val: number): number => sum + val, 0) / y.length;
      return { type: 'leaf', value: mean };
    }

    // Select random features if maxFeatures is set
    const numFeatures: number = X[0].length;
    let featureIndices: number[];

    if (this.maxFeatures && this.maxFeatures < numFeatures) {
      featureIndices = [];
      const available: number[] = Array.from({ length: numFeatures }, (_: unknown, i: number): number => i);

      for (let i: number = 0; i < this.maxFeatures; i++) {
        const idx: number = Math.floor(Math.random() * available.length);
        featureIndices.push(available[idx]);
        available.splice(idx, 1);
      }
    } else {
      featureIndices = Array.from({ length: numFeatures }, (_: unknown, i: number): number => i);
    }

    const { feature, threshold, gain } = this._findBestSplit(X, y, featureIndices);

    if (feature === null || gain <= 0) {
      const mean: number = y.reduce((sum: number, val: number): number => sum + val, 0) / y.length;
      return { type: 'leaf', value: mean };
    }

    // Split data
    const leftIndices: number[] = [];
    const rightIndices: number[] = [];

    X.forEach((row: number[], idx: number): void => {
      if (row[feature] <= threshold!) {
        leftIndices.push(idx);
      } else {
        rightIndices.push(idx);
      }
    });

    // Check min samples leaf
    if (leftIndices.length < this.minSamplesLeaf || rightIndices.length < this.minSamplesLeaf) {
      const mean: number = y.reduce((sum: number, val: number): number => sum + val, 0) / y.length;
      return { type: 'leaf', value: mean };
    }

    const leftX: number[][] = leftIndices.map((idx: number): number[] => X[idx]);
    const leftY: number[] = leftIndices.map((idx: number): number => y[idx]);
    const rightX: number[][] = rightIndices.map((idx: number): number[] => X[idx]);
    const rightY: number[] = rightIndices.map((idx: number): number => y[idx]);

    return {
      type: 'split',
      feature,
      threshold: threshold!,
      left: this._buildTree(leftX, leftY, depth + 1),
      right: this._buildTree(rightX, rightY, depth + 1)
    };
  }

  /**
   * Train the tree
   */
  fit(X: number[][], y: number[]): this {
    this.tree = this._buildTree(X, y);
    return this;
  }

  /**
   * Predict for single sample
   */
  _predictOne(x: number[], node: TreeNode): number {
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
  predict(X: number[][]): number[] {
    if (!this.tree) {
      throw new Error('Model not trained yet. Call fit() first.');
    }

    return X.map((x: number[]): number => this._predictOne(x, this.tree!));
  }
}

// =====================================================
// RANDOM FOREST REGRESSOR
// =====================================================

export class RandomForestRegressor {
  nEstimators: number;
  maxDepth: number;
  minSamplesSplit: number;
  minSamplesLeaf: number;
  maxFeatures: string | number;
  bootstrap: boolean;
  trees: DecisionTree[];

  constructor(options: RandomForestOptions = {}) {
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
  _bootstrapSample(X: number[][], y: number[]): { X: number[][]; y: number[] } {
    const n: number = X.length;
    const indices: number[] = Array.from({ length: n }, (): number => Math.floor(Math.random() * n));

    return {
      X: indices.map((i: number): number[] => X[i]),
      y: indices.map((i: number): number => y[i])
    };
  }

  /**
   * Calculate max features based on string option
   */
  _getMaxFeatures(numFeatures: number): number {
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
  fit(X: number[][], y: number[], onProgress: ((progress: number) => void) | null = null): this {
    this.trees = [];
    const maxFeatures: number = this._getMaxFeatures(X[0].length);

    for (let i: number = 0; i < this.nEstimators; i++) {
      const { X: X_sample, y: y_sample } = this.bootstrap
        ? this._bootstrapSample(X, y)
        : { X, y };

      const tree: DecisionTree = new DecisionTree({
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
  predict(X: number[][]): number[] {
    if (this.trees.length === 0) {
      throw new Error('Model not trained yet. Call fit() first.');
    }

    const predictions: number[][] = this.trees.map((tree: DecisionTree): number[] => tree.predict(X));

    // Average predictions from all trees
    return X.map((_: number[], i: number): number => {
      const sum: number = predictions.reduce((acc: number, pred: number[]): number => acc + pred[i], 0);
      return sum / this.trees.length;
    });
  }

  /**
   * Get feature importance (average across all trees)
   */
  getFeatureImportance(X: number[][]): number[] {
    // Simplified feature importance:
    // Count how many times each feature is used for splitting
    const numFeatures: number = X[0].length;
    const importance: number[] = Array(numFeatures).fill(0) as number[];

    const countSplits = (node: TreeNode): void => {
      if (node.type === 'leaf') return;

      importance[node.feature]++;

      if (node.left) countSplits(node.left);
      if (node.right) countSplits(node.right);
    };

    this.trees.forEach((tree: DecisionTree): void => {
      countSplits(tree.tree!);
    });

    // Normalize
    const total: number = importance.reduce((sum: number, val: number): number => sum + val, 0);
    if (total > 0) {
      return importance.map((val: number): number => val / total);
    }

    return importance;
  }
}

// =====================================================
// K-MEANS CLUSTERING
// =====================================================

export class KMeans {
  k: number;
  maxIterations: number;
  tolerance: number;
  centroids: number[][] | null;
  labels: number[] | null;

  constructor(options: KMeansOptions = {}) {
    this.k = options.k || 3;
    this.maxIterations = options.maxIterations || 100;
    this.tolerance = options.tolerance || 1e-4;
    this.centroids = null;
    this.labels = null;
  }

  /**
   * Initialize centroids using k-means++
   */
  _initializeCentroids(X: number[][]): number[][] {
    const n: number = X.length;
    const _m: number = X[0].length;
    const centroids: number[][] = [];

    // First centroid: random point
    centroids.push(X[Math.floor(Math.random() * n)].slice());

    // Remaining centroids: k-means++
    for (let i: number = 1; i < this.k; i++) {
      const distances: number[] = X.map((point: number[]): number => {
        const minDist: number = Math.min(...centroids.map((centroid: number[]): number =>
          this._euclideanDistance(point, centroid)
        ));
        return minDist * minDist;
      });

      const sum: number = distances.reduce((acc: number, d: number): number => acc + d, 0);
      const probabilities: number[] = distances.map((d: number): number => d / sum);

      const r: number = Math.random();
      let cumulativeProb: number = 0;
      let selectedIdx: number = 0;

      for (let j: number = 0; j < probabilities.length; j++) {
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
  _euclideanDistance(a: number[], b: number[]): number {
    let sum: number = 0;
    for (let i: number = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Assign points to nearest centroid
   */
  _assignClusters(X: number[][], centroids: number[][]): number[] {
    return X.map((point: number[]): number => {
      const distances: number[] = centroids.map((centroid: number[]): number =>
        this._euclideanDistance(point, centroid)
      );
      return distances.indexOf(Math.min(...distances));
    });
  }

  /**
   * Update centroids
   */
  _updateCentroids(X: number[][], labels: number[]): number[][] {
    const m: number = X[0].length;
    const centroids: number[][] = [];

    for (let i: number = 0; i < this.k; i++) {
      const clusterPoints: number[][] = X.filter((_: number[], idx: number): boolean => labels[idx] === i);

      if (clusterPoints.length === 0) {
        // If cluster is empty, reinitialize randomly
        centroids.push(X[Math.floor(Math.random() * X.length)].slice());
      } else {
        const centroid: number[] = Array(m).fill(0) as number[];

        clusterPoints.forEach((point: number[]): void => {
          point.forEach((val: number, j: number): void => {
            centroid[j] += val;
          });
        });

        centroids.push(centroid.map((val: number): number => val / clusterPoints.length));
      }
    }

    return centroids;
  }

  /**
   * Fit the model
   */
  fit(X: number[][]): this {
    this.centroids = this._initializeCentroids(X);

    for (let iter: number = 0; iter < this.maxIterations; iter++) {
      // Assign clusters
      const newLabels: number[] = this._assignClusters(X, this.centroids);

      // Update centroids
      const newCentroids: number[][] = this._updateCentroids(X, newLabels);

      // Check convergence
      const shift: number = this.centroids.reduce((sum: number, centroid: number[], i: number): number => {
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
  predict(X: number[][]): number[] {
    if (!this.centroids) {
      throw new Error('Model not trained yet. Call fit() first.');
    }

    return this._assignClusters(X, this.centroids);
  }

  /**
   * Calculate inertia (sum of squared distances to centroids)
   */
  getInertia(X: number[][]): number {
    if (!this.centroids || !this.labels) {
      return Infinity;
    }

    let inertia: number = 0;

    X.forEach((point: number[], idx: number): void => {
      const centroid: number[] = this.centroids![this.labels![idx]];
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
