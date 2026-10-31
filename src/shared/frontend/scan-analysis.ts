/** Shared asset scoring and benchmark analysis; history access is injectable. */
import { MARKET_BENCHMARKS } from '../../core/config.js';
import * as ind from '../../indicators/indicators.js';
import * as scoring from '../../indicators/scoring.js';
import i18n from '../../i18n/i18n.js';
import { fetchPriceHistory } from './market-data-client.js';
import type { PriceBar } from './market-data-client.js';

type HistoryLoader = (ticker: string, suffix: string) => Promise<PriceBar[] | null>;

export async function analyzeStock(stock: any, suffix: string, config: any, benchmarkROCs: any, benchmarkVol: any, loadYahooData: HistoryLoader = fetchPriceHistory): Promise<any> {
  try {
    const data = await loadYahooData(stock.ticker, suffix);

    if (!data || data.length < config.filters.min_days_history) {
      return { passed: false, reason: 'Insufficient history' };
    }

    const prices = data.map(d => d.close); // Indicator calculations
    const pricesWithDates = data.map(d => ({
      date: d.date,
      close: d.close
    }));
    const volumes = data.map(d => d.volume);
    const candleData = data.map(d => ({ c: d.close, h: d.high, l: d.low }));

    const filterResult = scoring.applyHardFilters(candleData, prices, volumes, config.filters);

    if (!filterResult.passed) {
      return {
        passed: false,
        ticker: stock.ticker,
        name: stock.name,
        reason: filterResult.reasons.join('; ')
      };
    }

    const trendResult = scoring.calculateTrendScore(candleData, prices, config.indicators);
    const momentumResult = scoring.calculateMomentumScore(
      prices,
      config.indicators,
      benchmarkROCs?.roc6m,
      benchmarkROCs?.roc12m
    );
    const riskResult = scoring.calculateRiskScore(
      candleData,
      prices,
      config.indicators,
      benchmarkVol
    );
    const liquidityResult = scoring.calculateLiquidityScore(volumes, config.filters);

    const scoreShort = scoring.calculateShortTermScore(
      candleData, prices, volumes, config.indicators
    );
    const scoreMedium = scoring.calculateMediumTermScore(candleData, prices, config.indicators);
    const scoreLong = scoring.calculateLongTermScore(candleData, prices, config.indicators);

    const finalScore = scoring.calculateFinalScore(
      trendResult.score,
      momentumResult.score,
      riskResult.score,
      liquidityResult.score,
      config.weights
    );

    const signal = scoring.generateSignal(finalScore, config.signals);

    const avgVol = ind.SMA(volumes.slice(-50), 50);
    const vRatio = volumes[volumes.length - 1] / avgVol;

    let priceChange60d;
    if (prices.length >= 61) {
      const current = prices[prices.length - 1];
      const past = prices[prices.length - 61];
      priceChange60d = ((current - past) / past) * 100;
    }

    return {
      passed: true,
      ticker: stock.ticker,
      name: stock.name,
      prices,
      pricesWithDates,
      quant_score: finalScore,
      volatility: Number(riskResult.details.volatility),
      volume: volumes[volumes.length - 1],
      momentum: momentumResult.score,
      price_change_60d: priceChange60d,
      warnings: filterResult.reasons,
      price: prices[prices.length - 1],
      scoreTotal: finalScore,
      scoreShort,
      scoreMedium,
      scoreLong,
      scoreTrend: Math.round(trendResult.score),
      scoreMomentum: Math.round(momentumResult.score),
      scoreRisk: Math.round(riskResult.score),
      scoreLiquidity: Math.round(liquidityResult.score),
      signal,
      vRatio,
      details: {
        trend: trendResult.details,
        momentum: momentumResult.details,
        risk: riskResult.details,
        liquidity: liquidityResult.details
      }
    };

  } catch (err) {
    console.warn(i18n.t('errors.analyse_stock', {
      ticker: stock.ticker,
      name: stock.name
    }), (err as any).message);
    return {
      passed: false,
      ticker: stock.ticker,
      name: stock.name,
      reason: (err as any).message
    };
  }
}

// =====================================================
// BENCHMARK LOADING AND ANALYSIS
// =====================================================

export async function loadBenchmark(suffix: string, loadYahooData: HistoryLoader = fetchPriceHistory) {
  const benchmarkSymbol = (MARKET_BENCHMARKS as any)[suffix];

  if (!benchmarkSymbol) {
    console.log(i18n.t('errors.no_benchmark_market'));
    return null;
  }

  console.log(`Loading benchmark: ${benchmarkSymbol}`);
  const data = await loadYahooData(benchmarkSymbol, '');

  if (!data || data.length < 252) {
    console.warn(i18n.t('errors.insufficient_benchmark_data'));
    return null;
  }

  const prices = data.map(d => d.close);

  try {
    const roc6m = ind.ROC(prices, 126);
    const roc12m = ind.ROC(prices, 252);
    const volatility = ind.Volatility(prices, 252);

    return {
      symbol: benchmarkSymbol,
      rocs: { roc6m, roc12m },
      volatility,
      prices
    };
  } catch (e) {
    console.warn(i18n.t('errors.benchmark_calculation_failed'), (e as Error).message);
    return null;
  }
}

