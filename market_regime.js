// =====================================================
// MARKET REGIME DETECTOR
// =====================================================

import * as ind from './indicators.js';

// =====================================================
// CONFIGURACIÓN
// =====================================================

export const REGIME_TYPES = {
  risk_on: {
    name: "Risk-On",
    emoji: "🟢",
    color: "#10b981",
    description: "Mercado alcista, baja volatilidad, amplitud fuerte",
    strategy_adjustment: {
      momentum_weight: 1.2,  // Aumentar momentum
      risk_penalty: 0.8,      // Reducir penalización por riesgo
      min_score: -5           // Más permisivo
    }
  },

  neutral: {
    name: "Neutral",
    emoji: "🟡",
    color: "#fbbf24",
    description: "Mercado lateral, sin tendencia clara",
    strategy_adjustment: {
      momentum_weight: 1.0,
      risk_penalty: 1.0,
      min_score: 0
    }
  },

  risk_off: {
    name: "Risk-Off",
    emoji: "🔴",
    color: "#f43f5e",
    description: "Mercado bajista o alta volatilidad",
    strategy_adjustment: {
      momentum_weight: 0.7,  // Reducir momentum
      risk_penalty: 1.3,      // Aumentar penalización por riesgo
      min_score: +10          // Más estricto
    }
  }
};

export const REGIME_CONFIG = {
  lookback_trend: 200,        // Días para calcular tendencia
  lookback_volatility: 20,    // Días para volatilidad reciente
  vol_threshold_low: 12,      // Vol < 12% = baja
  vol_threshold_high: 20,     // Vol > 20% = alta
  ema_threshold: 0.02,        // 2% sobre EMA200 = alcista
  breadth_threshold_high: 60, // >60% activos alcistas = fuerte
  breadth_threshold_low: 40   // <40% activos alcistas = débil
};

// =====================================================
// ANÁLISIS DE BENCHMARK (ÍNDICE)
// =====================================================

export const analyzeBenchmarkRegime = (benchmarkPrices, config = REGIME_CONFIG) => {
  if (!benchmarkPrices || benchmarkPrices.length < 200) {
    return {
      regime: 'neutral',
      confidence: 0.5,
      reason: 'Datos insuficientes para análisis de régimen'
    };
  }

  const lastPrice = benchmarkPrices[benchmarkPrices.length - 1];

  // 1. TENDENCIA: Precio vs EMA200
  let trendSignal = 0;
  try {
    const ema200 = ind.EMA(benchmarkPrices, config.lookback_trend);
    const distance = ((lastPrice / ema200) - 1);

    if (distance > config.ema_threshold) {
      trendSignal = 1; // Alcista
    } else if (distance < -config.ema_threshold) {
      trendSignal = -1; // Bajista
    } else {
      trendSignal = 0; // Neutral
    }
  } catch (e) {
    console.warn('Error calculando tendencia:', e.message);
  }

  // 2. VOLATILIDAD: Reciente vs histórica
  let volSignal = 0;
  try {
    const recentVol = ind.Volatility(benchmarkPrices.slice(-60), 20);
    const historicalVol = ind.Volatility(benchmarkPrices, Math.min(252, benchmarkPrices.length - 1));

    if (recentVol < config.vol_threshold_low) {
      volSignal = 1; // Baja volatilidad = Risk-On
    } else if (recentVol > config.vol_threshold_high || recentVol > historicalVol * 1.5) {
      volSignal = -1; // Alta volatilidad = Risk-Off
    } else {
      volSignal = 0; // Volatilidad normal
    }
  } catch (e) {
    console.warn('Error calculando volatilidad:', e.message);
  }

  // 3. MOMENTUM: ROC 3 meses y 6 meses
  let momentumSignal = 0;
  try {
    const roc3m = ind.ROC(benchmarkPrices, 63);
    const roc6m = ind.ROC(benchmarkPrices, 126);

    if (roc3m > 5 && roc6m > 10) {
      momentumSignal = 1; // Fuerte momentum alcista
    } else if (roc3m < -5 || roc6m < -10) {
      momentumSignal = -1; // Momentum bajista
    } else {
      momentumSignal = 0; // Momentum neutral
    }
  } catch (e) {
    console.warn('Error calculando momentum:', e.message);
  }

  // 4. SCORE COMPUESTO
  const compositeScore = trendSignal + volSignal + momentumSignal;

  // Clasificación
  let regime, confidence;

  if (compositeScore >= 2) {
    regime = 'risk_on';
    confidence = Math.min(0.95, 0.7 + (compositeScore / 10));
  } else if (compositeScore <= -2) {
    regime = 'risk_off';
    confidence = Math.min(0.95, 0.7 + (Math.abs(compositeScore) / 10));
  } else {
    regime = 'neutral';
    confidence = 0.6;
  }

  return {
    regime,
    confidence: parseFloat(confidence.toFixed(2)),
    signals: {
      trend: trendSignal,
      volatility: volSignal,
      momentum: momentumSignal,
      composite: compositeScore
    },
    details: {
      trendDescription: trendSignal > 0 ? 'Alcista' : trendSignal < 0 ? 'Bajista' : 'Lateral',
      volDescription: volSignal > 0 ? 'Baja' : volSignal < 0 ? 'Alta' : 'Normal',
      momentumDescription: momentumSignal > 0 ? 'Positivo' : momentumSignal < 0 ? 'Negativo' : 'Neutral'
    }
  };
};

// =====================================================
// AMPLITUD DE MERCADO (MARKET BREADTH)
// =====================================================

export const calculateMarketBreadth = (scanResults, config = REGIME_CONFIG) => {
  if (!scanResults || scanResults.length === 0) {
    return {
      breadth: 50,
      signal: 0,
      description: 'Sin datos de amplitud'
    };
  }

  // Contar activos con tendencia alcista (precio > EMA50)
  let bullishCount = 0;
  let totalAnalyzed = 0;

  scanResults.forEach(asset => {
    if (asset.details?.trend?.ema50 && asset.price) {
      totalAnalyzed++;
      const ema50 = parseFloat(asset.details.trend.ema50);
      if (!isNaN(ema50) && asset.price > ema50) {
        bullishCount++;
      }
    }
  });

  if (totalAnalyzed === 0) {
    return {
      breadth: 50,
      signal: 0,
      description: 'Sin datos válidos'
    };
  }

  const breadthPct = (bullishCount / totalAnalyzed) * 100;

  // Clasificar amplitud
  let signal, description;

  if (breadthPct >= config.breadth_threshold_high) {
    signal = 1; // Amplitud fuerte = Risk-On
    description = 'Fuerte (>60% activos alcistas)';
  } else if (breadthPct <= config.breadth_threshold_low) {
    signal = -1; // Amplitud débil = Risk-Off
    description = 'Débil (<40% activos alcistas)';
  } else {
    signal = 0; // Amplitud neutral
    description = 'Normal (40-60%)';
  }

  return {
    breadth: parseFloat(breadthPct.toFixed(1)),
    bullishCount,
    totalAnalyzed,
    signal,
    description
  };
};

// =====================================================
// DETECTOR COMPLETO DE RÉGIMEN
// =====================================================

export const detectMarketRegime = (benchmarkPrices, scanResults = null, config = REGIME_CONFIG) => {
  // 1. Análisis del benchmark
  const benchmarkAnalysis = analyzeBenchmarkRegime(benchmarkPrices, config);

  // 2. Amplitud de mercado (si hay datos de escaneo)
  let breadthAnalysis = null;
  if (scanResults && scanResults.length > 0) {
    breadthAnalysis = calculateMarketBreadth(scanResults, config);
  }

  // 3. Combinar señales
  let finalRegime = benchmarkAnalysis.regime;
  let finalConfidence = benchmarkAnalysis.confidence;

  // Ajustar con amplitud de mercado
  if (breadthAnalysis) {
    const breadthSignal = breadthAnalysis.signal;
    const benchmarkSignal = benchmarkAnalysis.signals.composite;

    // Si hay divergencia entre benchmark y amplitud, reducir confianza
    if ((benchmarkSignal > 0 && breadthSignal < 0) || (benchmarkSignal < 0 && breadthSignal > 0)) {
      finalConfidence *= 0.8; // Reducir confianza por divergencia
      finalRegime = 'neutral'; // Divergencia = neutral
    }

    // Si ambos confirman, aumentar confianza
    if ((benchmarkSignal >= 1 && breadthSignal === 1) || (benchmarkSignal <= -1 && breadthSignal === -1)) {
      finalConfidence = Math.min(0.95, finalConfidence * 1.1);
    }
  }

  const regimeData = REGIME_TYPES[finalRegime];

  return {
    regime: finalRegime,
    confidence: parseFloat(finalConfidence.toFixed(2)),
    name: regimeData.name,
    emoji: regimeData.emoji,
    color: regimeData.color,
    description: regimeData.description,
    benchmarkAnalysis,
    breadthAnalysis,
    strategyAdjustment: regimeData.strategy_adjustment,
    timestamp: new Date().toISOString()
  };
};

// =====================================================
// AJUSTE DE ESTRATEGIA SEGÚN RÉGIMEN
// =====================================================

export const adjustStrategyForRegime = (baseStrategy, regimeData) => {
  const adjustment = regimeData.strategyAdjustment;

  const adjustedStrategy = {
    ...baseStrategy,
    weights: {
      trend: baseStrategy.weights.trend,
      momentum: baseStrategy.weights.momentum * adjustment.momentum_weight,
      risk: baseStrategy.weights.risk * adjustment.risk_penalty,
      liquidity: baseStrategy.weights.liquidity
    },
    signals: {
      ...baseStrategy.signals,
      strong_buy: baseStrategy.signals.strong_buy + adjustment.min_score,
      buy: baseStrategy.signals.buy + adjustment.min_score,
      hold_upper: baseStrategy.signals.hold_upper + adjustment.min_score,
      hold_lower: baseStrategy.signals.hold_lower + adjustment.min_score,
      sell: baseStrategy.signals.sell + adjustment.min_score
    },
    regime_adjusted: true,
    original_strategy: baseStrategy.name || 'Unknown'
  };

  // Renormalizar pesos
  const totalWeight = Object.values(adjustedStrategy.weights).reduce((a, b) => a + b, 0);
  Object.keys(adjustedStrategy.weights).forEach(key => {
    adjustedStrategy.weights[key] /= totalWeight;
  });

  return adjustedStrategy;
};

// =====================================================
// HISTÓRICO DE RÉGIMEN (PARA ANÁLISIS)
// =====================================================

export const analyzeRegimeHistory = (benchmarkPrices, windowSize = 60) => {
  const history = [];

  for (let i = 200; i < benchmarkPrices.length; i += windowSize) {
    const slice = benchmarkPrices.slice(0, i);
    const regime = analyzeBenchmarkRegime(slice);

    history.push({
      date: new Date(Date.now() - (benchmarkPrices.length - i) * 86400000).toISOString().split('T')[0],
      regime: regime.regime,
      confidence: regime.confidence
    });
  }

  // Estadísticas
  const regimeCounts = history.reduce((acc, h) => {
    acc[h.regime] = (acc[h.regime] || 0) + 1;
    return acc;
  }, {});

  const totalPeriods = history.length;

  return {
    history,
    stats: {
      risk_on_pct: ((regimeCounts.risk_on || 0) / totalPeriods * 100).toFixed(1),
      neutral_pct: ((regimeCounts.neutral || 0) / totalPeriods * 100).toFixed(1),
      risk_off_pct: ((regimeCounts.risk_off || 0) / totalPeriods * 100).toFixed(1)
    }
  };
};

export default {
  REGIME_TYPES,
  REGIME_CONFIG,
  detectMarketRegime,
  analyzeBenchmarkRegime,
  calculateMarketBreadth,
  adjustStrategyForRegime,
  analyzeRegimeHistory
};
