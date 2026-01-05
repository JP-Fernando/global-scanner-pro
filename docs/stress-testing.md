# 📊 Multi-Factor Stress Testing

## Introducción

El módulo de **Stress Testing Multi-Factor** proporciona un marco completo para evaluar la robustez de los portfolios ante escenarios adversos de mercado. Permite simular crisis sectoriales, shocks de divisa, eventos geopolíticos y crisis de liquidez para identificar vulnerabilidades y mejorar la gestión de riesgo.

## Características Principales

### 1. Tests de Estrés Sectorial

Simulan crisis específicas en sectores individuales con efectos de contagio.

**Escenarios Disponibles:**
- **Technology Sector Crash** (-30%): Corrección mayor en tech stocks (ej: burbuja IA)
- **Financial Sector Crisis** (-40%): Estrés en sistema bancario (ej: credit crunch)
- **Energy Price Shock** (-25%): Colapso/spike en precio del petróleo
- **Healthcare Regulatory Shock** (-20%): Cambios regulatorios en pharma/biotech
- **Consumer Spending Collapse** (-35%): Recesión económica afectando consumo

**Ejemplo de Uso:**

```javascript
import { runSectorStressTest } from './src/analytics/stress-testing.js';

const portfolio = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 800, // Technology
    current_weight: 0.25,
    volatility: 25,
    quantity: 100,
    entry_price: 150
  },
  // ... más posiciones
];

const techCrashScenario = {
  id: 'tech_crash',
  name: 'Technology Sector Crash',
  description: 'Major correction in technology stocks',
  sectorId: 800,
  shockMagnitude: -0.30,
  correlationIncrease: 0.25
};

const result = runSectorStressTest(portfolio, 50000, techCrashScenario);

console.log(result);
// {
//   scenario: 'Technology Sector Crash',
//   targetSector: 'Information Technology',
//   portfolioExposure: '25.0%',
//   shockMagnitude: '-30.0%',
//   totalLoss: '4125.50',
//   lossPct: '8.25%',
//   newPortfolioValue: '45874.50',
//   worstHit: { ticker: 'AAPL', estimatedLoss: '-3750.00', ... }
// }
```

### 2. Tests de Estrés de Divisa

Evalúan el impacto de shocks cambiarios en portfolios internacionales.

**Escenarios Disponibles:**
- **USD Surge**: Apreciación fuerte del dólar (flight to safety)
- **USD Collapse**: Devaluación del dólar (pérdida de estatus de reserva)
- **Emerging Markets Currency Crisis**: Devaluación generalizada en EM

**Impactos por Divisa:**

| Escenario | USD | EUR | GBP | JPY | CNY | Otros EM |
|-----------|-----|-----|-----|-----|-----|----------|
| USD Surge | 0% | -10% | -8% | -5% | -12% | -8% |
| USD Collapse | -15% | +10% | +8% | +12% | +15% | +10% |
| EM Crisis | +5% | +3% | +2% | +4% | -20% | -25% |

**Ejemplo de Uso:**

```javascript
import { runCurrencyStressTest } from './src/analytics/stress-testing.js';

const usdSurgeScenario = {
  id: 'usd_surge',
  name: 'USD Surge',
  description: 'Strong US dollar appreciation',
  trigger: 'Fed rate hike, geopolitical crisis',
  shockMagnitude: {
    USD: 0.00,
    EUR: -0.10,
    GBP: -0.08,
    JPY: -0.05,
    CNY: -0.12,
    OTHER: -0.08
  }
};

const result = runCurrencyStressTest(portfolio, 50000, usdSurgeScenario);
// Incluye currencyExposure breakdown
```

### 3. Tests de Estrés Geopolítico

Simulan eventos geopolíticos que afectan a todos los mercados.

**Escenarios Disponibles:**
- **Global Military Conflict** (-25%): Escalada geopolítica regional
- **Global Trade War** (-15%): Aranceles y restricciones comerciales
- **Large-Scale Cyber Attack** (-12%): Ataque a infraestructura crítica
- **Global Pandemic** (-35%): Crisis sanitaria (evento tipo COVID)

**Características:**
- **Volatilidad Multiplicada**: 1.8x - 3.0x
- **Correlación Objetivo**: 0.75 - 0.90
- **Impactos Sectoriales Diferenciados**: Algunos sectores se benefician

**Ejemplo de Uso:**

```javascript
import { runGeopoliticalStressTest } from './src/analytics/stress-testing.js';

const pandemicScenario = {
  id: 'pandemic',
  name: 'Global Pandemic',
  description: 'Widespread health crisis (COVID-like event)',
  marketShock: -0.35,
  volatilityMultiplier: 3.0,
  correlationTarget: 0.90,
  sectorShocks: {
    400: -0.50,  // Consumer Discretionary (peor)
    100: -0.40,  // Energy
    300: -0.35,  // Industrials
    600: 0.15,   // Healthcare (beneficiado)
    800: 0.10    // Tech (beneficiado por remote work)
  },
  duration: 'months'
};

const result = runGeopoliticalStressTest(portfolio, 50000, pandemicScenario);
// Incluye análisis de volatilidad y top losers
```

### 4. Tests de Estrés de Liquidez

Simulan crisis de liquidez que dificultan la salida de posiciones.

**Escenarios Disponibles:**
- **Market Liquidity Freeze** (-70% volumen): Crisis súbita (flash crash)
- **Credit Market Freeze** (-50% volumen): Interbank lending paralizado
- **Forced Liquidation Crisis** (-60% volumen): Redemptions masivos

**Métricas Calculadas:**
- **Volume Reduction**: Reducción del volumen de trading
- **Bid-Ask Spread Multiplier**: Aumento del spread
- **Days to Liquidate**: Días necesarios para salir de cada posición
- **Price Impact**: Impacto adicional por venta forzada
- **Liquidity Risk**: Clasificación High/Medium/Low

**Ejemplo de Uso:**

```javascript
import { runLiquidityStressTest } from './src/analytics/stress-testing.js';

const marketFreezeScenario = {
  id: 'market_freeze',
  name: 'Market Liquidity Freeze',
  description: 'Sudden liquidity crisis (e.g., flash crash)',
  volumeReduction: 0.70,
  bidAskSpreadMultiplier: 5.0,
  priceImpact: -0.15,
  recoveryDays: 5
};

const result = runLiquidityStressTest(portfolio, 50000, marketFreezeScenario);

// Analiza cada posición:
// {
//   liquidationAnalysis: [
//     {
//       ticker: 'AAPL',
//       daysToLiquidate: 2,
//       liquidityRisk: 'Low',
//       priceImpact: '-15.2%',
//       estimatedLoss: '-1897.50'
//     },
//     // ...
//   ],
//   avgDaysToLiquidate: '3.2',
//   highRiskPositions: [...]
// }
```

### 5. Test de Estrés Multi-Factor Completo

Ejecuta **todos los escenarios** disponibles en una sola llamada.

**Ejemplo de Uso:**

```javascript
import { runMultiFactorStressTest } from './src/analytics/stress-testing.js';

const results = runMultiFactorStressTest(portfolio, 50000);

console.log(results.summary);
// {
//   totalScenariosAnalyzed: 13,
//   categoriesAnalyzed: 4,
//   worstCaseScenario: {
//     name: 'Global Pandemic',
//     category: 'Geopolitical',
//     loss: '17500.00',
//     lossPct: '35.00%'
//   },
//   portfolioValue: '50000.00',
//   worstCaseValue: '32500.00'
// }

// Acceso a resultados por categoría:
results.sectorStressTests      // Array de 5 tests sectoriales
results.currencyStressTests    // Array de 3 tests de divisa
results.geopoliticalStressTests // Array de 4 tests geopolíticos
results.liquidityStressTests   // Array de 3 tests de liquidez

// Recomendaciones automáticas:
results.recommendations
// [
//   {
//     severity: 'High',
//     type: 'Diversification',
//     message: 'Portfolio is vulnerable to 6 severe scenarios. Consider diversifying...',
//     scenarios: [...]
//   },
//   {
//     severity: 'Medium',
//     type: 'Sector Exposure',
//     message: 'High sector concentration risk detected...',
//     avgLoss: '12.5%'
//   }
// ]
```

## Integración con el Sistema

### Uso en Portfolio Manager

```javascript
import { runMultiFactorStressTest } from './src/analytics/stress-testing.js';

// Después de construir un portfolio:
const portfolio = await buildPortfolio(selectedAssets, capital);

// Ejecutar análisis de estrés:
const stressResults = runMultiFactorStressTest(
  portfolio.positions,
  portfolio.initial_capital
);

// Mostrar en dashboard:
displayStressTestResults(stressResults);

// Alertar si hay vulnerabilidades críticas:
if (stressResults.recommendations.some(r => r.severity === 'High')) {
  notifyUser('Portfolio vulnerability detected', stressResults.recommendations);
}
```

### Uso en Backtesting

```javascript
// Aplicar stress tests durante períodos históricos críticos:
const historicalEvents = [
  { date: '2020-03-01', scenario: 'pandemic' },
  { date: '2008-09-15', scenario: 'financial_crisis' },
  { date: '2000-03-10', scenario: 'tech_crash' }
];

historicalEvents.forEach(event => {
  const portfolioAtDate = getPortfolioSnapshot(event.date);
  const stressResult = runSectorStressTest(
    portfolioAtDate,
    capital,
    SECTOR_STRESS_SCENARIOS.find(s => s.id === event.scenario)
  );

  logBacktestEvent(event.date, stressResult);
});
```

## Interpretación de Resultados

### Métricas Clave

| Métrica | Descripción | Interpretación |
|---------|-------------|----------------|
| **Total Loss** | Pérdida estimada en valor absoluto | Mayor = Más vulnerable |
| **Loss %** | Pérdida como % del capital | >15% = Alto riesgo |
| **Portfolio Exposure** | Exposición al sector/factor estresado | >30% = Concentración alta |
| **Worst Hit Position** | Activo más afectado | Diversificar si loss >20% |
| **Days to Liquidate** | Días para salir de posición | >5 días = Riesgo liquidez |
| **Liquidity Risk** | Clasificación H/M/L | High = Reducir tamaño |

### Niveles de Severidad

- **Bajo Riesgo** (<10% pérdida): Portfolio resiliente
- **Riesgo Moderado** (10-20% pérdida): Revisar concentraciones
- **Alto Riesgo** (20-30% pérdida): Rebalancear urgente
- **Riesgo Crítico** (>30% pérdida): Reestructuración completa

### Recomendaciones Típicas

**1. Diversification (Alta Severidad)**
```
Portfolio is vulnerable to 6 severe scenarios.
→ Acción: Reducir concentración en sectores clave
→ Objetivo: Ningún sector >25% del portfolio
```

**2. Sector Exposure (Media Severidad)**
```
High sector concentration risk detected.
→ Acción: Rebalancear pesos sectoriales
→ Objetivo: Máximo 30% por sector (governance)
```

**3. Liquidity Risk (Media Severidad)**
```
Some positions may be difficult to liquidate quickly.
→ Acción: Aumentar cash reserves o reducir illiquid positions
→ Objetivo: Todas las posiciones <5 días to liquidate
```

## Limitaciones y Consideraciones

### Supuestos del Modelo

1. **Correlaciones Estáticas**: Los shocks asumen correlaciones fijas durante la crisis
2. **Liquidez Uniforme**: El modelo no considera market depth real
3. **Sin Intervención**: No modela acciones de bancos centrales o gobiernos
4. **Linealidad**: Asume impactos lineales (realidad puede ser no-lineal)

### Mejores Prácticas

1. **Ejecutar Regularmente**: Al menos mensual para portfolios activos
2. **Actualizar Escenarios**: Ajustar shocks según condiciones macro actuales
3. **Combinar con VaR/CVaR**: Usar stress tests como complemento, no reemplazo
4. **Documentar Supuestos**: Registrar parámetros usados en cada análisis
5. **Back-testing**: Validar modelos con crisis históricas reales

## Casos de Uso

### 1. Due Diligence Pre-Inversión

Antes de asignar capital a un portfolio, ejecutar stress tests para identificar vulnerabilidades:

```javascript
const proposedPortfolio = [...];
const stressResults = runMultiFactorStressTest(proposedPortfolio, 100000);

if (stressResults.summary.worstCaseScenario.lossPct > '25%') {
  console.log('Portfolio too risky - restructure before deployment');
}
```

### 2. Reporting a Comité de Inversión

Generar reportes trimestrales con análisis de estrés:

```javascript
const quarterlyReport = {
  portfolio: currentPortfolio,
  stressTests: runMultiFactorStressTest(currentPortfolio, capital),
  recommendations: generateActionPlan(stressResults)
};

exportToExcel(quarterlyReport, 'Q1_2024_Stress_Test.xlsx');
```

### 3. Alertas Proactivas

Monitorear portfolio continuamente y alertar si aumenta vulnerabilidad:

```javascript
// Daily check:
const dailyStress = runMultiFactorStressTest(portfolio, capital);

if (dailyStress.recommendations.filter(r => r.severity === 'High').length > 0) {
  sendAlert({
    type: 'HIGH_STRESS_VULNERABILITY',
    portfolio: portfolio.id,
    scenarios: dailyStress.recommendations
  });
}
```

### 4. Optimización de Portfolio

Usar resultados de stress tests para mejorar asignación:

```javascript
// Iterative optimization:
let bestPortfolio = initialPortfolio;
let minWorstCaseLoss = Infinity;

for (const candidate of generateCandidatePortfolios()) {
  const stress = runMultiFactorStressTest(candidate, capital);
  const worstLoss = parseFloat(stress.summary.worstCaseScenario.loss);

  if (worstLoss < minWorstCaseLoss) {
    minWorstCaseLoss = worstLoss;
    bestPortfolio = candidate;
  }
}
```

## Tests Unitarios

El módulo incluye **6 tests unitarios completos**:

1. `testSectorStressTest`: Verifica shock sectorial
2. `testCurrencyStressTest`: Verifica impactos FX
3. `testGeopoliticalStressTest`: Verifica eventos geopolíticos
4. `testLiquidityStressTest`: Verifica crisis de liquidez
5. `testMultiFactorStressTest`: Verifica análisis completo
6. `testStressTestEdgeCases`: Verifica casos límite

**Ejecutar tests:**

```bash
npm test
```

**Resultado esperado:**
```
=== Testing Sector Stress Tests ===
✅ PASS: Sector stress scenario name correct
✅ PASS: Total loss calculated
✅ PASS: All positions analyzed
✅ PASS: Worst hit position identified
✅ PASS: AAPL has negative impact from tech crash

... [más tests]

╔═══════════════════════════════════════╗
║  RESULTS: 36 ✅  0 ❌
╚═══════════════════════════════════════╝
```

## Referencias

### Fundamentos Teóricos

- **Stress Testing**: Committee on the Global Financial System (CGFS), 2000
- **Scenario Analysis**: Breeden & Viswanathan (2016) - "Designing scenario-based frameworks for macroprudential policy"
- **Liquidity Risk**: Amihud, Mendelson & Pedersen (2013) - "Market Liquidity"
- **Currency Risk**: Jorion (2001) - "Value at Risk: The New Benchmark for Managing Financial Risk"

### Documentación Relacionada

- [Análisis de Riesgo](cartera-riesgo.md)
- [Portfolio Tracking Dashboard](portfolio_dashboard.md)
- [Backtesting](arquitectura-tecnica.md#backtesting-engine)

## API Reference

### runSectorStressTest(portfolio, totalCapital, scenario)

**Parámetros:**
- `portfolio` (Array): Posiciones del portfolio
- `totalCapital` (Number): Capital total
- `scenario` (Object): Escenario de estrés sectorial

**Retorna:** Object con resultados del stress test

### runCurrencyStressTest(portfolio, totalCapital, scenario)

**Parámetros:**
- `portfolio` (Array): Posiciones del portfolio
- `totalCapital` (Number): Capital total
- `scenario` (Object): Escenario de estrés de divisa

**Retorna:** Object con resultados incluyendo currencyExposure

### runGeopoliticalStressTest(portfolio, totalCapital, scenario)

**Parámetros:**
- `portfolio` (Array): Posiciones del portfolio
- `totalCapital` (Number): Capital total
- `scenario` (Object): Escenario geopolítico

**Retorna:** Object con resultados incluyendo topLosers

### runLiquidityStressTest(portfolio, totalCapital, scenario)

**Parámetros:**
- `portfolio` (Array): Posiciones con datos de volumen
- `totalCapital` (Number): Capital total
- `scenario` (Object): Escenario de liquidez

**Retorna:** Object con liquidationAnalysis

### runMultiFactorStressTest(portfolio, totalCapital)

**Parámetros:**
- `portfolio` (Array): Posiciones del portfolio
- `totalCapital` (Number): Capital total

**Retorna:** Object con summary, resultados por categoría y recommendations

---

**Última actualización:** 2026-01-05
**Versión:** 1.0.0
**Autor:** Global Quant Scanner Pro Team
