# 📊 Análisis de Atribución de Rendimiento

El módulo de **Análisis de Atribución** descompone el rendimiento del portafolio para identificar **qué decisiones de inversión impulsaron los resultados**. Este análisis es fundamental para entender si el retorno proviene de una buena selección de activos, una asignación sectorial acertada, o factores específicos de mercado.

---

## 🎯 Objetivo del Módulo

El análisis de atribución responde a preguntas clave:

1. **¿El exceso de rendimiento viene de selección de activos o de asignación sectorial?**
2. **¿Qué factores (Trend, Momentum, Risk, Liquidity) contribuyeron más al rendimiento?**
3. **¿Qué activos individuales fueron los principales contribuyentes o detractores?**
4. **¿Cómo varió el rendimiento por periodos (mensual, trimestral, anual)?**
5. **¿Cómo se comportó el portafolio durante eventos de mercado específicos?**

---

## 📐 Metodología: Modelo Brinson-Fachler

El módulo utiliza el **Modelo Brinson-Fachler** para descomponer el rendimiento activo (exceso de rendimiento sobre el benchmark) en tres componentes:

### Fórmula

```
Total Active Return = Allocation Effect + Selection Effect + Interaction Effect
```

Donde:

- **Allocation Effect** = (w_p - w_b) × R_b
  - Mide el impacto de sobreponderar o infraponderar sectores vs. el benchmark
  - `w_p` = peso del sector en el portafolio
  - `w_b` = peso del sector en el benchmark
  - `R_b` = rendimiento del sector en el benchmark

- **Selection Effect** = w_b × (R_p - R_b)
  - Mide el impacto de elegir mejores o peores activos dentro de cada sector
  - `R_p` = rendimiento del sector en el portafolio
  - `R_b` = rendimiento del sector en el benchmark

- **Interaction Effect** = (w_p - w_b) × (R_p - R_b)
  - Captura la interacción entre decisiones de asignación y selección

### Interpretación

| Situación | Interpretación |
|-----------|----------------|
| **Allocation > 0** | La asignación sectorial fue acertada (sobreponderar sectores ganadores) |
| **Allocation < 0** | La asignación sectorial fue incorrecta (sobreponderar sectores perdedores) |
| **Selection > 0** | La selección de activos fue superior al benchmark |
| **Selection < 0** | La selección de activos fue inferior al benchmark |

---

## 🔍 Características Principales

### 1. Descomposición Brinson-Fachler

**Ubicación**: Pestaña "Asignación vs Selección"

Desglosa el rendimiento excedente en:
- ✅ **Efecto de Asignación por Sector**: Muestra qué sectores contribuyeron positiva o negativamente por decisiones de peso
- ✅ **Efecto de Selección por Sector**: Identifica en qué sectores la selección de activos fue superior o inferior
- ✅ **Interpretación Automática**: Genera conclusiones en lenguaje natural sobre las fuentes del rendimiento

**Ejemplo de Output**:
```
Allocation Effect: +2.3%
Selection Effect: +1.8%
Interaction Effect: +0.4%
---
Total Active Return: +4.5%

Interpretación:
• Positive excess return primarily driven by superior sector allocation decisions.
• Both allocation and selection contributed positively to performance.
```

### 2. Atribución por Factores

**Ubicación**: Pestaña "Contribución por Factor"

Identifica la contribución de cada factor cuantitativo al rendimiento total:

- **Trend**: Contribución de seguir tendencias de mercado
- **Momentum**: Contribución de activos con fuerte momentum
- **Risk**: Contribución de la gestión de riesgo (volatilidad controlada)
- **Liquidity**: Contribución de activos líquidos

**Cómo Funciona**:
1. Cada posición tiene scores de factores (Trend, Momentum, Risk, Liquidity)
2. El rendimiento de cada activo se distribuye proporcionalmente según sus scores
3. Se suman las contribuciones por factor para obtener el total

**Output**:
```
Factor Summary:
• Trend:      45% del rendimiento (+2.1%)
• Momentum:   30% del rendimiento (+1.4%)
• Risk:       15% del rendimiento (+0.7%)
• Liquidity:  10% del rendimiento (+0.5%)
```

Incluye también los **Top 5 Contribuyentes por Factor** para ver qué activos impulsaron cada factor.

### 3. Contribución por Activo Individual

**Ubicación**: Pestaña "Contribución por Activo"

Muestra cómo cada activo contribuyó al rendimiento total del portafolio.

**Fórmula**:
```
Contribution = Asset Return × Portfolio Weight
```

**Output**:
- **Top Contributors**: Los 10 activos que más contribuyeron al rendimiento
- **Top Detractors**: Los 5 activos que más restaron al rendimiento

**Información por Activo**:
- Ticker y Nombre
- Sector
- Peso en el portafolio (%)
- Rendimiento individual (%)
- Contribución al portafolio (%)

### 4. Atribución Temporal (por Periodos)

**Ubicación**: Pestaña "Atribución Temporal"

Desglosa el rendimiento por periodos de tiempo:

- **Mensual**: Últimos 12 meses
- **Trimestral**: Todos los trimestres desde la creación del portafolio
- **Anual**: Todos los años completos

Para cada periodo, muestra:
- Rendimiento del Portafolio
- Rendimiento del Benchmark
- Rendimiento Excedente (diferencia)

Esto permite identificar:
- ✅ Periodos de outperformance (superar al benchmark)
- ❌ Periodos de underperformance (quedar por debajo del benchmark)
- 📈 Tendencias temporales en la estrategia

### 5. Atribución por Eventos de Mercado

**Ubicación**: Método `calculateEventAttribution()` (API)

Permite analizar el comportamiento del portafolio durante eventos específicos de mercado, como:
- Correcciones de mercado
- Crisis financieras
- Periodos de alta volatilidad
- Eventos geopolíticos

**Para cada evento, calcula**:
- Rendimiento del portafolio durante el evento
- Rendimiento del benchmark durante el evento
- Rendimiento excedente
- Drawdown máximo durante el evento
- Sharpe Ratio ajustado al riesgo

**Ejemplo de Eventos**:
```javascript
const events = [
  {
    name: 'COVID-19 Crash',
    start_date: '2020-02-20',
    end_date: '2020-03-23',
    description: 'Market crash due to COVID-19 pandemic'
  },
  {
    name: 'Tech Bubble 2022',
    start_date: '2022-01-01',
    end_date: '2022-10-31',
    description: 'Technology stocks correction'
  }
];

const eventAttribution = attributionAnalyzer.calculateEventAttribution(
  portfolioReturns,
  benchmarkReturns,
  events
);
```

---

## 💻 Uso del Módulo

### Integración en el Portfolio Dashboard

```javascript
import { AttributionDashboard } from './dashboard/attribution-dashboard.js';
import { portfolioManager } from './portfolio/portfolio-manager.js';

// Cargar portafolio
const portfolio = await portfolioManager.loadPortfolio(portfolioId);

// Inicializar dashboard de atribución
const attributionDashboard = new AttributionDashboard('attribution-container');
await attributionDashboard.initialize(portfolio);
```

### Uso Directo del Attribution Analyzer

```javascript
import { attributionAnalyzer } from './analytics/attribution-analysis.js';
import { performanceTracker } from './portfolio/performance-tracker.js';

// 1. Obtener datos del portafolio
const portfolio = await portfolioManager.loadPortfolio(portfolioId);
const portfolioReturns = await performanceTracker.calculateEquityCurve(portfolio);

// 2. Obtener datos del benchmark
const benchmark = '^GSPC'; // S&P 500
const fromDate = portfolioReturns[0].date;
const toDate = portfolioReturns[portfolioReturns.length - 1].date;
const benchmarkPrices = await performanceTracker.loadPriceData(benchmark, fromDate, toDate);
const benchmarkReturns = benchmarkPrices.map(p => ({ date: p.date, value: p.price }));

// 3. Calcular atribución
const attribution = attributionAnalyzer.calculateAttribution(
  portfolio,
  portfolioReturns,
  benchmarkReturns,
  factorScores // opcional: incluir scores de factores
);

console.log('Summary:', attribution.summary);
console.log('Brinson Attribution:', attribution.brinson);
console.log('Factor Attribution:', attribution.factors);
console.log('Asset Contribution:', attribution.assets);
console.log('Period Attribution:', attribution.periods);
```

---

## 📊 Estructura de Datos de Salida

### Attribution Data Structure

```javascript
{
  // Resumen general
  summary: {
    total_return: 0.125,          // 12.5% return
    benchmark_return: 0.08,       // 8% return
    excess_return: 0.045,         // 4.5% excess return
    active_positions: 15,
    analysis_period: {
      start: '2024-01-01',
      end: '2024-12-31',
      days: 365
    }
  },

  // Atribución Brinson
  brinson: {
    allocation_effect: {
      total: 2.3,                 // +2.3%
      by_sector: [
        {
          sector: 'Information Technology',
          sector_id: 800,
          portfolio_weight: 35,   // 35%
          benchmark_weight: 28,   // 28%
          weight_difference: 7,   // +7%
          contribution: 1.2       // +1.2%
        },
        // ... más sectores
      ]
    },
    selection_effect: {
      total: 1.8,                 // +1.8%
      by_sector: [...]
    },
    interaction_effect: {
      total: 0.4,                 // +0.4%
      by_sector: [...]
    },
    total_active_return: 4.5,     // +4.5%
    interpretation: [
      'Positive excess return primarily driven by superior sector allocation decisions.',
      'Both allocation and selection contributed positively to performance.'
    ]
  },

  // Atribución por Factores
  factors: {
    trend: {
      total_contribution: 2.1,    // +2.1%
      top_contributors: [
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          factor_score: 85,
          weight: 5.5,            // 5.5%
          contribution: 0.6       // +0.6%
        },
        // ... top 5
      ]
    },
    momentum: {...},
    risk: {...},
    liquidity: {...},
    summary: {
      trend_pct: 45,              // 45% del rendimiento
      momentum_pct: 30,           // 30%
      risk_pct: 15,               // 15%
      liquidity_pct: 10           // 10%
    }
  },

  // Contribución por Activo
  assets: {
    total_contribution: 12.5,     // +12.5%
    top_contributors: [
      {
        ticker: 'NVDA',
        name: 'NVIDIA Corporation',
        sector: 'Information Technology',
        weight: 8.5,              // 8.5%
        return: 45.2,             // +45.2%
        contribution: 3.8,        // +3.8%
        entry_price: 450.00,
        current_price: 653.00,
        score: 92
      },
      // ... top 10
    ],
    top_detractors: [...]         // Los 5 peores
  },

  // Atribución Temporal
  periods: {
    monthly: [
      {
        period: '2024-12',
        portfolio_return: 3.5,    // +3.5%
        benchmark_return: 2.1,    // +2.1%
        excess_return: 1.4,       // +1.4%
        days: 21
      },
      // ... últimos 12 meses
    ],
    quarterly: [...],
    yearly: [...]
  }
}
```

---

## 🎨 Visualizaciones

El **Attribution Dashboard** incluye visualizaciones interactivas:

### 1. Summary Cards
- Tarjetas con métricas clave (Rendimiento Portafolio, Benchmark, Excedente)
- Código de colores (verde para positivo, rojo para negativo)

### 2. Effect Bars (Brinson)
- Barras horizontales que muestran la magnitud de cada efecto
- Colores diferenciados por tipo de efecto

### 3. Tablas Interactivas
- Tablas ordenables con datos de atribución por sector y activo
- Formato condicional para resaltar contribuciones positivas/negativas

### 4. Factor Breakdown
- Tarjetas visuales con iconos para cada factor
- Porcentaje de contribución al rendimiento total

### 5. Period Charts
- Gráficos de barras comparando portafolio vs. benchmark por periodo
- Canvas preparado para integración con Chart.js

---

## 🔧 Configuración y Personalización

### Customizar Pesos Sectoriales del Benchmark

Por defecto, el módulo usa pesos aproximados del S&P 500. Para usar pesos reales:

```javascript
// En attribution-analysis.js, método _estimateBenchmarkSectorWeights()
_estimateBenchmarkSectorWeights() {
  // Cargar pesos reales desde API o archivo de configuración
  return {
    100: 0.04,   // Energy
    200: 0.03,   // Materials
    // ... actualizar con datos reales
  };
}
```

### Agregar Nuevos Factores

Para agregar un nuevo factor (ej. "Value"):

1. **Actualizar Factor Attribution**:
```javascript
// En _calculateFactorAttribution()
factorContributions.value = [];

// Calcular proporción del factor
const valueProportion = (scores.value || 0) / totalScore;

factorContributions.value.push({
  ticker: position.ticker,
  name: position.name,
  factor_score: scores.value || 0,
  weight: weight * 100,
  contribution: contribution * valueProportion * 100
});
```

2. **Actualizar Dashboard**:
```javascript
// En renderFactorAnalysis(), agregar nueva tarjeta
<div class="factor-card">
  <div class="factor-icon value"></div>
  <div class="factor-info">
    <div class="factor-label">${i18n.t('attribution.value')}</div>
    <div class="factor-value">${factors.summary.value_pct.toFixed(1)}%</div>
    <div class="factor-contribution">...</div>
  </div>
</div>
```

3. **Agregar Traducciones**:
```javascript
// en es.js y en.js
attribution: {
  value: 'Valor', // 'Value' en inglés
  top_value_contributors: 'Principales Contribuyentes - Valor'
}
```

---

## 📈 Casos de Uso

### Caso 1: Evaluación de Estrategia de Asignación Sectorial

**Problema**: ¿La estrategia de sobreponderación de tecnología fue acertada?

**Solución**:
1. Ir a pestaña "Asignación vs Selección"
2. Revisar la tabla "Efecto de Asignación por Sector"
3. Buscar el sector "Information Technology"
4. Si `contribution > 0`, la decisión fue acertada

**Resultado Ejemplo**:
```
Information Technology:
Portfolio Weight: 35%
Benchmark Weight: 28%
Difference: +7%
Contribution: +1.8%

✅ La sobreponderación de tecnología agregó +1.8% al rendimiento
```

### Caso 2: Identificar Activos Problemáticos

**Problema**: ¿Qué activos están lastimando el rendimiento del portafolio?

**Solución**:
1. Ir a pestaña "Contribución por Activo"
2. Revisar la tabla "Top Detractors"
3. Identificar activos con `contribution < 0`

**Acción**:
- Revisar la tesis de inversión de esos activos
- Considerar reducir o eliminar posiciones
- Analizar si es problema temporal o estructural

### Caso 3: Validar Factor Strategy

**Problema**: ¿El enfoque en momentum está generando retornos?

**Solución**:
1. Ir a pestaña "Contribución por Factor"
2. Revisar `momentum.total_contribution`
3. Ver `momentum.summary.momentum_pct`

**Interpretación**:
```
Momentum: 30% del rendimiento (+1.4%)

Si momentum_pct > peso_objetivo:
  ✅ El factor momentum está funcionando bien
Else:
  ⚠️ El factor momentum está underperforming
```

### Caso 4: Análisis Post-Evento

**Problema**: ¿Cómo se comportó el portafolio durante la corrección de mercado?

**Solución**:
```javascript
const events = [{
  name: 'Market Correction Q4 2024',
  start_date: '2024-10-01',
  end_date: '2024-12-15',
  description: 'Tech sector correction'
}];

const eventAttribution = attributionAnalyzer.calculateEventAttribution(
  portfolioReturns,
  benchmarkReturns,
  events
);

console.log('Excess Return during event:', eventAttribution.events[0].excess_return);
console.log('Max Drawdown:', eventAttribution.events[0].portfolio_max_drawdown);
```

**Resultado Ejemplo**:
```
Market Correction Q4 2024:
Portfolio Return: -8.5%
Benchmark Return: -12.3%
Excess Return: +3.8%
Portfolio Max Drawdown: -9.2%

✅ El portafolio superó al benchmark durante la corrección,
   con menor drawdown máximo
```

---

## ⚙️ Limitaciones y Consideraciones

### 1. Estimación de Pesos Sectoriales del Benchmark
- Por defecto, usa pesos aproximados del S&P 500
- Para análisis preciso, se recomienda cargar pesos reales del benchmark utilizado

### 2. Atribución de Factores
- Requiere que los activos tengan scores de factores calculados previamente
- La distribución proporcional de contribución es simplificada
- En implementaciones avanzadas, se podría usar regresión factorial

### 3. Frecuencia de Datos
- La precisión depende de la frecuencia de snapshots del portafolio
- Snapshots diarios proporcionan mayor granularidad que semanales o mensuales

### 4. Costos de Transacción
- El análisis actual **no incluye** costos de transacción ni slippage
- Para backtesting realista, estos costos deben agregarse externamente

### 5. Interacción entre Efectos
- El efecto de interacción puede ser positivo o negativo
- Valores altos de interacción pueden indicar decisiones muy activas (alto tracking error)

---

## 🚀 Mejoras Futuras

### Roadmap de Funcionalidades

1. **Atribución Multi-Factor Avanzada** (Regresión Factorial)
   - Usar regresión para estimar exposiciones reales a factores
   - Calcular alfa verdadero (return no explicado por factores)

2. **Atribución de Interacciones entre Factores**
   - Identificar sinergia o conflicto entre factores (ej. Trend × Momentum)

3. **Análisis de Timing**
   - Medir habilidad de timing de mercado (compra/venta en momentos oportunos)

4. **Atribución de Costos**
   - Desglosar impacto de comisiones, spreads, slippage, impuestos

5. **Comparación con Peers**
   - Comparar atribución vs. otros portafolios o fondos similares

6. **Visualizaciones Avanzadas**
   - Gráficos de contribución acumulada
   - Heatmaps de contribución por periodo y sector
   - Sankey diagrams para flujo de rendimiento

7. **Exportación de Reportes**
   - Generar PDFs profesionales con análisis de atribución
   - Integración con módulo de reportes existente

---

## 📚 Referencias

### Papers y Libros

1. **Brinson, Gary P., L. Randolph Hood, and Gilbert L. Beebower (1986)**
   *"Determinants of Portfolio Performance"*
   Financial Analysts Journal, 42(4), 39-44.

2. **Brinson, Gary P., Brian D. Singer, and Gilbert L. Beebower (1991)**
   *"Determinants of Portfolio Performance II: An Update"*
   Financial Analysts Journal, 47(3), 40-48.

3. **Fachler, Nicolas (2007)**
   *"Attribution Analysis in Practice"*
   Wiley Finance.

4. **Bacon, Carl R. (2008)**
   *"Practical Portfolio Performance Measurement and Attribution"*
   Wiley, 2nd Edition.

### Recursos Online

- [CFA Institute - Performance Attribution](https://www.cfainstitute.org/)
- [Investopedia - Attribution Analysis](https://www.investopedia.com/terms/a/attribution-analysis.asp)

---

## 📞 Soporte

Para preguntas o issues relacionados con el módulo de atribución:

- 🐛 GitHub Issues: [github.com/JP-Fernando/global-scanner-pro/issues](https://github.com/JP-Fernando/global-scanner-pro/issues)
- 📖 Documentación completa: [docs/](../docs/)

---

**¡El análisis de atribución te ayuda a entender no solo cuánto ganaste, sino por qué ganaste! 🎯**
