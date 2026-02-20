# 💻 Sección Técnica

## Estructura del Proyecto

```
global-scanner-pro/
├── src/
│   ├── core/
│   │   ├── config.js       # Estrategias y benchmarks
│   │   └── scanner.js      # Scanner principal
│   ├── indicators/
│   │   ├── indicators.js   # Librería de indicadores con validación
│   │   └── scoring.js      # Motor de scoring avanzado
│   ├── allocation/
│   │   └── allocation.js   # Sistema de asignación de capital
│   ├── analytics/
│   │   ├── risk_engine.js  # Motor de análisis de riesgo profesional
│   │   ├── market_regime.js # Detector de regímenes de mercado
│   │   └── governance.js   # Reglas y gobernanza de inversión
│   ├── data/
│   │   ├── anomalies.js    # Detección de anomalías
│   │   └── sectors.js      # Taxonomía sectorial
│   └── tests/
│       └── tests.js        # Suite de testing
```

## Sistema de Scoring

### Scores Temporales (Multi-Horizonte)

**⚡ Score Corto Plazo (6 meses)**
- Precio vs EMA20 (50pts)
- RSI favorable (25pts)
- Volumen relativo (25pts)

**📈 Score Medio Plazo (18 meses)**
- Estructura EMA50/200 (50pts)
- ROC 6 meses (30pts)
- Volatilidad controlada (20pts)

**🎯 Score Largo Plazo (4 años)**
- Momentum 12 meses (30pts)
- Tendencia estructural (30pts)
- Volatilidad anualizada (20pts)
- Consistencia (20pts)

### Scores Factoriales

**Trend Score (0-100)**
- Posición vs EMAs (40pts)
- Consistencia (30pts)
- Fuerza ADX (30pts)

**Momentum Score (0-100)**
- ROC 6 meses (25pts)
- ROC 12 meses (35pts)
- Thrust 20d (20pts)
- RSI (20pts)

**Risk Score (0-100)**
- ATR% (30pts)
- Volatilidad Anual (35pts)
- Max Drawdown (35pts)

**Liquidity Score (0-100)**
- Volumen 20d (40pts)
- Volumen 60d (30pts)
- Ratio volumen (30pts)

## Mejoras Cuantitativas

1. **Métricas Relativas vs Benchmark**
   - Cálculo de Alpha (ROC activo - ROC benchmark)
   - Volatilidad relativa normalizada
   - Comparación automática contra índices de mercado

2. **Normalización por Percentiles**
   - Scores normalizados dentro del universo analizado
   - Rankings estables entre diferentes mercados
   - Eliminación de sesgos por valores absolutos

3. **Filtros Duros Pre-Scoring**
   - Historia mínima requerida (250-400 días según estrategia)
   - ATR% máximo permitido
   - Volumen mínimo 20d/60d
   - Max drawdown 52 semanas
   - Los activos que no pasan son excluidos automáticamente

## Indicadores Técnicos Implementados

- **EMAs**: 20, 50, 200 con warm-up configurable
- **RSI**: Período ajustable (default 14)
- **ATR**: Como valor absoluto y porcentaje del precio
- **Bollinger Bands**: Bandas + bandwidth + %B
- **ADX**: Fuerza direccional
- **Williams %R**: Oscilador de momentum
- **ROC**: Rate of Change 6m/12m
- **Volatilidad**: Anualizada basada en log-returns
- **Max Drawdown**: Caída máxima desde máximo

## Benchmarks por Mercado

| Sufijo | Mercado | Benchmark |
|--------|---------|-----------|
| .MC | España | ^IBEX (IBEX 35) |
| .PA | Francia | ^FCHI (CAC 40) |
| .DE | Alemania | ^GDAXI (DAX) |
| .L | UK | ^FTSE (FTSE 100) |
| .MI | Italia | FTSEMIB.MI |
| (vacío) | USA | ^GSPC (S&P 500) |
| .SA | Brasil | ^BVSP (Bovespa) |
| .MX | México | ^MXX (IPC) |
| .TO | Canadá | ^GSPTSE (TSX) |
| .T | Japón | ^N225 (Nikkei) |
| .HK | Hong Kong | ^HSI (Hang Seng) |
| .SS | Shanghai | 000001.SS |
| .SZ | Shenzhen | 399001.SZ |
| .KS | Corea | ^KS11 (KOSPI) |

## Validación y Testing

Todos los indicadores incluyen:
- Validación de entrada (arrays, NaN, null)
- Comprobación de longitud mínima
- Manejo de errores explícito
- Tests contra valores conocidos

**Ejecutar tests**: `http://localhost:3000/api/run-tests`

```javascript
// Desde navegador
fetch('/api/run-tests')
  .then(r => r.json())
  .then(console.log);

// Desde Node.js
import { runAllTests } from './tests.js';
runAllTests();
```

## Personalización de Estrategias

Para crear tu propia estrategia, edita `src/core/config.js` añadiendo un nuevo perfil en `STRATEGY_PROFILES`:

```javascript
export const STRATEGY_PROFILES = {
  custom: {
    name: "Mi Estrategia",
    weights: { trend: 0.3, momentum: 0.3, risk: 0.2, liquidity: 0.2 },
    filters: {
      minHistory: 250,
      maxATRPercent: 6.0,
      minVolume20d: 40000,
      minVolume60d: 30000,
      maxDrawdown52w: 40
    }
  }
};
```

## Sistema de Asignación de Capital

El módulo `src/allocation/allocation.js` implementa 5 métodos profesionales de asignación:

### Métodos Disponibles

**1. Equal Weight (equalWeightAllocation)**
- Fórmula: `weight = 1 / n` donde n = número de activos
- Características: Máxima diversificación simple

**2. Score-Weighted (scoreWeightedAllocation)**
- Fórmula: `weight[i] = score[i] / sum(scores)` normalizado
- Límites: Min 2%, Max 100% por activo
- Características: Prioriza activos con mejor Quant Score

**3. Equal Risk Contribution (equalRiskContribution)**
- Fórmula: `weight[i] = (1/vol[i]) / sum(1/vol)`
- Límites: Min 2%, Max 100% por activo
- Características: Cada activo contribuye igual al riesgo total

**4. Volatility Targeting (volatilityTargeting)**
- Fórmula: Ajusta pesos para alcanzar volatilidad objetivo (15% default)
- Características: Control de volatilidad de cartera

**5. Hybrid (hybridAllocation)**
- Fórmula: `weight = 0.5 * ERC_weight + 0.5 * Score_weight`
- Características: Combina diversificación y calidad

### Métricas de Riesgo de Cartera

- **Volatilidad de Cartera**: Calculada con correlación promedio (0.3)
- **Ratio de Diversificación**: `weighted_avg_vol / portfolio_vol`
- **Número Efectivo de Activos**: `1 / sum(weight²)` (Índice Herfindahl)
- **Max Drawdown Estimado**: Promedio ponderado de drawdowns individuales

## Motor de Análisis de Riesgo Profesional

El módulo `risk_engine.js` proporciona análisis cuantitativo avanzado:

### Value at Risk (VaR)

**VaR Histórico**
- Método: Percentil de distribución histórica de retornos
- Nivel de confianza: 95% (configurable)
- Salida: Pérdida máxima esperada en € y %

**VaR Paramétrico**
- Método: Asume distribución normal de retornos
- Fórmula: `VaR = μ - z*σ` donde z = 1.65 (95% confianza)
- Ventaja: Más rápido, requiere menos datos

**VaR de Cartera**
- Considera correlaciones entre activos
- Factor de diversificación: `sqrt((1/n) + ((n-1)/n)*corr_avg)`
- Beneficio de diversificación: Reducción de riesgo vs suma simple

### Matriz de Correlaciones

- **Cálculo**: Correlación de Pearson entre retornos logarítmicos
- **Estadísticas**:
  - Correlación promedio
  - Correlación máxima/mínima
  - Número de pares altamente correlacionados (>0.7)
- **Visualización**: Heatmap en la interfaz
- **Uso**: Identificar activos con riesgo concentrado

### Stress Testing

Escenarios predefinidos:
- **Corrección Menor**: -5% (caída mensual típica)
- **Corrección Moderada**: -10% (corrección trimestral)
- **Crash de Mercado**: -20% (tipo COVID-19 Mar 2020)
- **Crisis Sistémica**: -40% (tipo 2008)

Método:
- Beta proxy: `asset_vol / market_vol`
- Ajuste por calidad: Activos con score >70 resisten mejor
- Resultado: Pérdida estimada por escenario en € y %

### Conditional VaR (CVaR)

También conocido como Expected Shortfall:
- **Definición**: Pérdida promedio en el peor X% de casos
- **Ventaja**: Captura mejor las colas de la distribución
- **Uso**: Complementa VaR para entender pérdidas extremas

### Ratios de Rendimiento Ajustados por Riesgo

**Sharpe Ratio**
- Fórmula: `(Return - RiskFree) / Volatility`
- Interpretación: Retorno por unidad de riesgo total

**Sortino Ratio**
- Fórmula: `(Return - RiskFree) / Downside_Volatility`
- Ventaja: Solo penaliza volatilidad a la baja

**Calmar Ratio**
- Fórmula: `Annual_Return / Max_Drawdown`
- Interpretación: Retorno por unidad de drawdown máximo

## Motor de Backtesting

El módulo `src/analytics/backtesting.js` permite evaluar estrategias con rebalanceo periódico:

- **Selección dinámica de activos** según el score de cada estrategia.
- **Método de asignación configurable** (Equal Weight, ERC, Score-Weighted, etc.).
- **Métricas comparativas**: retorno total, CAGR, volatilidad y max drawdown.
- **Rendimiento ajustado por riesgo**: Sharpe y Calmar.
- **Comparativa vs benchmark**: alpha, beta, tracking error e information ratio.
- **Métricas de trading**: win rate, profit factor, avg win/loss, turnover y costos estimados (comisión + slippage).
- **Análisis de drawdowns**: número de caídas, recuperación promedio y drawdown más largo.
- **Equity curve** con comparación visual frente al índice de referencia.

En la interfaz, la sección *Backtesting de Estrategias* permite seleccionar:
1. Número de activos (Top N)
2. Frecuencia de rebalanceo (en días)
3. Método de asignación
4. Exportación de resultados a CSV para análisis externo

## Detector de Regímenes de Mercado

El módulo `src/analytics/market_regime.js` clasifica automáticamente las condiciones del mercado:

### Análisis de Benchmark

**1. Señal de Tendencia**
- Métrica: Precio vs EMA200
- Alcista: `distance > 2%` sobre EMA200
- Bajista: `distance < -2%` bajo EMA200
- Neutral: Entre -2% y +2%

**2. Señal de Volatilidad**
- Reciente: Volatilidad últimos 60 días (20 días lookback)
- Histórica: Volatilidad últimos 252 días
- Risk-On: Vol < 12% anual
- Risk-Off: Vol > 20% anual o >1.5x histórica
- Normal: Entre 12% y 20%

**3. Señal de Momentum**
- ROC 3 meses: Rate of Change últimos 63 días
- ROC 6 meses: Rate of Change últimos 126 días
- Positivo: ROC3m > 5% Y ROC6m > 10%
- Negativo: ROC3m < -5% O ROC6m < -10%
- Neutral: Casos intermedios

**4. Score Compuesto**
- Suma: `trend + volatility + momentum`
- Clasificación:
  - Score ≥ 2: Risk-On
  - Score ≤ -2: Risk-Off
  - Resto: Neutral

### Análisis de Amplitud (Market Breadth)

- Métrica: Porcentaje de activos con precio > EMA50
- Fuerte: >60% activos alcistas (confirmación Risk-On)
- Débil: <40% activos alcistas (confirmación Risk-Off)
- Normal: 40-60%

### Ajustes de Estrategia por Régimen

El sistema ajusta automáticamente:

**Risk-On**
- Momentum weight: ×1.2 (aumenta 20%)
- Risk penalty: ×0.8 (reduce 20%)
- Min score: -5 puntos (más permisivo)

**Neutral**
- Sin ajustes (pesos estándar)

**Risk-Off**
- Momentum weight: ×0.7 (reduce 30%)
- Risk penalty: ×1.3 (aumenta 30%)
- Min score: +10 puntos (más estricto)

### Confianza del Régimen

- **Alta** (>80%): Señales convergentes entre benchmark y amplitud
- **Media** (60-80%): Señales consistentes pero no todas alineadas
- **Baja** (<60%): Divergencias o datos insuficientes

## Sistema de Gobernanza y Cumplimiento

El módulo `src/analytics/governance.js` implementa reglas profesionales de inversión y validación de cumplimiento:

### Reglas de Inversión (INVESTMENT_RULES)

**Límites de Concentración**
- `max_position_weight`: 0.15 (15% máximo por activo)
- `min_position_weight`: 0.02 (2% mínimo, evita micro-posiciones)
- `max_sector_weight`: 0.30 (30% máximo por sector)
- `max_country_weight`: 0.40 (40% máximo por país)
- `max_top3_concentration`: 0.40 (Top 3 posiciones no pueden sumar >40%)

**Control de Liquidez**
- `min_daily_volume`: 50,000 unidades negociadas diariamente
- Exclusiones automáticas activables

**Control de Correlación**
- `max_pairwise_correlation`: 0.85 (no permite dos activos con correlación >0.85)

**Control de Riesgo Agregado**
- `max_portfolio_volatility`: 25% anual
- `max_portfolio_drawdown`: 35% estimado

**Rebalanceo**
- `rebalance_threshold`: 0.05 (5% de desviación)

### Perfiles de Riesgo (RISK_PROFILES)

Tres perfiles predefinidos que ajustan las reglas base:
- **conservative**: Pesos más bajos, volatilidad máxima 15%, drawdown máximo 20%
- **moderate**: Pesos estándar, volatilidad máxima 20%, drawdown máximo 30%
- **aggressive**: Pesos más altos, volatilidad máxima 30%, drawdown máximo 45%

### Validación de Cumplimiento (validateCompliance)

Función que valida una cartera contra las reglas:
- Retorna `violations` (críticas) y `warnings` (advertencias)
- Tipos de validación:
  - Concentración por activo (máximo/mínimo)
  - Concentración top 3
  - Volatilidad de cartera
  - Liquidez individual
  - Activos de alto riesgo

### Correcciones Automáticas (applyComplianceCorrections)

Función que aplica correcciones automáticas:
- Reduce pesos que exceden el máximo
- Elimina activos por debajo del mínimo
- Re-normaliza pesos para sumar 100%

### Documentación de Estrategias (STRATEGY_DOCUMENTATION)

Cada estrategia incluye documentación completa:
- Objetivo, horizonte, rendimiento esperado
- Volatilidad y drawdown esperados
- Perfil de inversor, condiciones ideales
- Características y riesgos identificados

### Generación de Reportes (generateGovernanceReport)

Combina validación de cumplimiento con documentación de estrategia para generar reportes completos de gobernanza.

## Notas de Performance

- **Rate limiting**: 15ms entre requests para evitar bloqueos
- **Cache**: Los benchmarks se cargan una sola vez por escaneo
- **Memoria**: Aproximadamente 50-100MB por universo de 100 activos
- **Performance**: ~2-3 segundos por activo analizado
- **Precisión**: 2 decimales para porcentajes, 1 para scores

---

## Estructura del Proyecto (TypeScript — Phase 2.2+)

Desde Phase 2.2 (febrero 2026) todos los archivos fuente están en TypeScript (`.ts`). Los archivos de test permanecen en `.js`.

```
global-scanner-pro/
├── server.js                    # Servidor Express (entry point)
├── src/
│   ├── alerts/
│   │   └── alert-system.ts      # Gestión de alertas y notificaciones
│   ├── allocation/
│   │   └── allocation.ts        # 5 estrategias de asignación de capital
│   ├── analytics/
│   │   ├── risk_engine.ts       # VaR, CVaR, correlaciones, Sharpe/Sortino/Calmar
│   │   ├── portfolio-optimizer.ts # Monte Carlo, max-Sharpe, min-varianza, risk-parity
│   │   ├── backtesting.ts       # Backtesting y walk-forward validation
│   │   ├── attribution-analysis.ts # Análisis de atribución (Brinson)
│   │   ├── comparative-analysis.ts # Comparación de estrategias
│   │   ├── stress-testing.ts    # Stress tests por sector, divisa, geopolítica
│   │   ├── market_regime.ts     # Detección de régimen (bull/bear/sideways)
│   │   ├── governance.ts        # Reglas de inversión y compliance
│   │   └── dynamic-governance.ts # Límites dinámicos según volatilidad/correlación
│   ├── config/
│   │   ├── environment.ts       # Configuración validada con Zod
│   │   └── swagger.ts           # Spec OpenAPI 3.0
│   ├── core/
│   │   ├── scanner.ts           # Lógica principal de UI y escaneo (3739 líneas)
│   │   └── config.ts            # Estrategias y benchmarks
│   ├── dashboard/
│   │   └── portfolio-dashboard.ts # Dashboard de cartera
│   ├── i18n/
│   │   └── i18n.ts              # Internacionalización (ES/EN)
│   ├── indicators/
│   │   ├── indicators.ts        # Librería de indicadores técnicos
│   │   └── scoring.ts           # Motor de puntuación multi-factor
│   ├── middleware/
│   │   ├── security.ts          # Helmet, CORS, rate limiting, HTTPS
│   │   ├── validation.ts        # Middleware de validación Zod
│   │   └── error-handler.ts     # Manejo centralizado de errores
│   ├── ml/
│   │   ├── ml-engine.ts         # ML: LinearRegression, RandomForest, KMeans
│   │   ├── adaptive-scoring.ts  # Scoring adaptativo con feedback
│   │   ├── anomaly-detection.ts # Detección de anomalías (Z-score, IQR)
│   │   ├── factor-weighting.ts  # Optimización de pesos de factores
│   │   ├── recommendation-engine.ts # Recomendaciones de cartera y riesgo
│   │   ├── regime-prediction.ts # Predicción de régimen de mercado
│   │   └── index.ts             # Re-exports ML públicos
│   ├── portfolio/
│   │   ├── portfolio-manager.ts # CRUD de carteras y posiciones
│   │   └── performance-tracker.ts # Drawdown, Sharpe, Sortino, Calmar, alfa/beta
│   ├── reports/
│   │   ├── report-generator.ts  # Generador base de reportes
│   │   ├── excel-exporter.ts    # Exportación Excel (xlsx)
│   │   ├── pdf-templates.ts     # Templates PDF (jsPDF)
│   │   ├── comparative-analysis.ts # Reportes de análisis comparativo
│   │   └── index.ts             # Re-exports de reportes
│   ├── security/
│   │   └── validation-schemas.ts # Schemas Zod para todos los endpoints
│   ├── storage/
│   │   └── indexed-db-store.ts  # Abstracción sobre IndexedDB
│   ├── tests/                   # Suites de test (permanecen en .js)
│   │   ├── unit/                # 47 archivos Vitest
│   │   ├── integration/         # 6 archivos Vitest
│   │   ├── e2e/                 # 11 specs Playwright
│   │   └── performance/         # 7 benchmarks + 3 load tests
│   ├── types/
│   │   └── index.ts             # Tipos compartidos (ver sección siguiente)
│   ├── ui/
│   │   └── ui-utils.ts          # Debounce, throttle, ARIA helpers
│   └── utils/
│       ├── logger.ts            # Winston logging
│       └── sentry.ts            # Integración Sentry
├── docs/                        # Documentación técnica
├── universes/                   # JSON de universos de mercado
├── Dockerfile                   # Imagen multi-stage (node:20-alpine)
├── docker-compose.yml           # Orquestación local
├── tsconfig.json                # TypeScript strict mode
├── vitest.config.js             # Configuración Vitest
├── playwright.config.js         # Configuración Playwright
└── eslint.config.js             # ESLint flat config
```

---

## Sistema de Tipos TypeScript (`src/types/index.ts`)

Interfaces clave compartidas entre módulos:

| Tipo | Descripción |
|------|-------------|
| `Candle` | OHLCV + timestamp para una barra de precio |
| `PricePoint` | `{ date, close }` simplificado |
| `YahooChartResult` | Respuesta de Yahoo Finance API v8 |
| `BollingerBandsResult` | `{ upper, middle, lower }` |
| `HardFilterResult` | Resultado del pre-filtro estricto |
| `Signal` | Señal técnica (`{ type, strength, description }`) |
| `ScoredAsset` | Activo con 25+ métricas de scoring (trend, momentum, risk, liquidity, final score, percentiles, señales) |
| `Portfolio` | Cartera con metadata y posiciones |
| `Position` | Posición individual (símbolo, cantidad, precio) |
| `PortfolioSnapshot` | Snapshot de valor total de cartera |
| `AllocationResult` | Resultado de asignación de capital (símbolo → peso) |
| `RiskReport` | VaR, CVaR, correlaciones, métricas de portfolio |
| `RegimeState` | `'bull' \| 'bear' \| 'sideways' \| 'volatile'` |

---

## API REST

### Endpoints Actuales

| Método | Path (v1) | Path (legacy) | Descripción |
|--------|-----------|---------------|-------------|
| GET | `/api/v1/health` | `/api/health` ⚠️ | Estado del servidor |
| GET | `/api/v1/yahoo` | `/api/yahoo` ⚠️ | Proxy Yahoo Finance |
| GET | `/api/v1/run-tests` | `/api/run-tests` ⚠️ | Suite de tests legacy |
| GET | `/api-docs` | — | Swagger UI interactivo |
| GET | `/api-docs.json` | — | Spec OpenAPI 3.0 (JSON) |

⚠️ Los paths legacy devuelven cabeceras `X-Deprecated: true` y `Deprecation: true`. Migrar a `/api/v1/`.

### Cabeceras de Versión

Las respuestas de `/api/v1/` incluyen:
```
X-API-Version: v1
```

### Formato de Error (todos los endpoints)

```json
{
  "error": "Validation failed",
  "timestamp": "2026-02-20T12:00:00.000Z",
  "statusCode": 400,
  "details": [
    { "field": "symbol", "message": "Symbol is required", "code": "too_small" }
  ]
}
```

### Rate Limiting

| Scope | Límite |
|-------|--------|
| Global | 100 req / 15 min por IP |
| `/api/v1/yahoo` | 20 req / min por IP |

---

## Módulos de Machine Learning (`src/ml/`)

| Módulo | Clase/Función principal | Descripción |
|--------|------------------------|-------------|
| `ml-engine.ts` | `MLEngine` | LinearRegression, DecisionTree, RandomForest, KMeans, normalización, correlación |
| `adaptive-scoring.ts` | `AdaptiveScoring` | Ajusta pesos de factores según feedback de rendimiento histórico |
| `factor-weighting.ts` | `FactorWeighting` | Optimiza pesos (trend/momentum/risk/liquidity) con backtest walk-forward |
| `anomaly-detection.ts` | `AnomalyDetection` | Detección de anomalías: Z-score, IQR, isolation-forest simplificado |
| `recommendation-engine.ts` | `RecommendationEngine` | Genera recomendaciones de cartera y warnings de riesgo |
| `regime-prediction.ts` | `RegimePrediction` | Clasifica régimen de mercado con features técnicas (vol, trend, breadth) |
| `index.ts` | — | Re-exports de la API pública ML |

**Pipeline ML completa**:
1. Extracción de features (indicadores técnicos → vector numérico)
2. Entrenamiento de pesos de factores (`FactorWeighting.train`)
3. Scoring adaptativo con feedback de rendimiento (`AdaptiveScoring`)
4. Predicción de régimen (`RegimePrediction.predict`)
5. Detección de anomalías (`AnomalyDetection.detectAll`)
6. Recomendaciones finales (`RecommendationEngine.analyzeAssetML`)

---

## Infraestructura Docker

### Imagen de Producción (`Dockerfile`)

Imagen multi-stage basada en `node:20-alpine`:

```
Stage 1 (deps):    instala sólo dependencias de producción
Stage 2 (runtime): copia artefactos, usuario no-root, HEALTHCHECK
```

- Puerto expuesto: `3000`
- Usuario: `node` (non-root)
- Health check: `GET /api/v1/health` cada 30s
- Tamaño objetivo: < 200MB

### Desarrollo Local (`docker-compose.yml`)

```bash
# Iniciar todos los servicios
docker-compose up

# Sólo la aplicación
docker-compose up app

# Reconstruir imagen
docker-compose up --build
```
