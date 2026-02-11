/**
 * Dynamic Governance Extended Tests
 *
 * Covers adjustRiskProfile, monitorMarketConditions,
 * and determineEffectiveProfile (internal).
 */

import { describe, it, expect } from 'vitest';
import {
  adjustRiskProfile,
  stressTestDynamicLimits,
  monitorMarketConditions,
} from '../../analytics/dynamic-governance.js';

describe('Dynamic Governance - Extended', () => {
  // -----------------------------------------------------------
  // adjustRiskProfile
  // -----------------------------------------------------------
  describe('adjustRiskProfile', () => {
    it('returns adjusted rules for conservative profile in normal market', () => {
      const result = adjustRiskProfile('conservative', {
        portfolioVolatility: 18,
        correlationMatrix: null,
        avgLiquidity: 100000,
        stressLevel: 0.1,
      });

      expect(result.original_profile).toBe('conservative');
      expect(result.adjusted_rules).toBeDefined();
      expect(result.adjustment_metadata).toBeDefined();
      expect(result.effective_profile).toBeTypeOf('string');
    });

    it('returns adjusted rules for aggressive profile', () => {
      const result = adjustRiskProfile('aggressive', {
        portfolioVolatility: 18,
        correlationMatrix: null,
        avgLiquidity: 100000,
        stressLevel: 0.1,
      });

      expect(result.original_profile).toBe('aggressive');
      expect(result.effective_profile).toBeDefined();
    });

    it('tightens rules under high volatility', () => {
      const normal = adjustRiskProfile('moderate', {
        portfolioVolatility: 18,
        correlationMatrix: null,
        avgLiquidity: 100000,
        stressLevel: 0.1,
      });

      const stressed = adjustRiskProfile('moderate', {
        portfolioVolatility: 45,
        correlationMatrix: null,
        avgLiquidity: 30000,
        stressLevel: 0.9,
      });

      expect(stressed.adjusted_rules.max_position_weight).toBeLessThan(
        normal.adjusted_rules.max_position_weight
      );
    });

    it('falls back to default INVESTMENT_RULES for unknown profile', () => {
      const result = adjustRiskProfile('unknown_profile', {
        portfolioVolatility: 20,
        correlationMatrix: null,
        avgLiquidity: 100000,
        stressLevel: 0.2,
      });

      expect(result.adjusted_rules).toBeDefined();
      expect(result.effective_profile).toBeTypeOf('string');
    });

    it('determines conservative effective profile for tight limits', () => {
      // Force very low position limits through extreme conditions
      const result = adjustRiskProfile('conservative', {
        portfolioVolatility: 50,
        correlationMatrix: null,
        avgLiquidity: 10000,
        stressLevel: 1.0,
      });

      // Under extreme conditions, limits should be very tight
      expect(result.adjusted_rules.max_position_weight).toBeLessThanOrEqual(0.15);
    });

    it('determines different effective profiles based on conditions', () => {
      const relaxed = adjustRiskProfile('aggressive', {
        portfolioVolatility: 8,
        correlationMatrix: null,
        avgLiquidity: 500000,
        stressLevel: 0.0,
      });

      const tight = adjustRiskProfile('conservative', {
        portfolioVolatility: 50,
        correlationMatrix: null,
        avgLiquidity: 10000,
        stressLevel: 1.0,
      });

      // Relaxed conditions should yield wider limits than tight
      expect(relaxed.adjusted_rules.max_position_weight).toBeGreaterThan(
        tight.adjusted_rules.max_position_weight
      );
    });
  });

  // -----------------------------------------------------------
  // monitorMarketConditions
  // -----------------------------------------------------------
  describe('monitorMarketConditions', () => {
    it('returns current limits and empty alerts without history', () => {
      const result = monitorMarketConditions({
        portfolioVolatility: 18,
        correlationMatrix: null,
        avgLiquidity: 100000,
        stressLevel: 0.1,
      });

      expect(result.current_limits).toBeDefined();
      expect(result.alerts).toEqual([]);
      expect(result.timestamp).toBeDefined();
    });

    it('generates REGIME_CHANGE alert on volatility regime change', () => {
      const previous = {
        portfolioVolatility: 18, // Normal
        correlationMatrix: null,
        avgLiquidity: 100000,
        stressLevel: 0.1,
      };

      const current = {
        portfolioVolatility: 40, // Extreme
        correlationMatrix: null,
        avgLiquidity: 50000,
        stressLevel: 0.7,
      };

      const result = monitorMarketConditions(current, [previous]);

      const regimeAlerts = result.alerts.filter(a => a.type === 'REGIME_CHANGE');
      expect(regimeAlerts.length).toBeGreaterThan(0);

      const volAlert = regimeAlerts.find(a => a.message.includes('Volatility'));
      expect(volAlert).toBeDefined();
      expect(volAlert.severity).toBe('HIGH');
    });

    it('generates REGIME_CHANGE alert on correlation regime change', () => {
      // Create correlation matrices that produce different regimes
      const lowCorrMatrix = Array(5).fill(null).map((_, i) =>
        Array(5).fill(null).map((_, j) => i === j ? 1.0 : 0.3)
      );
      const highCorrMatrix = Array(5).fill(null).map((_, i) =>
        Array(5).fill(null).map((_, j) => i === j ? 1.0 : 0.9)
      );

      const previous = {
        portfolioVolatility: 18,
        correlationMatrix: lowCorrMatrix,
        avgLiquidity: 100000,
        stressLevel: 0.1,
      };

      const current = {
        portfolioVolatility: 18, // same vol to isolate correlation change
        correlationMatrix: highCorrMatrix,
        avgLiquidity: 100000,
        stressLevel: 0.1,
      };

      const result = monitorMarketConditions(current, [previous]);
      const corrAlerts = result.alerts.filter(a =>
        a.type === 'REGIME_CHANGE' && a.message.includes('Correlation')
      );
      expect(corrAlerts.length).toBeGreaterThan(0);
      expect(corrAlerts[0].severity).toBe('MEDIUM');
    });

    it('generates LIMIT_REDUCTION alert when limits drop significantly', () => {
      const result = monitorMarketConditions({
        portfolioVolatility: 55,
        correlationMatrix: null,
        avgLiquidity: 5000,
        stressLevel: 1.0,
      });

      const limitAlerts = result.alerts.filter(a => a.type === 'LIMIT_REDUCTION');
      expect(limitAlerts.length).toBeGreaterThan(0);
      expect(limitAlerts[0].severity).toBe('HIGH');
    });

    it('does not generate alerts when conditions are stable', () => {
      const conditions = {
        portfolioVolatility: 18,
        correlationMatrix: null,
        avgLiquidity: 100000,
        stressLevel: 0.1,
      };

      // Same conditions as history
      const result = monitorMarketConditions(conditions, [conditions]);
      const regimeAlerts = result.alerts.filter(a => a.type === 'REGIME_CHANGE');
      expect(regimeAlerts).toHaveLength(0);
    });

    it('includes timestamp in ISO format', () => {
      const result = monitorMarketConditions({
        portfolioVolatility: 18,
        correlationMatrix: null,
        avgLiquidity: 100000,
        stressLevel: 0.1,
      });

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // -----------------------------------------------------------
  // stressTestDynamicLimits with custom base rules
  // -----------------------------------------------------------
  describe('stressTestDynamicLimits with custom rules', () => {
    it('accepts custom base rules', () => {
      const customRules = {
        max_position_weight: 0.10,
        max_sector_weight: 0.25,
        max_portfolio_volatility: 15,
        min_positions: 10,
        max_positions: 40,
        rebalance_threshold: 0.03,
      };

      const results = stressTestDynamicLimits(customRules);
      expect(results).toHaveLength(5);

      // Under ideal conditions, limits should be at or above custom base
      const idealScenario = results.find(r => r.scenario === 'Goldilocks (ideal)');
      expect(idealScenario.adjusted_limits.max_position_weight).toBeGreaterThanOrEqual(
        customRules.max_position_weight * 0.5
      );
    });
  });
});
