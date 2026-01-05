# 🎲 Simulación Monte Carlo y Optimización de Portfolio

## Introducción

Este módulo proporciona capacidades avanzadas de **simulación estocástica** y **optimización de portfolio** con restricciones de gobernanza, permitiendo evaluar la robustez de estrategias ante incertidumbre y optimizar asignaciones de capital.

## Características Principales

### 1. Simulación Monte Carlo

Genera miles de escenarios posibles para proyectar distribuciones de retorno futuro.

**Capacidades:**
- Simulación de trayectorias de portfolio basadas en estadísticas históricas
- Cálculo de VaR y CVaR mediante simulación
- Distribución de retornos esperados con percentiles
- Probabilidad de pérdida y escenarios extremos

**Ejemplo de Uso:**

```javascript
import { runMonteCarloSimulation } from './src/analytics/monte-carlo.js';

const portfolio = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 800,
    weight: 0.30,
    prices: [...] // Historical price data
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft',
    sector: 800,
    weight: 0.25,
    prices: [...]
  },
  // ... más posiciones
];

const result = runMonteCarloSimulation(portfolio, 100000, {
  numSimulations: 10000,      // Número de simulaciones
  timeHorizonDays: 252,        // Horizonte temporal (1 año)
  confidenceLevel: 0.95        // Nivel de confianza para VaR/CVaR
});

console.log(result);
// {
//   parameters: {
//     numSimulations: 10000,
//     timeHorizonDays: 252,
//     confidenceLevel: 0.95,
//     initialCapital: '100000.00'
//   },
//   statistics: {
//     dailyMean: '0.0452%',
//     dailyStdDev: '1.2341%',
//     annualizedReturn: '11.41%',
//     annualizedVolatility: '19.60%',
//     observations: 251
//   },
//   results: {
//     expectedValue: '112450.00',
//     expectedReturn: '12.45%',
//     median: '111234.50',
//     percentile5: '85432.10',      // 5% peor escenario
//     percentile95: '145678.90',     // 5% mejor escenario
//     probabilityOfLoss: '28.45%',
//     var95: '7650.00',              // VaR al 95%
//     var95Pct: '7.65%',
//     cvar95: '11234.00',            // CVaR (Expected Shortfall)
//     cvar95Pct: '11.23%'
//   },
//   distribution: {
//     min: '45678.00',
//     max: '189234.00',
//     range: '143556.00'
//   },
//   paths: [...],  // Primeras 100 trayectorias para visualización
//   finalValues: [...] // Todos los valores finales
// }
```

### 2. Escenarios Históricos

Replica crisis históricas para evaluar comportamiento del portfolio.

**Escenarios Incluidos:**

| Escenario | Periodo | Caída del Mercado | Sectores Más Afectados |
|-----------|---------|-------------------|------------------------|
| Dot-com Bubble | 2000-2002 | -49% | Tech (-78%), Telecom (-72%) |
| Financial Crisis | 2007-2009 | -57% | Financials (-83%), Industrials (-67%) |
| COVID-19 Crash | Feb-Mar 2020 | -34% | Energy (-51%), Discretionary (-44%) |
| European Debt Crisis | 2011-2012 | -19% | Financials (-32%), Industrials (-24%) |
| Flash Crash | May 2010 | -9% | Financials (-15%), Tech (-12%) |

**Ejemplo de Uso:**

```javascript
import { runHistoricalScenarios, HISTORICAL_SCENARIOS } from './src/analytics/monte-carlo.js';

const result = runHistoricalScenarios(portfolio, 100000, HISTORICAL_SCENARIOS);

console.log(result.summary);
// {
//   scenariosAnalyzed: 5,
//   worstCase: {
//     scenario: 'Global Financial Crisis (2007-2009)',
//     totalImpact: '-57000.00',
//     impactPct: '-57.00%',
//     newPortfolioValue: '43000.00'
//   },
//   avgImpact: '-33800.00'
// }

// Ver impacto por escenario
result.scenarios.forEach(scenario => {
  console.log(`${scenario.scenario}: ${scenario.impactPct}`);
});
```

### 3. Optimización de Portfolio

#### a) Máximo Sharpe Ratio

Maximiza el ratio riesgo-retorno ajustado.

```javascript
import { optimizeMaxSharpe } from './src/analytics/portfolio-optimizer.js';

const result = optimizeMaxSharpe(portfolio, {
  minWeight: 0.05,        // Peso mínimo por activo (5%)
  maxWeight: 0.30,        // Peso máximo por activo (30%)
  maxSectorWeight: 0.35,  // Concentración máxima sectorial (35%)
  riskFreeRate: 0.02,     // Tasa libre de riesgo (2%)
  targetReturn: null      // Retorno objetivo (opcional)
});

console.log(result);
// {
//   optimizationType: 'Maximum Sharpe Ratio',
//   constraints: {
//     minWeight: '5.0%',
//     maxWeight: '30.0%',
//     maxSectorWeight: '35.0%',
//     riskFreeRate: '2.00%'
//   },
//   optimalWeights: [
//     {
//       ticker: 'AAPL',
//       name: 'Apple Inc.',
//       sector: 800,
//       weight: '0.2850',
//       weightPct: '28.50%'
//     },
//     {
//       ticker: 'JNJ',
//       name: 'Johnson & Johnson',
//       sector: 600,
//       weight: '0.2340',
//       weightPct: '23.40%'
//     },
//     // ... ordenado por peso descendente
//   ],
//   metrics: {
//     expectedReturn: '14.25%',
//     volatility: '16.80%',
//     sharpeRatio: '0.729',
//     riskFreeRate: '2.00%'
//   },
//   sectorAllocations: [
//     { sector: 800, weight: '0.3450', weightPct: '34.50%' },  // Technology
//     { sector: 600, weight: '0.2840', weightPct: '28.40%' },  // Healthcare
//     // ...
//   ]
// }
```

#### b) Mínima Varianza

Minimiza el riesgo total del portfolio.

```javascript
import { optimizeMinVariance } from './src/analytics/portfolio-optimizer.js';

const result = optimizeMinVariance(portfolio, {
  minWeight: 0.05,
  maxWeight: 0.30,
  maxSectorWeight: 0.35,
  targetReturn: 0.10  // Opcional: retorno mínimo requerido
});

console.log(result.metrics);
// {
//   expectedReturn: '10.20%',
//   volatility: '12.45%',    // Volatilidad minimizada
//   variance: '0.015506'
// }
```

#### c) Risk Parity

Distribuye el riesgo equitativamente entre activos.

```javascript
import { optimizeRiskParity } from './src/analytics/portfolio-optimizer.js';

const result = optimizeRiskParity(portfolio, {
  minWeight: 0.05,
  maxWeight: 0.50,        // Más flexible para risk parity
  maxSectorWeight: 0.40
});

console.log(result.optimalWeights);
// [
//   {
//     ticker: 'JNJ',
//     volatility: '15.20%',
//     weight: '0.2840',
//     weightPct: '28.40%',
//     riskContribution: '25.10%'  // Contribución al riesgo total
//   },
//   {
//     ticker: 'AAPL',
//     volatility: '25.30%',
//     weight: '0.1720',
//     weightPct: '17.20%',
//     riskContribution: '24.80%'  // Similar contribución
//   },
//   // ...
// ]
```

## Interpretación de Resultados

### Monte Carlo

| Métrica | Descripción | Interpretación |
|---------|-------------|----------------|
| **Expected Value** | Valor esperado al final del horizonte | Proyección central |
| **Percentile 5** | 5% peor escenario | Pérdida potencial en crisis |
| **Percentile 95** | 5% mejor escenario | Ganancia potencial optimista |
| **Probability of Loss** | Probabilidad de terminar con pérdidas | >30% = Alto riesgo |
| **VaR 95%** | Valor en Riesgo al 95% de confianza | Pérdida máxima esperada |
| **CVaR 95%** | Pérdida esperada dado que se supera VaR | Pérdida en cola extrema |

### Optimización

**Max Sharpe Ratio:**
- Ideal para maximizar rentabilidad ajustada por riesgo
- Favorece activos con alto retorno y baja correlación
- Puede concentrarse en pocos activos de alto rendimiento

**Mínima Varianza:**
- Prioriza estabilidad sobre rentabilidad
- Útil para perfiles conservadores
- Diversifica ampliamente para reducir volatilidad

**Risk Parity:**
- Balancea contribuciones de riesgo
- Evita que un activo domine el riesgo total
- Suele sobreponderar activos de baja volatilidad

## Limitaciones y Consideraciones

### Monte Carlo

1. **Supone distribución normal de retornos**: Puede subestimar eventos extremos (fat tails)
2. **Basado en historia pasada**: Cambios de régimen no se capturan automáticamente
3. **No considera eventos externos**: Crisis no precedentes históricamente
4. **Correlaciones estáticas**: En crisis, las correlaciones tienden a 1

**Mitigaciones:**
- Usar junto con stress tests para escenarios extremos
- Revisar periódicamente las estadísticas de entrada
- Considerar escenarios históricos como complemento

### Optimización

1. **Grid Search (no convex solver)**: Aproximación heurística, no garantiza óptimo global
2. **Sensible a inputs**: Pequeños cambios en retornos esperados pueden alterar pesos
3. **Costos de transacción no incluidos**: Rebalanceos frecuentes pueden ser costosos
4. **Restricciones simplificadas**: Límites box constraints (min/max)

**Mejores Prácticas:**
- Ejecutar optimización con diferentes escenarios de retorno (optimista/base/pesimista)
- Imponer restricciones realistas alineadas con gobernanza
- Combinar múltiples métodos (ej: 50% Max Sharpe + 50% Risk Parity)
- Evitar cambios bruscos: limitar turnover respecto a portfolio actual

## Casos de Uso

### 1. Validación de Portfolio Propuesto

```javascript
// Simular portfolio antes de implementarlo
const mcResult = runMonteCarloSimulation(proposedPortfolio, 500000, {
  numSimulations: 10000,
  timeHorizonDays: 252
});

if (parseFloat(mcResult.results.probabilityOfLoss) > 35) {
  console.log('ALERTA: Alta probabilidad de pérdida. Revisar asignación.');
}

if (parseFloat(mcResult.results.cvar95Pct) > 20) {
  console.log('ALERTA: Pérdida en cola extrema superior a 20%. Reducir riesgo.');
}
```

### 2. Comparación de Estrategias

```javascript
const strategies = ['Conservative', 'Balanced', 'Aggressive'];

strategies.forEach(strat => {
  const portfolio = buildPortfolio(strat);
  const mc = runMonteCarloSimulation(portfolio, 100000);
  const hist = runHistoricalScenarios(portfolio, 100000, HISTORICAL_SCENARIOS);

  console.log(`\n${strat}:`);
  console.log(`  Expected Return: ${mc.results.expectedReturn}`);
  console.log(`  Prob of Loss: ${mc.results.probabilityOfLoss}`);
  console.log(`  Worst Historical: ${hist.summary.worstCase.impactPct}`);
});
```

### 3. Rebalanceo Optimizado

```javascript
// Portfolio actual
const currentPortfolio = [...];

// Optimizar considerando estado actual
const optimized = optimizeMaxSharpe(candidateAssets, {
  minWeight: 0.05,
  maxWeight: 0.25,
  maxSectorWeight: 0.30
});

// Calcular turnover
const turnover = calculateTurnover(currentPortfolio, optimized.optimalWeights);

if (turnover > 0.30) {
  console.log(`Turnover alto (${turnover}%). Considerar costos de transacción.`);
}
```

### 4. Due Diligence Pre-Inversión

```javascript
// Evaluar nuevo activo candidato
const augmentedPortfolio = [...currentPortfolio, newAsset];

const beforeOptimization = optimizeMaxSharpe(currentPortfolio);
const afterOptimization = optimizeMaxSharpe(augmentedPortfolio);

console.log('Impacto de añadir activo:');
console.log(`  Sharpe antes: ${beforeOptimization.metrics.sharpeRatio}`);
console.log(`  Sharpe después: ${afterOptimization.metrics.sharpeRatio}`);
console.log(`  Volatilidad antes: ${beforeOptimization.metrics.volatility}`);
console.log(`  Volatilidad después: ${afterOptimization.metrics.volatility}`);
```

## Integración con otros Módulos

### Con Stress Testing

```javascript
import { runMultiFactorStressTest } from './src/analytics/stress-testing.js';
import { runMonteCarloSimulation } from './src/analytics/monte-carlo.js';

// Combinar stress tests con Monte Carlo
const stressResults = runMultiFactorStressTest(portfolio, 100000);
const mcResults = runMonteCarloSimulation(portfolio, 100000);

// Comparar VaR de ambos enfoques
console.log('VaR Comparison:');
console.log(`  Parametric VaR: ${stressResults.var95}`);
console.log(`  Simulation VaR: ${mcResults.results.var95}`);
console.log(`  Worst Stress Test: ${stressResults.summary.worstCaseScenario.loss}`);
```

### Con Attribution Analysis

```javascript
import { attributionAnalyzer } from './src/analytics/attribution-analysis.js';
import { optimizeRiskParity } from './src/analytics/portfolio-optimizer.js';

// Analizar atribución actual
const attribution = attributionAnalyzer.calculateAttribution(
  currentPortfolio,
  portfolioReturns,
  benchmarkReturns
);

// Si hay fuerte concentración en un factor, reoptimizar
if (attribution.factors.top_contributors[0].contribution > 0.60) {
  const rebalanced = optimizeRiskParity(currentPortfolio.positions);
  console.log('Rebalanceo sugerido para diversificar factores:');
  console.log(rebalanced.optimalWeights);
}
```

## Tests Unitarios

El módulo incluye **5 tests completos**:

1. `testMonteCarloSimulation`: Verifica simulación estocástica
2. `testHistoricalScenarios`: Verifica replay de crisis históricas
3. `testOptimizeMaxSharpe`: Verifica optimización Sharpe con restricciones
4. `testOptimizeMinVariance`: Verifica optimización de varianza mínima
5. `testOptimizeRiskParity`: Verifica distribución equitativa de riesgo

**Ejecutar:**

```bash
npm test
```

## Referencias

### Teoría Académica

- **Markowitz (1952)**: "Portfolio Selection" - Mean-Variance Optimization
- **Sharpe (1966)**: "Mutual Fund Performance" - Sharpe Ratio
- **Maillard et al. (2010)**: "The Properties of Equally Weighted Risk Contribution Portfolios" - Risk Parity
- **Glasserman (2003)**: "Monte Carlo Methods in Financial Engineering"

### Documentación Relacionada

- [Tests de Estrés Multi-Factor](stress-testing.md)
- [Análisis de Riesgo](cartera-riesgo.md)
- [Análisis de Atribución](attribution-analysis.md)

---

**Última actualización:** 2026-01-05
**Versión:** 1.0.0
**Autor:** Global Quant Scanner Pro Team
