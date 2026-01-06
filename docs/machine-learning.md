## Fase 7: Optimización Avanzada con Machine Learning

**Versión:** 1.0
**Fecha:** Enero 2026
**Estado:** ✅ Completado

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema ML](#arquitectura-del-sistema-ml)
3. [Ponderación Dinámica de Factores](#ponderación-dinámica-de-factores)
4. [Ajuste Adaptativo de Scores](#ajuste-adaptativo-de-scores)
5. [Predicción de Régimen de Mercado](#predicción-de-régimen-de-mercado)
6. [Sistema de Recomendaciones con IA](#sistema-de-recomendaciones-con-ia)
7. [Detección de Patrones y Anomalías](#detección-de-patrones-y-anomalías)
8. [Guía de Uso](#guía-de-uso)
9. [API Reference](#api-reference)
10. [Testing](#testing)

---

## Resumen Ejecutivo

La Fase 7 introduce Machine Learning en Global Quant Scanner Pro, transformando el sistema en un motor cuantitativo adaptativo que aprende de datos históricos y se optimiza continuamente.

### ✅ Componentes Implementados

1. **ML Engine Core** ([ml-engine.js](../src/ml/ml-engine.js))
   - Linear Regression con regularización L2
   - Random Forest Regressor (ensemble de Decision Trees)
   - K-Means Clustering para detección de outliers
   - Utilidades: normalización, train/test split, cross-validation, métricas (R², MAE, RMSE)

2. **Factor Weighting** ([factor-weighting.js](../src/ml/factor-weighting.js))
   - Optimización dinámica de pesos de factores usando Random Forest
   - Feature importance analysis
   - Cross-validation para prevenir overfitting
   - Smoothing con pesos default (60% ML, 40% default)

3. **Adaptive Scoring** ([adaptive-scoring.js](../src/ml/adaptive-scoring.js))
   - Tracking de performance histórica (hit rate, win/loss ratios)
   - Multiplicadores adaptativos basados en success rate
   - Signal decay por antigüedad
   - Análisis regime-specific

4. **Regime Prediction** ([regime-prediction.js](../src/ml/regime-prediction.js))
   - Random Forest Classifier para 3 regímenes (Risk-On, Neutral, Risk-Off)
   - Features: trend, volatility, breadth, correlations
   - Predicciones probabilísticas con confianza

5. **Recommendation Engine** ([recommendation-engine.js](../src/ml/recommendation-engine.js))
   - Rebalancing automático
   - Oportunidades de compra
   - Alertas de venta
   - Warnings de riesgo y concentración
   - Detección de cambios de régimen

6. **Anomaly Detection** ([anomaly-detection.js](../src/ml/anomaly-detection.js))
   - Z-score anomaly detection
   - K-Means clustering para outliers
   - Correlation anomalies
   - Price-score divergence detection
   - Volume anomalies

### 🎯 Beneficios Clave

- **Adaptabilidad**: El sistema aprende de performance histórica y ajusta parámetros
- **Predicción**: Anticipa cambios de régimen de mercado
- **Detección**: Identifica oportunidades únicas y riesgos ocultos
- **Automatización**: Recomendaciones proactivas sin intervención manual
- **Robustez**: Cross-validation y regularización previenen overfitting

---

## Arquitectura del Sistema ML

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────┐
│                    ML Engine Core                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ Linear       │ │ Random       │ │ K-Means      │    │
│  │ Regression   │ │ Forest       │ │ Clustering   │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Utilities: Normalization, Metrics, CV, Train/Test │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
┌─────────▼──────────┐           ┌───────────▼────────────┐
│ Factor Weighting    │           │ Regime Prediction      │
│ - Feature extraction│           │ - Market features      │
│ - Model training    │           │ - RF Classifier        │
│ - Weight optimization│          │ - Probabilistic output │
└─────────┬──────────┘           └───────────┬────────────┘
          │                                   │
┌─────────▼──────────┐           ┌───────────▼────────────┐
│ Adaptive Scoring    │           │ Recommendation Engine  │
│ - Performance track │           │ - Rebalancing          │
│ - Hit rate analysis │           │ - Opportunities        │
│ - Signal decay      │           │ - Risk alerts          │
└─────────┬──────────┘           └───────────┬────────────┘
          │                                   │
          └─────────────────┬─────────────────┘
                            │
                ┌───────────▼────────────┐
                │ Anomaly Detection      │
                │ - Z-score outliers     │
                │ - Clustering outliers  │
                │ - Pattern detection    │
                └────────────────────────┘
```

### Tecnología

- **100% JavaScript puro**: Sin dependencias de librerías ML externas
- **Browser-compatible**: Funciona en navegadores modernos
- **Lightweight**: Implementaciones optimizadas para rendimiento
- **Modular**: Cada componente es independiente y reutilizable

---

## Ponderación Dinámica de Factores

### Concepto

Tradicionalmente, los pesos de factores (momentum, value, volatility, etc.) son estáticos. Este módulo usa Random Forest para optimizar dinámicamente estos pesos basándose en qué factores han predicho mejor los retornos futuros.

### Factores Analizados

| Factor | Features | Peso Default |
|--------|----------|--------------|
| **Momentum** | ROC 20/60/120, Precio vs EMAs | 30% |
| **Value** | Proxies de valuación | 20% |
| **Volatility** | Vol histórica, drawdown | 15% |
| **Volume** | Liquidez, volumen relativo | 15% |
| **Quality** | Consistencia, estabilidad | 20% |

### Proceso de Optimización

1. **Feature Extraction**: Extrae 12 features de cada activo
2. **Target Variable**: Forward return a 60 días
3. **Model Training**: Random Forest con 50 árboles, max depth 8
4. **Feature Importance**: Calcula importancia de cada feature
5. **Factor Mapping**: Mapea feature importance a factor weights
6. **Smoothing**: 60% ML-derived, 40% default weights

### Uso

```javascript
import { trainAndOptimizeFactorWeights } from './src/ml/factor-weighting.js';

// Historical assets with prices and volumes
const historicalAssets = [ /* ... */ ];

const result = await trainAndOptimizeFactorWeights(historicalAssets);

if (result.success) {
  console.log('Optimized weights:', result.weights);
  // {
  //   momentum: 0.35,
  //   value: 0.15,
  //   volatility: 0.18,
  //   volume: 0.12,
  //   quality: 0.20
  // }

  console.log('Model R²:', result.trainingResult.metrics.test.r2);
  console.log('Feature importance:', result.featureImportance);
} else {
  // Use default weights
  console.log('Using default weights:', result.weights);
}
```

### Validación

- **Cross-Validation**: 5-fold CV para robustez
- **R² Threshold**: Solo usa weights ML si R² > 0.1
- **Smoothing**: Previene desviaciones extremas de defaults

---

## Ajuste Adaptativo de Scores

### Concepto

Los scores cuantitativos se ajustan dinámicamente basándose en:
- **Hit Rate Histórico**: % de señales que generaron retornos positivos
- **Regime-Specific Performance**: Performance por régimen de mercado
- **Signal Decay**: Penalización por antigüedad de señal

### Performance Tracking

```javascript
import { PerformanceTracker, PerformanceRecord } from './src/ml/adaptive-scoring.js';

const tracker = new PerformanceTracker();

// After each signal/trade, record actual outcome
const record = new PerformanceRecord(
  'AAPL',           // ticker
  Date.now(),       // timestamp
  75,               // quant_score
  12.5,             // actualReturn (%)
  'risk_on',        // regime
  'momentum'        // strategy
);

tracker.addRecord(record);

// Calculate performance metrics
const hitRate = tracker.calculateHitRate({ strategy: 'momentum' });
console.log(`Hit rate: ${hitRate.hitRate * 100}%`);

const summary = tracker.getSummary({ strategy: 'momentum', regime: 'risk_on' });
console.log(summary);
// {
//   hitRate: 0.65,
//   avgReturn: 8.2,
//   winRate: 0.65,
//   avgWin: 15.3,
//   avgLoss: -6.8,
//   sampleSize: 45
// }
```

### Multiplicadores Adaptativos

| Hit Rate | Categoria | Multiplier |
|----------|-----------|------------|
| > 70% | Excellent | 1.25x |
| 60-70% | Good | 1.10x |
| 50-60% | Neutral | 1.00x |
| 40-50% | Poor | 0.85x |
| < 40% | Very Poor | 0.70x |

### Signal Decay

```
Multiplier = 0.5^(age_in_days / half_life)
Half-life = 10 days
Minimum = 0.5 (50%)
```

### Score Adjustment

```javascript
import { adjustScoreAdaptively } from './src/ml/adaptive-scoring.js';

const adjustment = adjustScoreAdaptively(
  75,                 // baseScore
  'momentum',         // strategy
  'risk_on',          // regime
  signalTimestamp,    // when signal was generated
  performanceTracker  // historical performance
);

console.log(adjustment);
// {
//   baseScore: 75,
//   adjustedScore: 82.5,  // 75 * 1.10 (good hit rate) * 1.0 (recent signal)
//   multipliers: {
//     performance: 1.10,
//     decay: 1.00,
//     combined: 1.10
//   },
//   metadata: {
//     strategy: 'momentum',
//     regime: 'risk_on',
//     hitRate: 0.65,
//     confidence: 'high',
//     signalAge: 2.5
//   }
// }
```

---

## Predicción de Régimen de Mercado

### Concepto

Usa Random Forest Classifier para predecir el régimen de mercado basándose en 12 features técnicas. Mejora sobre reglas heurísticas al capturar interacciones no lineales.

### Features Utilizadas

1. **Trend**: Price vs EMA20/50/200, EMA alignment
2. **Volatility**: Vol 20/60 días, volatility ratio
3. **Momentum**: ROC 20/60 días
4. **Breadth**: % assets above EMA20
5. **Correlation**: Average pairwise correlation
6. **Volume**: Recent vs historical volume

### Training

```javascript
import { trainRegimeClassifier } from './src/ml/regime-prediction.js';

// Prepare training data with labeled regimes
const historicalData = [
  {
    marketData: {
      benchmarkPrices: [...],
      assetPrices: [...],
      volumes: [...],
      correlations: [...]
    },
    actualRegime: 'risk_on'  // Label: 'risk_on', 'neutral', 'risk_off'
  },
  // ... more samples
];

const { X, y } = prepareRegimeTrainingData(historicalData);
const result = trainRegimeClassifier(X, y);

console.log(`Accuracy: ${result.accuracy * 100}%`);
```

### Prediction

```javascript
import { predictRegime } from './src/ml/regime-prediction.js';

const prediction = predictRegime(currentMarketData, trainedModel);

console.log(prediction);
// {
//   regime: 'risk_off',
//   confidence: 0.82,
//   probabilities: {
//     risk_off: 0.82,
//     neutral: 0.15,
//     risk_on: 0.03
//   },
//   features: { ... },
//   timestamp: 1704556800000
// }
```

### Probabilistic Output

- **Confidence**: Probability of predicted class
- **Thresholds**:
  - High confidence: > 70%
  - Medium: 50-70%
  - Low: < 50%

---

## Sistema de Recomendaciones con IA

### Concepto

Genera recomendaciones proactivas analizando cartera actual, condiciones de mercado y performance histórica.

### Tipos de Recomendaciones

| Tipo | Prioridad | Descripción |
|------|-----------|-------------|
| **Rebalance** | Medium/High | Desviación > 5% de target weights |
| **Buy Opportunity** | Medium | Activos con high score no en portfolio |
| **Sell Alert** | High | Activos con performance/score bajo |
| **Risk Warning** | Critical/High | Concentración, volatilidad extrema |
| **Diversification** | Medium | Exposición sectorial > 35% |
| **Regime Change** | Critical/High | Cambio de régimen detectado |

### Uso

```javascript
import { generateRecommendations } from './src/ml/recommendation-engine.js';

const recommendations = generateRecommendations(
  portfolio,             // Current portfolio state
  marketData,           // Market conditions
  historicalPerformance // Historical asset performance
);

recommendations.forEach(rec => {
  console.log(`[${rec.priority.label}] ${rec.title}`);
  console.log(`  ${rec.message}`);
  console.log(`  Action: ${rec.action}`);
  console.log(`  Confidence: ${rec.confidence * 100}%`);
});

// Example output:
// [Critical] Market Regime Change Detected
//   Market transitioning from risk_on to risk_off with 85% confidence
//   Action: Reduce Risk
//   Confidence: 85%
//
// [High] Rebalance AAPL
//   Current weight (25.0%) deviates from target (20.0%) by 5.0%
//   Action: Sell
//   Confidence: 90%
//
// [Medium] Buy Opportunity: NVDA
//   High quant score (82.5) with strong momentum and quality signals
//   Action: Consider Buying
//   Confidence: 70%
```

### Filtrado

```javascript
import { filterByPriority, RECOMMENDATION_PRIORITY } from './src/ml/recommendation-engine.js';

// Only critical and high priority
const urgentRecs = filterByPriority(recommendations, RECOMMENDATION_PRIORITY.HIGH.level);
```

---

## Detección de Patrones y Anomalías

### Concepto

Usa técnicas de unsupervised learning para detectar comportamientos anómalos y patrones inusuales.

### Métodos de Detección

#### 1. Z-Score Anomalies

Detecta valores extremos (> 2-3 standard deviations):

```javascript
import { detectZScoreAnomalies } from './src/ml/anomaly-detection.js';

const anomalies = detectZScoreAnomalies(assets, 'quant_score');

anomalies.forEach(a => {
  console.log(`${a.ticker}: z-score ${a.zScore.toFixed(2)} (${a.severity})`);
});
```

#### 2. Clustering Outliers

K-Means clustering para identificar activos con características únicas:

```javascript
import { detectClusterAnomalies } from './src/ml/anomaly-detection.js';

const { anomalies, clusters } = detectClusterAnomalies(assets);

console.log(`Found ${anomalies.length} outliers`);
console.log(`Cluster inertia: ${clusters.inertia.toFixed(2)}`);
```

#### 3. Correlation Anomalies

Detecta pares de activos con correlaciones extremadamente altas (> 90%):

```javascript
import { detectCorrelationAnomalies } from './src/ml/anomaly-detection.js';

const corrAnomalies = detectCorrelationAnomalies(assets, correlationMatrix);
// High correlation between AAPL and MSFT (95.2%)
```

#### 4. Price-Score Divergence

Detecta divergencias entre score cuantitativo y precio:

```javascript
import { detectPriceScoreDivergence } from './src/ml/anomaly-detection.js';

const divergences = detectPriceScoreDivergence(assets);
// TSLA: bullish_divergence - Score is 40.0 but price change is -12.5%
```

#### 5. Volume Anomalies

Detecta volúmenes inusuales (spikes o droughts):

```javascript
import { detectVolumeAnomalies } from './src/ml/anomaly-detection.js';

const volAnomalies = detectVolumeAnomalies(assets);
// NVDA has unusually high volume (z-score: 3.2)
```

### Comprehensive Scan

```javascript
import { detectAllAnomalies, getAnomalySummary } from './src/ml/anomaly-detection.js';

const allAnomalies = detectAllAnomalies(assets, correlationMatrix);

const summary = getAnomalySummary(allAnomalies);
console.log(summary);
// {
//   total: 15,
//   by_type: {
//     z_score_anomaly: 5,
//     cluster_anomaly: 3,
//     correlation_anomaly: 2,
//     price_score_divergence: 4,
//     volume_anomaly: 1
//   },
//   by_severity: {
//     extreme: 2,
//     high: 6,
//     moderate: 7
//   },
//   top_anomalies: [...]
// }
```

---

## Guía de Uso

### Integración Completa

```javascript
// 1. Import ML modules
import {
  trainAndOptimizeFactorWeights,
  PerformanceTracker,
  adjustScoresBatch,
  trainRegimeClassifier,
  predictRegime,
  generateRecommendations,
  detectAllAnomalies
} from './src/ml/index.js';

// 2. Initialize performance tracker
const performanceTracker = await loadPerformanceTracker();

// 3. Train factor weighting model (monthly)
const { weights } = await trainAndOptimizeFactorWeights(historicalAssets);

// 4. Train regime classifier (monthly)
const regimeModel = trainRegimeClassifier(X_regime, y_regime);

// 5. During scan: predict regime
const regimePrediction = predictRegime(marketData, regimeModel.model);

// 6. Adjust scores adaptively
const adjustedAssets = adjustScoresBatch(
  assets,
  strategy,
  regimePrediction.regime,
  performanceTracker
);

// 7. Generate recommendations
const recommendations = generateRecommendations(
  portfolio,
  { ...marketData, regime_prediction: regimePrediction },
  historicalPerformance
);

// 8. Detect anomalies
const anomalies = detectAllAnomalies(adjustedAssets, correlationMatrix);

// 9. After trades: record performance
const record = new PerformanceRecord(...);
performanceTracker.addRecord(record);
await savePerformanceTracker(performanceTracker);
```

### Retraining Schedule

| Component | Frequency | Reason |
|-----------|-----------|--------|
| Factor Weights | Monthly | Market dynamics evolve |
| Regime Classifier | Monthly | Regime patterns shift |
| Performance Tracker | Continuous | Always learning |

---

## API Reference

### ML Engine

```javascript
// Linear Regression
const lr = new LinearRegression();
lr.fit(X, y, { learningRate: 0.01, epochs: 1000, regularization: 0.01 });
const predictions = lr.predict(X_test);

// Random Forest
const rf = new RandomForestRegressor({ nEstimators: 50, maxDepth: 8 });
rf.fit(X, y);
const importance = rf.getFeatureImportance(X);

// K-Means
const kmeans = new KMeans({ k: 3, maxIterations: 100 });
kmeans.fit(X);
const labels = kmeans.predict(X);
```

### Utilities

```javascript
// Metrics
const r2 = calculateR2(actual, predicted);
const mae = calculateMAE(actual, predicted);
const rmse = calculateRMSE(actual, predicted);

// Preprocessing
const normalized = normalizeArray(values);  // [0, 1]
const standardized = standardizeArray(values);  // mean=0, std=1

// Split
const { X_train, X_test, y_train, y_test } = trainTestSplit(X, y, 0.2, true);

// Cross-validation
const folds = kFoldSplit(n, k=5);
```

---

## Testing

Ejecutar tests ML:

```javascript
import { runAllMLTests } from './src/tests/ml-tests.js';

const results = await runAllMLTests();
// ╔═══════════════════════════════════════╗
// ║  ML TEST RESULTS: 8 ✅  0 ❌
// ╚═══════════════════════════════════════╝
```

Tests incluidos:
- ✅ Linear Regression
- ✅ Random Forest
- ✅ K-Means Clustering
- ✅ Factor Weighting
- ✅ Adaptive Scoring
- ✅ Regime Prediction
- ✅ Recommendation Engine
- ✅ Anomaly Detection

---

## Roadmap Futuro

### Mejoras Planificadas

- [ ] Neural Network implementation (simple feedforward)
- [ ] Gradient Boosting (XGBoost-style)
- [ ] LSTM for time series forecasting
- [ ] Hyperparameter tuning automation
- [ ] Online learning (incremental updates)
- [ ] Ensemble meta-models
- [ ] Feature engineering automation
- [ ] Model explainability (SHAP-like)

---

## Changelog

### v1.0.0 (Enero 2026)

- ✅ ML Engine Core: Linear Regression, Random Forest, K-Means
- ✅ Factor Weighting Optimization
- ✅ Adaptive Scoring System
- ✅ Regime Prediction with Classification
- ✅ AI Recommendation Engine
- ✅ Anomaly & Pattern Detection
- ✅ Complete Test Suite
- ✅ Full Documentation

---

## Referencias

- Marcos López de Prado: "Advances in Financial Machine Learning"
- Random Forests: Breiman, L. (2001)
- K-Means: MacQueen, J. (1967)
- Cross-Validation: Kohavi, R. (1995)

---

**© 2026 Global Quant Scanner Pro - Fase 7: Machine Learning**
