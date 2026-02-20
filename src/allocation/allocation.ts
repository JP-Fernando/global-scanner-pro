// =====================================================
// CAPITAL ALLOCATION SYSTEM
// =====================================================

import * as _ind from '../indicators/indicators.js';
import i18n from '../i18n/i18n.js';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/** Input asset as produced by the scanner */
interface InputAsset {
  ticker: string;
  name: string;
  scoreTotal: number;
  sector?: string;
  volume?: number;
  details?: {
    risk?: {
      volatility?: string | number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Asset after allocation with computed weight */
interface AllocatedAsset {
  ticker: string;
  name: string;
  weight: number;
  weight_pct: string;
  score: number;
  volatility: string;
}

/** Asset with capital recommendation appended */
interface AllocatedAssetWithCapital extends AllocatedAsset {
  recommended_capital: string;
}

/** Marginal risk contribution for a single asset */
interface MarginalRiskEntry {
  ticker: string;
  contribution: string;
}

/** Portfolio-level risk metrics */
interface PortfolioRiskResult {
  portfolioVolatility: string;
  diversificationRatio: string;
  effectiveNAssets: string;
  concentration: string;
  estimatedMaxDD: string;
  marginalRisk: MarginalRiskEntry[];
}

/** Allocation configuration */
interface AllocationConfig {
  max_position_weight: number;
  min_position_weight: number;
  target_volatility: number;
  max_assets_in_portfolio: number;
  min_assets_in_portfolio: number;
}

/** Method descriptor shown in UI */
interface AllocationMethodInfo {
  name: string;
  description: string;
  risk_level: string;
}

/** Supported allocation method names */
type AllocationMethodName =
  | 'equal_weight'
  | 'score_weighted'
  | 'erc'
  | 'volatility_target'
  | 'hybrid';

/** Full result returned by allocateCapital */
interface AllocationResult {
  allocation: AllocatedAsset[];
  portfolioRisk: PortfolioRiskResult;
  method: string;
  nAssets: number;
  timestamp: string;
}

// =====================================================
// CONFIGURATION
// =====================================================

export const ALLOCATION_METHODS: Record<AllocationMethodName, AllocationMethodInfo> = {
  equal_weight: {
    name: "Equal Weight",
    description: "Equal weight for all selected assets",
    risk_level: "Low"
  },

  score_weighted: {
    name: "Score-Weighted",
    description: "Weight proportional to Quant Score of each asset",
    risk_level: "Medium"
  },

  erc: {
    name: "Equal Risk Contribution (ERC)",
    description: "Each asset contributes equally to total risk",
    risk_level: "Medium-Low"
  },

  volatility_target: {
    name: "Volatility Targeting",
    description: "Adjusts weights to reach target volatility",
    risk_level: "Configurable"
  },

  hybrid: {
    name: "Hybrid (ERC + Score)",
    description: "Combines risk diversification with signal quality",
    risk_level: "Medium"
  }
};

export const ALLOCATION_CONFIG: AllocationConfig = {
  max_position_weight: 1.0,
  min_position_weight: 0.02,
  target_volatility: 15,
  max_assets_in_portfolio: 30,
  min_assets_in_portfolio: 1
};

// =====================================================
// ALLOCATION METHODS
// =====================================================

export const equalWeightAllocation = (assets: InputAsset[]): AllocatedAsset[] => {
  const n: number = assets.length;
  const weight: number = 1 / n;

  return assets.map((asset: InputAsset): AllocatedAsset => ({
    ticker: asset.ticker,
    name: asset.name,
    weight,
    weight_pct: (weight * 100).toFixed(2),
    score: asset.scoreTotal,
    volatility: asset.details?.risk?.volatility as string || 'N/A'
  }));
};

export const scoreWeightedAllocation = (assets: InputAsset[], config: AllocationConfig = ALLOCATION_CONFIG): AllocatedAsset[] => {
  let weights: number[] = assets.map((a: InputAsset): number => a.scoreTotal / 100);
  const total: number = weights.reduce((sum: number, w: number): number => sum + w, 0);

  weights = weights.map((w: number): number => w / total);
  weights = weights.map((w: number): number =>
    Math.max(config.min_position_weight, Math.min(w, config.max_position_weight))
  );

  const newTotal: number = weights.reduce((sum: number, w: number): number => sum + w, 0);
  weights = weights.map((w: number): number => w / newTotal);

  return assets.map((asset: InputAsset, i: number): AllocatedAsset => ({
    ticker: asset.ticker,
    name: asset.name,
    weight: weights[i],
    weight_pct: (weights[i] * 100).toFixed(2),
    score: asset.scoreTotal,
    volatility: asset.details?.risk?.volatility as string || 'N/A'
  }));
};

export const equalRiskContribution = (assets: InputAsset[], config: AllocationConfig = ALLOCATION_CONFIG): AllocatedAsset[] => {
  const volatilities: number[] = assets.map((a: InputAsset): number => {
    const vol: number = parseFloat(a.details?.risk?.volatility as string) || 20;
    return vol;
  });

  const invVols: number[] = volatilities.map((v: number): number => 1 / v);
  const sumInvVols: number = invVols.reduce((sum: number, iv: number): number => sum + iv, 0);
  let weights: number[] = invVols.map((iv: number): number => iv / sumInvVols);

  weights = weights.map((w: number): number =>
    Math.max(config.min_position_weight, Math.min(w, config.max_position_weight))
  );

  const newTotal: number = weights.reduce((sum: number, w: number): number => sum + w, 0);
  weights = weights.map((w: number): number => w / newTotal);

  return assets.map((asset: InputAsset, i: number): AllocatedAsset => ({
    ticker: asset.ticker,
    name: asset.name,
    weight: weights[i],
    weight_pct: (weights[i] * 100).toFixed(2),
    score: asset.scoreTotal,
    volatility: volatilities[i].toFixed(2)
  }));
};

export const volatilityTargeting = (assets: InputAsset[], config: AllocationConfig = ALLOCATION_CONFIG): AllocatedAsset[] => {
  const targetVol: number = config.target_volatility;

  const volatilities: number[] = assets.map((a: InputAsset): number => {
    const vol: number = parseFloat(a.details?.risk?.volatility as string) || 20;
    return vol;
  });

  let weights: number[] = new Array(assets.length).fill(1 / assets.length);
  const avgVol: number = volatilities.reduce((sum: number, v: number): number => sum + v, 0) / volatilities.length;
  const scalingFactor: number = targetVol / avgVol;

  weights = weights.map((w: number, i: number): number => {
    const adjustedWeight: number = w * (targetVol / volatilities[i]) * scalingFactor;
    const minW: number = config.min_position_weight;
    const maxW: number = config.max_position_weight;
    return Math.max(minW, Math.min(adjustedWeight, maxW));
  });

  const total: number = weights.reduce((sum: number, w: number): number => sum + w, 0);
  weights = weights.map((w: number): number => w / total);

  return assets.map((asset: InputAsset, i: number): AllocatedAsset => ({
    ticker: asset.ticker,
    name: asset.name,
    weight: weights[i],
    weight_pct: (weights[i] * 100).toFixed(2),
    score: asset.scoreTotal,
    volatility: volatilities[i].toFixed(2)
  }));
};

export const hybridAllocation = (assets: InputAsset[], config: AllocationConfig = ALLOCATION_CONFIG): AllocatedAsset[] => {
  const ercWeights: AllocatedAsset[] = equalRiskContribution(assets, config);
  const scoreWeights: AllocatedAsset[] = scoreWeightedAllocation(assets, config);

  const hybridWeights: number[] = assets.map((_asset: InputAsset, i: number): number => {
    const w: number = (ercWeights[i].weight * 0.5) + (scoreWeights[i].weight * 0.5);
    return Math.max(config.min_position_weight, Math.min(w, config.max_position_weight));
  });

  const total: number = hybridWeights.reduce((sum: number, w: number): number => sum + w, 0);
  const normalized: number[] = hybridWeights.map((w: number): number => w / total);

  return assets.map((asset: InputAsset, i: number): AllocatedAsset => ({
    ticker: asset.ticker,
    name: asset.name,
    weight: normalized[i],
    weight_pct: (normalized[i] * 100).toFixed(2),
    score: asset.scoreTotal,
    volatility: parseFloat(asset.details?.risk?.volatility as string || '20').toFixed(2)
  }));
};

// =====================================================
// AGGREGATE RISK CALCULATION
// =====================================================

const calculateSimplePortfolioVolatility = (volatilities: number[], weights: number[]): number => {
  const weightedVariance: number = weights.reduce((sum: number, w: number, i: number): number =>
    sum + (w * w * volatilities[i] * volatilities[i]), 0
  );

  const avgCorrelation: number = 0.3;
  let covariance: number = 0;

  for (let i: number = 0; i < weights.length; i++) {
    for (let j: number = i + 1; j < weights.length; j++) {
      const cov: number = 2 * weights[i] * weights[j] *
        volatilities[i] * volatilities[j] * avgCorrelation;
      covariance += cov;
    }
  }

  const portfolioVariance: number = weightedVariance + covariance;
  return Math.sqrt(portfolioVariance);
};

export const calculatePortfolioRisk = (allocatedAssets: AllocatedAsset[]): PortfolioRiskResult => {
  const weights: number[] = allocatedAssets.map((a: AllocatedAsset): number => a.weight);
  const volatilities: number[] = allocatedAssets.map((a: AllocatedAsset): number => parseFloat(a.volatility) || 20);

  const portfolioVol: number = calculateSimplePortfolioVolatility(volatilities, weights);

  const weightedAvgVol: number = weights.reduce((sum: number, w: number, i: number): number => sum + w * volatilities[i], 0);
  const diversificationRatio: number = weightedAvgVol / portfolioVol;

  const herfindahl: number = weights.reduce((sum: number, w: number): number => sum + w * w, 0);
  const effectiveN: number = 1 / herfindahl;

  const maxDrawdowns: number[] = allocatedAssets.map((a: AllocatedAsset): number => {
    const score: number = parseFloat(a.score as unknown as string) || 50;
    return score > 70 ? 15 : score > 50 ? 25 : 35;
  });
  const portfolioMaxDD: number = weights.reduce((sum: number, w: number, i: number): number => sum + w * maxDrawdowns[i], 0);

  const marginalRisk: MarginalRiskEntry[] = weights.map((w: number, i: number): MarginalRiskEntry => ({
    ticker: allocatedAssets[i].ticker,
    contribution: (w * volatilities[i] / portfolioVol * 100).toFixed(2)
  }));

  return {
    portfolioVolatility: portfolioVol.toFixed(2),
    diversificationRatio: diversificationRatio.toFixed(2),
    effectiveNAssets: effectiveN.toFixed(1),
    concentration: (herfindahl * 100).toFixed(2),
    estimatedMaxDD: portfolioMaxDD.toFixed(2),
    marginalRisk
  };
};

// =====================================================
// MAIN FUNCTION
// =====================================================

export const allocateCapital = (assets: InputAsset[], method: string = 'hybrid', config: AllocationConfig = ALLOCATION_CONFIG): AllocationResult => {
  const selectedAssets: InputAsset[] = assets.slice(0, Math.min(assets.length, config.max_assets_in_portfolio));

  if (selectedAssets.length < config.min_assets_in_portfolio) {
    throw new Error(i18n.t('errors.min_assets_required', { min: String(config.min_assets_in_portfolio) }));
  }

  let allocation: AllocatedAsset[];

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

  const portfolioRisk: PortfolioRiskResult = calculatePortfolioRisk(allocation);

  return {
    allocation,
    portfolioRisk,
    method,
    nAssets: selectedAssets.length,
    timestamp: new Date().toISOString()
  };
};

export const calculateCapitalRecommendations = (allocation: AllocatedAsset[], totalCapital: number = 100000): AllocatedAssetWithCapital[] => {
  return allocation.map((a: AllocatedAsset): AllocatedAssetWithCapital => ({
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
