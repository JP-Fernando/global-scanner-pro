/**
 * Benchmark: Monte Carlo Simulation
 *
 * Measures throughput of portfolio Monte Carlo simulations
 * at 1k and 10k iteration counts.
 */
import { bench, describe } from 'vitest';
import { runMonteCarloSimulation } from '../../../analytics/monte-carlo.js';
import { buildOptimizationPortfolio } from '../../helpers.js';

const positions = buildOptimizationPortfolio();
const initialCapital = 100000;

describe('Monte Carlo Simulation', () => {
  bench('1,000 simulations (252-day horizon)', () => {
    runMonteCarloSimulation(positions, initialCapital, {
      numSimulations: 1000,
      timeHorizonDays: 252,
    });
  });

  bench('10,000 simulations (252-day horizon)', () => {
    runMonteCarloSimulation(positions, initialCapital, {
      numSimulations: 10000,
      timeHorizonDays: 252,
    });
  });
});
