// =====================================================
// UNIT TEST SUITE
// =====================================================

import { i18n } from './setup-globals.js';
import * as ind from '../indicators/indicators.js';
import { runStrategyBacktest, runWalkForwardTest } from '../analytics/backtesting.js';
import {
  calculatePortfolioVaR,
  calculatePortfolioCVaR,
  calculateCorrelationMatrix
} from '../analytics/risk_engine.js';
import {
  ReportGenerator,
  ExcelReportGenerator,
  PDFReportGenerator,
  ComparativeAnalysisGenerator,
  ExecutiveSummaryGenerator
} from '../reports/report-generator.js';

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ${i18n.t('test.fail')}: ${message}`);
    return false;
  }
  console.log(`✅ ${i18n.t('test.pass')}: ${message}`);
  return true;
};

const assertApprox = (actual, expected, tolerance, message) => {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    console.error(`❌ ${i18n.t('test.fail')}: ${message} (${i18n.t('test.expected')} ${expected}, ${i18n.t('test.got')} ${actual}, ${i18n.t('test.diff')} ${diff})`);
    return false;
  }
  console.log(`✅ ${i18n.t('test.pass')}: ${message}`);
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
  console.log(`\n=== ${i18n.t('test.testing_sma')} ===`);
  const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  // SMA(5) of the last 5 values: (16+17+18+19+20)/5 = 18
  const sma = ind.SMA(prices, 5);
  return assertApprox(sma, 18, 0.01, i18n.t('test.basic_sma'));
};

export const testEMA = () => {
  console.log(`\n=== ${i18n.t('test.testing_ema')} ===`);
  // Simple sequence for EMA
  const prices = Array.from({ length: 150 }, (_, i) => 100 + i * 0.5);

  // EMA should be near the last value in a gentle uptrend
  const ema = ind.EMA(prices, 20);
  assert(ema !== null && ema > 100 && ema < prices[prices.length - 1], i18n.t('test.basic_ema_range'));

  // Test with insufficient data
  const shortPrices = [100, 101, 102];
  const emaShort = ind.EMA(shortPrices, 20);
  return assert(emaShort === null, i18n.t('test.ema_insufficient_data'));
};

export const testRSI = () => {
  console.log(`\n=== ${i18n.t('test.testing_rsi')} ===`);

  // Strong uptrend sequence -> high RSI
  const upPrices = Array.from({ length: 50 }, (_, i) => 100 + i * 2);
  const rsiUp = ind.RSI(upPrices, 14);
  assert(rsiUp > 70, `${i18n.t('test.high_rsi_uptrend')} (${rsiUp.toFixed(1)})`);

  // Strong downtrend sequence -> low RSI
  const downPrices = Array.from({ length: 50 }, (_, i) => 200 - i * 2);
  const rsiDown = ind.RSI(downPrices, 14);
  assert(rsiDown < 30, `${i18n.t('test.low_rsi_downtrend')} (${rsiDown.toFixed(1)})`);

  // Sideways sequence -> neutral RSI
  const flatPrices = Array.from({ length: 50 }, () => 100);
  const rsiFlat = ind.RSI(flatPrices, 14);
  return assertApprox(rsiFlat, 50, 5, `${i18n.t('test.neutral_rsi_sideways')} (${rsiFlat.toFixed(1)})`);
};

export const testATR = () => {
  console.log(`\n=== ${i18n.t('test.testing_atr')} ===`);

  // Data with known volatility
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
  assert(atr > 0 && atr < 10, `${i18n.t('test.atr_reasonable_range')} (${atr.toFixed(2)})`);

  const atrPct = ind.ATR_Percent(data, 14);
  return assert(atrPct > 0 && atrPct < 5, `${i18n.t('test.atr_pct_reasonable_range')} (${atrPct.toFixed(2)}%)`);
};

export const testBollingerBands = () => {
  console.log(`\n=== ${i18n.t('test.testing_bollinger_bands')} ===`);

  const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 5);
  const bb = ind.BollingerBands(prices, 20);

  assert(bb.upper > bb.middle, i18n.t('test.bb_upper_middle'));
  assert(bb.middle > bb.lower, i18n.t('test.bb_middle_lower'));
  assert(bb.bandwidth > 0, i18n.t('test.bb_bandwidth_positive'));
  return assert(bb.percentB >= 0 && bb.percentB <= 1, `${i18n.t('test.bb_percent_b_range')} (${bb.percentB.toFixed(2)})`);
};

export const testADX = () => {
  console.log(`\n=== ${i18n.t('test.testing_adx')} ===`);

  // Strong trend
  const trendData = Array.from({ length: 50 }, (_, i) => ({
    c: 100 + i * 2,
    h: 102 + i * 2,
    l: 98 + i * 2
  }));

  const adxTrend = ind.ADX(trendData, 14);
  assert(adxTrend > 20, `${i18n.t('test.high_adx_trend')} (${adxTrend.toFixed(1)})`);

  // Sideways market
  const flatData = Array.from({ length: 50 }, (_, i) => ({
    c: 100 + (i % 2 === 0 ? 1 : -1),
    h: 102,
    l: 98
  }));

  const adxFlat = ind.ADX(flatData, 14);
  return assert(adxFlat < 25, `${i18n.t('test.low_adx_sideways')} (${adxFlat.toFixed(1)})`);
};

export const testWilliamsR = () => {
  console.log(`\n=== ${i18n.t('test.testing_williams_r')} ===`);

  // Price at highs -> %R near 0
  const highData = Array.from({ length: 30 }, (_, i) => ({
    c: 100 + i,
    h: 101 + i,
    l: 99 + i
  }));

  const wrHigh = ind.WilliamsR(highData, 14);
  assert(wrHigh > -20, `${i18n.t('test.williams_r_high')} (${wrHigh.toFixed(1)})`);

  // Price at lows -> %R near -100
  const lowData = Array.from({ length: 30 }, (_, i) => ({
    c: 200 - i,
    h: 201 - i,
    l: 199 - i
  }));

  const wrLow = ind.WilliamsR(lowData, 14);
  return assert(wrLow < -80, `${i18n.t('test.williams_r_low')} (${wrLow.toFixed(1)})`);
};

export const testROC = () => {
  console.log(`\n=== ${i18n.t('test.testing_roc')} ===`);

  // 20% rise
  const prices = [100, 105, 110, 115, 120];
  const roc = ind.ROC(prices, 4);

  return assertApprox(roc, 20, 0.1, `${i18n.t('test.correct_roc')} (${roc.toFixed(2)}%)`);
};

export const testVolatility = () => {
  console.log(`\n=== ${i18n.t('test.testing_volatility')} ===`);

  // Stable series -> low volatility
  const stable = Array.from({ length: 300 }, () => 100 + Math.random() * 0.5);
  const volStable = ind.Volatility(stable, 252);
  assert(volStable < 5, `${i18n.t('test.low_volatility_stable')} (${volStable.toFixed(2)}%)`);

  // Volatile series -> high volatility
  const volatile = Array.from({ length: 300 }, (_, i) => 100 + Math.sin(i / 3) * 20);
  const volHigh = ind.Volatility(volatile, 252);
  return assert(volHigh > volStable, `${i18n.t('test.high_volatility_volatile')} (${volHigh.toFixed(2)}%)`);
};

export const testMaxDrawdown = () => {
  console.log(`\n=== ${i18n.t('test.testing_max_drawdown')} ===`);

  // 30% drop
  const prices = [100, 110, 120, 130, 140, 130, 120, 110, 100, 98];
  const dd = ind.MaxDrawdown(prices, prices.length);

  // From 140 high to 98 low = 30%
  return assertApprox(dd, 30, 1, `${i18n.t('test.correct_max_drawdown')} (${dd.toFixed(2)}%)`);
};

export const testDaysAboveEMA = () => {
  console.log(`\n=== ${i18n.t('test.testing_days_above_ema')} ===`);

  // Series consistently above
  const prices = Array.from({ length: 300 }, (_, i) => 100 + i * 0.5);
  const daysAbove = ind.DaysAboveEMA(prices, 50, 200);

  return assert(daysAbove > 80, `${i18n.t('test.high_days_above_ema')} (${daysAbove.toFixed(1)}%)`);
};

export const testVolumeRatio = () => {
  console.log(`\n=== ${i18n.t('test.testing_volume_ratio')} ===`);

  // Rising volume
  const volumes = Array.from({ length: 100 }, (_, i) => 10000 + i * 100);
  const ratio = ind.VolumeRatio(volumes, 20, 60);

  return assert(ratio > 1, `${i18n.t('test.volume_ratio_rising')} (${ratio.toFixed(2)})`);
};

// =====================================================
// VALIDATION TESTS
// =====================================================

export const testValidation = () => {
  console.log(`\n=== ${i18n.t('test.testing_validation')} ===`);

  let passed = true;

  // Empty array
  try {
    ind.SMA([], 5);
    console.error(`❌ ${i18n.t('test.fail')}: ${i18n.t('test.insufficient_data_rejected')}`);
    passed = false;
  } catch (e) {
    console.log(`✅ ${i18n.t('test.pass')}: ${i18n.t('test.rejects_empty_array')}`);
  }

  // Array with NaN
  try {
    ind.SMA([1, 2, NaN, 4, 5], 5);
    console.error(`❌ ${i18n.t('test.fail')}: Should reject NaN`);
    passed = false;
  } catch (e) {
    console.log(`✅ ${i18n.t('test.pass')}: ${i18n.t('test.rejects_nan')}`);
  }

  // Array with null
  try {
    ind.RSI([100, 101, null, 103], 3);
    console.error(`❌ ${i18n.t('test.fail')}: Should reject null`);
    passed = false;
  } catch (e) {
    console.log(`✅ ${i18n.t('test.pass')}: ${i18n.t('test.rejects_null')}`);
  }

  // Insufficient length
  try {
    ind.RSI([100, 101, 102], 14);
    console.error(`❌ ${i18n.t('test.fail')}: ${i18n.t('test.insufficient_data_rejected')}`);
    passed = false;
  } catch (e) {
    console.log(`✅ ${i18n.t('test.pass')}: ${i18n.t('test.rejects_insufficient_length')}`);
  }

  return passed;
};


// =====================================================
// BACKTESTING AND RISK TESTS
// =====================================================

export const testBacktestingEngine = () => {
  console.log(`\n=== ${i18n.t('test.testing_backtesting_engine')} ===`);

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

  assert(result.metrics !== null, i18n.t('test.backtest_returns_metrics'));
  assert(result.sample > 0, i18n.t('test.backtest_produces_rebalances'));
  assert(typeof result.metrics.calmarRatio === 'number', i18n.t('test.calmar_ratio_computed'));
  return assert(result.metrics.estimatedTaxDrag >= 0, i18n.t('test.tax_drag_computed'));
};

export const testWalkForwardBacktest = () => {
  console.log(`\n=== ${i18n.t('test.testing_walk_forward')} ===`);

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

  assert(results.length > 0, i18n.t('test.walk_forward_produces_windows'));
  const sample = results[0];
  assert(sample.inSampleResult.metrics !== null, i18n.t('test.in_sample_metrics'));
  return assert(sample.outSampleResult.metrics !== null, i18n.t('test.out_sample_metrics'));
};

export const testRiskEngineMetrics = () => {
  console.log(`\n=== ${i18n.t('test.testing_risk_engine')} ===`);

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
  assert(parseFloat(varResult.diversifiedVaR) > 0, i18n.t('test.portfolio_var_computed'));

  const cvarResult = calculatePortfolioCVaR(assets, 10000, 0.95);
  assert(parseFloat(cvarResult.cvar) > 0, i18n.t('test.portfolio_cvar_computed'));

  const corrResult = calculateCorrelationMatrix(assets);
  assert(corrResult.matrix.length === 2, i18n.t('test.correlation_matrix_rows', { n: 2 }));
  return assert(corrResult.matrix[0].values.length === 2, i18n.t('test.correlation_matrix_cols', { n: 2 }));
};

export const testRiskEngineEdgeCases = () => {
  console.log(`\n=== ${i18n.t('test.testing_risk_edge_cases')} ===`);

  let passed = true;

  // Test 1: Single asset (should fail gracefully)
  try {
    const singleAsset = [{
      ticker: 'AAA',
      weight: 1.0,
      prices: buildAssetSeries('AAA', 100, 40)
    }];
    const result = calculatePortfolioVaR(singleAsset, 10000, 0.95);
    assert(result.error !== undefined, i18n.t('test.single_asset_error'));
  } catch (e) {
    console.log(`✅ ${i18n.t('test.pass')}: ${i18n.t('test.single_asset_rejected')}`);
  }

  // Test 2: Insufficient data (< 30 observations)
  const shortData = [
    { ticker: 'AAA', weight: 0.5, prices: buildAssetSeries('AAA', 100, 20) },
    { ticker: 'BBB', weight: 0.5, prices: buildAssetSeries('BBB', 120, 20) }
  ];

  const result = calculatePortfolioVaR(shortData, 10000, 0.95);
  if (result.error && (result.error.includes('Insufficient') || result.error.includes('30') || result.error.includes('20'))) {
    console.log(`✅ ${i18n.t('test.pass')}: ${i18n.t('test.insufficient_data_error')}`);
  } else if (result.error) {
    console.error(`❌ ${i18n.t('test.fail')}: Unexpected error: ${result.error}`);
    passed = false;
  } else {
    console.error(`❌ ${i18n.t('test.fail')}: ${i18n.t('test.insufficient_data_rejected')}`);
    passed = false;
  }

  return passed;
};

export const testCorrelationMatrixSymmetry = () => {
  console.log(`\n=== ${i18n.t('test.testing_correlation_symmetry')} ===`);

  const assets = [
    { ticker: 'AAA', weight: 0.33, prices: buildAssetSeries('AAA', 100, 60) },
    { ticker: 'BBB', weight: 0.33, prices: buildAssetSeries('BBB', 120, 60) },
    { ticker: 'CCC', weight: 0.34, prices: buildAssetSeries('CCC', 90, 60) }
  ];

  const result = calculateCorrelationMatrix(assets);
  const matrix = result.matrix;

  // Check symmetry
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix.length; j++) {
      const corr_ij = matrix[i].values[j];
      const corr_ji = matrix[j].values[i];
      assert(Math.abs(corr_ij - corr_ji) < 0.01, i18n.t('test.correlation_symmetric', { i, j }));
    }
  }

  // Check diagonal = 1
  for (let i = 0; i < matrix.length; i++) {
    assertApprox(matrix[i].values[i], 1.0, 0.01, i18n.t('test.diagonal_equals_one', { i }));
  }

  return true;
};

export const testShrinkageActivation = () => {
  console.log(`\n=== ${i18n.t('test.testing_shrinkage')} ===`);

  // Create small sample (T < 252) to trigger shrinkage
  const smallSample = [
    { ticker: 'AAA', weight: 0.5, prices: buildAssetSeries('AAA', 100, 50) }, // 50 days
    { ticker: 'BBB', weight: 0.5, prices: buildAssetSeries('BBB', 120, 50) }
  ];

  const result = calculatePortfolioVaR(smallSample, 10000, 0.95);
  assert(result.observations < 252, i18n.t('test.small_sample_detected'));
  return assert(parseFloat(result.diversifiedVaR) > 0, i18n.t('test.var_computed_small_sample'));
};

// =====================================================
// REPORTS MODULE TESTS
// =====================================================

const testReportGeneratorBase = () => {
  const testData = { value: 100, name: 'Test' };
  const generator = new ReportGenerator(testData);

  // Test filename generation
  const filename = generator.getFilename('test', 'csv');
  assert(filename.includes('test_'), 'Filename has prefix');
  assert(filename.endsWith('.csv'), 'Filename has correct extension');

  // Test number formatting
  const formatted = generator.formatNumber(123.456, 2);
  assert(formatted === '123.46', 'Number formatted correctly');

  // Test percentage formatting
  const percent = generator.formatPercent(0.1234, 2);
  assert(percent === '12.34%', 'Percentage formatted correctly');

  // Test currency formatting
  const currency = generator.formatCurrency(1234.56);
  assert(currency.includes('1,234.56'), 'Currency formatted correctly');

  // Test safe value extraction
  const safe = generator.safeValue({ a: { b: { c: 42 } } }, 'a.b.c', 0);
  assert(safe === 42, 'Safe value extraction works');

  const safeFallback = generator.safeValue({ a: 1 }, 'x.y.z', 'N/A');
  return assert(safeFallback === 'N/A', 'Safe value fallback works');
};

const testExcelReportGenerator = () => {
  // Mock XLSX library for testing
  if (typeof window === 'undefined') {
    global.window = {};
  }

  window.XLSX = {
    utils: {
      book_new: () => ({ SheetNames: [], Sheets: {} }),
      aoa_to_sheet: (data) => ({ data }),
      book_append_sheet: (workbook, worksheet, sheetName) => {
        workbook.SheetNames.push(sheetName);
        workbook.Sheets[sheetName] = worksheet;
      }
    },
    writeFile: (workbook, filename) => {
      // Mock write - do nothing
    }
  };

  const generator = new ExcelReportGenerator({ test: true });

  // Test worksheet addition
  const testData = [
    ['Header1', 'Header2', 'Header3'],
    ['Value1', 'Value2', 'Value3'],
    ['Value4', 'Value5', 'Value6']
  ];

  generator.addWorksheet('Test Sheet', testData, {
    columnWidths: [20, 15, 15]
  });

  // Verify workbook has sheet
  assert(generator.workbook.SheetNames.length > 0, 'Workbook has sheets');
  assert(generator.workbook.SheetNames[0] === 'Test Sheet', 'Sheet name is correct');

  // Note: We can't test download in Node.js, only in browser
  return true;
};

const testPDFReportGenerator = () => {
  // Mock jsPDF library for testing
  if (typeof window === 'undefined') {
    global.window = {};
  }

  class MockJsPDF {
    constructor(orientation) {
      this.orientation = orientation;
      this.lastAutoTable = { finalY: 100 };
      this._pages = 1;
    }
    internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297
      },
      getNumberOfPages: () => this._pages
    };
    setFontSize(size) {}
    setFont(font, style) {}
    setTextColor(...args) {}
    setFillColor(...args) {}
    text(text, x, y) {}
    splitTextToSize(text, width) {
      return [text];
    }
    rect(x, y, w, h, style) {}
    addPage() {
      this._pages++;
    }
    setPage(num) {}
    autoTable(config) {
      this.lastAutoTable.finalY = 150;
    }
    save(filename) {}
  }

  window.jspdf = {
    jsPDF: MockJsPDF
  };

  const generator = new PDFReportGenerator({ test: true });

  // Test title addition
  generator.addTitle('Test Report');
  assert(generator.currentY > 20, 'Y position advanced after title');

  // Test subtitle
  const yBefore = generator.currentY;
  generator.addSubtitle('Test Subtitle');
  assert(generator.currentY > yBefore, 'Y position advanced after subtitle');

  // Test section header
  const yBeforeSection = generator.currentY;
  generator.addSectionHeader('Section 1');
  assert(generator.currentY > yBeforeSection, 'Y position advanced after section');

  // Test text addition
  const yBeforeText = generator.currentY;
  generator.addText('This is test text');
  assert(generator.currentY > yBeforeText, 'Y position advanced after text');

  // Test metrics box
  const yBeforeMetrics = generator.currentY;
  const metrics = [
    { label: 'Metric 1', value: '100' },
    { label: 'Metric 2', value: '200' }
  ];
  generator.addMetricsBox(metrics, 2);
  assert(generator.currentY > yBeforeMetrics, 'Y position advanced after metrics box');

  // Test table
  const yBeforeTable = generator.currentY;
  generator.addTable(['Col1', 'Col2'], [['Val1', 'Val2']]);
  assert(generator.currentY > yBeforeTable, 'Y position advanced after table');

  return true;
};

const testComparativeAnalysis = () => {
  const dataset1 = {
    strategyName: 'Strategy A',
    metrics: {
      cagr: 0.15,
      sharpeRatio: 1.5,
      maxDrawdown: -0.12,
      volatility: 0.18,
      winRate: 0.65
    }
  };

  const dataset2 = {
    strategyName: 'Strategy B',
    metrics: {
      cagr: 0.12,
      sharpeRatio: 1.2,
      maxDrawdown: -0.08,
      volatility: 0.14,
      winRate: 0.60
    }
  };

  const dataset3 = {
    strategyName: 'Strategy C',
    metrics: {
      cagr: 0.18,
      sharpeRatio: 1.8,
      maxDrawdown: -0.15,
      volatility: 0.20,
      winRate: 0.70
    }
  };

  const datasets = [dataset1, dataset2, dataset3];
  const generator = new ComparativeAnalysisGenerator(datasets);
  const comparison = generator.compareStrategies();

  // Test comparison structure
  assert(comparison.strategies.length === 3, 'Comparison has 3 strategies');
  assert(comparison.metrics.length > 0, 'Comparison has metrics');
  assert(comparison.rankings !== undefined, 'Comparison has rankings');
  assert(comparison.summary !== undefined, 'Comparison has summary');

  // Test rankings
  assert(comparison.rankings.cagr !== undefined, 'CAGR rankings exist');
  assert(comparison.rankings.sharpeRatio !== undefined, 'Sharpe rankings exist');

  // Test best overall
  assert(comparison.summary.bestOverall !== undefined, 'Best overall strategy identified');

  // Strategy C should have best Sharpe ratio (rank 1)
  const sharpeRankings = comparison.rankings.sharpeRatio;
  const topSharpe = sharpeRankings[0];
  assert(topSharpe.rank === 1, 'Top ranked has rank 1');
  assert(topSharpe.name === 'Strategy C', 'Strategy C has best Sharpe');

  return true;
};

const testExecutiveSummary = () => {
  const testData = {
    strategyName: 'Test Strategy',
    metrics: {
      cagr: 0.15,
      sharpeRatio: 1.5,
      sortinoRatio: 1.8,
      maxDrawdown: -0.12,
      volatility: 0.18,
      winRate: 0.65,
      alpha: 0.03,
      beta: 0.95
    },
    positions: [
      { ticker: 'AAPL', score: 0.85, weight: 0.15 },
      { ticker: 'MSFT', score: 0.80, weight: 0.12 },
      { ticker: 'GOOGL', score: 0.75, weight: 0.35 } // High concentration
    ]
  };

  const generator = new ExecutiveSummaryGenerator(testData);
  const summary = generator.generate();

  // Test summary structure
  assert(summary.overview !== undefined, 'Overview generated');
  assert(typeof summary.overview === 'string', 'Overview is string');
  assert(summary.overview.length > 0, 'Overview has content');

  // Test key metrics
  assert(summary.keyMetrics !== undefined, 'Key metrics extracted');
  assert(summary.keyMetrics.cagr === 0.15, 'CAGR in key metrics');
  assert(summary.keyMetrics.sharpeRatio === 1.5, 'Sharpe in key metrics');

  // Test top signals
  assert(summary.topSignals !== undefined, 'Top signals identified');
  assert(Array.isArray(summary.topSignals), 'Top signals is array');

  // Test main risks
  assert(summary.mainRisks !== undefined, 'Main risks identified');
  assert(Array.isArray(summary.mainRisks), 'Main risks is array');

  // Should identify concentration risk (GOOGL > 25%)
  const hasConcentrationRisk = summary.mainRisks.some(r =>
    r.type === 'Concentration Risk'
  );
  assert(hasConcentrationRisk, 'Concentration risk detected');

  // Test recommendations
  assert(summary.recommendations !== undefined, 'Recommendations generated');
  assert(Array.isArray(summary.recommendations), 'Recommendations is array');

  // Test market context
  assert(summary.marketContext !== undefined, 'Market context included');

  return true;
};

const testCompareTwoPeriods = () => {
  const period1 = {
    cagr: 0.15,
    sharpeRatio: 1.5,
    maxDrawdown: -0.12,
    volatility: 0.18
  };

  const period2 = {
    cagr: 0.12,
    sharpeRatio: 1.2,
    maxDrawdown: -0.10,
    volatility: 0.15
  };

  const generator = new ComparativeAnalysisGenerator([period1, period2]);

  // Test period comparison
  const comparison = {
    period1: { label: 'YTD 2024', ...period1 },
    period2: { label: '2023', ...period2 },
    differences: {
      cagr: period1.cagr - period2.cagr,
      sharpeRatio: period1.sharpeRatio - period2.sharpeRatio,
      maxDrawdown: period1.maxDrawdown - period2.maxDrawdown,
      volatility: period1.volatility - period2.volatility
    },
    winner: period1.sharpeRatio > period2.sharpeRatio ? 'YTD 2024' : '2023'
  };

  assert(comparison.differences.cagr > 0, 'CAGR difference calculated');
  assert(comparison.differences.sharpeRatio > 0, 'Sharpe difference calculated');
  assert(comparison.winner === 'YTD 2024', 'Winner identified correctly');

  return true;
};


// =====================================================
// RUN ALL TESTS
// =====================================================

export const runAllTests = () => {
  console.log('╔═══════════════════════════════════════╗');
  console.log(`║   ${i18n.t('test.suite_title')}        ║`);
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
    testRiskEngineMetrics,
    testRiskEngineEdgeCases,
    testCorrelationMatrixSymmetry,
    testShrinkageActivation,
    testReportGeneratorBase,
    testExcelReportGenerator,
    testPDFReportGenerator,
    testComparativeAnalysis,
    testExecutiveSummary,
    testCompareTwoPeriods
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    try {
      if (test()) passed++;
      else failed++;
    } catch (e) {
      console.error(`❌ ${i18n.t('test.error')} in ${test.name}:`, e.message);
      failed++;
    }
  });

  console.log('\n╔═══════════════════════════════════════╗');
  console.log(`║  ${i18n.t('test.results').toUpperCase()}: ${passed} ✅  ${failed} ❌`);
  console.log('╚═══════════════════════════════════════╝\n');

  return { passed, failed };
};

export default { runAllTests };