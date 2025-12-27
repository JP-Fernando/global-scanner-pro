// =====================================================
// GLOBAL QUANT SCANNER - VERSIÓN PROFESIONAL
// =====================================================

import { STRATEGY_PROFILES, MARKET_BENCHMARKS } from './config.js';
import * as ind from './indicators.js';
import * as scoring from './scoring.js';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));
let currentResults = [];
let benchmarkData = null;

// =====================================================
// CARGA DE DATOS
// =====================================================

async function loadYahooData(ticker, suffix) {
  const fullSymbol = ticker.includes('.') ? ticker : `${ticker}${suffix}`;
  const from = Math.floor((Date.now() / 1000) - (4 * 365.25 * 86400));
  const to = Math.floor(Date.now() / 1000);

  try {
    const res = await fetch(`/api/yahoo?symbol=${fullSymbol}&from=${from}&to=${to}`);
    const json = await res.json();
    if (!json.chart?.result?.[0]) return [];

    const r = json.chart.result[0];
    const q = r.indicators.quote[0];
    const adj = r.indicators.adjclose?.[0]?.adjclose || q.close;

    return r.timestamp.map((t, i) => ({
      timestamp: t,
      close: adj[i],
      volume: q.volume[i],
      high: q.high?.[i] || adj[i],
      low: q.low?.[i] || adj[i]
    })).filter(d => d.close !== null && !isNaN(d.close));
  } catch (e) {
    console.warn(`Error cargando ${fullSymbol}:`, e.message);
    return [];
  }
}

// =====================================================
// ANÁLISIS DE ACTIVO INDIVIDUAL
// =====================================================

async function analyzeStock(stock, suffix, config, benchmarkROCs, benchmarkVol) {
  try {
    const data = await loadYahooData(stock.ticker, suffix);

    if (!data || data.length < config.filters.min_days_history) {
      return { passed: false, reason: 'Historia insuficiente' };
    }

    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const candleData = data.map(d => ({ c: d.close, h: d.high, l: d.low }));

    // Aplicar filtros duros
    const filterResult = scoring.applyHardFilters(candleData, prices, volumes, config.filters);

    if (!filterResult.passed) {
      return {
        passed: false,
        ticker: stock.ticker,
        name: stock.name,
        reason: filterResult.reasons.join('; ')
      };
    }

    // Calcular scores individuales
    const trendResult = scoring.calculateTrendScore(candleData, prices, config.indicators);
    const momentumResult = scoring.calculateMomentumScore(
      prices,
      config.indicators,
      benchmarkROCs?.roc6m,
      benchmarkROCs?.roc12m
    );
    const riskResult = scoring.calculateRiskScore(
      candleData,
      prices,
      config.indicators,
      benchmarkVol
    );
    const liquidityResult = scoring.calculateLiquidityScore(volumes, config.filters);

    // Calcular scores temporales (Corto, Medio, Largo plazo)
    const scoreShort = scoring.calculateShortTermScore(candleData, prices, volumes, config.indicators);
    const scoreMedium = scoring.calculateMediumTermScore(candleData, prices, config.indicators);
    const scoreLong = scoring.calculateLongTermScore(candleData, prices, config.indicators);

    // Score final ponderado
    const finalScore = scoring.calculateFinalScore(
      trendResult.score,
      momentumResult.score,
      riskResult.score,
      liquidityResult.score,
      config.weights
    );

    // Generar señal
    const signal = scoring.generateSignal(finalScore, config.signals);

    // Volumen relativo
    const avgVol = ind.SMA(volumes.slice(-50), 50);
    const vRatio = volumes[volumes.length - 1] / avgVol;

    return {
      passed: true,
      ticker: stock.ticker,
      name: stock.name,
      warnings: filterResult.reasons,
      price: prices[prices.length - 1],
      scoreTotal: finalScore,
      scoreShort,
      scoreMedium,
      scoreLong,
      scoreTrend: Math.round(trendResult.score),
      scoreMomentum: Math.round(momentumResult.score),
      scoreRisk: Math.round(riskResult.score),
      scoreLiquidity: Math.round(liquidityResult.score),
      signal,
      vRatio: vRatio.toFixed(2),
      details: {
        trend: trendResult.details,
        momentum: momentumResult.details,
        risk: riskResult.details,
        liquidity: liquidityResult.details
      }
    };

  } catch (err) {
    console.warn(`Error analizando ${stock.ticker} - ${stock.name}:`, err.message);
    return {
      passed: false,
      ticker: stock.ticker,
      name: stock.name,
      reason: err.message
    };
  }
}

// =====================================================
// CARGA Y ANÁLISIS DEL BENCHMARK
// =====================================================

async function loadBenchmark(suffix) {
  const benchmarkSymbol = MARKET_BENCHMARKS[suffix];

  if (!benchmarkSymbol) {
    console.log('No hay benchmark definido para este mercado');
    return null;
  }

  console.log(`Cargando benchmark: ${benchmarkSymbol}`);
  const data = await loadYahooData(benchmarkSymbol, '');

  if (!data || data.length < 252) {
    console.warn('Datos de benchmark insuficientes');
    return null;
  }

  const prices = data.map(d => d.close);

  try {
    const roc6m = ind.ROC(prices, 126);
    const roc12m = ind.ROC(prices, 252);
    const volatility = ind.Volatility(prices, 252);

    return {
      symbol: benchmarkSymbol,
      rocs: { roc6m, roc12m },
      volatility
    };
  } catch (e) {
    console.warn('Error calculando métricas de benchmark:', e.message);
    return null;
  }
}

// =====================================================
// ESCANEO PRINCIPAL
// =====================================================

// EN: scanner.js

export async function runScan() {
  const [file, suffix] = document.getElementById('marketSelect').value.split('|');
  const strategyKey = document.getElementById('strategySelect').value;
  const config = STRATEGY_PROFILES[strategyKey];

  const status = document.getElementById('status');
  const tbody = document.getElementById('results');
  const filterInfo = document.getElementById('filterInfo');

  // Limpieza inicial
  tbody.innerHTML = '';
  currentResults = [];
  filterInfo.innerHTML = '';

  // 1. Cargar Benchmark
  status.innerText = 'Cargando benchmark...';
  benchmarkData = await loadBenchmark(suffix);

  // 2. Cargar Universo
  status.innerText = 'Cargando universo...';
  const universe = await (await fetch(file)).json();

  let analyzed = 0;
  let filtered = 0;

  // CONFIGURACIÓN DE LOTES (BATCHING)
  const BATCH_SIZE = 5; // Número de peticiones simultáneas

  for (let i = 0; i < universe.length; i += BATCH_SIZE) {
    // Tomar un lote de activos
    const batch = universe.slice(i, i + BATCH_SIZE);

    status.innerText = `Analizando lote ${i + 1} de ${universe.length}... (${analyzed} encontrados)`;

    // Ejecutar análisis en paralelo para este lote
    const batchResults = await Promise.all(batch.map(stock =>
      analyzeStock(stock, suffix, config, benchmarkData?.rocs, benchmarkData?.volatility)
    ));

    // Procesar resultados del lote
    for (const res of batchResults) {
      if (res.passed) {
        currentResults.push(res);
        analyzed++;
      } else {
        filtered++;
      }
    }

    // Actualizar tabla cada 2 lotes para no saturar el DOM
    if (i % (BATCH_SIZE * 2) === 0) {
      renderTable(currentResults);
    }

    // Pequeña pausa para no saturar la API
    await sleep(50);
  }

  // Renderizado final y ordenamiento
  currentResults.sort((a, b) => b.scoreTotal - a.scoreTotal);
  renderTable(currentResults);

  status.innerText = `✅ Escaneo completado. ${analyzed} activos encontrados.`;
  filterInfo.innerHTML = `✅ ${analyzed} aprobados | ❌ ${filtered} filtrados`;
}
// =====================================================
// RENDERIZADO DE TABLA
// =====================================================

function renderTable(data) {
  const tbody = document.getElementById('results');
  const viewKey = document.getElementById('viewMode').value;
  tbody.innerHTML = '';

  data.forEach((r, idx) => {
    const displayScore = r[viewKey] || r.scoreTotal;

    const tr = document.createElement('tr');
    tr.className = 'result-row';
    tr.onclick = () => showDetails(r);

    tr.innerHTML = `
      <td class="rank-cell">${idx + 1}</td>
      <td><strong>${r.ticker}</strong></td>
      <td class="name-cell">${r.name}</td>
      <td>${renderScorePill(displayScore)}</td>
      <td class="volume-cell">x${r.vRatio}</td>
      <td>
        <span class="signal-badge" style="background: ${r.signal.color}20; color: ${r.signal.color}; border: 1px solid ${r.signal.color}">
          ${r.signal.text}
        </span>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${r.signal.confidence}%; background: ${r.signal.color}"></div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderScorePill(score) {
  let color = '#f87171';
  if (score > 75) color = '#10b981';
  else if (score > 60) color = '#4ade80';
  else if (score > 45) color = '#fbbf24';

  return `<span class="score-pill" style="color:${color}; border-color:${color}">${score}</span>`;
}

// =====================================================
// MODAL DE DETALLES
// =====================================================

function showDetails(result) {
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('modalContent');

  const d = result.details;

  content.innerHTML = `
    <h2>${result.ticker} - ${result.name}</h2>

    <div class="detail-section">
      <h3>📊 Scores Principales</h3>
      <div class="score-grid">
        <div>Total: <strong>${result.scoreTotal}</strong></div>
        <div>Trend: <strong>${result.scoreTrend}/100</strong></div>
        <div>Momentum: <strong>${result.scoreMomentum}/100</strong></div>
        <div>Risk: <strong>${result.scoreRisk}/100</strong></div>
        <div>Liquidity: <strong>${result.scoreLiquidity}/100</strong></div>
      </div>
    </div>

    <div class="detail-section">
      <h3>⏱️ Análisis Temporal</h3>
      <div class="score-grid">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
          <div style="font-size: 0.85em; color: #93c5fd; margin-bottom: 5px;">Corto Plazo (6m)</div>
          <strong style="font-size: 1.5em;">${result.scoreShort}</strong>
        </div>
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
          <div style="font-size: 0.85em; color: #c4b5fd; margin-bottom: 5px;">Medio Plazo (18m)</div>
          <strong style="font-size: 1.5em;">${result.scoreMedium}</strong>
        </div>
        <div style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);">
          <div style="font-size: 0.85em; color: #fbcfe8; margin-bottom: 5px;">Largo Plazo (4a)</div>
          <strong style="font-size: 1.5em;">${result.scoreLong}</strong>
        </div>
      </div>
      <p style="margin-top: 10px; font-size: 0.9em; color: #94a3b8;">
        <strong>Interpretación:</strong> Los scores temporales te ayudan a identificar el horizonte óptimo según tu perfil de inversión.
      </p>
    </div>

    <div class="detail-section">
      <h3>📈 Análisis de Tendencia</h3>
      <ul>
        <li>Score posición: <strong>${d.trend.positionScore}</strong></li>
        <li>Score consistencia: <strong>${d.trend.consistencyScore}</strong></li>
        <li>Score ADX: <strong>${d.trend.adxScore}</strong></li>
        <li>EMA50: <strong>${d.trend.ema50}</strong></li>
        <li>EMA200: <strong>${d.trend.ema200}</strong></li>
      </ul>
    </div>

    <div class="detail-section">
      <h3>🚀 Análisis de Momentum</h3>
      <ul>
        <li>ROC 6 meses: <strong>${d.momentum.roc6m}%</strong></li>
        <li>ROC 12 meses: <strong>${d.momentum.roc12m}%</strong></li>
        <li>Alpha 6m: <strong>${d.momentum.alpha6m}%</strong></li>
        <li>Alpha 12m: <strong>${d.momentum.alpha12m}%</strong></li>
        <li>RSI: <strong>${d.momentum.rsi}</strong></li>
      </ul>
    </div>

    <div class="detail-section">
      <h3>⚠️ Análisis de Riesgo</h3>
      <ul>
        <li>ATR%: <strong>${d.risk.atrPct}%</strong></li>
        <li>Volatilidad anual: <strong>${d.risk.volatility}%</strong></li>
        <li>Volatilidad relativa: <strong>${d.risk.relativeVol}</strong></li>
        <li>Max Drawdown 52w: <strong>${d.risk.maxDrawdown}%</strong></li>
      </ul>
    </div>

    <div class="detail-section">
      <h3>💧 Análisis de Liquidez</h3>
      <ul>
        <li>Vol. medio 20d: <strong>${d.liquidity.avgVol20}</strong></li>
        <li>Vol. medio 60d: <strong>${d.liquidity.avgVol60}</strong></li>
        <li>Ratio volumen: <strong>${d.liquidity.volRatio}</strong></li>
      </ul>
    </div>

    <div class="signal-summary" style="background: ${result.signal.color}20; border-left: 4px solid ${result.signal.color}">
      <h3>Señal: ${result.signal.text}</h3>
      <p>Confianza: ${result.signal.confidence}%</p>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('detailModal').style.display = 'none';
}

// =====================================================
// ACTUALIZACIÓN DE VISTA
// =====================================================

export function updateView() {
  const key = document.getElementById('viewMode').value;
  currentResults.sort((a, b) => b[key] - a[key]);
  renderTable(currentResults);
}

// =====================================================
// EXPORTAR FUNCIONES GLOBALES
// =====================================================

window.runScan = runScan;
window.updateView = updateView;
window.closeModal = closeModal;
