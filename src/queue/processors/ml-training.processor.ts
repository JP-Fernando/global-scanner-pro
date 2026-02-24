/**
 * ML Training Job Processor
 *
 * Re-trains factor-weighting models and regime-prediction classifiers
 * in a background worker to avoid blocking the HTTP event loop during
 * gradient descent and cross-validation loops.
 *
 * Expected job data shape:
 * ```json
 * {
 *   "task": "factorWeighting" | "regimePrediction" | "anomalyCalibration",
 *   "trainingData": [
 *     { "features": [...], "label": 1.0 },
 *     ...
 *   ],
 *   "hyperparams": {              // optional overrides
 *     "learningRate": 0.01,
 *     "epochs": 100,
 *     "nTrees": 50
 *   }
 * }
 * ```
 *
 * @module queue/processors/ml-training.processor
 */

import type { Job } from 'bullmq';
import { log } from '../../utils/logger.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MLTask = 'factorWeighting' | 'regimePrediction' | 'anomalyCalibration';

export interface TrainingSample {
  features: number[];
  label: number;
}

export interface MLJobData {
  task: MLTask;
  trainingData: TrainingSample[];
  hyperparams?: {
    learningRate?: number;
    epochs?: number;
    nTrees?: number;
    nClusters?: number;
  };
}

export interface MLTrainingResult {
  task: MLTask;
  modelType: string;
  trainingSamples: number;
  metrics: {
    trainAccuracy?: number;
    trainMSE?: number;
    featureImportance?: number[];
  };
  /** Serialised model state (weights / thresholds) for persistence */
  modelState: unknown;
  processingTimeMs: number;
}

// ── Factor weighting trainer (Linear Regression) ──────────────────────────────

function trainLinearRegression(
  samples: TrainingSample[],
  learningRate: number,
  epochs: number
): { weights: number[]; bias: number; mse: number } {
  if (samples.length === 0) return { weights: [], bias: 0, mse: 0 };

  const nFeatures = samples[0].features.length;
  let weights = new Array(nFeatures).fill(0.0);
  let bias = 0.0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const dw = new Array(nFeatures).fill(0.0);
    let db = 0.0;

    for (const { features, label } of samples) {
      const pred = features.reduce((s, f, i) => s + f * weights[i], bias);
      const err = pred - label;
      for (let i = 0; i < nFeatures; i++) dw[i] += err * features[i];
      db += err;
    }

    const n = samples.length;
    weights = weights.map((w, i) => w - learningRate * dw[i] / n);
    bias -= learningRate * db / n;
  }

  const mse = samples.reduce((s, { features, label }) => {
    const pred = features.reduce((sum, f, i) => sum + f * weights[i], bias);
    return s + (pred - label) ** 2;
  }, 0) / samples.length;

  return { weights, bias, mse };
}

// ── Regime prediction trainer (Logistic Regression binary classifier) ─────────

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function trainLogisticRegression(
  samples: TrainingSample[],
  learningRate: number,
  epochs: number
): { weights: number[]; bias: number; accuracy: number } {
  if (samples.length === 0) return { weights: [], bias: 0, accuracy: 0 };

  const nFeatures = samples[0].features.length;
  let weights = new Array(nFeatures).fill(0.0);
  let bias = 0.0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const dw = new Array(nFeatures).fill(0.0);
    let db = 0.0;

    for (const { features, label } of samples) {
      const logit = features.reduce((s, f, i) => s + f * weights[i], bias);
      const prob = sigmoid(logit);
      const err = prob - label;
      for (let i = 0; i < nFeatures; i++) dw[i] += err * features[i];
      db += err;
    }

    const n = samples.length;
    weights = weights.map((w, i) => w - learningRate * dw[i] / n);
    bias -= learningRate * db / n;
  }

  let correct = 0;
  for (const { features, label } of samples) {
    const logit = features.reduce((s, f, i) => s + f * weights[i], bias);
    const predicted = sigmoid(logit) >= 0.5 ? 1 : 0;
    if (predicted === label) correct++;
  }

  return { weights, bias, accuracy: correct / samples.length };
}

// ── Anomaly calibration (Z-score thresholds) ──────────────────────────────────

function calibrateAnomalyThresholds(
  samples: TrainingSample[]
): { featureMeans: number[]; featureStds: number[]; threshold: number } {
  if (samples.length === 0) return { featureMeans: [], featureStds: [], threshold: 2.5 };

  const nFeatures = samples[0].features.length;
  const means = new Array(nFeatures).fill(0);
  const stds = new Array(nFeatures).fill(1);

  for (let f = 0; f < nFeatures; f++) {
    const vals = samples.map(s => s.features[f]);
    means[f] = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - means[f]) ** 2, 0) / vals.length;
    stds[f] = Math.sqrt(variance) || 1;
  }

  // Dynamic threshold: 95th percentile of max Z-scores
  const zScores = samples.map(({ features }) =>
    Math.max(...features.map((f, i) => Math.abs((f - means[i]) / stds[i])))
  ).sort((a, b) => a - b);

  const p95idx = Math.floor(zScores.length * 0.95);
  const threshold = zScores[p95idx] ?? 2.5;

  return { featureMeans: means, featureStds: stds, threshold };
}

// ── Processor ─────────────────────────────────────────────────────────────────

export async function mlTrainingProcessor(job: Job<MLJobData>): Promise<MLTrainingResult> {
  const t0 = Date.now();
  const {
    task,
    trainingData,
    hyperparams: {
      learningRate = 0.01,
      epochs = 100,
      nTrees: _nTrees = 50,
      nClusters: _nClusters = 3
    } = {}
  } = job.data;

  log.info(`ML training started: ${task}`, { jobId: job.id, samples: trainingData.length });
  await job.updateProgress(10);

  let modelType: string;
  let modelState: unknown;
  let metrics: MLTrainingResult['metrics'] = {};

  switch (task) {
    case 'factorWeighting': {
      modelType = 'LinearRegression';
      await job.updateProgress(30);
      const result = trainLinearRegression(trainingData, learningRate, epochs);
      await job.updateProgress(80);
      modelState = result;
      metrics = { trainMSE: result.mse, featureImportance: result.weights.map(Math.abs) };
      break;
    }

    case 'regimePrediction': {
      modelType = 'LogisticRegression';
      await job.updateProgress(30);
      const result = trainLogisticRegression(trainingData, learningRate, epochs);
      await job.updateProgress(80);
      modelState = result;
      metrics = { trainAccuracy: result.accuracy };
      break;
    }

    case 'anomalyCalibration': {
      modelType = 'ZScoreCalibration';
      await job.updateProgress(30);
      const result = calibrateAnomalyThresholds(trainingData);
      await job.updateProgress(80);
      modelState = result;
      metrics = {};
      break;
    }

    default: {
      throw new Error(`Unknown ML task: ${task}`);
    }
  }

  await job.updateProgress(100);

  const processingTimeMs = Date.now() - t0;
  log.info(`ML training completed: ${task} (${processingTimeMs}ms)`, { jobId: job.id });

  return {
    task,
    modelType,
    trainingSamples: trainingData.length,
    metrics,
    modelState,
    processingTimeMs
  };
}
