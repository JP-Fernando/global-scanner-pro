// =====================================================
// SISTEMA DE ASIGNACIÓN DE CAPITAL
// =====================================================

import * as ind from './indicators.js';

// =====================================================
// CONFIGURACIÓN
// =====================================================

export const ALLOCATION_METHODS = {
  equal_weight: {
    name: "Equal Weight",
    description: "Peso igual para todos los activos seleccionados",
    risk_level: "Bajo"
  },

  score_weighted: {
    name: "Score-Weighted",
    description: "Peso proporcional al Quant Score de cada activo",
    risk_level: "Medio"
  },

  erc: {
    name: "Equal Risk Contribution (ERC)",
    description: "Cada activo contribuye igual al riesgo total",
    risk_level: "Medio-Bajo"
  },

  volatility_target: {
    name: "Volatility Targeting",
    description: "Ajusta pesos para alcanzar volatilidad objetivo",
    risk_level: "Configurable"
  },

  hybrid: {
    name: "Hybrid (ERC + Score)",
    description: "Combina diversificación por riesgo con calidad de señales",
    risk_level: "Medio"
  }
};

export const ALLOCATION_CONFIG = {
  max_position_weight: 1.0,
  min_position_weight: 0.02,
  target_volatility: 15,
  max_assets_in_portfolio: 30,
  min_assets_in_portfolio: 1
};

// =====================================================
// MÉTODOS DE ASIGNACIÓN
// =====================================================

export const equalWeightAllocation = (assets) => {
  const n = assets.length;
  const weight = 1 / n;

  return assets.map(asset => ({
    ticker: asset.ticker,
    name: asset.name,
    weight: weight,
    weight_pct: (weight * 100).toFixed(2),
    score: asset.scoreTotal,
    volatility: asset.details?.risk?.volatility || 'N/A'
  }));
};

export const scoreWeightedAllocation = (assets, config = ALLOCATION_CONFIG) => {
  let weights = assets.map(a => a.scoreTotal / 100);
  const total = weights.reduce((sum, w) => sum + w, 0);

  weights = weights.map(w => w / total);
  weights = weights.map(w =>
    Math.max(config.min_position_weight, Math.min(w, config.max_position_weight))
  );

  const newTotal = weights.reduce((sum, w) => sum + w, 0);
  weights = weights.map(w => w / newTotal);

  return assets.map((asset, i) => ({
    ticker: asset.ticker,
    name: asset.name,
    weight: weights[i],
    weight_pct: (weights[i] * 100).toFixed(2),
    score: asset.scoreTotal,
    volatility: asset.details?.risk?.volatility || 'N/A'
  }));
};

export const equalRiskContribution = (assets, config = ALLOCATION_CONFIG) => {
  const volatilities = assets.map(a => {
    const vol = parseFloat(a.details?.risk?.volatility) || 20;
    return vol;
  });

  const invVols = volatilities.map(v => 1 / v);
  const sumInvVols = invVols.reduce((sum, iv) => sum + iv, 0);
  let weights = invVols.map(iv => iv / sumInvVols);

  weights = weights.map(w =>
    Math.max(config.min_position_weight, Math.min(w, config.max_position_weight))
  );

  const newTotal = weights.reduce((sum, w) => sum + w, 0);
  weights = weights.map(w => w / newTotal);

  return assets.map((asset, i) => ({
    ticker: asset.ticker,
    name: asset.name,
    weight: weights[i],
    weight_pct: (weights[i] * 100).toFixed(2),
    score: asset.scoreTotal,
    volatility: volatilities[i].toFixed(2)
  }));
};

export const volatilityTargeting = (assets, config = ALLOCATION_CONFIG) => {
  const targetVol = config.target_volatility;

  const volatilities = assets.map(a => {
    const vol = parseFloat(a.details?.risk?.volatility) || 20;
    return vol;
  });

  let weights = new Array(assets.length).fill(1 / assets.length);
  const avgVol = volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;
  const scalingFactor = targetVol / avgVol;

  weights = weights.map((w, i) => {
    const adjustedWeight = w * (targetVol / volatilities[i]) * scalingFactor;
    return Math.max(config.min_position_weight, Math.min(adjustedWeight, config.max_position_weight));
  });

  const total = weights.reduce((sum, w) => sum + w, 0);
  weights = weights.map(w => w / total);

  return assets.map((asset, i) => ({
    ticker: asset.ticker,
    name: asset.name,
    weight: weights[i],
    weight_pct: (weights[i] * 100).toFixed(2),
    score: asset.scoreTotal,
    volatility: volatilities[i].toFixed(2)
  }));
};

export const hybridAllocation = (assets, config = ALLOCATION_CONFIG) => {
  const ercWeights = equalRiskContribution(assets, config);
  const scoreWeights = scoreWeightedAllocation(assets, config);

  const hybridWeights = assets.map((asset, i) => {
    const w = (ercWeights[i].weight * 0.5) + (scoreWeights[i].weight * 0.5);
    return Math.max(config.min_position_weight, Math.min(w, config.max_position_weight));
  });

  const total = hybridWeights.reduce((sum, w) => sum + w, 0);
  const normalized = hybridWeights.map(w => w / total);

  return assets.map((asset, i) => ({
    ticker: asset.ticker,
    name: asset.name,
    weight: normalized[i],
    weight_pct: (normalized[i] * 100).toFixed(2),
    score: asset.scoreTotal,
    volatility: parseFloat(asset.details?.risk?.volatility || 20).toFixed(2)
  }));
};

// =====================================================
// CÁLCULO DE RIESGO AGREGADO
// =====================================================

export const calculatePortfolioRisk = (allocatedAssets) => {
  const weights = allocatedAssets.map(a => a.weight);
  const volatilities = allocatedAssets.map(a => parseFloat(a.volatility) || 20);

  const portfolioVol = calculateSimplePortfolioVolatility(volatilities, weights);

  const weightedAvgVol = weights.reduce((sum, w, i) => sum + w * volatilities[i], 0);
  const diversificationRatio = weightedAvgVol / portfolioVol;

  const herfindahl = weights.reduce((sum, w) => sum + w * w, 0);
  const effectiveN = 1 / herfindahl;

  const maxDrawdowns = allocatedAssets.map(a => {
    const score = parseFloat(a.score) || 50;
    return score > 70 ? 15 : score > 50 ? 25 : 35;
  });
  const portfolioMaxDD = weights.reduce((sum, w, i) => sum + w * maxDrawdowns[i], 0);

  const marginalRisk = weights.map((w, i) => ({
    ticker: allocatedAssets[i].ticker,
    contribution: (w * volatilities[i] / portfolioVol * 100).toFixed(2)
  }));

  return {
    portfolioVolatility: portfolioVol.toFixed(2),
    diversificationRatio: diversificationRatio.toFixed(2),
    effectiveNAssets: effectiveN.toFixed(1),
    concentration: (herfindahl * 100).toFixed(2),
    estimatedMaxDD: portfolioMaxDD.toFixed(2),
    marginalRisk: marginalRisk
  };
};

const calculateSimplePortfolioVolatility = (volatilities, weights) => {
  const weightedVariance = weights.reduce((sum, w, i) =>
    sum + (w * w * volatilities[i] * volatilities[i]), 0
  );

  const avgCorrelation = 0.3;
  let covariance = 0;

  for (let i = 0; i < weights.length; i++) {
    for (let j = i + 1; j < weights.length; j++) {
      covariance += 2 * weights[i] * weights[j] * volatilities[i] * volatilities[j] * avgCorrelation;
    }
  }

  const portfolioVariance = weightedVariance + covariance;
  return Math.sqrt(portfolioVariance);
};

// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================

export const allocateCapital = (assets, method = 'hybrid', config = ALLOCATION_CONFIG) => {
  const selectedAssets = assets.slice(0, Math.min(assets.length, config.max_assets_in_portfolio));

  if (selectedAssets.length < config.min_assets_in_portfolio) {
    throw new Error(`Se requieren al menos ${config.min_assets_in_portfolio} activos para construir cartera`);
  }

  let allocation;

  switch(method) {
    case 'equal_weight':
      allocation = equalWeightAllocation(selectedAssets);
      break;
    case 'score_weighted':
      allocation = scoreWeightedAllocation(selectedAssets, config);
      break;
    case 'erc':
      allocation = equalRiskContribution(selectedAssets, config);
      break;
    case 'volatility_target':
      allocation = volatilityTargeting(selectedAssets, config);
      break;
    case 'hybrid':
      allocation = hybridAllocation(selectedAssets, config);
      break;
    default:
      allocation = hybridAllocation(selectedAssets, config);
  }

  const portfolioRisk = calculatePortfolioRisk(allocation);

  return {
    allocation,
    portfolioRisk,
    method,
    nAssets: selectedAssets.length,
    timestamp: new Date().toISOString()
  };
};

export const calculateCapitalRecommendations = (allocation, totalCapital = 100000) => {
  return allocation.map(a => ({
    ...a,
    recommended_capital: (a.weight * totalCapital).toFixed(2)
  }));
};

export default {
  ALLOCATION_METHODS,
  ALLOCATION_CONFIG,
  allocateCapital,
  calculatePortfolioRisk,
  calculateCapitalRecommendations
};
