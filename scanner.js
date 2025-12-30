// =====================================================
// GLOBAL QUANT SCANNER - VERSIÓN PROFESIONAL
// =====================================================

import { STRATEGY_PROFILES, MARKET_BENCHMARKS } from './config.js';
import * as ind from './indicators.js';
import * as scoring from './scoring.js';
import * as allocation from './allocation.js';
import * as risk from './risk_engine.js';
import * as regime from './market_regime.js';
import * as governance from './governance.js';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));
let currentResults = [];
let benchmarkData = null;
let currentRegime = null;

const appState = {
  scanResults: [],
  portfolio: null,
  market: null,
  strategy: null
};

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

    return r.timestamp.map((t, i) => {
      if (adj[i] == null || isNaN(adj[i])) return null;

      return {
        date: new Date(t * 1000).toISOString().split('T')[0], // YYYY-MM-DD
        close: adj[i],
        volume: q.volume[i],
        high: q.high?.[i] ?? adj[i],
        low: q.low?.[i] ?? adj[i]
      };
    }).filter(Boolean);
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

export async function runScan() {
  const [file, suffix] = document.getElementById('marketSelect').value.split('|');
  const strategyKey = document.getElementById('strategySelect').value;
  const config = STRATEGY_PROFILES[strategyKey];

  const status = document.getElementById('status');
  const tbody = document.getElementById('results');
  const filterInfo = document.getElementById('filterInfo');

  tbody.innerHTML = '';
  currentResults = [];
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

    for (const res of batchResults) {
      if (res?.passed) {
        currentResults.push(res);
        analyzed++;
      } else {
        filtered++;
      }
    }

    if (i % (BATCH_SIZE * 2) === 0) {
      renderTable(currentResults);
    }

    await sleep(50);
  }

  currentResults.sort((a, b) => b.scoreTotal - a.scoreTotal);
  renderTable(currentResults);

  status.innerText = `✅ Escaneo completado. ${analyzed} activos encontrados.`;
  filterInfo.innerHTML = `✅ ${analyzed} aprobados | ❌ ${filtered} filtrados`;

  // Guardar en estado global
  appState.scanResults = currentResults;
  appState.market = { file, suffix };
  appState.strategy = strategyKey;

  // ✅ Validar si se puede construir cartera con análisis de riesgo
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
    try {
      status.innerText = '🔍 Detectando régimen de mercado...';

      // Cargar precios completos del benchmark
      const benchmarkFullData = await loadYahooData(benchmarkData.symbol, '');

      if (!benchmarkFullData || benchmarkFullData.length === 0) {
        console.warn('No se pudieron cargar datos completos del benchmark para régimen');
        status.innerText = `✅ Escaneo completado. ${analyzed} activos encontrados.`;
      } else {
        const benchmarkPrices = benchmarkFullData.map(d => ({
          date: d.date,
          close: d.close
        }));

        if (benchmarkPrices.length < 200) {
          console.warn('Datos insuficientes para detectar régimen');
          status.innerText = `✅ Escaneo completado. ${analyzed} activos encontrados.`;
        } else {
          // Detectar régimen
          currentRegime = regime.detectMarketRegime(benchmarkPrices, currentResults);

          // Guardar en estado
          appState.regime = currentRegime;

          // Renderizar indicador de régimen
          renderRegimeIndicator(currentRegime);

          console.log('📊 Régimen detectado:', currentRegime);

          // Actualizar status después de completar
          status.innerText = `✅ Escaneo completado. ${analyzed} activos encontrados.`;
        }
      }
    } catch (err) {
      console.error('Error detectando régimen de mercado:', err);
      status.innerText = `✅ Escaneo completado. ${analyzed} activos encontrados.`;
    }
  }

  // Mostrar sección de construcción de cartera
  const portfolioSection = document.getElementById('portfolioSection');
  if (portfolioSection && currentResults.length > 0) {
    portfolioSection.style.display = 'block';

    // Regime option
    const regimeOption = document.getElementById('regimeAdjustmentOption');
    if (regimeOption && appState.regime) {
      regimeOption.style.display = 'block';
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
            ${riskReport.riskMetrics?.riskiestAsset?.ticker || 'N/A'}
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
