import i18n from '../i18n/i18n.js';
import { portfolioManager } from '../portfolio/portfolio-manager.js';
import { canBuildPortfolio, buildPortfolioModel, buildPortfolioSaveRequest, validatePortfolioInputs,
  PORTFOLIO_METHOD_KEYS, PORTFOLIO_RISK_KEYS, type PortfolioBuildResult } from '../shared/frontend/portfolio-builder.js';
import { loadPortfolioReview, refreshPortfolioReview, type PortfolioReview } from '../shared/frontend/portfolio-review.js';
import { RequestCoordinator } from '../shared/frontend/request-coordinator.js';
import type { OperationsSession } from './operations-session.js';
import { text as t, escapeHtml as esc, numberText as num, strategyText, dateText, fact, correctionsMarkup, equityMarkup } from './operations-ui.js';

type ScanContext = { results: any[]; strategy: string; benchmark: string; regimeAdjustment: { min_score: number } | null; scanning: boolean };
export class PortfolioScreen {
  private portfolios: any[] = [];
  private review: PortfolioReview | null = null;
  private preview: (PortfolioBuildResult & { strategy: string; benchmark: string }) | null = null;
  private loaded = false;
  private pendingId: string | null = null;
  private loadingId: string | null = null;
  private busy = false;
  private saving = false;
  private message = '';
  private error = false;
  private requests = new RequestCoordinator();
  constructor(private state: OperationsSession, private scan: () => ScanContext,
    private redraw: () => void, private persist: () => void) {}

  get isReady(): boolean { return this.loaded || this.error; }
  get isWorking(): boolean { return this.busy || this.saving; }
  invalidatePreview(): void { this.preview = null; }
  async enter(id = this.state.portfolioId): Promise<void> {
    if (this.saving || (this.busy && this.loadingId === null)) {
      this.pendingId = id; return;
    }
    if (this.busy && this.loadingId === id) return;
    if (this.loaded && id === this.review?.portfolio.id) return;
    const token = this.requests.start();
    this.busy = true; this.loadingId = id; this.message = ''; this.error = false; this.redraw();
    try {
      const list = await portfolioManager.getAllPortfolios();
      if (!this.requests.isCurrent(token)) return;
      this.portfolios = list;
      const selected = id || list[0]?.id || '';
      const review = selected ? await loadPortfolioReview(selected) : null;
      if (!this.requests.isCurrent(token)) return;
      this.portfolios = list; this.review = review; this.loaded = true;
      this.state.portfolioId = selected; this.persist();
    } catch { if (this.requests.isCurrent(token)) { this.error = true; this.message = t('portfolioReadFailed'); } }
    finally { if (this.requests.isCurrent(token)) { this.busy = false; this.loadingId = null; this.redraw(); } }
  }

  private followPending(): void {
    if (this.pendingId === null) return;
    const id = this.pendingId; this.pendingId = null; void this.enter(id);
  }
  updateNetwork(): void {
    const button = document.querySelector<HTMLButtonElement>('[data-action="portfolio-refresh"]');
    if (button) button.disabled = !navigator.onLine || this.isWorking;
  }
  render(symbol?: string, requestedId?: string): string {
    if (symbol !== undefined) return this.position(symbol, requestedId);
    const scan = this.scan();
    const draft = this.state.builder;
    return `<section class="screen-head"><h1 tabindex="-1">${esc(t('portfolios'))}</h1></section>
      <p id="portfolioStatus" role="status" class="status ${this.error ? 'error' : ''}">${esc(this.message)}</p>
      ${this.busy ? `<p>${esc(t('loading'))}</p>` : ''}
      <section class="panel"><h2>${esc(t('savedPortfolios'))}</h2>
      <label>${esc(t('choosePortfolio'))}<select name="savedPortfolio" ${this.busy || this.saving ? 'disabled' : ''}>
      <option value="">${esc(t('choosePortfolio'))}</option>${this.portfolios.map(portfolio =>
        `<option value="${esc(portfolio.id)}" ${this.state.portfolioId === portfolio.id ? 'selected' : ''}>${esc(portfolio.name)}</option>`).join('')}</select></label>
      ${!this.portfolios.length && !this.busy ? `<p class="muted">${esc(t('noPortfolios'))}</p>` : ''}
      <button type="button" class="secondary full" data-action="portfolio-reload" ${this.busy || this.saving ? 'disabled' : ''}>${esc(t('reloadPortfolios'))}</button></section>
      ${this.reviewMarkup()}
      <section class="panel"><h2>${esc(t('buildPortfolio'))}</h2><p class="muted">${esc(t('fullScanHint'))}</p>
      ${!canBuildPortfolio(scan.results) ? `<p class="status warning">${esc(t('portfolioEligibility'))}</p><a href="#/scan">${esc(t('scan'))}</a>` : ''}
      <form id="portfolioBuildForm" class="form-grid"><fieldset ${this.busy || this.saving || scan.scanning ? 'disabled' : ''}>
      <label>${esc(t('allocationMethod'))}<select name="portfolio-method">${PORTFOLIO_METHOD_KEYS.map(key =>
        `<option value="${key}" ${draft.method === key ? 'selected' : ''}>${esc(i18n.t(`allocation.${key}`))}</option>`).join('')}</select></label>
      <label>${esc(t('assetCount'))}<input name="portfolio-topN" type="number" min="1" step="1" max="${scan.results.length}" value="${esc(draft.topN)}" required></label>
      <label>${esc(t('capital'))}<input name="portfolio-totalCapital" type="number" min="0.01" step="any" value="${esc(draft.totalCapital)}" required></label>
      <label>${esc(t('riskProfile'))}<select name="portfolio-riskProfile">${PORTFOLIO_RISK_KEYS.map(key =>
        `<option value="${key}" ${draft.riskProfile === key ? 'selected' : ''}>${esc(i18n.t(`risk.${key}`))}</option>`).join('')}</select></label>
      <label class="check-label"><input type="checkbox" name="portfolio-applyRegime" ${draft.applyRegime ? 'checked' : ''}>${esc(t('applyRegime'))}</label>
      <button class="primary full" type="submit" ${canBuildPortfolio(scan.results) && !scan.scanning ? '' : 'disabled'}>${esc(t('buildPortfolio'))}</button></fieldset></form></section>
      ${this.previewMarkup()}`;
  }

  private previewMarkup(): string {
    if (!this.preview) return '';
    const model = this.preview.portfolio;
    return `<section class="panel" id="portfolioPreview"><h2>${esc(t('allocationPreview'))}</h2>
      <p>${esc(strategyText(this.preview.strategy))} · ${num(model.totalCapital)} · ${esc(i18n.t(`allocation.${model.method}`))}</p>
      ${model.allocation.map((position: any) => `<div class="row breakdown-row"><strong>${esc(position.yahooSymbol || position.ticker)}</strong>
        <span>${num(position.weight * 100)}% · ${num(Number(position.recommended_capital))}</span></div>`).join('')}
      <details id="portfolioGovernance"><summary>${esc(t('governanceDetails'))}</summary><ul>${correctionsMarkup(this.preview.corrections)}</ul>
      <p>${esc(t('riskExclusions'))}: ${esc(model.riskReport.meta.excludedAssets.join(', ') || '—')}</p></details>
      <form id="portfolioSaveForm" class="form-grid"><label>${esc(t('portfolioName'))}<input name="portfolio-name" maxlength="120" required
        value="${esc(this.state.builder.name)}" ${this.saving ? 'disabled' : ''}></label>
      <button class="primary full" ${this.saving ? 'disabled' : ''}>${esc(t(this.saving ? 'savingChanges' : 'savePortfolio'))}</button></form></section>`;
  }

  private reviewMarkup(): string {
    if (!this.review) return '';
    const { portfolio, pnl, asOf, missingSymbols, metrics, equityCurve } = this.review;
    return `<section class="panel" id="portfolioReview" data-portfolio-id="${esc(portfolio.id)}"><h2>${esc(portfolio.name)}</h2>
      <p>${esc(strategyText(portfolio.strategy || 'balanced'))} · ${esc(i18n.t(`allocation.${portfolio.allocation_method}`))}</p>
      <p class="snapshot">${esc(t('savedValuation'))}: ${esc(dateText(asOf))}</p>
      ${missingSymbols.length ? `<p class="status warning">${esc(t('missingPrices'))}: ${esc(missingSymbols.join(', '))}</p>` : ''}
      <dl class="detail-facts">${fact(t('capital'), num(portfolio.initial_capital))}${fact(t('currentValue'), num(pnl.total_value))}
        ${fact(t('unrealizedPnL'), `${num(pnl.total_pnl)} (${num(pnl.total_pnl_pct)}%)`)}</dl>
      <button class="secondary full" data-action="portfolio-refresh" ${!navigator.onLine || this.busy || this.saving ? 'disabled' : ''}>${esc(t('refreshPrices'))}</button>
      <a class="secondary full" href="#/alerts" data-action="portfolio-alerts">${esc(t('portfolioAlerts'))}</a>
      <details id="portfolioHistory"><summary>${esc(t('historicalMetrics'))}</summary>${!metrics ? `<p>${esc(t('noHistoricalMetrics'))}</p>` : ''}
      <dl class="detail-facts">${fact('Sharpe', num(metrics?.sharpe_ratio))}${fact('Sortino', num(metrics?.sortino_ratio))}
      ${fact(t('maxDrawdown'), metrics ? `${num(metrics.max_drawdown.max_drawdown_pct)}%` : '—')}</dl>
      ${equityMarkup(equityCurve)}${equityCurve.length > 1 ? `<ol>${equityCurve.map((point: any) => `<li>${esc(point.date)} · ${num(point.value)}</li>`).join('')}</ol>` : ''}</details>
      ${portfolio.construction_report ? `<details id="portfolioGovernance"><summary>${esc(t('governanceDetails'))}</summary><p>${esc(i18n.t(`risk.${portfolio.construction_report.risk_profile}`))}</p>
        <ul>${correctionsMarkup(portfolio.construction_report.corrections)}</ul>
        <p>${esc(t('riskExclusions'))}: ${esc(portfolio.construction_report.risk_excluded_assets.join(', ') || '—')}</p></details>` : ''}
      <h3>${esc(t('positions'))}</h3>${pnl.positions.map((position: any) => `<article class="position-card">
        <a data-position-link href="#/position/${encodeURIComponent(portfolio.id)}/${encodeURIComponent(position.ticker)}">
        <strong>${esc(position.ticker)}</strong><span>${esc(position.name)}</span></a><div class="row"><span>${num(position.weight)}%</span>
        <span>${num(position.current_value)}</span><span>${num(position.unrealized_pnl_pct)}%</span></div></article>`).join('')}</section>`;
  }

  private position(symbol: string, id?: string): string {
    const position = this.review?.portfolio.id === id ? this.review?.pnl.positions.find((p: any) => p.ticker === symbol) : null;
    return `<a class="back-link" href="#/portfolios">← ${esc(t('portfolios'))}</a><section class="screen-head">
      <h1 tabindex="-1">${esc(position ? symbol : this.busy ? t('loading') : t('positionMissing'))}</h1></section>
      ${position ? `<section class="panel" id="positionReview"><h2>${esc(position.name)}</h2><p class="snapshot">${esc(dateText(this.review!.asOf))}</p>
      <dl class="detail-facts">${fact(t('quantity'), num(position.quantity))}${fact(t('entryPrice'), num(position.entry_price))}
      ${fact(t('price'), num(position.current_price))}${fact(t('weight'), `${num(position.weight)}%`)}
      ${fact(t('currentValue'), num(position.current_value))}${fact(t('unrealizedPnL'), `${num(position.unrealized_pnl)} (${num(position.unrealized_pnl_pct)}%)`)}</dl></section>` : ''}`;
  }

  input(input: HTMLInputElement | HTMLSelectElement): boolean {
    if (input.name === 'savedPortfolio') {
      if (!this.busy && !this.saving && input.value) void this.enter(input.value);
      return true;
    }
    if (!input.name.startsWith('portfolio-')) return false;
    if (this.saving) return true;
    const key = input.name.slice(10) as keyof OperationsSession['builder'];
    if (key === 'applyRegime') this.state.builder.applyRegime = (input as HTMLInputElement).checked;
    else if (key === 'method' || key === 'topN' || key === 'totalCapital' || key === 'riskProfile' || key === 'name') {
      this.state.builder[key] = input.value;
    }
    if (key !== 'name' && this.preview) { this.preview = null; document.getElementById('portfolioPreview')?.remove(); }
    this.persist(); return true;
  }

  async submit(id: string): Promise<void> {
    if (this.busy || this.saving) return;
    this.error = false; this.message = '';
    if (id === 'portfolioBuildForm') {
      const scan = this.scan(), draft = this.state.builder;
      if (scan.scanning) return;
      const options = { ...draft, topN: Number(draft.topN), totalCapital: Number(draft.totalCapital),
        strategy: scan.strategy, regimeAdjustment: draft.applyRegime ? scan.regimeAdjustment : null };
      try {
        if (!canBuildPortfolio(scan.results) || validatePortfolioInputs(scan.results, options)) throw new Error('invalid');
        this.preview = { ...buildPortfolioModel(scan.results, options), strategy: scan.strategy, benchmark: scan.benchmark };
      } catch { this.error = true; this.message = t('invalidPortfolio'); }
      this.redraw(); return;
    }
    if (id !== 'portfolioSaveForm' || !this.preview) return;
    const name = this.state.builder.name.trim();
    if (!name) { this.error = true; this.message = t('nameRequired'); this.redraw(); return; }
    this.saving = true; this.redraw();
    try {
      const request = buildPortfolioSaveRequest(this.preview.portfolio, this.preview.strategy, this.preview.benchmark);
      const portfolio = await portfolioManager.createPortfolio(name, request.assets, request.options);
      this.state.portfolioId = portfolio.id; this.persist();
      this.preview = null;
      this.message = t('portfolioSaved');
      try {
        this.portfolios = await portfolioManager.getAllPortfolios();
        this.review = await loadPortfolioReview(portfolio.id);
      } catch { this.error = true; this.message = t('portfolioSavedReviewFailed'); }
    } catch { this.error = true; this.message = t('operationSaveFailed'); }
    finally { this.saving = false; this.redraw(); this.followPending(); }
  }

  click(action: string): boolean {
    if (action === 'portfolio-alerts') {
      this.state.alertStrategy = this.review?.portfolio.strategy || 'balanced'; this.persist(); return true;
    }
    if (action === 'portfolio-reload') { this.loaded = false; void this.enter(); return true; }
    if (action !== 'portfolio-refresh') return false;
    if (!navigator.onLine || this.busy || this.saving || !this.review) return true;
    this.busy = true; this.error = false; this.message = ''; this.redraw();
    void refreshPortfolioReview(this.review.portfolio.id).then(review => { this.review = review; this.message = t('pricesUpdated'); })
      .catch(() => { this.error = true; this.message = t('priceRefreshFailed'); })
      .finally(() => { this.busy = false; this.redraw(); this.followPending(); });
    return true;
  }
}
