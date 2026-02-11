import { describe, it, expect } from 'vitest';
import {
  REGIME_PREDICTION_CONFIG,
  extractRegimeFeatures,
  RandomForestClassifier,
  prepareRegimeTrainingData,
  trainRegimeClassifier,
  predictRegime,
} from '../../ml/regime-prediction.js';

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function buildBenchmarkPrices(days, startPrice = 100, trend = 0.0005) {
  const prices = [];
  let price = startPrice;
  for (let i = 0; i < days; i++) {
    price *= 1 + trend + (Math.random() - 0.5) * 0.01;
    prices.push(price);
  }
  return prices;
}

function buildMarketData(overrides = {}) {
  const benchmarkPrices = buildBenchmarkPrices(250);
  return {
    benchmarkPrices,
    assetPrices: Array.from({ length: 20 }, () => buildBenchmarkPrices(50)),
    volumes: Array.from({ length: 250 }, () => 1000000 + Math.random() * 500000),
    correlations: [
      [1, 0.5, 0.3],
      [0.5, 1, 0.4],
      [0.3, 0.4, 1],
    ],
    ...overrides,
  };
}

function buildTrainingData(count, label) {
  const samples = [];
  for (let i = 0; i < count; i++) {
    const isRiskOn = label === 'risk_on' || label === 2;
    const isRiskOff = label === 'risk_off' || label === 0;

    const trendBias = isRiskOn ? 0.002 : isRiskOff ? -0.002 : 0;
    const benchmarkPrices = buildBenchmarkPrices(250, 100, trendBias);
    const volMult = isRiskOff ? 2 : 1;

    samples.push({
      marketData: {
        benchmarkPrices,
        assetPrices: Array.from({ length: 20 }, () =>
          buildBenchmarkPrices(50, 100, trendBias),
        ),
        volumes: Array.from({ length: 250 }, () =>
          1000000 * volMult + Math.random() * 500000,
        ),
        correlations: [
          [1, 0.5, 0.3],
          [0.5, 1, 0.4],
          [0.3, 0.4, 1],
        ],
      },
      actualRegime: typeof label === 'number'
        ? REGIME_PREDICTION_CONFIG.regimes[label]
        : label,
    });
  }
  return samples;
}

// -----------------------------------------------------------
// extractRegimeFeatures
// -----------------------------------------------------------
describe('extractRegimeFeatures', () => {
  it('returns null for insufficient benchmark data (< 200)', () => {
    const result = extractRegimeFeatures({
      benchmarkPrices: Array(100).fill(100),
    });
    expect(result).toBeNull();
  });

  it('extracts all expected features for sufficient data', () => {
    const features = extractRegimeFeatures(buildMarketData());

    expect(features).toBeDefined();
    expect(features.trend_short).toBeDefined();
    expect(features.trend_medium).toBeDefined();
    expect(features.trend_long).toBeDefined();
    expect(features.ema_alignment).toBeDefined();
    expect(features.vol_20).toBeDefined();
    expect(features.vol_60).toBeDefined();
    expect(features.vol_ratio).toBeDefined();
    expect(features.roc_20).toBeDefined();
    expect(features.roc_60).toBeDefined();
    expect(features.breadth_score).toBeDefined();
    expect(features.avg_correlation).toBeDefined();
    expect(features.volume_trend).toBeDefined();
  });

  it('ema_alignment is 1 when EMAs are bullish aligned', () => {
    // Create strongly trending data
    const prices = [];
    let price = 50;
    for (let i = 0; i < 300; i++) {
      price *= 1.003; // steady uptrend
      prices.push(price);
    }

    const features = extractRegimeFeatures({
      benchmarkPrices: prices,
      assetPrices: [],
      correlations: [],
      volumes: [],
    });

    expect(features.ema_alignment).toBe(1);
  });

  it('ema_alignment is -1 when EMAs are bearish aligned', () => {
    const prices = [];
    let price = 200;
    for (let i = 0; i < 300; i++) {
      price *= 0.997; // steady downtrend
      prices.push(price);
    }

    const features = extractRegimeFeatures({
      benchmarkPrices: prices,
      assetPrices: [],
      correlations: [],
      volumes: [],
    });

    expect(features.ema_alignment).toBe(-1);
  });

  it('uses default breadth_score 0.5 when no asset prices', () => {
    const features = extractRegimeFeatures(buildMarketData({ assetPrices: [] }));
    expect(features.breadth_score).toBe(0.5);
  });

  it('uses default avg_correlation 0.5 when no correlations', () => {
    const features = extractRegimeFeatures(buildMarketData({ correlations: [] }));
    expect(features.avg_correlation).toBe(0.5);
  });

  it('uses default volume_trend 1.0 when insufficient volumes', () => {
    const features = extractRegimeFeatures(buildMarketData({ volumes: Array(10).fill(1000) }));
    expect(features.volume_trend).toBe(1.0);
  });
});

// -----------------------------------------------------------
// RandomForestClassifier
// -----------------------------------------------------------
describe('RandomForestClassifier', () => {
  it('creates classifier with correct default options', () => {
    const clf = new RandomForestClassifier();
    expect(clf.nEstimators).toBe(30);
    expect(clf.maxDepth).toBe(6);
    expect(clf.numClasses).toBe(3);
    expect(clf.trees).toHaveLength(0);
  });

  it('creates classifier with custom options', () => {
    const clf = new RandomForestClassifier({
      nEstimators: 10,
      maxDepth: 4,
      numClasses: 5,
    });
    expect(clf.nEstimators).toBe(10);
    expect(clf.maxDepth).toBe(4);
    expect(clf.numClasses).toBe(5);
  });

  it('fit trains the specified number of trees', () => {
    const clf = new RandomForestClassifier({ nEstimators: 5, maxDepth: 3 });
    const X = Array.from({ length: 30 }, () => [Math.random(), Math.random()]);
    const y = X.map((row) => (row[0] > 0.5 ? 1 : 0));

    clf.fit(X, y);
    expect(clf.trees).toHaveLength(5);
  });

  it('predict returns class labels', () => {
    const clf = new RandomForestClassifier({ nEstimators: 10, maxDepth: 4 });
    const X = Array.from({ length: 50 }, () => [Math.random(), Math.random()]);
    const y = X.map((row) => (row[0] > 0.5 ? 2 : 0));

    clf.fit(X, y);
    const predictions = clf.predict(X);

    expect(predictions).toHaveLength(50);
    predictions.forEach((p) => {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(3);
    });
  });

  it('predictProba returns probabilities that sum to 1', () => {
    const clf = new RandomForestClassifier({ nEstimators: 10, maxDepth: 4 });
    const X = Array.from({ length: 30 }, () => [Math.random(), Math.random()]);
    const y = X.map((row) => (row[0] > 0.5 ? 2 : 0));

    clf.fit(X, y);
    const probas = clf.predictProba(X);

    probas.forEach((probs) => {
      expect(probs).toHaveLength(3);
      const sum = probs.reduce((s, p) => s + p, 0);
      expect(sum).toBeCloseTo(1.0, 5);
      probs.forEach((p) => {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      });
    });
  });

  it('predictProba throws for untrained model', () => {
    const clf = new RandomForestClassifier();
    expect(() => clf.predictProba([[1, 2]])).toThrow('not trained');
  });

  it('_bootstrapSample returns same-size sample', () => {
    const clf = new RandomForestClassifier();
    const X = [[1], [2], [3], [4], [5]];
    const y = [0, 1, 0, 1, 0];

    const { X: Xs, y: ys } = clf._bootstrapSample(X, y);
    expect(Xs).toHaveLength(5);
    expect(ys).toHaveLength(5);
  });
});

// -----------------------------------------------------------
// prepareRegimeTrainingData
// -----------------------------------------------------------
describe('prepareRegimeTrainingData', () => {
  it('returns empty arrays for insufficient data', () => {
    const { X, y } = prepareRegimeTrainingData([
      {
        marketData: { benchmarkPrices: Array(50).fill(100) },
        actualRegime: 'neutral',
      },
    ]);
    expect(X).toHaveLength(0);
    expect(y).toHaveLength(0);
  });

  it('prepares features and labels from historical data', () => {
    const samples = [
      ...buildTrainingData(5, 'risk_on'),
      ...buildTrainingData(5, 'neutral'),
      ...buildTrainingData(5, 'risk_off'),
    ];

    const { X, y } = prepareRegimeTrainingData(samples);

    expect(X.length).toBeGreaterThan(0);
    expect(y.length).toBe(X.length);
    expect(X[0]).toHaveLength(12);

    // Check labels
    expect(y).toContain(0); // risk_off
    expect(y).toContain(1); // neutral
    expect(y).toContain(2); // risk_on
  });
});

// -----------------------------------------------------------
// trainRegimeClassifier
// -----------------------------------------------------------
describe('trainRegimeClassifier', () => {
  it('returns failure for insufficient samples (< 30)', () => {
    const X = Array.from({ length: 10 }, () => Array(12).fill(0));
    const y = Array(10).fill(1);

    const result = trainRegimeClassifier(X, y);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient');
    expect(result.model).toBeNull();
  });

  it('trains successfully with sufficient data', () => {
    const samples = [
      ...buildTrainingData(15, 'risk_on'),
      ...buildTrainingData(15, 'neutral'),
      ...buildTrainingData(15, 'risk_off'),
    ];

    const { X, y } = prepareRegimeTrainingData(samples);

    if (X.length >= 30) {
      const result = trainRegimeClassifier(X, y);
      expect(result.success).toBe(true);
      expect(result.model).toBeDefined();
      expect(result.accuracy).toBeGreaterThan(0);
      expect(result.trainingSize).toBe(X.length);
      expect(result.featureNames).toHaveLength(12);
    }
  });
});

// -----------------------------------------------------------
// predictRegime
// -----------------------------------------------------------
describe('predictRegime', () => {
  it('returns neutral with error for insufficient data', () => {
    const model = new RandomForestClassifier({ nEstimators: 5, maxDepth: 3 });
    // Train with dummy data
    const X = Array.from({ length: 30 }, () => Array(12).fill(Math.random()));
    const y = X.map(() => Math.floor(Math.random() * 3));
    model.fit(X, y);

    const result = predictRegime(
      { benchmarkPrices: Array(50).fill(100) },
      model,
    );

    expect(result.regime).toBe('neutral');
    expect(result.confidence).toBe(0);
    expect(result.error).toContain('Insufficient');
  });

  it('returns valid prediction with sufficient data', () => {
    // Train a model
    const samples = [
      ...buildTrainingData(15, 'risk_on'),
      ...buildTrainingData(15, 'neutral'),
      ...buildTrainingData(15, 'risk_off'),
    ];

    const { X, y } = prepareRegimeTrainingData(samples);

    if (X.length >= 30) {
      const trainResult = trainRegimeClassifier(X, y);
      if (trainResult.success) {
        const marketData = buildMarketData();
        const prediction = predictRegime(marketData, trainResult.model);

        expect(prediction.regime).toBeDefined();
        expect(['risk_off', 'neutral', 'risk_on']).toContain(prediction.regime);
        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
        expect(prediction.probabilities).toBeDefined();
        expect(prediction.probabilities.risk_off).toBeDefined();
        expect(prediction.probabilities.neutral).toBeDefined();
        expect(prediction.probabilities.risk_on).toBeDefined();

        // Probabilities should sum to ~1
        const probSum =
          prediction.probabilities.risk_off +
          prediction.probabilities.neutral +
          prediction.probabilities.risk_on;
        expect(probSum).toBeCloseTo(1.0, 2);

        expect(prediction.features).toBeDefined();
        expect(prediction.timestamp).toBeDefined();
      }
    }
  });
});

// -----------------------------------------------------------
// REGIME_PREDICTION_CONFIG
// -----------------------------------------------------------
describe('REGIME_PREDICTION_CONFIG', () => {
  it('defines 3 regime labels', () => {
    expect(Object.keys(REGIME_PREDICTION_CONFIG.regimes)).toHaveLength(3);
    expect(REGIME_PREDICTION_CONFIG.regimes[0]).toBe('risk_off');
    expect(REGIME_PREDICTION_CONFIG.regimes[1]).toBe('neutral');
    expect(REGIME_PREDICTION_CONFIG.regimes[2]).toBe('risk_on');
  });

  it('has model configuration', () => {
    expect(REGIME_PREDICTION_CONFIG.model.n_estimators).toBeDefined();
    expect(REGIME_PREDICTION_CONFIG.model.max_depth).toBeDefined();
  });

  it('has confidence thresholds', () => {
    expect(REGIME_PREDICTION_CONFIG.confidence_thresholds.high).toBe(0.7);
    expect(REGIME_PREDICTION_CONFIG.confidence_thresholds.medium).toBe(0.5);
    expect(REGIME_PREDICTION_CONFIG.confidence_thresholds.low).toBe(0.3);
  });
});
