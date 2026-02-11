/**
 * ML Engine Extended Tests
 *
 * Covers normalizeArray, standardizeArray, calculateCorrelation edge cases,
 * calculateRMSE, kFoldSplit, LinearRegression.getFeatureImportance,
 * KMeans.getInertia edge cases, DecisionTree edge cases,
 * RandomForestRegressor.getFeatureImportance, and trainTestSplit shuffle.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeArray,
  standardizeArray,
  calculateCorrelation,
  calculateR2,
  calculateMAE,
  calculateRMSE,
  trainTestSplit,
  kFoldSplit,
  LinearRegression,
  DecisionTree,
  RandomForestRegressor,
  KMeans,
} from '../../ml/ml-engine.js';

// -----------------------------------------------------------
// normalizeArray
// -----------------------------------------------------------
describe('normalizeArray', () => {
  it('normalizes values to [0, 1] range', () => {
    const result = normalizeArray([10, 20, 30, 40, 50]);
    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[4]).toBeCloseTo(1, 5);
    expect(result[2]).toBeCloseTo(0.5, 5);
  });

  it('returns 0.5 for all elements when all values are equal', () => {
    const result = normalizeArray([5, 5, 5]);
    result.forEach(v => expect(v).toBe(0.5));
  });

  it('handles two-element array', () => {
    const result = normalizeArray([0, 100]);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(1);
  });

  it('handles negative values', () => {
    const result = normalizeArray([-10, 0, 10]);
    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[1]).toBeCloseTo(0.5, 5);
    expect(result[2]).toBeCloseTo(1, 5);
  });
});

// -----------------------------------------------------------
// standardizeArray
// -----------------------------------------------------------
describe('standardizeArray', () => {
  it('produces mean ≈ 0 and std ≈ 1', () => {
    const result = standardizeArray([10, 20, 30, 40, 50]);

    const mean = result.reduce((s, v) => s + v, 0) / result.length;
    expect(mean).toBeCloseTo(0, 5);

    const variance = result.reduce((s, v) => s + v * v, 0) / result.length;
    expect(Math.sqrt(variance)).toBeCloseTo(1, 5);
  });

  it('returns all zeros when all values are equal', () => {
    const result = standardizeArray([7, 7, 7, 7]);
    result.forEach(v => expect(v).toBe(0));
  });

  it('handles two elements', () => {
    const result = standardizeArray([0, 10]);
    expect(result[0]).toBeCloseTo(-1, 5);
    expect(result[1]).toBeCloseTo(1, 5);
  });
});

// -----------------------------------------------------------
// calculateCorrelation edge cases
// -----------------------------------------------------------
describe('calculateCorrelation - edge cases', () => {
  it('returns 0 for empty arrays', () => {
    expect(calculateCorrelation([], [])).toBe(0);
  });

  it('returns 0 for mismatched lengths', () => {
    expect(calculateCorrelation([1, 2], [1])).toBe(0);
  });

  it('returns 0 when one array is constant', () => {
    expect(calculateCorrelation([5, 5, 5], [1, 2, 3])).toBe(0);
  });

  it('returns 1 for perfectly correlated arrays', () => {
    expect(calculateCorrelation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 5);
  });

  it('returns -1 for perfectly negatively correlated arrays', () => {
    expect(calculateCorrelation([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 5);
  });
});

// -----------------------------------------------------------
// calculateRMSE
// -----------------------------------------------------------
describe('calculateRMSE', () => {
  it('returns 0 for identical arrays', () => {
    expect(calculateRMSE([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('calculates correct RMSE', () => {
    // errors: [1, -1, 0] → MSE = 2/3 → RMSE = sqrt(2/3)
    expect(calculateRMSE([1, 2, 3], [2, 1, 3])).toBeCloseTo(Math.sqrt(2 / 3), 5);
  });

  it('returns Infinity for empty arrays', () => {
    expect(calculateRMSE([], [])).toBe(Infinity);
  });

  it('returns Infinity for mismatched lengths', () => {
    expect(calculateRMSE([1], [1, 2])).toBe(Infinity);
  });
});

// -----------------------------------------------------------
// calculateR2 edge cases
// -----------------------------------------------------------
describe('calculateR2 - edge cases', () => {
  it('returns 0 for empty arrays', () => {
    expect(calculateR2([], [])).toBe(0);
  });

  it('returns 0 when all actual values are the same', () => {
    expect(calculateR2([5, 5, 5], [4, 5, 6])).toBe(0);
  });
});

// -----------------------------------------------------------
// calculateMAE edge cases
// -----------------------------------------------------------
describe('calculateMAE - edge cases', () => {
  it('returns 0 for identical arrays', () => {
    expect(calculateMAE([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('returns Infinity for mismatched lengths', () => {
    expect(calculateMAE([1, 2], [1])).toBe(Infinity);
  });
});

// -----------------------------------------------------------
// trainTestSplit
// -----------------------------------------------------------
describe('trainTestSplit', () => {
  const X = [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]];
  const y = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('splits data with correct sizes', () => {
    const split = trainTestSplit(X, y, 0.3, false);
    expect(split.X_train.length).toBe(7);
    expect(split.X_test.length).toBe(3);
    expect(split.y_train.length).toBe(7);
    expect(split.y_test.length).toBe(3);
  });

  it('preserves order when shuffle is false', () => {
    const split = trainTestSplit(X, y, 0.2, false);
    expect(split.y_train).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(split.y_test).toEqual([9, 10]);
  });

  it('shuffles data when shuffle is true', () => {
    // Run multiple times - at least one should differ from sorted order
    let shuffled = false;
    for (let i = 0; i < 10; i++) {
      const split = trainTestSplit(X, y, 0.2, true);
      const combined = [...split.y_train, ...split.y_test];
      if (JSON.stringify(combined) !== JSON.stringify(y)) {
        shuffled = true;
        break;
      }
    }
    expect(shuffled).toBe(true);
  });
});

// -----------------------------------------------------------
// kFoldSplit
// -----------------------------------------------------------
describe('kFoldSplit', () => {
  it('creates correct number of folds', () => {
    const folds = kFoldSplit(100, 5);
    expect(folds).toHaveLength(5);
  });

  it('each fold has non-overlapping train and test indices', () => {
    const folds = kFoldSplit(20, 4);

    folds.forEach(fold => {
      const trainSet = new Set(fold.trainIndices);
      const testSet = new Set(fold.testIndices);

      // No overlap
      testSet.forEach(idx => {
        expect(trainSet.has(idx)).toBe(false);
      });

      // All indices covered
      expect(trainSet.size + testSet.size).toBe(20);
    });
  });

  it('last fold includes remainder', () => {
    const folds = kFoldSplit(13, 3);
    // 13/3 = 4 per fold, last fold gets 5
    expect(folds[2].testIndices.length).toBe(5);
  });
});

// -----------------------------------------------------------
// LinearRegression.getFeatureImportance
// -----------------------------------------------------------
describe('LinearRegression - getFeatureImportance', () => {
  it('returns null before training', () => {
    const model = new LinearRegression();
    expect(model.getFeatureImportance()).toBeNull();
  });

  it('returns absolute weight values after training', () => {
    const model = new LinearRegression();
    model.fit([[1, 2], [3, 4], [5, 6]], [5, 11, 17], { epochs: 500, learningRate: 0.01 });

    const importance = model.getFeatureImportance();
    expect(importance).toHaveLength(2);
    importance.forEach(v => expect(v).toBeGreaterThanOrEqual(0));
  });
});

// -----------------------------------------------------------
// LinearRegression.predict error
// -----------------------------------------------------------
describe('LinearRegression - predict before fit', () => {
  it('throws when model not trained', () => {
    const model = new LinearRegression();
    expect(() => model.predict([[1, 2]])).toThrow('Model not trained');
  });
});

// -----------------------------------------------------------
// DecisionTree edge cases
// -----------------------------------------------------------
describe('DecisionTree - edge cases', () => {
  it('throws when predicting before training', () => {
    const tree = new DecisionTree();
    expect(() => tree.predict([[1, 2]])).toThrow('Model not trained');
  });

  it('creates leaf for data below minSamplesSplit', () => {
    const tree = new DecisionTree({ minSamplesSplit: 10 });
    tree.fit([[1], [2], [3]], [1, 2, 3]);
    // Should still predict (all leaves)
    const predictions = tree.predict([[1], [2], [3]]);
    expect(predictions).toHaveLength(3);
  });

  it('handles classification impurity calculation', () => {
    const tree = new DecisionTree();
    // _calculateImpurity with isClassification
    const impurity = tree._calculateImpurity([0, 0, 1, 1], true);
    expect(impurity).toBeCloseTo(0.5, 5); // Gini for balanced binary
  });

  it('returns 0 impurity for empty array', () => {
    const tree = new DecisionTree();
    expect(tree._calculateImpurity([], false)).toBe(0);
    expect(tree._calculateImpurity([], true)).toBe(0);
  });
});

// -----------------------------------------------------------
// KMeans edge cases
// -----------------------------------------------------------
describe('KMeans - getInertia edge cases', () => {
  it('returns Infinity before training', () => {
    const km = new KMeans({ k: 2 });
    expect(km.getInertia([[1, 2]])).toBe(Infinity);
  });

  it('throws when predicting before training', () => {
    const km = new KMeans({ k: 2 });
    expect(() => km.predict([[1, 2]])).toThrow('Model not trained');
  });

  it('converges for simple two-cluster data', () => {
    const X = [
      [0, 0], [1, 0], [0, 1], [1, 1],
      [10, 10], [11, 10], [10, 11], [11, 11],
    ];
    const km = new KMeans({ k: 2, maxIterations: 50 });
    km.fit(X);

    // Inertia should be finite and reasonable
    const inertia = km.getInertia(X);
    expect(inertia).toBeLessThan(20);

    // First 4 should be one cluster, last 4 another
    const label0 = km.labels[0];
    expect(km.labels[1]).toBe(label0);
    expect(km.labels[2]).toBe(label0);
    expect(km.labels[3]).toBe(label0);

    const label4 = km.labels[4];
    expect(label4).not.toBe(label0);
    expect(km.labels[5]).toBe(label4);
  });
});

// -----------------------------------------------------------
// RandomForestRegressor edge cases
// -----------------------------------------------------------
describe('RandomForestRegressor - edge cases', () => {
  it('throws when predicting before training', () => {
    const rf = new RandomForestRegressor();
    expect(() => rf.predict([[1, 2]])).toThrow('Model not trained');
  });

  it('getFeatureImportance counts splits across trees', () => {
    const X = [];
    const y = [];
    for (let i = 0; i < 30; i++) {
      const x1 = Math.random() * 10;
      const x2 = Math.random() * 10;
      X.push([x1, x2]);
      y.push(x1 * 2 + x2);
    }

    const rf = new RandomForestRegressor({
      nEstimators: 5,
      maxDepth: 4,
      bootstrap: true,
    });
    rf.fit(X, y);

    const importance = rf.getFeatureImportance(X);
    expect(importance).toHaveLength(2);
    // Importance should sum to 1 (normalized)
    const sum = importance[0] + importance[1];
    expect(sum).toBeCloseTo(1, 5);
  });

  it('supports maxFeatures as number', () => {
    const rf = new RandomForestRegressor({ maxFeatures: 1, nEstimators: 3, maxDepth: 3 });
    const X = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]];
    const y = [1, 2, 3, 4];

    rf.fit(X, y);
    const predictions = rf.predict(X);
    expect(predictions).toHaveLength(4);
  });

  it('supports maxFeatures log2', () => {
    const rf = new RandomForestRegressor({ maxFeatures: 'log2', nEstimators: 3, maxDepth: 3 });
    const X = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]];
    const y = [1, 2, 3, 4];

    rf.fit(X, y);
    const predictions = rf.predict(X);
    expect(predictions).toHaveLength(4);
  });

  it('disables bootstrap when set to false', () => {
    const rf = new RandomForestRegressor({ bootstrap: false, nEstimators: 3, maxDepth: 3 });
    const X = [[1, 2], [3, 4], [5, 6], [7, 8]];
    const y = [1, 2, 3, 4];

    rf.fit(X, y);
    const predictions = rf.predict(X);
    expect(predictions).toHaveLength(4);
  });

  it('calls onProgress callback during fit', () => {
    const rf = new RandomForestRegressor({ nEstimators: 5, maxDepth: 3 });
    const X = [[1], [2], [3], [4]];
    const y = [1, 2, 3, 4];

    const progressValues = [];
    rf.fit(X, y, (progress) => progressValues.push(progress));

    expect(progressValues).toHaveLength(5);
    expect(progressValues[0]).toBeCloseTo(0.2, 5);
    expect(progressValues[4]).toBeCloseTo(1.0, 5);
  });
});
