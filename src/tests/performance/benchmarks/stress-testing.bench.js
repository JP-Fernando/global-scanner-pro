/**
 * Benchmark: Stress Testing
 *
 * Measures throughput of sector stress and multi-factor stress
 * testing on a 5-position portfolio.
 */
import { bench, describe } from 'vitest';
import {
  runSectorStressTest, runMultiFactorStressTest,
} from '../../../analytics/stress-testing.js';
import { buildStressTestPortfolio } from '../../helpers.js';

const portfolio = buildStressTestPortfolio();
const totalCapital = 100000;

describe('Stress Testing (5 positions)', () => {
  bench('runSectorStressTest (tech_crash)', () => {
    runSectorStressTest(portfolio, totalCapital, {
      id: 'tech_crash', sectorId: 800,
      shockMagnitude: -0.30, correlationIncrease: 0.25,
    });
  });

  bench('runSectorStressTest (financial_crisis)', () => {
    runSectorStressTest(portfolio, totalCapital, {
      id: 'financial_crisis', sectorId: 700,
      shockMagnitude: -0.40, correlationIncrease: 0.35,
    });
  });

  bench('runMultiFactorStressTest', () => {
    runMultiFactorStressTest(portfolio, totalCapital);
  });
});
