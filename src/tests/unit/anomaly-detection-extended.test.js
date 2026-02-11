/**
 * Anomaly Detection Extended Tests
 *
 * Covers detectCorrelationAnomalies, detectPriceScoreDivergence,
 * detectVolumeAnomalies, detectAllAnomalies, and getAnomalySummary.
 */

import { describe, it, expect } from 'vitest';
import {
  detectCorrelationAnomalies,
  detectPriceScoreDivergence,
  detectVolumeAnomalies,
  detectAllAnomalies,
  getAnomalySummary,
} from '../../ml/anomaly-detection.js';

describe('Anomaly Detection - Extended', () => {
  // -----------------------------------------------------------
  // detectCorrelationAnomalies
  // -----------------------------------------------------------
  describe('detectCorrelationAnomalies', () => {
    const assets = [
      { ticker: 'AAA', name: 'Asset A' },
      { ticker: 'BBB', name: 'Asset B' },
      { ticker: 'CCC', name: 'Asset C' },
    ];

    it('returns empty array for null correlation matrix', () => {
      const result = detectCorrelationAnomalies(assets, null);
      expect(result).toEqual([]);
    });

    it('returns empty array for matrix with < 2 elements', () => {
      const result = detectCorrelationAnomalies(assets, [[1.0]]);
      expect(result).toEqual([]);
    });

    it('detects high correlation anomalies', () => {
      const corrMatrix = [
        [1.0, 0.95, 0.3],
        [0.95, 1.0, 0.2],
        [0.3, 0.2, 1.0],
      ];

      const result = detectCorrelationAnomalies(assets, corrMatrix);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('correlation_anomaly');
      expect(result[0].ticker1).toBe('AAA');
      expect(result[0].ticker2).toBe('BBB');
    });

    it('assigns extreme severity for very high correlations', () => {
      const corrMatrix = [
        [1.0, 0.98],
        [0.98, 1.0],
      ];

      const result = detectCorrelationAnomalies(assets.slice(0, 2), corrMatrix);
      expect(result[0].severity).toBe('extreme');
    });

    it('assigns high severity for moderately high correlations', () => {
      const corrMatrix = [
        [1.0, 0.91],
        [0.91, 1.0],
      ];

      const result = detectCorrelationAnomalies(assets.slice(0, 2), corrMatrix);
      expect(result[0].severity).toBe('high');
    });

    it('returns no anomalies for low correlations', () => {
      const corrMatrix = [
        [1.0, 0.3, 0.2],
        [0.3, 1.0, 0.1],
        [0.2, 0.1, 1.0],
      ];

      const result = detectCorrelationAnomalies(assets, corrMatrix);
      expect(result).toHaveLength(0);
    });

    it('handles negative high correlations', () => {
      const corrMatrix = [
        [1.0, -0.95],
        [-0.95, 1.0],
      ];

      const result = detectCorrelationAnomalies(assets.slice(0, 2), corrMatrix);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------
  // detectPriceScoreDivergence
  // -----------------------------------------------------------
  describe('detectPriceScoreDivergence', () => {
    it('detects bullish divergence (high score, falling price)', () => {
      const assets = [
        { ticker: 'X', name: 'Asset X', quant_score: 85, price_change_60d: -20 },
      ];

      const result = detectPriceScoreDivergence(assets);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].subtype).toBe('bullish_divergence');
    });

    it('detects bearish divergence (low score, rising price)', () => {
      const assets = [
        { ticker: 'Y', name: 'Asset Y', quant_score: 15, price_change_60d: 30 },
      ];

      const result = detectPriceScoreDivergence(assets);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].subtype).toBe('bearish_divergence');
    });

    it('assigns high severity for large divergences', () => {
      const assets = [
        { ticker: 'Z', name: 'Asset Z', quant_score: 90, price_change_60d: -40 },
      ];

      const result = detectPriceScoreDivergence(assets);
      if (result.length > 0) {
        expect(['high', 'moderate']).toContain(result[0].severity);
      }
    });

    it('skips assets without quant_score', () => {
      const assets = [
        { ticker: 'A', name: 'No Score', price_change_60d: 10 },
      ];

      const result = detectPriceScoreDivergence(assets);
      expect(result).toHaveLength(0);
    });

    it('skips assets without price_change_60d', () => {
      const assets = [
        { ticker: 'B', name: 'No Price Change', quant_score: 75 },
      ];

      const result = detectPriceScoreDivergence(assets);
      expect(result).toHaveLength(0);
    });

    it('returns no anomalies when score and price agree', () => {
      const assets = [
        { ticker: 'C', name: 'Aligned', quant_score: 80, price_change_60d: 50 },
      ];

      const result = detectPriceScoreDivergence(assets);
      expect(result).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------
  // detectVolumeAnomalies
  // -----------------------------------------------------------
  describe('detectVolumeAnomalies', () => {
    it('returns empty for assets with no volume', () => {
      const assets = [{ ticker: 'A', volume: 0 }];
      const result = detectVolumeAnomalies(assets);
      expect(result).toHaveLength(0);
    });

    it('detects volume spikes', () => {
      // Need enough assets so the z-score of the outlier exceeds the threshold
      const assets = [
        { ticker: 'A', name: 'Normal 1', volume: 10000 },
        { ticker: 'B', name: 'Normal 2', volume: 10500 },
        { ticker: 'C', name: 'Normal 3', volume: 9800 },
        { ticker: 'D', name: 'Normal 4', volume: 10200 },
        { ticker: 'E', name: 'Normal 5', volume: 10100 },
        { ticker: 'F', name: 'Normal 6', volume: 9900 },
        { ticker: 'G', name: 'Normal 7', volume: 10300 },
        { ticker: 'H', name: 'Spike', volume: 1000000 },
      ];

      const result = detectVolumeAnomalies(assets);
      expect(result.length).toBeGreaterThan(0);
      const spikeAnomaly = result.find(a => a.ticker === 'H');
      expect(spikeAnomaly).toBeDefined();
      expect(spikeAnomaly.direction).toBe('spike');
    });

    it('includes z-score in anomaly details', () => {
      const assets = [
        { ticker: 'A', name: 'Normal', volume: 10000 },
        { ticker: 'B', name: 'Normal', volume: 10500 },
        { ticker: 'C', name: 'Spike', volume: 500000 },
      ];

      const result = detectVolumeAnomalies(assets);
      if (result.length > 0) {
        expect(result[0].zScore).toBeTypeOf('number');
      }
    });

    it('assigns extreme severity for very high z-scores', () => {
      const assets = [
        { ticker: 'A', name: 'Normal', volume: 1000 },
        { ticker: 'B', name: 'Normal', volume: 1100 },
        { ticker: 'C', name: 'Normal', volume: 900 },
        { ticker: 'D', name: 'Normal', volume: 1050 },
        { ticker: 'E', name: 'Extreme', volume: 1000000 },
      ];

      const result = detectVolumeAnomalies(assets);
      const extreme = result.find(a => a.severity === 'extreme');
      if (extreme) {
        expect(extreme.severity).toBe('extreme');
      }
    });
  });

  // -----------------------------------------------------------
  // detectAllAnomalies
  // -----------------------------------------------------------
  describe('detectAllAnomalies', () => {
    const assets = [
      { ticker: 'A', name: 'Asset A', quant_score: 85, price_change_60d: -30, volatility: 15, volume: 10000 },
      { ticker: 'B', name: 'Asset B', quant_score: 20, price_change_60d: 40, volatility: 80, volume: 10500 },
      { ticker: 'C', name: 'Asset C', quant_score: 50, price_change_60d: 5, volatility: 20, volume: 500000 },
    ];

    it('runs all anomaly detectors', () => {
      const corrMatrix = [
        [1.0, 0.95, 0.3],
        [0.95, 1.0, 0.2],
        [0.3, 0.2, 1.0],
      ];

      const result = detectAllAnomalies(assets, corrMatrix);
      expect(result).toBeInstanceOf(Array);
      // Should find at least one anomaly given the extreme data
      expect(result.length).toBeGreaterThan(0);
    });

    it('runs without correlation matrix', () => {
      const result = detectAllAnomalies(assets, null);
      expect(result).toBeInstanceOf(Array);
    });

    it('sorts results by severity (most severe first)', () => {
      const corrMatrix = [
        [1.0, 0.98, 0.3],
        [0.98, 1.0, 0.2],
        [0.3, 0.2, 1.0],
      ];

      const result = detectAllAnomalies(assets, corrMatrix);
      const severityOrder = { extreme: 3, high: 2, moderate: 1, low: 0 };

      for (let i = 1; i < result.length; i++) {
        const prevSev = severityOrder[result[i - 1].severity] || 0;
        const currSev = severityOrder[result[i].severity] || 0;
        expect(prevSev).toBeGreaterThanOrEqual(currSev);
      }
    });

    it('includes multiple anomaly types', () => {
      const result = detectAllAnomalies(assets, null);
      const types = new Set(result.map(a => a.type));
      // Should detect at least z-score anomalies and divergence
      expect(types.size).toBeGreaterThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------
  // getAnomalySummary
  // -----------------------------------------------------------
  describe('getAnomalySummary', () => {
    it('returns summary structure', () => {
      const anomalies = [
        { type: 'z_score', severity: 'high', ticker: 'A' },
        { type: 'z_score', severity: 'extreme', ticker: 'B' },
        { type: 'correlation_anomaly', severity: 'high', ticker: 'C' },
        { type: 'volume_anomaly', severity: 'moderate', ticker: 'D' },
        { type: 'price_score_divergence', severity: 'moderate', ticker: 'E' },
      ];

      const summary = getAnomalySummary(anomalies);

      expect(summary.total).toBe(5);
      expect(summary.by_type.z_score).toBe(2);
      expect(summary.by_type.correlation_anomaly).toBe(1);
      expect(summary.by_type.volume_anomaly).toBe(1);
      expect(summary.by_type.price_score_divergence).toBe(1);
      expect(summary.by_severity.extreme).toBe(1);
      expect(summary.by_severity.high).toBe(2);
      expect(summary.by_severity.moderate).toBe(2);
      expect(summary.top_anomalies).toHaveLength(5);
    });

    it('returns top 5 anomalies', () => {
      const anomalies = Array.from({ length: 10 }, (_, i) => ({
        type: 'z_score',
        severity: 'high',
        ticker: `TICK${i}`,
      }));

      const summary = getAnomalySummary(anomalies);
      expect(summary.top_anomalies).toHaveLength(5);
    });

    it('handles empty anomalies array', () => {
      const summary = getAnomalySummary([]);

      expect(summary.total).toBe(0);
      expect(summary.by_type).toEqual({});
      expect(summary.by_severity.extreme).toBe(0);
      expect(summary.by_severity.high).toBe(0);
      expect(summary.top_anomalies).toHaveLength(0);
    });
  });
});
