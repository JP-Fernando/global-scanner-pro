// =====================================================
// MOTOR DE RIESGO PROFESIONAL (MATRIX ENGINE) - V3 FINAL
// =====================================================

/**
 * ÁLGEBRA MATRICIAL NATIVA
 * Implementación optimizada sin dependencias externas
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
    if (c1 !== r2) throw new Error(`Dimensión incompatible: ${c1} vs ${r2}`);

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
    if (v1.length !== v2.length) throw new Error("Vectores de diferente longitud");
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
// PREPARACIÓN Y ALINEACIÓN DE DATOS
// =====================================================

/**
 * Calcula retornos logarítmicos con manejo robusto de datos faltantes
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
      // No insertar nada para mantener alineación
    }
  }

  // Alerta si hay muchos datos faltantes
  const missingPct = (invalidCount / (prices.length - 1)) * 100;
  if (missingPct > 5) {
    console.warn(`⚠️ ${missingPct.toFixed(1)}% de datos inválidos detectados`);
  }

  return returns;
};

/**
 * Alineación por fecha (Inner Join) - VERSIÓN MEJORADA
 * Requiere que scanner.js pase prices como: [{ date: 'YYYY-MM-DD', close: number }]
 */
const alignSeriesByDate = (assets) => {
  if (!assets || assets.length === 0) return null;

  // Verificar si tenemos timestamps
  const hasTimestamps = assets[0].prices[0]?.date !== undefined;

  if (!hasTimestamps) {
    console.warn("⚠️ No hay timestamps disponibles, usando alineación por longitud (menos preciso)");
    return alignSeriesByLength(assets);
  }

  // 1. Extraer sets de fechas de cada activo
  const dateSets = assets.map(a =>
    new Set(a.prices.map(p => p.date))
  );

  // 2. Intersección: fechas comunes a TODOS los activos
  const commonDates = [...dateSets[0]].filter(date =>
    dateSets.every(set => set.has(date))
  ).sort();

  if (commonDates.length < 30) {
    throw new Error(`Insuficientes fechas comunes (${commonDates.length}). Mínimo: 30`);
  }

  console.log(`✅ Alineación por fecha: ${commonDates.length} observaciones comunes`);

  // 3. Alinear todos a fechas comunes
  const alignedAssets = assets.map(asset => {
    const priceMap = new Map(asset.prices.map(p => [p.date, p.close]));
    return {
      ticker: asset.ticker,
      weight: parseFloat(asset.weight || 0),
      prices: commonDates.map(date => priceMap.get(date))
    };
  });

  // 4. Calcular retornos logarítmicos alineados
  const assetReturns = alignedAssets.map(a => calculateLogReturns(a.prices));

  // Verificar que todos tengan la misma longitud
  const returnLengths = assetReturns.map(r => r.length);
  if (new Set(returnLengths).size > 1) {
    throw new Error("Error en alineación: retornos de diferente longitud");
  }

  // 5. Construir matriz de retornos (T x N)
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
    dates: commonDates.slice(1) // Retornos empiezan en t=1
  };
};

/**
 * Alineación por longitud (fallback si no hay timestamps)
 */
const alignSeriesByLength = (assets) => {
  const minLength = Math.min(...assets.map(a => a.prices.length));

  if (minLength < 30) {
    throw new Error(`Historia insuficiente: ${minLength} días (mínimo 30)`);
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

// =====================================================
// CÁLCULO DE MATRICES (COVARIANZA Y CORRELACIÓN)
// =====================================================

/**
 * Validación de matriz de covarianza (semi-definida positiva)
 */
const validateCovarianceMatrix = (covMatrix) => {
  const N = covMatrix.length;

  // 1. Verificar simetría
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const diff = Math.abs(covMatrix[i][j] - covMatrix[j][i]);
      if (diff > 1e-10) {
        console.warn(`⚠️ Matriz no simétrica en (${i},${j}): diff=${diff.toExponential(2)}`);
      }
    }
  }

  // 2. Verificar diagonal positiva (varianzas)
  const diag = covMatrix.map((row, i) => row[i]);
  if (diag.some(d => d < 0)) {
    console.error("❌ Varianzas negativas en diagonal");
    return false;
  }

  return true;
};

/**
 * Ledoit-Wolf Shrinkage para muestras pequeñas
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

  // Matriz target F
  const F = covMatrix.map((row, i) =>
    row.map((_, j) => i === j ? avgVar : avgVar * avgCorr)
  );

  // Intensidad de shrinkage (simplificado)
  const delta = Math.min(1, Math.max(0, (N + 1) / (T * N)));

  console.log(`📊 Shrinkage aplicado: δ=${delta.toFixed(3)} (T=${T}, N=${N})`);

  // Shrinkage: S = δ*F + (1-δ)*Σ
  return covMatrix.map((row, i) =>
    row.map((val, j) => delta * F[i][j] + (1 - delta) * val)
  );
};

/**
 * Detectar activos con correlación perfecta (singularidades)
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
    console.warn("⚠️ Activos casi idénticos detectados:", duplicates);
  }

  return duplicates;
};

/**
 * Cálculo de matrices de covarianza, correlación y distancia
 */
const calculateMatrices = (returnsMatrix) => {
  const T = returnsMatrix.length;
  const N = returnsMatrix[0].length;

  if (T < 2) throw new Error("Historia insuficiente (T < 2)");

  // 1. Centrar matriz (X - X̄)
  const centered = MatrixMath.center(returnsMatrix);

  // 2. Transponer
  const centeredT = MatrixMath.transpose(centered);

  // 3. Covarianza: Σ = (1/(T-1)) * X^T * X
  const rawCov = MatrixMath.multiply(centeredT, centered);
  let covMatrix = rawCov.map(row => row.map(val => val / (T - 1)));

  // 4. Validar
  if (!validateCovarianceMatrix(covMatrix)) {
    console.error("❌ Matriz de covarianza inválida");
  }

  // 5. Aplicar shrinkage si muestra pequeña
  if (T < 252) {
    covMatrix = ledoitWolfShrinkage(covMatrix, T);
  }

  // 6. Desviaciones estándar (raíz de diagonal)
  const stdDevs = covMatrix.map((row, i) => Math.sqrt(Math.max(0, row[i])));

  // 7. Matriz de correlación
  const corrMatrix = [];
  const distMatrix = [];

  for (let i = 0; i < N; i++) {
    const corrRow = [];
    const distRow = [];

    for (let j = 0; j < N; j++) {
      const den = stdDevs[i] * stdDevs[j];

      // Correlación
      let rho;
      if (den === 0) {
        rho = (i === j) ? 1 : 0;
      } else {
        rho = covMatrix[i][j] / den;
      }

      // Clipping numérico
      rho = Math.max(-1, Math.min(1, rho));
      corrRow.push(rho);

      // Distancia: d = √(2(1 - ρ))
      const dist = Math.sqrt(Math.max(0, 2 * (1 - rho)));
      distRow.push(dist);
    }

    corrMatrix.push(corrRow);
    distMatrix.push(distRow);
  }

  return { covMatrix, corrMatrix, distMatrix, stdDevs };
};

// =====================================================
// TEST DE AUTOCORRELACIÓN (Para escalado temporal)
// =====================================================

const testAutocorrelation = (returns, lag = 1) => {
  const n = returns.length - lag;
  if (n < 10) return 0; // Insuficiente para test

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
// API PÚBLICA - EXPORTACIONES
// =====================================================

/**
 * VaR Histórico Individual (mantenido por utilidad)
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
 * VaR Paramétrico de Cartera (Matricial)
 */
export const calculatePortfolioVaR = (allocatedAssets, totalCapital, confidence = 0.95) => {
  try {
    // 1. Alinear datos
    const data = alignSeriesByDate(allocatedAssets);
    if (!data || data.returnsMatrix.length === 0) {
      throw new Error("Datos insuficientes para análisis");
    }

    const { returnsMatrix, weights, nObservations } = data;
    const N = weights.length;

    if (N < 2) {
      throw new Error("Se requieren al menos 2 activos para análisis matricial");
    }

    // 2. Calcular matrices
    const { covMatrix, stdDevs } = calculateMatrices(returnsMatrix);

    // 3. Varianza de cartera: σ²_p = w^T * Σ * w
    const SigmaW = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        SigmaW[i] += covMatrix[i][j] * weights[j];
      }
    }

    const portfolioVariance = MatrixMath.dot(weights, SigmaW);
    const dailyVol = Math.sqrt(Math.max(0, portfolioVariance));

    // 4. Test de autocorrelación para escalado temporal
    const portfolioReturns = returnsMatrix.map(row => MatrixMath.dot(row, weights));
    const rho = testAutocorrelation(portfolioReturns);

    // Ajuste de escalado si hay autocorrelación significativa
    let scalingFactor = Math.sqrt(252);
    if (Math.abs(rho) > 0.1) {
      scalingFactor = Math.sqrt(252 * (1 + 2 * rho));
      console.log(`📊 Autocorrelación detectada: ρ=${rho.toFixed(3)}, ajustando escalado`);
    }

    const annualVol = dailyVol * scalingFactor;

    // 5. VaR Paramétrico
    const zScores = { 0.90: 1.28, 0.95: 1.65, 0.99: 2.33 };
    const z = zScores[confidence] || 1.65;

    const diversifiedVaRValue = z * dailyVol * totalCapital;

    // 6. VaR sin diversificar (suma ponderada)
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
      method: "Parametric (Covariance Matrix)"
    };

  } catch (e) {
    console.error("❌ Error en cálculo de VaR:", e);
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
 * CVaR (Expected Shortfall) - Complemento a VaR
 */
export const calculatePortfolioCVaR = (allocatedAssets, totalCapital, confidence = 0.95) => {
  try {
    const data = alignSeriesByDate(allocatedAssets);
    if (!data) throw new Error("Datos insuficientes");

    const { returnsMatrix, weights } = data;

    // Calcular retornos históricos de cartera
    const portfolioReturns = returnsMatrix.map(row => MatrixMath.dot(row, weights));

    // Ordenar de peor a mejor
    portfolioReturns.sort((a, b) => a - b);

    // CVaR = promedio de retornos en la cola
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
    console.error("❌ Error calculando CVaR:", e);
    return { cvar: "0.00", cvarPct: "0.00", error: e.message };
  }
};

/**
 * Matriz de Correlación para visualización
 */
export const calculateCorrelationMatrix = (assets) => {
  try {
    const data = alignSeriesByDate(assets);
    if (!data) return { matrix: [], stats: { average: 0 } };

    const { returnsMatrix, tickers } = data;
    const { corrMatrix, distMatrix } = calculateMatrices(returnsMatrix);

    // Detectar singularidades
    detectSingularities(corrMatrix, tickers);

    // Formatear para frontend
    const matrixObj = tickers.map((ticker, i) => ({
      ticker,
      values: corrMatrix[i].map(v => parseFloat(v.toFixed(2)))
    }));

    // Estadísticas (solo off-diagonal)
    const flatCorrs = [];
    for (let i = 0; i < corrMatrix.length; i++) {
      for (let j = 0; j < corrMatrix[i].length; j++) {
        if (i !== j) flatCorrs.push(corrMatrix[i][j]);
      }
    }

    const avgCorr = flatCorrs.length ? flatCorrs.reduce((a, b) => a + b, 0) / flatCorrs.length : 0;

    return {
      matrix: matrixObj,
      rawDistanceMatrix: distMatrix, // Para HRP en allocation.js
      stats: {
        average: avgCorr.toFixed(2),
        max: Math.max(...flatCorrs).toFixed(2),
        min: Math.min(...flatCorrs).toFixed(2)
      }
    };

  } catch (e) {
    console.warn("⚠️ Error generando matriz de correlaciones:", e);
    return { matrix: [], stats: { average: 0 } };
  }
};

/**
 * Stress Testing
 */
export const runStressTest = (portfolio, totalCapital) => {
  const scenarios = [
    { name: "Corrección Menor", marketDrop: -0.05, description: "Caída típica mensual" },
    { name: "Corrección Moderada", marketDrop: -0.10, description: "Corrección trimestral" },
    { name: "Crash de Mercado", marketDrop: -0.20, description: "Crisis tipo COVID-19" },
    { name: "Crisis Sistémica", marketDrop: -0.40, description: "Crisis tipo 2008" }
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
        impact: (drop * 100).toFixed(1) + '%',
        loss: loss.toFixed(2)
      });
    });

    return {
      scenario: scenario.name,
      description: scenario.description,
      marketDrop: (scenario.marketDrop * 100).toFixed(0) + '%',
      estimatedLoss: Math.abs(estimatedPortfolioLoss).toFixed(2),
      lossPct: ((estimatedPortfolioLoss / totalCapital) * 100).toFixed(2) + '%',
      remainingCapital: (totalCapital + estimatedPortfolioLoss).toFixed(2),
      topImpacts: assetImpacts.sort((a, b) => parseFloat(a.loss) - parseFloat(b.loss)).slice(0, 3)
    };
  });
};

/**
 * REPORTE COMPLETO DE RIESGO (Punto de entrada principal)
 */
export const generateRiskReport = (portfolio, totalCapital) => {
  try {
    // 1. Análisis Matricial (VaR y CVaR)
    const portfolioRisk = calculatePortfolioVaR(portfolio, totalCapital);
    const cvarData = calculatePortfolioCVaR(portfolio, totalCapital);

    // 2. Correlaciones y Distancias
    const correlationData = calculateCorrelationMatrix(portfolio);

    // 3. Stress Tests
    const stressTests = runStressTest(portfolio, totalCapital);

    // 4. Métricas de activos individuales
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
          volatility: riskiestAsset.volatility,
          weight: ((riskiestAsset.weight || 0) * 100).toFixed(2) + '%'
        },
        concentrationRisk: topWeight > 0.20 ? 'Alta' : topWeight > 0.10 ? 'Media' : 'Baja',
        diversificationScore: correlationData.stats.average
          ? (100 - (parseFloat(correlationData.stats.average) * 100)).toFixed(0)
          : '50'
      },
      rawMatrices: {
        distance: correlationData.rawDistanceMatrix
      }
    };

  } catch (e) {
    console.error("❌ Error generando reporte de riesgo:", e);

    // Retorno seguro en caso de error
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
        concentrationRisk: 'N/A',
        diversificationScore: '0'
      },
      rawMatrices: { distance: [] }
    };
  }
};

// =====================================================
// EXPORTACIONES
// =====================================================

export default {
  calculateVaR,
  calculatePortfolioVaR,
  calculatePortfolioCVaR,
  calculateCorrelationMatrix,
  runStressTest,
  generateRiskReport
};
