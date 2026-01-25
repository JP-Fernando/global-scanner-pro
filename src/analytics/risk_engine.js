// =====================================================
// PROFESSIONAL RISK ENGINE (MATRIX ENGINE) - V3 FINAL
// =====================================================

import i18n from '../i18n/i18n.js';

/**
 * NATIVE MATRIX ALGEBRA
 * Optimised implementation without external dependencies
 */
const MatrixMath = {
  transpose: (matrix) => {
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
  },

  multiply: (m1, m2) => {
    const r1 = m1.length;
    const c1 = m1[0].length;
    const r2 = m2.length;
    const c2 = m2[0].length;
    if (c1 !== r2) throw new Error(`Incompatible dimension: ${c1} vs ${r2}`);

    const result = new Array(r1);
    for (let i = 0; i < r1; i++) {
      result[i] = new Array(c2).fill(0);
      for (let j = 0; j < c2; j++) {
        let sum = 0;
        for (let k = 0; k < c1; k++) {
          sum += m1[i][k] * m2[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  },

  dot: (v1, v2) => {
    if (v1.length !== v2.length) throw new Error("Vectors of different length");
    return v1.reduce((sum, val, i) => sum + val * v2[i], 0);
  },

  center: (matrix) => {
    const cols = matrix[0].length;
    const rows = matrix.length;
    const means = new Array(cols).fill(0);

    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let i = 0; i < rows; i++) sum += matrix[i][j];
      means[j] = sum / rows;
    }

    return matrix.map(row => row.map((val, j) => val - means[j]));
  }
};

// =====================================================
// DATA PREPARATION AND ALIGNMENT
// =====================================================

/**
 * Calculates logarithmic returns with robust handling of missing data
 */
const calculateLogReturns = (prices) => {
  const returns = [];
  let invalidCount = 0;

  for (let i = 1; i < prices.length; i++) {
    const curr = prices[i];
    const prev = prices[i - 1];

    if (curr > 0 && prev > 0 && !isNaN(curr) && !isNaN(prev)) {
      returns.push(Math.log(curr / prev));
    } else {
      invalidCount++;
      // Do not insert anything to maintain alignment
    }
  }

  // Alert if there are many missing data points
  const missingPct = (invalidCount / (prices.length - 1)) * 100;
  if (missingPct > 5) {
    console.warn(`⚠️ ${i18n.t('risk_engine.warning_invalid_data_pct', { pct: missingPct.toFixed(1) })}`);
  }

  return returns;
};

/**
 * Length-based alignment (fallback if no timestamps)
 */
const alignSeriesByLength = (assets) => {
  const minLength = Math.min(...assets.map(a => a.prices.length));

  if (minLength < 30) {
    throw new Error(`Insufficient history: ${minLength} days (minimum 30)`);
  }

  const alignedAssets = assets.map(asset => ({
    ticker: asset.ticker,
    weight: parseFloat(asset.weight || 0),
    prices: asset.prices.slice(-minLength)
  }));

  const assetReturns = alignedAssets.map(a => calculateLogReturns(a.prices));
  const nRows = assetReturns[0].length;
  const returnsMatrix = [];

  for (let i = 0; i < nRows; i++) {
    returnsMatrix.push(assetReturns.map(retArray => retArray[i]));
  }

  return {
    returnsMatrix,
    tickers: alignedAssets.map(a => a.ticker),
    weights: alignedAssets.map(a => a.weight),
    nObservations: nRows
  };
};

/**
 * Date-based alignment (Inner Join) - IMPROVED VERSION
 * Requires scanner.js to pass prices as: [{ date: 'YYYY-MM-DD', close: number }]
 */
const alignSeriesByDate = (assets) => {
  if (!assets || assets.length === 0) return null;

  // Check if we have timestamps
  const hasTimestamps = assets[0].prices[0]?.date !== undefined;

  if (!hasTimestamps) {
    console.warn(`⚠️ ${i18n.t('risk_engine.warning_no_timestamps')}`);
    return alignSeriesByLength(assets);
  }

  // 1. Extract date sets from each asset
  const dateSets = assets.map(a =>
    new Set(a.prices.map(p => p.date))
  );

  // 2. Intersection: dates common to ALL assets
  const commonDates = [...dateSets[0]].filter(date =>
    dateSets.every(set => set.has(date))
  ).sort();

  if (commonDates.length < 30) {
    throw new Error(i18n.t('risk_engine.warning_insufficient_common_dates', { count: commonDates.length }));
  }

  console.log(`✅ ${i18n.t('risk_engine.warning_alignment_verified', { count: commonDates.length })}`);

  // 3. Align all to common dates
  const alignedAssets = assets.map(asset => {
    const priceMap = new Map(asset.prices.map(p => [p.date, p.close]));
    return {
      ticker: asset.ticker,
      weight: parseFloat(asset.weight || 0),
      prices: commonDates.map(date => priceMap.get(date))
    };
  });

  // 4. Calculate aligned logarithmic returns
  const assetReturns = alignedAssets.map(a => calculateLogReturns(a.prices));

  // Verify all have the same length
  const returnLengths = assetReturns.map(r => r.length);
  if (new Set(returnLengths).size > 1) {
    throw new Error("Alignment error: returns of different length");
  }

  // 5. Construct returns matrix (T x N)
  const nRows = assetReturns[0].length;
  const returnsMatrix = [];

  for (let i = 0; i < nRows; i++) {
    returnsMatrix.push(assetReturns.map(retArray => retArray[i]));
  }

  return {
    returnsMatrix,
    tickers: alignedAssets.map(a => a.ticker),
    weights: alignedAssets.map(a => a.weight),
    nObservations: nRows,
    dates: commonDates.slice(1) // Returns start at t=1
  };
};

// =====================================================
// MATRIX CALCULATION (COVARIANCE AND CORRELATION)
// =====================================================

/**
 * Covariance matrix validation (positive semi-definite)
 */
const validateCovarianceMatrix = (covMatrix) => {
  const N = covMatrix.length;

  // 1. Verify symmetry
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const diff = Math.abs(covMatrix[i][j] - covMatrix[j][i]);
      if (diff > 1e-10) {
        console.warn(`⚠️ ${i18n.t('risk_engine.warning_non_symmetric_matrix', { i, j, diff: diff.toExponential(2) })}`);
      }
    }
  }

  // 2. Verify positive diagonal (variances)
  const diag = covMatrix.map((row, i) => row[i]);
  if (diag.some(d => d < 0)) {
    console.error(`❌ ${i18n.t('risk_engine.warning_negative_variances')}`);
    return false;
  }

  return true;
};

/**
 * Ledoit-Wolf Shrinkage for small samples
 */
const ledoitWolfShrinkage = (covMatrix, T) => {
  const N = covMatrix.length;

  // Target: Constant Correlation Model
  const trace = covMatrix.reduce((sum, row, i) => sum + row[i], 0);
  const avgVar = trace / N;

  let sumOffDiag = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i !== j) sumOffDiag += covMatrix[i][j];
    }
  }
  const avgCov = sumOffDiag / (N * (N - 1));
  const avgCorr = avgCov / avgVar;

  // Target matrix F
  const F = covMatrix.map((row, i) =>
    row.map((_, j) => i === j ? avgVar : avgVar * avgCorr)
  );

  // Shrinkage intensity (simplified)
  const delta = Math.min(1, Math.max(0, (N + 1) / (T * N)));

  console.log(`📊 ${i18n.t('risk_engine.warning_shrinkage_applied', { delta: delta.toFixed(3), T, N })}`);

  // Shrinkage: S = δ*F + (1-δ)*Σ
  return covMatrix.map((row, i) =>
    row.map((val, j) => delta * F[i][j] + (1 - delta) * val)
  );
};

/**
 * Detect assets with perfect correlation (singularities)
 */
const detectSingularities = (corrMatrix, tickers) => {
  const N = corrMatrix.length;
  const duplicates = [];

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (Math.abs(corrMatrix[i][j]) > 0.999) {
        duplicates.push({
          pair: [tickers[i], tickers[j]],
          corr: corrMatrix[i][j].toFixed(4)
        });
      }
    }
  }

  if (duplicates.length > 0) {
    console.warn(`⚠️ ${i18n.t('risk_engine.warning_nearly_identical')}:`, duplicates);
  }

  return duplicates;
};

/**
 * Calculation of covariance, correlation and distance matrices
 */
const calculateMatrices = (returnsMatrix) => {
  const T = returnsMatrix.length;
  const N = returnsMatrix[0].length;

  if (T < 2) throw new Error("Insufficient history (T < 2)");

  // 1. Centre matrix (X - X̄)
  const centered = MatrixMath.center(returnsMatrix);

  // 2. Transpose
  const centeredT = MatrixMath.transpose(centered);

  // 3. Covariance: Σ = (1/(T-1)) * X^T * X
  const rawCov = MatrixMath.multiply(centeredT, centered);
  let covMatrix = rawCov.map(row => row.map(val => val / (T - 1)));

  // 4. Validate
  if (!validateCovarianceMatrix(covMatrix)) {
    console.error(`❌ ${i18n.t('risk_engine.error_invalid_covariance')}`);
  }

  // 5. Apply shrinkage if small sample
  if (T < 252) {
    covMatrix = ledoitWolfShrinkage(covMatrix, T);
  }

  // 6. Standard deviations (square root of diagonal)
  const stdDevs = covMatrix.map((row, i) => Math.sqrt(Math.max(0, row[i])));

  // 7. Correlation matrix
  const corrMatrix = [];
  const distMatrix = [];

  for (let i = 0; i < N; i++) {
    const corrRow = [];
    const distRow = [];

    for (let j = 0; j < N; j++) {
      const den = stdDevs[i] * stdDevs[j];

      // Correlation
      let rho;
      if (den === 0) {
        rho = (i === j) ? 1 : 0;
      } else {
        rho = covMatrix[i][j] / den;
      }

      // Numerical clipping
      rho = Math.max(-1, Math.min(1, rho));
      corrRow.push(rho);

      // Distance: d = √(2(1 - ρ))
      const dist = Math.sqrt(Math.max(0, 2 * (1 - rho)));
      distRow.push(dist);
    }

    corrMatrix.push(corrRow);
    distMatrix.push(distRow);
  }

  return { covMatrix, corrMatrix, distMatrix, stdDevs };
};

// =====================================================
// AUTOCORRELATION TEST (For temporal scaling)
// =====================================================

const testAutocorrelation = (returns, lag = 1) => {
  const n = returns.length - lag;
  if (n < 10) return 0; // Insufficient for test

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;

  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (returns[i] - mean) * (returns[i + lag] - mean);
  }
  for (let i = 0; i < returns.length; i++) {
    den += Math.pow(returns[i] - mean, 2);
  }

  return den === 0 ? 0 : num / den;
};

// =====================================================
// PUBLIC API - EXPORTS
// =====================================================

/**
 * Individual Historical VaR (maintained for utility)
 */
export const calculateVaR = (prices, confidence = 0.95, capital = 10000) => {
  if (!prices || prices.length < 30) return { pct: 0, value: 0 };

  const returns = calculateLogReturns(prices);
  if (returns.length === 0) return { pct: 0, value: 0 };

  returns.sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * returns.length);
  const varPct = returns[index] || 0;

  return {
    pct: (varPct * 100).toFixed(2),
    value: (varPct * capital).toFixed(2),
    confidence: (confidence * 100).toFixed(0)
  };
};

/**
 * Parametric Portfolio VaR (Matrix-based)
 */
export const calculatePortfolioVaR = (allocatedAssets, totalCapital, confidence = 0.95) => {
  try {
    // 1. Align data
    const data = alignSeriesByDate(allocatedAssets);
    if (!data || data.returnsMatrix.length === 0) {
      throw new Error(i18n.t('risk_engine.error_insufficient_data'));
    }

    const { returnsMatrix, weights, nObservations } = data;
    const N = weights.length;

    if (N < 2) {
      throw new Error(i18n.t('risk_engine.error_min_assets'));
    }

    // 2. Calculate matrices
    const { covMatrix, stdDevs } = calculateMatrices(returnsMatrix);

    // 3. Portfolio variance: σ²_p = w^T * Σ * w
    const SigmaW = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        SigmaW[i] += covMatrix[i][j] * weights[j];
      }
    }

    const portfolioVariance = MatrixMath.dot(weights, SigmaW);
    const dailyVol = Math.sqrt(Math.max(0, portfolioVariance));

    // 4. Autocorrelation test for temporal scaling
    const portfolioReturns = returnsMatrix.map(row => MatrixMath.dot(row, weights));
    const rho = testAutocorrelation(portfolioReturns);

    // Scaling adjustment if significant autocorrelation
    let scalingFactor = Math.sqrt(252);
    if (Math.abs(rho) > 0.1) {
      scalingFactor = Math.sqrt(252 * (1 + 2 * rho));
      console.log(`📊 ${i18n.t('risk_engine.warning_autocorrelation_detected', { rho: rho.toFixed(3) })}`);
    }

    const annualVol = dailyVol * scalingFactor;

    // 5. Parametric VaR
    const zScores = { 0.90: 1.28, 0.95: 1.65, 0.99: 2.33 };
    const z = zScores[confidence] || 1.65;

    const diversifiedVaRValue = z * dailyVol * totalCapital;

    // 6. Undiversified VaR (weighted sum)
    let sumWeightedVol = 0;
    for (let i = 0; i < N; i++) {
      sumWeightedVol += stdDevs[i] * weights[i];
    }

    const undiversifiedVaRValue = z * sumWeightedVol * totalCapital;
    const divBenefit = undiversifiedVaRValue > 0
      ? (1 - (diversifiedVaRValue / undiversifiedVaRValue)) * 100
      : 0;

    return {
      undiversifiedVaR: undiversifiedVaRValue.toFixed(2),
      diversifiedVaR: diversifiedVaRValue.toFixed(2),
      diversificationBenefit: divBenefit.toFixed(2),
      portfolioVolatility: (annualVol * 100).toFixed(2),
      dailyVolatility: (dailyVol * 100).toFixed(4),
      autocorrelation: rho.toFixed(3),
      observations: nObservations,
      method: i18n.t('risk_engine.method_parametric')
    };

  } catch (e) {
    console.error(`❌ ${  i18n.t('risk_engine.error_var_calculation')  }:`, e);
    return {
      undiversifiedVaR: "0.00",
      diversifiedVaR: "0.00",
      diversificationBenefit: "0.00",
      portfolioVolatility: "0.00",
      dailyVolatility: "0.0000",
      error: e.message
    };
  }
};

/**
 * CVaR (Expected Shortfall) - Complement to VaR
 */
export const calculatePortfolioCVaR = (allocatedAssets, totalCapital, confidence = 0.95) => {
  try {
    const data = alignSeriesByDate(allocatedAssets);
    if (!data) throw new Error(i18n.t('risk_engine.error_insufficient_data'));

    const { returnsMatrix, weights } = data;

    // Calculate historical portfolio returns
    const portfolioReturns = returnsMatrix.map(row => MatrixMath.dot(row, weights));

    // Sort from worst to best
    portfolioReturns.sort((a, b) => a - b);

    // CVaR = average of returns in the tail
    const varIndex = Math.floor((1 - confidence) * portfolioReturns.length);
    const tailReturns = portfolioReturns.slice(0, varIndex + 1);

    if (tailReturns.length === 0) return { cvar: "0.00", cvarPct: "0.00" };

    const cvar = tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length;

    return {
      cvar: Math.abs(cvar * totalCapital).toFixed(2),
      cvarPct: (cvar * 100).toFixed(2),
      confidence: (confidence * 100).toFixed(0)
    };

  } catch (e) {
    console.error(`❌ ${  i18n.t('risk_engine.error_cvar_calculation')  }:`, e);
    return { cvar: "0.00", cvarPct: "0.00", error: e.message };
  }
};

/**
 * Correlation Matrix for visualisation
 */
export const calculateCorrelationMatrix = (assets) => {
  try {
    const data = alignSeriesByDate(assets);
    if (!data) return { matrix: [], stats: { average: 0 } };

    const { returnsMatrix, tickers } = data;
    const { corrMatrix, distMatrix } = calculateMatrices(returnsMatrix);

    // Detect singularities
    detectSingularities(corrMatrix, tickers);

    // Format for frontend
    const matrixObj = tickers.map((ticker, i) => ({
      ticker,
      values: corrMatrix[i].map(v => parseFloat(v.toFixed(2)))
    }));

    // Statistics (off-diagonal only)
    const flatCorrs = [];
    for (let i = 0; i < corrMatrix.length; i++) {
      for (let j = 0; j < corrMatrix[i].length; j++) {
        if (i !== j) flatCorrs.push(corrMatrix[i][j]);
      }
    }

    const avgCorr = flatCorrs.length ? flatCorrs.reduce((a, b) => a + b, 0) / flatCorrs.length : 0;

    return {
      matrix: matrixObj,
      rawDistanceMatrix: distMatrix, // For HRP in allocation.js
      stats: {
        average: avgCorr.toFixed(2),
        max: Math.max(...flatCorrs).toFixed(2),
        min: Math.min(...flatCorrs).toFixed(2)
      }
    };

  } catch (e) {
    console.warn(`⚠️ ${  i18n.t('risk_engine.error_correlation_matrix')  }:`, e);
    return { matrix: [], stats: { average: 0 } };
  }
};

/**
 * Portfolio Risk Metrics (VaR, CVaR, Correlations)
 */
export const calculatePortfolioMetrics = (allocatedAssets, totalCapital = 10000, confidence = 0.95) => {
  return {
    varMetrics: calculatePortfolioVaR(allocatedAssets, totalCapital, confidence),
    cvarMetrics: calculatePortfolioCVaR(allocatedAssets, totalCapital, confidence),
    correlationData: calculateCorrelationMatrix(allocatedAssets)
  };
};

/**
 * Stress Testing
 */
export const runStressTest = (portfolio, totalCapital) => {
  const scenarios = [
    {
      name: i18n.t('stress_scenarios.minor_correction'),
      marketDrop: -0.05,
      description: i18n.t('stress_scenarios.minor_correction_desc')
    },
    { name: i18n.t('stress_scenarios.moderate_correction'), marketDrop: -0.10, description: i18n.t('stress_scenarios.moderate_correction_desc') },
    { name: i18n.t('stress_scenarios.market_crash'), marketDrop: -0.20, description: i18n.t('stress_scenarios.market_crash_desc') },
    { name: i18n.t('stress_scenarios.systemic_crisis'), marketDrop: -0.40, description: i18n.t('stress_scenarios.systemic_crisis_desc') }
  ];

  return scenarios.map(scenario => {
    let estimatedPortfolioLoss = 0;
    const assetImpacts = [];

    portfolio.forEach(asset => {
      // Beta simplificado: vol_activo / vol_mercado
      const vol = parseFloat(asset.volatility || 20);
      const beta = vol / 15;
      const drop = scenario.marketDrop * beta;

      const loss = parseFloat(asset.recommended_capital || 0) * drop;
      estimatedPortfolioLoss += loss;

      assetImpacts.push({
        ticker: asset.ticker,
        impact: `${(drop * 100).toFixed(1)  }%`,
        loss: loss.toFixed(2)
      });
    });

    return {
      scenario: scenario.name,
      description: scenario.description,
      marketDrop: `${(scenario.marketDrop * 100).toFixed(0)  }%`,
      estimatedLoss: Math.abs(estimatedPortfolioLoss).toFixed(2),
      lossPct: `${((estimatedPortfolioLoss / totalCapital) * 100).toFixed(2)  }%`,
      remainingCapital: (totalCapital + estimatedPortfolioLoss).toFixed(2),
      topImpacts: assetImpacts.sort((a, b) => parseFloat(a.loss) - parseFloat(b.loss)).slice(0, 3)
    };
  });
};

/**
 * COMPLETE RISK REPORT (Main entry point)
 */
export const generateRiskReport = (portfolio, totalCapital) => {
  try {
    // 1. Matrix Analysis (VaR and CVaR)
    const portfolioRisk = calculatePortfolioVaR(portfolio, totalCapital);
    const cvarData = calculatePortfolioCVaR(portfolio, totalCapital);

    // 2. Correlations and Distances
    const correlationData = calculateCorrelationMatrix(portfolio);

    // 3. Stress Tests
    const stressTests = runStressTest(portfolio, totalCapital);

    // 4. Individual asset metrics
    const riskiestAsset = portfolio.reduce((max, asset) => {
      const vol = parseFloat(asset.volatility) || 0;
      return vol > parseFloat(max.volatility || 0) ? asset : max;
    }, portfolio[0] || { ticker: 'N/A', volatility: 0, weight: 0 });

    const topWeight = Math.max(...portfolio.map(a => a.weight || 0));

    return {
      portfolioVaR: {
        ...portfolioRisk,
        cvar: cvarData.cvar,
        cvarPct: cvarData.cvarPct
      },
      correlationData,
      stressTests,
      riskMetrics: {
        riskiestAsset: {
          ticker: riskiestAsset.ticker,
          name: riskiestAsset.name,
          volatility: riskiestAsset.volatility,
          weight: `${((riskiestAsset.weight || 0) * 100).toFixed(2)  }%`
        },
        concentrationRisk: topWeight > 0.20 ? i18n.t('risk_levels.high') : topWeight > 0.10 ? i18n.t('risk_levels.medium') : i18n.t('risk_levels.low'),
        diversificationScore: correlationData.stats.average
          ? (100 - (parseFloat(correlationData.stats.average) * 100)).toFixed(0)
          : '50'
      },
      rawMatrices: {
        distance: correlationData.rawDistanceMatrix
      }
    };

  } catch (e) {
    console.error(`❌ ${i18n.t('risk_engine.error_risk_report')}:`, e);

    // Safe return in case of error
    return {
      portfolioVaR: {
        diversifiedVaR: "0.00",
        undiversifiedVaR: "0.00",
        diversificationBenefit: "0.00",
        portfolioVolatility: "0.00",
        error: e.message
      },
      correlationData: { matrix: [], stats: { average: 0 } },
      stressTests: [],
      riskMetrics: {
        riskiestAsset: { ticker: 'N/A', volatility: '0', weight: '0%' },
        concentrationRisk: i18n.t('risk_levels.na'),
        diversificationScore: '0'
      },
      rawMatrices: { distance: [] }
    };
  }
};

// =====================================================
// EXPORTS
// =====================================================

export default {
  calculateVaR,
  calculatePortfolioVaR,
  calculatePortfolioCVaR,
  calculatePortfolioMetrics,
  calculateCorrelationMatrix,
  runStressTest,
  generateRiskReport
};
