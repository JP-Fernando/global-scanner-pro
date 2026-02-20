// =====================================================
// LIBRERIA DE INDICADORES TECNICOS CON VALIDACION
// =====================================================

/** OHLC bar used by indicator functions. `h` and `l` are optional (fallback to `c`). */
export interface OHLCBar {
  o?: number;
  h?: number;
  l?: number;
  c: number;
  v?: number;
}

/** Bollinger Bands result shape */
export interface BollingerBandsOutput {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number;
}

// Validacion de entrada
const validateArray = (arr: unknown[], minLength: number, name: string = 'array'): true => {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error(`${name} debe ser un array no vacio`);
  }
  if (arr.length < minLength) {
    throw new Error(`${name} requiere al menos ${minLength} elementos, tiene ${arr.length}`);
  }
  if (arr.some(v => v === null || v === undefined)) {
    throw new Error(`${name} contiene valores nulos o NaN`);
  }
  if (arr.some(v => typeof v === 'number' && Number.isNaN(v))) {
    throw new Error(`${name} contiene valores nulos o NaN`);
  }
  return true;
};

// Simple Moving Average
export const SMA = (arr: number[], period: number): number => {
  validateArray(arr, period, 'SMA input');
  return arr.slice(-period).reduce((a: number, b: number) => a + b, 0) / period;
};

// Exponential Moving Average
export const EMA = (prices: number[], period: number, warmupMultiplier: number = 5): number | null => {
  const warmup: number = period * warmupMultiplier;
  validateArray(prices, 1, 'EMA input');
  if (prices.length < warmup + 1) {
    return null;
  }
  const sliced: number[] = prices.slice(prices.length - warmup);
  let ema: number = SMA(sliced.slice(0, period), period);
  const k: number = 2 / (period + 1);

  for (let i = period; i < sliced.length; i++) {
    ema = sliced[i] * k + ema * (1 - k);
  }

  return ema;
};

// EMA Array completo (para analisis de consistencia)
export const EMA_Array = (prices: number[], period: number): number[] => {
  validateArray(prices, period + 1, 'EMA_Array input');
  const k: number = 2 / (period + 1);
  const emaArr: number[] = new Array(prices.length);
  emaArr[0] = prices[0];
  for (let i = 1; i < prices.length; i++) {
    emaArr[i] = prices[i] * k + emaArr[i - 1] * (1 - k);
  }
  return emaArr;
};

// Relative Strength Index
export const RSI = (prices: number[], period: number = 14): number => {
  validateArray(prices, period + 1, 'RSI input');
  let gains: number = 0, losses: number = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change: number = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain: number = gains / period;
  const avgLoss: number = losses / period;
  if (avgGain === 0 && avgLoss === 0) {
    return 50;
  }
  const safeAvgLoss: number = avgLoss || 1e-10;
  const rs: number = avgGain / safeAvgLoss;

  return 100 - (100 / (1 + rs));
};

// Average True Range
export const ATR = (data: OHLCBar[], period: number = 14): number => {
  validateArray(data, period + 1, 'ATR input');

  const tr: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const high: number = data[i].h || data[i].c;
    const low: number = data[i].l || data[i].c;
    const prevClose: number = data[i - 1].c;
    tr.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  return SMA(tr.slice(-period), period);
};

// ATR como porcentaje del precio
export const ATR_Percent = (data: OHLCBar[], period: number = 14): number => {
  const atr: number = ATR(data, period);
  const lastPrice: number = data[data.length - 1].c;
  return (atr / lastPrice) * 100;
};

// Bollinger Bands
export const BollingerBands = (prices: number[], period: number = 20, stdDevMultiplier: number = 2): BollingerBandsOutput => {
  validateArray(prices, period, 'BollingerBands input');

  const slice: number[] = prices.slice(-period);
  const sma: number = SMA(slice, period);
  const variance: number = slice.reduce((sum: number, price: number) => sum + Math.pow(price - sma, 2), 0) / period;
  const stdDev: number = Math.sqrt(variance);

  return {
    upper: sma + (stdDevMultiplier * stdDev),
    middle: sma,
    lower: sma - (stdDevMultiplier * stdDev),
    bandwidth: (4 * stdDev) / sma * 100,
    percentB:
      ((prices[prices.length - 1] - (sma - stdDevMultiplier * stdDev)) / (4 * stdDev)) || 0.5
  };
};

// Average Directional Index
export const ADX = (data: OHLCBar[], period: number = 14): number => {
  validateArray(data, period + 1, 'ADX input');

  let plusDM: number = 0, minusDM: number = 0, trSum: number = 0;

  for (let i = data.length - period; i < data.length - 1; i++) {
    const highDiff: number = (data[i + 1].h || data[i + 1].c) - (data[i].h || data[i].c);
    const lowDiff: number = (data[i].l || data[i].c) - (data[i + 1].l || data[i + 1].c);

    if (highDiff > lowDiff && highDiff > 0) plusDM += highDiff;
    if (lowDiff > highDiff && lowDiff > 0) minusDM += lowDiff;

    const high: number = data[i + 1].h || data[i + 1].c;
    const low: number = data[i + 1].l || data[i + 1].c;
    const prevClose: number = data[i].c;
    trSum += Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  }

  const avgTR: number = trSum / period;
  const plusDI: number = avgTR === 0 ? 0 : (plusDM / avgTR) * 100;
  const minusDI: number = avgTR === 0 ? 0 : (minusDM / avgTR) * 100;
  const total: number = plusDI + minusDI;

  return total === 0 ? 0 : (Math.abs(plusDI - minusDI) / total) * 100;
};

// Williams %R
export const WilliamsR = (data: OHLCBar[], period: number = 14): number => {
  validateArray(data, period, 'WilliamsR input');

  const slice: OHLCBar[] = data.slice(-period);
  const highest: number = Math.max(...slice.map((d: OHLCBar) => d.h || d.c));
  const lowest: number = Math.min(...slice.map((d: OHLCBar) => d.l || d.c));
  const close: number = data[data.length - 1].c;

  return highest === lowest ? -50 : ((highest - close) / (highest - lowest)) * -100;
};

// Rate of Change
export const ROC = (prices: number[], period: number): number => {
  validateArray(prices, period + 1, 'ROC input');
  const current: number = prices[prices.length - 1];
  const past: number = prices[prices.length - 1 - period];
  return ((current / past) - 1) * 100;
};

// Volatilidad anualizada
export const Volatility = (prices: number[], period: number = 252): number => {
  validateArray(prices, period + 1, 'Volatility input');

  const returns: number[] = [];
  for (let i = prices.length - period; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }

  const mean: number = returns.reduce((a: number, b: number) => a + b, 0) / returns.length;
  const variance: number = returns.reduce((sum: number, r: number) => sum + Math.pow(r - mean, 2), 0) / returns.length;

  return Math.sqrt(variance * 252) * 100;
};

// Drawdown maximo desde el maximo en periodo
export const MaxDrawdown = (prices: number[], period: number = 252): number => {
  validateArray(prices, Math.min(period, prices.length), 'MaxDrawdown input');

  const slice: number[] = prices.slice(-Math.min(period, prices.length));
  let maxPrice: number = slice[0];
  let maxDD: number = 0;

  for (let i = 1; i < slice.length; i++) {
    if (slice[i] > maxPrice) {
      maxPrice = slice[i];
    } else {
      const dd: number = ((maxPrice - slice[i]) / maxPrice) * 100;
      if (dd > maxDD) maxDD = dd;
    }
  }

  return maxDD;
};

// Dias por encima de EMA
export const DaysAboveEMA = (prices: number[], emaPeriod: number, lookback: number = 200): number => {
  validateArray(prices, emaPeriod + lookback, 'DaysAboveEMA input');

  const emaArray: number[] = EMA_Array(prices, emaPeriod);
  const startIdx: number = emaArray.length - lookback;
  let daysAbove: number = 0;

  for (let i = 0; i < lookback; i++) {
    if (prices[prices.length - lookback + i] > emaArray[startIdx + i]) {
      daysAbove++;
    }
  }

  return (daysAbove / lookback) * 100;
};

// Volume Ratio
export const VolumeRatio = (volumes: number[], shortPeriod: number = 20, longPeriod: number = 60): number => {
  validateArray(volumes, longPeriod, 'VolumeRatio input');

  const avgShort: number = SMA(volumes.slice(-shortPeriod), shortPeriod);
  const avgLong: number = SMA(volumes.slice(-longPeriod), longPeriod);

  return avgShort / avgLong;
};

export default {
  SMA, EMA, EMA_Array, RSI, ATR, ATR_Percent,
  BollingerBands, ADX, WilliamsR, ROC,
  Volatility, MaxDrawdown, DaysAboveEMA, VolumeRatio,
  validateArray
};
