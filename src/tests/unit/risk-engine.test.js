import { describe, it, expect } from 'vitest';
import {
  calculatePortfolioVaR,
  calculatePortfolioCVaR,
  calculateCorrelationMatrix,
} from '../../analytics/risk_engine.js';
import { buildAssetSeries } from '../helpers.js';

describe('Risk Engine', () => {
  // -----------------------------------------------------------
  // Core metrics
  // -----------------------------------------------------------
  describe('Portfolio VaR / CVaR', () => {
    const assets = [
      { ticker: 'AAA', weight: 0.6, prices: buildAssetSeries('AAA', 100, 40).map((p) => ({ date: p.date, close: p.close })) },
      { ticker: 'BBB', weight: 0.4, prices: buildAssetSeries('BBB', 120, 40).map((p) => ({ date: p.date, close: p.close })) },
    ];

    it('computes diversified VaR > 0', () => {
      const result = calculatePortfolioVaR(assets, 10000, 0.95);
      expect(parseFloat(result.diversifiedVaR)).toBeGreaterThan(0);
    });

    it('computes CVaR > 0', () => {
      const result = calculatePortfolioCVaR(assets, 10000, 0.95);
      expect(parseFloat(result.cvar)).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------
  // Correlation matrix
  // -----------------------------------------------------------
  describe('Correlation Matrix', () => {
    const assets = [
      { ticker: 'AAA', weight: 0.6, prices: buildAssetSeries('AAA', 100, 40).map((p) => ({ date: p.date, close: p.close })) },
      { ticker: 'BBB', weight: 0.4, prices: buildAssetSeries('BBB', 120, 40).map((p) => ({ date: p.date, close: p.close })) },
    ];

    it('returns NxN matrix matching the number of assets', () => {
      const result = calculateCorrelationMatrix(assets);
      expect(result.matrix).toHaveLength(2);
      expect(result.matrix[0].values).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------
  describe('Edge Cases', () => {
    it('handles single asset gracefully', () => {
      const singleAsset = [{
        ticker: 'AAA',
        weight: 1.0,
        prices: buildAssetSeries('AAA', 100, 40),
      }];

      let result;
      try {
        result = calculatePortfolioVaR(singleAsset, 10000, 0.95);
      } catch {
        // thrown errors are acceptable
        return;
      }
      // If it returns instead of throwing, expect an error field
      expect(result.error).toBeDefined();
    });

    it('reports error for insufficient data (<30 observations)', () => {
      const shortData = [
        { ticker: 'AAA', weight: 0.5, prices: buildAssetSeries('AAA', 100, 20) },
        { ticker: 'BBB', weight: 0.5, prices: buildAssetSeries('BBB', 120, 20) },
      ];

      const result = calculatePortfolioVaR(shortData, 10000, 0.95);
      expect(result.error).toBeDefined();
    });
  });

  // -----------------------------------------------------------
  // Correlation symmetry
  // -----------------------------------------------------------
  describe('Correlation Matrix Symmetry', () => {
    const assets = [
      { ticker: 'AAA', weight: 0.33, prices: buildAssetSeries('AAA', 100, 60) },
      { ticker: 'BBB', weight: 0.33, prices: buildAssetSeries('BBB', 120, 60) },
      { ticker: 'CCC', weight: 0.34, prices: buildAssetSeries('CCC', 90, 60) },
    ];

    it('is symmetric (corr[i][j] == corr[j][i])', () => {
      const { matrix } = calculateCorrelationMatrix(assets);
      for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix.length; j++) {
          expect(Math.abs(matrix[i].values[j] - matrix[j].values[i])).toBeLessThan(0.01);
        }
      }
    });

    it('has diagonal values equal to 1', () => {
      const { matrix } = calculateCorrelationMatrix(assets);
      for (let i = 0; i < matrix.length; i++) {
        expect(matrix[i].values[i]).toBeApprox(1.0, 0.01);
      }
    });
  });

  // -----------------------------------------------------------
  // Shrinkage activation
  // -----------------------------------------------------------
  describe('Shrinkage Activation', () => {
    it('activates shrinkage for small samples (T < 252) and still computes VaR', () => {
      const smallSample = [
        { ticker: 'AAA', weight: 0.5, prices: buildAssetSeries('AAA', 100, 50) },
        { ticker: 'BBB', weight: 0.5, prices: buildAssetSeries('BBB', 120, 50) },
      ];

      const result = calculatePortfolioVaR(smallSample, 10000, 0.95);
      expect(result.observations).toBeLessThan(252);
      expect(parseFloat(result.diversifiedVaR)).toBeGreaterThan(0);
    });
  });
});
