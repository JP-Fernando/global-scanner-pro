// =====================================================
// DYNAMIC GOVERNANCE - Adaptive Limits System
// =====================================================

import i18n from '../i18n/i18n.js';
import { INVESTMENT_RULES, RISK_PROFILES } from './governance.js';

/**
 * Dynamic Governance System
 *
 * Ajusta automáticamente los límites de gobernanza basándose en:
 * - Volatilidad del mercado (VIX-style regimes)
 * - Correlaciones entre activos (crowding risk)
 * - Condiciones de liquidez
 * - Stress indicators
 *
 * Philosophy:
 * - En mercados volátiles → reduce límites de concentración
 * - En alta correlación → aumenta diversificación
 * - En baja liquidez → reduce tamaños de posición
 * - En stress → endurecimiento automático
 */

// =====================================================
// MARKET REGIME DETECTION
// =====================================================

export const VOLATILITY_REGIMES = {
  LOW: { name: 'Low Volatility', threshold: 15, multiplier: 1.2 },
  NORMAL: { name: 'Normal', threshold: 25, multiplier: 1.0 },
  HIGH: { name: 'High Volatility', threshold: 35, multiplier: 0.8 },
  EXTREME: { name: 'Extreme Volatility', threshold: Infinity, multiplier: 0.6 }
};

export const CORRELATION_REGIMES = {
  LOW: { name: 'Low Correlation', threshold: 0.5, multiplier: 1.1 },
  MODERATE: { name: 'Moderate Correlation', threshold: 0.7, multiplier: 1.0 },
  HIGH: { name: 'High Correlation', threshold: 0.85, multiplier: 0.85 },
  EXTREME: { name: 'Extreme Correlation', threshold: Infinity, multiplier: 0.7 }
};

/**
 * Detecta el régimen de volatilidad actual
 */
export function detectVolatilityRegime(portfolioVolatility) {
  if (portfolioVolatility < VOLATILITY_REGIMES.LOW.threshold) {
    return { ...VOLATILITY_REGIMES.LOW, current_vol: portfolioVolatility };
  } else if (portfolioVolatility < VOLATILITY_REGIMES.NORMAL.threshold) {
    return { ...VOLATILITY_REGIMES.NORMAL, current_vol: portfolioVolatility };
  } else if (portfolioVolatility < VOLATILITY_REGIMES.HIGH.threshold) {
    return { ...VOLATILITY_REGIMES.HIGH, current_vol: portfolioVolatility };
  } else {
    return { ...VOLATILITY_REGIMES.EXTREME, current_vol: portfolioVolatility };
  }
}

/**
 * Detecta el régimen de correlación actual
 */
export function detectCorrelationRegime(avgCorrelation) {
  if (avgCorrelation < CORRELATION_REGIMES.LOW.threshold) {
    return { ...CORRELATION_REGIMES.LOW, current_corr: avgCorrelation };
  } else if (avgCorrelation < CORRELATION_REGIMES.MODERATE.threshold) {
    return { ...CORRELATION_REGIMES.MODERATE, current_corr: avgCorrelation };
  } else if (avgCorrelation < CORRELATION_REGIMES.HIGH.threshold) {
    return { ...CORRELATION_REGIMES.HIGH, current_corr: avgCorrelation };
  } else {
    return { ...CORRELATION_REGIMES.EXTREME, current_corr: avgCorrelation };
  }
}

/**
 * Calcula la correlación promedio de la cartera
 */
export function calculateAverageCorrelation(correlationMatrix) {
  if (!correlationMatrix || correlationMatrix.length === 0) {
    return 0.5; // Default conservative estimate
  }

  let sum = 0;
  let count = 0;

  for (let i = 0; i < correlationMatrix.length; i++) {
    for (let j = i + 1; j < correlationMatrix[i].length; j++) {
      sum += Math.abs(correlationMatrix[i][j]);
      count++;
    }
  }

  return count > 0 ? sum / count : 0.5;
}

// =====================================================
// DYNAMIC LIMITS ADJUSTMENT
// =====================================================

/**
 * Ajusta dinámicamente los límites de gobernanza
 * según las condiciones del mercado
 */
export function calculateDynamicLimits(marketConditions, baseRules = INVESTMENT_RULES) {
  const {
    portfolioVolatility = 20,
    correlationMatrix = null,
    avgLiquidity = 100000,
    stressLevel = 0
  } = marketConditions;

  // 1. Detectar regímenes
  const volRegime = detectVolatilityRegime(portfolioVolatility);
  const avgCorr = correlationMatrix
    ? calculateAverageCorrelation(correlationMatrix)
    : 0.5;
  const corrRegime = detectCorrelationRegime(avgCorr);

  // 2. Calcular multiplicadores combinados
  const volMultiplier = volRegime.multiplier;
  const corrMultiplier = corrRegime.multiplier;

  // Stress level (0-1) reduce límites adicional
  const stressMultiplier = 1 - (stressLevel * 0.3);

  // Liquidity adjustment
  const liquidityMultiplier = avgLiquidity < 50000 ? 0.8 : 1.0;

  // Combined multiplier (más conservador gana)
  const combinedMultiplier = Math.min(
    volMultiplier,
    corrMultiplier,
    stressMultiplier,
    liquidityMultiplier
  );

  // 3. Aplicar ajustes a límites
  const dynamicRules = {
    ...baseRules,

    // Position limits (reduced in high vol/correlation)
    max_position_weight: Math.max(
      0.05,
      baseRules.max_position_weight * combinedMultiplier
    ),

    // Sector limits (tighter in high correlation)
    max_sector_weight: Math.max(
      0.15,
      baseRules.max_sector_weight * corrMultiplier
    ),

    // Country limits
    max_country_weight: Math.max(
      0.20,
      baseRules.max_country_weight * corrMultiplier
    ),

    // Top 3 concentration (muy sensible a correlación)
    max_top3_concentration: Math.max(
      0.20,
      baseRules.max_top3_concentration * (corrMultiplier * 0.9)
    ),

    // Volatility target (adjusted by regime)
    max_portfolio_volatility: baseRules.max_portfolio_volatility,

    // Rebalance threshold (más frecuente en alta vol)
    rebalance_threshold: volRegime.name === 'High Volatility' || volRegime.name === 'Extreme Volatility'
      ? baseRules.rebalance_threshold * 0.7
      : baseRules.rebalance_threshold,

    // Correlation control (más estricto en crowding)
    max_pairwise_correlation: corrRegime.name === 'High Correlation' || corrRegime.name === 'Extreme Correlation'
      ? 0.75
      : baseRules.max_pairwise_correlation,

    // Liquidity requirements (higher in stress)
    min_daily_volume: stressLevel > 0.5
      ? baseRules.min_daily_volume * 1.5
      : baseRules.min_daily_volume
  };

  // 4. Metadata sobre ajustes
  const adjustmentMetadata = {
    regime: {
      volatility: volRegime.name,
      correlation: corrRegime.name,
      stress: stressLevel > 0.5 ? 'High' : 'Normal',
      liquidity: avgLiquidity < 50000 ? 'Low' : 'Normal'
    },
    multipliers: {
      volatility: volMultiplier.toFixed(2),
      correlation: corrMultiplier.toFixed(2),
      stress: stressMultiplier.toFixed(2),
      liquidity: liquidityMultiplier.toFixed(2),
      combined: combinedMultiplier.toFixed(2)
    },
    changes: {
      max_position: `${(baseRules.max_position_weight * 100).toFixed(0)}% → ${(dynamicRules.max_position_weight * 100).toFixed(0)}%`,
      max_sector: `${(baseRules.max_sector_weight * 100).toFixed(0)}% → ${(dynamicRules.max_sector_weight * 100).toFixed(0)}%`,
      max_top3: `${(baseRules.max_top3_concentration * 100).toFixed(0)}% → ${(dynamicRules.max_top3_concentration * 100).toFixed(0)}%`,
      rebalance_threshold: `${(baseRules.rebalance_threshold * 100).toFixed(1)}% → ${(dynamicRules.rebalance_threshold * 100).toFixed(1)}%`
    },
    recommendation: generateRecommendation(volRegime, corrRegime, stressLevel)
  };

  return {
    rules: dynamicRules,
    metadata: adjustmentMetadata,
    timestamp: new Date().toISOString()
  };
}

/**
 * Genera recomendación basada en condiciones
 */
function generateRecommendation(volRegime, corrRegime, stressLevel) {
  const recommendations = [];

  // Volatility-based
  if (volRegime.name === 'Extreme Volatility') {
    recommendations.push({
      type: 'CRITICAL',
      message: i18n.t('dynamic_governance.rec_extreme_vol') ||
        'Extreme volatility detected. Position limits significantly reduced. Consider reducing overall exposure.'
    });
  } else if (volRegime.name === 'High Volatility') {
    recommendations.push({
      type: 'WARNING',
      message: i18n.t('dynamic_governance.rec_high_vol') ||
        'High volatility regime. Position limits tightened. Monitor drawdowns closely.'
    });
  }

  // Correlation-based
  if (corrRegime.name === 'Extreme Correlation') {
    recommendations.push({
      type: 'CRITICAL',
      message: i18n.t('dynamic_governance.rec_extreme_corr') ||
        'Extreme correlation detected (crowding risk). Diversification benefits limited. Reduce concentration.'
    });
  } else if (corrRegime.name === 'High Correlation') {
    recommendations.push({
      type: 'WARNING',
      message: i18n.t('dynamic_governance.rec_high_corr') ||
        'High correlation regime. Sector limits tightened to improve diversification.'
    });
  }

  // Stress-based
  if (stressLevel > 0.7) {
    recommendations.push({
      type: 'CRITICAL',
      message: i18n.t('dynamic_governance.rec_high_stress') ||
        'High stress conditions. Liquidity requirements increased. Consider defensive positioning.'
    });
  } else if (stressLevel > 0.5) {
    recommendations.push({
      type: 'WARNING',
      message: i18n.t('dynamic_governance.rec_moderate_stress') ||
        'Moderate stress detected. Monitor liquidity and rebalancing thresholds.'
    });
  }

  // Positive conditions
  if (volRegime.name === 'Low Volatility' && corrRegime.name === 'Low Correlation') {
    recommendations.push({
      type: 'INFO',
      message: i18n.t('dynamic_governance.rec_favorable') ||
        'Favorable market conditions. Limits slightly relaxed to capture opportunities.'
    });
  }

  return recommendations;
}

// =====================================================
// DYNAMIC RISK PROFILE ADJUSTMENT
// =====================================================

/**
 * Ajusta el perfil de riesgo dinámicamente
 */
export function adjustRiskProfile(baseProfile, marketConditions) {
  const baseRules = RISK_PROFILES[baseProfile]?.rules || INVESTMENT_RULES;
  const dynamic = calculateDynamicLimits(marketConditions, baseRules);

  return {
    original_profile: baseProfile,
    adjusted_rules: dynamic.rules,
    adjustment_metadata: dynamic.metadata,
    effective_profile: determineEffectiveProfile(dynamic.rules)
  };
}

/**
 * Determina el perfil efectivo basado en límites ajustados
 */
function determineEffectiveProfile(rules) {
  const maxPos = rules.max_position_weight;
  const maxVol = rules.max_portfolio_volatility;

  if (maxPos <= 0.10 && maxVol <= 15) {
    return 'conservative';
  } else if (maxPos <= 0.15 && maxVol <= 20) {
    return 'moderate';
  } else if (maxPos <= 0.20 && maxVol <= 30) {
    return 'aggressive';
  } else {
    return 'custom';
  }
}

// =====================================================
// STRESS TESTING FOR DYNAMIC LIMITS
// =====================================================

/**
 * Simula límites dinámicos bajo diferentes escenarios
 */
export function stressTestDynamicLimits(baseRules = INVESTMENT_RULES) {
  const scenarios = [
    {
      name: 'Normal Market',
      conditions: {
        portfolioVolatility: 18,
        correlationMatrix: null, // avg ~0.5
        avgLiquidity: 100000,
        stressLevel: 0.1
      }
    },
    {
      name: 'High Volatility',
      conditions: {
        portfolioVolatility: 32,
        correlationMatrix: null,
        avgLiquidity: 80000,
        stressLevel: 0.4
      }
    },
    {
      name: 'Market Crash (2008-style)',
      conditions: {
        portfolioVolatility: 45,
        correlationMatrix: generateHighCorrMatrix(10, 0.9), // high crowding
        avgLiquidity: 30000,
        stressLevel: 0.9
      }
    },
    {
      name: 'Flash Crash',
      conditions: {
        portfolioVolatility: 60,
        correlationMatrix: generateHighCorrMatrix(10, 0.95),
        avgLiquidity: 10000,
        stressLevel: 1.0
      }
    },
    {
      name: 'Goldilocks (ideal)',
      conditions: {
        portfolioVolatility: 12,
        correlationMatrix: generateHighCorrMatrix(10, 0.3), // low correlation
        avgLiquidity: 200000,
        stressLevel: 0.0
      }
    }
  ];

  const results = scenarios.map(scenario => {
    const dynamic = calculateDynamicLimits(scenario.conditions, baseRules);
    return {
      scenario: scenario.name,
      conditions: scenario.conditions,
      adjusted_limits: dynamic.rules,
      metadata: dynamic.metadata
    };
  });

  return results;
}

/**
 * Genera matriz de correlación sintética
 */
function generateHighCorrMatrix(size, avgCorr) {
  const matrix = [];
  for (let i = 0; i < size; i++) {
    matrix[i] = [];
    for (let j = 0; j < size; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
      } else {
        // Random variation around avgCorr
        matrix[i][j] = avgCorr + (Math.random() - 0.5) * 0.1;
        matrix[i][j] = Math.max(0, Math.min(1, matrix[i][j]));
      }
    }
  }
  return matrix;
}

// =====================================================
// MONITORING & ALERTS
// =====================================================

/**
 * Monitorea condiciones del mercado y genera alertas
 */
export function monitorMarketConditions(currentConditions, historicalConditions = []) {
  const current = calculateDynamicLimits(currentConditions);
  const alerts = [];

  // Alert on regime changes
  if (historicalConditions.length > 0) {
    const previous = calculateDynamicLimits(historicalConditions[historicalConditions.length - 1]);

    if (current.metadata.regime.volatility !== previous.metadata.regime.volatility) {
      alerts.push({
        type: 'REGIME_CHANGE',
        severity: 'HIGH',
        message: `Volatility regime changed: ${previous.metadata.regime.volatility} → ${current.metadata.regime.volatility}`,
        action: 'Review position sizes and rebalancing thresholds'
      });
    }

    if (current.metadata.regime.correlation !== previous.metadata.regime.correlation) {
      alerts.push({
        type: 'REGIME_CHANGE',
        severity: 'MEDIUM',
        message: `Correlation regime changed: ${previous.metadata.regime.correlation} → ${current.metadata.regime.correlation}`,
        action: 'Review sector diversification'
      });
    }
  }

  // Alert on limit reductions
  const positionReduction = (
    (INVESTMENT_RULES.max_position_weight - current.rules.max_position_weight) /
    INVESTMENT_RULES.max_position_weight
  ) * 100;

  if (positionReduction > 20) {
    alerts.push({
      type: 'LIMIT_REDUCTION',
      severity: 'HIGH',
      message: `Position limits reduced by ${positionReduction.toFixed(0)}%`,
      action: 'Rebalance portfolio to meet new limits'
    });
  }

  return {
    current_limits: current,
    alerts,
    timestamp: new Date().toISOString()
  };
}

// =====================================================
// EXPORT
// =====================================================

export default {
  calculateDynamicLimits,
  adjustRiskProfile,
  detectVolatilityRegime,
  detectCorrelationRegime,
  calculateAverageCorrelation,
  stressTestDynamicLimits,
  monitorMarketConditions,
  VOLATILITY_REGIMES,
  CORRELATION_REGIMES
};
