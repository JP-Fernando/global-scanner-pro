// =====================================================
// LIBRERÍA DE INDICADORES TÉCNICOS CON VALIDACIÓN
// =====================================================

// Validación de entrada
const validateArray = (arr, minLength, name = 'array') => {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error(`${name} debe ser un array no vacío`);
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
export const SMA = (arr, period) => {
  validateArray(arr, period, 'SMA input');
  return arr.slice(-period).reduce((a, b) => a + b, 0) / period;
};

// Exponential Moving Average
export const EMA = (prices, period, warmupMultiplier = 5) => {
  const warmup = period * warmupMultiplier;
  validateArray(prices, 1, 'EMA input');
  if (prices.length < warmup + 1) {
    return null;
  }
  const sliced = prices.slice(prices.length - warmup);
  let ema = SMA(sliced.slice(0, period), period);
  const k = 2 / (period + 1);

  for (let i = period; i < sliced.length; i++) {
    ema = sliced[i] * k + ema * (1 - k);
  }

  return ema;
};

// EMA Array completo (para análisis de consistencia)
export const EMA_Array = (prices, period) => {
  validateArray(prices, period + 1, 'EMA_Array input');
  const k = 2 / (period + 1);
  const emaArr = new Array(prices.length);
  emaArr[0] = prices[0];
  for (let i = 1; i < prices.length; i++) {
    emaArr[i] = prices[i] * k + emaArr[i - 1] * (1 - k);
  }
  return emaArr;
};

// Relative Strength Index
export const RSI = (prices, period = 14) => {
  validateArray(prices, period + 1, 'RSI input');
  let gains = 0, losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgGain === 0 && avgLoss === 0) {
    return 50;
  }
  const safeAvgLoss = avgLoss || 1e-10;
  const rs = avgGain / safeAvgLoss;
  
  return 100 - (100 / (1 + rs));
};

// Average True Range
export const ATR = (data, period = 14) => {
  validateArray(data, period + 1, 'ATR input');

  const tr = [];
  for (let i = 1; i < data.length; i++) {
    const high = data[i].h || data[i].c;
    const low = data[i].l || data[i].c;
    const prevClose = data[i - 1].c;
    tr.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  return SMA(tr.slice(-period), period);
};

// ATR como porcentaje del precio
export const ATR_Percent = (data, period = 14) => {
  const atr = ATR(data, period);
  const lastPrice = data[data.length - 1].c;
  return (atr / lastPrice) * 100;
};

// Bollinger Bands
export const BollingerBands = (prices, period = 20, stdDevMultiplier = 2) => {
  validateArray(prices, period, 'BollingerBands input');

  const slice = prices.slice(-period);
  const sma = SMA(slice, period);
  const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: sma + (stdDevMultiplier * stdDev),
    middle: sma,
    lower: sma - (stdDevMultiplier * stdDev),
    bandwidth: (4 * stdDev) / sma * 100,
    percentB: ((prices[prices.length - 1] - (sma - stdDevMultiplier * stdDev)) / (4 * stdDev)) || 0.5
  };
};

// Average Directional Index
export const ADX = (data, period = 14) => {
  validateArray(data, period + 1, 'ADX input');

  let plusDM = 0, minusDM = 0, trSum = 0;

  for (let i = data.length - period; i < data.length - 1; i++) {
    const highDiff = (data[i + 1].h || data[i + 1].c) - (data[i].h || data[i].c);
    const lowDiff = (data[i].l || data[i].c) - (data[i + 1].l || data[i + 1].c);

    if (highDiff > lowDiff && highDiff > 0) plusDM += highDiff;
    if (lowDiff > highDiff && lowDiff > 0) minusDM += lowDiff;

    const high = data[i + 1].h || data[i + 1].c;
    const low = data[i + 1].l || data[i + 1].c;
    const prevClose = data[i].c;
    trSum += Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  }

  const avgTR = trSum / period;
  const plusDI = avgTR === 0 ? 0 : (plusDM / avgTR) * 100;
  const minusDI = avgTR === 0 ? 0 : (minusDM / avgTR) * 100;
  const total = plusDI + minusDI;

  return total === 0 ? 0 : (Math.abs(plusDI - minusDI) / total) * 100;
};

// Williams %R
export const WilliamsR = (data, period = 14) => {
  validateArray(data, period, 'WilliamsR input');

  const slice = data.slice(-period);
  const highest = Math.max(...slice.map(d => d.h || d.c));
  const lowest = Math.min(...slice.map(d => d.l || d.c));
  const close = data[data.length - 1].c;

  return highest === lowest ? -50 : ((highest - close) / (highest - lowest)) * -100;
};

// Rate of Change
export const ROC = (prices, period) => {
  validateArray(prices, period + 1, 'ROC input');
  const current = prices[prices.length - 1];
  const past = prices[prices.length - 1 - period];
  return ((current / past) - 1) * 100;
};

// Volatilidad anualizada
export const Volatility = (prices, period = 252) => {
  validateArray(prices, period + 1, 'Volatility input');

  const returns = [];
  for (let i = prices.length - period; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

  return Math.sqrt(variance * 252) * 100;
};

// Drawdown máximo desde el máximo en periodo
export const MaxDrawdown = (prices, period = 252) => {
  validateArray(prices, Math.min(period, prices.length), 'MaxDrawdown input');

  const slice = prices.slice(-Math.min(period, prices.length));
  let maxPrice = slice[0];
  let maxDD = 0;

  for (let i = 1; i < slice.length; i++) {
    if (slice[i] > maxPrice) {
      maxPrice = slice[i];
    } else {
      const dd = ((maxPrice - slice[i]) / maxPrice) * 100;
      if (dd > maxDD) maxDD = dd;
    }
  }

  return maxDD;
};

// Días por encima de EMA
export const DaysAboveEMA = (prices, emaPeriod, lookback = 200) => {
  validateArray(prices, emaPeriod + lookback, 'DaysAboveEMA input');

  const emaArray = EMA_Array(prices, emaPeriod);
  const startIdx = emaArray.length - lookback;
  let daysAbove = 0;

  for (let i = 0; i < lookback; i++) {
    if (prices[prices.length - lookback + i] > emaArray[startIdx + i]) {
      daysAbove++;
    }
  }

  return (daysAbove / lookback) * 100;
};

// Volume Ratio
export const VolumeRatio = (volumes, shortPeriod = 20, longPeriod = 60) => {
  validateArray(volumes, longPeriod, 'VolumeRatio input');

  const avgShort = SMA(volumes.slice(-shortPeriod), shortPeriod);
  const avgLong = SMA(volumes.slice(-longPeriod), longPeriod);

  return avgShort / avgLong;
};

export default {
  SMA, EMA, EMA_Array, RSI, ATR, ATR_Percent,
  BollingerBands, ADX, WilliamsR, ROC,
  Volatility, MaxDrawdown, DaysAboveEMA, VolumeRatio,
  validateArray
};
