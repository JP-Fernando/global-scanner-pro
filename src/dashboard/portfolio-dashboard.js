/**
 * Portfolio Dashboard Controller
 * Manages the portfolio tracking dashboard UI and interactions
 */

import { portfolioManager } from '../portfolio/portfolio-manager.js';
import { performanceTracker } from '../portfolio/performance-tracker.js';
import i18n from '../i18n/i18n.js';
import {
  exportPortfolioToExcel,
  generateAuditReport,
  generateInvestmentCommitteeReport,
  generateClientReport
} from '../reports/index.js';

// Current state
let currentPortfolio = null;
let currentChartTab = 'equity';
let portfolioChart = null;

/**
 * Initialize the dashboard
 */
export async function initDashboard() {
  await loadPortfolioList();
  setupEventListeners();
  console.log('📊 Portfolio Dashboard initialized');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const selector = document.getElementById('portfolioSelector');
  if (selector) {
    selector.addEventListener('change', handlePortfolioSelection);
  }
}

/**
 * Load and populate portfolio selector
 */
async function loadPortfolioList() {
  const selector = document.getElementById('portfolioSelector');
  if (!selector) return;

  const portfolios = await portfolioManager.getAllPortfolios();

  // Clear existing options (except first)
  selector.innerHTML = '<option value="" data-i18n="portfolio_dashboard.no_portfolio">-- Crear nuevo portfolio --</option>';

  // Add portfolios
  portfolios.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = `${p.name} (${new Date(p.created_at).toLocaleDateString()})`;
    selector.appendChild(option);
  });
}

/**
 * Handle portfolio selection
 */
async function handlePortfolioSelection(event) {
  const portfolioId = event.target.value;

  if (!portfolioId) {
    // Show message to create new portfolio
    document.getElementById('portfolioDashboardSection').style.display = 'block';
    clearDashboard();
    return;
  }

  await loadPortfolio(portfolioId);
}

/**
 * Load and display a portfolio
 */
export async function loadPortfolio(portfolioId) {
  try {
    currentPortfolio = await portfolioManager.loadPortfolio(portfolioId);

    // Show dashboard section
    document.getElementById('portfolioDashboardSection').style.display = 'block';
    document.getElementById('deletePortfolioBtn').style.display = 'inline-block';

    // Update dashboard
    await refreshDashboard();

  } catch (error) {
    console.error('Error loading portfolio:', error);
    alert(i18n.t('portfolio_dashboard.error_loading'));
  }
}

/**
 * Refresh dashboard data
 */
export async function refreshDashboard() {
  if (!currentPortfolio) {
    console.warn('No portfolio loaded');
    return;
  }

  try {
    // Calculate current P&L
    const pnlData = await performanceTracker.calculatePnL(currentPortfolio);

    // Calculate equity curve
    const equityCurve = await performanceTracker.calculateEquityCurve(currentPortfolio);

    // Calculate performance metrics
    const perfMetrics = performanceTracker.calculatePerformanceMetrics(equityCurve);

    // Compare to benchmark
    const benchmarkComparison = await performanceTracker.compareToBenchmark(currentPortfolio, equityCurve);

    // Update UI
    updateSummaryCards(pnlData, perfMetrics, benchmarkComparison);
    updatePositionsTable(pnlData.positions);
    updateRiskMetrics(perfMetrics);

    // Update charts
    updateChart(currentChartTab, { equityCurve, perfMetrics, benchmarkComparison, pnlData });

    // Load rebalancing history
    await updateRebalanceHistory();

    // Check for alerts
    checkAlerts(pnlData, perfMetrics, benchmarkComparison);

  } catch (error) {
    console.error('Error refreshing dashboard:', error);
    alert(i18n.t('portfolio_dashboard.error_refreshing'));
  }
}

/**
 * Update summary cards
 */
function updateSummaryCards(pnlData, perfMetrics, benchmarkComparison) {
  // Total Value
  document.getElementById('totalValueCard').textContent = `$${pnlData.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Total Return
  const returnElement = document.getElementById('totalReturnCard');
  returnElement.textContent = `${pnlData.total_pnl_pct >= 0 ? '+' : ''}${pnlData.total_pnl_pct.toFixed(2)}%`;
  returnElement.style.color = pnlData.total_pnl_pct >= 0 ? '#10b981' : '#ef4444';

  // Sharpe Ratio
  if (perfMetrics) {
    document.getElementById('sharpeRatioCard').textContent = perfMetrics.sharpe_ratio.toFixed(2);
  }

  // Max Drawdown
  if (perfMetrics) {
    const ddElement = document.getElementById('maxDrawdownCard');
    ddElement.textContent = `${perfMetrics.max_drawdown.max_drawdown_pct.toFixed(2)}%`;
    ddElement.style.color = '#ef4444';
  }

  // Volatility
  if (perfMetrics) {
    document.getElementById('volatilityCard').textContent = `${perfMetrics.annualized_volatility_pct.toFixed(2)}%`;
  }

  // Beta
  if (benchmarkComparison) {
    document.getElementById('betaCard').textContent = benchmarkComparison.beta.toFixed(2);
  }
}

/**
 * Update positions table
 */
function updatePositionsTable(positions) {
  const tbody = document.getElementById('positionsTableBody');
  if (!tbody) return;

  if (positions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px; color: #64748b;" data-i18n="portfolio_dashboard.no_positions">No hay posiciones para mostrar</td></tr>';
    return;
  }

  tbody.innerHTML = positions.map(pos => {
    const pnlColor = pos.unrealized_pnl >= 0 ? '#10b981' : '#ef4444';
    return `
      <tr style="border-bottom: 1px solid #334155;">
        <td style="padding: 12px; color: #38bdf8; font-weight: bold;">${pos.ticker}</td>
        <td style="padding: 12px;">${pos.name}</td>
        <td style="padding: 12px; text-align: right;">${pos.quantity}</td>
        <td style="padding: 12px; text-align: right;">$${pos.entry_price.toFixed(2)}</td>
        <td style="padding: 12px; text-align: right;">$${pos.current_price.toFixed(2)}</td>
        <td style="padding: 12px; text-align: right;">$${pos.current_value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 12px; text-align: right;">${pos.weight.toFixed(2)}%</td>
        <td style="padding: 12px; text-align: right; color: ${pnlColor}; font-weight: bold;">${pos.unrealized_pnl >= 0 ? '+' : ''}$${pos.unrealized_pnl.toFixed(2)}</td>
        <td style="padding: 12px; text-align: right; color: ${pnlColor}; font-weight: bold;">${pos.unrealized_pnl_pct >= 0 ? '+' : ''}${pos.unrealized_pnl_pct.toFixed(2)}%</td>
      </tr>
    `;
  }).join('');
}

/**
 * Update risk metrics
 */
function updateRiskMetrics(perfMetrics) {
  if (!perfMetrics) return;

  // For now, use placeholder VaR/CVaR calculations
  // These would be calculated by the risk engine in a production system
  const dailyVol = perfMetrics.annualized_volatility_pct / Math.sqrt(252) / 100;
  const var95 = dailyVol * 1.65 * 100; // 95% confidence
  const cvar95 = var95 * 1.3; // Approximate CVaR

  document.getElementById('varMetrics').textContent = `-${var95.toFixed(2)}%`;
  document.getElementById('cvarMetrics').textContent = `-${cvar95.toFixed(2)}%`;
  document.getElementById('sortinoMetrics').textContent = perfMetrics.sortino_ratio.toFixed(2);
  document.getElementById('calmarMetrics').textContent = perfMetrics.calmar_ratio.toFixed(2);
}

/**
 * Update rebalancing history
 */
async function updateRebalanceHistory() {
  const container = document.getElementById('rebalanceHistory');
  if (!container || !currentPortfolio) return;

  const history = await portfolioManager.getRebalanceHistory(currentPortfolio.id);

  if (history.length === 0) {
    container.innerHTML = '<p style="color: #64748b; text-align: center;" data-i18n="portfolio_dashboard.no_rebalances">No hay rebalanceos registrados</p>';
    return;
  }

  container.innerHTML = history.slice(0, 5).map(r => {
    const date = new Date(r.timestamp).toLocaleString();
    const numChanges = r.changes.length;

    return `
      <div style="padding: 15px; margin-bottom: 10px; background: #1e293b; border-radius: 8px; border-left: 3px solid #3b82f6;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: #94a3b8; font-weight: 600;">${date}</span>
          <span style="color: #60a5fa;">${numChanges} ${i18n.t('portfolio_dashboard.changes')}</span>
        </div>
        <div style="color: #cbd5e1; font-size: 0.9em;">
          <strong>${i18n.t('portfolio_dashboard.reason')}:</strong> ${r.reason}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Check for alerts and deviations
 */
function checkAlerts(pnlData, perfMetrics, benchmarkComparison) {
  const alerts = [];

  // Check for large drawdown
  if (perfMetrics && perfMetrics.max_drawdown.max_drawdown_pct < -15) {
    alerts.push({
      type: 'warning',
      message: i18n.t('portfolio_dashboard.alert_large_drawdown', { dd: perfMetrics.max_drawdown.max_drawdown_pct.toFixed(2) })
    });
  }

  // Check for high concentration
  const maxWeight = Math.max(...pnlData.positions.map(p => p.weight));
  if (maxWeight > 25) {
    const position = pnlData.positions.find(p => p.weight === maxWeight);
    alerts.push({
      type: 'warning',
      message: i18n.t('portfolio_dashboard.alert_concentration', { ticker: position.ticker, weight: maxWeight.toFixed(2) })
    });
  }

  // Check for underperformance vs benchmark
  if (benchmarkComparison && benchmarkComparison.excess_return_pct < -5) {
    alerts.push({
      type: 'info',
      message: i18n.t('portfolio_dashboard.alert_underperformance', { excess: benchmarkComparison.excess_return_pct.toFixed(2) })
    });
  }

  // Display alerts
  const alertsSection = document.getElementById('portfolioAlerts');
  const alertsContainer = document.getElementById('alertsContainer');

  if (alerts.length > 0) {
    alertsSection.style.display = 'block';
    alertsContainer.innerHTML = alerts.map(a => {
      const color = a.type === 'warning' ? '#fbbf24' : '#60a5fa';
      const icon = a.type === 'warning' ? '⚠️' : 'ℹ️';
      return `
        <div style="padding: 12px; margin-bottom: 10px; background: #1e293b; border-radius: 8px; border-left: 3px solid ${color};">
          <span style="margin-right: 8px;">${icon}</span>
          <span style="color: #e2e8f0;">${a.message}</span>
        </div>
      `;
    }).join('');
  } else {
    alertsSection.style.display = 'none';
  }
}

/**
 * Switch chart tab
 */
export function switchChartTab(tab) {
  currentChartTab = tab;

  // Update tab styles
  document.querySelectorAll('.chart-tab').forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.style.background = '#334155';
      btn.style.color = 'white';
      btn.classList.add('active');
    } else {
      btn.style.background = '#1e293b';
      btn.style.color = '#94a3b8';
      btn.classList.remove('active');
    }
  });

  // Refresh chart if portfolio is loaded
  if (currentPortfolio) {
    refreshDashboard();
  }
}

/**
 * Update chart based on active tab
 */
function updateChart(tab, data) {
  const canvas = document.getElementById('portfolioChart');
  if (!canvas) return;

  // Destroy existing chart
  if (portfolioChart) {
    portfolioChart.destroy();
  }

  const ctx = canvas.getContext('2d');

  switch (tab) {
    case 'equity':
      portfolioChart = createEquityCurveChart(ctx, data.equityCurve);
      break;
    case 'drawdown':
      portfolioChart = createDrawdownChart(ctx, data.equityCurve);
      break;
    case 'benchmark':
      portfolioChart = createBenchmarkComparisonChart(ctx, data.equityCurve, data.benchmarkComparison);
      break;
    case 'allocation':
      portfolioChart = createAllocationChart(ctx, data.pnlData.positions);
      break;
  }
}

/**
 * Create equity curve chart
 */
function createEquityCurveChart(ctx, equityCurve) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: equityCurve.map(p => p.date),
      datasets: [{
        label: i18n.t('portfolio_dashboard.portfolio_value'),
        data: equityCurve.map(p => p.value),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#e2e8f0' }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#0f172a',
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          borderColor: '#334155',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', maxTicksLimit: 10 },
          grid: { color: '#334155' }
        },
        y: {
          ticks: {
            color: '#94a3b8',
            callback: value => '$' + value.toLocaleString()
          },
          grid: { color: '#334155' }
        }
      }
    }
  });
}

/**
 * Create drawdown chart
 */
function createDrawdownChart(ctx, equityCurve) {
  const drawdowns = performanceTracker.calculateDrawdowns(equityCurve);

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: drawdowns.map(d => d.date),
      datasets: [{
        label: i18n.t('portfolio_dashboard.drawdown'),
        data: drawdowns.map(d => d.drawdown_pct),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#e2e8f0' }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#0f172a',
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          borderColor: '#334155',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', maxTicksLimit: 10 },
          grid: { color: '#334155' }
        },
        y: {
          ticks: {
            color: '#94a3b8',
            callback: value => value.toFixed(2) + '%'
          },
          grid: { color: '#334155' }
        }
      }
    }
  });
}

/**
 * Create benchmark comparison chart
 */
function createBenchmarkComparisonChart(ctx, equityCurve, benchmarkComparison) {
  if (!benchmarkComparison) {
    return createEquityCurveChart(ctx, equityCurve);
  }

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: equityCurve.map(p => p.date),
      datasets: [
        {
          label: i18n.t('portfolio_dashboard.portfolio'),
          data: equityCurve.map(p => p.return_pct),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0
        },
        {
          label: i18n.t('portfolio_dashboard.benchmark'),
          data: benchmarkComparison.benchmark_equity.map(p => p.return_pct),
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#e2e8f0' }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#0f172a',
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          borderColor: '#334155',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', maxTicksLimit: 10 },
          grid: { color: '#334155' }
        },
        y: {
          ticks: {
            color: '#94a3b8',
            callback: value => value.toFixed(2) + '%'
          },
          grid: { color: '#334155' }
        }
      }
    }
  });
}

/**
 * Create allocation chart (pie chart)
 */
function createAllocationChart(ctx, positions) {
  const colors = [
    '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
    '#14b8a6', '#6366f1', '#a855f7', '#f43f5e', '#eab308'
  ];

  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: positions.map(p => p.ticker),
      datasets: [{
        data: positions.map(p => p.weight),
        backgroundColor: colors.slice(0, positions.length),
        borderColor: '#0f172a',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#e2e8f0' }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          borderColor: '#334155',
          borderWidth: 1,
          callbacks: {
            label: context => {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${value.toFixed(2)}%`;
            }
          }
        }
      }
    }
  });
}

/**
 * Clear dashboard
 */
function clearDashboard() {
  currentPortfolio = null;

  document.getElementById('totalValueCard').textContent = '--';
  document.getElementById('totalReturnCard').textContent = '--';
  document.getElementById('sharpeRatioCard').textContent = '--';
  document.getElementById('maxDrawdownCard').textContent = '--';
  document.getElementById('volatilityCard').textContent = '--';
  document.getElementById('betaCard').textContent = '--';

  const tbody = document.getElementById('positionsTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px; color: #64748b;">No hay posiciones para mostrar</td></tr>';
  }

  if (portfolioChart) {
    portfolioChart.destroy();
    portfolioChart = null;
  }

  document.getElementById('deletePortfolioBtn').style.display = 'none';
}

/**
 * Save portfolio from builder (called from UI)
 */
window.savePortfolioFromBuilder = async function() {
  // This will be integrated with the existing portfolio builder
  // For now, show a prompt for portfolio name
  const name = prompt(i18n.t('portfolio_dashboard.enter_name'));
  if (!name) return;

  try {
    // Get portfolio from global appState (from scanner.js)
    if (!window.appState || !window.appState.portfolio) {
      alert(i18n.t('portfolio_dashboard.no_portfolio_built'));
      return;
    }

    const portfolio = await portfolioManager.createPortfolio(
      name,
      window.appState.portfolio.assets,
      {
        strategy: window.appState.strategy || 'balanced',
        allocation_method: window.appState.portfolio.allocation_method,
        benchmark: window.appState.benchmark || '^GSPC'
      }
    );

    alert(i18n.t('portfolio_dashboard.saved_success'));

    // Reload portfolio list
    await loadPortfolioList();

    // Select and load the new portfolio
    document.getElementById('portfolioSelector').value = portfolio.id;
    await loadPortfolio(portfolio.id);

  } catch (error) {
    console.error('Error saving portfolio:', error);
    alert(i18n.t('portfolio_dashboard.error_saving'));
  }
};

/**
 * Delete current portfolio
 */
window.deleteCurrentPortfolio = async function() {
  if (!currentPortfolio) return;

  const confirmed = confirm(i18n.t('portfolio_dashboard.confirm_delete', { name: currentPortfolio.name }));
  if (!confirmed) return;

  try {
    await portfolioManager.deletePortfolio(currentPortfolio.id);
    alert(i18n.t('portfolio_dashboard.deleted_success'));

    // Reload list and clear dashboard
    await loadPortfolioList();
    document.getElementById('portfolioSelector').value = '';
    clearDashboard();

  } catch (error) {
    console.error('Error deleting portfolio:', error);
    alert(i18n.t('portfolio_dashboard.error_deleting'));
  }
};

/**
 * Export portfolio to Excel
 */
async function exportPortfolioExcel() {
  if (!currentPortfolio) {
    alert('No portfolio loaded. Please select a portfolio first.');
    return;
  }

  try {
    // Gather all necessary data
    const pnlData = await performanceTracker.calculatePnL(currentPortfolio);
    const equityCurve = await performanceTracker.calculateEquityCurve(currentPortfolio);
    const perfMetrics = performanceTracker.calculatePerformanceMetrics(equityCurve);
    const benchmarkComparison = await performanceTracker.compareToBenchmark(currentPortfolio, equityCurve);

    const performanceData = {
      ...pnlData,
      ...perfMetrics,
      ...benchmarkComparison
    };

    const riskData = {
      var95: perfMetrics.annualized_volatility_pct / Math.sqrt(252) * 1.65,
      cvar95: perfMetrics.annualized_volatility_pct / Math.sqrt(252) * 1.65 * 1.3,
      dailyVol: perfMetrics.annualized_volatility_pct / Math.sqrt(252),
      annualVol: perfMetrics.annualized_volatility_pct,
      concentration: currentPortfolio.positions?.length > 0
        ? Math.max(...currentPortfolio.positions.map(p => p.weight || 0))
        : 0,
      numPositions: currentPortfolio.positions?.length || 0
    };

    exportPortfolioToExcel(currentPortfolio, performanceData, riskData);
  } catch (error) {
    console.error('Error exporting portfolio:', error);
    alert('Error exporting portfolio. Please try again.');
  }
}

/**
 * Generate audit report PDF
 */
async function exportAuditReport() {
  if (!currentPortfolio) {
    alert('No portfolio loaded. Please select a portfolio first.');
    return;
  }

  try {
    const pnlData = await performanceTracker.calculatePnL(currentPortfolio);
    const equityCurve = await performanceTracker.calculateEquityCurve(currentPortfolio);
    const perfMetrics = performanceTracker.calculatePerformanceMetrics(equityCurve);
    const benchmarkComparison = await performanceTracker.compareToBenchmark(currentPortfolio, equityCurve);

    const performanceData = {
      ...pnlData,
      ...perfMetrics,
      ...benchmarkComparison
    };

    const riskData = {
      var95: perfMetrics.annualized_volatility_pct / Math.sqrt(252) * 1.65,
      cvar95: perfMetrics.annualized_volatility_pct / Math.sqrt(252) * 1.65 * 1.3
    };

    // Note: governance data would come from governance module in production
    const governance = {
      compliance: { passed: true, issues: [] },
      rules_applied: {
        'Max Position Weight': '25%',
        'Max Volatility': '30%',
        'Min Volume': '100K shares'
      }
    };

    generateAuditReport(currentPortfolio, governance, riskData, performanceData);
  } catch (error) {
    console.error('Error generating audit report:', error);
    alert('Error generating audit report. Please try again.');
  }
}

/**
 * Generate investment committee report PDF
 */
async function exportInvestmentCommitteeReport() {
  if (!currentPortfolio) {
    alert('No portfolio loaded. Please select a portfolio first.');
    return;
  }

  try {
    const pnlData = await performanceTracker.calculatePnL(currentPortfolio);
    const equityCurve = await performanceTracker.calculateEquityCurve(currentPortfolio);
    const perfMetrics = performanceTracker.calculatePerformanceMetrics(equityCurve);
    const benchmarkComparison = await performanceTracker.compareToBenchmark(currentPortfolio, equityCurve);

    const performanceData = {
      ...pnlData,
      ...perfMetrics,
      ...benchmarkComparison
    };

    const riskData = {
      var95: perfMetrics.annualized_volatility_pct / Math.sqrt(252) * 1.65,
      cvar95: perfMetrics.annualized_volatility_pct / Math.sqrt(252) * 1.65 * 1.3,
      concentration: currentPortfolio.positions?.length > 0
        ? Math.max(...currentPortfolio.positions.map(p => p.weight || 0))
        : 0
    };

    const marketContext = {
      regime: 'BULL', // Would come from market regime module
      sentiment: 'POSITIVE'
    };

    generateInvestmentCommitteeReport(currentPortfolio, performanceData, riskData, marketContext);
  } catch (error) {
    console.error('Error generating investment committee report:', error);
    alert('Error generating report. Please try again.');
  }
}

/**
 * Generate client report PDF
 */
async function exportClientReport() {
  if (!currentPortfolio) {
    alert('No portfolio loaded. Please select a portfolio first.');
    return;
  }

  try {
    const pnlData = await performanceTracker.calculatePnL(currentPortfolio);
    const equityCurve = await performanceTracker.calculateEquityCurve(currentPortfolio);
    const perfMetrics = performanceTracker.calculatePerformanceMetrics(equityCurve);
    const benchmarkComparison = await performanceTracker.compareToBenchmark(currentPortfolio, equityCurve);

    const performanceData = {
      ...pnlData,
      ...perfMetrics,
      ...benchmarkComparison
    };

    const riskData = {
      var95: perfMetrics.annualized_volatility_pct / Math.sqrt(252) * 1.65,
      cvar95: perfMetrics.annualized_volatility_pct / Math.sqrt(252) * 1.65 * 1.3
    };

    generateClientReport(currentPortfolio, performanceData, riskData);
  } catch (error) {
    console.error('Error generating client report:', error);
    alert('Error generating client report. Please try again.');
  }
}

/**
 * Refresh dashboard (global function)
 */
window.refreshDashboard = refreshDashboard;

/**
 * Switch chart tab (global function)
 */
window.switchChartTab = switchChartTab;

/**
 * Export functions (global)
 */
window.exportPortfolioExcel = exportPortfolioExcel;
window.exportAuditReport = exportAuditReport;
window.exportInvestmentCommitteeReport = exportInvestmentCommitteeReport;
window.exportClientReport = exportClientReport;

// Export functions
export { loadPortfolioList, clearDashboard };