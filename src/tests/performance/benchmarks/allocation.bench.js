/**
 * Benchmark: Capital Allocation Algorithms
 *
 * Measures throughput of all allocation methods
 * with varying portfolio sizes.
 */
import { bench, describe } from 'vitest';
import {
  equalWeightAllocation, scoreWeightedAllocation,
  equalRiskContribution, volatilityTargeting,
  hybridAllocation, allocateCapital,
} from '../../../allocation/allocation.js';
import { buildScoredAssets } from '../../integration/helpers.js';

const assets5 = buildScoredAssets(5);
const assets10 = buildScoredAssets(10);

describe('Allocation (5 assets)', () => {
  bench('equalWeight', () => { equalWeightAllocation(assets5); });
  bench('scoreWeighted', () => { scoreWeightedAllocation(assets5); });
  bench('ERC', () => { equalRiskContribution(assets5); });
  bench('volatilityTargeting', () => { volatilityTargeting(assets5); });
  bench('hybrid', () => { hybridAllocation(assets5); });
});

describe('Allocation (10 assets)', () => {
  bench('allocateCapital(hybrid)', () => {
    allocateCapital(assets10, 'hybrid');
  });
  bench('allocateCapital(erc)', () => {
    allocateCapital(assets10, 'erc');
  });
  bench('allocateCapital(score_weighted)', () => {
    allocateCapital(assets10, 'score_weighted');
  });
});
