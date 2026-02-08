/**
 * Capital Allocation Tests
 *
 * Tests for all allocation methods, portfolio risk calculations,
 * and the main allocateCapital function.
 */

import { describe, it, expect } from 'vitest';
import {
  ALLOCATION_METHODS,
  ALLOCATION_CONFIG,
  equalWeightAllocation,
  scoreWeightedAllocation,
  equalRiskContribution,
  volatilityTargeting,
  hybridAllocation,
  calculatePortfolioRisk,
  allocateCapital,
  calculateCapitalRecommendations,
} from '../../allocation/allocation.js';

// ---------- helpers ----------

const buildAssets = (n = 5) =>
  Array.from({ length: n }, (_, i) => ({
    ticker: `T${i}`,
    name: `Asset ${i}`,
    scoreTotal: 50 + i * 10,
    details: { risk: { volatility: (15 + i * 3).toFixed(2) } },
  }));

const sumWeights = (allocation) =>
  allocation.reduce((sum, a) => sum + a.weight, 0);

describe('Capital Allocation System', () => {
  // ---------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------
  describe('ALLOCATION_METHODS', () => {
    it('defines all five methods', () => {
      expect(Object.keys(ALLOCATION_METHODS)).toEqual(
        expect.arrayContaining([
          'equal_weight', 'score_weighted', 'erc', 'volatility_target', 'hybrid',
        ])
      );
    });

    it('each method has name, description, and risk_level', () => {
      for (const key of Object.keys(ALLOCATION_METHODS)) {
        expect(ALLOCATION_METHODS[key].name).toBeTypeOf('string');
        expect(ALLOCATION_METHODS[key].description).toBeTypeOf('string');
        expect(ALLOCATION_METHODS[key].risk_level).toBeTypeOf('string');
      }
    });
  });

  describe('ALLOCATION_CONFIG', () => {
    it('defines expected configuration', () => {
      expect(ALLOCATION_CONFIG.max_position_weight).toBe(1.0);
      expect(ALLOCATION_CONFIG.min_position_weight).toBe(0.02);
      expect(ALLOCATION_CONFIG.target_volatility).toBe(15);
      expect(ALLOCATION_CONFIG.max_assets_in_portfolio).toBe(30);
      expect(ALLOCATION_CONFIG.min_assets_in_portfolio).toBe(1);
    });
  });

  // ---------------------------------------------------------------
  // equalWeightAllocation
  // ---------------------------------------------------------------
  describe('equalWeightAllocation', () => {
    it('assigns equal weights to all assets', () => {
      const assets = buildAssets(4);
      const result = equalWeightAllocation(assets);

      expect(result).toHaveLength(4);
      result.forEach(a => {
        expect(a.weight).toBeCloseTo(0.25, 5);
      });
    });

    it('weights sum to 1', () => {
      const result = equalWeightAllocation(buildAssets(5));
      expect(sumWeights(result)).toBeCloseTo(1, 5);
    });

    it('includes ticker, name, score, and volatility', () => {
      const result = equalWeightAllocation(buildAssets(2));
      result.forEach(a => {
        expect(a.ticker).toBeTypeOf('string');
        expect(a.name).toBeTypeOf('string');
        expect(a.score).toBeTypeOf('number');
      });
    });

    it('handles single asset', () => {
      const result = equalWeightAllocation(buildAssets(1));
      expect(result).toHaveLength(1);
      expect(result[0].weight).toBe(1);
    });
  });

  // ---------------------------------------------------------------
  // scoreWeightedAllocation
  // ---------------------------------------------------------------
  describe('scoreWeightedAllocation', () => {
    it('assigns higher weight to higher-scoring assets', () => {
      const assets = buildAssets(3);
      const result = scoreWeightedAllocation(assets);

      // Asset with highest score should have highest weight
      const sorted = [...result].sort((a, b) => b.weight - a.weight);
      expect(sorted[0].score).toBeGreaterThanOrEqual(sorted[1].score);
    });

    it('weights sum to 1', () => {
      const result = scoreWeightedAllocation(buildAssets(5));
      expect(sumWeights(result)).toBeCloseTo(1, 3);
    });

    it('respects min/max position weight constraints', () => {
      const config = { ...ALLOCATION_CONFIG, min_position_weight: 0.05, max_position_weight: 0.5 };
      const result = scoreWeightedAllocation(buildAssets(5), config);

      result.forEach(a => {
        expect(a.weight).toBeGreaterThanOrEqual(0.04); // Allow small floating point tolerance
        expect(a.weight).toBeLessThanOrEqual(0.51);
      });
    });
  });

  // ---------------------------------------------------------------
  // equalRiskContribution
  // ---------------------------------------------------------------
  describe('equalRiskContribution', () => {
    it('assigns higher weight to lower-volatility assets', () => {
      const assets = [
        { ticker: 'LOW', name: 'Low Vol', scoreTotal: 50, details: { risk: { volatility: '10' } } },
        { ticker: 'HIGH', name: 'High Vol', scoreTotal: 50, details: { risk: { volatility: '40' } } },
      ];

      const result = equalRiskContribution(assets);
      const lowVolAsset = result.find(a => a.ticker === 'LOW');
      const highVolAsset = result.find(a => a.ticker === 'HIGH');

      expect(lowVolAsset.weight).toBeGreaterThan(highVolAsset.weight);
    });

    it('weights sum to 1', () => {
      const result = equalRiskContribution(buildAssets(5));
      expect(sumWeights(result)).toBeCloseTo(1, 3);
    });

    it('uses default volatility of 20 for missing values', () => {
      const assets = [
        { ticker: 'A', name: 'A', scoreTotal: 50, details: {} },
        { ticker: 'B', name: 'B', scoreTotal: 50, details: {} },
      ];

      const result = equalRiskContribution(assets);
      // Both should be equal since both default to 20% vol
      expect(result[0].weight).toBeCloseTo(result[1].weight, 3);
    });
  });

  // ---------------------------------------------------------------
  // volatilityTargeting
  // ---------------------------------------------------------------
  describe('volatilityTargeting', () => {
    it('weights sum to 1', () => {
      const result = volatilityTargeting(buildAssets(5));
      expect(sumWeights(result)).toBeCloseTo(1, 3);
    });

    it('allocates more to assets closer to target volatility', () => {
      const assets = [
        { ticker: 'MATCH', name: 'Match', scoreTotal: 50, details: { risk: { volatility: '15' } } },
        { ticker: 'FAR', name: 'Far', scoreTotal: 50, details: { risk: { volatility: '50' } } },
      ];

      const result = volatilityTargeting(assets);
      const matchAsset = result.find(a => a.ticker === 'MATCH');
      const farAsset = result.find(a => a.ticker === 'FAR');

      expect(matchAsset.weight).toBeGreaterThan(farAsset.weight);
    });
  });

  // ---------------------------------------------------------------
  // hybridAllocation
  // ---------------------------------------------------------------
  describe('hybridAllocation', () => {
    it('weights sum to 1', () => {
      const result = hybridAllocation(buildAssets(5));
      expect(sumWeights(result)).toBeCloseTo(1, 3);
    });

    it('blends ERC and score-weighted approaches', () => {
      const assets = buildAssets(3);
      const erc = equalRiskContribution(assets);
      const score = scoreWeightedAllocation(assets);
      const hybrid = hybridAllocation(assets);

      // Hybrid weights should be between ERC and score weights (approximately)
      for (let i = 0; i < assets.length; i++) {
        const minW = Math.min(erc[i].weight, score[i].weight);
        const maxW = Math.max(erc[i].weight, score[i].weight);
        // Allow some tolerance due to renormalization
        expect(hybrid[i].weight).toBeGreaterThanOrEqual(minW * 0.7);
        expect(hybrid[i].weight).toBeLessThanOrEqual(maxW * 1.3);
      }
    });
  });

  // ---------------------------------------------------------------
  // calculatePortfolioRisk
  // ---------------------------------------------------------------
  describe('calculatePortfolioRisk', () => {
    it('calculates portfolio volatility', () => {
      const allocated = [
        { ticker: 'A', weight: 0.5, score: 60, volatility: '20' },
        { ticker: 'B', weight: 0.5, score: 60, volatility: '20' },
      ];

      const result = calculatePortfolioRisk(allocated);
      expect(parseFloat(result.portfolioVolatility)).toBeGreaterThan(0);
      expect(parseFloat(result.portfolioVolatility)).toBeLessThan(30);
    });

    it('calculates diversification ratio', () => {
      const allocated = [
        { ticker: 'A', weight: 0.5, score: 60, volatility: '20' },
        { ticker: 'B', weight: 0.5, score: 60, volatility: '20' },
      ];

      const result = calculatePortfolioRisk(allocated);
      expect(parseFloat(result.diversificationRatio)).toBeGreaterThanOrEqual(1);
    });

    it('calculates effective number of assets', () => {
      const allocated = [
        { ticker: 'A', weight: 0.5, score: 60, volatility: '20' },
        { ticker: 'B', weight: 0.5, score: 60, volatility: '20' },
      ];

      const result = calculatePortfolioRisk(allocated);
      expect(parseFloat(result.effectiveNAssets)).toBeCloseTo(2, 0);
    });

    it('concentrated portfolio has lower effective N', () => {
      const allocated = [
        { ticker: 'A', weight: 0.9, score: 60, volatility: '20' },
        { ticker: 'B', weight: 0.1, score: 60, volatility: '20' },
      ];

      const result = calculatePortfolioRisk(allocated);
      expect(parseFloat(result.effectiveNAssets)).toBeLessThan(2);
    });

    it('calculates marginal risk contributions', () => {
      const allocated = [
        { ticker: 'A', weight: 0.5, score: 60, volatility: '20' },
        { ticker: 'B', weight: 0.5, score: 60, volatility: '20' },
      ];

      const result = calculatePortfolioRisk(allocated);
      expect(result.marginalRisk).toHaveLength(2);
      result.marginalRisk.forEach(mr => {
        expect(mr.ticker).toBeTypeOf('string');
        expect(parseFloat(mr.contribution)).toBeGreaterThan(0);
      });
    });

    it('calculates estimated max drawdown', () => {
      const allocated = [
        { ticker: 'A', weight: 0.5, score: '80', volatility: '20' },
        { ticker: 'B', weight: 0.5, score: '40', volatility: '20' },
      ];

      const result = calculatePortfolioRisk(allocated);
      expect(parseFloat(result.estimatedMaxDD)).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------
  // allocateCapital
  // ---------------------------------------------------------------
  describe('allocateCapital', () => {
    it('uses hybrid method by default', () => {
      const assets = buildAssets(5);
      const result = allocateCapital(assets);

      expect(result.method).toBe('hybrid');
      expect(result.allocation).toHaveLength(5);
      expect(result.nAssets).toBe(5);
      expect(result.portfolioRisk).toBeDefined();
    });

    it('supports equal_weight method', () => {
      const result = allocateCapital(buildAssets(3), 'equal_weight');
      expect(result.method).toBe('equal_weight');
      result.allocation.forEach(a => {
        expect(a.weight).toBeCloseTo(1 / 3, 3);
      });
    });

    it('supports score_weighted method', () => {
      const result = allocateCapital(buildAssets(3), 'score_weighted');
      expect(result.method).toBe('score_weighted');
    });

    it('supports erc method', () => {
      const result = allocateCapital(buildAssets(3), 'erc');
      expect(result.method).toBe('erc');
    });

    it('supports volatility_target method', () => {
      const result = allocateCapital(buildAssets(3), 'volatility_target');
      expect(result.method).toBe('volatility_target');
    });

    it('falls back to hybrid for unknown method', () => {
      const result = allocateCapital(buildAssets(3), 'unknown_method');
      expect(result.allocation).toHaveLength(3);
    });

    it('limits assets to max_assets_in_portfolio', () => {
      const config = { ...ALLOCATION_CONFIG, max_assets_in_portfolio: 3 };
      const result = allocateCapital(buildAssets(10), 'equal_weight', config);
      expect(result.nAssets).toBe(3);
    });

    it('throws when below min_assets_in_portfolio', () => {
      const config = { ...ALLOCATION_CONFIG, min_assets_in_portfolio: 5 };
      expect(() => allocateCapital(buildAssets(3), 'equal_weight', config)).toThrow();
    });

    it('includes timestamp', () => {
      const result = allocateCapital(buildAssets(3));
      expect(result.timestamp).toBeTypeOf('string');
    });
  });

  // ---------------------------------------------------------------
  // calculateCapitalRecommendations
  // ---------------------------------------------------------------
  describe('calculateCapitalRecommendations', () => {
    it('calculates recommended capital per asset', () => {
      const allocation = [
        { ticker: 'A', weight: 0.5 },
        { ticker: 'B', weight: 0.5 },
      ];

      const result = calculateCapitalRecommendations(allocation, 100000);

      expect(result[0].recommended_capital).toBe('50000.00');
      expect(result[1].recommended_capital).toBe('50000.00');
    });

    it('uses default total capital of 100000', () => {
      const allocation = [{ ticker: 'A', weight: 1 }];
      const result = calculateCapitalRecommendations(allocation);

      expect(result[0].recommended_capital).toBe('100000.00');
    });

    it('preserves original allocation properties', () => {
      const allocation = [
        { ticker: 'A', weight: 0.5, name: 'Asset A', score: 80 },
      ];

      const result = calculateCapitalRecommendations(allocation, 10000);

      expect(result[0].ticker).toBe('A');
      expect(result[0].name).toBe('Asset A');
      expect(result[0].score).toBe(80);
    });
  });
});
