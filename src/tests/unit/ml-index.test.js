/**
 * ML Index Module Tests
 *
 * Covers the default export lazy imports in ml/index.js (lines 92-97)
 * and verifies that named re-exports work correctly.
 */

import { describe, it, expect } from 'vitest';

// Test named re-exports through the index module
import {
  LinearRegression,
  KMeans,
  normalizeArray,
  FACTOR_WEIGHTS_CONFIG,
  ADAPTIVE_SCORING_CONFIG,
  REGIME_PREDICTION_CONFIG,
  RECOMMENDATION_TYPES,
  ANOMALY_DETECTION_CONFIG,
} from '../../ml/index.js';

// Test default export with lazy imports
import mlModule from '../../ml/index.js';

describe('ML Index Module - named re-exports', () => {
  it('re-exports ML engine classes', () => {
    expect(LinearRegression).toBeDefined();
    expect(KMeans).toBeDefined();
    expect(normalizeArray).toBeTypeOf('function');
  });

  it('re-exports config constants from all submodules', () => {
    expect(FACTOR_WEIGHTS_CONFIG).toBeDefined();
    expect(ADAPTIVE_SCORING_CONFIG).toBeDefined();
    expect(REGIME_PREDICTION_CONFIG).toBeDefined();
    expect(RECOMMENDATION_TYPES).toBeDefined();
    expect(ANOMALY_DETECTION_CONFIG).toBeDefined();
  });
});

describe('ML Index Module - default export lazy imports', () => {
  it('exposes mlEngine as a lazy import function', async () => {
    expect(mlModule.mlEngine).toBeTypeOf('function');
    const mod = await mlModule.mlEngine();
    expect(mod.LinearRegression).toBeDefined();
  });

  it('exposes factorWeighting as a lazy import function', async () => {
    expect(mlModule.factorWeighting).toBeTypeOf('function');
    const mod = await mlModule.factorWeighting();
    expect(mod.extractFactorFeatures).toBeTypeOf('function');
  });

  it('exposes adaptiveScoring as a lazy import function', async () => {
    expect(mlModule.adaptiveScoring).toBeTypeOf('function');
    const mod = await mlModule.adaptiveScoring();
    expect(mod.PerformanceTracker).toBeDefined();
  });

  it('exposes regimePrediction as a lazy import function', async () => {
    expect(mlModule.regimePrediction).toBeTypeOf('function');
    const mod = await mlModule.regimePrediction();
    expect(mod.trainRegimeClassifier).toBeTypeOf('function');
  });

  it('exposes recommendationEngine as a lazy import function', async () => {
    expect(mlModule.recommendationEngine).toBeTypeOf('function');
    const mod = await mlModule.recommendationEngine();
    expect(mod.generateRecommendations).toBeTypeOf('function');
  });

  it('exposes anomalyDetection as a lazy import function', async () => {
    expect(mlModule.anomalyDetection).toBeTypeOf('function');
    const mod = await mlModule.anomalyDetection();
    expect(mod.detectAllAnomalies).toBeTypeOf('function');
  });
});
