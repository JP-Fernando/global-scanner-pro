import { describe, it, expect } from 'vitest';
import { runStrategyBacktest, runWalkForwardTest } from '../../analytics/backtesting.js';
import { buildBacktestUniverse, buildStrategyConfig } from '../helpers.js';

describe('Backtesting Engine', () => {
  const universeData = buildBacktestUniverse();
  const strategyConfig = buildStrategyConfig();

  describe('runStrategyBacktest', () => {
    it('returns metrics and rebalance data', () => {
      const benchmarkPrices = universeData[0].data.map((p) => p.close);

      const result = runStrategyBacktest({
        strategyKey: 'test_strategy',
        strategyConfig,
        universeData,
        topN: 1,
        rebalanceEvery: 5,
        allocationMethod: 'equal_weight',
        benchmarkPrices,
      });

      expect(result.metrics).not.toBeNull();
      expect(result.sample).toBeGreaterThan(0);
      expect(typeof result.metrics.calmarRatio).toBe('number');
      expect(result.metrics.estimatedTaxDrag).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runWalkForwardTest', () => {
    it('produces at least one in/out-sample window', () => {
      const results = runWalkForwardTest({
        universeData,
        strategyConfig,
        topN: 1,
        rebalanceEvery: 5,
        allocationMethod: 'equal_weight',
        params: {
          inSamplePeriod: 40,
          outSamplePeriod: 30,
          stepSize: 10,
        },
      });

      expect(results.length).toBeGreaterThan(0);

      const sample = results[0];
      expect(sample.inSampleResult.metrics).not.toBeNull();
      expect(sample.outSampleResult.metrics).not.toBeNull();
    });
  });
});
