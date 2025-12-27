# 🎯 Global Quant Scanner Pro 0.0.1

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

---

## 💻 Sección Técnica

### Estructura del Proyecto

```
global-scanner-pro/
├── config.js              # Estrategias y benchmarks
├── indicators.js          # Librería de indicadores con validación
├── scoring.js            # Motor de scoring avanzado
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

### Notas de Performance

- **Rate limiting**: 15ms entre requests para evitar bloqueos
- **Cache**: Los benchmarks se cargan una sola vez por escaneo
- **Memoria**: Aproximadamente 50-100MB por universo de 100 activos
- **Performance**: ~2-3 segundos por activo analizado
- **Precisión**: 2 decimales para porcentajes, 1 para scores

### Mejoras vs Versión Anterior

| Característica | v1.0 | v2.0 Pro |
|----------------|------|----------|
| Benchmarking | ❌ | ✅ Alpha vs índice |
| Normalización | Umbrales fijos | Percentiles dinámicos |
| Estrategias | 1 hardcoded | 4 configurables |
| Filtros | Básicos | Avanzados pre-scoring |
| Testing | ❌ | Suite completa |
| Risk metrics | Básico | ATR%, Vol relativa, DD |
| Liquidez | Simple | Multi-período |
| UI | Tabla básica | Modal + tooltips |
| Validación | Mínima | Exhaustiva |
| Modularidad | Todo en 1 file | 6 módulos separados |

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
