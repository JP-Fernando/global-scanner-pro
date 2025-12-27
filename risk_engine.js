// =====================================================
// MOTOR DE RIESGO INDEPENDIENTE (risk_engine.js)
// =====================================================

// Utilidad: Calcular retornos logarítmicos diarios
const calculateLogReturns = (prices) => {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  return returns;
};

// 1. Value at Risk (VaR) Histórico
export const calculateVaR = (prices, confidence = 0.95, capital = 10000) => {
  if (!prices || prices.length < 2) return { pct: 0, value: 0 };

  const returns = calculateLogReturns(prices);
  returns.sort((a, b) => a - b);

  // Índice del percentil (ej. 5% peor para 95% confianza)
  const index = Math.floor((1 - confidence) * returns.length);
  const varPct = returns[index]; // Retorno porcentual (ej. -0.02)

  return {
    pct: (varPct * 100).toFixed(2),
    value: (varPct * capital).toFixed(2)
  };
};

// 2. Coeficiente de Correlación de Pearson
const calculateCorrelation = (returnsA, returnsB) => {
  const n = Math.min(returnsA.length, returnsB.length);
  if (n < 2) return 0;

  // Alinear arrays al tamaño menor (simplificación)
  const x = returnsA.slice(-n);
  const y = returnsB.slice(-n);

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

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

// Generador de Matriz
export const calculateCorrelationMatrix = (assets) => {
  const matrix = [];
  // Pre-calcular retornos para eficiencia
  const assetReturns = assets.map(a => ({
    ticker: a.ticker,
    returns: calculateLogReturns(a.prices || []) // Necesitamos el array completo de precios
  }));

  for (let i = 0; i < assetReturns.length; i++) {
    const row = [];
    for (let j = 0; j < assetReturns.length; j++) {
      if (i === j) {
        row.push(1.0); // Correlación con uno mismo es siempre 1
      } else {
        const corr = calculateCorrelation(assetReturns[i].returns, assetReturns[j].returns);
        row.push(parseFloat(corr.toFixed(2)));
      }
    }
    matrix.push({ ticker: assetReturns[i].ticker, values: row });
  }
  return matrix;
};

// 3. Stress Testing (Simulación de Escenarios)
// Dado que no tenemos datos de 2008 para todos, usamos "Sensibilidad Beta"
export const runStressTest = (portfolio, totalCapital) => {
  // Escenarios hipotéticos
  const scenarios = [
    { name: "Corrección Menor", marketDrop: -0.05 }, // -5%
    { name: "Crash de Mercado", marketDrop: -0.20 }, // -20%
    { name: "Crisis Sistémica", marketDrop: -0.40 }  // -40%
  ];

  return scenarios.map(scenario => {
    let estimatedPortfolioLoss = 0;

    portfolio.forEach(asset => {
      // Estimamos Beta aproximado usando la volatilidad del activo vs volatilidad "media" del mercado (aprox 15%)
      // Beta ≈ VolActivo / 15. Es una simplificación heurística pero funcional.
      const assetVol = parseFloat(asset.volatility);
      const proxyBeta = assetVol / 15;

      const assetDrop = scenario.marketDrop * proxyBeta;
      const positionValue = parseFloat(asset.recommended_capital);

      estimatedPortfolioLoss += positionValue * assetDrop;
    });

    return {
      scenario: scenario.name,
      marketDrop: (scenario.marketDrop * 100).toFixed(0) + '%',
      estimatedLoss: estimatedPortfolioLoss.toFixed(2) + '€',
      lossPct: ((estimatedPortfolioLoss / totalCapital) * 100).toFixed(2) + '%'
    };
  });
};
