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
        title: `Rebalance ${ticker}`,
        message: `Current weight (${(current_weight * 100).toFixed(1)}%) deviates from target (${(target_weight * 100).toFixed(1)}%) by ${(deviation * 100).toFixed(1)}%`,
        action: current_weight > target_weight ? 'Sell' : 'Buy',
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
        title: 'High Concentration Risk',
        message: `Top 3 positions represent ${(top3Concentration * 100).toFixed(1)}% of portfolio. Consider diversifying.`,
        action: 'Diversify',
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
      title: 'Elevated Market Volatility',
      message: `Market volatility at ${marketData.volatility.toFixed(1)}%. Consider reducing exposure or hedging.`,
      action: 'Review Risk',
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
      title: `Buy Opportunity: ${asset.ticker}`,
      message: `High quant score (${asset.quant_score.toFixed(1)}) with strong momentum and quality signals`,
      action: 'Consider Buying',
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
        title: `Sell Alert: ${ticker}`,
        message: `Position down ${Math.abs(performance.return_60d).toFixed(1)}% over 60 days. Consider exiting.`,
        action: 'Consider Selling',
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
        title: `Low Score: ${ticker}`,
        message: `Quant score dropped to ${position.quant_score.toFixed(1)}. Fundamentals weakening.`,
        action: 'Monitor Closely',
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
        title: `High ${sector} Exposure`,
        message: `${sector} sector represents ${(weight * 100).toFixed(1)}% of portfolio. Consider diversifying.`,
        action: 'Diversify Sectors',
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
      title: `Market Regime Change Detected`,
      message: `Market transitioning from ${previous_regime} to ${regime} with ${(confidence * 100).toFixed(0)}% confidence`,
      action: regime === 'risk_off' ? 'Reduce Risk' : 'Adjust Strategy',
      regime,
      confidence,
      timestamp: Date.now()
    });
  }

  return recommendations;
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
  groupByType
};
