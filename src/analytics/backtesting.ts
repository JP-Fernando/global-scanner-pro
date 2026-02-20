// =====================================================
// STRATEGY BACKTESTING ENGINE
// =====================================================

import * as scoring from '../indicators/scoring.js';
import { allocateCapital } from '../allocation/allocation.js';
import { BACKTESTING_CONFIG } from '../core/config.js';

const TRADING_DAYS_PER_YEAR = BACKTESTING_CONFIG.TRADING_DAYS_PER_YEAR;
const INITIAL_CAPITAL = BACKTESTING_CONFIG.INITIAL_CAPITAL;

const TRANSACTION_COSTS = {
  commission_pct: 0.001,
  slippage_pct: 0.0005,
  min_commission: 1.0
};

const calculateTransactionCost = (capital: number, weight: number, costs = TRANSACTION_COSTS) => {
  const tradedAmount = capital * weight;
  const commission = Math.max(
    tradedAmount * costs.commission_pct,
    costs.min_commission
  );
  const slippage = tradedAmount * costs.slippage_pct;
  return commission + slippage;
};

const calculateStdDev = (values: number[]) => {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;
  const variance = values.reduce((sum: number, v: number) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const calculateMaxDrawdown = (equityCurve: number[]) => {
  let peak = equityCurve[0] ?? 1;
  let maxDrawdown = 0;

  equityCurve.forEach((value: number) => {
    if (value > peak) peak = value;
    const drawdown = (value - peak) / peak;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  return Math.abs(maxDrawdown) * 100;
};

const calculateSharpeRatio = (returns: number[], rebalanceEvery: number, riskFreeRate = 0.02) => {
  if (returns.length === 0) return 0;

  const periodsPerYear = TRADING_DAYS_PER_YEAR / rebalanceEvery;
  const excessReturns = returns.map((r: number) => r - (riskFreeRate / periodsPerYear));
  const avgExcess = excessReturns.reduce((a: number, b: number) => a + b, 0) / excessReturns.length;
  const stdDev = calculateStdDev(excessReturns);

  if (stdDev === 0) return 0;

  return (avgExcess / stdDev) * Math.sqrt(periodsPerYear);
};

const calculateWinMetrics = (returns: number[]) => {
  const wins = returns.filter((r: number) => r > 0);
  const losses = returns.filter((r: number) => r < 0);

  const winRate = returns.length > 0 ? (wins.length / returns.length) * 100 : 0;
  const totalGains = wins.reduce((sum: number, r: number) => sum + r, 0);
  const totalLosses = Math.abs(losses.reduce((sum: number, r: number) => sum + r, 0));
  const avgWin = wins.length > 0 ? totalGains / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
  const profitFactor = totalLosses > 0 ? totalGains / totalLosses : 0;

  return { winRate, profitFactor, avgWin, avgLoss };
};

const calculateBenchmarkMetrics = (portfolioReturns: number[], benchmarkReturns: number[] | null) => {
  if (!benchmarkReturns || benchmarkReturns.length === 0) {
    return {
      alpha: 0,
      beta: 1,
      informationRatio: 0,
      trackingError: 0
    };
  }

  const length = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (length === 0) {
    return {
      alpha: 0,
      beta: 1,
      informationRatio: 0,
      trackingError: 0
    };
  }

  const portfolioSlice = portfolioReturns.slice(0, length);
  const benchmarkSlice = benchmarkReturns.slice(0, length);
  const portfolioAvg = portfolioSlice.reduce((a: number, b: number) => a + b, 0) / length;
  const benchmarkAvg = benchmarkSlice.reduce((a: number, b: number) => a + b, 0) / length;

  let covariance = 0;
  let benchmarkVariance = 0;

  for (let i = 0; i < length; i++) {
    covariance += (portfolioSlice[i] - portfolioAvg) * (benchmarkSlice[i] - benchmarkAvg);
    benchmarkVariance += (benchmarkSlice[i] - benchmarkAvg) ** 2;
  }

  const beta = benchmarkVariance > 0 ? covariance / benchmarkVariance : 1;
  const alpha = (portfolioAvg - (benchmarkAvg * beta)) * TRADING_DAYS_PER_YEAR;

  const trackingError = calculateStdDev(
    portfolioSlice.map((r: number, i: number) => r - benchmarkSlice[i])
  ) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  const informationRatio = trackingError > 0 ? alpha / trackingError : 0;

  return { alpha, beta, informationRatio, trackingError };
};

const calculateCalmarRatio = (cagr: number, maxDrawdown: number) => {
  if (maxDrawdown === 0) return 0;
  return cagr / maxDrawdown;
};

const analyzeDrawdownRecovery = (equityCurve: number[], rebalanceEvery: number) => {
  if (equityCurve.length === 0) {
    return { drawdowns: [], avgRecoveryDays: 0, numDrawdowns: 0, longestDrawdown: 0 };
  }

  let peak = equityCurve[0];
  let inDrawdown = false;
  let drawdownStart = 0;
  let trough = equityCurve[0];
  let longestDrawdown = 0;
  const drawdowns: { depth: number; recoveryDays: number }[] = [];

  equityCurve.forEach((value: number, i: number) => {
    if (value >= peak) {
      if (inDrawdown) {
        const recoveryDays = (i - drawdownStart) * rebalanceEvery;
        const depth = ((peak - trough) / peak) * 100;
        drawdowns.push({ depth, recoveryDays });
        longestDrawdown = Math.max(longestDrawdown, recoveryDays);
        inDrawdown = false;
        trough = value;
      }
      peak = value;
    } else {
      if (!inDrawdown) {
        inDrawdown = true;
        drawdownStart = i;
        trough = value;
      } else if (value < trough) {
        trough = value;
      }
    }
  });

  if (inDrawdown) {
    const recoveryDays = (equityCurve.length - 1 - drawdownStart) * rebalanceEvery;
    longestDrawdown = Math.max(longestDrawdown, recoveryDays);
  }

  const avgRecoveryDays = drawdowns.length > 0
    ? drawdowns.reduce((sum, d) => sum + d.recoveryDays, 0) / drawdowns.length
    : 0;

  return { drawdowns, avgRecoveryDays, numDrawdowns: drawdowns.length, longestDrawdown };
};

const estimateTaxDrag = (returns: number[], turnover: number, taxRate = 0.19) => {
  const realizedGains = returns.filter((r: number) => r > 0).reduce((sum: number, r: number) => sum + r, 0);
  return realizedGains * turnover * taxRate;
};

const calculateMetrics = ({
  returns,
  equityCurve,
  rebalanceEvery,
  benchmarkReturns,
  totalTransactionCosts,
  avgTurnover
}: {
  returns: number[];
  equityCurve: number[];
  rebalanceEvery: number;
  benchmarkReturns: number[] | null;
  totalTransactionCosts: number;
  avgTurnover: number;
}) => {
  if (returns.length === 0) {
    return {
      totalReturn: 0,
      cagr: 0,
      volatility: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      calmarRatio: 0,
      winRate: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      alpha: 0,
      beta: 1,
      informationRatio: 0,
      trackingError: 0,
      avgTurnover: 0,
      totalTransactionCosts: 0,
      avgRecoveryDays: 0,
      numDrawdowns: 0,
      longestDrawdown: 0,
      estimatedTaxDrag: 0
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
  const sharpeRatio = calculateSharpeRatio(returns, rebalanceEvery);
  const calmarRatio = calculateCalmarRatio(cagr, maxDrawdown);
  const winMetrics = calculateWinMetrics(returns);
  const benchmarkMetrics = calculateBenchmarkMetrics(returns, benchmarkReturns);
  const drawdownRecovery = analyzeDrawdownRecovery(equityCurve, rebalanceEvery);
  const estimatedTaxDrag = estimateTaxDrag(returns, avgTurnover ?? 0);

  return {
    totalReturn,
    cagr,
    volatility,
    maxDrawdown,
    sharpeRatio,
    calmarRatio,
    winRate: winMetrics.winRate,
    profitFactor: winMetrics.profitFactor,
    avgWin: winMetrics.avgWin,
    avgLoss: winMetrics.avgLoss,
    alpha: benchmarkMetrics.alpha,
    beta: benchmarkMetrics.beta,
    informationRatio: benchmarkMetrics.informationRatio,
    trackingError: benchmarkMetrics.trackingError,
    avgTurnover: avgTurnover ?? 0,
    totalTransactionCosts: totalTransactionCosts ?? 0,
    avgRecoveryDays: drawdownRecovery.avgRecoveryDays,
    numDrawdowns: drawdownRecovery.numDrawdowns,
    longestDrawdown: drawdownRecovery.longestDrawdown,
    estimatedTaxDrag
  };
};

const buildAssetSnapshot = (asset: any, endIndex: number, strategyConfig: any) => {
  const slice = asset.data.slice(0, endIndex + 1);
  const prices = slice.map((d: any) => d.close).filter((v: any) => Number.isFinite(v));
  const volumes = slice.map((d: any) => d.volume ?? 0);
  const candleData = slice.map((d: any) => ({ c: d.close, h: d.high ?? d.close, l: d.low ?? d.close }));

  if (prices.length < strategyConfig.filters.min_days_history) {
    return null;
  }

  const filterResult = scoring.applyHardFilters(
    candleData, prices, volumes, strategyConfig.filters
  );
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
  allocationMethod = 'equal_weight',
  benchmarkPrices = null,
  transactionCosts = TRANSACTION_COSTS,
  initialCapital = INITIAL_CAPITAL
}: {
  strategyKey: any;
  strategyConfig: any;
  universeData: any[];
  topN?: number;
  rebalanceEvery?: number;
  allocationMethod?: string;
  benchmarkPrices?: any;
  transactionCosts?: any;
  initialCapital?: number;
}) => {
  const maxHistory = Math.max(
    ...universeData.map((asset: any) => asset.data.length).filter(Boolean),
    0
  );

  const startIndex = strategyConfig.filters.min_days_history;
  const endIndex = maxHistory - rebalanceEvery - 1;

  if (maxHistory === 0 || startIndex >= endIndex) {
    return {
      strategyKey,
      strategyName: strategyConfig.name,
      initialCapital,
      metrics: null,
      returns: [],
      equityCurve: [],
      sample: 0
    };
  }

  const returns = [];
  const benchmarkReturns = [];
  const equityCurve = [1];
  const rebalanceDates = [];
  let rebalances = 0;
  let totalTransactionCosts = 0;
  let totalTurnover = 0;
  let previousWeights = new Map();

  for (let i = startIndex; i <= endIndex; i += rebalanceEvery) {
    const snapshots = universeData
      .map((asset: any) => buildAssetSnapshot(asset, i, strategyConfig))
      .filter(Boolean);

    if (snapshots.length === 0) {
      continue;
    }

    snapshots.sort((a: any, b: any) => b.scoreTotal - a.scoreTotal);
    const selected = snapshots.slice(0, topN);

    const allocationResult = allocateCapital(selected as any, allocationMethod);
    const weights = allocationResult.allocation.map(a => a.weight);
    const nextWeights = new Map(
      allocationResult.allocation.map((asset, idx) => [asset.ticker, weights[idx] ?? 0])
    );
    let turnover = 0;

    nextWeights.forEach((weight, ticker) => {
      const prevWeight = previousWeights.get(ticker) ?? 0;
      turnover += Math.abs(weight - prevWeight);
    });

    previousWeights.forEach((weight, ticker) => {
      if (!nextWeights.has(ticker)) {
        turnover += Math.abs(weight);
      }
    });

    turnover /= 2;
    totalTurnover += turnover;

    const periodReturns = selected.map((asset: any, _idx: any) => {
      const original = universeData.find((item: any) => item.ticker === asset.ticker);
      const current = original?.data?.[i]?.close;
      const next = original?.data?.[i + rebalanceEvery]?.close;
      if (!Number.isFinite(current) || !Number.isFinite(next)) {
        return 0;
      }
      return (next / current) - 1;
    });

    const portfolioReturn = periodReturns.reduce(
      (sum: number, value: number, idx: number) => sum + value * (weights[idx] ?? 0),
      0
    );
    const currentCapital = (equityCurve[equityCurve.length - 1] ?? 1) * initialCapital;
    const transactionCost = calculateTransactionCost(currentCapital, turnover, transactionCosts);
    const netReturn = currentCapital > 0
      ? portfolioReturn - (transactionCost / currentCapital)
      : portfolioReturn;

    returns.push(netReturn);
    equityCurve.push(equityCurve[equityCurve.length - 1] * (1 + netReturn));
    rebalances += 1;
    totalTransactionCosts += transactionCost;
    previousWeights = nextWeights;
    const rebalanceDate = universeData
      .map((asset: any) => asset.data?.[i]?.date)
      .find((date: any) => date);
    rebalanceDates.push(rebalanceDate ?? `t+${rebalances * rebalanceEvery}`);

    if (benchmarkPrices) {
      const benchmarkNow = benchmarkPrices[i];
      const benchmarkNext = benchmarkPrices[i + rebalanceEvery];
      const benchmarkReturn = Number.isFinite(benchmarkNow) && Number.isFinite(benchmarkNext)
        ? (benchmarkNext / benchmarkNow) - 1
        : 0;
      benchmarkReturns.push(benchmarkReturn);
    }
  }

  return {
    strategyKey,
    strategyName: strategyConfig.name,
    initialCapital,
    metrics: calculateMetrics({
      returns,
      equityCurve,
      rebalanceEvery,
      benchmarkReturns: benchmarkReturns.length ? benchmarkReturns : null,
      totalTransactionCosts,
      avgTurnover: rebalances > 0 ? totalTurnover / rebalances : 0
    }),
    returns,
    equityCurve,
    benchmarkReturns: benchmarkReturns.length ? benchmarkReturns : null,
    rebalanceDates,
    sample: rebalances
  };
};

export const runWalkForwardTest = ({
  universeData,
  strategyConfig,
  params = {} as any,
  topN = 10,
  rebalanceEvery = 21,
  allocationMethod = 'equal_weight',
  benchmarkPrices = null,
  transactionCosts = TRANSACTION_COSTS
}: {
  universeData: any[];
  strategyConfig: any;
  params?: any;
  topN?: number;
  rebalanceEvery?: number;
  allocationMethod?: string;
  benchmarkPrices?: any;
  transactionCosts?: any;
}) => {
  const {
    inSamplePeriod = 252,
    outSamplePeriod = 63,
    stepSize = 21
  } = params;

  const results: any[] = [];
  const dataLength = Math.min(
    ...universeData.map((asset: any) => asset.data.length).filter(Boolean),
    Infinity
  );

  for (let i = inSamplePeriod; i <= dataLength - outSamplePeriod; i += stepSize) {
    const inSampleData = universeData.map((asset: any) => ({
      ...asset,
      data: asset.data.slice(i - inSamplePeriod, i)
    }));

    const outSampleData = universeData.map((asset: any) => ({
      ...asset,
      data: asset.data.slice(i, i + outSamplePeriod)
    }));

    const inSampleBenchmark = benchmarkPrices
      ? benchmarkPrices.slice(i - inSamplePeriod, i)
      : null;
    const outSampleBenchmark = benchmarkPrices
      ? benchmarkPrices.slice(i, i + outSamplePeriod)
      : null;

    const inSampleResult = runStrategyBacktest({
      strategyKey: strategyConfig.key ?? strategyConfig.name ?? 'walk_forward',
      strategyConfig,
      universeData: inSampleData,
      topN,
      rebalanceEvery,
      allocationMethod,
      benchmarkPrices: inSampleBenchmark,
      transactionCosts
    });

    const outSampleResult = runStrategyBacktest({
      strategyKey: strategyConfig.key ?? strategyConfig.name ?? 'walk_forward',
      strategyConfig,
      universeData: outSampleData,
      topN,
      rebalanceEvery,
      allocationMethod,
      benchmarkPrices: outSampleBenchmark,
      transactionCosts
    });

    results.push({
      startIndex: i - inSamplePeriod,
      inSampleResult,
      outSampleResult
    });
  }

  return results;
};

export default {
  runStrategyBacktest,
  runWalkForwardTest
};
