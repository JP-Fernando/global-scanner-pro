// =====================================================
// GLOBAL QUANT SCANNER - PROFESSIONAL VERSION
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
import i18n from '../i18n/i18n.js';
import { initDashboard } from '../dashboard/portfolio-dashboard.js';
import {
  exportBacktestToExcel,
  exportScanResultsToExcel,
  generateBacktestPDF,
  generateComparativePDF,
  generateComparativeExcel
} from '../reports/index.js';
import { notifyStrongSignals } from '../alerts/alert-manager.js';
import {
  adjustScoresBatch,
  PerformanceTracker,
  loadPerformanceTracker,
  savePerformanceTracker,
  PerformanceRecord
} from '../ml/adaptive-scoring.js';
import {
  predictRegime as predictRegimeML,
  extractRegimeFeatures
} from '../ml/regime-prediction.js';
import {
  generateRecommendations
} from '../ml/recommendation-engine.js';
import {
  detectAllAnomalies as detectMLAnomalies,
  getAnomalySummary
} from '../ml/anomaly-detection.js';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));
let currentResults = [];
let benchmarkData = null;
let currentRegime = null;
let lastBacktestResults = [];
let lastBacktestInitialCapital = null;
const dataCache = new Map();
let isScanning = false; // Control flag

// ML State
let performanceTracker = null;
let mlRegimePrediction = null;
let mlRecommendations = [];
let mlAnomalies = [];

const appState = {
  scanResults: [],
  portfolio: null,
  market: null,
  strategy: null,
  scanCompleted: false,
  mlEnabled: true // ML features enabled by default
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
}, { 999: 'Others' }); // Add default

// =====================================================
// DATA LOADING
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
    console.warn(
      i18n.t('errors.yahoo_load_failed',{symbol: fullSymbol}), 
      e.message);
    return [];
  }
}

// =====================================================
// INDIVIDUAL ASSET ANALYSIS
// =====================================================

async function analyzeStock(stock, suffix, config, benchmarkROCs, benchmarkVol) {
  try {
    const data = await loadYahooData(stock.ticker, suffix);

    if (!data || data.length < config.filters.min_days_history) {
      return { passed: false, reason: 'Insufficient history' };
    }

    const prices = data.map(d => d.close); // Indicator calculations
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
    console.warn(i18n.t('errors.analyse_stock', {
      ticker: stock.ticker,
      name: stock.name
    }), err.message);
    return {
      passed: false,
      ticker: stock.ticker,
      name: stock.name,
      reason: err.message
    };
  }
}

// =====================================================
// BENCHMARK LOADING AND ANALYSIS
// =====================================================

async function loadBenchmark(suffix) {
  const benchmarkSymbol = MARKET_BENCHMARKS[suffix];

  if (!benchmarkSymbol) {
    console.log(i18n.t('errors.no_benchmark_market'));
    return null;
  }

  console.log(`Loading benchmark: ${benchmarkSymbol}`);
  const data = await loadYahooData(benchmarkSymbol, '');

  if (!data || data.length < 252) {
    console.warn(i18n.t('errors.insufficient_benchmark_data'));
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
    console.warn(i18n.t('errors.benchmark_calculation_failed'), e.message);
    return null;
  }
}

function getRSIDescription(rsi) {
  if (rsi >= 70) {
    return {
      text: i18n.t('rsi.overbought'),
      color: '#f87171',
      icon: '⚠️'
    };
  }

  if (rsi >= 60) {
    return {
      text: i18n.t('rsi.healthy_bullish'),
      color: '#fbbf24',
      icon: '📈'
    };
  }

  if (rsi <= 30) {
    return {
      text: i18n.t('rsi.oversold'),
      color: '#4ade80',
      icon: '🎯'
    };
  }

  if (rsi <= 40) {
    return {
      text: i18n.t('rsi.weakness'),
      color: '#60a5fa',
      icon: '📉'
    };
  }

  return {
    text: i18n.t('rsi.neutral'),
    color: '#94a3b8',
    icon: '⚖️'
  };
}


function updateSectorUI(sectorStats) {
  const container = document.getElementById('sectorSummary');
  if (!container) return;

  // Clear and generate cards
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
          <span style="color:#475569; font-size:0.75em;">${stat.count} assets</span>
          <div style="width:40px; height:4px; background:#334155; border-radius:2px;">
             <div style="width:${stat.avgRsi}%; height:100%; background:${dotColor}; border-radius:2px;"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}


// =====================================================
// STRATEGY BACKTESTING
// =====================================================

async function loadUniverseData(file, suffix, statusNode) {
  if (statusNode) {
    statusNode.innerText = i18n.t('status.loading_backtest');
  }

  const universe = await (await fetch(file)).json();
  const results = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < universe.length; i += BATCH_SIZE) {
    const batch = universe.slice(i, i + BATCH_SIZE);

    if (statusNode) {
      statusNode.innerText = i18n.t('status.downloading_historical', {
        current: i + 1,
        end: Math.min(i + BATCH_SIZE, universe.length),
        total: universe.length
      });
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

function formatCapital(value) {
  if (!Number.isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
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
  const headers = [
    i18n.t('backtest.strategy'),
    i18n.t('backtest.initial_capital'),
    i18n.t('backtest.cagr'),
    i18n.t('backtest.sharpe'),
    i18n.t('backtest.max_drawdown'),
    i18n.t('backtest.win_rate'),
    i18n.t('backtest.alpha'),
    i18n.t('backtest.beta')
  ]
  const rows = results.map(result => [
    result.strategyName,
    result.initialCapital ?? '',
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
      <button class="backtest-action active" onclick="toggleSection('backtest-performance', this)">${i18n.t('backtest_section.action_performance')}</button>
      <button class="backtest-action active" onclick="toggleSection('backtest-detailed', this)">${i18n.t('backtest_section.action_detail')}</button>
      <button class="backtest-action active" onclick="toggleSection('backtest-risk', this)">${i18n.t('backtest_section.action_risk')}</button>
      <button class="backtest-action active" onclick="toggleSection('backtest-trading', this)">${i18n.t('backtest_section.action_trading')}</button>
      <button class="backtest-action active" onclick="toggleSection('backtest-equity', this)">${i18n.t('backtest_section.action_equity')}</button>
      <button class="backtest-action active" onclick="toggleSection('backtest-drawdown', this)">${i18n.t('backtest_section.action_drawdown')}</button>
      <button class="backtest-action active" onclick="exportBacktestToCSV()">
      📄 ${i18n.t('backtest_section.action_export')} CSV
      </button>
      <button class="backtest-action active" onclick="exportBacktestToExcelAdvanced()" style="background: #059669;">
      📊 ${i18n.t('backtest_section.action_export')} Excel
      </button>
      <button class="backtest-action active" onclick="exportBacktestToPDFAdvanced()" style="background: #dc2626;">
      📑 ${i18n.t('backtest_section.action_export')} PDF
      </button>
      <button class="backtest-action active" onclick="exportBacktestComparative()" style="background: #7c3aed;">
      📈 ${i18n.t('backtest_section.comparative_report')}
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
        ${i18n.t('backtest_section.no_results')}
      </div>
    `;
    container.style.display = 'block';
    return;
  }

  lastBacktestResults = validResults;
  lastBacktestInitialCapital = validResults[0]?.initialCapital ?? null;

  const bestStrategy = validResults[0];
  const benchmarkData = bestStrategy?.benchmarkReturns || benchmarkReturns;

  container.innerHTML = `
    ${renderBacktestActions()}
    ${renderBacktestHeader(validResults, rebalanceEvery, lastBacktestInitialCapital)}
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

function renderBacktestHeader(results, rebalanceEvery, initialCapital = lastBacktestInitialCapital) {
  const avgSharpe = results.reduce((sum, r) => sum + (r.metrics?.sharpeRatio || 0), 0) / results.length;
  const avgCAGR = results.reduce((sum, r) => sum + (r.metrics?.cagr || 0), 0) / results.length;

  return `
    <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #6366f1;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
        <div>
          <h3 style="color: #c7d2fe; font-size: 1.5em; margin-bottom: 10px;">${i18n.t('backtest_section.results_title')}</h3>
          <p style="color: #94a3b8; font-size: 0.9em;">
            ${i18n.t('backtest_section.rebalance_every', { days: rebalanceEvery })} · ${i18n.t('backtest_section.strategies_evaluated', { count: results.length })} · ${i18n.t('backtest_section.initial_capital')}: ${formatCapital(initialCapital)}
          </p>
        </div>
        <div style="text-align: right;">
          <div style="color: #94a3b8; font-size: 0.85em; margin-bottom: 5px;">${i18n.t('backtest_section.avg_sharpe')}</div>
          <div style="color: #10b981; font-size: 2em; font-weight: bold;">${formatNumber(avgSharpe)}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
        <div style="background: #0f172a; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 5px;">${i18n.t('backtest_section.avg_cagr')}</div>
          <div style="color: #38bdf8; font-size: 1.3em; font-weight: bold;">${formatPct(avgCAGR, { showSign: true })}</div>
        </div>
        <div style="background: #0f172a; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 5px;">${i18n.t('backtest_section.best_strategy')}</div>
          <div style="color: #10b981; font-size: 1.1em; font-weight: bold;">${results[0]?.strategyName || 'N/A'}</div>
        </div>
        <div style="background: #0f172a; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 5px;">${i18n.t('backtest_section.total_rebalances')}</div>
          <div style="color: #818cf8; font-size: 1.3em; font-weight: bold;">${results[0]?.sample || 0}</div>
        </div>
      </div>
    </div>
  `;
}

function renderPerformanceComparison(results) {
  return `
    <div style="background: #1e293b; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
      <h4 style="color: #c7d2fe; margin-bottom: 20px; font-size: 1.2em;">${i18n.t('backtest_performance.comparison_title')}</h4>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #334155;">
              <th style="padding: 12px; text-align: left; color: #94a3b8; font-size: 0.85em; text-transform: uppercase;">${i18n.t('backtest_performance.strategy')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_performance.total_return')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_performance.cagr')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_performance.sharpe')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">Calmar</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_performance.max_dd')}</th>
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
      <h4 style="color: #c7d2fe; margin-bottom: 20px; font-size: 1.2em;">${i18n.t('backtest_detailed.detailed_metrics_title')}</h4>

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
      <h4 style="color: #f87171; margin-bottom: 20px; font-size: 1.2em;">${i18n.t('backtest_detailed.risk_analysis_title')}</h4>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #334155;">
              <th style="padding: 12px; text-align: left; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_detailed.strategy')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_detailed.max_dd')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_detailed.num_drawdowns')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_detailed.avg_recovery')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_detailed.longest_dd')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_detailed.annual_vol')}</th>
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
                    ${Math.round(m.avgRecoveryDays)} ${i18n.t('backtest_detailed.days')}
                  </td>
                  <td style="padding: 12px; text-align: center; color: #f87171;">
                    ${Math.round(m.longestDrawdown)} ${i18n.t('backtest_detailed.days')}
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
          <strong style="color: #fbbf24;">${i18n.t('backtest_section.interpretation')}</strong><br>
          ${i18n.t('backtest_section.max_dd_meaning')}<br>
          ${i18n.t('backtest_section.avg_recovery_meaning')}
        </div>
      </div>
    </div>
  `;
}

function renderTradingMetrics(results) {
  return `
    <div style="background: #1e293b; padding: 25px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #10b981;">
      <h4 style="color: #10b981; margin-bottom: 20px; font-size: 1.2em;">${i18n.t('backtest_detailed.trading_metrics_title')}</h4>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #334155;">
              <th style="padding: 12px; text-align: left; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_detailed.strategy')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_detailed.win_rate')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_detailed.profit_factor')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_detailed.avg_win')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_detailed.avg_loss')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_detailed.turnover')}</th>
              <th style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.85em;">${i18n.t('backtest_detailed.costs')}</th>
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
          <strong style="color: #38bdf8;">${i18n.t('backtest_detailed.notes')}</strong><br>
          ${i18n.t('backtest_detailed.win_rate_note')}<br>
          ${i18n.t('backtest_detailed.profit_factor_note')}<br>
          ${i18n.t('backtest_detailed.turnover_note')}<br>
          ${i18n.t('backtest_detailed.costs_note')}
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
          <h4 style="color: #c7d2fe; font-size: 1.2em; margin: 0;">📈 ${i18n.t('backtest.equity_curve')} - ${bestStrategy.strategyName}</h4>
          ${alignedBenchmark ? `
            <div style="background: ${outperformanceColor}20; padding: 8px 16px; border-radius: 8px; border: 2px solid ${outperformanceColor};">
              <span style="color: #94a3b8; font-size: 0.85em; margin-right: 8px;">${i18n.t('backtest.benchmark')}:</span>
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
              <span style="color: #94a3b8;">${i18n.t('backtest.strategy')}</span>
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
              <div style="color: #94a3b8; margin-bottom: 5px;">${i18n.t('backtest.strategy')}</div>
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
                <div style="color: #94a3b8; margin-bottom: 5px;">${i18n.t('backtest.difference')}</div>
                <div style="color: ${outperformanceColor}; font-weight: bold; font-size: 1.2em;">
                  ${outperformance >= 0 ? '+' : ''}${formatNumber(outperformance)}%
                </div>
              </div>
            ` : `
              <div style="text-align: center; padding: 10px; background: #1e293b; border-radius: 6px;">
                <div style="color: #94a3b8; margin-bottom: 5px;">${i18n.t('backtest_performance.total_return')}</div>
                <div style="color: #10b981; font-weight: bold; font-size: 1.2em;">
                  ${formatPct((strategyFinal - 1) * 100, { showSign: true })}
                </div>
              </div>
            `}
          </div>
        </div>

        <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin-top: 15px;">
          <h5 style="color: #f87171; margin-bottom: 10px; font-size: 0.9em;">📉 % Drawdown</h5>
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
              <strong style="color: #38bdf8;">${i18n.t('backtest_section.interpretation')}:</strong><br>
              ${outperformance > 0
        ? `${i18n.t('backtest_section.outperformed_benchmark', { value: formatNumber(outperformance) })}`
        : `${i18n.t('backtest_section.underperformed_benchmark', { value: formatNumber(Math.abs(outperformance)) })}`
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
      <h4 style="color: #fbbf24; margin-bottom: 20px; font-size: 1.2em;">${i18n.t('backtest_detailed.drawdown_analysis_title')}</h4>

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
                <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 5px;">${i18n.t('backtest_detailed.avg_dd')}</div>
                <div style="color: #fbbf24; font-size: 1.2em; font-weight: bold;">${formatPct(avgDD, { showSign: false })}</div>
              </div>

              <div style="text-align: center;">
                <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 5px;">${i18n.t('backtest_detailed.total_dds')}</div>
                <div style="color: #818cf8; font-size: 1.2em; font-weight: bold;">${m.numDrawdowns}</div>
              </div>

              <div style="text-align: center;">
                <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 5px;">${i18n.t('backtest_detailed.avg_recovery')}</div>
                <div style="color: #10b981; font-size: 1.2em; font-weight: bold;">${Math.round(m.avgRecoveryDays)}d</div>
              </div>

              <div style="text-align: center;">
                <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 5px;">${i18n.t('backtest_detailed.worst_recovery')}</div>
                <div style="color: #f87171; font-size: 1.2em; font-weight: bold;">${Math.round(m.longestDrawdown)}d</div>
              </div>
            </div>

            <div style="margin-top: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.8em; color: #94a3b8;">
                <span>${i18n.t('backtest_detailed.time_in_drawdown')}</span>
                <span>${formatNumber((m.longestDrawdown / 252) * 100)}${i18n.t('backtest_detailed.of_time')}</span>
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

// =====================================================
// ADVANCED EXPORT FUNCTIONS
// =====================================================

function exportBacktestToExcelAdvanced() {
  if (!lastBacktestResults || lastBacktestResults.length === 0) {
    alert('No backtest results available. Please run a backtest first.');
    return;
  }
  exportBacktestToExcel(lastBacktestResults);
}

function exportBacktestToPDFAdvanced() {
  if (!lastBacktestResults || lastBacktestResults.length === 0) {
    alert('No backtest results available. Please run a backtest first.');
    return;
  }
  generateBacktestPDF(lastBacktestResults);
}

function exportBacktestComparative() {
  if (!lastBacktestResults || lastBacktestResults.length === 0) {
    alert('No backtest results available. Please run a backtest first.');
    return;
  }

  // Ask user for format preference
  const format = confirm('Click OK for PDF, Cancel for Excel');
  if (format) {
    generateComparativePDF(lastBacktestResults, 'Backtest Strategy Comparison');
  } else {
    generateComparativeExcel(lastBacktestResults, 'Backtest Strategy Comparison');
  }
}

function exportScanResults() {
  if (!currentResults || currentResults.length === 0) {
    alert('No scan results available. Please run a scan first.');
    return;
  }

  const allocation = appState.portfolio;
  const riskMetrics = appState.market;

  exportScanResultsToExcel(currentResults, allocation, riskMetrics);
}

window.renderBacktestResults = renderBacktestResults;
window.toggleSection = toggleSection;
window.exportBacktestToCSV = exportBacktestToCSV;
window.exportBacktestToExcelAdvanced = exportBacktestToExcelAdvanced;
window.exportBacktestToPDFAdvanced = exportBacktestToPDFAdvanced;
window.exportBacktestComparative = exportBacktestComparative;
window.exportScanResults = exportScanResults;

window.runBacktest = async function () {
  const [file, suffix] = document.getElementById('marketSelect').value.split('|');
  const topN = parseInt(document.getElementById('backtestTopN').value, 10);
  const rebalanceEvery = parseInt(document.getElementById('backtestRebalance').value, 10);
  const allocationMethod = document.getElementById('backtestAllocationMethod').value;
  const initialCapitalValue = parseFloat(document.getElementById('backtestInitialCapital').value);
  const initialCapital = Number.isFinite(initialCapitalValue) ? initialCapitalValue : undefined;
  const status = document.getElementById('backtestStatus');

  if (!file) {
    showInlineError(i18n.t('errors.select_market_first'));
    return;
  }

  status.innerText = i18n.t('status.preparing_backtest');

  try {
    const universeData = await loadUniverseData(file, suffix, status);
    const benchmark = await loadBenchmark(suffix);
    const benchmarkPrices = benchmark?.prices ?? null;

    if (!universeData.length) {
      status.innerText = i18n.t('errors.no_historical_data');
      return;
    }

    const results = [];
    const strategies = Object.entries(STRATEGY_PROFILES);

    for (const [strategyKey, strategyConfig] of strategies) {
      status.innerText = i18n.t('status.backtest_strategy', { strategy: strategyConfig.name });
      const result = backtesting.runStrategyBacktest({
        strategyKey,
        strategyConfig,
        universeData,
        topN,
        rebalanceEvery,
        allocationMethod,
        benchmarkPrices,
        initialCapital
      });
      results.push(result);
      await sleep(20);
    }

    status.innerText = i18n.t('status.backtest_completed');
    renderBacktestResults(results, rebalanceEvery);
  } catch (err) {
    console.error(i18n.t('errors.backtest_error'), err);
    status.innerText = i18n.t('errors.backtest_failed') + ': ' + err.message;
  }
};


// =====================================================
// MAIN SCANNING
// =====================================================

// Show warning dialog for "All Markets" scan
async function showAllMarketsWarning(marketCount) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #1e293b;
      border-radius: 16px;
      padding: 30px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      border: 2px solid #fbbf24;
    `;

    const currentLang = i18n.getCurrentLanguage();
    const isSpanish = currentLang === 'es';

    content.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 3em; margin-bottom: 10px;">⚠️</div>
        <h2 style="color: #fbbf24; margin-bottom: 15px; font-size: 1.5em;">
          ${isSpanish ? 'Advertencia: Escaneo Completo' : 'Warning: Full Scan'}
        </h2>
        <p style="color: #94a3b8; font-size: 1em; line-height: 1.6; margin-bottom: 20px;">
          ${isSpanish
            ? `Estás a punto de escanear <strong style="color: #38bdf8;">${marketCount} mercados</strong> diferentes. Este proceso puede tardar <strong style="color: #f87171;">varios minutos</strong> en completarse dependiendo de la cantidad de activos y la velocidad de tu conexión.`
            : `You are about to scan <strong style="color: #38bdf8;">${marketCount} different markets</strong>. This process may take <strong style="color: #f87171;">several minutes</strong> to complete depending on the number of assets and your connection speed.`
          }
        </p>
        <p style="color: #cbd5e1; font-size: 0.9em; margin-bottom: 25px;">
          ${isSpanish
            ? '¿Deseas continuar con el escaneo completo?'
            : 'Do you want to continue with the full scan?'
          }
        </p>
      </div>
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button id="cancelBtn" style="
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          background: #64748b;
          color: white;
          font-weight: bold;
          cursor: pointer;
          font-size: 1em;
          transition: all 0.3s ease;
        ">
          ${isSpanish ? '❌ Cancelar' : '❌ Cancel'}
        </button>
        <button id="proceedBtn" style="
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #0f172a;
          font-weight: bold;
          cursor: pointer;
          font-size: 1em;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
        ">
          ${isSpanish ? '✅ Continuar' : '✅ Proceed'}
        </button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    const proceedBtn = content.querySelector('#proceedBtn');
    const cancelBtn = content.querySelector('#cancelBtn');

    proceedBtn.addEventListener('mouseenter', () => {
      proceedBtn.style.transform = 'translateY(-2px)';
      proceedBtn.style.boxShadow = '0 6px 20px rgba(251, 191, 36, 0.6)';
    });

    proceedBtn.addEventListener('mouseleave', () => {
      proceedBtn.style.transform = 'translateY(0)';
      proceedBtn.style.boxShadow = '0 4px 12px rgba(251, 191, 36, 0.4)';
    });

    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = '#475569';
    });

    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = '#64748b';
    });

    proceedBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(true);
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(false);
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve(false);
      }
    });
  });
}

// Helper function to get all market options (excluding "ALL_MARKETS")
function getAllMarketOptions() {
  const marketSelect = document.getElementById('marketSelect');
  const markets = [];

  for (const option of marketSelect.options) {
    if (option.value && option.value !== 'ALL_MARKETS') {
      const [file, suffix] = option.value.split('|');
      markets.push({
        value: option.value,
        file,
        suffix,
        name: option.textContent.trim()
      });
    }
  }

  return markets;
}

// Helper function to scan a single market
async function scanSingleMarket(file, suffix, config, status, isPartOfAllMarkets = false) {
  const tbody = document.getElementById('results');
  const filterInfo = document.getElementById('filterInfo');

  if (!isPartOfAllMarkets) {
    // Solo limpiar si NO es parte del escaneo de todos los mercados
    tbody.innerHTML = '';
    currentResults = [];
    filterInfo.innerHTML = '';
  }

  status.innerText = i18n.t('status.loading_benchmark');
  benchmarkData = await loadBenchmark(suffix);

  status.innerText = i18n.t('status.loading_universe');
  const universe = await (await fetch(file)).json();

  let analyzed = 0;
  let filtered = 0;

  const BATCH_SIZE = 5;

  for (let i = 0; i < universe.length; i += BATCH_SIZE) {
    const batch = universe.slice(i, i + BATCH_SIZE);

    status.innerText = i18n.t('status.analyzing', {
      current: i + 1,
      total: universe.length
    }) + ` | ✓ ${analyzed} | ✖ ${filtered}`;

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
      applyFilters();
      updateSectorUI(sectorStats);
    }

    await sleep(50);
  }

  return { analyzed, filtered };
}

export async function runScan() {
  // 1. Prevent double execution if already running
  if (isScanning) return;

  const btnScan = document.getElementById('btnRunScan');

  try {
    // 2. Bloquear sistema
    isScanning = true;
    if (btnScan) {
      btnScan.disabled = true;
      btnScan.innerText = i18n.t('status.scanning');
      btnScan.style.opacity = '0.7';
      btnScan.style.cursor = 'wait';
    }

    const marketValue = document.getElementById('marketSelect').value;
    const strategyKey = document.getElementById('strategySelect').value;
    const config = STRATEGY_PROFILES[strategyKey];

    const status = document.getElementById('status');
    const tbody = document.getElementById('results');
    const filterInfo = document.getElementById('filterInfo');

    // Check if "ALL_MARKETS" is selected
    if (marketValue === 'ALL_MARKETS') {
      const allMarkets = getAllMarketOptions();

      // Show warning dialog
      const proceed = await showAllMarketsWarning(allMarkets.length);
      if (!proceed) {
        return; // User cancelled
      }

      // Clear results before starting
      tbody.innerHTML = '';
      currentResults = [];
      filterInfo.innerHTML = '';

      status.innerText = i18n.t('status.initializing');

      let totalAnalyzed = 0;
      let totalFiltered = 0;

      // Iterate through all markets
      for (let i = 0; i < allMarkets.length; i++) {
        const market = allMarkets[i];

        const progressMessage = i18n.t('status.scanning_market', {
          current: i + 1,
          total: allMarkets.length,
          market: market.name
        });

        status.innerText = progressMessage;

        // Update strategy info with current market being scanned
        const strategyInfo = document.getElementById('strategyInfo');
        if (strategyInfo) {
          strategyInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="font-size: 1.5em;">🌍</div>
              <div>
                <div style="font-weight: bold; color: #38bdf8; margin-bottom: 4px;">
                  ${i18n.getCurrentLanguage() === 'es' ? 'Escaneando Todos los Mercados' : 'Scanning All Markets'}
                </div>
                <div style="font-size: 0.9em; color: #94a3b8;">
                  ${i18n.getCurrentLanguage() === 'es'
                    ? `Mercado ${i + 1} de ${allMarkets.length}: <strong style="color: #10b981;">${market.name}</strong>`
                    : `Market ${i + 1} of ${allMarkets.length}: <strong style="color: #10b981;">${market.name}</strong>`
                  }
                </div>
                <div style="margin-top: 8px; background: #0f172a; border-radius: 4px; height: 6px; overflow: hidden;">
                  <div style="background: linear-gradient(90deg, #38bdf8 0%, #10b981 100%); height: 100%; width: ${((i + 1) / allMarkets.length * 100).toFixed(1)}%; transition: width 0.3s ease;"></div>
                </div>
              </div>
            </div>
          `;
        }

        const { analyzed, filtered } = await scanSingleMarket(
          market.file,
          market.suffix,
          config,
          status,
          true // isPartOfAllMarkets
        );

        totalAnalyzed += analyzed;
        totalFiltered += filtered;
      }

      // Final processing after all markets
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

      applyFilters();
      updateSectorUI(finalStats);

      status.innerText = i18n.t('status.all_markets_complete', { count: totalAnalyzed });
      filterInfo.innerHTML = i18n.t('filters.info', {
        approved: totalAnalyzed,
        filtered: totalFiltered
      });

      appState.scanResults = currentResults;
      appState.market = { file: 'ALL_MARKETS', suffix: '' };
      appState.strategy = strategyKey;
      appState.scanCompleted = true;
      updateStrategyInfoDisplay();
      await notifyStrongSignals(currentResults, strategyKey);

      // Show export button
      const exportButtons = document.getElementById('scanExportButtons');
      if (exportButtons && currentResults.length > 0) {
        exportButtons.style.display = 'block';
      }

      const canBuildPortfolio =
        appState.scanResults.filter(
          r => Array.isArray(r.pricesWithDates) && r.pricesWithDates.length >= 30
        ).length >= 3;

      const buildBtn = document.querySelector('button[onclick="buildPortfolio()"]');
      if (buildBtn) {
        buildBtn.disabled = !canBuildPortfolio;
      }

      if (!canBuildPortfolio) {
        showInlineError(i18n.t('errors.insufficient_assets_portfolio'));
      }

      const portfolioSection = document.getElementById('portfolioSection');
      if (portfolioSection && currentResults.length > 0) {
        portfolioSection.style.display = 'block';
      }

      return; // Exit after processing all markets
    }

    // Original single market logic
    const [file, suffix] = marketValue.split('|');

    // 3. Limpieza garantizada antes de empezar
    tbody.innerHTML = '';
    currentResults = []; // Limpiar array de memoria
    filterInfo.innerHTML = '';

    status.innerText = i18n.t('status.initializing');

    status.innerText = i18n.t('status.loading_benchmark');
    benchmarkData = await loadBenchmark(suffix);

    status.innerText = i18n.t('status.loading_universe');
    const universe = await (await fetch(file)).json();

    let analyzed = 0;
    let filtered = 0;

    const BATCH_SIZE = 5;

    for (let i = 0; i < universe.length; i += BATCH_SIZE) {
      const batch = universe.slice(i, i + BATCH_SIZE);

      status.innerText = i18n.t('status.analyzing', {
        current: i + 1,
        total: universe.length
      }) + ` | ✓ ${analyzed} | ✖ ${filtered}`;

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
        applyFilters();
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

    applyFilters();
    updateSectorUI(finalStats);

    status.innerText = i18n.t('status.scan_complete', { count: analyzed });
    filterInfo.innerHTML = i18n.t('filters.info', {
      approved: analyzed,
      filtered: filtered
    });

    appState.scanResults = currentResults;
    appState.market = { file, suffix };
    appState.strategy = strategyKey;
    appState.scanCompleted = true;
    updateStrategyInfoDisplay();
    await notifyStrongSignals(currentResults, strategyKey);

    // Show export button when results are available
    const exportButtons = document.getElementById('scanExportButtons');
    if (exportButtons && currentResults.length > 0) {
      exportButtons.style.display = 'block';
    }

    const canBuildPortfolio =
      appState.scanResults.filter(
        r => Array.isArray(r.pricesWithDates) && r.pricesWithDates.length >= 30
      ).length >= 3;

    const buildBtn = document.querySelector('button[onclick="buildPortfolio()"]');
    if (buildBtn) {
      buildBtn.disabled = !canBuildPortfolio;
    }

    if (!canBuildPortfolio) {
      showInlineError(i18n.t('errors.insufficient_assets_portfolio'));
    }

    // =====================================================
    // ML INTEGRATION: Machine Learning Analysis
    // =====================================================

    // 1. Initialize Performance Tracker (if not already loaded)
    if (!performanceTracker && appState.mlEnabled) {
      try {
        status.innerText = '🤖 Initializing ML Performance Tracker...';
        performanceTracker = await loadPerformanceTracker();
        console.log('✅ ML Performance Tracker loaded');
      } catch (e) {
        console.warn('Performance Tracker initialization failed, creating new:', e.message);
        performanceTracker = new PerformanceTracker();
      }
    }

    // 2. Detección de régimen (rule-based + ML)
    if (benchmarkData && benchmarkData.symbol) {
      try {
        status.innerText = i18n.t('status.detecting_regime');
        const benchmarkFullData = await loadYahooData(benchmarkData.symbol, '');
        if (!benchmarkFullData || benchmarkFullData.length === 0) {
          console.warn('No se pudieron cargar datos completos del benchmark para régimen');
        } else {
          const benchmarkPrices = benchmarkFullData.map(d => ({ date: d.date, close: d.close }));
          if (benchmarkPrices.length >= 200) {
            // Rule-based regime detection
            currentRegime = regime.detectMarketRegime(benchmarkPrices, currentResults);
            appState.regime = currentRegime;

            // ML-based regime prediction (enhanced)
            if (appState.mlEnabled) {
              try {
                status.innerText = '🤖 ML Regime Prediction...';
                const regimeFeatures = extractRegimeFeatures(benchmarkPrices, currentResults);

                // Note: This requires a trained model. For now, we'll use rule-based
                // In production, you would load a trained model and use predictRegimeML()
                mlRegimePrediction = {
                  regime: currentRegime.regime,
                  confidence: 0.75,
                  method: 'rule-based',
                  features: regimeFeatures,
                  timestamp: Date.now()
                };

                console.log('🤖 ML Regime Prediction:', mlRegimePrediction);
              } catch (e) {
                console.warn('ML Regime prediction failed:', e.message);
              }
            }

            renderRegimeIndicator(currentRegime);
            console.log('📊 Régimen detectado:', currentRegime);
          }
        }
      } catch (e) {
        console.error('Regime detection error:', e);
      }
    }

    // 3. ML Adaptive Score Adjustment
    if (appState.mlEnabled && performanceTracker && currentRegime) {
      try {
        status.innerText = '🤖 Applying ML Adaptive Scoring...';

        // Adjust scores based on historical performance
        currentResults = adjustScoresBatch(
          currentResults,
          strategyKey,
          currentRegime.regime,
          performanceTracker
        );

        // Update appState with adjusted results
        appState.scanResults = currentResults;

        console.log('✅ ML Adaptive scoring applied to', currentResults.length, 'assets');
      } catch (e) {
        console.warn('ML Adaptive scoring failed:', e.message);
      }
    }

    // 4. ML Anomaly Detection
    if (appState.mlEnabled && currentResults.length > 0) {
      try {
        status.innerText = '🤖 ML Anomaly Detection...';

        mlAnomalies = detectMLAnomalies(currentResults, null);
        const anomalySummary = getAnomalySummary(mlAnomalies);

        console.log('🔍 ML Anomalies detected:', anomalySummary);

        // Store ML anomalies in appState
        appState.mlAnomalies = mlAnomalies;
        appState.mlAnomalySummary = anomalySummary;
      } catch (e) {
        console.warn('ML Anomaly detection failed:', e.message);
      }
    }

    // 5. ML Recommendations Generation
    if (appState.mlEnabled && currentResults.length > 0) {
      try {
        status.innerText = '🤖 Generating ML Recommendations...';

        // Create portfolio-like structure for recommendations
        const mockPortfolio = {
          positions: {},
          sector_exposure: {}
        };

        const marketData = {
          volatility: benchmarkData?.volatility || 20,
          regime_prediction: mlRegimePrediction || { regime: currentRegime?.regime || 'neutral' },
          assets: currentResults.slice(0, 20) // Top 20 for recommendations
        };

        mlRecommendations = generateRecommendations(mockPortfolio, marketData, {});

        console.log('💡 ML Recommendations generated:', mlRecommendations.length);
        appState.mlRecommendations = mlRecommendations;
      } catch (e) {
        console.warn('ML Recommendations generation failed:', e.message);
      }
    }

    // 6. Render ML Results in UI
    if (appState.mlEnabled) {
      try {
        renderMLRecommendations();
        renderMLAnomalies();
        console.log('✅ ML UI rendered');
      } catch (e) {
        console.warn('ML UI rendering failed:', e.message);
      }
    }

    status.innerText = i18n.t('status.scan_complete', { count: analyzed });

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
    status.innerText = i18n.t('errors.scan_failed');
  } finally {
    // 4. Restaurar botón y estado al finalizar (incluso si hubo error)
    isScanning = false;
    if (btnScan) {
      btnScan.disabled = false;
      btnScan.innerText = i18n.t('buttons.runScan');
      btnScan.style.opacity = '1';
      btnScan.style.cursor = 'pointer';
    }
  }
}

// =====================================================
// PORTFOLIO CONSTRUCTION
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
    
    const portfolioDashboard = document.getElementById('portfolioDashboardSection');
    if (portfolioDashboard) {
      portfolioDashboard.style.display = 'block';
    }

    document.getElementById('portfolioResults').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error('Error en buildPortfolio:', err);
    showInlineError(`Error construyendo cartera: ${err.message}`);
  }
};

// =====================================================
// PORTFOLIO RENDERING
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
      <h3>${i18n.t('portfolio_section.summary_title')}</h3>
      <div class="risk-metrics">
        ${riskCard(i18n.t('portfolio_section.portfolio_volatility'), `${risk.portfolioVolatility}%`)}
        ${riskCard(i18n.t('portfolio_section.diversification_ratio'), `${risk.diversificationRatio}x`)}
        ${riskCard(i18n.t('portfolio_section.effective_n_assets'), risk.effectiveNAssets)}
        ${riskCard(i18n.t('portfolio_section.estimated_max_dd'), `${risk.estimatedMaxDD}%`)}
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
      <h3>${i18n.t('portfolio_section.advanced_risk_title')}</h3>

      ${riskReport.meta?.degraded ? `
        <div class="small-text" style="margin-bottom: 15px; color: #fbbf24;">
          ${i18n.t('portfolio_section.degraded_warning')}
          ${i18n.t('portfolio_section.excluded_assets')}: ${riskReport.meta.excludedAssets.join(', ')}
        </div>
      ` : ''}

      <div class="risk-grid-layout">
        <div class="risk-panel-dark">
          <h4>${i18n.t('portfolio_section.var_title')}</h4>
          <div style="font-size: 2em; color: #f43f5e; font-weight: bold; margin: 15px 0;">
            -€${riskReport.portfolioVaR.diversifiedVaR}
          </div>
          <div class="small-text">
            ${i18n.t('portfolio_section.max_loss_expected')}<br>
            <strong>${i18n.t('portfolio_section.undiversified')}:</strong> -€${riskReport.portfolioVaR.undiversifiedVaR}<br>
            <strong>${i18n.t('portfolio_section.diversification_benefit')}:</strong> ${riskReport.portfolioVaR.diversificationBenefit}%
          </div>
        </div>

        <div class="risk-panel-dark">
          <h4>${i18n.t('portfolio_section.riskiest_asset_title')}</h4>
          <div style="font-size: 1.5em; color: #fbbf24; font-weight: bold; margin: 15px 0;">
            ${riskReport.riskMetrics?.riskiestAsset?.ticker || 'N/A'} (${riskReport.riskMetrics?.riskiestAsset?.name})
          </div>
          <div class="small-text">
            <strong>${i18n.t('modal.volatility')}:</strong> ${riskReport.riskMetrics.riskiestAsset.volatility}%<br>
            <strong>${i18n.t('portfolio_section.portfolio_weight')}:</strong> ${riskReport.riskMetrics.riskiestAsset.weight}<br>
            <strong>${i18n.t('portfolio_section.concentration_risk')}:</strong> ${riskReport.riskMetrics.concentrationRisk}
          </div>
        </div>
      </div>

      <div style="margin-top: 20px;">
        <h4>${i18n.t('portfolio_section.correlation_matrix')}</h4>
        ${renderHeatmap(riskReport.correlationData.matrix)}
        <div class="small-text" style="margin-top: 10px;">
          <strong>${i18n.t('portfolio_section.avg_correlation')}:</strong> ${riskReport.correlationData.stats.average} |
          <strong>${i18n.t('portfolio_section.max_correlation')}:</strong> ${riskReport.correlationData.stats.max} |
          <strong>${i18n.t('portfolio_section.diversification_score')}:</strong> ${riskReport.riskMetrics.diversificationScore}/100
        </div>
      </div>

      <div style="margin-top: 20px;">
        <h4>${i18n.t('portfolio_section.stress_test_title')}</h4>
        <table class="stress-table">
          <thead>
            <tr>
              <th>${i18n.t('portfolio_section.scenario')}</th>
              <th>${i18n.t('portfolio_section.market')}</th>
              <th>${i18n.t('portfolio_section.your_loss')}</th>
              <th>${i18n.t('portfolio_section.portfolio_pct')}</th>
              <th>${i18n.t('portfolio_section.remaining_capital')}</th>
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
      <h3>${i18n.t('portfolio_section.allocation_table_title')} (${allocation.length} ${i18n.t('portfolio_section.top_n_assets').toLowerCase()})</h3>
      <table class="portfolio-table">
        <thead>
          <tr>
            <th>${i18n.t('table.ticker')}</th>
            <th>${i18n.t('table.name')}</th>
            <th>${i18n.t('table.weight')}</th>
            <th>${i18n.t('table.capital')}</th>
            <th>${i18n.t('table.score')}</th>
            <th>${i18n.t('modal.volatility')}</th>
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
      <h3>${i18n.t('portfolio_section.weight_chart_title')} (Top 10)</h3>
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
// TABLE RENDERING
// =====================================================

function renderTable(data) {
  const tbody = document.getElementById('results');
  const viewKey = document.getElementById('viewMode').value;
  tbody.innerHTML = '';

  if (!data.length) {
    const messageKey = appState.scanCompleted ? 'table.no_results' : 'table.waiting_data';
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #64748b;">
          ${i18n.t(messageKey)}
        </td>
      </tr>
    `;
    return;
  }

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
    tr.onclick = () => showDetails(r);

    tr.innerHTML = `
      <td class="rank-cell" style="color:#94a3b8; font-size:0.8em;">${idx + 1}</td>
      <td>
        <div style="font-weight:bold; color:#f8fafc;">${r.ticker} ${anomalyBadge}</div>
      </td>
      <td class="name-cell">
        <div style="font-weight: 600; color: #f8fafc; margin-bottom: 2px;">${r.name}</div>
        <div style="font-size: 0.7em; color: #94a3b8; text-transform: uppercase; display: flex; align-items: center; gap: 4px;">
           <span style="color: ${dotColor}; font-size: 1.2em;">•</span> ${r.sectorRaw || i18n.t('table.no_classification')}
        </div>
        </td>
        <td>${renderScorePill(displayScore)}</td>
        <td class="volume-cell">
        <span style="font-family: monospace; color:#38bdf8;">
        x${Number(r.vRatio || 1).toFixed(2)}
        </span>
        ${r.anomalyMetrics?.volumeZScore > 3 ?
        `<span style="cursor:help" title="${i18n.t('table.unusual_volume', { zscore: r.anomalyMetrics.volumeZScore.toFixed(2) })}">🔥</span>`
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

function getFilterState() {
  const searchInput = document.getElementById('searchInput');
  const signalFilter = document.getElementById('signalFilter');
  const minScoreInput = document.getElementById('minScore');
  const volumeFilter = document.getElementById('volumeFilter');

  return {
    query: searchInput?.value?.trim().toLowerCase() || '',
    signal: signalFilter?.value || 'all',
    minScore: Number(minScoreInput?.value || 0),
    volume: volumeFilter?.value || 'all'
  };
}

function updateFilterSummary(filteredCount, totalCount) {
  const summary = document.getElementById('filterSummary');
  if (!summary) return;
  summary.textContent = i18n.t('filters.summary', {
    shown: filteredCount,
    total: totalCount
  });
}

function applyFilters() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) {
    renderTable(currentResults);
    return;
  }

  const { query, signal, minScore, volume } = getFilterState();
  const viewKey = document.getElementById('viewMode')?.value || 'scoreTotal';

  const filtered = currentResults.filter(result => {
    const matchesQuery = !query
      || result.ticker?.toLowerCase().includes(query)
      || result.name?.toLowerCase().includes(query);
    const matchesSignal = signal === 'all' || result.signal?.key === signal;
    const viewScore = Number(result[viewKey] ?? result.scoreTotal ?? 0);
    const matchesScore = viewScore >= minScore;
    const matchesVolume = volume === 'all' || (Number(result.vRatio || 0) >= 2);

    return matchesQuery && matchesSignal && matchesScore && matchesVolume;
  }).sort((a, b) => {
    const scoreA = Number(a[viewKey] ?? a.scoreTotal ?? 0);
    const scoreB = Number(b[viewKey] ?? b.scoreTotal ?? 0);
    return scoreB - scoreA;
  });

  renderTable(filtered);
  updateFilterSummary(filtered.length, currentResults.length);
}

function resetFilters() {
  const searchInput = document.getElementById('searchInput');
  const signalFilter = document.getElementById('signalFilter');
  const minScoreInput = document.getElementById('minScore');
  const volumeFilter = document.getElementById('volumeFilter');
  const minScoreValue = document.getElementById('minScoreValue');

  if (searchInput) searchInput.value = '';
  if (signalFilter) signalFilter.value = 'all';
  if (minScoreInput) minScoreInput.value = '0';
  if (volumeFilter) volumeFilter.value = 'all';
  if (minScoreValue) minScoreValue.textContent = '0';

  applyFilters();
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
          ${i18n.t('regime_indicator.market_regime')}: ${regimeData.name}
        </div>
        <div style="font-size: 0.85em; color: #94a3b8;">
          ${regimeData.description}
        </div>
        <div style="margin-top: 8px; font-size: 0.8em; color: #64748b;">
          <strong>${i18n.t('regime_indicator.confidence')}:</strong> ${confidencePct}% |
          <strong>${i18n.t('regime_indicator.trend')}:</strong> ${regimeData.benchmarkAnalysis.details.trendDescription} |
          <strong>${i18n.t('regime_indicator.volatility')}:</strong> ${regimeData.benchmarkAnalysis.details.volDescription}
          ${regimeData.breadthAnalysis ? ` | <strong>${i18n.t('regime_indicator.breadth')}:</strong> ${regimeData.breadthAnalysis.breadth}% (${regimeData.breadthAnalysis.description})` : ''}
        </div>
      </div>
      <button
        onclick="showRegimeDetails()"
        style="padding: 8px 16px; background: ${regimeData.color}; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85em; white-space: nowrap;"
      >
        ${i18n.t('regime_indicator.view_details')}
      </button>
    </div>
  `;

  container.style.display = 'block';
}

// =====================================================
// ML RENDERING FUNCTIONS
// =====================================================

function renderMLRecommendations() {
  const container = document.getElementById('mlRecommendations');
  if (!container || !mlRecommendations.length) {
    if (container) container.style.display = 'none';
    return;
  }

  const priorityColors = {
    4: '#ef4444', // Critical
    3: '#f97316', // High
    2: '#fbbf24', // Medium
    1: '#3b82f6'  // Low
  };

  const priorityIcons = {
    4: '🚨',
    3: '⚠️',
    2: '💡',
    1: 'ℹ️'
  };

  const html = `
    <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #818cf8;">
      <h3 style="color: #818cf8; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
        🤖 ML Recommendations
        <span style="font-size: 0.7em; background: #334155; padding: 4px 12px; border-radius: 12px; color: #94a3b8;">
          ${mlRecommendations.length} insights
        </span>
      </h3>
      <div style="display: grid; gap: 12px;">
        ${mlRecommendations.slice(0, 10).map(rec => `
          <div style="background: #0f172a; padding: 15px; border-radius: 8px; border-left: 3px solid ${priorityColors[rec.priority.level]};">
            <div style="display: flex; align-items: start; gap: 10px; margin-bottom: 8px;">
              <span style="font-size: 1.5em;">${priorityIcons[rec.priority.level]}</span>
              <div style="flex: 1;">
                <div style="font-weight: bold; color: ${priorityColors[rec.priority.level]}; margin-bottom: 5px;">
                  ${rec.title}
                </div>
                <div style="color: #cbd5e1; font-size: 0.9em; margin-bottom: 8px;">
                  ${rec.message}
                </div>
                <div style="display: flex; gap: 15px; font-size: 0.8em; color: #64748b;">
                  <span><strong>Action:</strong> ${rec.action}</span>
                  <span><strong>Confidence:</strong> ${(rec.confidence * 100).toFixed(0)}%</span>
                  <span><strong>Type:</strong> ${rec.type}</span>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
  container.style.display = 'block';
}

function renderMLAnomalies() {
  const container = document.getElementById('mlAnomalies');
  if (!container || !mlAnomalies.length) {
    if (container) container.style.display = 'none';
    return;
  }

  const severityColors = {
    'extreme': '#dc2626',
    'high': '#f97316',
    'moderate': '#fbbf24'
  };

  const severityIcons = {
    'extreme': '🔴',
    'high': '🟠',
    'moderate': '🟡'
  };

  const summary = appState.mlAnomalySummary || {};

  const html = `
    <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #f43f5e;">
      <h3 style="color: #f87171; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
        🔍 ML Anomaly Detection
        <span style="font-size: 0.7em; background: #334155; padding: 4px 12px; border-radius: 12px; color: #94a3b8;">
          ${summary.total || 0} anomalies detected
        </span>
      </h3>

      ${summary.by_severity ? `
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          ${Object.entries(summary.by_severity).map(([severity, count]) => `
            <div style="background: #0f172a; padding: 8px 12px; border-radius: 6px; border: 1px solid ${severityColors[severity]};">
              <span style="font-size: 0.8em; color: #94a3b8;">${severity}:</span>
              <strong style="color: ${severityColors[severity]}; margin-left: 5px;">${count}</strong>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div style="display: grid; gap: 10px; max-height: 400px; overflow-y: auto;">
        ${mlAnomalies.slice(0, 15).map(anomaly => `
          <div style="background: #0f172a; padding: 12px; border-radius: 6px; border-left: 3px solid ${severityColors[anomaly.severity]};">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
              <span>${severityIcons[anomaly.severity]}</span>
              <strong style="color: #f8fafc;">${anomaly.ticker || 'N/A'}</strong>
              <span style="color: ${severityColors[anomaly.severity]}; font-size: 0.85em; font-weight: 600;">
                ${anomaly.type.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <div style="color: #94a3b8; font-size: 0.85em;">
              ${anomaly.description || 'Anomaly detected'}
            </div>
            ${anomaly.details ? `
              <div style="color: #64748b; font-size: 0.75em; margin-top: 5px;">
                ${JSON.stringify(anomaly.details).substring(0, 100)}...
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
  container.style.display = 'block';
}

function showDetails(result) {
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('modalContent');
  const d = result.details;

  const li = (labelKey, valueHtml) =>
    `<li>${i18n.t(labelKey)}: <strong>${valueHtml}</strong></li>`;

  const scoreCell = (labelKey, value) =>
    `<div>${i18n.t(labelKey)}: <strong>${value}</strong></div>`;

  const timeCard = (labelKey, value, style) => `
    <div style="${style}">
      <div style="font-size: 0.85em; margin-bottom: 5px;">
        ${i18n.t(labelKey)}
      </div>
      <strong style="font-size: 1.5em;">${value}</strong>
    </div>
  `;

  const anomaliesSection = result.hasAnomalies
    ? `
      <div class="detail-section" style="border-left: 4px solid #f43f5e; background: #450a0a;">
        <h3 style="color: #f43f5e;">🚨 ${i18n.t('details.anomalies_title')}</h3>
        <div style="margin-bottom: 10px; color: #fca5a5;">
          ${i18n.t('details.anomalies_penalty_text', { points: result.anomalyPenalty })}
        </div>
        <ul>
          ${li('details.anomaly_type', result.anomalies.join(', '))}
          <li>
            ${i18n.t('details.anomaly_volume_zscore')}: <strong>${result.anomalyMetrics.volumeZScore}</strong>
            (${i18n.t('details.anomaly_normal_lt', { value: '3.0' })})
          </li>
          <li>
            ${i18n.t('details.anomaly_sector_ratio')}: <strong>${result.anomalyMetrics.sectorRelVolume}x</strong>
            (${i18n.t('details.anomaly_normal_approx', { value: '1.0' })})
          </li>
          ${li('details.anomaly_return_1d', result.anomalyMetrics.priceReturn1d)}
        </ul>
      </div>
    `
    : '';

  content.innerHTML = `
    <h2>${result.ticker} - ${result.name}</h2>

    <div class="detail-section">
      <h3>📊 ${i18n.t('details.main_scores_title')}</h3>
      <div class="score-grid">
        ${scoreCell('details.total', result.scoreTotal)}
        ${scoreCell('details.trend', `${result.scoreTrend}/100`)}
        ${scoreCell('details.momentum', `${result.scoreMomentum}/100`)}
        ${scoreCell('details.risk', `${result.scoreRisk}/100`)}
        ${scoreCell('details.liquidity', `${result.scoreLiquidity}/100`)}
      </div>
    </div>

    <div class="detail-section">
      <h3>⏱️ ${i18n.t('details.time_analysis_title')}</h3>
      <div class="score-grid">
        ${timeCard(
          'details.short_term_6m',
          result.scoreShort,
          'background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);'
        )}
        ${timeCard(
          'details.medium_term_18m',
          result.scoreMedium,
          'background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);'
        )}
        ${timeCard(
          'details.long_term_4y',
          result.scoreLong,
          'background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);'
        )}
      </div>
    </div>

    <div class="detail-section">
      <h3>📈 ${i18n.t('details.trend_analysis_title')}</h3>
      <ul>
        ${li('details.position_score', d.trend.positionScore)}
        ${li('details.consistency_score', d.trend.consistencyScore)}
        ${li('details.adx_score', d.trend.adxScore)}
        ${li('details.ema50', d.trend.ema50)}
        ${li('details.ema200', d.trend.ema200)}
      </ul>
    </div>

    <div class="detail-section">
      <h3>🚀 ${i18n.t('details.momentum_analysis_title')}</h3>
      <ul>
        ${li('details.roc_6m', `${d.momentum.roc6m}%`)}
        ${li('details.roc_12m', `${d.momentum.roc12m}%`)}
        ${li('details.alpha_6m', `${d.momentum.alpha6m}%`)}
        ${li('details.alpha_12m', `${d.momentum.alpha12m}%`)}
        ${li('details.rsi', d.momentum.rsi)}
      </ul>
    </div>

    <div class="detail-section">
      <h3>⚠️ ${i18n.t('details.risk_analysis_title')}</h3>
      <ul>
        ${li('details.atr_pct', `${d.risk.atrPct}%`)}
        ${li('details.annual_volatility', `${d.risk.volatility}%`)}
        ${li('details.relative_volatility', d.risk.relativeVol)}
        ${li('details.max_drawdown_52w', `${d.risk.maxDrawdown}%`)}
      </ul>
    </div>

    ${anomaliesSection}

    <div class="detail-section">
      <h3>💧 ${i18n.t('details.liquidity_analysis_title')}</h3>
      <ul>
        ${li('details.avg_vol_20d', d.liquidity.avgVol20)}
        ${li('details.avg_vol_60d', d.liquidity.avgVol60)}
        ${li('details.volume_ratio', d.liquidity.volRatio)}
      </ul>
    </div>

    <div class="signal-summary" style="background: ${result.signal.color}20; border-left: 4px solid ${result.signal.color}">
      <h3>${i18n.t('details.signal')}: ${result.signal.text}</h3>
      <p>${i18n.t('details.confidence')}: ${result.signal.confidence}%</p>
    </div>
  `;

  modal.style.display = 'flex';
}

// Render governance
function renderGovernanceReport(governanceReport, complianceCheck) {
  const hasViolations = !complianceCheck.compliant;
  const statusColor = hasViolations ? '#f43f5e' : '#10b981';
  const statusText = hasViolations ? i18n.t('governance.status_with_alerts') : i18n.t('governance.status_compliant');

  return `
    <div class="governance-report" style="background: #1e293b; padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid ${statusColor};">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="color: ${statusColor}; margin: 0;">${i18n.t('governance.title')}</h3>
        <span style="padding: 8px 16px; background: ${statusColor}20; color: ${statusColor}; border-radius: 6px; font-weight: bold; font-size: 0.9em;">
          ${statusText}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div style="background: #0f172a; padding: 15px; border-radius: 8px;">
          <h4 style="color: #94a3b8; font-size: 0.9em; margin-bottom: 10px;">${i18n.t('governance.strategy_title')}</h4>
          <div style="color: #f8fafc; font-size: 1.1em; font-weight: bold; margin-bottom: 5px;">
            ${governanceReport.strategy.name}
          </div>
          <div style="color: #64748b; font-size: 0.85em;">
            ${i18n.t('governance.profile_label')}: ${governanceReport.strategy.profile}
          </div>
        </div>

        <div style="background: #0f172a; padding: 15px; border-radius: 8px;">
          <h4 style="color: #94a3b8; font-size: 0.9em; margin-bottom: 10px;">${i18n.t('governance.portfolio_summary_title')}</h4>
          <div style="color: #f8fafc; font-size: 0.9em;">
            <div>${i18n.t('governance.assets_label')}: <strong>${governanceReport.portfolio_summary.n_assets}</strong></div>
            <div>${i18n.t('governance.max_position_label')}: <strong>${(parseFloat(governanceReport.portfolio_summary.max_position) * 100).toFixed(2)}%</strong></div>
            <div>${i18n.t('governance.top3_concentration_label')}: <strong>${(parseFloat(governanceReport.portfolio_summary.top3_concentration) * 100).toFixed(2)}%</strong></div>
          </div>
        </div>
      </div>

      ${hasViolations ? `
        <div style="background: rgba(244, 63, 94, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #f43f5e;">
          <h4 style="color: #f43f5e; margin-bottom: 10px;">${i18n.t('governance.violations_count', { count: complianceCheck.violations.length })}</h4>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${complianceCheck.violations.map(v => `
              <li style="padding: 8px 0; border-bottom: 1px solid rgba(244, 63, 94, 0.2); color: #f8fafc; font-size: 0.9em;">
                <strong>${v.asset || i18n.t('governance.portfolio_label')}</strong>: ${v.message}
                <div style="color: #94a3b8; font-size: 0.85em; margin-top: 3px;">
                  ${i18n.t('governance.value_label')}: ${v.value} | ${i18n.t('governance.limit_label')}: ${v.limit}
                </div>
              </li>
            `).join('')}
          </ul>
          <div style="margin-top: 15px; padding: 10px; background: #0f172a; border-radius: 6px; font-size: 0.85em; color: #94a3b8;">
            ${i18n.t('governance.auto_corrections_applied')}
          </div>
        </div>
      ` : ''}

      ${complianceCheck.warnings.length > 0 ? `
        <div style="background: rgba(251, 191, 36, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #fbbf24; margin-top: 15px;">
          <h4 style="color: #fbbf24; margin-bottom: 10px;">${i18n.t('governance.warnings_count', { count: complianceCheck.warnings.length })}</h4>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${complianceCheck.warnings.slice(0, 3).map(w => `
              <li style="padding: 5px 0; color: #f8fafc; font-size: 0.85em;">
                ${w.asset || i18n.t('governance.portfolio_label')}: ${w.message}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
}

// Regime frontend

window.showRegimeDetails = function () {
  if (!appState.regime) return;

  const r = appState.regime;
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('modalContent');

  content.innerHTML = `
    <h2>${r.emoji} ${i18n.t('modal.regime_analysis')}</h2>

    <div class="detail-section">
      <h3>${i18n.t('governance.classification_title')}</h3>
      <div style="padding: 20px; background: ${r.color}20; border-left: 4px solid ${r.color}; border-radius: 8px;">
        <div style="font-size: 1.5em; font-weight: bold; color: ${r.color}; margin-bottom: 10px;">
          ${r.name}
        </div>
        <div style="color: #94a3b8; margin-bottom: 10px;">
          ${r.description}
        </div>
        <div style="font-size: 0.9em; color: #64748b;">
          <strong>${i18n.t('modal.confidence')}:</strong> ${(r.confidence * 100).toFixed(0)}%
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3>${i18n.t('modal.benchmark_signals')}</h3>
      <ul>
        <li>${i18n.t('modal.trend')}: <strong>${r.benchmarkAnalysis.details.trendDescription}</strong> (${r.benchmarkAnalysis.signals.trend > 0 ? '🟢' : r.benchmarkAnalysis.signals.trend < 0 ? '🔴' : '🟡'})</li>
        <li>${i18n.t('modal.vol_description')}: <strong>${r.benchmarkAnalysis.details.volDescription}</strong> (${r.benchmarkAnalysis.signals.volatility > 0 ? '🟢' : r.benchmarkAnalysis.signals.volatility < 0 ? '🔴' : '🟡'})</li>
        <li>${i18n.t('modal.momentum')}: <strong>${r.benchmarkAnalysis.details.momentumDescription}</strong> (${r.benchmarkAnalysis.signals.momentum > 0 ? '🟢' : r.benchmarkAnalysis.signals.momentum < 0 ? '🔴' : '🟡'})</li>
        <li>${i18n.t('modal.composite_score')}: <strong>${r.benchmarkAnalysis.signals.composite}</strong></li>
      </ul>
    </div>

    ${r.breadthAnalysis ? `
    <div class="detail-section">
      <h3>${i18n.t('modal.market_breadth')}</h3>
      <ul>
        <li>${i18n.t('modal.bullish_assets')}: <strong>${r.breadthAnalysis.bullishCount} / ${r.breadthAnalysis.totalAnalyzed}</strong></li>
        <li>${i18n.t('modal.percentage')}: <strong>${r.breadthAnalysis.breadth}%</strong></li>
        <li>${i18n.t('modal.description')}: <strong>${r.breadthAnalysis.description}</strong></li>
      </ul>
      <div style="margin-top: 15px; height: 8px; background: #334155; border-radius: 4px; overflow: hidden;">
        <div style="height: 100%; width: ${r.breadthAnalysis.breadth}%; background: ${r.color}; transition: width 0.3s ease;"></div>
      </div>
    </div>
    ` : ''}

    <div class="detail-section">
      <h3>⚙️ ${i18n.t('modal.strategy_adjustments')}</h3>
      <ul>
        <li>${i18n.t('modal.momentum_weight')}: <strong>${(r.strategyAdjustment.momentum_weight * 100).toFixed(0)}%</strong> 
        ${r.strategyAdjustment.momentum_weight > 1 ? i18n.t('modal.increase')
      : r.strategyAdjustment.momentum_weight < 1 ? i18n.t('modal.reduce') : i18n.t('modal.maintain')
    }</li>
        <li>${i18n.t('modal.risk_penalty')}: <strong>${(r.strategyAdjustment.risk_penalty * 100).toFixed(0)}%</strong> ${r.strategyAdjustment.risk_penalty > 1 ? i18n.t('modal.stricter') :
      r.strategyAdjustment.risk_penalty < 1 ? i18n.t('modal.more_permissive') : i18n.t('modal.normal')
    }</li>
        <li>${i18n.t('modal.min_score_adjustment')}: 
          <strong>${r.strategyAdjustment.min_score > 0 ? '+' : ''}${r.strategyAdjustment.min_score}</strong> ${i18n.t('modal.points')
    }</li>
      </ul>
    </div>

    <div class="detail-section" style="background: #0f172a; border-left: 4px solid #38bdf8;">
      <h3>${i18n.t('backtest_section.interpretation')}:</h3>
      <p style="color: #94a3b8; line-height: 1.6;">
        ${getRegimeInterpretation(r.regime)}
      </p>
    </div>
  `;

  modal.style.display = 'flex';
};

function getRegimeInterpretation(regimeType) {
  return i18n.t(`regime_indicator.interpretation.${regimeType}`, {
    defaultValue: i18n.t('regime_indicator.interpretation.unknown')
  });
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
  applyFilters();
}


function getSelectedOptionText(selectId) {
  const select = document.getElementById(selectId);
  const option = select?.selectedOptions?.[0];
  return option ? option.textContent.trim() : '';
}

function updateStrategyInfoDisplay() {
  const strategyInfo = document.getElementById('strategyInfo');
  if (!strategyInfo) return;

  if (appState.scanCompleted) {
    const marketLabel = getSelectedOptionText('marketSelect');
    const strategyLabel = getSelectedOptionText('strategySelect');
    strategyInfo.removeAttribute('data-i18n');
    strategyInfo.textContent = i18n.t('info.scan_complete', {
      strategy: strategyLabel,
      market: marketLabel
    });
    return;
  }

  strategyInfo.setAttribute('data-i18n', 'info.select_strategy_market');
  strategyInfo.textContent = i18n.t('info.select_strategy_market');
}




// =====================================================
// LANGUAGE MANAGEMENT
// =====================================================

window.changeLanguage = function (lang) {
  i18n.setLanguage(lang);
  // The languageChanged event will be dispatched automatically
  // and will update all elements with data-i18n attributes
};

// Function to clear all displayed results
function clearAllResults() {
  // Clear table results
  const tbody = document.getElementById('results');
  if (tbody) {
    tbody.innerHTML = `<tr>
      <td colspan="6" style="text-align: center; padding: 40px; color: #64748b;" data-i18n="table.waiting_data">
        Esperando datos de análisis...
      </td>
    </tr>`;
  }

  // Clear portfolio section
  const portfolioSection = document.getElementById('portfolioSection');
  const portfolioResults = document.getElementById('portfolioResults');
  if (portfolioSection) portfolioSection.style.display = 'none';
  if (portfolioResults) {
    portfolioResults.style.display = 'none';
    portfolioResults.innerHTML = '';
  }

  // Clear backtest results
  const backtestResults = document.getElementById('backtestResults');
  if (backtestResults) {
    backtestResults.style.display = 'none';
    backtestResults.innerHTML = '';
  }

  // Clear sector summary
  const sectorSummary = document.getElementById('sectorSummary');
  if (sectorSummary) sectorSummary.innerHTML = '';

  // Clear regime indicator
  const regimeIndicator = document.getElementById('regimeIndicator');
  if (regimeIndicator) {
    regimeIndicator.style.display = 'none';
    regimeIndicator.innerHTML = '';
  }

  // Reset status
  const status = document.getElementById('status');
  if (status) {
    status.innerHTML = `<span data-i18n="info.system_ready">🎯 Sistema listo. Configura parámetros y ejecuta el análisis.</span>`;
  }

  // Clear filter info
  const filterInfo = document.getElementById('filterInfo');
  if (filterInfo) {
    filterInfo.innerHTML = `<span data-i18n="info.waiting_scan">Esperando escaneo...</span>`;
  }

  // Clear internal state
  currentResults = [];
  currentRegime = null;
  lastBacktestResults = [];
  appState.scanResults = [];
  appState.portfolio = null;
  appState.scanCompleted = false;
  updateStrategyInfoDisplay();
  resetFilters();
}

// Initialize language selector and market selector on page load
document.addEventListener('DOMContentLoaded', () => {
  const selector = document.getElementById('languageSelect');
  if (selector) {
    selector.value = i18n.getCurrentLanguage();
  }

  updateStrategyInfoDisplay();
  window.addEventListener('languageChanged', () => {
    updateStrategyInfoDisplay();
    applyFilters(); 
  });

  // Add event listener to market selector to clear results when changed
  const marketSelect = document.getElementById('marketSelect');
  if (marketSelect) {
    marketSelect.addEventListener('change', () => {
      clearAllResults();
    });
  }

  const searchInput = document.getElementById('searchInput');
  const signalFilter = document.getElementById('signalFilter');
  const minScoreInput = document.getElementById('minScore');
  const volumeFilter = document.getElementById('volumeFilter');
  const minScoreValue = document.getElementById('minScoreValue');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
  if (signalFilter) {
    signalFilter.addEventListener('change', applyFilters);
  }
  if (volumeFilter) {
    volumeFilter.addEventListener('change', applyFilters);
  }
  if (minScoreInput) {
    minScoreInput.addEventListener('input', () => {
      if (minScoreValue) {
        minScoreValue.textContent = minScoreInput.value;
      }
      applyFilters();
    });
  }
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', resetFilters);
  }

  applyFilters();


  // Initialize Portfolio Dashboard
  initDashboard().catch(err => {
    console.error('Error initializing portfolio dashboard:', err);
  });
});

window.runScan = runScan;
window.updateView = updateView;
window.closeModal = closeModal;
window.appState = appState;