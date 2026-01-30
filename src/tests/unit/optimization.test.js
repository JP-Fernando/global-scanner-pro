import { describe, it, expect } from 'vitest';
import {
  runMonteCarloSimulation,
  runHistoricalScenarios,
  HISTORICAL_SCENARIOS,
} from '../../analytics/monte-carlo.js';
import {
  optimizeMaxSharpe,
  optimizeMinVariance,
  optimizeRiskParity,
} from '../../analytics/portfolio-optimizer.js';
import { buildOptimizationPortfolio } from '../helpers.js';

describe('Monte Carlo Simulation', () => {
  const portfolio = buildOptimizationPortfolio();
  const initialCapital = 50000;

  it('runs simulation without errors and produces results', () => {
    const result = runMonteCarloSimulation(portfolio, initialCapital, {
      numSimulations: 1000,
      timeHorizonDays: 252,
      confidenceLevel: 0.95,
    });

    expect(result.error).toBeUndefined();
    expect(result.results).toBeDefined();
    expect(result.results.expectedValue).toBeDefined();
    expect(result.results.var95).toBeDefined();
    expect(result.results.cvar95).toBeDefined();
    expect(result.paths).toBeDefined();
    expect(result.paths.length).toBeGreaterThan(0);
  });
});

describe('Historical Scenarios', () => {
  const portfolio = buildOptimizationPortfolio();
  const initialCapital = 50000;

  it('analyses all historical scenarios with worst case identification', () => {
    const result = runHistoricalScenarios(portfolio, initialCapital, HISTORICAL_SCENARIOS);

    expect(result.summary).toBeDefined();
    expect(result.summary.scenariosAnalyzed).toBe(HISTORICAL_SCENARIOS.length);
    expect(result.summary.worstCase).toBeDefined();
    expect(result.scenarios.length).toBeGreaterThan(0);

    const firstScenario = result.scenarios[0];
    expect(firstScenario.totalImpact).toBeDefined();
    expect(firstScenario.positionImpacts).toBeDefined();
  });
});

describe('Portfolio Optimization', () => {
  const portfolio = buildOptimizationPortfolio();

  // -----------------------------------------------------------
  // Max Sharpe
  // -----------------------------------------------------------
  describe('Max Sharpe', () => {
    it('produces optimal weights summing to 1 with Sharpe metric', () => {
      const result = optimizeMaxSharpe(portfolio, {
        minWeight: 0.10,
        maxWeight: 0.40,
        maxSectorWeight: 0.50,
      });

      expect(result.error).toBeUndefined();
      expect(result.optimalWeights).toBeDefined();
      expect(result.optimalWeights).toHaveLength(portfolio.length);
      expect(result.metrics.sharpeRatio).toBeDefined();

      const totalWeight = result.optimalWeights.reduce(
        (sum, w) => sum + parseFloat(w.weight),
        0
      );
      expect(totalWeight).toBeApprox(1.0, 0.01);
    });
  });

  // -----------------------------------------------------------
  // Min Variance
  // -----------------------------------------------------------
  describe('Min Variance', () => {
    it('produces optimal weights and variance metric', () => {
      const result = optimizeMinVariance(portfolio, {
        minWeight: 0.10,
        maxWeight: 0.40,
      });

      expect(result.error).toBeUndefined();
      expect(result.optimalWeights).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.variance).toBeDefined();
    });
  });

  // -----------------------------------------------------------
  // Risk Parity
  // -----------------------------------------------------------
  describe('Risk Parity', () => {
    it('produces weights with risk contribution for each position', () => {
      const result = optimizeRiskParity(portfolio, {
        minWeight: 0.10,
        maxWeight: 0.50,
      });

      expect(result.error).toBeUndefined();
      expect(result.optimalWeights).toBeDefined();
      expect(result.metrics).toBeDefined();

      const firstPosition = result.optimalWeights[0];
      expect(firstPosition.riskContribution).toBeDefined();
    });
  });
});
