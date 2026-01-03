// =====================================================
// MARKET REGIME DETECTOR
// =====================================================

import * as ind from '../indicators/indicators.js';
import i18n from '../i18n/i18n.js';

// =====================================================
// CONFIGURATION
// =====================================================

export const REGIME_TYPES = {
  risk_on: {
    name: i18n.t('market_regime.risk_on_name'),
    emoji: "🟢",
    color: "#10b981",
    description: i18n.t('market_regime.risk_on_desc'),
    strategy_adjustment: {
      momentum_weight: 1.2,  // Increase momentum
      risk_penalty: 0.8,      // Reduce risk penalty
      min_score: -5           // More permissive
    }
  },

  neutral: {
    name: i18n.t('market_regime.neutral_name'),
    emoji: "🟡",
    color: "#fbbf24",
    description: i18n.t('market_regime.neutral_desc'),
    strategy_adjustment: {
      momentum_weight: 1.0,
      risk_penalty: 1.0,
      min_score: 0
    }
  },

  risk_off: {
    name: i18n.t('market_regime.risk_off_name'),
    emoji: "🔴",
    color: "#f43f5e",
    description: i18n.t('market_regime.risk_off_desc'),
    strategy_adjustment: {
      momentum_weight: 0.7,  // Reduce momentum
      risk_penalty: 1.3,      // Increase risk penalty
      min_score: +10          // More strict
    }
  }
};

export const REGIME_CONFIG = {
  lookback_trend: 200,        // Days to calculate trend
  lookback_volatility: 20,    // Days for recent volatility
  vol_threshold_low: 12,      // Vol < 12% = low
  vol_threshold_high: 20,     // Vol > 20% = high
  ema_threshold: 0.02,        // 2% above EMA200 = bullish
  breadth_threshold_high: 60, // >60% bullish assets = strong
  breadth_threshold_low: 40   // <40% bullish assets = weak
};

// =====================================================
// BENCHMARK ANALYSIS (INDEX)
// =====================================================

export const analyzeBenchmarkRegime = (benchmarkPrices, config = REGIME_CONFIG) => {
  if (!benchmarkPrices || benchmarkPrices.length < 200) {
    return {
      regime: 'neutral',
      confidence: 0.5,
      reason: i18n.t('market_regime.reason_insufficient_data')
    };
  }

  const lastPrice = benchmarkPrices[benchmarkPrices.length - 1];

  // 1. TREND: Price vs EMA200
  let trendSignal = 0;
  try {
    const ema200 = ind.EMA(benchmarkPrices, config.lookback_trend);
    const distance = ((lastPrice / ema200) - 1);

    if (distance > config.ema_threshold) {
      trendSignal = 1; // Bullish
    } else if (distance < -config.ema_threshold) {
      trendSignal = -1; // Bearish
    } else {
      trendSignal = 0; // Neutral
    }
  } catch (e) {
    console.warn(`⚠️ ${i18n.t('market_regime.error_calculating_trend')}:`, e.message);
  }

  // 2. VOLATILITY: Recent vs historical
  let volSignal = 0;
  try {
    const recentVol = ind.Volatility(benchmarkPrices.slice(-60), 20);
    const historicalVol = ind.Volatility(benchmarkPrices, Math.min(252, benchmarkPrices.length - 1));

    if (recentVol < config.vol_threshold_low) {
      volSignal = 1; // Low volatility = Risk-On
    } else if (recentVol > config.vol_threshold_high || recentVol > historicalVol * 1.5) {
      volSignal = -1; // High volatility = Risk-Off
    } else {
      volSignal = 0; // Normal volatility
    }
  } catch (e) {
    console.warn(`⚠️ ${i18n.t('market_regime.error_calculating_volatility')}:`, e.message);
  }

  // 3. MOMENTUM: ROC 3 months and 6 months
  let momentumSignal = 0;
  try {
    const roc3m = ind.ROC(benchmarkPrices, 63);
    const roc6m = ind.ROC(benchmarkPrices, 126);

    if (roc3m > 5 && roc6m > 10) {
      momentumSignal = 1; // Strong bullish momentum
    } else if (roc3m < -5 || roc6m < -10) {
      momentumSignal = -1; // Bearish momentum
    } else {
      momentumSignal = 0; // Neutral momentum
    }
  } catch (e) {
    console.warn(`⚠️ ${i18n.t('market_regime.error_calculating_momentum')}:`, e.message);
  }

  // 4. COMPOSITE SCORE
  const compositeScore = trendSignal + volSignal + momentumSignal;

  // Classification
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
      trendDescription: trendSignal > 0 ? i18n.t('market_regime.trend_bullish') : trendSignal < 0 ? i18n.t('market_regime.trend_bearish') : i18n.t('market_regime.trend_sideways'),
      volDescription: volSignal > 0 ? i18n.t('market_regime.vol_low') : volSignal < 0 ? i18n.t('market_regime.vol_high') : i18n.t('market_regime.vol_normal'),
      momentumDescription: momentumSignal > 0 ? i18n.t('market_regime.momentum_positive') : momentumSignal < 0 ? i18n.t('market_regime.momentum_negative') : i18n.t('market_regime.momentum_neutral')
    }
  };
};

// =====================================================
// MARKET BREADTH
// =====================================================

export const calculateMarketBreadth = (scanResults, config = REGIME_CONFIG) => {
  if (!scanResults || scanResults.length === 0) {
    return {
      breadth: 50,
      signal: 0,
      description: i18n.t('market_regime.breadth_no_data')
    };
  }

  // Count assets with bullish trend (price > EMA50)
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
      description: i18n.t('market_regime.breadth_no_valid')
    };
  }

  const breadthPct = (bullishCount / totalAnalyzed) * 100;

  // Classify breadth
  let signal, description;

  if (breadthPct >= config.breadth_threshold_high) {
    signal = 1; // Strong breadth = Risk-On
    description = i18n.t('market_regime.breadth_strong');
  } else if (breadthPct <= config.breadth_threshold_low) {
    signal = -1; // Weak breadth = Risk-Off
    description = i18n.t('market_regime.breadth_weak');
  } else {
    signal = 0; // Neutral breadth
    description = i18n.t('market_regime.breadth_normal');
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
// COMPLETE REGIME DETECTOR
// =====================================================

export const detectMarketRegime = (benchmarkPrices, scanResults = null, config = REGIME_CONFIG) => {
  // 1. Benchmark analysis
  const benchmarkAnalysis = analyzeBenchmarkRegime(benchmarkPrices, config);

  // 2. Market breadth (if scan data available)
  let breadthAnalysis = null;
  if (scanResults && scanResults.length > 0) {
    breadthAnalysis = calculateMarketBreadth(scanResults, config);
  }

  // 3. Combine signals
  let finalRegime = benchmarkAnalysis.regime;
  let finalConfidence = benchmarkAnalysis.confidence;

  // Adjust with market breadth
  if (breadthAnalysis) {
    const breadthSignal = breadthAnalysis.signal;
    const benchmarkSignal = benchmarkAnalysis.signals.composite;

    // If divergence between benchmark and breadth, reduce confidence
    if ((benchmarkSignal > 0 && breadthSignal < 0) || (benchmarkSignal < 0 && breadthSignal > 0)) {
      finalConfidence *= 0.8; // Reduce confidence due to divergence
      finalRegime = 'neutral'; // Divergence = neutral
    }

    // If both confirm, increase confidence
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
// STRATEGY ADJUSTMENT BY REGIME
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

  // Renormalise weights
  const totalWeight = Object.values(adjustedStrategy.weights).reduce((a, b) => a + b, 0);
  Object.keys(adjustedStrategy.weights).forEach(key => {
    adjustedStrategy.weights[key] /= totalWeight;
  });

  return adjustedStrategy;
};

// =====================================================
// REGIME HISTORY (FOR ANALYSIS)
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

  // Statistics
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
