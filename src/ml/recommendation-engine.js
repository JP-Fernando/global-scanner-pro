// =====================================================
// AI-POWERED RECOMMENDATION ENGINE
// =====================================================

/**
 * Intelligent Recommendation System
 *
 * Generates proactive recommendations based on:
 * - Current portfolio analysis
 * - Market conditions
 * - Historical performance
 * - Detection of opportunities and risks
 *
 * Recommendation types:
 * - Portfolio rebalancing
 * - New investment opportunities
 * - Risk alerts
 * - Weight optimisation
 */

import { calculateCorrelation } from './ml-engine.js';
import i18n from '../i18n/i18n.js';

// =====================================================
// RECOMMENDATION TYPES
// =====================================================

export const RECOMMENDATION_TYPES = {
  REBALANCE: 'rebalance',
  BUY_OPPORTUNITY: 'buy_opportunity',
  SELL_ALERT: 'sell_alert',
  RISK_WARNING: 'risk_warning',
  DIVERSIFICATION: 'diversification',
  MOMENTUM_SHIFT: 'momentum_shift',
  REGIME_CHANGE: 'regime_change'
};

export const RECOMMENDATION_PRIORITY = {
  CRITICAL: { level: 3, label: 'Critical', color: '#dc2626' },
  HIGH: { level: 2, label: 'High', color: '#f59e0b' },
  MEDIUM: { level: 1, label: 'Medium', color: '#3b82f6' },
  LOW: { level: 0, label: 'Low', color: '#6b7280' }
};

// =====================================================
// RECOMMENDATION GENERATION
// =====================================================

/**
 * Generate portfolio recommendations
 */
export function generateRecommendations(portfolio, marketData, historicalPerformance) {
  const recommendations = [];

  // 1. Rebalancing recommendations
  recommendations.push(...detectRebalancingNeeds(portfolio));

  // 2. Risk warnings
  recommendations.push(...detectRiskWarnings(portfolio, marketData));

  // 3. Buy opportunities
  recommendations.push(...detectBuyOpportunities(marketData, portfolio));

  // 4. Sell alerts
  recommendations.push(...detectSellAlerts(portfolio, historicalPerformance));

  // 5. Diversification suggestions
  recommendations.push(...detectDiversificationNeeds(portfolio));

  // 6. Regime change alerts
  recommendations.push(...detectRegimeChanges(marketData));

  // Sort by priority
  recommendations.sort((a, b) => b.priority.level - a.priority.level);

  return recommendations;
}

/**
 * Detect rebalancing needs
 */
function detectRebalancingNeeds(portfolio) {
  const recommendations = [];
  const { positions, target_weights } = portfolio;

  if (!positions || !target_weights) return recommendations;

  Object.entries(positions).forEach(([ticker, position]) => {
    const current_weight = position.weight;
    const target_weight = target_weights[ticker] || 0;

    // Round to avoid floating point precision issues
    const deviation = Math.round(Math.abs(current_weight - target_weight) * 1000) / 1000;

    if (deviation >= 0.05) { // 5% threshold
      recommendations.push({
        type: RECOMMENDATION_TYPES.REBALANCE,
        priority: deviation > 0.10 ? RECOMMENDATION_PRIORITY.HIGH : RECOMMENDATION_PRIORITY.MEDIUM,
        ticker,
        name: position.name || ticker,
        title: i18n.t('ml.portfolio.rebalance_title', { ticker }),
        message: i18n.t('ml.portfolio.rebalance_message', {
          currentWeight: (current_weight * 100).toFixed(1),
          targetWeight: (target_weight * 100).toFixed(1),
          deviation: (deviation * 100).toFixed(1)
        }),
        action: i18n.t(current_weight > target_weight ? 'ml.portfolio.action_sell' : 'ml.portfolio.action_buy'),
        amount: Math.abs(current_weight - target_weight) * portfolio.total_value,
        confidence: 0.9,
        timestamp: Date.now()
      });
    }
  });

  return recommendations;
}

/**
 * Detect risk warnings
 */
function detectRiskWarnings(portfolio, marketData) {
  const recommendations = [];

  // Check concentration risk
  if (portfolio.positions) {
    const sortedPositions = Object.values(portfolio.positions)
      .sort((a, b) => b.weight - a.weight);

    const top3Concentration = sortedPositions.slice(0, 3)
      .reduce((sum, p) => sum + p.weight, 0);

    if (top3Concentration > 0.60) {
      recommendations.push({
        type: RECOMMENDATION_TYPES.RISK_WARNING,
        priority: RECOMMENDATION_PRIORITY.HIGH,
        title: i18n.t('ml.portfolio.high_concentration_title'),
        message: i18n.t('ml.portfolio.high_concentration_message', {
          concentration: (top3Concentration * 100).toFixed(1)
        }),
        action: i18n.t('ml.portfolio.action_diversify'),
        confidence: 0.85,
        timestamp: Date.now()
      });
    }
  }

  // Check volatility spike
  if (marketData && marketData.volatility > 30) {
    recommendations.push({
      type: RECOMMENDATION_TYPES.RISK_WARNING,
      priority: RECOMMENDATION_PRIORITY.CRITICAL,
      title: i18n.t('ml.portfolio.elevated_volatility_title'),
      message: i18n.t('ml.portfolio.elevated_volatility_message', {
        volatility: marketData.volatility.toFixed(1)
      }),
      action: i18n.t('ml.portfolio.action_review_risk'),
      confidence: 0.90,
      timestamp: Date.now()
    });
  }

  return recommendations;
}

/**
 * Detect buy opportunities
 */
function detectBuyOpportunities(marketData, portfolio) {
  const recommendations = [];

  if (!marketData || !marketData.assets) return recommendations;

  // Find high-scoring assets not in portfolio
  const assetsNotOwned = marketData.assets.filter(asset => {
    return !portfolio.positions || !portfolio.positions[asset.ticker];
  });

  const topOpportunities = assetsNotOwned
    .filter(asset => asset.quant_score > 70)
    .sort((a, b) => b.quant_score - a.quant_score)
    .slice(0, 3);

  topOpportunities.forEach(asset => {
    recommendations.push({
      type: RECOMMENDATION_TYPES.BUY_OPPORTUNITY,
      priority: RECOMMENDATION_PRIORITY.MEDIUM,
      ticker: asset.ticker,
      name: asset.name || asset.ticker,
      title: i18n.t('ml.portfolio.buy_opportunity_title', { ticker: asset.ticker }),
      message: i18n.t('ml.portfolio.buy_opportunity_message', {
        score: asset.quant_score.toFixed(1)
      }),
      action: i18n.t('ml.portfolio.action_consider_buying'),
      quant_score: asset.quant_score,
      confidence: 0.70,
      timestamp: Date.now()
    });
  });

  return recommendations;
}

/**
 * Detect sell alerts
 */
function detectSellAlerts(portfolio, historicalPerformance) {
  const recommendations = [];

  if (!portfolio.positions || !historicalPerformance) return recommendations;

  Object.entries(portfolio.positions).forEach(([ticker, position]) => {
    // Check for significant underperformance
    const performance = historicalPerformance[ticker];

    if (performance && performance.return_60d < -15) {
      recommendations.push({
        type: RECOMMENDATION_TYPES.SELL_ALERT,
        priority: RECOMMENDATION_PRIORITY.HIGH,
        ticker,
        name: position.name || ticker,
        title: i18n.t('ml.portfolio.sell_alert_title', { ticker }),
        message: i18n.t('ml.portfolio.sell_alert_message', {
          return: Math.abs(performance.return_60d).toFixed(1)
        }),
        action: i18n.t('ml.portfolio.action_consider_selling'),
        confidence: 0.65,
        timestamp: Date.now()
      });
    }

    // Check for score degradation
    if (position.quant_score < 40) {
      recommendations.push({
        type: RECOMMENDATION_TYPES.SELL_ALERT,
        priority: RECOMMENDATION_PRIORITY.MEDIUM,
        ticker,
        name: position.name || ticker,
        title: i18n.t('ml.portfolio.low_score_title', { ticker }),
        message: i18n.t('ml.portfolio.low_score_message', {
          score: position.quant_score.toFixed(1)
        }),
        action: i18n.t('ml.portfolio.action_monitor_closely'),
        confidence: 0.60,
        timestamp: Date.now()
      });
    }
  });

  return recommendations;
}

/**
 * Detect diversification needs
 */
function detectDiversificationNeeds(portfolio) {
  const recommendations = [];

  if (!portfolio.sector_exposure) return recommendations;

  // Check sector concentration
  Object.entries(portfolio.sector_exposure).forEach(([sector, weight]) => {
    if (weight > 0.35) {
      recommendations.push({
        type: RECOMMENDATION_TYPES.DIVERSIFICATION,
        priority: RECOMMENDATION_PRIORITY.MEDIUM,
        title: i18n.t('ml.portfolio.high_sector_exposure_title', { sector }),
        message: i18n.t('ml.portfolio.high_sector_exposure_message', {
          sector,
          weight: (weight * 100).toFixed(1)
        }),
        action: i18n.t('ml.portfolio.action_diversify_sectors'),
        confidence: 0.75,
        timestamp: Date.now()
      });
    }
  });

  return recommendations;
}

/**
 * Detect regime changes
 */
function detectRegimeChanges(marketData) {
  const recommendations = [];

  if (!marketData || !marketData.regime_prediction) return recommendations;

  const { regime, confidence, previous_regime } = marketData.regime_prediction;

  if (previous_regime && regime !== previous_regime && confidence > 0.7) {
    const priority = regime === 'risk_off' ? RECOMMENDATION_PRIORITY.CRITICAL : RECOMMENDATION_PRIORITY.HIGH;

    recommendations.push({
      type: RECOMMENDATION_TYPES.REGIME_CHANGE,
      priority,
      title: i18n.t('ml.portfolio.regime_change_title'),
      message: i18n.t('ml.portfolio.regime_change_message', {
        from: i18n.t(`ml.regime.${previous_regime}`),
        to: i18n.t(`ml.regime.${regime}`),
        confidence: (confidence * 100).toFixed(0)
      }),
      action: i18n.t(regime === 'risk_off' ? 'ml.portfolio.action_reduce_risk' : 'ml.portfolio.action_adjust_strategy'),
      regime,
      confidence,
      timestamp: Date.now()
    });
  }

  return recommendations;
}

// =====================================================
// INDIVIDUAL ASSET ML ANALYSIS
// =====================================================

/**
 * Analyze individual asset with ML-based insights
 * Returns ML-specific recommendations for a single asset
 */
export function analyzeAssetML(result, marketData, allAssets) {
  const insights = {
    regimeImpact: null,
    momentumShift: null,
    mlSignal: null,
    riskScore: null
  };

  // 1. Regime change impact analysis
  if (marketData?.regime_prediction) {
    insights.regimeImpact = analyzeRegimeImpact(result, marketData.regime_prediction);
  }

  // 2. Momentum shift detection using ML
  if (allAssets && allAssets.length > 10) {
    insights.momentumShift = detectMomentumShiftML(result, allAssets);
  }

  // 3. ML-based buy/sell signal
  insights.mlSignal = generateMLSignal(result, marketData);

  // 4. ML risk scoring
  insights.riskScore = calculateMLRiskScore(result, allAssets);

  return insights;
}

/**
 * Analyze how regime changes affect this specific asset
 */
function analyzeRegimeImpact(result, regimePrediction) {
  const { regime, confidence, previous_regime } = regimePrediction;

  if (!regime || !previous_regime || regime === previous_regime) {
    return null;
  }

  const d = result.details;
  const volatility = parseFloat(d.risk.volatility) || 0;
  const beta = parseFloat(d.risk.relativeVol) || 1.0;

  // Determine if asset is defensive or aggressive
  const isDefensive = volatility < 20 && beta < 0.9;
  const isAggressive = volatility > 30 || beta > 1.2;

  let impact = 'neutral';
  let severity = 'moderate';

  if (regime === 'risk_off') {
    if (isDefensive) {
      impact = 'favorable';
      severity = 'high';
    } else if (isAggressive) {
      impact = 'unfavorable';
      severity = 'high';
    }
  } else if (regime === 'risk_on') {
    if (isAggressive) {
      impact = 'favorable';
      severity = 'moderate';
    } else if (isDefensive) {
      impact = 'unfavorable';
      severity = 'low';
    }
  }

  return {
    regime,
    previous_regime,
    confidence,
    impact,
    severity,
    isDefensive,
    isAggressive
  };
}

/**
 * Detect momentum shifts using ML clustering approach
 */
function detectMomentumShiftML(result, allAssets) {
  const roc6m = parseFloat(result.details.momentum.roc6m) || 0;
  const roc12m = parseFloat(result.details.momentum.roc12m) || 0;
  const scoreMomentum = result.scoreMomentum || 0;

  // Calculate percentile position in the universe
  const allRoc6m = allAssets.map(a => parseFloat(a.details?.momentum?.roc6m) || 0);
  const percentile = allRoc6m.filter(r => r < roc6m).length / allRoc6m.length;

  // Detect acceleration or deceleration
  const acceleration = roc6m - (roc12m / 2); // Simplified acceleration metric
  const isAccelerating = acceleration > 5;
  const isDecelerating = acceleration < -5;

  let shift = 'stable';
  let strength = 'moderate';

  if (isAccelerating && scoreMomentum > 60) {
    shift = 'accelerating';
    strength = scoreMomentum > 75 ? 'strong' : 'moderate';
  } else if (isDecelerating && scoreMomentum < 50) {
    shift = 'decelerating';
    strength = scoreMomentum < 35 ? 'strong' : 'moderate';
  } else if (percentile > 0.8) {
    shift = 'strong_positive';
    strength = 'high';
  } else if (percentile < 0.2) {
    shift = 'strong_negative';
    strength = 'high';
  }

  return {
    shift,
    strength,
    acceleration: acceleration.toFixed(2),
    percentile: (percentile * 100).toFixed(0),
    roc6m,
    roc12m
  };
}

/**
 * Generate ML-based buy/sell signal
 */
function generateMLSignal(result, marketData) {
  const score = result.scoreTotal || 0;
  const scoreMomentum = result.scoreMomentum || 0;
  const scoreTrend = result.scoreTrend || 0;
  const scoreRisk = result.scoreRisk || 0;
  const rsi = parseFloat(result.details.momentum.rsi) || 50;
  const volatility = parseFloat(result.details.risk.volatility) || 0;

  // ML-inspired composite signal using weighted factors
  let mlScore = 0;
  let confidence = 0;

  // Score component (40% weight)
  mlScore += (score / 100) * 0.4;

  // Momentum + Trend synergy (30% weight)
  const trendMomentumSynergy = (scoreMomentum + scoreTrend) / 200;
  mlScore += trendMomentumSynergy * 0.3;

  // Risk-adjusted component (20% weight)
  const riskAdjusted = scoreRisk / 100;
  mlScore += riskAdjusted * 0.2;

  // RSI mean reversion opportunity (10% weight)
  const rsiScore = rsi < 30 ? 1.0 : rsi > 70 ? 0.0 : 0.5;
  mlScore += rsiScore * 0.1;

  // Determine signal
  let signal = 'HOLD';
  confidence = Math.abs(mlScore - 0.5) * 200; // Distance from neutral (50%)

  if (mlScore >= 0.7) {
    signal = 'STRONG_BUY';
  } else if (mlScore >= 0.6) {
    signal = 'BUY';
  } else if (mlScore <= 0.3) {
    signal = 'STRONG_SELL';
  } else if (mlScore <= 0.4) {
    signal = 'SELL';
  }

  // Adjust for high volatility
  if (volatility > 40 && (signal === 'STRONG_BUY' || signal === 'BUY')) {
    signal = signal === 'STRONG_BUY' ? 'BUY' : 'HOLD';
    confidence *= 0.8;
  }

  return {
    signal,
    confidence: Math.min(confidence, 95).toFixed(0),
    mlScore: (mlScore * 100).toFixed(1)
  };
}

/**
 * Calculate ML-based risk score
 */
function calculateMLRiskScore(result, allAssets) {
  const volatility = parseFloat(result.details.risk.volatility) || 0;
  const maxDrawdown = Math.abs(parseFloat(result.details.risk.maxDrawdown)) || 0;
  const scoreRisk = result.scoreRisk || 0;

  // Calculate relative risk position in universe
  let relativeRiskPercentile = 50;
  if (allAssets && allAssets.length > 0) {
    const allVolatilities = allAssets.map(a => parseFloat(a.details?.risk?.volatility) || 0);
    relativeRiskPercentile = (allVolatilities.filter(v => v > volatility).length / allVolatilities.length) * 100;
  }

  // Composite risk assessment
  let riskLevel = 'MODERATE';
  let riskScore = 0;

  // Factor 1: Absolute volatility
  if (volatility > 50) {
    riskScore += 40;
  } else if (volatility > 35) {
    riskScore += 30;
  } else if (volatility > 25) {
    riskScore += 20;
  } else {
    riskScore += 10;
  }

  // Factor 2: Maximum drawdown
  if (maxDrawdown > 40) {
    riskScore += 35;
  } else if (maxDrawdown > 25) {
    riskScore += 25;
  } else if (maxDrawdown > 15) {
    riskScore += 15;
  } else {
    riskScore += 5;
  }

  // Factor 3: Risk score quality (inverse)
  riskScore += (100 - scoreRisk) * 0.25;

  // Determine risk level
  if (riskScore > 70) {
    riskLevel = 'VERY_HIGH';
  } else if (riskScore > 50) {
    riskLevel = 'HIGH';
  } else if (riskScore > 30) {
    riskLevel = 'MODERATE';
  } else {
    riskLevel = 'LOW';
  }

  return {
    riskLevel,
    riskScore: Math.min(riskScore, 100).toFixed(0),
    relativeRiskPercentile: relativeRiskPercentile.toFixed(0),
    volatility: volatility.toFixed(1),
    maxDrawdown: maxDrawdown.toFixed(1)
  };
}

// =====================================================
// RECOMMENDATION FILTERING & RANKING
// =====================================================

/**
 * Filter recommendations by priority
 */
export function filterByPriority(recommendations, minPriority = RECOMMENDATION_PRIORITY.MEDIUM.level) {
  return recommendations.filter(rec => rec.priority.level >= minPriority);
}

/**
 * Group recommendations by type
 */
export function groupByType(recommendations) {
  const groups = {};

  recommendations.forEach(rec => {
    if (!groups[rec.type]) {
      groups[rec.type] = [];
    }
    groups[rec.type].push(rec);
  });

  return groups;
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  RECOMMENDATION_TYPES,
  RECOMMENDATION_PRIORITY,
  generateRecommendations,
  filterByPriority,
  groupByType,
  analyzeAssetML
};
