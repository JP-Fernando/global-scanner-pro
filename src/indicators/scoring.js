// =====================================================
// ADVANCED QUANTITATIVE SCORING ENGINE
// =====================================================

import * as ind from './indicators.js';
import i18n from '../i18n/i18n.js';

// Normalisation to percentiles within the universe
export const normalizeToPercentile = (value, values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = sorted.filter(v => v <= value).length;
  return (rank / values.length) * 100;
};

// Alpha calculation vs Benchmark
export const calculateAlpha = (assetROC, benchmarkROC) => {
  return assetROC - benchmarkROC;
};

// Relative volatility calculation
export const calculateRelativeVolatility = (assetVol, benchmarkVol) => {
  return benchmarkVol === 0 ? 1.0 : assetVol / benchmarkVol;
};

// =====================================================
// SCORES TEMPORALES (CORTO, MEDIO, LARGO)
// =====================================================

export const calculateShortTermScore = (data, prices, volumes, _config) => {
  // Horizonte: 6 meses (126 días)
  const lastPrice = prices[prices.length - 1];
  let score = 0;

  // 1. Precio vs EMA20 (50 puntos)
  try {
    const ema20 = ind.EMA(prices, 20);
    if (ema20 && lastPrice > ema20) {
      const distance = ((lastPrice / ema20) - 1) * 100;
      if (distance > 0 && distance < 10) score += 50;
      else if (distance >= 10) score += 35;
      else if (distance > -5) score += 20;
    }
  } catch {
    score += 25; // Neutro
  }

  // 2. RSI favorable (25 puntos)
  try {
    if (prices.length >= 20) {
      const rsi = ind.RSI(prices, 14);
      if (rsi >= 45 && rsi <= 65) score += 25;
      else if (rsi > 65 && rsi < 75) score += 15;
      else if (rsi >= 40) score += 12;
    }
  } catch {
    score += 12;
  }

  // 3. Volumen relativo (25 puntos)
  try {
    if (volumes.length >= 50) {
      const avgVol = ind.SMA(volumes.slice(-50), 50);
      const vRatio = volumes[volumes.length - 1] / avgVol;
      if (vRatio > 1.2) score += 25;
      else if (vRatio > 1.0) score += 15;
      else if (vRatio > 0.8) score += 8;
    }
  } catch {
    score += 12;
  }

  return Math.round(Math.min(100, score));
};

export const calculateMediumTermScore = (data, prices, _config) => {
  // Horizonte: 18 meses (378 días ≈ 1.5 años)
  const lastPrice = prices[prices.length - 1];
  let score = 0;

  // 1. Estructura EMA50 vs EMA200 (50 puntos)
  try {
    const ema50 = ind.EMA(prices, 50);
    const ema200 = ind.EMA(prices, 200);

    if (ema50 && ema200) {
      if (lastPrice > ema50 && ema50 > ema200) score += 50;
      else if (lastPrice > ema50) score += 30;
      else if (lastPrice > ema200) score += 15;
    } else if (ema50) {
      if (lastPrice > ema50) score += 25;
    }
  } catch {
    score += 25;
  }

  // 2. ROC 6 meses (30 puntos)
  try {
    if (prices.length >= 127) {
      const roc = ind.ROC(prices, 126);
      if (roc > 10) score += 30;
      else if (roc > 5) score += 20;
      else if (roc > 0) score += 10;
    }
  } catch {
    score += 15;
  }

  // 3. Volatilidad controlada (20 puntos)
  try {
    if (prices.length >= 60) {
      const vol = ind.Volatility(prices, Math.min(252, prices.length - 1));
      if (vol < 20) score += 20;
      else if (vol < 30) score += 12;
      else if (vol < 40) score += 6;
    }
  } catch {
    score += 10;
  }

  return Math.round(Math.min(100, score));
};

export const calculateLongTermScore = (data, prices, _config) => {
  // Horizonte: 4 años (1008 días)
  const lastPrice = prices[prices.length - 1];
  let score = 0;

  // 1. Momentum 12 meses (30 puntos)
  try {
    if (prices.length >= 253) {
      const roc12m = ind.ROC(prices, 252);
      if (roc12m > 20) score += 30;
      else if (roc12m > 10) score += 20;
      else if (roc12m > 5) score += 12;
      else if (roc12m > 0) score += 6;
    }
  } catch {
    score += 15;
  }

  // 2. Tendencia estructural vs EMA200 (30 puntos)
  try {
    const ema200 = ind.EMA(prices, 200);
    if (ema200) {
      const distance = ((lastPrice / ema200) - 1) * 100;
      if (distance > 0 && distance < 20) score += 30;
      else if (distance >= 20) score += 20;
      else if (distance > -10) score += 10;
    }
  } catch {
    score += 15;
  }

  // 3. Volatilidad anualizada (20 puntos)
  try {
    if (prices.length >= 252) {
      const vol = ind.Volatility(prices, 252);
      if (vol < 15) score += 20;
      else if (vol < 25) score += 15;
      else if (vol < 35) score += 10;
      else if (vol < 50) score += 5;
    }
  } catch {
    score += 10;
  }

  // 4. Consistencia sobre EMA200 (20 puntos)
  try {
    if (prices.length >= 400) {
      const daysAbove = ind.DaysAboveEMA(prices, 200, 200);
      if (daysAbove > 70) score += 20;
      else if (daysAbove > 50) score += 15;
      else if (daysAbove > 30) score += 8;
    }
  } catch {
    score += 10;
  }

  return Math.round(Math.min(100, score));
};

// =====================================================
// SCORES INDIVIDUALES (MANTENER EXISTENTES)
// =====================================================

export const calculateTrendScore = (data, prices, config) => {
  const lastPrice = prices[prices.length - 1];

  // EMAs con manejo de errores
  let ema50 = null, ema200 = null;

  try {
    ema50 = ind.EMA(prices, config.ema_medium);
  } catch {
    // No hay suficiente data para EMA50
  }

  try {
    ema200 = ind.EMA(prices, config.ema_long);
  } catch {
    // No hay suficiente data para EMA200
  }

  if (!ema50 && !ema200) {
    return { score: 0, details: { error: 'Insuficiente historia para EMAs' } };
  }

  // 1. Posición vs EMAs (40 puntos)
  let positionScore = 0;
  if (ema200 && ema50) {
    if (lastPrice > ema200 && ema50 > ema200) {
      positionScore = 40;
    } else if (lastPrice > ema200) {
      positionScore = 25;
    } else if (lastPrice > ema50) {
      positionScore = 15;
    }
  } else if (ema50) {
    // Solo tenemos EMA50
    if (lastPrice > ema50) positionScore = 20;
  }

  // 2. Consistencia: días por encima EMA200 (30 puntos)
  let consistencyScore = 0;
  if (ema200 && prices.length >= 200) {
    try {
      const daysAbove = ind.DaysAboveEMA(
        prices, config.ema_long, Math.min(200, prices.length - config.ema_long)
      );
      consistencyScore = (daysAbove / 100) * 30;
    } catch {
      consistencyScore = 15; // Score neutro
    }
  } else {
    consistencyScore = 15; // Score neutro si no hay suficiente data
  }

  // 3. Fortaleza de tendencia con ADX (30 puntos)
  let adxScore = 15; // Default neutro
  if (data.length >= 20) {
    try {
      const adx = ind.ADX(data, Math.min(config.adx_period, data.length - 1));
      adxScore = Math.min(30, (adx / 40) * 30);
    } catch {
      // Mantener score neutro
    }
  }

  return {
    score: positionScore + consistencyScore + adxScore,
    details: {
      positionScore,
      consistencyScore: consistencyScore.toFixed(1),
      adxScore: adxScore.toFixed(1),
      ema50: ema50 ? ema50.toFixed(2) : 'N/A',
      ema200: ema200 ? ema200.toFixed(2) : 'N/A'
    }
  };
};

export const calculateMomentumScore = (
  prices, config, benchmarkROC6m = null, benchmarkROC12m = null
) => {
  const _lastPrice = prices[prices.length - 1];

  // ROC 6 meses y 12 meses con manejo de errores
  let roc6m = 0, roc12m = 0;

  try {
    if (prices.length >= config.roc_short + 1) {
      roc6m = ind.ROC(prices, config.roc_short);
    }
  } catch {
    // No hay suficiente data
  }

  try {
    if (prices.length >= config.roc_long + 1) {
      roc12m = ind.ROC(prices, config.roc_long);
    }
  } catch {
    // No hay suficiente data
  }

  // Alpha vs benchmark
  const alpha6m = benchmarkROC6m !== null ? calculateAlpha(roc6m, benchmarkROC6m) : roc6m;
  const alpha12m = benchmarkROC12m !== null ? calculateAlpha(roc12m, benchmarkROC12m) : roc12m;

  // 1. Momentum 6 meses (25 puntos)
  let mom6Score = 0;
  if (alpha6m > 15) mom6Score = 25;
  else if (alpha6m > 5) mom6Score = 15;
  else if (alpha6m > 0) mom6Score = 8;
  else if (alpha6m > -10) mom6Score = 3;

  // 2. Momentum 12 meses (35 puntos)
  let mom12Score = 0;
  if (alpha12m > 20) mom12Score = 35;
  else if (alpha12m > 10) mom12Score = 25;
  else if (alpha12m > 0) mom12Score = 12;
  else if (alpha12m > -15) mom12Score = 5;

  // 3. Thrust reciente: ROC 20 días (20 puntos)
  let roc20d = 0, thrustScore = 0;
  try {
    if (prices.length >= 21) {
      roc20d = ind.ROC(prices, 20);
      if (roc20d > 5) thrustScore = 20;
      else if (roc20d > 2) thrustScore = 12;
      else if (roc20d > 0) thrustScore = 5;
    }
  } catch {
    thrustScore = 5; // Neutro
  }

  // 4. RSI en zona favorable (20 puntos)
  let rsi = 50, rsiScore = 10;
  try {
    if (prices.length >= 20) {
      rsi = ind.RSI(prices, Math.min(config.rsi_period, prices.length - 1));
      if (rsi >= 50 && rsi <= 70) rsiScore = 20;
      else if (rsi > 70) rsiScore = 10;
      else if (rsi >= 40) rsiScore = 12;
      else rsiScore = 5;
    }
  } catch {
    // Mantener default
  }

  return {
    score: mom6Score + mom12Score + thrustScore + rsiScore,
    details: {
      mom6Score,
      mom12Score,
      thrustScore,
      rsiScore,
      roc6m: roc6m.toFixed(2),
      roc12m: roc12m.toFixed(2),
      alpha6m: alpha6m.toFixed(2),
      alpha12m: alpha12m.toFixed(2),
      rsi: rsi.toFixed(1)
    }
  };
};

export const calculateRiskScore = (data, prices, config, benchmarkVol = null) => {
  const _lastPrice = prices[prices.length - 1];

  // 1. ATR% - menor es mejor (30 puntos)
  let atrPct = 5, atrScore = 15;
  if (data.length >= 20) {
    try {
      atrPct = ind.ATR_Percent(data, Math.min(config.atr_period, data.length - 1));
      if (atrPct < 2) atrScore = 30;
      else if (atrPct < 4) atrScore = 20;
      else if (atrPct < 6) atrScore = 10;
      else if (atrPct < 10) atrScore = 5;
      else atrScore = 2;
    } catch {
      // Mantener default
    }
  }

  // 2. Volatilidad anualizada (35 puntos)
  let volatility = 20, relVol = 1, volScore = 15;
  if (prices.length >= 60) {
    try {
      volatility = ind.Volatility(prices, Math.min(252, prices.length - 1));
      relVol = benchmarkVol !== null
        ? calculateRelativeVolatility(volatility, benchmarkVol)
        : volatility / 20;

      if (relVol < 0.8) volScore = 35;
      else if (relVol < 1.2) volScore = 25;
      else if (relVol < 1.5) volScore = 12;
      else if (relVol < 2.0) volScore = 6;
      else volScore = 3;
    } catch {
      // Mantener default
    }
  }

  // 3. Drawdown máximo 52 semanas - menor es mejor (35 puntos)
  let maxDD = 30, ddScore = 15;
  if (prices.length >= 100) {
    try {
      maxDD = ind.MaxDrawdown(prices, Math.min(252, prices.length));
      if (maxDD < 15) ddScore = 35;
      else if (maxDD < 25) ddScore = 25;
      else if (maxDD < 35) ddScore = 12;
      else if (maxDD < 50) ddScore = 6;
      else ddScore = 3;
    } catch {
      // Mantener default
    }
  }

  return {
    score: atrScore + volScore + ddScore,
    details: {
      atrScore,
      volScore,
      ddScore,
      atrPct: atrPct.toFixed(2),
      volatility: volatility.toFixed(2),
      relativeVol: relVol.toFixed(2),
      maxDrawdown: maxDD.toFixed(2)
    }
  };
};

export const calculateLiquidityScore = (volumes, config) => {
  // 1. Volumen medio 20 días (40 puntos)
  let avgVol20 = 0, vol20Score = 10;
  if (volumes.length >= 20) {
    try {
      avgVol20 = ind.SMA(volumes.slice(-20), 20);
      if (avgVol20 > config.min_volume_20d * 3) vol20Score = 40;
      else if (avgVol20 > config.min_volume_20d * 1.5) vol20Score = 25;
      else if (avgVol20 > config.min_volume_20d) vol20Score = 15;
      else vol20Score = 5;
    } catch {
      // Mantener default
    }
  }

  // 2. Volumen medio 60 días (30 puntos)
  let avgVol60 = 0, vol60Score = 10;
  if (volumes.length >= 60) {
    try {
      avgVol60 = ind.SMA(volumes.slice(-60), 60);
      if (avgVol60 > config.min_volume_60d * 2) vol60Score = 30;
      else if (avgVol60 > config.min_volume_60d * 1.2) vol60Score = 20;
      else if (avgVol60 > config.min_volume_60d) vol60Score = 10;
      else vol60Score = 5;
    } catch {
      // Mantener default
    }
  }

  // 3. Ratio volumen reciente (30 puntos)
  let volRatio = 1, ratioScore = 15;
  if (volumes.length >= 60) {
    try {
      volRatio = ind.VolumeRatio(volumes, 20, 60);
      if (volRatio > 1.3) ratioScore = 30;
      else if (volRatio > 1.1) ratioScore = 20;
      else if (volRatio > 0.9) ratioScore = 12;
      else ratioScore = 8;
    } catch {
      // Mantener default
    }
  }

  return {
    score: vol20Score + vol60Score + ratioScore,
    details: {
      vol20Score,
      vol60Score,
      ratioScore,
      avgVol20: avgVol20.toFixed(0),
      avgVol60: avgVol60.toFixed(0),
      volRatio: volRatio.toFixed(2)
    }
  };
};

// =====================================================
// FILTROS DUROS
// =====================================================
export const applyHardFilters = (data, prices, volumes, config) => {
  const reasons = [];
  let isRejected = false; // Flag para rechazo absoluto

  // 1. Historia Mínima: CRÍTICO (Mantener estricto o reducir levemente)
  // Si no hay datos, no podemos calcular nada.
  if (prices.length < config.min_days_history) {
    isRejected = true;
    reasons.push(`Historia insuficiente (${prices.length} < ${config.min_days_history})`);
  }

  // 2. Volumen Mínimo: FLEXIBLE
  // Si falla el volumen pero no es cero, lo dejamos pasar pero anotamos razón.
  // Rechazo absoluto solo si es ilíquido (ej. < 1000 acciones/día)
  if (volumes.length >= 20) {
    const avgVol20 = ind.SMA(volumes.slice(-20), 20);
    // Umbral de "muerte súbita": 1000 unidades (muy bajo)
    if (avgVol20 < 1000) {
      isRejected = true;
      reasons.push(`Iliquidez crítica (${avgVol20.toFixed(0)})`);
    } else if (avgVol20 < config.min_volume_20d) {
      // Pasa, pero con advertencia (no activamos isRejected)
      reasons.push(`⚠️ Volumen bajo (${avgVol20.toFixed(0)})`);
    }
  }

  // 3. ATR% (Volatilidad): SOLO ADVERTENCIA
  // En Momentum, la volatilidad es amiga. No deberíamos filtrar por esto,
  // sino penalizar el Risk Score (que ya lo hace tu sistema).
  if (data.length >= 20) {
    try {
      const atrPct = ind.ATR_Percent(data, Math.min(14, data.length - 1));
      if (atrPct > config.max_atr_pct) {
        // No rechazamos, solo avisamos.
        reasons.push(`⚠️ Alta Volatilidad (${atrPct.toFixed(2)}%)`);
      }
    } catch { /* ignored */ }
  }

  // 4. Drawdown: SOLO ADVERTENCIA
  if (prices.length >= 100) { // Reducido requerimiento de días para calcular DD
    try {
      const maxDD = ind.MaxDrawdown(prices, Math.min(252, prices.length));
      if (maxDD > config.max_drawdown_52w) {
        reasons.push(`⚠️ DD Profundo (${maxDD.toFixed(1)}%)`);
      }
    } catch { /* ignored */ }
  }

  return {
    // Solo falla si isRejected es true. Las advertencias pasan.
    passed: !isRejected,
    reasons
  };
};
// =====================================================
// SCORING TOTAL PONDERADO
// =====================================================

export const calculateFinalScore = (
  trendScore, momentumScore, riskScore, liquidityScore, weights
) => {
  const normalizedTrend = (trendScore / 100) * weights.trend;
  const normalizedMomentum = (momentumScore / 100) * weights.momentum;
  const normalizedRisk = (riskScore / 100) * weights.risk;
  const normalizedLiquidity = (liquidityScore / 100) * weights.liquidity;

  const totalWeight = weights.trend + weights.momentum + weights.risk + weights.liquidity;
  const weightedSum = normalizedTrend + normalizedMomentum + normalizedRisk + normalizedLiquidity;
  const finalScore = (weightedSum / totalWeight) * 100;

  return Math.round(Math.min(100, Math.max(0, finalScore)));
};

// Generate signal based on score & custom thresholds
export const generateSignal = (score, config) => {
  if (score >= config.strong_buy) {
    return { key: 'strong_buy', text: i18n.t('signals.strong_buy'), color: '#10b981', confidence: 95 };
  } else if (score >= config.buy) {
    return { key: 'buy', text: i18n.t('signals.buy'), color: '#4ade80', confidence: 75 };
  } else if (score >= config.hold_upper) {
    return { key: 'hold_upper', text: i18n.t('signals.hold_upper'), color: '#fbbf24', confidence: 55 };
  } else if (score >= config.hold_lower) {
    return { key: 'hold', text: i18n.t('signals.hold'), color: '#fcd34d', confidence: 40 };
  } else {
    return { key: 'sell', text: i18n.t('signals.sell'), color: '#f87171', confidence: 25 };
  }
};

export default {
  normalizeToPercentile,
  calculateAlpha,
  calculateRelativeVolatility,
  calculateShortTermScore,
  calculateMediumTermScore,
  calculateLongTermScore,
  calculateTrendScore,
  calculateMomentumScore,
  calculateRiskScore,
  calculateLiquidityScore,
  applyHardFilters,
  calculateFinalScore,
  generateSignal
};
