import { describe, it, expect } from 'vitest';
import {
  calculateDynamicLimits,
  detectVolatilityRegime,
  detectCorrelationRegime,
  stressTestDynamicLimits,
} from '../../analytics/dynamic-governance.js';

describe('Dynamic Governance', () => {
  // -----------------------------------------------------------
  // Volatility regime detection
  // -----------------------------------------------------------
  describe('Volatility Regime Detection', () => {
    it('detects low volatility (<15)', () => {
      const regime = detectVolatilityRegime(12);
      expect(regime.name).toBe('Low Volatility');
      expect(regime.multiplier).toBe(1.2);
    });

    it('detects normal volatility (~20)', () => {
      const regime = detectVolatilityRegime(20);
      expect(regime.name).toBe('Normal');
      expect(regime.multiplier).toBe(1.0);
    });

    it('detects high volatility (~30)', () => {
      const regime = detectVolatilityRegime(30);
      expect(regime.name).toBe('High Volatility');
      expect(regime.multiplier).toBe(0.8);
    });

    it('detects extreme volatility (~45)', () => {
      const regime = detectVolatilityRegime(45);
      expect(regime.name).toBe('Extreme Volatility');
      expect(regime.multiplier).toBe(0.6);
    });
  });

  // -----------------------------------------------------------
  // Correlation regime detection
  // -----------------------------------------------------------
  describe('Correlation Regime Detection', () => {
    it('detects low correlation (0.3)', () => {
      const regime = detectCorrelationRegime(0.3);
      expect(regime.name).toBe('Low Correlation');
      expect(regime.multiplier).toBe(1.1);
    });

    it('detects moderate correlation (0.6)', () => {
      const regime = detectCorrelationRegime(0.6);
      expect(regime.name).toBe('Moderate Correlation');
      expect(regime.multiplier).toBe(1.0);
    });

    it('detects high correlation (0.75)', () => {
      const regime = detectCorrelationRegime(0.75);
      expect(regime.name).toBe('High Correlation');
      expect(regime.multiplier).toBe(0.85);
    });

    it('detects extreme correlation (0.9)', () => {
      const regime = detectCorrelationRegime(0.9);
      expect(regime.name).toBe('Extreme Correlation');
      expect(regime.multiplier).toBe(0.7);
    });
  });

  // -----------------------------------------------------------
  // Dynamic limits calculation
  // -----------------------------------------------------------
  describe('Dynamic Limits Calculation', () => {
    it('generates rules and metadata for normal conditions', () => {
      const result = calculateDynamicLimits({
        portfolioVolatility: 18,
        correlationMatrix: null,
        avgLiquidity: 100000,
        stressLevel: 0.1,
      });

      expect(result.rules).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.regime.volatility).toBe('Normal');
    });

    it('produces tighter limits under high stress', () => {
      const normalResult = calculateDynamicLimits({
        portfolioVolatility: 18,
        correlationMatrix: null,
        avgLiquidity: 100000,
        stressLevel: 0.1,
      });

      const stressResult = calculateDynamicLimits({
        portfolioVolatility: 35,
        correlationMatrix: null,
        avgLiquidity: 30000,
        stressLevel: 0.8,
      });

      expect(stressResult.rules.max_position_weight).toBeLessThan(0.15);
      // Volatility 35 is >= HIGH threshold (35), so it falls into Extreme
      expect(stressResult.metadata.regime.volatility).toBe('Extreme Volatility');
      expect(stressResult.metadata.recommendation.length).toBeGreaterThan(0);
      expect(stressResult.rules.max_position_weight).toBeLessThan(
        normalResult.rules.max_position_weight
      );
    });
  });

  // -----------------------------------------------------------
  // Stress test scenarios
  // -----------------------------------------------------------
  describe('Stress Test Scenarios', () => {
    it('tests five predefined scenarios with correct ordering', () => {
      const scenarios = stressTestDynamicLimits();

      expect(scenarios).toHaveLength(5);
      expect(scenarios[0].scenario).toBe('Normal Market');
      expect(scenarios[2].scenario).toBe('Market Crash (2008-style)');
      expect(scenarios[4].scenario).toBe('Goldilocks (ideal)');

      const crashScenario = scenarios.find((s) => s.scenario.includes('Crash'));
      const idealScenario = scenarios.find((s) => s.scenario.includes('Goldilocks'));

      expect(crashScenario.adjusted_limits.max_position_weight).toBeLessThan(
        idealScenario.adjusted_limits.max_position_weight
      );
      // combined is returned as a string by the module (toFixed(2))
      expect(parseFloat(crashScenario.metadata.multipliers.combined)).toBeLessThan(
        parseFloat(idealScenario.metadata.multipliers.combined)
      );
    });
  });

  // -----------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------
  describe('Edge Cases', () => {
    it('enforces floor limits under extreme volatility', () => {
      const result = calculateDynamicLimits({
        portfolioVolatility: 60,
        correlationMatrix: null,
        avgLiquidity: 10000,
        stressLevel: 1.0,
      });

      expect(result.rules.max_position_weight).toBeGreaterThanOrEqual(0.05);
      expect(result.rules.max_sector_weight).toBeGreaterThanOrEqual(0.15);
    });

    it('allows relaxed limits under low volatility', () => {
      const result = calculateDynamicLimits({
        portfolioVolatility: 8,
        correlationMatrix: null,
        avgLiquidity: 200000,
        stressLevel: 0.0,
      });

      expect(result.rules.max_position_weight).toBeGreaterThanOrEqual(0.15);
      expect(result.metadata.regime.volatility).toBe('Low Volatility');
    });

    it('handles missing market conditions gracefully', () => {
      const result = calculateDynamicLimits({});
      expect(result.rules).toBeDefined();
    });
  });
});
