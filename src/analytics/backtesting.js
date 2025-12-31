
// =====================================================
// MOTOR DE BACKTESTING DE ESTRATEGIAS
// =====================================================

import * as scoring from '../indicators/scoring.js';
import { allocateCapital } from '../allocation/allocation.js';

const TRADING_DAYS_PER_YEAR = 252;

const calculateStdDev = (values) => {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const calculateMaxDrawdown = (equityCurve) => {
  let peak = equityCurve[0] ?? 1;
  let maxDrawdown = 0;

  equityCurve.forEach(value => {
    if (value > peak) peak = value;
    const drawdown = (value - peak) / peak;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  return Math.abs(maxDrawdown) * 100;
};

const calculateMetrics = (returns, equityCurve, rebalanceEvery) => {
  if (returns.length === 0) {
    return {
      totalReturn: 0,
      cagr: 0,
      volatility: 0,
      maxDrawdown: 0
    };
  }

  const periodsPerYear = TRADING_DAYS_PER_YEAR / rebalanceEvery;
  const totalYears = (returns.length * rebalanceEvery) / TRADING_DAYS_PER_YEAR;
  const totalReturn = (equityCurve[equityCurve.length - 1] - 1) * 100;
  const cagr = totalYears > 0
    ? (Math.pow(equityCurve[equityCurve.length - 1], 1 / totalYears) - 1) * 100
    : 0;
  const volatility = calculateStdDev(returns) * Math.sqrt(periodsPerYear) * 100;
  const maxDrawdown = calculateMaxDrawdown(equityCurve);

  return {
    totalReturn,
    cagr,
    volatility,
    maxDrawdown
  };
};

const buildAssetSnapshot = (asset, endIndex, strategyConfig) => {
  const slice = asset.data.slice(0, endIndex + 1);
  const prices = slice.map(d => d.close).filter(v => Number.isFinite(v));
  const volumes = slice.map(d => d.volume ?? 0);
  const candleData = slice.map(d => ({ c: d.close, h: d.high ?? d.close, l: d.low ?? d.close }));

  if (prices.length < strategyConfig.filters.min_days_history) {
    return null;
  }

  const filterResult = scoring.applyHardFilters(candleData, prices, volumes, strategyConfig.filters);
  if (!filterResult.passed) {
    return null;
  }

  const trendResult = scoring.calculateTrendScore(candleData, prices, strategyConfig.indicators);
  const momentumResult = scoring.calculateMomentumScore(prices, strategyConfig.indicators);
  const riskResult = scoring.calculateRiskScore(candleData, prices, strategyConfig.indicators);
  const liquidityResult = scoring.calculateLiquidityScore(volumes, strategyConfig.filters);

  const finalScore = scoring.calculateFinalScore(
    trendResult.score,
    momentumResult.score,
    riskResult.score,
    liquidityResult.score,
    strategyConfig.weights
  );

  return {
    ticker: asset.ticker,
    name: asset.name,
    scoreTotal: finalScore,
    details: {
      trend: trendResult.details,
      momentum: momentumResult.details,
      risk: riskResult.details,
      liquidity: liquidityResult.details
    }
  };
};

export const runStrategyBacktest = ({
  strategyKey,
  strategyConfig,
  universeData,
  topN = 10,
  rebalanceEvery = 21,
  allocationMethod = 'equal_weight'
}) => {
  const maxHistory = Math.max(
    ...universeData.map(asset => asset.data.length).filter(Boolean),
    0
  );

  const startIndex = strategyConfig.filters.min_days_history;
  const endIndex = maxHistory - rebalanceEvery - 1;

  if (maxHistory === 0 || startIndex >= endIndex) {
    return {
      strategyKey,
      strategyName: strategyConfig.name,
      metrics: null,
      returns: [],
      equityCurve: [],
      sample: 0
    };
  }

  const returns = [];
  const equityCurve = [1];
  let rebalances = 0;

  for (let i = startIndex; i <= endIndex; i += rebalanceEvery) {
    const snapshots = universeData
      .map(asset => buildAssetSnapshot(asset, i, strategyConfig))
      .filter(Boolean);

    if (snapshots.length === 0) {
      continue;
    }

    snapshots.sort((a, b) => b.scoreTotal - a.scoreTotal);
    const selected = snapshots.slice(0, topN);

    const allocationResult = allocateCapital(selected, allocationMethod);
    const weights = allocationResult.allocation.map(a => a.weight);

    const periodReturns = selected.map((asset, idx) => {
      const original = universeData.find(item => item.ticker === asset.ticker);
      const current = original?.data?.[i]?.close;
      const next = original?.data?.[i + rebalanceEvery]?.close;
      if (!Number.isFinite(current) || !Number.isFinite(next)) {
        return 0;
      }
      return (next / current) - 1;
    });

    const portfolioReturn = periodReturns.reduce(
      (sum, value, idx) => sum + value * (weights[idx] ?? 0),
      0
    );

    returns.push(portfolioReturn);
    equityCurve.push(equityCurve[equityCurve.length - 1] * (1 + portfolioReturn));
    rebalances += 1;
  }

  return {
    strategyKey,
    strategyName: strategyConfig.name,
    metrics: calculateMetrics(returns, equityCurve, rebalanceEvery),
    returns,
    equityCurve,
    sample: rebalances
  };
};

export default {
  runStrategyBacktest
};
