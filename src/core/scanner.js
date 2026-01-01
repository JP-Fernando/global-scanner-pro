// =====================================================
// GLOBAL QUANT SCANNER - VERSIÓN PROFESIONAL
// =====================================================

import { STRATEGY_PROFILES, MARKET_BENCHMARKS } from './config.js';
import * as ind from '../indicators/indicators.js';
import * as scoring from '../indicators/scoring.js';
import * as allocation from '../allocation/allocation.js';
import * as risk from '../analytics/risk_engine.js';
import * as regime from '../analytics/market_regime.js';
import * as governance from '../analytics/governance.js';
import * as backtesting from '../analytics/backtesting.js';
import { SECTOR_TAXONOMY, getSectorId, calculateSectorStats } from '../data/sectors.js';
import { detectAnomalies } from '../data/anomalies.js';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));
let currentResults = [];
let benchmarkData = null;
let currentRegime = null;
let lastBacktestResults = [];
const dataCache = new Map();
let isScanning = false; // Bandera de control

const appState = {
  scanResults: [],
  portfolio: null,
  market: null,
  strategy: null
};


const SECTOR_COLORS = {
  100: '#ef4444', // Energy
  200: '#94a3b8', // Materials
  300: '#fbbf24', // Industrials
  400: '#f472b6', // Consumer Discretionary
  500: '#10b981', // Consumer Staples
  600: '#22d3ee', // Health Care
  700: '#fb923c', // Financials
  800: '#818cf8', // IT
  900: '#a855f7', // Communication
  1000: '#facc15', // Utilities
  1100: '#4ade80', // Real Estate
  999: '#475569'   // Unknown
};

const ANOMALY_THEME = {
  CRITICAL_PUMP_RISK: { color: '#ef4444', label: '🚀 PUMP', bg: '#450a0a' },
  HIGH_VOLUME_SPIKE: { color: '#fbbf24', label: '📊 VOL+', bg: '#451a03' },
  CRITICAL_DUMP_RISK: { color: '#f87171', label: '📉 DUMP', bg: '#450a0a' }
};


const SECTOR_NAMES = SECTOR_TAXONOMY.reduce((acc, sector) => {
  acc[sector.sectorId] = sector.name;
  return acc;
}, { 999: 'Otros' }); // Añadimos el default

// =====================================================
// CARGA DE DATOS
// =====================================================


async function loadYahooData(ticker, suffix) {
  const fullSymbol = ticker.includes('.') ? ticker : `${ticker}${suffix}`;
  const from = Math.floor((Date.now() / 1000) - (4 * 365.25 * 86400));
  const to = Math.floor(Date.now() / 1000);

  if (dataCache.has(fullSymbol)) {
    return dataCache.get(fullSymbol);
  }

  try {
    const res = await fetch(`/api/yahoo?symbol=${fullSymbol}&from=${from}&to=${to}`);
    const json = await res.json();
    if (!json.chart?.result?.[0]) return [];

    const r = json.chart.result[0];
    const q = r.indicators.quote[0];
    const adj = r.indicators.adjclose?.[0]?.adjclose || q.close;

    const series = r.timestamp.map((t, i) => {
      if (adj[i] == null || isNaN(adj[i])) return null;

      return {
        date: new Date(t * 1000).toISOString().split('T')[0], // YYYY-MM-DD
        close: adj[i],
        volume: q.volume?.[i] ?? 0,
        high: q.high?.[i] ?? adj[i],
        low: q.low?.[i] ?? adj[i]
      };
    }).filter(Boolean);
    dataCache.set(fullSymbol, series);
    return series;
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

    const prices = data.map(d => d.close); // indicadores
    const pricesWithDates = data.map(d => ({
      date: d.date,
      close: d.close
    }));
    const volumes = data.map(d => d.volume);
    const candleData = data.map(d => ({ c: d.close, h: d.high, l: d.low }));

    const filterResult = scoring.applyHardFilters(candleData, prices, volumes, config.filters);

    if (!filterResult.passed) {
      return {
        passed: false,
        ticker: stock.ticker,
        name: stock.name,
        reason: filterResult.reasons.join('; ')
      };
    }

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

    const scoreShort = scoring.calculateShortTermScore(candleData, prices, volumes, config.indicators);
    const scoreMedium = scoring.calculateMediumTermScore(candleData, prices, config.indicators);
    const scoreLong = scoring.calculateLongTermScore(candleData, prices, config.indicators);

    const finalScore = scoring.calculateFinalScore(
      trendResult.score,
      momentumResult.score,
      riskResult.score,
      liquidityResult.score,
      config.weights
    );

    const signal = scoring.generateSignal(finalScore, config.signals);

    const avgVol = ind.SMA(volumes.slice(-50), 50);
    const vRatio = volumes[volumes.length - 1] / avgVol;

    return {
      passed: true,
      ticker: stock.ticker,
      name: stock.name,
      prices,
      pricesWithDates,
      prices: prices[prices.length - 1],
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
      vRatio: vRatio,
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
      volatility,
      prices
    };
  } catch (e) {
    console.warn('Error calculando métricas de benchmark:', e.message);
    return null;
  }
}

function getRSIDescription(rsi) {
  if (rsi >= 70) return { text: 'Sobrecompra: Riesgo de corrección', color: '#f87171', icon: '⚠️' };
  if (rsi >= 60) return { text: 'Tendencia Alcista Saludable', color: '#fbbf24', icon: '📈' };
  if (rsi <= 30) return { text: 'Sobreventa: Posible rebote', color: '#4ade80', icon: '🎯' };
  if (rsi <= 40) return { text: 'Debilidad: Interés comprador bajo', color: '#60a5fa', icon: '📉' };
  return { text: 'Régimen Neutral / Consolidación', color: '#94a3b8', icon: '⚖️' };
}

function updateSectorUI(sectorStats) {
  const container = document.getElementById('sectorSummary');
  if (!container) return;

  // Limpiamos y generamos tarjetas
  container.innerHTML = Object.entries(sectorStats).map(([id, stat]) => {
    const dotColor = SECTOR_COLORS[id] || SECTOR_COLORS[999];
    const sectorName = SECTOR_NAMES[id] || `Sector ${id}`;
    const rsiInfo = getRSIDescription(stat.avgRsi);

    return `
      <div style="background:#1e293b; padding:15px; border-radius:12px; border-left: 5px solid ${dotColor}; border: 1px solid #334155; transition: transform 0.2s;">
        <div style="color:#94a3b8; font-size:0.7em; text-transform:uppercase; font-weight:800; letter-spacing:1px; margin-bottom:8px;">
          ${sectorName}
        </div>

        <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:4px;">
          <span style="font-size:1.4em; font-weight:bold; color:#f8fafc;">${stat.avgRsi.toFixed(1)}</span>
          <span style="color:#64748b; font-size:0.8em;">RSI Avg</span>
        </div>

        <div style="color:${rsiInfo.color}; font-size:0.85em; font-weight: 600; display:flex; align-items:center; gap:5px;">
          ${rsiInfo.icon} ${rsiInfo.text}
        </div>

        <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#475569; font-size:0.75em;">${stat.count} activos</span>
          <div style="width:40px; height:4px; background:#334155; border-radius:2px;">
             <div style="width:${stat.avgRsi}%; height:100%; background:${dotColor}; border-radius:2px;"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}


// =====================================================
// BACKTESTING DE ESTRATEGIAS
// =====================================================

async function loadUniverseData(file, suffix, statusNode) {
  if (statusNode) {
    statusNode.innerText = '📦 Cargando universo para backtesting...';
  }

  const universe = await (await fetch(file)).json();
  const results = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < universe.length; i += BATCH_SIZE) {
    const batch = universe.slice(i, i + BATCH_SIZE);

    if (statusNode) {
      statusNode.innerText = `🔎 Descargando históricos ${i + 1}–${Math.min(i + BATCH_SIZE, universe.length)} de ${universe.length}`;
    }

    const batchResults = await Promise.all(
      batch.map(async stock => ({
        ticker: stock.ticker,
        name: stock.name,
        data: await loadYahooData(stock.ticker, suffix)
      }))
    );

    batchResults.forEach(item => {
      if (item.data && item.data.length > 0) {
        results.push(item);
      }
    });

    await sleep(40);
  }

  return results;
}

function formatPct(value, { showSign = true } = {}) {
  if (!Number.isFinite(value)) return 'N/A';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatNumber(value, decimals = 2) {
  if (!Number.isFinite(value)) return 'N/A';
  return value.toFixed(decimals);
}

function getMetricColor(value, thresholds) {
  if (value >= thresholds.excellent) return '#10b981';
  if (value >= thresholds.good) return '#4ade80';
  if (value >= thresholds.poor) return '#fbbf24';
  return '#f87171';
}

function toggleSection(sectionId, el) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const isHidden = section.style.display === 'none';
  section.style.display = isHidden ? 'block' : 'none';

  // Si se pasa el elemento botón, alternamos la clase active
  if (el) {
    if (isHidden) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }
}

function exportBacktestToCSV(results = lastBacktestResults) {
  if (!results?.length) return;
  const headers = ['Estrategia', 'CAGR', 'Sharpe', 'Max DD', 'Win Rate', 'Alpha', 'Beta'];
  const rows = results.map(result => [
    result.strategyName,
    result.metrics?.cagr ?? '',
    result.metrics?.sharpeRatio ?? '',
    result.metrics?.maxDrawdown ?? '',
    result.metrics?.winRate ?? '',
    result.metrics?.alpha ?? '',
    result.metrics?.beta ?? ''
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backtest_results.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function renderBacktestActions() {
  // Añadimos la clase 'active' por defecto porque las secciones se muestran al cargar
  return `
    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; align-items: center;">
      <button class="backtest-action active" onclick="toggleSection('backtest-performance', this)">🏆 Rendimiento</button>
      <button class="backtest-action active" onclick="toggleSection('backtest-detailed', this)">📊 Detalle</button>
      <button class="backtest-action active" onclick="toggleSection('backtest-risk', this)">⚠️ Riesgo</button>
      <button class="backtest-action active" onclick="toggleSection('backtest-trading', this)">💰 Trading</button>
      <button class="backtest-action active" onclick="toggleSection('backtest-equity', this)">📈 Equity</button>
      <button class="backtest-action active" onclick="toggleSection('backtest-drawdown', this)">📉 Drawdown</button>
      <button class="backtest-action" onclick="exportBacktestToCSV()">
      ⬇️ Exportar CSV
      </button>
    </div>
  `;
}

function renderBacktestResults(results, rebalanceEvery, benchmarkReturns = null) {
  const container = document.getElementById('backtestResults');
  if (!container) return;

  const validResults = results.filter(r => r.metrics);
  validResults.sort((a, b) => (b.metrics.sharpeRatio ?? 0) - (a.metrics.sharpeRatio ?? 0));

  if (!validResults.length) {
    container.innerHTML = `
      <div style="background: #1e293b; padding: 20px; border-radius: 10px; color: #fbbf24;">
        No hay resultados suficientes para mostrar el backtest.
      </div>
    `;
    container.style.display = 'block';
    return;
  }

  lastBacktestResults = validResults;

  const bestStrategy = validResults[0];
  const benchmarkData = bestStrategy?.benchmarkReturns || benchmarkReturns;

  container.innerHTML = `
    ${renderBacktestActions()}
    ${renderBacktestHeader(validResults, rebalanceEvery)}
    <div id="backtest-performance">
      ${renderPerformanceComparison(validResults)}
    </div>
    <div id="backtest-detailed">
      ${renderDetailedMetrics(validResults)}
    </div>
    <div id="backtest-risk">
      ${renderRiskMetrics(validResults)}
    </div>
    <div id="backtest-trading">
      ${renderTradingMetrics(validResults)}
    </div>
    <div id="backtest-equity">
      ${renderEquityCurveChart(bestStrategy, benchmarkData)}
    </div>
    <div id="backtest-drawdown">
      ${renderDrawdownAnalysis(validResults)}
    </div>
  `;

  container.style.display = 'block';
}

function renderBacktestHeader(results, rebalanceEvery) {
  const avgSharpe = results.reduce((sum, r) => sum + (r.metrics?.sharpeRatio || 0), 0) / results.length;
  const avgCAGR = results.reduce((sum, r) => sum + (r.metrics?.cagr || 0), 0) / results.length;

  return `
    <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #6366f1;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
        <div>
          <h3 style="color: #c7d2fe; font-size: 1.5em; margin-bottom: 10px;">📈 Resultados del Backtesting</h3>
          <p style="color: #94a3b8; font-size: 0.9em;">
            Rebalanceo cada ${rebalanceEvery} días · ${results.length} estrategias evaluadas
          </p>
        </div>
        <div style="text-align: right;">
          <div style="color: #94a3b8; font-size: 0.85em; margin-bottom: 5px;">Sharpe Ratio Promedio</div>
          <div style="color: #10b981; font-size: 2em; font-weight: bold;">${formatNumber(avgSharpe)}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
        <div style="background: #0f172a; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 5px;">CAGR Promedio</div>
          <div style="color: #38bdf8; font-size: 1.3em; font-weight: bold;">${formatPct(avgCAGR, { showSign: true })}</div>
        </div>
        <div style="background: #0f172a; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 5px;">Mejor Estrategia</div>
          <div style="color: #10b981; font-size: 1.1em; font-weight: bold;">${results[0]?.strategyName || 'N/A'}</div>
        </div>
        <div style="background: #0f172a; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 5px;">Rebalances Totales</div>
          <div style="color: #818cf8; font-size: 1.3em; font-weight: bold;">${results[0]?.sample || 0}</div>
        </div>
      </div>
    </div>
  `;
}

function renderPerformanceComparison(results) {
  return `
    <div style="background: #1e293b; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
      <h4 style="color: #c7d2fe; margin-bottom: 20px; font-size: 1.2em;">🏆 Comparativa de Rendimiento</h4>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #334155;">
              <th style="padding: 12px; text-align: left; color: #94a3b8; font-size: 0.85em; text-transform: uppercase;">Estrategia</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Ret. Total</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">CAGR</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Sharpe</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Calmar</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Max DD</th>
            </tr>
          </thead>
          <tbody>
            ${results.map((result, idx) => {
              const m = result.metrics;
              const sharpeColor = getMetricColor(m.sharpeRatio, { excellent: 1.5, good: 1.0, poor: 0.5 });
              const calmarColor = getMetricColor(m.calmarRatio, { excellent: 1.0, good: 0.5, poor: 0.2 });
              const isTop = idx === 0;

              return `
                <tr style="border-bottom: 1px solid #334155; ${isTop ? 'background: rgba(16, 185, 129, 0.05);' : ''}">
                  <td style="padding: 12px; color: #f8fafc; font-weight: ${isTop ? 'bold' : 'normal'};">
                    ${isTop ? '👑 ' : ''}${result.strategyName}
                  </td>
                  <td style="padding: 12px; text-align: center; color: ${m.totalReturn >= 0 ? '#10b981' : '#f87171'}; font-weight: bold;">
                    ${formatPct(m.totalReturn, { showSign: true })}
                  </td>
                  <td style="padding: 12px; text-align: center; color: ${m.cagr >= 0 ? '#10b981' : '#f87171'}; font-weight: bold;">
                    ${formatPct(m.cagr, { showSign: true })}
                  </td>
                  <td style="padding: 12px; text-align: center;">
                    <span style="background: ${sharpeColor}20; color: ${sharpeColor}; padding: 4px 12px; border-radius: 12px; font-weight: bold;">
                      ${formatNumber(m.sharpeRatio)}
                    </span>
                  </td>
                  <td style="padding: 12px; text-align: center;">
                    <span style="background: ${calmarColor}20; color: ${calmarColor}; padding: 4px 12px; border-radius: 12px; font-weight: bold;">
                      ${formatNumber(m.calmarRatio)}
                    </span>
                  </td>
                  <td style="padding: 12px; text-align: center; color: #f87171; font-weight: bold;">
                    ${formatPct(m.maxDrawdown, { showSign: false })}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDetailedMetrics(results) {
  return `
    <div style="background: #1e293b; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
      <h4 style="color: #c7d2fe; margin-bottom: 20px; font-size: 1.2em;">📊 Métricas Detalladas</h4>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
        ${results.map(result => {
          const m = result.metrics;
          return `
            <div style="background: #0f172a; padding: 20px; border-radius: 8px; border: 1px solid #334155;">
              <h5 style="color: #38bdf8; margin-bottom: 15px; font-size: 1em; border-bottom: 2px solid #334155; padding-bottom: 10px;">
                ${result.strategyName}
              </h5>

              <div style="display: grid; gap: 10px; font-size: 0.9em;">
                <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                  <span style="color: #94a3b8;">Volatilidad:</span>
                  <span style="color: #fbbf24; font-weight: bold;">${formatPct(m.volatility, { showSign: false })}</span>
                </div>

                <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                  <span style="color: #94a3b8;">Alpha:</span>
                  <span style="color: ${m.alpha >= 0 ? '#10b981' : '#f87171'}; font-weight: bold;">${formatPct(m.alpha, { showSign: true })}</span>
                </div>

                <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                  <span style="color: #94a3b8;">Beta:</span>
                  <span style="color: #818cf8; font-weight: bold;">${formatNumber(m.beta)}</span>
                </div>

                <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                  <span style="color: #94a3b8;">Info Ratio:</span>
                  <span style="color: ${m.informationRatio >= 0.5 ? '#10b981' : '#94a3b8'}; font-weight: bold;">${formatNumber(m.informationRatio)}</span>
                </div>

                <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                  <span style="color: #94a3b8;">Tracking Error:</span>
                  <span style="color: #fbbf24; font-weight: bold;">${formatPct(m.trackingError, { showSign: false })}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderRiskMetrics(results) {
  return `
    <div style="background: #1e293b; padding: 25px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #f43f5e;">
      <h4 style="color: #f87171; margin-bottom: 20px; font-size: 1.2em;">⚠️ Análisis de Riesgo</h4>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #334155;">
              <th style="padding: 12px; text-align: left; color: #94a3b8; font-size: 0.85em;">Estrategia</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Max DD</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Nº Drawdowns</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Recup. Promedio</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">DD Más Largo</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Vol. Anual</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(result => {
              const m = result.metrics;
              return `
                <tr style="border-bottom: 1px solid #334155;">
                  <td style="padding: 12px; color: #f8fafc;">${result.strategyName}</td>
                  <td style="padding: 12px; text-align: center; color: #f87171; font-weight: bold;">
                    ${formatPct(m.maxDrawdown, { showSign: false })}
                  </td>
                  <td style="padding: 12px; text-align: center; color: #94a3b8;">
                    ${m.numDrawdowns}
                  </td>
                  <td style="padding: 12px; text-align: center; color: #fbbf24;">
                    ${Math.round(m.avgRecoveryDays)} días
                  </td>
                  <td style="padding: 12px; text-align: center; color: #f87171;">
                    ${Math.round(m.longestDrawdown)} días
                  </td>
                  <td style="padding: 12px; text-align: center; color: #818cf8;">
                    ${formatPct(m.volatility, { showSign: false })}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 20px; padding: 15px; background: #0f172a; border-radius: 8px; border-left: 3px solid #fbbf24;">
        <div style="font-size: 0.85em; color: #94a3b8;">
          <strong style="color: #fbbf24;">💡 Interpretación:</strong><br>
          • <strong>Max DD:</strong> Pérdida máxima desde el pico anterior<br>
          • <strong>Recup. Promedio:</strong> Tiempo medio para recuperar drawdowns<br>
          • <strong>DD Más Largo:</strong> Mayor periodo sin alcanzar nuevos máximos
        </div>
      </div>
    </div>
  `;
}

function renderTradingMetrics(results) {
  return `
    <div style="background: #1e293b; padding: 25px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #10b981;">
      <h4 style="color: #10b981; margin-bottom: 20px; font-size: 1.2em;">💰 Métricas de Trading</h4>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #334155;">
              <th style="padding: 12px; text-align: left; color: #94a3b8; font-size: 0.85em;">Estrategia</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Win Rate</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Profit Factor</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Avg Win</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Avg Loss</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Turnover</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Costos</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(result => {
              const m = result.metrics;
              const winRateColor = getMetricColor(m.winRate, { excellent: 60, good: 50, poor: 40 });
              const pfColor = getMetricColor(m.profitFactor, { excellent: 2.0, good: 1.5, poor: 1.0 });

              return `
                <tr style="border-bottom: 1px solid #334155;">
                  <td style="padding: 12px; color: #f8fafc;">${result.strategyName}</td>
                  <td style="padding: 12px; text-align: center;">
                    <span style="background: ${winRateColor}20; color: ${winRateColor}; padding: 4px 12px; border-radius: 12px; font-weight: bold;">
                      ${formatPct(m.winRate, { showSign: false })}
                    </span>
                  </td>
                  <td style="padding: 12px; text-align: center;">
                    <span style="background: ${pfColor}20; color: ${pfColor}; padding: 4px 12px; border-radius: 12px; font-weight: bold;">
                      ${formatNumber(m.profitFactor)}x
                    </span>
                  </td>
                  <td style="padding: 12px; text-align: center; color: #10b981; font-weight: bold;">
                    ${formatPct(m.avgWin * 100, { showSign: false })}
                  </td>
                  <td style="padding: 12px; text-align: center; color: #f87171; font-weight: bold;">
                    ${formatPct(m.avgLoss * 100, { showSign: false })}
                  </td>
                  <td style="padding: 12px; text-align: center; color: #fbbf24;">
                    ${formatPct(m.avgTurnover * 100, { showSign: false })}
                  </td>
                  <td style="padding: 12px; text-align: center; color: #94a3b8;">
                    €${formatNumber(m.totalTransactionCosts, 0)}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 20px; padding: 15px; background: #0f172a; border-radius: 8px; border-left: 3px solid #38bdf8;">
        <div style="font-size: 0.85em; color: #94a3b8;">
          <strong style="color: #38bdf8;">📌 Notas:</strong><br>
          • <strong>Win Rate:</strong> % de periodos con retorno positivo<br>
          • <strong>Profit Factor:</strong> Ratio ganancias/pérdidas (>1.5 es excelente)<br>
          • <strong>Turnover:</strong> % de cartera rotado en cada rebalanceo<br>
          • <strong>Costos:</strong> Comisiones + slippage estimados (0.15% por operación)
        </div>
      </div>
    </div>
  `;
}

function renderEquityCurveChart(bestStrategy, benchmarkReturns = null) {
  if (!bestStrategy || !bestStrategy.equityCurve) return '';

  const curve = bestStrategy.equityCurve;
  if (curve.length < 2) return '';
  let benchmarkCurve = null;

  if (benchmarkReturns && benchmarkReturns.length > 0) {
    benchmarkCurve = [1];
    benchmarkReturns.forEach(ret => {
      benchmarkCurve.push(benchmarkCurve[benchmarkCurve.length - 1] * (1 + ret));
    });
  }

  const alignedLength = benchmarkCurve
    ? Math.min(curve.length, benchmarkCurve.length)
    : curve.length;
  const alignedCurve = curve.slice(0, alignedLength);
  const alignedBenchmark = benchmarkCurve ? benchmarkCurve.slice(0, alignedLength) : null;

  const allValues = alignedBenchmark
    ? [...alignedCurve, ...alignedBenchmark]
    : alignedCurve;
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue || 1;

  const chartHeight = 200;

  const strategyPoints = alignedCurve.map((val, idx) => {
    const x = (idx / (alignedCurve.length - 1)) * 100;
    const y = chartHeight - ((val - minValue) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  let benchmarkPoints = '';
  if (alignedBenchmark) {
    benchmarkPoints = alignedBenchmark.map((val, idx) => {
      const x = (idx / (alignedBenchmark.length - 1)) * 100;
      const y = chartHeight - ((val - minValue) / range) * chartHeight;
      return `${x},${y}`;
    }).join(' ');
  }

  const strategyFinal = alignedCurve[alignedCurve.length - 1];
  const benchmarkFinal = alignedBenchmark ? alignedBenchmark[alignedBenchmark.length - 1] : 1;
  const outperformance = ((strategyFinal / benchmarkFinal) - 1) * 100;
  const outperformanceColor = outperformance >= 0 ? '#10b981' : '#f87171';

  let peak = alignedCurve[0];
  const drawdownPoints = alignedCurve.map((val, idx) => {
    if (val > peak) peak = val;
    const dd = ((val - peak) / peak) * 100;
    const x = (idx / (alignedCurve.length - 1)) * 100;
    const y = Math.abs(dd) * 2;
    return `${x},${y}`;
  }).join(' ');

  return `
    <div style="background: #1e293b; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
        <h4 style="color: #c7d2fe; font-size: 1.2em; margin: 0;">📈 Curva de Equity - ${bestStrategy.strategyName}</h4>
        ${alignedBenchmark ? `
          <div style="background: ${outperformanceColor}20; padding: 8px 16px; border-radius: 8px; border: 2px solid ${outperformanceColor};">
            <span style="color: #94a3b8; font-size: 0.85em; margin-right: 8px;">vs Benchmark:</span>
            <span style="color: ${outperformanceColor}; font-weight: bold; font-size: 1.1em;">
              ${outperformance >= 0 ? '+' : ''}${formatNumber(outperformance)}%
            </span>
          </div>
        ` : ''}
      </div>

      ${alignedBenchmark ? `
        <div style="display: flex; gap: 20px; margin-bottom: 15px; font-size: 0.9em;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 20px; height: 3px; background: #10b981; border-radius: 2px;"></div>
            <span style="color: #94a3b8;">Estrategia</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 20px; height: 3px; background: #818cf8; border-radius: 2px; opacity: 0.7;"></div>
            <span style="color: #94a3b8;">Benchmark</span>
          </div>
        </div>
      ` : ''}

      <div style="background: #0f172a; padding: 20px; border-radius: 8px; position: relative;">
        <svg class="equity-chart" viewBox="0 0 100 ${chartHeight}" style="width: 100%; height: ${chartHeight}px; overflow: visible;">
          ${[0, 25, 50, 75, 100].map(y => `
            <line x1="0" y1="${y * chartHeight / 100}" x2="100" y2="${y * chartHeight / 100}"
                  stroke="#334155" stroke-width="0.2" stroke-dasharray="1,1"/>
          `).join('')}

          <polygon points="0,${chartHeight} ${strategyPoints} 100,${chartHeight}"
                   fill="url(#strategyGradient)" opacity="0.3"/>

          ${alignedBenchmark ? `
            <polyline points="${benchmarkPoints}"
                      fill="none"
                      stroke="#818cf8"
                      stroke-width="0.5"
                      stroke-dasharray="2,2"
                      opacity="0.7"
                      vector-effect="non-scaling-stroke"/>
          ` : ''}

          <polyline points="${strategyPoints}"
                    fill="none"
                    stroke="#10b981"
                    stroke-width="0.7"
                    vector-effect="non-scaling-stroke"/>

          <defs>
            <linearGradient id="strategyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.8" />
              <stop offset="100%" style="stop-color:#10b981;stop-opacity:0" />
            </linearGradient>
          </defs>
        </svg>

        <div style="display: grid; grid-template-columns: ${alignedBenchmark ? '1fr 1fr 1fr' : '1fr 1fr'}; gap: 15px; margin-top: 15px; font-size: 0.85em;">
          <div style="text-align: center; padding: 10px; background: #1e293b; border-radius: 6px;">
            <div style="color: #94a3b8; margin-bottom: 5px;">Estrategia</div>
            <div style="color: #10b981; font-weight: bold; font-size: 1.2em;">
              ${formatPct((strategyFinal - 1) * 100, { showSign: true })}
            </div>
          </div>

          ${alignedBenchmark ? `
            <div style="text-align: center; padding: 10px; background: #1e293b; border-radius: 6px;">
              <div style="color: #94a3b8; margin-bottom: 5px;">Benchmark</div>
              <div style="color: #818cf8; font-weight: bold; font-size: 1.2em;">
                ${formatPct((benchmarkFinal - 1) * 100, { showSign: true })}
              </div>
            </div>

            <div style="text-align: center; padding: 10px; background: #1e293b; border-radius: 6px;">
              <div style="color: #94a3b8; margin-bottom: 5px;">Diferencia</div>
              <div style="color: ${outperformanceColor}; font-weight: bold; font-size: 1.2em;">
                ${outperformance >= 0 ? '+' : ''}${formatNumber(outperformance)}%
              </div>
            </div>
          ` : `
            <div style="text-align: center; padding: 10px; background: #1e293b; border-radius: 6px;">
              <div style="color: #94a3b8; margin-bottom: 5px;">Retorno Total</div>
              <div style="color: #10b981; font-weight: bold; font-size: 1.2em;">
                ${formatPct((strategyFinal - 1) * 100, { showSign: true })}
              </div>
            </div>
          `}
        </div>
      </div>

      <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin-top: 15px;">
        <h5 style="color: #f87171; margin-bottom: 10px; font-size: 0.9em;">📉 Drawdown de la Estrategia (%)</h5>
        <svg viewBox="0 0 100 60" style="width: 100%; height: 60px;">
          <polyline points="${drawdownPoints}"
                    fill="rgba(248, 113, 113, 0.2)"
                    stroke="#f87171"
                    stroke-width="0.5"/>
        </svg>
      </div>

      ${alignedBenchmark ? `
        <div style="margin-top: 15px; padding: 15px; background: #0f172a; border-radius: 8px; border-left: 3px solid #38bdf8;">
          <div style="font-size: 0.85em; color: #94a3b8;">
            <strong style="color: #38bdf8;">💡 Interpretación:</strong><br>
            ${outperformance > 0
              ? `La estrategia <strong style="color: #10b981;">superó al benchmark</strong> en ${formatNumber(outperformance)}%. Esto indica que la selección activa de activos añadió valor respecto a mantener el índice.`
              : `La estrategia <strong style="color: #f87171;">quedó por debajo del benchmark</strong> en ${formatNumber(Math.abs(outperformance))}%. Considera revisar los parámetros o usar gestión pasiva.`
            }
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderDrawdownAnalysis(results) {
  return `
    <div style="background: #1e293b; padding: 25px; border-radius: 12px; border-left: 4px solid #fbbf24;">
      <h4 style="color: #fbbf24; margin-bottom: 20px; font-size: 1.2em;">📉 Análisis de Drawdowns Profundo</h4>

      ${results.map(result => {
        const m = result.metrics;
        const avgDD = m.maxDrawdown / (m.numDrawdowns || 1);

        return `
          <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #334155;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h5 style="color: #f8fafc; font-size: 1em;">${result.strategyName}</h5>
              <span style="background: #f8717120; color: #f87171; padding: 4px 12px; border-radius: 12px; font-weight: bold;">
                Max: ${formatPct(m.maxDrawdown, { showSign: false })}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
              <div style="text-align: center;">
                <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 5px;">DD Promedio</div>
                <div style="color: #fbbf24; font-size: 1.2em; font-weight: bold;">${formatPct(avgDD, { showSign: false })}</div>
              </div>

              <div style="text-align: center;">
                <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 5px;">Total DDs</div>
                <div style="color: #818cf8; font-size: 1.2em; font-weight: bold;">${m.numDrawdowns}</div>
              </div>

              <div style="text-align: center;">
                <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 5px;">Recup. Promedio</div>
                <div style="color: #10b981; font-size: 1.2em; font-weight: bold;">${Math.round(m.avgRecoveryDays)}d</div>
              </div>

              <div style="text-align: center;">
                <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 5px;">Peor Recup.</div>
                <div style="color: #f87171; font-size: 1.2em; font-weight: bold;">${Math.round(m.longestDrawdown)}d</div>
              </div>
            </div>

            <div style="margin-top: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.8em; color: #94a3b8;">
                <span>Tiempo en drawdown</span>
                <span>${formatNumber((m.longestDrawdown / 252) * 100)}% del tiempo</span>
              </div>
              <div style="height: 8px; background: #334155; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${Math.min(100, (m.longestDrawdown / 252) * 100)}%; background: linear-gradient(90deg, #f87171, #fbbf24); border-radius: 4px;"></div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

window.renderBacktestResults = renderBacktestResults;
window.toggleSection = toggleSection;
window.exportBacktestToCSV = exportBacktestToCSV;

window.runBacktest = async function () {
  const [file, suffix] = document.getElementById('marketSelect').value.split('|');
  const topN = parseInt(document.getElementById('backtestTopN').value, 10);
  const rebalanceEvery = parseInt(document.getElementById('backtestRebalance').value, 10);
  const allocationMethod = document.getElementById('backtestAllocationMethod').value;
  const status = document.getElementById('backtestStatus');

  if (!file) {
    showInlineError('Selecciona un mercado antes de ejecutar el backtest');
    return;
  }

  status.innerText = '⏳ Preparando backtest...';

  try {
    const universeData = await loadUniverseData(file, suffix, status);
    const benchmark = await loadBenchmark(suffix);
    const benchmarkPrices = benchmark?.prices ?? null;

    if (!universeData.length) {
      status.innerText = '⚠️ No se pudieron cargar datos históricos para el universo';
      return;
    }

    const results = [];
    const strategies = Object.entries(STRATEGY_PROFILES);

    for (const [strategyKey, strategyConfig] of strategies) {
      status.innerText = `🧪 Backtest ${strategyConfig.name}...`;
      const result = backtesting.runStrategyBacktest({
        strategyKey,
        strategyConfig,
        universeData,
        topN,
        rebalanceEvery,
        allocationMethod,
        benchmarkPrices
      });
      results.push(result);
      await sleep(20);
    }

    status.innerText = '✅ Backtest completado';
    renderBacktestResults(results, rebalanceEvery);
  } catch (err) {
    console.error('Error en backtest:', err);
    status.innerText = `❌ Error en backtest: ${err.message}`;
  }
};


// =====================================================
// ESCANEO PRINCIPAL
// =====================================================

export async function runScan() {
  // 1. Evitar ejecución doble si ya está corriendo
  if (isScanning) return;

  const btnScan = document.getElementById('btnRunScan');

  try {
    // 2. Bloquear sistema
    isScanning = true;
    if (btnScan) {
      btnScan.disabled = true;
      btnScan.innerText = '⏳ Escaneando...';
      btnScan.style.opacity = '0.7';
      btnScan.style.cursor = 'wait';
    }

    const [file, suffix] = document.getElementById('marketSelect').value.split('|');
    const strategyKey = document.getElementById('strategySelect').value;
    const config = STRATEGY_PROFILES[strategyKey];

    const status = document.getElementById('status');
    const tbody = document.getElementById('results');
    const filterInfo = document.getElementById('filterInfo');

    // 3. Limpieza garantizada antes de empezar
    tbody.innerHTML = '';
    currentResults = []; // Limpiar array de memoria
    filterInfo.innerHTML = '';

    status.innerText = '⏳ Iniciando escaneo...';

    status.innerText = '📊 Cargando benchmark...';
    benchmarkData = await loadBenchmark(suffix);

    status.innerText = '📦 Cargando universo...';
    const universe = await (await fetch(file)).json();

    let analyzed = 0;
    let filtered = 0;

    const BATCH_SIZE = 5;

    for (let i = 0; i < universe.length; i += BATCH_SIZE) {
      const batch = universe.slice(i, i + BATCH_SIZE);

      status.innerText = `🔎 Analizando activos ${i + 1}–${Math.min(i + BATCH_SIZE, universe.length)} de ${universe.length} | ✓ ${analyzed} | ✖ ${filtered}`;

      const batchResults = await Promise.all(
        batch.map(stock =>
          analyzeStock(stock, suffix, config, benchmarkData?.rocs, benchmarkData?.volatility)
        )
      );

      batchResults.forEach((res, idx) => {
        if (res?.passed) {
          const originalStockData = batch[idx];
          const sectorId = getSectorId(originalStockData.sector || originalStockData.industry || 'Unknown');
          const tempStats = calculateSectorStats(currentResults);
          const anomalyData = detectAnomalies(res, tempStats);
          currentResults.push({
            ...res,
            vRatio: Number(res.vRatio) || 1.0,
            sectorId,
            sectorRaw: originalStockData.sector || originalStockData.industry || 'Unknown',
            hasAnomalies: anomalyData.hasAnomalies,
            anomalies: anomalyData.anomalies,
            anomalyMetrics: anomalyData.metrics || {}
          });
          analyzed++;
        } else {
          filtered++;
        }
      });

      if (i % (BATCH_SIZE * 2) === 0) {
        const sectorStats = calculateSectorStats(currentResults);
        renderTable(currentResults);
        updateSectorUI(sectorStats);
      }

      await sleep(50);
    }

    currentResults.sort((a, b) => b.scoreTotal - a.scoreTotal);
    const finalStats = calculateSectorStats(currentResults);

    currentResults = currentResults.map(asset => {
      const anomalyData = detectAnomalies(asset, finalStats);

      let updatedScore = asset.scoreTotal;
      let penalty = 0;

      if (anomalyData.hasAnomalies) {
        penalty = Math.min(15, Math.round((anomalyData.metrics?.volumeZScore || 0) * 3));
        updatedScore = Math.max(0, updatedScore - penalty);
      }

      return {
        ...asset,
        anomalies: anomalyData.anomalies,
        warnings: [
          ...(asset.warnings || []),
          ...(anomalyData.warnings || [])
        ],
        hasAnomalies: anomalyData.hasAnomalies,
        anomalyMetrics: anomalyData.metrics,
        scoreTotal: updatedScore,
        anomalyPenalty: penalty
      };
    });

    renderTable(currentResults);
    updateSectorUI(finalStats);

    status.innerText = `✅ Escaneo completado. ${analyzed} activos encontrados.`;
    filterInfo.innerHTML = `✅ ${analyzed} aprobados | ❌ ${filtered} filtrados`;

    appState.scanResults = currentResults;
    appState.market = { file, suffix };
    appState.strategy = strategyKey;

    const canBuildPortfolio =
      appState.scanResults.filter(
        r => Array.isArray(r.pricesWithDates) && r.pricesWithDates.length >= 30
      ).length >= 3;

    const buildBtn = document.querySelector('button[onclick="buildPortfolio()"]');
    if (buildBtn) {
      buildBtn.disabled = !canBuildPortfolio;
    }

    if (!canBuildPortfolio) {
      showInlineError('No hay suficientes activos con histórico para construir cartera');
    }

    // Detección de régimen
    if (benchmarkData && benchmarkData.symbol) {
       // ... (Código de régimen existente se mantiene igual) ...
       // (Mantenemos tu lógica existente para brevity, pero dentro del try)
       try {
        status.innerText = '🔍 Detectando régimen de mercado...';
        const benchmarkFullData = await loadYahooData(benchmarkData.symbol, '');
        if (!benchmarkFullData || benchmarkFullData.length === 0) {
            console.warn('No se pudieron cargar datos completos del benchmark para régimen');
        } else {
            const benchmarkPrices = benchmarkFullData.map(d => ({ date: d.date, close: d.close }));
            if (benchmarkPrices.length >= 200) {
                currentRegime = regime.detectMarketRegime(benchmarkPrices, currentResults);
                appState.regime = currentRegime;
                renderRegimeIndicator(currentRegime);
                console.log('📊 Régimen detectado:', currentRegime);
            }
        }
       } catch(e) { console.error(e); }
       status.innerText = `✅ Escaneo completado. ${analyzed} activos encontrados.`;
    }

    const portfolioSection = document.getElementById('portfolioSection');
    if (portfolioSection && currentResults.length > 0) {
      portfolioSection.style.display = 'block';
      const regimeOption = document.getElementById('regimeAdjustmentOption');
      if (regimeOption && appState.regime) {
        regimeOption.style.display = 'block';
      }
    }

  } catch (error) {
    console.error("Error crítico en escaneo:", error);
    status.innerText = "❌ Error crítico durante el escaneo.";
  } finally {
    // 4. Restaurar botón y estado al finalizar (incluso si hubo error)
    isScanning = false;
    if (btnScan) {
      btnScan.disabled = false;
      btnScan.innerText = '🚀 Ejecutar Análisis';
      btnScan.style.opacity = '1';
      btnScan.style.cursor = 'pointer';
    }
  }
}

// =====================================================
// CONSTRUCCIÓN DE CARTERA
// =====================================================

window.buildPortfolio = function () {
  const method = document.getElementById('allocationMethod').value;
  const topN = parseInt(document.getElementById('topNAssets').value, 10);
  const totalCapital = parseFloat(document.getElementById('totalCapital').value);
  const riskProfile = document.getElementById('riskProfile')?.value || 'moderate';

  if (!appState.scanResults.length) {
    showInlineError('Primero ejecuta un escaneo');
    return;
  }

  if (topN > appState.scanResults.length) {
    showInlineError(`Solo hay ${appState.scanResults.length} activos disponibles`);
    return;
  }

  try {

    // Si hay ajuste de régimen: Aplicar.
    let adjustedAssets = appState.scanResults.slice(0, topN);

    // Si hay régimen:
    if (appState.regime && document.getElementById('applyRegimeAdjustment')?.checked) {
      // Recalcular scores con ajustes de régimen
      const regimeAdjustment = appState.regime.strategyAdjustment;

      adjustedAssets = adjustedAssets.map(asset => ({
        ...asset,
        scoreTotal: Math.max(0, Math.min(100, asset.scoreTotal + regimeAdjustment.min_score))
      }));

      // Re-ordenar por nuevo score
      adjustedAssets.sort((a, b) => b.scoreTotal - a.scoreTotal);

      console.log('✅ Régimen aplicado:', regimeAdjustment);
    }

    // 1. Calcular asignación
    const portfolioData = allocation.allocateCapital(adjustedAssets, method);

    // 2. Añadir capital recomendado
    let withCapital = allocation.calculateCapitalRecommendations(
      portfolioData.allocation,
      totalCapital
    );

    // 3. Aplicar gobernanza
    const selectedRules = governance.RISK_PROFILES[riskProfile]?.rules || governance.INVESTMENT_RULES;
    // Validar cumplimiento
    const complianceCheck = governance.validateCompliance(withCapital, selectedRules);

    // Si hay violaciones, aplicar correcciones automáticas
    if (!complianceCheck.compliant) {
      console.warn('⚠️ Violaciones de gobernanza detectadas:', complianceCheck.violations);

      const correctionResult = governance.applyComplianceCorrections(withCapital, selectedRules);
      withCapital = correctionResult.portfolio;

      // Recalcular capital después de correcciones
      withCapital = allocation.calculateCapitalRecommendations(withCapital, totalCapital);

      console.log('✅ Correcciones aplicadas:', correctionResult.corrections);
    }

    // 4. Enriquecer con precios completos para análisis de riesgo
    const enrichedAllocation = withCapital.map(asset => {
      const original = appState.scanResults.find(r => r.ticker === asset.ticker);
      return {
        ...asset,
        prices: original?.pricesWithDates || [],
        volatility: asset.volatility || original?.details?.risk?.volatility || '20',
        details: original?.details
      };
    });


    // 4.1 Validación defensiva de datos históricos (CRÍTICO)
    const invalidAssets = enrichedAllocation.filter(
      a => !Array.isArray(a.prices) || a.prices.length < 30
    );

    const degradedRisk = invalidAssets.length > 0;

    const finalAllocation = degradedRisk
      ? enrichedAllocation.filter(a => !invalidAssets.includes(a))
      : enrichedAllocation;

      // 5. Generar reporte de riesgo completo
    const riskReport = risk.generateRiskReport(finalAllocation, totalCapital);

    // Meta-información UI (NO cuant)
    riskReport.meta = {
      degraded: degradedRisk,
      excludedAssets: invalidAssets.map(a => a.ticker)
    };

    // 6. Generar reporte de gobernanza
    const governanceReport = governance.generateGovernanceReport(
      enrichedAllocation,
      appState.strategy,
      selectedRules
    );

    // 7. Guardar en estado
    appState.portfolio = {
      ...portfolioData,
      allocation: enrichedAllocation,
      totalCapital,
      riskReport,
      governanceReport,
      complianceCheck
    };

    // 8. Renderizar
    renderPortfolio(appState.portfolio);

    document.getElementById('portfolioResults').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error('Error en buildPortfolio:', err);
    showInlineError(`Error construyendo cartera: ${err.message}`);
  }
};

// =====================================================
// RENDERIZADO DE CARTERA
// =====================================================

function renderPortfolio(portfolio) {
  const container = document.getElementById('portfolioResults');

  container.innerHTML = `
    ${renderGovernanceReport(portfolio.governanceReport, portfolio.complianceCheck)}
    ${renderRiskSummary(portfolio.portfolioRisk)}
    ${renderAdvancedRiskDashboard(portfolio.riskReport)}
    ${renderAllocationTable(portfolio.allocation)}
    ${renderWeightChart(portfolio.allocation)}
  `;

  container.style.display = 'block';
}

function renderRiskSummary(risk) {
  return `
    <div class="portfolio-summary">
      <h3>📊 Resumen de Cartera</h3>
      <div class="risk-metrics">
        ${riskCard('Volatilidad Cartera', `${risk.portfolioVolatility}%`)}
        ${riskCard('Ratio Diversificación', `${risk.diversificationRatio}x`)}
        ${riskCard('Nº Efectivo Activos', risk.effectiveNAssets)}
        ${riskCard('Max DD Estimado', `${risk.estimatedMaxDD}%`)}
      </div>
    </div>
  `;
}

function riskCard(label, value) {
  return `
    <div class="risk-card">
      <div class="risk-label">${label}</div>
      <div class="risk-value">${value}</div>
    </div>
  `;
}

function renderAdvancedRiskDashboard(riskReport) {
  return `
    <div class="risk-dashboard-container">
      <h3>🧩 Análisis Avanzado de Riesgo</h3>

      ${riskReport.meta?.degraded ? `
        <div class="small-text" style="margin-bottom: 15px; color: #fbbf24;">
          ⚠️ Análisis de riesgo realizado con universo reducido.
          Activos excluidos: ${riskReport.meta.excludedAssets.join(', ')}
        </div>
      ` : ''}

      <div class="risk-grid-layout">
        <div class="risk-panel-dark">
          <h4>📉 Value at Risk (VaR 95%)</h4>
          <div style="font-size: 2em; color: #f43f5e; font-weight: bold; margin: 15px 0;">
            -€${riskReport.portfolioVaR.diversifiedVaR}
          </div>
          <div class="small-text">
            Pérdida máxima esperada en el 95% de días<br>
            <strong>Sin diversificar:</strong> -€${riskReport.portfolioVaR.undiversifiedVaR}<br>
            <strong>Beneficio diversificación:</strong> ${riskReport.portfolioVaR.diversificationBenefit}%
          </div>
        </div>

        <div class="risk-panel-dark">
          <h4>⚠️ Activo Más Arriesgado</h4>
          <div style="font-size: 1.5em; color: #fbbf24; font-weight: bold; margin: 15px 0;">
            ${riskReport.riskMetrics?.riskiestAsset?.ticker || 'N/A'} (${riskReport.riskMetrics?.riskiestAsset?.name})
          </div>
          <div class="small-text">
            <strong>Volatilidad:</strong> ${riskReport.riskMetrics.riskiestAsset.volatility}%<br>
            <strong>Peso en cartera:</strong> ${riskReport.riskMetrics.riskiestAsset.weight}<br>
            <strong>Riesgo concentración:</strong> ${riskReport.riskMetrics.concentrationRisk}
          </div>
        </div>
      </div>

      <div style="margin-top: 20px;">
        <h4>🔥 Matriz de Correlaciones</h4>
        ${renderHeatmap(riskReport.correlationData.matrix)}
        <div class="small-text" style="margin-top: 10px;">
          <strong>Correlación promedio:</strong> ${riskReport.correlationData.stats.average} |
          <strong>Máxima:</strong> ${riskReport.correlationData.stats.max} |
          <strong>Score diversificación:</strong> ${riskReport.riskMetrics.diversificationScore}/100
        </div>
      </div>

      <div style="margin-top: 20px;">
        <h4>🌪️ Stress Test</h4>
        <table class="stress-table">
          <thead>
            <tr>
              <th>Escenario</th>
              <th>Mercado</th>
              <th>Tu Pérdida</th>
              <th>% Cartera</th>
              <th>Capital Restante</th>
            </tr>
          </thead>
          <tbody>
            ${riskReport.stressTests.map(s => `
              <tr>
                <td><strong>${s.scenario}</strong><br><span class="small-text">${s.description}</span></td>
                <td style="color:#f87171">${s.marketDrop}</td>
                <td style="color:#f87171; font-weight:bold">-€${s.estimatedLoss}</td>
                <td style="color:#f87171">${s.lossPct}</td>
                <td style="color:#10b981">€${parseFloat(s.remainingCapital).toLocaleString('es-ES')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderHeatmap(matrix) {
  const tickers = matrix.map(m => m.ticker);

  let html = '<table class="heatmap-table"><thead><tr><th></th>';
  tickers.forEach(t => html += `<th>${t.split('.')[0]}</th>`);
  html += '</tr></thead><tbody>';

  matrix.forEach((row, i) => {
    html += `<tr><td><strong>${row.ticker.split('.')[0]}</strong></td>`;
    row.values.forEach((val, j) => {
      let color = 'transparent';

      if (val > 0.8) color = 'rgba(239, 68, 68, 0.8)';
      else if (val > 0.5) color = 'rgba(239, 68, 68, 0.4)';
      else if (val > 0.2) color = 'rgba(251, 191, 36, 0.3)';
      else if (val > -0.2) color = 'rgba(16, 185, 129, 0.3)';
      else color = 'rgba(59, 130, 246, 0.4)';

      html += `<td style="background:${color}; color:#fff">${val}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

function renderAllocationTable(allocation) {
  return `
    <div class="portfolio-table-container">
      <h3>💼 Asignación de Capital (${allocation.length} activos)</h3>
      <table class="portfolio-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Nombre</th>
            <th>Peso %</th>
            <th>Capital €</th>
            <th>Score</th>
            <th>Volatilidad</th>
          </tr>
        </thead>
        <tbody>
          ${allocation.map(a => `
            <tr>
              <td><strong>${a.ticker}</strong></td>
              <td>${a.name}</td>
              <td><strong>${a.weight_pct}%</strong></td>
              <td>€${Number(a.recommended_capital).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
              <td>${a.score}</td>
              <td>${a.volatility}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderWeightChart(allocation) {
  const top = allocation.slice(0, 10);
  const maxWeight = Math.max(...top.map(a => parseFloat(a.weight_pct)));

  return `
    <div class="portfolio-chart">
      <h3>📈 Distribución de Pesos (Top 10)</h3>
      <div class="weight-bars">
        ${top.map(a => {
          const width = (parseFloat(a.weight_pct) / maxWeight) * 100;
          return `
            <div class="weight-bar-container">
              <div class="weight-bar-label">${a.ticker}</div>
              <div class="weight-bar-wrapper">
                <div class="weight-bar" style="width:${width}%"></div>
                <span class="weight-bar-value">${a.weight_pct}%</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// =====================================================
// RENDERIZADO DE TABLA
// =====================================================

function renderTable(data) {
  const tbody = document.getElementById('results');
  const viewKey = document.getElementById('viewMode').value;
  tbody.innerHTML = '';

  data.forEach((r, idx) => {
    const displayScore = r[viewKey] || r.finalScore;
    const dotColor = SECTOR_COLORS[r.sectorId] || SECTOR_COLORS[999];

    // Lógica de Anomalías
    let anomalyBadge = '';
    let rowClass = 'result-row';
    if (r.hasAnomalies) {
      const warningType = r.anomalies[0] || 'RISK';
      const tooltip = `${warningType}: Z-Score ${r.anomalyMetrics?.volumeZScore?.toFixed(2) || 0}, Sector Rel ${r.anomalyMetrics?.sectorRelVolume?.toFixed(1) || 0}x`;
      anomalyBadge = `<div class="anomaly-pill" title="${tooltip}" style="background:#450a0a; color:#ef4444; border:1px solid #ef4444; display:inline-block; padding:2px 6px; border-radius:4px; font-size:0.7em; margin-left:5px;">⚠️ ${warningType.replace('_', ' ')}</div>`;
      rowClass += ' row-warning';
    }

    const tr = document.createElement('tr');
    tr.className = rowClass;
    tr.style.cursor = 'pointer';
    tr.onclick = () => showDetails(r.ticker);

    tr.innerHTML = `
      <td class="rank-cell" style="color:#94a3b8; font-size:0.8em;">${idx + 1}</td>
      <td>
        <div style="font-weight:bold; color:#f8fafc;">${r.ticker} ${anomalyBadge}</div>
      </td>
      <td class="name-cell">
        <div style="font-weight: 600; color: #f8fafc; margin-bottom: 2px;">${r.name}</div>
        <div style="font-size: 0.7em; color: #94a3b8; text-transform: uppercase; display: flex; align-items: center; gap: 4px;">
           <span style="color: ${dotColor}; font-size: 1.2em;">•</span> ${r.sectorRaw || 'No clasificado'}
        </div>
        </td>
        <td>${renderScorePill(displayScore)}</td>
        <td class="volume-cell">
        <span style="font-family: monospace; color:#38bdf8;">
        x${Number(r.vRatio || 1).toFixed(2)}
        </span>
        ${r.anomalyMetrics?.volumeZScore > 3 ?
          `<span style="cursor:help" title="Volumen inusual (Z-Score: ${r.anomalyMetrics.volumeZScore.toFixed(2)})">🔥</span>`
          : ''}
      </td>
      <td>
        <div class="signal-badge" style="background: ${r.signal.color}20; color: ${r.signal.color}; border: 1px solid ${r.signal.color}; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; display: inline-block;">
          ${r.signal.text}
        </div>
        <div class="confidence-bar" style="width: 100%; height: 4px; background: #334155; border-radius: 2px; margin-top: 5px;">
          <div class="confidence-fill" style="width: ${r.signal.confidence}%; background: ${r.signal.color}; height: 100%; border-radius: 2px;"></div>
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


// Renderizar régimen
function renderRegimeIndicator(regimeData) {
  const container = document.getElementById('regimeIndicator');
  if (!container) return;

  const confidencePct = (regimeData.confidence * 100).toFixed(0);

  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: ${regimeData.color}20; border-left: 4px solid ${regimeData.color}; border-radius: 8px;">
      <div style="font-size: 2em;">${regimeData.emoji}</div>
      <div style="flex: 1;">
        <div style="font-weight: bold; color: ${regimeData.color}; font-size: 1.1em; margin-bottom: 5px;">
          Régimen de Mercado: ${regimeData.name}
        </div>
        <div style="font-size: 0.85em; color: #94a3b8;">
          ${regimeData.description}
        </div>
        <div style="margin-top: 8px; font-size: 0.8em; color: #64748b;">
          <strong>Confianza:</strong> ${confidencePct}% |
          <strong>Tendencia:</strong> ${regimeData.benchmarkAnalysis.details.trendDescription} |
          <strong>Volatilidad:</strong> ${regimeData.benchmarkAnalysis.details.volDescription}
          ${regimeData.breadthAnalysis ? ` | <strong>Amplitud:</strong> ${regimeData.breadthAnalysis.breadth}% (${regimeData.breadthAnalysis.description})` : ''}
        </div>
      </div>
      <button
        onclick="showRegimeDetails()"
        style="padding: 8px 16px; background: ${regimeData.color}; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85em; white-space: nowrap;"
      >
        Ver Detalles
      </button>
    </div>
  `;

  container.style.display = 'block';
}

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
    ${result.hasAnomalies ? `
    <div class="detail-section" style="border-left: 4px solid #f43f5e; background: #450a0a;">
      <h3 style="color: #f43f5e;">🚨 Detección de Anomalías</h3>
      <div style="margin-bottom: 10px; color: #fca5a5;">
        Este activo presenta comportamiento inusual y ha recibido una <strong>penalización de -${result.anomalyPenalty} puntos</strong>.
      </div>
      <ul>
        <li>Tipo: <strong>${result.anomalies.join(', ')}</strong></li>
        <li>Z-Score Volumen: <strong>${result.anomalyMetrics.volumeZScore}</strong> (Normal < 3.0)</li>
        <li>Ratio vs Sector: <strong>${result.anomalyMetrics.sectorRelVolume}x</strong> (Normal ~1.0)</li>
        <li>Retorno 1d: <strong>${result.anomalyMetrics.priceReturn1d}</strong></li>
      </ul>
    </div>
    ` : ''}
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

// Render governance
function renderGovernanceReport(governanceReport, complianceCheck) {
  const hasViolations = !complianceCheck.compliant;
  const statusColor = hasViolations ? '#f43f5e' : '#10b981';
  const statusText = hasViolations ? 'CON ALERTAS' : 'COMPLIANT';

  return `
    <div class="governance-report" style="background: #1e293b; padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid ${statusColor};">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="color: ${statusColor}; margin: 0;">🏛️ Reporte de Gobernanza</h3>
        <span style="padding: 8px 16px; background: ${statusColor}20; color: ${statusColor}; border-radius: 6px; font-weight: bold; font-size: 0.9em;">
          ${statusText}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div style="background: #0f172a; padding: 15px; border-radius: 8px;">
          <h4 style="color: #94a3b8; font-size: 0.9em; margin-bottom: 10px;">ESTRATEGIA</h4>
          <div style="color: #f8fafc; font-size: 1.1em; font-weight: bold; margin-bottom: 5px;">
            ${governanceReport.strategy.name}
          </div>
          <div style="color: #64748b; font-size: 0.85em;">
            Perfil: ${governanceReport.strategy.profile}
          </div>
        </div>

        <div style="background: #0f172a; padding: 15px; border-radius: 8px;">
          <h4 style="color: #94a3b8; font-size: 0.9em; margin-bottom: 10px;">RESUMEN DE CARTERA</h4>
          <div style="color: #f8fafc; font-size: 0.9em;">
            <div>Activos: <strong>${governanceReport.portfolio_summary.n_assets}</strong></div>
            <div>Posición máx: <strong>${(parseFloat(governanceReport.portfolio_summary.max_position) * 100).toFixed(2)}%</strong></div>
            <div>Top 3: <strong>${(parseFloat(governanceReport.portfolio_summary.top3_concentration) * 100).toFixed(2)}%</strong></div>
          </div>
        </div>
      </div>

      ${hasViolations ? `
        <div style="background: rgba(244, 63, 94, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #f43f5e;">
          <h4 style="color: #f43f5e; margin-bottom: 10px;">⚠️ Violaciones Detectadas (${complianceCheck.violations.length})</h4>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${complianceCheck.violations.map(v => `
              <li style="padding: 8px 0; border-bottom: 1px solid rgba(244, 63, 94, 0.2); color: #f8fafc; font-size: 0.9em;">
                <strong>${v.asset || 'Cartera'}</strong>: ${v.message}
                <div style="color: #94a3b8; font-size: 0.85em; margin-top: 3px;">
                  Valor: ${v.value} | Límite: ${v.limit}
                </div>
              </li>
            `).join('')}
          </ul>
          <div style="margin-top: 15px; padding: 10px; background: #0f172a; border-radius: 6px; font-size: 0.85em; color: #94a3b8;">
            ✅ Se han aplicado correcciones automáticas para cumplir las reglas
          </div>
        </div>
      ` : ''}

      ${complianceCheck.warnings.length > 0 ? `
        <div style="background: rgba(251, 191, 36, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #fbbf24; margin-top: 15px;">
          <h4 style="color: #fbbf24; margin-bottom: 10px;">ℹ️ Advertencias (${complianceCheck.warnings.length})</h4>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${complianceCheck.warnings.slice(0, 3).map(w => `
              <li style="padding: 5px 0; color: #f8fafc; font-size: 0.85em;">
                ${w.asset || 'Cartera'}: ${w.message}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
}

// Regime frontend

window.showRegimeDetails = function() {
  if (!appState.regime) return;

  const r = appState.regime;
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('modalContent');

  content.innerHTML = `
    <h2>${r.emoji} Análisis de Régimen de Mercado</h2>

    <div class="detail-section">
      <h3>📊 Clasificación</h3>
      <div style="padding: 20px; background: ${r.color}20; border-left: 4px solid ${r.color}; border-radius: 8px;">
        <div style="font-size: 1.5em; font-weight: bold; color: ${r.color}; margin-bottom: 10px;">
          ${r.name}
        </div>
        <div style="color: #94a3b8; margin-bottom: 10px;">
          ${r.description}
        </div>
        <div style="font-size: 0.9em; color: #64748b;">
          <strong>Confianza:</strong> ${(r.confidence * 100).toFixed(0)}%
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3>🔍 Señales del Benchmark</h3>
      <ul>
        <li>Tendencia: <strong>${r.benchmarkAnalysis.details.trendDescription}</strong> (${r.benchmarkAnalysis.signals.trend > 0 ? '🟢' : r.benchmarkAnalysis.signals.trend < 0 ? '🔴' : '🟡'})</li>
        <li>Volatilidad: <strong>${r.benchmarkAnalysis.details.volDescription}</strong> (${r.benchmarkAnalysis.signals.volatility > 0 ? '🟢' : r.benchmarkAnalysis.signals.volatility < 0 ? '🔴' : '🟡'})</li>
        <li>Momentum: <strong>${r.benchmarkAnalysis.details.momentumDescription}</strong> (${r.benchmarkAnalysis.signals.momentum > 0 ? '🟢' : r.benchmarkAnalysis.signals.momentum < 0 ? '🔴' : '🟡'})</li>
        <li>Score Compuesto: <strong>${r.benchmarkAnalysis.signals.composite}</strong></li>
      </ul>
    </div>

    ${r.breadthAnalysis ? `
    <div class="detail-section">
      <h3>📊 Amplitud de Mercado</h3>
      <ul>
        <li>Activos alcistas: <strong>${r.breadthAnalysis.bullishCount} / ${r.breadthAnalysis.totalAnalyzed}</strong></li>
        <li>Porcentaje: <strong>${r.breadthAnalysis.breadth}%</strong></li>
        <li>Clasificación: <strong>${r.breadthAnalysis.description}</strong></li>
      </ul>
      <div style="margin-top: 15px; height: 8px; background: #334155; border-radius: 4px; overflow: hidden;">
        <div style="height: 100%; width: ${r.breadthAnalysis.breadth}%; background: ${r.color}; transition: width 0.3s ease;"></div>
      </div>
    </div>
    ` : ''}

    <div class="detail-section">
      <h3>⚙️ Ajustes de Estrategia Recomendados</h3>
      <ul>
        <li>Peso Momentum: <strong>${(r.strategyAdjustment.momentum_weight * 100).toFixed(0)}%</strong> ${r.strategyAdjustment.momentum_weight > 1 ? '(aumentar)' : r.strategyAdjustment.momentum_weight < 1 ? '(reducir)' : '(mantener)'}</li>
        <li>Penalización Riesgo: <strong>${(r.strategyAdjustment.risk_penalty * 100).toFixed(0)}%</strong> ${r.strategyAdjustment.risk_penalty > 1 ? '(más estricto)' : r.strategyAdjustment.risk_penalty < 1 ? '(más permisivo)' : '(normal)'}</li>
        <li>Ajuste Score Mínimo: <strong>${r.strategyAdjustment.min_score > 0 ? '+' : ''}${r.strategyAdjustment.min_score}</strong> puntos</li>
      </ul>
    </div>

    <div class="detail-section" style="background: #0f172a; border-left: 4px solid #38bdf8;">
      <h3>💡 Interpretación</h3>
      <p style="color: #94a3b8; line-height: 1.6;">
        ${getRegimeInterpretation(r.regime)}
      </p>
    </div>
  `;

  modal.style.display = 'flex';
};

function getRegimeInterpretation(regimeType) {
  switch(regimeType) {
    case 'risk_on':
      return 'El mercado está en modo alcista con baja volatilidad. Este es un entorno favorable para estrategias de momentum y growth. Se recomienda aumentar la exposición a activos con fuerte impulso y reducir las restricciones por riesgo.';

    case 'risk_off':
      return 'El mercado está en modo defensivo con alta volatilidad o tendencia bajista. Se recomienda aumentar la calidad de los activos seleccionados, reducir exposición a momentum extremo y priorizar estabilidad. Considera aumentar cash o activos defensivos.';

    case 'neutral':
      return 'El mercado no muestra una tendencia clara. Este entorno favorece estrategias equilibradas y diversificación. Mantén pesos balanceados entre factores y evita sobre-concentración en momentum o value.';

    default:
      return 'Régimen no identificado.';
  }
}

function closeModal() {
  document.getElementById('detailModal').style.display = 'none';
}

function showInlineError(message) {
  const status = document.getElementById('status');
  status.textContent = `⚠️ ${message}`;
  status.style.color = '#f87171';
}

export function updateView() {
  const key = document.getElementById('viewMode').value;
  currentResults.sort((a, b) => b[key] - a[key]);
  renderTable(currentResults);
}

window.runScan = runScan;
window.updateView = updateView;
window.closeModal = closeModal;
