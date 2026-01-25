/**
 * =====================================================
 * PORTFOLIO OPTIMIZATION MODULE
 * =====================================================
 *
 * Advanced portfolio optimization with constraints.
 * Includes:
 * - Mean-Variance Optimization (Markowitz)
 * - Risk Parity allocation
 * - Maximum Sharpe Ratio optimization
 * - Governance constraints (concentration, sector limits)
 */

import _i18n from '../i18n/i18n.js';
import { calculateCorrelationMatrix as _calculateCorrelationMatrix } from './risk_engine.js';

// =====================================================
// OPTIMIZATION FUNCTIONS
// =====================================================

/**
 * Calculate portfolio expected return
 * @param {Array} weights - Asset weights
 * @param {Array} expectedReturns - Expected returns for each asset
 * @returns {number} Portfolio expected return
 */
const calculatePortfolioReturn = (weights, expectedReturns) => {
  return weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
};

/**
 * Calculate portfolio variance
 * @param {Array} weights - Asset weights
 * @param {Array} covarianceMatrix - Covariance matrix
 * @returns {number} Portfolio variance
 */
const calculatePortfolioVariance = (weights, covarianceMatrix) => {
  let variance = 0;

  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      variance += weights[i] * weights[j] * covarianceMatrix[i][j];
    }
  }

  return variance;
};

/**
 * Calculate covariance matrix from returns
 * @param {Array} assetReturns - Array of return series for each asset
 * @returns {Array} Covariance matrix
 */
const calculateCovarianceMatrix = (assetReturns) => {
  const n = assetReturns.length;
  const covMatrix = Array(n).fill(0).map(() => Array(n).fill(0));

  // Calculate means
  const means = assetReturns.map(returns => {
    return returns.reduce((sum, r) => sum + r, 0) / returns.length;
  });

  // Calculate covariances
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let cov = 0;
      const minLength = Math.min(assetReturns[i].length, assetReturns[j].length);

      for (let t = 0; t < minLength; t++) {
        cov += (assetReturns[i][t] - means[i]) * (assetReturns[j][t] - means[j]);
      }

      covMatrix[i][j] = cov / (minLength - 1);
    }
  }

  return covMatrix;
};

/**
 * Calculate returns from price series
 * @param {Array} prices - Price series
 * @returns {Array} Returns
 */
const calculateReturns = (prices) => {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i].close - prices[i-1].close) / prices[i-1].close);
  }
  return returns;
};

/**
 * Optimize portfolio for maximum Sharpe ratio
 * @param {Array} positions - Portfolio positions with price history
 * @param {Object} constraints - Optimization constraints
 * @returns {Object} Optimal weights and metrics
 */
export const optimizeMaxSharpe = (positions, constraints = {}) => {
  const {
    minWeight = 0.01,        // Minimum weight per asset
    maxWeight = 0.30,        // Maximum weight per asset
    maxSectorWeight = 0.35,  // Maximum sector concentration
    riskFreeRate = 0.02,     // Annual risk-free rate
    targetReturn = null      // Target return (optional)
  } = constraints;

  // Calculate returns for each asset
  const assetReturns = positions.map(p => {
    if (!p.prices || p.prices.length < 30) {
      return [];
    }
    return calculateReturns(p.prices);
  });

  // Validate sufficient data
  if (assetReturns.some(r => r.length < 30)) {
    return {
      error: 'Insufficient historical data for optimization (need at least 30 observations)'
    };
  }

  // Calculate expected returns (annualized)
  const expectedReturns = assetReturns.map(returns => {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    return mean * 252; // Annualize
  });

  // Calculate covariance matrix (annualized)
  const covMatrix = calculateCovarianceMatrix(assetReturns).map(row =>
    row.map(cov => cov * 252)
  );

  // Simple grid search optimization (for production, use proper optimization library)
  let bestWeights = null;
  let bestSharpe = -Infinity;

  const numIterations = 10000;

  for (let iter = 0; iter < numIterations; iter++) {
    // Generate random weights
    let weights = positions.map(() => Math.random());
    const sum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map(w => w / sum);

    // Apply constraints
    let valid = true;

    // Min/max weight constraints
    for (let i = 0; i < weights.length; i++) {
      if (weights[i] < minWeight || weights[i] > maxWeight) {
        valid = false;
        break;
      }
    }

    if (!valid) continue;

    // Sector concentration constraint
    const sectorWeights = {};
    positions.forEach((p, i) => {
      const sector = p.sector || 999;
      sectorWeights[sector] = (sectorWeights[sector] || 0) + weights[i];
    });

    if (Object.values(sectorWeights).some(w => w > maxSectorWeight)) {
      continue;
    }

    // Calculate portfolio metrics
    const portfolioReturn = calculatePortfolioReturn(weights, expectedReturns);
    const portfolioVariance = calculatePortfolioVariance(weights, covMatrix);
    const portfolioStdDev = Math.sqrt(portfolioVariance);

    // Target return constraint (if specified)
    if (targetReturn !== null && Math.abs(portfolioReturn - targetReturn) > 0.01) {
      continue;
    }

    // Calculate Sharpe ratio
    const sharpe = (portfolioReturn - riskFreeRate) / portfolioStdDev;

    if (sharpe > bestSharpe) {
      bestSharpe = sharpe;
      bestWeights = [...weights];
    }
  }

  if (!bestWeights) {
    return {
      error: 'Could not find valid portfolio satisfying all constraints'
    };
  }

  // Calculate final metrics
  const optimalReturn = calculatePortfolioReturn(bestWeights, expectedReturns);
  const optimalVariance = calculatePortfolioVariance(bestWeights, covMatrix);
  const optimalStdDev = Math.sqrt(optimalVariance);

  // Calculate sector allocations
  const sectorAllocations = {};
  positions.forEach((p, i) => {
    const sector = p.sector || 999;
    sectorAllocations[sector] = (sectorAllocations[sector] || 0) + bestWeights[i];
  });

  return {
    optimizationType: 'Maximum Sharpe Ratio',
    constraints: {
      minWeight: `${(minWeight * 100).toFixed(1)  }%`,
      maxWeight: `${(maxWeight * 100).toFixed(1)  }%`,
      maxSectorWeight: `${(maxSectorWeight * 100).toFixed(1)  }%`,
      riskFreeRate: `${(riskFreeRate * 100).toFixed(2)  }%`
    },
    optimalWeights: positions.map((p, i) => ({
      ticker: p.ticker,
      name: p.name,
      sector: p.sector,
      weight: bestWeights[i].toFixed(4),
      weightPct: `${(bestWeights[i] * 100).toFixed(2)  }%`
    })).sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight)),
    metrics: {
      expectedReturn: `${(optimalReturn * 100).toFixed(2)  }%`,
      volatility: `${(optimalStdDev * 100).toFixed(2)  }%`,
      sharpeRatio: bestSharpe.toFixed(3),
      riskFreeRate: `${(riskFreeRate * 100).toFixed(2)  }%`
    },
    sectorAllocations: Object.entries(sectorAllocations).map(([sector, weight]) => ({
      sector: parseInt(sector),
      weight: weight.toFixed(4),
      weightPct: `${(weight * 100).toFixed(2)  }%`
    })).sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight))
  };
};

/**
 * Optimize portfolio for minimum variance
 * @param {Array} positions - Portfolio positions with price history
 * @param {Object} constraints - Optimization constraints
 * @returns {Object} Optimal weights and metrics
 */
export const optimizeMinVariance = (positions, constraints = {}) => {
  const {
    minWeight = 0.01,
    maxWeight = 0.30,
    maxSectorWeight = 0.35,
    targetReturn = null
  } = constraints;

  // Calculate returns for each asset
  const assetReturns = positions.map(p => {
    if (!p.prices || p.prices.length < 30) {
      return [];
    }
    return calculateReturns(p.prices);
  });

  if (assetReturns.some(r => r.length < 30)) {
    return {
      error: 'Insufficient historical data for optimization'
    };
  }

  const expectedReturns = assetReturns.map(returns => {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    return mean * 252;
  });

  const covMatrix = calculateCovarianceMatrix(assetReturns).map(row =>
    row.map(cov => cov * 252)
  );

  let bestWeights = null;
  let bestVariance = Infinity;

  for (let iter = 0; iter < 10000; iter++) {
    let weights = positions.map(() => Math.random());
    const sum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map(w => w / sum);

    // Apply constraints
    let valid = true;

    for (let i = 0; i < weights.length; i++) {
      if (weights[i] < minWeight || weights[i] > maxWeight) {
        valid = false;
        break;
      }
    }

    if (!valid) continue;

    const sectorWeights = {};
    positions.forEach((p, i) => {
      const sector = p.sector || 999;
      sectorWeights[sector] = (sectorWeights[sector] || 0) + weights[i];
    });

    if (Object.values(sectorWeights).some(w => w > maxSectorWeight)) {
      continue;
    }

    const portfolioReturn = calculatePortfolioReturn(weights, expectedReturns);

    if (targetReturn !== null && Math.abs(portfolioReturn - targetReturn) > 0.01) {
      continue;
    }

    const portfolioVariance = calculatePortfolioVariance(weights, covMatrix);

    if (portfolioVariance < bestVariance) {
      bestVariance = portfolioVariance;
      bestWeights = [...weights];
    }
  }

  if (!bestWeights) {
    return {
      error: 'Could not find valid portfolio satisfying all constraints'
    };
  }

  const optimalReturn = calculatePortfolioReturn(bestWeights, expectedReturns);
  const optimalStdDev = Math.sqrt(bestVariance);

  const sectorAllocations = {};
  positions.forEach((p, i) => {
    const sector = p.sector || 999;
    sectorAllocations[sector] = (sectorAllocations[sector] || 0) + bestWeights[i];
  });

  return {
    optimizationType: 'Minimum Variance',
    constraints: {
      minWeight: `${(minWeight * 100).toFixed(1)  }%`,
      maxWeight: `${(maxWeight * 100).toFixed(1)  }%`,
      maxSectorWeight: `${(maxSectorWeight * 100).toFixed(1)  }%`
    },
    optimalWeights: positions.map((p, i) => ({
      ticker: p.ticker,
      name: p.name,
      sector: p.sector,
      weight: bestWeights[i].toFixed(4),
      weightPct: `${(bestWeights[i] * 100).toFixed(2)  }%`
    })).sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight)),
    metrics: {
      expectedReturn: `${(optimalReturn * 100).toFixed(2)  }%`,
      volatility: `${(optimalStdDev * 100).toFixed(2)  }%`,
      variance: bestVariance.toFixed(6)
    },
    sectorAllocations: Object.entries(sectorAllocations).map(([sector, weight]) => ({
      sector: parseInt(sector),
      weight: weight.toFixed(4),
      weightPct: `${(weight * 100).toFixed(2)  }%`
    })).sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight))
  };
};

/**
 * Risk Parity optimization
 * Allocates weights so each asset contributes equally to portfolio risk
 * @param {Array} positions - Portfolio positions with price history
 * @param {Object} constraints - Optimization constraints
 * @returns {Object} Optimal weights and metrics
 */
export const optimizeRiskParity = (positions, constraints = {}) => {
  const {
    minWeight = 0.01,
    maxWeight = 0.50,
    maxSectorWeight = 0.40
  } = constraints;

  // Calculate returns for each asset
  const assetReturns = positions.map(p => {
    if (!p.prices || p.prices.length < 30) {
      return [];
    }
    return calculateReturns(p.prices);
  });

  if (assetReturns.some(r => r.length < 30)) {
    return {
      error: 'Insufficient historical data for optimization'
    };
  }

  // Calculate volatilities
  const volatilities = assetReturns.map(returns => {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
                     (returns.length - 1);
    return Math.sqrt(variance * 252); // Annualized
  });

  // Initial weights: inverse volatility
  let weights = volatilities.map(vol => 1 / vol);
  let sum = weights.reduce((a, b) => a + b, 0);
  weights = weights.map(w => w / sum);

  // Apply constraints
  weights = weights.map(w => Math.max(minWeight, Math.min(maxWeight, w)));
  sum = weights.reduce((a, b) => a + b, 0);
  weights = weights.map(w => w / sum);

  // Check sector constraints
  const sectorWeights = {};
  positions.forEach((p, i) => {
    const sector = p.sector || 999;
    sectorWeights[sector] = (sectorWeights[sector] || 0) + weights[i];
  });

  // If any sector exceeds limit, reduce proportionally
  Object.keys(sectorWeights).forEach(sector => {
    if (sectorWeights[sector] > maxSectorWeight) {
      const scaleFactor = maxSectorWeight / sectorWeights[sector];
      positions.forEach((p, i) => {
        if (p.sector === parseInt(sector)) {
          weights[i] *= scaleFactor;
        }
      });
    }
  });

  // Re-normalize
  sum = weights.reduce((a, b) => a + b, 0);
  weights = weights.map(w => w / sum);

  // Calculate expected returns
  const expectedReturns = assetReturns.map(returns => {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    return mean * 252;
  });

  const covMatrix = calculateCovarianceMatrix(assetReturns).map(row =>
    row.map(cov => cov * 252)
  );

  const portfolioReturn = calculatePortfolioReturn(weights, expectedReturns);
  const portfolioVariance = calculatePortfolioVariance(weights, covMatrix);
  const portfolioStdDev = Math.sqrt(portfolioVariance);

  // Recalculate sector allocations
  const finalSectorAllocations = {};
  positions.forEach((p, i) => {
    const sector = p.sector || 999;
    finalSectorAllocations[sector] = (finalSectorAllocations[sector] || 0) + weights[i];
  });

  return {
    optimizationType: 'Risk Parity',
    constraints: {
      minWeight: `${(minWeight * 100).toFixed(1)  }%`,
      maxWeight: `${(maxWeight * 100).toFixed(1)  }%`,
      maxSectorWeight: `${(maxSectorWeight * 100).toFixed(1)  }%`
    },
    optimalWeights: positions.map((p, i) => ({
      ticker: p.ticker,
      name: p.name,
      sector: p.sector,
      volatility: `${(volatilities[i] * 100).toFixed(2)  }%`,
      weight: weights[i].toFixed(4),
      weightPct: `${(weights[i] * 100).toFixed(2)  }%`,
      riskContribution: `${(weights[i] * volatilities[i] / portfolioStdDev * 100).toFixed(2)  }%`
    })).sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight)),
    metrics: {
      expectedReturn: `${(portfolioReturn * 100).toFixed(2)  }%`,
      volatility: `${(portfolioStdDev * 100).toFixed(2)  }%`
    },
    sectorAllocations: Object.entries(finalSectorAllocations).map(([sector, weight]) => ({
      sector: parseInt(sector),
      weight: weight.toFixed(4),
      weightPct: `${(weight * 100).toFixed(2)  }%`
    })).sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight))
  };
};

// =====================================================
// EXPORTS
// =====================================================

export default {
  optimizeMaxSharpe,
  optimizeMinVariance,
  optimizeRiskParity
};
