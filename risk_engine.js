// =====================================================
// MOTOR DE RIESGO INDEPENDIENTE (MEJORADO)
// =====================================================

// =====================================================
// UTILIDADES
// =====================================================

const calculateLogReturns = (prices) => {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const ret = Math.log(prices[i] / prices[i - 1]);
    if (!isNaN(ret) && isFinite(ret)) {
      returns.push(ret);
    }
  }
  return returns;
};

const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

const std = (arr) => {
  const m = mean(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / arr.length;
  return Math.sqrt(variance);
};

// =====================================================
// 1. VALUE AT RISK (VAR)
// =====================================================

// VaR Histórico mejorado
export const calculateVaR = (prices, confidence = 0.95, capital = 10000) => {
  if (!prices || prices.length < 30) {
    return {
      pct: 0,
      value: 0,
      warning: 'Datos insuficientes para VaR confiable (mín. 30 días)'
    };
  }

  const returns = calculateLogReturns(prices);

  if (returns.length < 20) {
    return {
      pct: 0,
      value: 0,
      warning: 'Retornos insuficientes'
    };
  }

  returns.sort((a, b) => a - b);

  const index = Math.floor((1 - confidence) * returns.length);
  const varPct = returns[index];

  return {
    pct: (varPct * 100).toFixed(2),
    value: (varPct * capital).toFixed(2),
    confidence: (confidence * 100).toFixed(0),
    daysAnalyzed: prices.length
  };
};

// VaR Paramétrico (asume distribución normal)
export const calculateParametricVaR = (prices, confidence = 0.95, capital = 10000) => {
  if (!prices || prices.length < 30) {
    return { pct: 0, value: 0, warning: 'Datos insuficientes' };
  }

  const returns = calculateLogReturns(prices);
  const mu = mean(returns);
  const sigma = std(returns);

  // Z-score para diferentes niveles de confianza
  const zScores = {
    0.90: 1.28,
    0.95: 1.65,
    0.99: 2.33
  };

  const z = zScores[confidence] || 1.65;
  const varPct = mu - z * sigma;

  return {
    pct: (varPct * 100).toFixed(2),
    value: (varPct * capital).toFixed(2),
    confidence: (confidence * 100).toFixed(0),
    method: 'parametric',
    volatility: (sigma * Math.sqrt(252) * 100).toFixed(2) // Anualizada
  };
};

// VaR de Cartera (con correlaciones)
export const calculatePortfolioVaR = (allocatedAssets, totalCapital, confidence = 0.95) => {
  // Método simplificado: suma ponderada de VaR individuales ajustada por diversificación

  let totalVaR = 0;
  const assetVaRs = [];

  allocatedAssets.forEach(asset => {
    if (asset.prices && asset.prices.length > 30) {
      const individualVaR = calculateVaR(
        asset.prices,
        confidence,
        parseFloat(asset.recommended_capital)
      );

      assetVaRs.push({
        ticker: asset.ticker,
        var: parseFloat(individualVaR.value),
        weight: asset.weight
      });

      totalVaR += Math.abs(parseFloat(individualVaR.value));
    }
  });

  // Factor de diversificación (asumiendo correlación promedio 0.3)
  const avgCorrelation = 0.3;
  const nAssets = allocatedAssets.length;
  const diversificationFactor = Math.sqrt(
    (1 / nAssets) + ((nAssets - 1) / nAssets) * avgCorrelation
  );

  const diversifiedVaR = totalVaR * diversificationFactor;

  return {
    undiversifiedVaR: totalVaR.toFixed(2),
    diversifiedVaR: diversifiedVaR.toFixed(2),
    diversificationBenefit: ((1 - diversificationFactor) * 100).toFixed(1),
    assetVaRs: assetVaRs,
    confidence: (confidence * 100).toFixed(0)
  };
};

// =====================================================
// 2. CORRELACIONES
// =====================================================

const calculateCorrelation = (returnsA, returnsB) => {
  const n = Math.min(returnsA.length, returnsB.length);
  if (n < 2) return 0;

  const x = returnsA.slice(-n);
  const y = returnsB.slice(-n);

  const meanX = mean(x);
  const meanY = mean(y);

  let num = 0, denX = 0, denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
};

export const calculateCorrelationMatrix = (assets) => {
  const matrix = [];

  // Pre-calcular retornos
  const assetReturns = assets.map(a => ({
    ticker: a.ticker,
    returns: calculateLogReturns(a.prices || [])
  }));

  // Construir matriz
  for (let i = 0; i < assetReturns.length; i++) {
    const row = [];
    for (let j = 0; j < assetReturns.length; j++) {
      if (i === j) {
        row.push(1.0);
      } else {
        const corr = calculateCorrelation(
          assetReturns[i].returns,
          assetReturns[j].returns
        );
        row.push(parseFloat(corr.toFixed(2)));
      }
    }
    matrix.push({
      ticker: assetReturns[i].ticker,
      values: row
    });
  }

  // Calcular estadísticas de la matriz
  const correlations = [];
  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix.length; j++) {
      correlations.push(matrix[i].values[j]);
    }
  }

  const avgCorr = correlations.length > 0 ? mean(correlations) : 0;
  const maxCorr = correlations.length > 0 ? Math.max(...correlations) : 0;
  const minCorr = correlations.length > 0 ? Math.min(...correlations) : 0;

  return {
    matrix,
    stats: {
      average: avgCorr.toFixed(2),
      max: maxCorr.toFixed(2),
      min: minCorr.toFixed(2),
      highlyCorrelated: correlations.filter(c => c > 0.7).length
    }
  };
};

// =====================================================
// 3. STRESS TESTING MEJORADO
// =====================================================

export const runStressTest = (portfolio, totalCapital) => {
  const scenarios = [
    {
      name: "Corrección Menor",
      marketDrop: -0.05,
      description: "Caída típica mensual"
    },
    {
      name: "Corrección Moderada",
      marketDrop: -0.10,
      description: "Corrección trimestral"
    },
    {
      name: "Crash de Mercado",
      marketDrop: -0.20,
      description: "Crisis tipo COVID-19 (Mar 2020)"
    },
    {
      name: "Crisis Sistémica",
      marketDrop: -0.40,
      description: "Crisis tipo 2008"
    }
  ];

  return scenarios.map(scenario => {
    let estimatedPortfolioLoss = 0;
    const assetImpacts = [];

    portfolio.forEach(asset => {
      const assetVol = parseFloat(asset.volatility) || 15;
      const marketVol = 15; // Volatilidad de referencia del mercado

      // Beta proxy mejorado
      const proxyBeta = assetVol / marketVol;

      // Ajuste por score (activos de mayor calidad resisten mejor)
      const qualityAdjustment = asset.score > 70 ? 0.9 : asset.score > 50 ? 1.0 : 1.1;

      const assetDrop = scenario.marketDrop * proxyBeta * qualityAdjustment;
      const positionValue = parseFloat(asset.recommended_capital);
      const positionLoss = positionValue * assetDrop;

      estimatedPortfolioLoss += positionLoss;

      assetImpacts.push({
        ticker: asset.ticker,
        impact: (assetDrop * 100).toFixed(1) + '%',
        loss: positionLoss.toFixed(2)
      });
    });

    return {
      scenario: scenario.name,
      description: scenario.description,
      marketDrop: (scenario.marketDrop * 100).toFixed(0) + '%',
      estimatedLoss: Math.abs(estimatedPortfolioLoss).toFixed(2),
      lossPct: ((estimatedPortfolioLoss / totalCapital) * 100).toFixed(2) + '%',
      remainingCapital: (totalCapital + estimatedPortfolioLoss).toFixed(2),
      topImpacts: assetImpacts
        .sort((a, b) => parseFloat(a.loss) - parseFloat(b.loss))
        .slice(0, 3)
    };
  });
};

// =====================================================
// 4. CONDITIONAL VAR (CVAR O EXPECTED SHORTFALL)
// =====================================================

export const calculateCVaR = (prices, confidence = 0.95, capital = 10000) => {
  if (!prices || prices.length < 30) {
    return { pct: 0, value: 0, warning: 'Datos insuficientes' };
  }

  const returns = calculateLogReturns(prices);
  returns.sort((a, b) => a - b);

  const varIndex = Math.floor((1 - confidence) * returns.length);

  // CVaR es el promedio de las pérdidas peores que VaR
  const tailReturns = returns.slice(0, varIndex);
  const cvarPct = tailReturns.length > 0 ? mean(tailReturns) : returns[0];

  return {
    pct: (cvarPct * 100).toFixed(2),
    value: (cvarPct * capital).toFixed(2),
    confidence: (confidence * 100).toFixed(0),
    interpretation: 'Pérdida promedio en el peor ' + ((1 - confidence) * 100).toFixed(0) + '% de casos'
  };
};

// =====================================================
// 5. MÉTRICAS ADICIONALES DE RIESGO
// =====================================================

// Sharpe Ratio
export const calculateSharpeRatio = (prices, riskFreeRate = 0.02) => {
  if (!prices || prices.length < 30) return 0;

  const returns = calculateLogReturns(prices);
  const avgReturn = mean(returns) * 252; // Anualizado
  const volatility = std(returns) * Math.sqrt(252); // Anualizada

  if (volatility === 0) return 0;

  return ((avgReturn - riskFreeRate) / volatility).toFixed(2);
};

// Sortino Ratio (solo penaliza volatilidad a la baja)
export const calculateSortinoRatio = (prices, riskFreeRate = 0.02) => {
  if (!prices || prices.length < 30) return 0;

  const returns = calculateLogReturns(prices);
  const avgReturn = mean(returns) * 252;

  // Solo retornos negativos
  const downReturns = returns.filter(r => r < 0);

  if (downReturns.length === 0) return 999; // Sin riesgo bajista

  const downsideStd = std(downReturns) * Math.sqrt(252);

  if (downsideStd === 0) return 0;

  return ((avgReturn - riskFreeRate) / downsideStd).toFixed(2);
};

// Calmar Ratio (retorno/max drawdown)
export const calculateCalmarRatio = (prices) => {
  if (!prices || prices.length < 252) return 0;

  const returns = calculateLogReturns(prices);
  const avgReturn = mean(returns) * 252;

  // Calcular max drawdown
  let maxPrice = prices[0];
  let maxDD = 0;

  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > maxPrice) {
      maxPrice = prices[i];
    } else {
      const dd = (maxPrice - prices[i]) / maxPrice;
      if (dd > maxDD) maxDD = dd;
    }
  }

  if (maxDD === 0) return 999;

  return (avgReturn / maxDD).toFixed(2);
};

// =====================================================
// 6. RESUMEN COMPLETO DE RIESGO
// =====================================================

export const generateRiskReport = (portfolio, totalCapital) => {
  const correlationData = calculateCorrelationMatrix(portfolio);
  const stressTests = runStressTest(portfolio, totalCapital);

  // VaR de cartera
  const portfolioVaR = calculatePortfolioVaR(portfolio, totalCapital, 0.95);

  // Activo con mayor riesgo
  const riskiestAsset = portfolio.reduce((max, asset) => {
    const vol = parseFloat(asset.volatility) || 0;
    return vol > parseFloat(max.volatility || 0) ? asset : max;
  }, portfolio[0]);

  // Concentración de riesgo
  const topWeight = Math.max(...portfolio.map(a => a.weight));
  const concentrationRisk = topWeight > 0.2 ? 'Alta' : topWeight > 0.15 ? 'Media' : 'Baja';

  return {
    portfolioVaR,
    correlationData,
    stressTests,
    riskMetrics: {
      riskiestAsset: {
        ticker: riskiestAsset.ticker,
        volatility: riskiestAsset.volatility,
        weight: (riskiestAsset.weight * 100).toFixed(2) + '%'
      },
      concentrationRisk,
      diversificationScore: (100 - parseFloat(correlationData.stats.average) * 100).toFixed(0)
    }
  };
};

export default {
  calculateVaR,
  calculateParametricVaR,
  calculatePortfolioVaR,
  calculateCVaR,
  calculateCorrelationMatrix,
  runStressTest,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateCalmarRatio,
  generateRiskReport
};
