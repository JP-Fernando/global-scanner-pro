// =====================================================
// ANOMALY & PATTERN DETECTION WITH UNSUPERVISED LEARNING
// =====================================================

/**
 * Anomaly Detection System
 *
 * Detects unusual patterns and anomalies using:
 * - K-Means clustering to identify outliers
 * - Statistical z-score analysis
 * - Isolation score (simplified)
 * - Pattern recognition (correlations, divergences)
 *
 * Applications:
 * - Detection of assets with anomalous behaviour
 * - Identification of unique opportunities
 * - Risk alerts (extreme correlations)
 * - Market microstructure anomalies
 */

import { KMeans, calculateCorrelation as _calculateCorrelation, normalizeArray as _normalizeArray, standardizeArray as _standardizeArray } from './ml-engine.js';
import i18n from '../i18n/i18n.js';

// =====================================================
// CONFIGURATION
// =====================================================

export const ANOMALY_DETECTION_CONFIG = {
  // Z-score thresholds
  z_score_thresholds: {
    extreme: 3.0,    // >3 std devs
    high: 2.5,
    moderate: 2.0
  },

  // K-Means configuration
  kmeans: {
    k: 3,            // Number of clusters (normal, moderate, extreme)
    max_iterations: 100
  },

  // Pattern detection
  correlation_threshold: 0.9,  // For detecting highly correlated pairs
  divergence_threshold: 20,    // % for price-score divergence

  // Historical window
  lookback_days: 60
};

// =====================================================
// Z-SCORE ANOMALY DETECTION
// =====================================================

/**
 * Calculate z-scores for a feature across assets
 */
export function calculateZScores(values) {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);

  if (std === 0) return values.map(() => 0);

  return values.map(v => (v - mean) / std);
}

/**
 * Detect anomalies using z-scores
 */
export function detectZScoreAnomalies(assets, feature = 'quant_score', config = ANOMALY_DETECTION_CONFIG) {
  if (!assets || assets.length === 0) return [];

  const values = assets.map(asset => asset[feature] || 0);
  const zScores = calculateZScores(values);

  const anomalies = [];

  assets.forEach((asset, idx) => {
    const zScore = Math.abs(zScores[idx]);

    if (zScore >= config.z_score_thresholds.moderate) {
      const severity = zScore >= config.z_score_thresholds.extreme ? 'extreme' :
                       zScore >= config.z_score_thresholds.high ? 'high' : 'moderate';

      anomalies.push({
        type: 'z_score_anomaly',
        ticker: asset.ticker,
        name: asset.name || asset.ticker,
        feature,
        value: values[idx],
        zScore: zScores[idx],
        severity,
        direction: zScores[idx] > 0 ? 'above_mean' : 'below_mean',
        message: i18n.t('ml.anomalies.z_score_message', {
          ticker: asset.ticker,
          name: asset.name || asset.ticker,
          severity: i18n.t(`ml.anomalies.severity_${severity}`),
          feature,
          zscore: zScores[idx].toFixed(2)
        }),
        timestamp: Date.now()
      });
    }
  });

  return anomalies;
}

// =====================================================
// CLUSTERING-BASED ANOMALY DETECTION
// =====================================================

/**
 * Extract features for clustering
 */
export function extractClusteringFeatures(asset) {
  const { quant_score, volatility, volume, momentum, correlation } = asset;

  return [
    quant_score || 50,
    volatility || 20,
    volume || 100000,
    momentum || 0,
    correlation || 0.5
  ];
}

/**
 * Detect anomalies using K-Means clustering
 */
export function detectClusterAnomalies(assets, config = ANOMALY_DETECTION_CONFIG) {
  if (!assets || assets.length < config.kmeans.k * 2) {
    return { anomalies: [], clusters: null, error: 'Insufficient data' };
  }

  // Extract features
  const X = assets.map(asset => extractClusteringFeatures(asset));

  // Standardize features
  const X_standardized = [];

  for (let j = 0; j < X[0].length; j++) {
    const column = X.map(row => row[j]);
    const zScores = calculateZScores(column);

    zScores.forEach((z, i) => {
      if (!X_standardized[i]) X_standardized[i] = [];
      X_standardized[i][j] = z;
    });
  }

  // Apply K-Means
  const kmeans = new KMeans({
    k: config.kmeans.k,
    maxIterations: config.kmeans.max_iterations
  });

  kmeans.fit(X_standardized);

  // Calculate distances to centroids
  const distances = X_standardized.map((point, idx) => {
    const centroid = kmeans.centroids[kmeans.labels[idx]];
    return euclideanDistance(point, centroid);
  });


  const maxDistance = Math.max(...distances);

  if (maxDistance === 0) {
    return {
      anomalies: [],
      clusters: {
        labels: kmeans.labels,
        centroids: kmeans.centroids,
        inertia: kmeans.getInertia(X_standardized)
      }
    };
  }


  // Identify outliers (top 10% furthest from centroids)
  const sortedDistances = [...distances].sort((a, b) => b - a);
  const outlierThreshold = sortedDistances[Math.floor(distances.length * 0.1)];

  const anomalies = [];

  distances.forEach((dist, idx) => {
    if (dist > 0 && dist >= outlierThreshold) {
      const severity = dist >= sortedDistances[0] * 0.9 ? 'extreme' : 'high';
      anomalies.push({
        type: 'cluster_anomaly',
        ticker: assets[idx].ticker,
        name: assets[idx].name || assets[idx].ticker,
        distance: dist,
        cluster: kmeans.labels[idx],
        severity,
        message: i18n.t('ml.anomalies.cluster_message', {
          ticker: assets[idx].ticker,
          name: assets[idx].name || assets[idx].ticker,
          distance: dist.toFixed(2)
        }),
        timestamp: Date.now()
      });
    }
  });

  return {
    anomalies,
    clusters: {
      labels: kmeans.labels,
      centroids: kmeans.centroids,
      inertia: kmeans.getInertia(X_standardized)
    }
  };
}

/**
 * Euclidean distance
 */
function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

// =====================================================
// PATTERN DETECTION
// =====================================================

/**
 * Detect correlation anomalies (unusual correlations)
 */
export function detectCorrelationAnomalies(
  assets, correlationMatrix, config = ANOMALY_DETECTION_CONFIG
) {
  const anomalies = [];

  if (!correlationMatrix || correlationMatrix.length < 2) return anomalies;

  for (let i = 0; i < correlationMatrix.length; i++) {
    for (let j = i + 1; j < correlationMatrix[i].length; j++) {
      const corr = Math.abs(correlationMatrix[i][j]);

      if (corr >= config.correlation_threshold) {
        const severity = corr >= 0.95 ? 'extreme' : 'high';
        anomalies.push({
          type: 'correlation_anomaly',
          ticker1: assets[i]?.ticker || `Asset_${i}`,
          name1: assets[i]?.name || assets[i]?.ticker,
          ticker2: assets[j]?.ticker || `Asset_${j}`,
          name2: assets[j]?.name || assets[j]?.ticker,
          correlation: correlationMatrix[i][j],
          severity,
          message: i18n.t('ml.anomalies.correlation_message', {
            correlation: (corr * 100).toFixed(1),
            ticker1: assets[i]?.ticker,
            name1: assets[i]?.name || assets[i]?.ticker,
            ticker2: assets[j]?.ticker,
            name2: assets[j]?.name || assets[j]?.ticker
          }),
          timestamp: Date.now()
        });
      }
    }
  }

  return anomalies;
}

/**
 * Detect price-score divergence
 */
export function detectPriceScoreDivergence(assets, config = ANOMALY_DETECTION_CONFIG) {
  const anomalies = [];

  assets.forEach(asset => {
    const { ticker, quant_score, price_change_60d } = asset;

    if (!quant_score || price_change_60d === undefined) return;

    // Normalize scores to -100 to +100 range
    const normalizedScore = (quant_score - 50) * 2; // 0-100 -> -100 to +100

    // Check for divergence: high score but falling price, or low score but rising price
    const divergence = Math.abs(normalizedScore - price_change_60d);

    if (divergence >= config.divergence_threshold) {
      const type = normalizedScore > 0 && price_change_60d < 0 ? 'bullish_divergence' :
                   normalizedScore < 0 && price_change_60d > 0 ? 'bearish_divergence' : 'divergence';

      const severity = divergence >= config.divergence_threshold * 1.5 ? 'high' : 'moderate';
      anomalies.push({
        type: 'price_score_divergence',
        subtype: type,
        ticker,
        name: asset.name || ticker,
        quant_score,
        price_change_60d,
        divergence,
        severity,
        message: i18n.t('ml.anomalies.divergence_message', {
          ticker,
          name: asset.name || ticker,
          subtype: i18n.t(`ml.anomalies.subtype_${type}`),
          score: normalizedScore.toFixed(1),
          price_change: price_change_60d.toFixed(1)
        }),
        timestamp: Date.now()
      });
    }
  });

  return anomalies;
}

/**
 * Detect volume anomalies
 */
export function detectVolumeAnomalies(assets, config = ANOMALY_DETECTION_CONFIG) {
  const volumes = assets.map(asset => asset.volume || 0).filter(v => v > 0);

  if (volumes.length === 0) return [];

  const zScores = calculateZScores(volumes);
  const anomalies = [];

  assets.forEach((asset, idx) => {
    if (!asset.volume || asset.volume === 0) return;

    const zScore = Math.abs(zScores[idx]);

    if (zScore >= config.z_score_thresholds.high) {
      const severity = zScore >= config.z_score_thresholds.extreme ? 'extreme' : 'high';
      const direction = zScores[idx] > 0 ? 'spike' : 'drought';
      anomalies.push({
        type: 'volume_anomaly',
        ticker: asset.ticker,
        name: asset.name || asset.ticker,
        volume: asset.volume,
        zScore: zScores[idx],
        severity,
        direction,
        message: i18n.t('ml.anomalies.volume_message', {
          ticker: asset.ticker,
          name: asset.name || asset.ticker,
          direction: i18n.t(`ml.anomalies.direction_${direction}`),
          zscore: zScores[idx].toFixed(2)
        }),
        timestamp: Date.now()
      });
    }
  });

  return anomalies;
}

// =====================================================
// COMPREHENSIVE ANOMALY SCAN
// =====================================================

/**
 * Run comprehensive anomaly detection
 */
export function detectAllAnomalies(assets, correlationMatrix, config = ANOMALY_DETECTION_CONFIG) {
  const allAnomalies = [];

  // 1. Z-score anomalies (quant score)
  allAnomalies.push(...detectZScoreAnomalies(assets, 'quant_score', config));

  // 2. Z-score anomalies (volatility)
  allAnomalies.push(...detectZScoreAnomalies(assets, 'volatility', config));

  // 3. Cluster-based anomalies
  const { anomalies: clusterAnomalies } = detectClusterAnomalies(assets, config);
  allAnomalies.push(...clusterAnomalies);

  // 4. Correlation anomalies
  if (correlationMatrix) {
    allAnomalies.push(...detectCorrelationAnomalies(assets, correlationMatrix, config));
  }

  // 5. Price-score divergence
  allAnomalies.push(...detectPriceScoreDivergence(assets, config));

  // 6. Volume anomalies
  allAnomalies.push(...detectVolumeAnomalies(assets, config));

  // Sort by severity
  const severityOrder = { extreme: 3, high: 2, moderate: 1, low: 0 };
  allAnomalies.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));

  return allAnomalies;
}

/**
 * Get anomaly summary
 */
export function getAnomalySummary(anomalies) {
  const summary = {
    total: anomalies.length,
    by_type: {},
    by_severity: { extreme: 0, high: 0, moderate: 0, low: 0 },
    top_anomalies: anomalies.slice(0, 5)
  };

  anomalies.forEach(anomaly => {
    // Count by type
    summary.by_type[anomaly.type] = (summary.by_type[anomaly.type] || 0) + 1;

    // Count by severity
    summary.by_severity[anomaly.severity] = (summary.by_severity[anomaly.severity] || 0) + 1;
  });

  return summary;
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  ANOMALY_DETECTION_CONFIG,
  calculateZScores,
  detectZScoreAnomalies,
  detectClusterAnomalies,
  detectCorrelationAnomalies,
  detectPriceScoreDivergence,
  detectVolumeAnomalies,
  detectAllAnomalies,
  getAnomalySummary
};
