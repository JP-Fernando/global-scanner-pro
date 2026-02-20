/**
 * Attribution Analysis Dashboard
 * Visualizations for performance attribution analysis
 */

import { attributionAnalyzer } from '../analytics/attribution-analysis.js';
import { performanceTracker } from '../portfolio/performance-tracker.js';
import i18n from '../i18n/i18n.js';
import { filterMarketEvents } from '../data/market-events.js';
import type { Portfolio } from '../types/index.js';

interface SectorAllocation {
  sector: string;
  portfolio_weight: number;
  benchmark_weight: number;
  weight_difference: number;
  contribution: number;
}

interface SectorSelection {
  sector: string;
  portfolio_return: number;
  benchmark_return: number;
  return_difference: number;
  contribution: number;
}

interface BrinsonAttribution {
  allocation_effect: { total: number; by_sector: SectorAllocation[] };
  selection_effect: { total: number; by_sector: SectorSelection[] };
  interaction_effect: { total: number; by_sector: any[] };
  total_active_return: number;
  interpretation: string[];
}

interface FactorDetail {
  total_contribution: number;
  top_contributors: FactorContributor[];
}

interface FactorContributor {
  ticker: string;
  name: string;
  factor_score: number;
  weight: number;
  contribution: number;
}

interface FactorAttribution {
  summary: { trend_pct: number; momentum_pct: number; risk_pct: number; liquidity_pct: number };
  trend: FactorDetail;
  momentum: FactorDetail;
  risk: FactorDetail;
  liquidity: FactorDetail;
}

interface AssetContrib {
  ticker: string;
  name: string;
  sector: string;
  weight: number;
  return: number;
  contribution: number;
}

interface AssetAttribution {
  top_contributors: AssetContrib[];
  top_detractors: AssetContrib[];
}

interface PeriodEntry {
  period: string;
  portfolio_return: number;
  benchmark_return: number;
  excess_return: number;
}

interface PeriodAttribution {
  monthly: PeriodEntry[];
  quarterly: PeriodEntry[];
}

interface EventEntry {
  event_name: string;
  description: string;
  start_date: string;
  end_date: string;
  portfolio_return: number;
  benchmark_return: number;
  excess_return: number;
  portfolio_max_drawdown: number;
}

interface EventAttribution {
  summary: { total_events: number; outperformed: number; underperformed: number; average_excess_return: number };
  events: EventEntry[];
}

interface AttributionAnalysisData {
  summary: {
    total_return: number;
    benchmark_return: number;
    excess_return: number;
    active_positions: number;
    analysis_period: { start: string; end: string; days: number };
  };
  brinson: BrinsonAttribution;
  factors: FactorAttribution | null;
  assets: AssetAttribution;
  periods: PeriodAttribution;
  events?: EventAttribution | null;
}

export class AttributionDashboard {
  container: HTMLElement | null;
  currentPortfolio: Portfolio | null;
  attributionData: AttributionAnalysisData | null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId);
    this.currentPortfolio = null;
    this.attributionData = null;
  }

  /**
   * Initialize the dashboard with portfolio data
   * @param {Object} portfolio - Portfolio object
   */
  async initialize(portfolio: Portfolio): Promise<void> {
    this.currentPortfolio = portfolio;

    if (!this.container) {
      console.error('Attribution dashboard container not found');
      return;
    }

    // Show loading state
    this.container!.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>${i18n.t('attribution.loading_attribution_analysis')}</p>
      </div>
    `;

    try {
      // Load portfolio data
      const portfolioReturns = await performanceTracker.calculateEquityCurve(portfolio);

      // Load benchmark data
      const benchmark = portfolio.benchmark || '^GSPC';
      const fromDate = portfolioReturns[0]?.date || portfolio.created_at.split('T')[0];
      const toDate = portfolioReturns[portfolioReturns.length - 1]?.date || new Date().toISOString().split('T')[0];

      const benchmarkPrices = await performanceTracker.loadPriceData(benchmark, fromDate, toDate);
      const benchmarkReturns = benchmarkPrices.map((p: { date: string; price: number }) => ({
        date: p.date,
        value: p.price
      }));

      // Calculate attribution
      this.attributionData = attributionAnalyzer.calculateAttribution(
        portfolio,
        portfolioReturns,
        benchmarkReturns
      );


      const events = filterMarketEvents(fromDate, toDate);
      const eventAttribution = events.length
        ? attributionAnalyzer.calculateEventAttribution(
          portfolioReturns,
          benchmarkReturns,
          events
        )
        : null;

      (this.attributionData as AttributionAnalysisData).events = eventAttribution;


      // Render dashboard
      this.render();
    } catch (error) {
      console.error('Error initializing attribution dashboard:', error);
      this.showError((error as Error).message);
    }
  }

  /**
   * Render the complete dashboard
   */
  render(): void {
    if (!this.attributionData) {
      this.showError('No attribution data available');
      return;
    }

    const html = `
      <div class="attribution-dashboard">
        <!-- Header with Summary -->
        ${this.renderHeader()}

        <!-- Tab Navigation -->
        <div class="attribution-tabs">
          <button class="tab-btn active" data-tab="brinson">${i18n.t('attribution.allocation_vs_selection')}</button>
          <button class="tab-btn" data-tab="factors">${i18n.t('attribution.factor_contribution')}</button>
          <button class="tab-btn" data-tab="assets">${i18n.t('attribution.asset_contribution')}</button>
          <button class="tab-btn" data-tab="periods">${i18n.t('attribution.period_attribution')}</button>
          <button class="tab-btn" data-tab="events">${i18n.t('attribution.event_attribution')}</button>
        </div>

        <!-- Tab Content -->
        <div class="attribution-content">
          <div id="brinson-tab" class="tab-content active">
            ${this.renderBrinsonAnalysis()}
          </div>

          <div id="factors-tab" class="tab-content">
            ${this.renderFactorAnalysis()}
          </div>

          <div id="assets-tab" class="tab-content">
            ${this.renderAssetAnalysis()}
          </div>

          <div id="periods-tab" class="tab-content">
            ${this.renderPeriodAnalysis()}
          </div>

          <div id="events-tab" class="tab-content">
            ${this.renderEventAnalysis()}
          </div>

        </div>
      </div>
    `;

    this.container!.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Render header with summary statistics
   */
  renderHeader(): string {
    const { summary } = this.attributionData!;

    return `
      <div class="attribution-header">
        <h2>${i18n.t('attribution.performance_attribution_analysis')}</h2>

        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-label">${i18n.t('attribution.portfolio_return')}</div>
            <div class="card-value ${summary.total_return >= 0 ? 'positive' : 'negative'}">
              ${(summary.total_return * 100).toFixed(2)}%
            </div>
          </div>

          <div class="summary-card">
            <div class="card-label">${i18n.t('attribution.benchmark_return')}</div>
            <div class="card-value ${summary.benchmark_return >= 0 ? 'positive' : 'negative'}">
              ${(summary.benchmark_return * 100).toFixed(2)}%
            </div>
          </div>

          <div class="summary-card highlight">
            <div class="card-label">${i18n.t('attribution.excess_return')}</div>
            <div class="card-value ${summary.excess_return >= 0 ? 'positive' : 'negative'}">
              ${(summary.excess_return * 100).toFixed(2)}%
            </div>
          </div>

          <div class="summary-card">
            <div class="card-label">${i18n.t('attribution.analysis_period')}</div>
            <div class="card-value small">
              ${summary.analysis_period.days} ${i18n.t('attribution.days')}
            </div>
            <div class="card-subtitle">
              ${summary.analysis_period.start} - ${summary.analysis_period.end}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Brinson Attribution (Allocation vs Selection)
   */
  renderBrinsonAnalysis(): string {
    const { brinson } = this.attributionData!;

    return `
      <div class="brinson-analysis">
        <div class="section-header">
          <h3>${i18n.t('attribution.brinson_fachler_attribution')}</h3>
          <p class="section-description">${i18n.t('attribution.brinson_description')}</p>
        </div>

        <!-- Summary Chart -->
        <div class="brinson-summary">
          <div class="effect-card">
            <div class="effect-label">${i18n.t('attribution.allocation_effect')}</div>
            <div class="effect-value ${brinson.allocation_effect.total >= 0 ? 'positive' : 'negative'}">
              ${brinson.allocation_effect.total.toFixed(2)}%
            </div>
            <div class="effect-bar">
              <div class="bar-fill allocation" style="width: ${Math.abs(brinson.allocation_effect.total) * 10}%"></div>
            </div>
          </div>

          <div class="effect-card">
            <div class="effect-label">${i18n.t('attribution.selection_effect')}</div>
            <div class="effect-value ${brinson.selection_effect.total >= 0 ? 'positive' : 'negative'}">
              ${brinson.selection_effect.total.toFixed(2)}%
            </div>
            <div class="effect-bar">
              <div class="bar-fill selection" style="width: ${Math.abs(brinson.selection_effect.total) * 10}%"></div>
            </div>
          </div>

          <div class="effect-card">
            <div class="effect-label">${i18n.t('attribution.interaction_effect')}</div>
            <div class="effect-value ${brinson.interaction_effect.total >= 0 ? 'positive' : 'negative'}">
              ${brinson.interaction_effect.total.toFixed(2)}%
            </div>
            <div class="effect-bar">
              <div class="bar-fill interaction" style="width: ${Math.abs(brinson.interaction_effect.total) * 10}%"></div>
            </div>
          </div>

          <div class="effect-card highlight">
            <div class="effect-label">${i18n.t('attribution.total_active_return')}</div>
            <div class="effect-value ${brinson.total_active_return >= 0 ? 'positive' : 'negative'}">
              ${brinson.total_active_return.toFixed(2)}%
            </div>
          </div>
        </div>

        <!-- Interpretation -->
        <div class="interpretation-box">
          <h4>${i18n.t('attribution.interpretation')}</h4>
          ${brinson.interpretation.map((text: string) => `<p>• ${text}</p>`).join('')}
        </div>

        <!-- Allocation by Sector -->
        <div class="sector-breakdown">
          <h4>${i18n.t('attribution.allocation_effect_by_sector')}</h4>
          <table class="attribution-table">
            <thead>
              <tr>
                <th>${i18n.t('attribution.sector')}</th>
                <th>${i18n.t('attribution.portfolio_weight')}</th>
                <th>${i18n.t('attribution.benchmark_weight')}</th>
                <th>${i18n.t('attribution.difference')}</th>
                <th>${i18n.t('attribution.contribution')}</th>
              </tr>
            </thead>
            <tbody>
              ${brinson.allocation_effect.by_sector.map((sector: SectorAllocation) => `
                <tr>
                  <td>${sector.sector}</td>
                  <td>${sector.portfolio_weight.toFixed(2)}%</td>
                  <td>${sector.benchmark_weight.toFixed(2)}%</td>
                  <td class="${sector.weight_difference >= 0 ? 'positive' : 'negative'}">
                    ${sector.weight_difference >= 0 ? '+' : ''}${sector.weight_difference.toFixed(2)}%
                  </td>
                  <td class="${sector.contribution >= 0 ? 'positive' : 'negative'}">
                    ${sector.contribution >= 0 ? '+' : ''}${sector.contribution.toFixed(2)}%
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Selection by Sector -->
        <div class="sector-breakdown">
          <h4>${i18n.t('attribution.selection_effect_by_sector')}</h4>
          <table class="attribution-table">
            <thead>
              <tr>
                <th>${i18n.t('attribution.sector')}</th>
                <th>${i18n.t('attribution.portfolio_return')}</th>
                <th>${i18n.t('attribution.benchmark_return')}</th>
                <th>${i18n.t('attribution.difference')}</th>
                <th>${i18n.t('attribution.contribution')}</th>
              </tr>
            </thead>
            <tbody>
              ${brinson.selection_effect.by_sector.map((sector: SectorSelection) => `
                <tr>
                  <td>${sector.sector}</td>
                  <td>${sector.portfolio_return.toFixed(2)}%</td>
                  <td>${sector.benchmark_return.toFixed(2)}%</td>
                  <td class="${sector.return_difference >= 0 ? 'positive' : 'negative'}">
                    ${sector.return_difference >= 0 ? '+' : ''}${sector.return_difference.toFixed(2)}%
                  </td>
                  <td class="${sector.contribution >= 0 ? 'positive' : 'negative'}">
                    ${sector.contribution >= 0 ? '+' : ''}${sector.contribution.toFixed(2)}%
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Render Factor Attribution Analysis
   */
  renderFactorAnalysis(): string {
    const { factors } = this.attributionData!;

    if (!factors) {
      return `<div class="no-data">${i18n.t('attribution.factor_data_not_available')}</div>`;
    }

    return `
      <div class="factor-analysis">
        <div class="section-header">
          <h3>${i18n.t('attribution.factor_contribution_analysis')}</h3>
          <p class="section-description">${i18n.t('attribution.factor_description')}</p>
        </div>

        <!-- Factor Summary -->
        <div class="factor-summary">
          <div class="factor-pie-chart">
            <canvas id="factor-pie-chart"></canvas>
          </div>

          <div class="factor-breakdown">
            <div class="factor-card">
              <div class="factor-icon trend"></div>
              <div class="factor-info">
                <div class="factor-label">${i18n.t('attribution.trend')}</div>
                <div class="factor-value">${factors.summary.trend_pct.toFixed(1)}%</div>
                <div class="factor-contribution ${factors.trend.total_contribution >= 0 ? 'positive' : 'negative'}">
                  ${factors.trend.total_contribution >= 0 ? '+' : ''}${factors.trend.total_contribution.toFixed(2)}%
                </div>
              </div>
            </div>

            <div class="factor-card">
              <div class="factor-icon momentum"></div>
              <div class="factor-info">
                <div class="factor-label">${i18n.t('attribution.momentum')}</div>
                <div class="factor-value">${factors.summary.momentum_pct.toFixed(1)}%</div>
                <div class="factor-contribution ${factors.momentum.total_contribution >= 0 ? 'positive' : 'negative'}">
                  ${factors.momentum.total_contribution >= 0 ? '+' : ''}${factors.momentum.total_contribution.toFixed(2)}%
                </div>
              </div>
            </div>

            <div class="factor-card">
              <div class="factor-icon risk"></div>
              <div class="factor-info">
                <div class="factor-label">${i18n.t('attribution.risk')}</div>
                <div class="factor-value">${factors.summary.risk_pct.toFixed(1)}%</div>
                <div class="factor-contribution ${factors.risk.total_contribution >= 0 ? 'positive' : 'negative'}">
                  ${factors.risk.total_contribution >= 0 ? '+' : ''}${factors.risk.total_contribution.toFixed(2)}%
                </div>
              </div>
            </div>

            <div class="factor-card">
              <div class="factor-icon liquidity"></div>
              <div class="factor-info">
                <div class="factor-label">${i18n.t('attribution.liquidity')}</div>
                <div class="factor-value">${factors.summary.liquidity_pct.toFixed(1)}%</div>
                <div class="factor-contribution ${factors.liquidity.total_contribution >= 0 ? 'positive' : 'negative'}">
                  ${factors.liquidity.total_contribution >= 0 ? '+' : ''}${factors.liquidity.total_contribution.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Contributors by Factor -->
        ${this.renderFactorContributors('trend', factors.trend.top_contributors)}
        ${this.renderFactorContributors('momentum', factors.momentum.top_contributors)}
        ${this.renderFactorContributors('risk', factors.risk.top_contributors)}
        ${this.renderFactorContributors('liquidity', factors.liquidity.top_contributors)}
      </div>
    `;
  }

  /**
   * Render factor contributors table
   */
  renderFactorContributors(factorName: string, contributors: FactorContributor[]): string {
    return `
      <div class="factor-contributors">
        <h4>${i18n.t(`attribution.top_${factorName}_contributors`)}</h4>
        <table class="attribution-table">
          <thead>
            <tr>
              <th>${i18n.t('attribution.ticker')}</th>
              <th>${i18n.t('attribution.name')}</th>
              <th>${i18n.t('attribution.factor_score')}</th>
              <th>${i18n.t('attribution.weight')}</th>
              <th>${i18n.t('attribution.contribution')}</th>
            </tr>
          </thead>
          <tbody>
            ${contributors.map((asset: FactorContributor) => `
              <tr>
                <td><strong>${asset.ticker}</strong></td>
                <td>${asset.name}</td>
                <td>${asset.factor_score.toFixed(0)}</td>
                <td>${asset.weight.toFixed(2)}%</td>
                <td class="${asset.contribution >= 0 ? 'positive' : 'negative'}">
                  ${asset.contribution >= 0 ? '+' : ''}${asset.contribution.toFixed(2)}%
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render Asset Contribution Analysis
   */
  renderAssetAnalysis(): string {
    const { assets } = this.attributionData!;

    return `
      <div class="asset-analysis">
        <div class="section-header">
          <h3>${i18n.t('attribution.individual_asset_contribution')}</h3>
          <p class="section-description">${i18n.t('attribution.asset_contribution_description')}</p>
        </div>

        <!-- Top Contributors -->
        <div class="asset-section">
          <h4>${i18n.t('attribution.top_contributors')}</h4>
          <table class="attribution-table">
            <thead>
              <tr>
                <th>${i18n.t('attribution.ticker')}</th>
                <th>${i18n.t('attribution.name')}</th>
                <th>${i18n.t('attribution.sector')}</th>
                <th>${i18n.t('attribution.weight')}</th>
                <th>${i18n.t('attribution.return')}</th>
                <th>${i18n.t('attribution.contribution')}</th>
              </tr>
            </thead>
            <tbody>
              ${assets.top_contributors.map((asset: AssetContrib) => `
                <tr>
                  <td><strong>${asset.ticker}</strong></td>
                  <td>${asset.name}</td>
                  <td>${asset.sector}</td>
                  <td>${asset.weight.toFixed(2)}%</td>
                  <td class="${asset.return >= 0 ? 'positive' : 'negative'}">
                    ${asset.return >= 0 ? '+' : ''}${asset.return.toFixed(2)}%
                  </td>
                  <td class="${asset.contribution >= 0 ? 'positive' : 'negative'}">
                    ${asset.contribution >= 0 ? '+' : ''}${asset.contribution.toFixed(2)}%
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Top Detractors -->
        ${assets.top_detractors.length > 0 ? `
          <div class="asset-section">
            <h4>${i18n.t('attribution.top_detractors')}</h4>
            <table class="attribution-table">
              <thead>
                <tr>
                  <th>${i18n.t('attribution.ticker')}</th>
                  <th>${i18n.t('attribution.name')}</th>
                  <th>${i18n.t('attribution.sector')}</th>
                  <th>${i18n.t('attribution.weight')}</th>
                  <th>${i18n.t('attribution.return')}</th>
                  <th>${i18n.t('attribution.contribution')}</th>
                </tr>
              </thead>
              <tbody>
                ${assets.top_detractors.map((asset: AssetContrib) => `
                  <tr>
                    <td><strong>${asset.ticker}</strong></td>
                    <td>${asset.name}</td>
                    <td>${asset.sector}</td>
                    <td>${asset.weight.toFixed(2)}%</td>
                    <td class="${asset.return >= 0 ? 'positive' : 'negative'}">
                      ${asset.return >= 0 ? '+' : ''}${asset.return.toFixed(2)}%
                    </td>
                    <td class="${asset.contribution >= 0 ? 'positive' : 'negative'}">
                      ${asset.contribution >= 0 ? '+' : ''}${asset.contribution.toFixed(2)}%
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render Period Attribution Analysis
   */
  renderPeriodAnalysis(): string {
    const { periods } = this.attributionData!;

    return `
      <div class="period-analysis">
        <div class="section-header">
          <h3>${i18n.t('attribution.period_based_attribution')}</h3>
          <p class="section-description">${i18n.t('attribution.period_attribution_description')}</p>
        </div>

        <!-- Monthly Attribution -->
        <div class="period-section">
          <h4>${i18n.t('attribution.monthly_attribution')}</h4>
          <div class="period-chart">
            <canvas id="monthly-chart"></canvas>
          </div>
          <table class="attribution-table">
            <thead>
              <tr>
                <th>${i18n.t('attribution.period')}</th>
                <th>${i18n.t('attribution.portfolio_return')}</th>
                <th>${i18n.t('attribution.benchmark_return')}</th>
                <th>${i18n.t('attribution.excess_return')}</th>
              </tr>
            </thead>
            <tbody>
              ${periods.monthly.slice(-12).reverse().map((period: PeriodEntry) => `
                <tr>
                  <td>${period.period}</td>
                  <td class="${period.portfolio_return >= 0 ? 'positive' : 'negative'}">
                    ${period.portfolio_return >= 0 ? '+' : ''}${period.portfolio_return.toFixed(2)}%
                  </td>
                  <td class="${period.benchmark_return >= 0 ? 'positive' : 'negative'}">
                    ${period.benchmark_return >= 0 ? '+' : ''}${period.benchmark_return.toFixed(2)}%
                  </td>
                  <td class="${period.excess_return >= 0 ? 'positive' : 'negative'}">
                    ${period.excess_return >= 0 ? '+' : ''}${period.excess_return.toFixed(2)}%
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Quarterly Attribution -->
        <div class="period-section">
          <h4>${i18n.t('attribution.quarterly_attribution')}</h4>
          <table class="attribution-table">
            <thead>
              <tr>
                <th>${i18n.t('attribution.period')}</th>
                <th>${i18n.t('attribution.portfolio_return')}</th>
                <th>${i18n.t('attribution.benchmark_return')}</th>
                <th>${i18n.t('attribution.excess_return')}</th>
              </tr>
            </thead>
            <tbody>
              ${periods.quarterly.reverse().map((period: any) => `
                <tr>
                  <td>${period.period}</td>
                  <td class="${period.portfolio_return >= 0 ? 'positive' : 'negative'}">
                    ${period.portfolio_return >= 0 ? '+' : ''}${period.portfolio_return.toFixed(2)}%
                  </td>
                  <td class="${period.benchmark_return >= 0 ? 'positive' : 'negative'}">
                    ${period.benchmark_return >= 0 ? '+' : ''}${period.benchmark_return.toFixed(2)}%
                  </td>
                  <td class="${period.excess_return >= 0 ? 'positive' : 'negative'}">
                    ${period.excess_return >= 0 ? '+' : ''}${period.excess_return.toFixed(2)}%
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }


  /**
   * Render Market Event Attribution Analysis
   */
  renderEventAnalysis() {
    const { events } = this.attributionData!;

    if (!events || !events.events || !events.events.length) {
      return `<div class="no-data">${i18n.t('attribution.no_data')}</div>`;
    }

    return `
      <div class="event-analysis">
        <div class="section-header">
          <h3>${i18n.t('attribution.event_attribution')}</h3>
          <p class="section-description">${i18n.t('attribution.event_attribution_description')}</p>
        </div>

        <div class="event-summary">
          <div class="summary-pill">
            <span>${i18n.t('attribution.total_events')}</span>
            <strong>${events.summary.total_events}</strong>
          </div>
          <div class="summary-pill">
            <span>${i18n.t('attribution.outperformed')}</span>
            <strong>${events.summary.outperformed}</strong>
          </div>
          <div class="summary-pill">
            <span>${i18n.t('attribution.underperformed')}</span>
            <strong>${events.summary.underperformed}</strong>
          </div>
          <div class="summary-pill">
            <span>${i18n.t('attribution.avg_excess_return')}</span>
            <strong>${events.summary.average_excess_return.toFixed(2)}%</strong>
          </div>
        </div>

        <table class="attribution-table">
          <thead>
            <tr>
              <th>${i18n.t('attribution.event_name')}</th>
              <th>${i18n.t('attribution.event_description')}</th>
              <th>${i18n.t('attribution.start_date')}</th>
              <th>${i18n.t('attribution.end_date')}</th>
              <th>${i18n.t('attribution.portfolio_return')}</th>
              <th>${i18n.t('attribution.benchmark_return')}</th>
              <th>${i18n.t('attribution.excess_return')}</th>
              <th>${i18n.t('attribution.max_drawdown')}</th>
              <th>${i18n.t('attribution.relative_performance')}</th>
            </tr>
          </thead>
          <tbody>
            ${events.events.map((event: any) => `
              <tr>
                <td><strong>${event.event_name}</strong></td>
                <td>${event.description}</td>
                <td>${event.start_date}</td>
                <td>${event.end_date}</td>
                <td class="${event.portfolio_return >= 0 ? 'positive' : 'negative'}">
                  ${event.portfolio_return >= 0 ? '+' : ''}${event.portfolio_return.toFixed(2)}%
                </td>
                <td class="${event.benchmark_return >= 0 ? 'positive' : 'negative'}">
                  ${event.benchmark_return >= 0 ? '+' : ''}${event.benchmark_return.toFixed(2)}%
                </td>
                <td class="${event.excess_return >= 0 ? 'positive' : 'negative'}">
                  ${event.excess_return >= 0 ? '+' : ''}${event.excess_return.toFixed(2)}%
                </td>
                <td class="${event.portfolio_max_drawdown >= 0 ? 'positive' : 'negative'}">
                  ${event.portfolio_max_drawdown.toFixed(2)}%
                </td>
                <td class="${event.excess_return >= 0 ? 'positive' : 'negative'}">
                  ${event.excess_return >= 0 ? i18n.t('attribution.outperformed') : i18n.t('attribution.underperformed')}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }


  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Tab switching
    const tabButtons = this.container!.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tabName = (e.target as HTMLElement).dataset.tab;
        this.switchTab(tabName!);
      });
    });
  }

  /**
   * Switch between tabs
   */
  switchTab(tabName: string) {
    // Update buttons
    const tabButtons = this.container!.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tabName);
    });

    // Update content
    const tabContents = this.container!.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      content.classList.remove('active');
    });

    const targetContent = this.container!.querySelector(`#${tabName}-tab`);
    if (targetContent) {
      targetContent.classList.add('active');
    }
  }

  /**
   * Show error message
   */
  showError(message: string) {
    this.container!.innerHTML = `
      <div class="error-message">
        <h3>${i18n.t('attribution.error')}</h3>
        <p>${message}</p>
      </div>
    `;
  }
}

export default AttributionDashboard;
