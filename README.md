# 🎯 Global Quant Scanner Pro

**Global Quant Scanner Pro** es una herramienta profesional que analiza miles de datos por segundo para encontrar las mejores oportunidades de inversión basándose en algoritmos matemáticos, eliminando el sesgo emocional del trading.

---

## 🚀 Inicio Rápido

### Instalación

```bash
# Instalar dependencias
npm install express node-fetch

# Iniciar servidor
node server.js
```

### Uso Básico

1. Abre la interfaz: `http://localhost:3000/index.html`
2. Selecciona un mercado (España, USA, Alemania, etc.)
3. Elige una estrategia según tu perfil de riesgo
4. Haz clic en "Ejecutar Análisis"
5. Explora los resultados ordenando por diferentes scores
6. **Opcional**: Construye una cartera profesional con los mejores activos
7. Revisa el régimen de mercado detectado automáticamente

---

## 📘 Guía para Principiantes

### ¿Qué es el Score?

El sistema funciona como un **filtro inteligente** que analiza múltiples indicadores técnicos y te da un **Score (0-100)**. Cuanto más alto es el score, mejores son las métricas técnicas de ese activo.

### Conceptos Clave

**Estrategia**: Define cómo se ponderan los diferentes factores (tendencia, momentum, riesgo, liquidez). Es como elegir tu perfil de inversor.

**Vista de Score**: Una vez ejecutado el análisis, puedes ordenar los resultados según tu horizonte temporal:
- **⚡ Corto Plazo (6m)**: Trading de días o semanas
- **📈 Medio Plazo (18m)**: Inversión de varios meses
- **🎯 Largo Plazo (4a)**: Construir cartera a largo plazo
- **📉 Tendencia**: Confirmar que el precio está por encima de su media histórica
- **🚀 Momentum**: Encontrar los "líderes" del mercado (Alpha positivo)

### Métricas Principales

- **Alpha**: Ventaja del activo frente a su mercado. Si el IBEX sube 5% y tu acción 8%, tu Alpha es +3%
- **Max Drawdown**: La caída máxima que ha sufrido el valor en el último año. Valores > 50% indican alto riesgo
- **ATR% (Riesgo)**: Cuánto "salta" el precio cada día. Bajo = estabilidad, Alto = volatilidad
- **Volumen Ratio**: Si es > 1, se está negociando más de lo habitual (dinero institucional entrando)

### Construcción de Cartera y Análisis de Riesgo

Una vez ejecutado el análisis, el sistema te permite **construir carteras profesionales** automáticamente:

- **Asignación de Capital**: 5 métodos diferentes (Equal Weight, Score-Weighted, ERC, Volatility Targeting, Hybrid)
- **Análisis de Riesgo**: Value at Risk (VaR), matriz de correlaciones, stress testing
- **Recomendaciones de Capital**: Calcula automáticamente cuánto invertir en cada activo según tu capital total

### Régimen de Mercado

El sistema detecta automáticamente el **régimen de mercado actual** (Risk-On, Neutral, Risk-Off) analizando:
- Tendencia del índice de referencia (vs EMA200)
- Volatilidad reciente vs histórica
- Momentum del mercado
- Amplitud de mercado (% de activos alcistas)

Esto permite **ajustar automáticamente** tu estrategia según las condiciones del mercado.

---

## 🎯 Estrategias Disponibles

Cada estrategia pondera los indicadores de forma distinta según tu objetivo:

### 1. Momentum Agresivo
- **Pesos**: Momentum 45%, Trend 25%, Risk 15%, Liquidity 15%
- **Filtros**: ATR < 8%, Volumen > 50k
- **Ideal para**: Trading activo, rotación rápida, periodos cortos (días o semanas)
- **Riesgo**: Alto (mayor volatilidad)

### 2. Trend-Following Conservador
- **Pesos**: Trend 45%, Momentum 20%, Risk 25%, Liquidity 10%
- **Filtros**: ATR < 5%, Volumen > 30k, Drawdown < 35%
- **Ideal para**: Inversión a largo plazo, menor volatilidad, dormir tranquilo
- **Riesgo**: Bajo

### 3. Equilibrado
- **Pesos**: Trend 30%, Momentum 30%, Risk 25%, Liquidity 15%
- **Filtros**: ATR < 6.5%, Volumen > 40k
- **Ideal para**: Balance entre crecimiento y estabilidad
- **Riesgo**: Moderado

### 4. Rotación Sectorial
- **Pesos**: Momentum 40%, Trend 20%, Risk 20%, Liquidity 20%
- **Filtros**: ATR < 7%, Volumen > 100k
- **Ideal para**: Rotación entre sectores, alta liquidez
- **Riesgo**: Moderado-Alto

---

## 🛠️ Cómo Combinar Estrategia + Vista

El secreto de los profesionales es la **convergencia**: busca activos que puntúen alto en varias métricas a la vez.

### Ejemplos Prácticos

**Para Inversión Segura**:
- Estrategia: `Trend Conservador`
- Ordenar por: `Largo Plazo`
- Buscar: Señal "COMPRA FUERTE" (Score > 80)

**Para Trading Explosivo**:
- Estrategia: `Momentum Agresivo`
- Ordenar por: `Corto Plazo`
- Cuidado: Estos activos suelen tener `Risk Score` más alto

**Para Rotación de Carteras**:
- Estrategia: `Rotación Sectorial`
- Ordenar por: `Momentum`
- Objetivo: Estar donde está el dinero "caliente" del mercado

---

## 🚦 Interpretación de Señales

El sistema genera una señal automática basada en el score total:

| Señal | Score | Confianza | Descripción |
|-------|-------|-----------|-------------|
| 🟢 **COMPRA FUERTE** | > 80 | 95% | Alineación total de tendencia, momentum y volumen. Confianza estadística muy alta. |
| 🟢 **COMPRA** | 65-80 | 75% | Buen momento de entrada, aunque con algo más de volatilidad. |
| 🟡 **MANTENER+** | 50-65 | 55% | Tendencia neutral-positiva, momentum moderado. Si ya lo tienes, consérvalo. |
| 🟡 **MANTENER** | 40-50 | 40% | Sin tendencia clara. Espera a mejores métricas antes de entrar. |
| 🔴 **VENTA** | < 40 | 25% | El sistema detecta debilidad estructural o riesgo excesivo. Evitar. |

---

## 💼 Construcción de Cartera

Después de ejecutar el análisis, puedes construir una cartera profesional con los mejores activos encontrados.

### Métodos de Asignación

El sistema ofrece 5 métodos diferentes para distribuir tu capital:

**1. Equal Weight (Peso Igual)**
- Cada activo recibe el mismo porcentaje de capital
- **Ideal para**: Principiantes, máxima diversificación simple
- **Riesgo**: Bajo

**2. Score-Weighted (Ponderado por Score)**
- Los activos con mejor Quant Score reciben más capital
- **Ideal para**: Confiar en la calidad de las señales del sistema
- **Riesgo**: Medio

**3. Equal Risk Contribution (ERC)**
- Cada activo contribuye igual al riesgo total de la cartera
- **Ideal para**: Controlar el riesgo de manera equilibrada
- **Riesgo**: Medio-Bajo

**4. Volatility Targeting**
- Ajusta los pesos para alcanzar una volatilidad objetivo (15% por defecto)
- **Ideal para**: Controlar la volatilidad de la cartera
- **Riesgo**: Configurable

**5. Hybrid (ERC + Score)** ⭐ **Recomendado**
- Combina diversificación por riesgo con calidad de señales
- **Ideal para**: Balance óptimo entre diversificación y rendimiento
- **Riesgo**: Medio

### Cómo Usar

1. Ejecuta el análisis de mercado
2. En la sección "💼 Construcción de Cartera":
   - Selecciona el método de asignación
   - Indica cuántos activos quieres (Top N)
   - Introduce tu capital total
3. Haz clic en "Construir Cartera"
4. El sistema generará:
   - Asignación de capital por activo (€ y %)
   - Análisis completo de riesgo
   - Matriz de correlaciones
   - Stress tests con diferentes escenarios
   - Validación de cumplimiento de reglas de gobernanza

---

## 🌍 Detector de Régimen de Mercado

El sistema analiza automáticamente las condiciones del mercado y detecta el régimen actual para ajustar tu estrategia.

### Regímenes Detectados

**🟢 Risk-On (Mercado Alcista)**
- Mercado en tendencia alcista, baja volatilidad
- **Ajuste automático**: Aumenta peso de momentum, reduce restricciones por riesgo
- **Ideal para**: Estrategias agresivas, crecimiento

**🟡 Neutral (Mercado Lateral)**
- Sin tendencia clara, volatilidad normal
- **Ajuste automático**: Pesos equilibrados, estrategia estándar
- **Ideal para**: Estrategias balanceadas

**🔴 Risk-Off (Mercado Defensivo)**
- Mercado bajista o alta volatilidad
- **Ajuste automático**: Reduce momentum, aumenta restricciones por riesgo
- **Ideal para**: Protección de capital, activos defensivos

### Cómo Funciona

El sistema analiza:
1. **Benchmark (Índice de referencia)**: Tendencia, volatilidad, momentum
2. **Amplitud de Mercado**: Porcentaje de activos con tendencia alcista
3. **Confianza**: Nivel de certeza en la clasificación (0-100%)

### Uso en Construcción de Cartera

Cuando construyes una cartera, puedes activar el ajuste por régimen:
- El sistema ajustará automáticamente los scores de los activos
- Re-ordenará los activos según el régimen detectado
- Priorizará activos más adecuados para las condiciones actuales

---

## ⚖️ Reglas y Gobernanza de Inversión

El sistema incluye un módulo de **gobernanza y cumplimiento** que garantiza que las carteras construidas cumplan con buenas prácticas de inversión profesional.

### Reglas de Inversión

El sistema aplica automáticamente las siguientes reglas para proteger tu capital:

**Límites de Concentración**
- **Máximo por activo**: 15% del capital total
- **Máximo por sector**: 30% del capital total (si se implementa análisis sectorial)
- **Máximo por país**: 40% del capital total
- **Concentración Top 3**: Los 3 activos más grandes no pueden sumar más del 40%

**Control de Liquidez**
- **Volumen diario mínimo**: 50,000 unidades negociadas
- Excluye automáticamente activos con liquidez insuficiente

**Control de Riesgo**
- **Correlación máxima entre pares**: No permite dos activos con correlación > 0.85
- **Volatilidad máxima de cartera**: 25% anual
- **Drawdown máximo estimado**: 35%
- **Exclusión de activos de alto riesgo**: Elimina automáticamente activos con volatilidad > 50%

**Rebalanceo**
- **Umbral de rebalanceo**: Si un activo se desvía más del 5% de su peso objetivo, se recomienda rebalancear

### Perfiles de Riesgo

El sistema define 3 perfiles de riesgo que ajustan las reglas según tu tolerancia:

**🛡️ Conservador**
- Peso máximo por activo: 10%
- Volatilidad máxima: 15%
- Drawdown máximo: 20%
- Score mínimo requerido: 70
- **Ideal para**: Inversores cerca de jubilación, baja tolerancia al riesgo

**⚖️ Moderado**
- Peso máximo por activo: 15%
- Volatilidad máxima: 20%
- Drawdown máximo: 30%
- Score mínimo requerido: 60
- **Ideal para**: Horizonte medio (5-10 años)

**🚀 Agresivo**
- Peso máximo por activo: 20%
- Volatilidad máxima: 30%
- Drawdown máximo: 45%
- Score mínimo requerido: 50
- **Ideal para**: Inversores jóvenes con horizonte largo (10+ años)

### Validación y Correcciones Automáticas

Cuando construyes una cartera, el sistema:
1. **Valida el cumplimiento** de todas las reglas aplicables
2. **Genera alertas** si hay violaciones o advertencias
3. **Aplica correcciones automáticas** (si se habilita):
   - Reduce pesos que exceden el máximo
   - Elimina activos por debajo del mínimo (2%)
   - Re-normaliza los pesos para sumar 100%

### Documentación de Estrategias

Cada estrategia incluye documentación detallada con:
- **Objetivo**: Qué busca lograr la estrategia
- **Horizonte temporal**: Período recomendado de inversión
- **Rendimiento esperado**: Rango de retornos anuales
- **Volatilidad esperada**: Rango de volatilidad
- **Max Drawdown**: Pérdida máxima esperada
- **Perfil de inversor**: Para quién es adecuada
- **Condiciones ideales**: Cuándo funciona mejor
- **Riesgos identificados**: Qué puede salir mal

---

## 📊 Mercados Disponibles

### Europa
- España (IBEX 35)
- Francia (CAC 40)
- Alemania (DAX)
- Reino Unido (FTSE 100)
- Italia (FTSEMIB)

### América
- USA (S&P 500)
- Brasil (Bovespa)
- México (IPC)
- Canadá (TSX)

### Asia
- Japón (Nikkei)
- Hong Kong (Hang Seng)
- Shanghai (SSE)
- Shenzhen (SZSE)
- Corea (KOSPI)

---

## 🎨 Características de la Interfaz

- **Design moderno**: Gradientes, sombras, animaciones suaves
- **Responsive**: Adaptable a móvil, tablet y desktop
- **Color coding**: Visual claro para señales y scores
- **Modal detallado**: Breakdown completo de análisis al hacer clic en una fila
- **Barras de confianza**: Indicador visual de certeza
- **Tabla ordenable**: Por Total, Corto, Medio, Largo, Trend, Momentum, Risk, Liquidity
- **Constructor de cartera**: Asignación automática con 5 métodos diferentes
- **Dashboard de riesgo**: VaR, matriz de correlaciones, stress tests visuales
- **Indicador de régimen**: Detección y visualización del régimen de mercado actual
- **Validación de gobernanza**: Verificación automática de cumplimiento de reglas de inversión

---

## 💻 Sección Técnica

### Estructura del Proyecto

```
global-scanner-pro/
├── config.js              # Estrategias y benchmarks
├── indicators.js          # Librería de indicadores con validación
├── scoring.js            # Motor de scoring avanzado
├── allocation.js         # Sistema de asignación de capital
├── risk_engine.js        # Motor de análisis de riesgo profesional
├── market_regime.js      # Detector de regímenes de mercado
├── governance.js         # Reglas y gobernanza de inversión
├── tests.js              # Suite de testing
├── scanner.js            # Scanner principal
├── index.html            # Interfaz profesional
├── server.js             # Servidor Express
└── universes/            # Archivos JSON de universos
    ├── bme_universe.json
    ├── us_universe.json
    └── ...
```

### Sistema de Scoring

#### Scores Temporales (Multi-Horizonte)

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

#### Scores Factoriales

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

### Mejoras Cuantitativas

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

### Indicadores Técnicos Implementados

- **EMAs**: 20, 50, 200 con warm-up configurable
- **RSI**: Período ajustable (default 14)
- **ATR**: Como valor absoluto y porcentaje del precio
- **Bollinger Bands**: Bandas + bandwidth + %B
- **ADX**: Fuerza direccional
- **Williams %R**: Oscilador de momentum
- **ROC**: Rate of Change 6m/12m
- **Volatilidad**: Anualizada basada en log-returns
- **Max Drawdown**: Caída máxima desde máximo

### Benchmarks por Mercado

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

### Validación y Testing

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

### Personalización de Estrategias

Para crear tu propia estrategia, edita `config.js` añadiendo un nuevo perfil en `STRATEGY_PROFILES`:

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

### Sistema de Asignación de Capital

El módulo `allocation.js` implementa 5 métodos profesionales de asignación:

#### Métodos Disponibles

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

#### Métricas de Riesgo de Cartera

- **Volatilidad de Cartera**: Calculada con correlación promedio (0.3)
- **Ratio de Diversificación**: `weighted_avg_vol / portfolio_vol`
- **Número Efectivo de Activos**: `1 / sum(weight²)` (Índice Herfindahl)
- **Max Drawdown Estimado**: Promedio ponderado de drawdowns individuales

### Motor de Análisis de Riesgo Profesional

El módulo `risk_engine.js` proporciona análisis cuantitativo avanzado:

#### Value at Risk (VaR)

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

#### Matriz de Correlaciones

- **Cálculo**: Correlación de Pearson entre retornos logarítmicos
- **Estadísticas**:
  - Correlación promedio
  - Correlación máxima/mínima
  - Número de pares altamente correlacionados (>0.7)
- **Visualización**: Heatmap en la interfaz
- **Uso**: Identificar activos con riesgo concentrado

#### Stress Testing

Escenarios predefinidos:
- **Corrección Menor**: -5% (caída mensual típica)
- **Corrección Moderada**: -10% (corrección trimestral)
- **Crash de Mercado**: -20% (tipo COVID-19 Mar 2020)
- **Crisis Sistémica**: -40% (tipo 2008)

Método:
- Beta proxy: `asset_vol / market_vol`
- Ajuste por calidad: Activos con score >70 resisten mejor
- Resultado: Pérdida estimada por escenario en € y %

#### Conditional VaR (CVaR)

También conocido como Expected Shortfall:
- **Definición**: Pérdida promedio en el peor X% de casos
- **Ventaja**: Captura mejor las colas de la distribución
- **Uso**: Complementa VaR para entender pérdidas extremas

#### Ratios de Rendimiento Ajustados por Riesgo

**Sharpe Ratio**
- Fórmula: `(Return - RiskFree) / Volatility`
- Interpretación: Retorno por unidad de riesgo total

**Sortino Ratio**
- Fórmula: `(Return - RiskFree) / Downside_Volatility`
- Ventaja: Solo penaliza volatilidad a la baja

**Calmar Ratio**
- Fórmula: `Annual_Return / Max_Drawdown`
- Interpretación: Retorno por unidad de drawdown máximo

### Detector de Regímenes de Mercado

El módulo `market_regime.js` clasifica automáticamente las condiciones del mercado:

#### Análisis de Benchmark

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

#### Análisis de Amplitud (Market Breadth)

- Métrica: Porcentaje de activos con precio > EMA50
- Fuerte: >60% activos alcistas (confirmación Risk-On)
- Débil: <40% activos alcistas (confirmación Risk-Off)
- Normal: 40-60%

#### Ajustes de Estrategia por Régimen

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

#### Confianza del Régimen

- **Alta** (>80%): Señales convergentes entre benchmark y amplitud
- **Media** (60-80%): Señales consistentes pero no todas alineadas
- **Baja** (<60%): Divergencias o datos insuficientes

### Sistema de Gobernanza y Cumplimiento

El módulo `governance.js` implementa reglas profesionales de inversión y validación de cumplimiento:

#### Reglas de Inversión (INVESTMENT_RULES)

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

#### Perfiles de Riesgo (RISK_PROFILES)

Tres perfiles predefinidos que ajustan las reglas base:
- **conservative**: Pesos más bajos, volatilidad máxima 15%, drawdown máximo 20%
- **moderate**: Pesos estándar, volatilidad máxima 20%, drawdown máximo 30%
- **aggressive**: Pesos más altos, volatilidad máxima 30%, drawdown máximo 45%

#### Validación de Cumplimiento (validateCompliance)

Función que valida una cartera contra las reglas:
- Retorna `violations` (críticas) y `warnings` (advertencias)
- Tipos de validación:
  - Concentración por activo (máximo/mínimo)
  - Concentración top 3
  - Volatilidad de cartera
  - Liquidez individual
  - Activos de alto riesgo

#### Correcciones Automáticas (applyComplianceCorrections)

Función que aplica correcciones automáticas:
- Reduce pesos que exceden el máximo
- Elimina activos por debajo del mínimo
- Re-normaliza pesos para sumar 100%

#### Documentación de Estrategias (STRATEGY_DOCUMENTATION)

Cada estrategia incluye documentación completa:
- Objetivo, horizonte, rendimiento esperado
- Volatilidad y drawdown esperados
- Perfil de inversor, condiciones ideales
- Características y riesgos identificados

#### Generación de Reportes (generateGovernanceReport)

Combina validación de cumplimiento con documentación de estrategia para generar reportes completos de gobernanza.

### Notas de Performance

- **Rate limiting**: 15ms entre requests para evitar bloqueos
- **Cache**: Los benchmarks se cargan una sola vez por escaneo
- **Memoria**: Aproximadamente 50-100MB por universo de 100 activos
- **Performance**: ~2-3 segundos por activo analizado
- **Precisión**: 2 decimales para porcentajes, 1 para scores

### Próximas Mejoras

- [ ] Análisis sectorial automático
- [ ] Backtesting de estrategias
- [ ] Exportación a Excel/CSV
- [ ] Alertas por email/webhook
- [ ] Machine Learning para ponderación dinámica
- [ ] Integración con más fuentes de datos
- [ ] Dashboard de portfolio tracking

---

## 📄 Licencia

MIT License - Uso libre para fines educativos y comerciales.

---

## ⚠️ Descargo de Responsabilidad (Disclaimer)

Este software ha sido desarrollado con fines **estrictamente educativos y de entretenimiento personal**.

* **No es asesoramiento financiero:** Las señales, scores y carteras generadas son resultado de cálculos matemáticos basados en datos históricos y no constituyen una recomendación de inversión.
* **Riesgo de pérdida:** El trading y la inversión en mercados financieros conllevan un riesgo significativo de pérdida de capital.
* **Sin Garantías:** El autor no se hace responsable de la exactitud de los datos proporcionados por terceros (como Yahoo Finance) ni de las decisiones financieras tomadas por los usuarios del software.

**Invierte solo el capital que estés dispuesto a perder.**

---

**Desarrollado con ❤️ para traders cuantitativos profesionales**
