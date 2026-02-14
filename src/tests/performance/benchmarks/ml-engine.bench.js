/**
 * Benchmark: Machine Learning Engine
 *
 * Measures training and prediction throughput for
 * LinearRegression, DecisionTree, RandomForest, and KMeans.
 */
import { bench, describe } from 'vitest';
import {
  LinearRegression, DecisionTree,
  RandomForestRegressor, KMeans,
  normalizeArray, standardizeArray, calculateCorrelation,
} from '../../../ml/ml-engine.js';

const N = 200;
const FEATURES = 5;
const X = Array.from({ length: N }, (_, row) =>
  Array.from({ length: FEATURES }, (__, col) =>
    Math.sin(row * 0.1 + col) * 50 + 50
  )
);
const y = X.map((row) =>
  row.reduce((s, v, i) => s + v * (i + 1), 0) + Math.sin(row[0]) * 10
);
const arr1k = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01) * 50 + 50);

describe('ML Utilities', () => {
  bench('normalizeArray(1000)', () => { normalizeArray(arr1k); });
  bench('standardizeArray(1000)', () => { standardizeArray(arr1k); });
  bench('calculateCorrelation(1000)', () => {
    calculateCorrelation(arr1k, arr1k.map((v) => v * 0.9 + Math.sin(v)));
  });
});

describe('ML Model Training', () => {
  bench('LinearRegression.fit(200x5)', () => {
    const lr = new LinearRegression();
    lr.fit(X, y);
  });

  bench('DecisionTree.fit(200x5, depth=5)', () => {
    const dt = new DecisionTree({ maxDepth: 5 });
    dt.fit(X, y);
  });

  bench('RandomForest.fit(200x5, 20 trees)', () => {
    const rf = new RandomForestRegressor({ nEstimators: 20, maxDepth: 5 });
    rf.fit(X, y);
  });

  bench('KMeans.fit(200x5, k=3)', () => {
    const km = new KMeans({ k: 3, maxIterations: 50 });
    km.fit(X);
  });
});

describe('ML Model Prediction', () => {
  const lr = new LinearRegression();
  lr.fit(X, y);

  const rf = new RandomForestRegressor({ nEstimators: 20, maxDepth: 5 });
  rf.fit(X, y);

  bench('LinearRegression.predict(200)', () => { lr.predict(X); });
  bench('RandomForest.predict(200)', () => { rf.predict(X); });
});
