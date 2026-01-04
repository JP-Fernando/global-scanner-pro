// =====================================================
// SUITE DE TESTS UNITARIOS
// =====================================================

import './setup-globals.js';
import * as ind from '../indicators/indicators.js';
import { runStrategyBacktest, runWalkForwardTest } from '../analytics/backtesting.js';
import {
  calculatePortfolioVaR,
  calculatePortfolioCVaR,
  calculateCorrelationMatrix
} from '../analytics/risk_engine.js';

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    return false;
  }
  console.log(`✅ PASS: ${message}`);
  return true;
};

const assertApprox = (actual, expected, tolerance, message) => {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    console.error(`❌ FAIL: ${message} (expected ${expected}, got ${actual}, diff ${diff})`);
    return false;
  }
  console.log(`✅ PASS: ${message}`);
  return true;
};


const buildPriceSeries = (startPrice, days, step = 0.4) => {
  return Array.from({ length: days }, (_, i) => startPrice + i * step);
};

const buildAssetSeries = (ticker, startPrice, days) => {
  const prices = buildPriceSeries(startPrice, days);
  return prices.map((close, i) => ({
    date: `2023-01-${String(i + 1).padStart(2, '0')}`,
    close,
    high: close + 1,
    low: close - 1,
    volume: 10000 + i * 50
  }));
};

const buildBacktestUniverse = () => ([
  {
    ticker: 'AAA',
    name: 'Asset AAA',
    data: buildAssetSeries('AAA', 100, 80)
  },
  {
    ticker: 'BBB',
    name: 'Asset BBB',
    data: buildAssetSeries('BBB', 120, 80)
  }
]);

const buildStrategyConfig = () => ({
  name: 'Test Strategy',
  weights: {
    trend: 0.3,
    momentum: 0.3,
    risk: 0.2,
    liquidity: 0.2
  },
  indicators: {
    ema_short: 5,
    ema_medium: 8,
    ema_long: 13,
    rsi_period: 14,
    atr_period: 14,
    bb_period: 20,
    adx_period: 14,
    williams_period: 14,
    roc_short: 10,
    roc_long: 20
  },
  filters: {
    min_volume_20d: 5000,
    min_volume_60d: 3000,
    max_atr_pct: 40,
    min_days_history: 15,
    max_drawdown_52w: 90
  }
});


// =====================================================
// TESTS DE INDICADORES
// =====================================================

export const testSMA = () => {
  console.log('\n=== Testing SMA ===');
  const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  // SMA(5) de los últimos 5 valores: (16+17+18+19+20)/5 = 18
  const sma = ind.SMA(prices, 5);
  return assertApprox(sma, 18, 0.01, 'SMA cálculo básico');
};

export const testEMA = () => {
  console.log('\n=== Testing EMA ===');
  // Secuencia simple para EMA
  const prices = Array.from({ length: 150 }, (_, i) => 100 + i * 0.5);

  // EMA debe estar cerca del último valor en tendencia alcista suave
  const ema = ind.EMA(prices, 20);
  assert(ema !== null && ema > 100 && ema < prices[prices.length - 1], 'EMA básico en rango esperado');

  // Test con datos insuficientes
  const shortPrices = [100, 101, 102];
  const emaShort = ind.EMA(shortPrices, 20);
  return assert(emaShort === null, 'EMA retorna null con datos insuficientes');
};

export const testRSI = () => {
  console.log('\n=== Testing RSI ===');

  // Secuencia alcista fuerte -> RSI alto
  const upPrices = Array.from({ length: 50 }, (_, i) => 100 + i * 2);
  const rsiUp = ind.RSI(upPrices, 14);
  assert(rsiUp > 70, `RSI alto en tendencia alcista (${rsiUp.toFixed(1)})`);

  // Secuencia bajista fuerte -> RSI bajo
  const downPrices = Array.from({ length: 50 }, (_, i) => 200 - i * 2);
  const rsiDown = ind.RSI(downPrices, 14);
  assert(rsiDown < 30, `RSI bajo en tendencia bajista (${rsiDown.toFixed(1)})`);

  // Secuencia lateral -> RSI neutral
  const flatPrices = Array.from({ length: 50 }, () => 100);
  const rsiFlat = ind.RSI(flatPrices, 14);
  return assertApprox(rsiFlat, 50, 5, `RSI neutral en tendencia lateral (${rsiFlat.toFixed(1)})`);
};

export const testATR = () => {
  console.log('\n=== Testing ATR ===');

  // Datos con volatilidad conocida
  const data = [
    { c: 100, h: 102, l: 98 },
    { c: 101, h: 103, l: 99 },
    { c: 102, h: 104, l: 100 },
    { c: 103, h: 105, l: 101 },
    { c: 104, h: 106, l: 102 },
    { c: 105, h: 107, l: 103 },
    { c: 106, h: 108, l: 104 },
    { c: 107, h: 109, l: 105 },
    { c: 108, h: 110, l: 106 },
    { c: 109, h: 111, l: 107 },
    { c: 110, h: 112, l: 108 },
    { c: 111, h: 113, l: 109 },
    { c: 112, h: 114, l: 110 },
    { c: 113, h: 115, l: 111 },
    { c: 114, h: 116, l: 112 }
  ];

  const atr = ind.ATR(data, 14);
  assert(atr > 0 && atr < 10, `ATR en rango razonable (${atr.toFixed(2)})`);

  const atrPct = ind.ATR_Percent(data, 14);
  return assert(atrPct > 0 && atrPct < 5, `ATR% en rango razonable (${atrPct.toFixed(2)}%)`);
};

export const testBollingerBands = () => {
  console.log('\n=== Testing Bollinger Bands ===');

  const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 5);
  const bb = ind.BollingerBands(prices, 20);

  assert(bb.upper > bb.middle, 'BB upper > middle');
  assert(bb.middle > bb.lower, 'BB middle > lower');
  assert(bb.bandwidth > 0, 'BB bandwidth positivo');
  return assert(bb.percentB >= 0 && bb.percentB <= 1, `BB %B en rango [0,1] (${bb.percentB.toFixed(2)})`);
};

export const testADX = () => {
  console.log('\n=== Testing ADX ===');

  // Tendencia fuerte
  const trendData = Array.from({ length: 50 }, (_, i) => ({
    c: 100 + i * 2,
    h: 102 + i * 2,
    l: 98 + i * 2
  }));

  const adxTrend = ind.ADX(trendData, 14);
  assert(adxTrend > 20, `ADX alto en tendencia fuerte (${adxTrend.toFixed(1)})`);

  // Mercado lateral
  const flatData = Array.from({ length: 50 }, (_, i) => ({
    c: 100 + (i % 2 === 0 ? 1 : -1),
    h: 102,
    l: 98
  }));

  const adxFlat = ind.ADX(flatData, 14);
  return assert(adxFlat < 25, `ADX bajo en mercado lateral (${adxFlat.toFixed(1)})`);
};

export const testWilliamsR = () => {
  console.log('\n=== Testing Williams %R ===');

  // Precio en máximos -> %R cerca de 0
  const highData = Array.from({ length: 30 }, (_, i) => ({
    c: 100 + i,
    h: 101 + i,
    l: 99 + i
  }));

  const wrHigh = ind.WilliamsR(highData, 14);
  assert(wrHigh > -20, `Williams %R alto en máximos (${wrHigh.toFixed(1)})`);

  // Precio en mínimos -> %R cerca de -100
  const lowData = Array.from({ length: 30 }, (_, i) => ({
    c: 200 - i,
    h: 201 - i,
    l: 199 - i
  }));

  const wrLow = ind.WilliamsR(lowData, 14);
  return assert(wrLow < -80, `Williams %R bajo en mínimos (${wrLow.toFixed(1)})`);
};

export const testROC = () => {
  console.log('\n=== Testing ROC ===');

  // Subida del 20%
  const prices = [100, 105, 110, 115, 120];
  const roc = ind.ROC(prices, 4);

  return assertApprox(roc, 20, 0.1, `ROC correcto (${roc.toFixed(2)}%)`);
};

export const testVolatility = () => {
  console.log('\n=== Testing Volatility ===');

  // Serie estable -> volatilidad baja
  const stable = Array.from({ length: 300 }, () => 100 + Math.random() * 0.5);
  const volStable = ind.Volatility(stable, 252);
  assert(volStable < 5, `Volatilidad baja en serie estable (${volStable.toFixed(2)}%)`);

  // Serie volátil -> volatilidad alta
  const volatile = Array.from({ length: 300 }, (_, i) => 100 + Math.sin(i / 3) * 20);
  const volHigh = ind.Volatility(volatile, 252);
  return assert(volHigh > volStable, `Volatilidad alta en serie volátil (${volHigh.toFixed(2)}%)`);
};

export const testMaxDrawdown = () => {
  console.log('\n=== Testing Max Drawdown ===');

  // Caída del 30%
  const prices = [100, 110, 120, 130, 140, 130, 120, 110, 100, 98];
  const dd = ind.MaxDrawdown(prices, prices.length);

  // Desde máximo 140 a mínimo 98 = 30%
  return assertApprox(dd, 30, 1, `Max Drawdown correcto (${dd.toFixed(2)}%)`);
};

export const testDaysAboveEMA = () => {
  console.log('\n=== Testing Days Above EMA ===');

  // Serie constantemente por encima
  const prices = Array.from({ length: 300 }, (_, i) => 100 + i * 0.5);
  const daysAbove = ind.DaysAboveEMA(prices, 50, 200);

  return assert(daysAbove > 80, `Días por encima EMA alto en tendencia alcista (${daysAbove.toFixed(1)}%)`);
};

export const testVolumeRatio = () => {
  console.log('\n=== Testing Volume Ratio ===');

  // Volumen creciente
  const volumes = Array.from({ length: 100 }, (_, i) => 10000 + i * 100);
  const ratio = ind.VolumeRatio(volumes, 20, 60);

  return assert(ratio > 1, `Volume Ratio > 1 con volumen creciente (${ratio.toFixed(2)})`);
};

// =====================================================
// TESTS DE VALIDACIÓN
// =====================================================

export const testValidation = () => {
  console.log('\n=== Testing Validation ===');

  let passed = true;

  // Array vacío
  try {
    ind.SMA([], 5);
    console.error('❌ FAIL: Debería rechazar array vacío');
    passed = false;
  } catch (e) {
    console.log('✅ PASS: Rechaza array vacío');
  }

  // Array con NaN
  try {
    ind.SMA([1, 2, NaN, 4, 5], 5);
    console.error('❌ FAIL: Debería rechazar NaN');
    passed = false;
  } catch (e) {
    console.log('✅ PASS: Rechaza valores NaN');
  }

  // Array con null
  try {
    ind.RSI([100, 101, null, 103], 3);
    console.error('❌ FAIL: Debería rechazar null');
    passed = false;
  } catch (e) {
    console.log('✅ PASS: Rechaza valores null');
  }

  // Longitud insuficiente
  try {
    ind.RSI([100, 101, 102], 14);
    console.error('❌ FAIL: Debería rechazar longitud insuficiente');
    passed = false;
  } catch (e) {
    console.log('✅ PASS: Rechaza longitud insuficiente');
  }

  return passed;
};


// =====================================================
// TESTS DE BACKTESTING Y RIESGO
// =====================================================

export const testBacktestingEngine = () => {
  console.log('\n=== Testing Backtesting Engine ===');

  const universeData = buildBacktestUniverse();
  const strategyConfig = buildStrategyConfig();
  const benchmarkPrices = universeData[0].data.map(point => point.close);

  const result = runStrategyBacktest({
    strategyKey: 'test_strategy',
    strategyConfig,
    universeData,
    topN: 1,
    rebalanceEvery: 5,
    allocationMethod: 'equal_weight',
    benchmarkPrices
  });

  assert(result.metrics !== null, 'Backtest returns metrics');
  assert(result.sample > 0, 'Backtest produces rebalances');
  assert(typeof result.metrics.calmarRatio === 'number', 'Calmar ratio computed');
  return assert(result.metrics.estimatedTaxDrag >= 0, 'Tax drag computed');
};

export const testWalkForwardBacktest = () => {
  console.log('\n=== Testing Walk-Forward Backtest ===');

  const universeData = buildBacktestUniverse();
  const strategyConfig = buildStrategyConfig();

  const results = runWalkForwardTest({
    universeData,
    strategyConfig,
    topN: 1,
    rebalanceEvery: 5,
    allocationMethod: 'equal_weight',
    params: {
      inSamplePeriod: 40,
      outSamplePeriod: 30,
      stepSize: 10
    }
  });

  assert(results.length > 0, 'Walk-forward produces windows');
  const sample = results[0];
  assert(sample.inSampleResult.metrics !== null, 'In-sample metrics computed');
  return assert(sample.outSampleResult.metrics !== null, 'Out-sample metrics computed');
};

export const testRiskEngineMetrics = () => {
  console.log('\n=== Testing Risk Engine Metrics ===');

  const assetA = buildAssetSeries('AAA', 100, 40).map(point => ({
    date: point.date,
    close: point.close
  }));
  const assetB = buildAssetSeries('BBB', 120, 40).map(point => ({
    date: point.date,
    close: point.close
  }));

  const assets = [
    { ticker: 'AAA', weight: 0.6, prices: assetA },
    { ticker: 'BBB', weight: 0.4, prices: assetB }
  ];

  const varResult = calculatePortfolioVaR(assets, 10000, 0.95);
  assert(parseFloat(varResult.diversifiedVaR) > 0, 'Portfolio VaR computed');

  const cvarResult = calculatePortfolioCVaR(assets, 10000, 0.95);
  assert(parseFloat(cvarResult.cvar) > 0, 'Portfolio CVaR computed');

  const corrResult = calculateCorrelationMatrix(assets);
  assert(corrResult.matrix.length === 2, 'Correlation matrix has 2 rows');
  return assert(corrResult.matrix[0].values.length === 2, 'Correlation matrix has 2 columns');
};


// =====================================================
// EJECUTAR TODOS LOS TESTS
// =====================================================

export const runAllTests = () => {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   SUITE DE TESTS - GLOBAL SCANNER    ║');
  console.log('╚═══════════════════════════════════════╝');

  const tests = [
    testSMA,
    testEMA,
    testRSI,
    testATR,
    testBollingerBands,
    testADX,
    testWilliamsR,
    testROC,
    testVolatility,
    testMaxDrawdown,
    testDaysAboveEMA,
    testVolumeRatio,
    testValidation,
    testBacktestingEngine,
    testWalkForwardBacktest,
    testRiskEngineMetrics
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    try {
      if (test()) passed++;
      else failed++;
    } catch (e) {
      console.error(`❌ ERROR en ${test.name}:`, e.message);
      failed++;
    }
  });

  console.log('\n╔═══════════════════════════════════════╗');
  console.log(`║  RESULTADOS: ${passed} ✅  ${failed} ❌`);
  console.log('╚═══════════════════════════════════════╝\n');

  return { passed, failed };
};

export default { runAllTests };
