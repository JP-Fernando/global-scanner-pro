/**
 * Benchmark: Technical Indicators
 *
 * Measures throughput of individual indicator calculations
 * on datasets of 500 and 1000 data points.
 */
import { bench, describe } from 'vitest';
import {
  SMA, EMA, EMA_Array, RSI, ATR, BollingerBands,
  ADX, WilliamsR, ROC, Volatility, MaxDrawdown,
  DaysAboveEMA, VolumeRatio,
} from '../../../indicators/indicators.js';
import { buildPriceSeries } from '../../helpers.js';

const prices500 = buildPriceSeries(100, 500, 0.3);
const prices1000 = buildPriceSeries(100, 1000, 0.3);
const volumes500 = Array.from({ length: 500 }, (_, i) => 50000 + i * 100);
const ohlc500 = prices500.map((c) => ({ c, h: c * 1.01, l: c * 0.99 }));
const ohlc1000 = prices1000.map((c) => ({ c, h: c * 1.01, l: c * 0.99 }));

describe('Indicators (500 data points)', () => {
  bench('SMA(20)', () => { SMA(prices500, 20); });
  bench('EMA(50)', () => { EMA(prices500, 50); });
  bench('EMA_Array(20)', () => { EMA_Array(prices500, 20); });
  bench('RSI(14)', () => { RSI(prices500, 14); });
  bench('ATR(14)', () => { ATR(ohlc500, 14); });
  bench('BollingerBands(20)', () => { BollingerBands(prices500, 20); });
  bench('ADX(14)', () => { ADX(ohlc500, 14); });
  bench('WilliamsR(14)', () => { WilliamsR(ohlc500, 14); });
  bench('ROC(20)', () => { ROC(prices500, 20); });
  bench('Volatility(252)', () => { Volatility(prices500, 252); });
  bench('MaxDrawdown(252)', () => { MaxDrawdown(prices500, 252); });
  bench('DaysAboveEMA(50)', () => { DaysAboveEMA(prices500, 50, 200); });
  bench('VolumeRatio(20,60)', () => { VolumeRatio(volumes500, 20, 60); });
});

describe('Indicators (1000 data points)', () => {
  bench('SMA(20)', () => { SMA(prices1000, 20); });
  bench('RSI(14)', () => { RSI(prices1000, 14); });
  bench('ADX(14)', () => { ADX(ohlc1000, 14); });
  bench('Volatility(252)', () => { Volatility(prices1000, 252); });
  bench('MaxDrawdown(252)', () => { MaxDrawdown(prices1000, 252); });
});
