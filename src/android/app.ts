/** Android presentation/controller. Domain calculations and API contracts stay shared. */
import i18n from '../i18n/i18n.js';
import { STRATEGY_PROFILES, MARKET_BENCHMARKS } from '../core/config.js';
import { MARKET_OPTIONS } from '../shared/frontend/market-options.js';
import { runMarketScan } from '../shared/frontend/scan-runner.js';
import { analyzeStock, loadBenchmark } from '../shared/frontend/scan-analysis.js';
import { enrichScanResults } from '../shared/frontend/scan-enrichment.js';
import { fetchPriceHistory } from '../shared/frontend/market-data-client.js';
import { filterAndSortResults, getViewScore } from '../shared/frontend/results-filter.js';
import { getAssetSymbol, canonicalSelection } from '../shared/frontend/asset-identity.js';
import { RequestCoordinator } from '../shared/frontend/request-coordinator.js';
import { buildSimulationRequest, getHorizonMonths, getTotalMonthlyInvestment,
  isSimulationInputValid, isSimulationProjection, requestSimulation } from '../shared/frontend/simulator-service.js';
import { loadLastScanReview, loadLastSimulationReview } from '../shared/frontend/offline-review-restore.js';
import { formatNumber, formatCurrencyValue, formatReturn } from '../shared/frontend/formatting.js';
import { dbStore } from '../storage/indexed-db-store.js';
import { notifyStrongSignals } from '../alerts/alert-manager.js';
import { registerAppServiceWorker } from '../pwa/service-worker.js';
import { loadOperationsSession, saveOperationsSession } from './operations-session.js';
import { PortfolioScreen } from './portfolio-screen.js';
import { AlertsScreen } from './alerts-screen.js';
import { loadAndroidSession, saveAndroidSession, VIEW_KEYS } from './session.js';

const app = document.getElementById('androidApp')!;
const session = loadAndroidSession();
const requests = new RequestCoordinator();
const priceCache = new Map();
let results: any[] = [];
let partial: any[] | null = null;
let ready = false;
let scanning = false;
let simBusy = false;
let scanError = false;
let simError = '';
let notice = '';
let progress = '';
let lastScanAt: number | null = null;
let lastSimulationAt: number | null = null;
let response: any = null;
let responseSignature = '';
let previousRoute = '';
let filtersOpen = false;
let scanStrategy = 'balanced';
let scanBenchmark = '^IBEX';
let scanRegime: { min_score: number } | null = null;

const t = (key: string, params: Record<string, string> = {}) => i18n.t(`android.${key}`, params);
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const available = () => partial ?? results;
const assetFor = (symbol: string) => available().find(asset => getAssetSymbol(asset) === symbol);
const route = () => location.hash.replace(/^#\/?/, '') || 'scan';
const selected = (symbol: string) => session.selection.includes(symbol);
const marketLabel = (asset: any) => {
  const market = MARKET_OPTIONS.find(item => item.suffix === (asset.marketSuffix || ''));
  return market ? i18n.t(`markets.${market.key}`) : asset.marketSuffix || getAssetSymbol(asset);
};
const signalLabel = (asset: any) => ['strong_buy', 'buy', 'hold_upper', 'hold', 'sell'].includes(asset.signal?.key)
  ? i18n.t(`signals.${asset.signal.key}`) : asset.signal?.text || '—';
const dateText = (timestamp: number) => new Date(timestamp).toLocaleString(i18n.getCurrentLanguage());
const viewNames = ['views.overall', 'views.short_term', 'views.medium_term', 'views.long_term'];
const request = () => buildSimulationRequest(session.selection, session.investments,
  getHorizonMonths(session.horizon), results, 'symbol');
const signature = () => JSON.stringify(request());

const operations = loadOperationsSession();
const persistOperations = () => {
  if (!saveOperationsSession(operations)) { notice = t('notSaved'); updateStatus(); }
};
const portfolios = new PortfolioScreen(operations, () => ({ results, strategy: scanStrategy,
  benchmark: scanBenchmark, regimeAdjustment: scanRegime, scanning }), () => render(), persistOperations);
const alerts = new AlertsScreen(operations, () => render(), persistOperations);
function enterOperations(): void {
  const path = route();
  if (path === 'portfolios') void portfolios.enter();
  else if (path.startsWith('position/')) {
    try { const parts = path.split('/'); if (parts.length === 3) void portfolios.enter(decodeURIComponent(parts[1])); } catch { /* Invalid route is rendered locally. */ }
  } else if (path === 'alerts') void alerts.enter();
}

function persistDraft(): void {
  if (!saveAndroidSession(session)) {
    notice = t('notSaved');
    updateStatus();
  }
}

function invalidateProjection(): void {
  requests.invalidate();
  simBusy = false;
  simError = '';
}

function selectionButton(symbol: string, compact = false): string {
  const active = selected(symbol);
  const label = t(active ? 'remove' : 'add');
  return `<button type="button" class="${compact ? 'select-asset' : 'secondary full'}"
    data-toggle="${esc(symbol)}" aria-pressed="${active}" aria-label="${esc(label)} ${esc(symbol)}"
    ${!active && session.selection.length >= 4 ? 'disabled' : ''}>
    ${compact ? (active ? '✓' : '+') : esc(label)}</button>`;
}

function statusMarkup(): string {
  return `<div id="networkStatus" class="status warning" ${navigator.onLine ? 'hidden' : ''}>
    ${esc(t('offline'))}</div><div id="appNotice" class="status" role="status">${esc(notice)}</div>
    <div id="scanProgress" class="status ${scanError ? 'error' : ''}" role="status">${esc(progress)}</div>
    ${scanning ? '<div class="progress-line" aria-hidden="true"></div>' : ''}
    ${lastScanAt ? `<p class="snapshot">${esc(t('saved', { date: dateText(lastScanAt) }))}</p>` : ''}`;
}

function updateStatus(): void {
  const node = document.getElementById('appNotice');
  if (node) node.textContent = notice;
  const progressNode = document.getElementById('scanProgress');
  if (progressNode) progressNode.textContent = progress;
}

function scanScreen(): string {
  const strategies = ['balanced', 'momentum_aggressive', 'trend_conservative', 'sector_rotation'];
  return `<section class="screen-head"><p class="eyebrow">Global Quant Scanner</p>
    <h1 tabindex="-1">${esc(t('title'))}</h1><p class="muted">${esc(t('subtitle'))}</p></section>
    <section class="panel"><h2>${esc(scanning ? t('running') : t('ready'))}</h2>
    <p class="muted">${esc(t('scanHint'))}</p><form id="scanForm" class="form-grid">
    <label>${esc(i18n.t('markets.label'))}<select name="market" ${scanning ? 'disabled' : ''}>
      <option value="all" ${session.market === 'all' ? 'selected' : ''}>${esc(i18n.t('markets.all'))}</option>
      ${MARKET_OPTIONS.map(market => `<option value="${market.key}" ${session.market === market.key ? 'selected' : ''}>
        ${esc(i18n.t(`markets.${market.key}`))}</option>`).join('')}</select></label>
    <label>${esc(i18n.t('strategies.label'))}<select name="strategy" ${scanning ? 'disabled' : ''}>
      ${strategies.map(key => `<option value="${key}" ${session.strategy === key ? 'selected' : ''}>
        ${esc(i18n.t(`strategies.${key}`))}</option>`).join('')}</select></label>
    <button class="primary full" type="submit" ${scanning || !navigator.onLine ? 'disabled' : ''}>
      ${esc(scanError ? t('retry') : scanning ? t('running') : t('run'))} <span aria-hidden="true">↗</span></button>
    </form></section>${!navigator.onLine ? `<p class="muted">${esc(t('offlineHint'))}</p>` : ''}
    <dialog id="scanConfirmation" aria-labelledby="confirmationTitle"><h2 id="confirmationTitle">${esc(t('allTitle'))}</h2>
      <p>${esc(t('allHint', { count: String(MARKET_OPTIONS.length) }))}</p><div class="row">
      <button class="secondary" data-action="cancel-scan">${esc(t('cancel'))}</button>
      <button class="primary" data-action="confirm-scan">${esc(t('proceed'))}</button></div></dialog>`;
}

function filteredResults(): any[] {
  return filterAndSortResults(available(), session.filter, session.viewKey);
}

function cardsMarkup(): string {
  const filtered = filteredResults();
  if (!filtered.length) return `<div class="empty"><h2>${esc(t('noMatches'))}</h2>
    <button class="secondary" data-action="reset-filters">${esc(t('reset'))}</button></div>`;
  return filtered.map(asset => {
    const symbol = getAssetSymbol(asset);
    return `<article class="asset-card" data-symbol="${esc(symbol)}"><div class="row">
      <a class="asset-title" data-result-link href="#/asset/${encodeURIComponent(symbol)}">
        <h2>${esc(asset.ticker)} <span class="market-label">${esc(marketLabel(asset))}</span></h2>
        <span class="asset-name">${esc(asset.name)}</span></a>${selectionButton(symbol, true)}</div>
      <div class="row card-metrics"><span class="score">${esc(formatNumber(getViewScore(asset, session.viewKey), 0))}<small>/100</small></span>
      <span class="signal">${esc(signalLabel(asset))}</span><span>${esc(formatNumber(asset.price))}</span></div></article>`;
  }).join('');
}

function resultScreen(): string {
  if (!available().length) return `<section class="screen-head"><h1 tabindex="-1">${esc(t('results'))}</h1></section>
    <div class="empty"><h2>${esc(t('scanEmpty'))}</h2><p>${esc(t('scanEmptyHint'))}</p>
    <a class="primary" href="#/scan">${esc(t('scan'))}</a></div>`;
  return `<section class="screen-head"><p class="eyebrow">${esc(i18n.t(`strategies.${session.strategy}`))}</p>
    <h1 tabindex="-1">${esc(t('results'))}</h1></section>
    ${partial ? `<p class="status warning">${esc(t('partial'))}</p>` : ''}
    <label>${esc(i18n.t('filters.search_label'))}<input type="search" name="query" value="${esc(session.filter.query)}"
      placeholder="${esc(i18n.t('filters.search_placeholder'))}" /></label>
    <details id="resultFilters" ${filtersOpen ? 'open' : ''}><summary>${esc(t('filters'))}</summary><div class="filter-grid">
    <label>${esc(i18n.t('views.label'))}<select name="viewKey">${VIEW_KEYS.map((key, index) =>
      `<option value="${key}" ${session.viewKey === key ? 'selected' : ''}>${esc(i18n.t(viewNames[index]))}</option>`).join('')}</select></label>
    <label>${esc(i18n.t('filters.signal_label'))}<select name="signal">${['all', 'strong_buy', 'buy', 'hold_upper', 'hold', 'sell'].map(key =>
      `<option value="${key}" ${session.filter.signal === key ? 'selected' : ''}>${esc(i18n.t(`filters.signal_${key}`))}</option>`).join('')}</select></label>
    <label>${esc(i18n.t('filters.min_score_label'))}<input type="number" name="minScore" min="0" max="100" value="${session.filter.minScore}" /></label>
    <label>${esc(i18n.t('filters.volume_label'))}<select name="volume"><option value="all">${esc(i18n.t('filters.volume_all'))}</option>
      <option value="high" ${session.filter.volume === 'high' ? 'selected' : ''}>${esc(i18n.t('filters.volume_high'))}</option></select></label>
    <button type="button" class="secondary" data-action="reset-filters">${esc(t('reset'))}</button></div></details>
    <p id="resultCount" class="results-count">${esc(t('found', { shown: String(filteredResults().length), total: String(available().length) }))}</p>
    <a class="secondary full" href="#/portfolios">${esc(t('buildPortfolio'))}</a>
    <div id="assetCards">${cardsMarkup()}</div>`;
}

function detailScreen(symbol: string): string {
  const asset = assetFor(symbol);
  if (!asset) return emptyScreen(t('unknown'));
  return `<a class="back-link" href="#/results">← ${esc(t('back'))}</a>
    <section class="screen-head"><p class="eyebrow">${esc(symbol)}</p><h1 tabindex="-1">${esc(asset.ticker)}</h1>
    <p class="detail-name">${esc(asset.name)}</p></section><section class="panel">
    <dl class="detail-facts"><div><dt>${esc(t('market'))}</dt><dd>${esc(marketLabel(asset))}</dd></div>
    <div><dt>${esc(t('price'))}</dt><dd>${esc(formatNumber(asset.price))}</dd></div>
    <div><dt>${esc(i18n.t('filters.signal_label'))}</dt><dd>${esc(signalLabel(asset))}</dd></div></dl>
    ${selectionButton(symbol)}</section><h2>${esc(t('scores'))}</h2><div class="score-grid">
    ${VIEW_KEYS.map((key, index) => `<div class="metric"><span>${esc(i18n.t(viewNames[index]))}</span>
      <strong>${esc(formatNumber(getViewScore(asset, key), 0))}</strong></div>`).join('')}</div>
    <details><summary>${esc(t('warnings'))}</summary><ul class="warnings">
      ${(asset.warnings || []).map((warning: string) => `<li>${esc(warning)}</li>`).join('') || '<li>—</li>'}</ul></details>`;
}

function graphMarkup(): string {
  const points = (response?.monthlyProjection || []).filter((point: any) =>
    ['expected', 'optimistic', 'pessimistic'].every(key => Number.isFinite(point[key])));
  if (!points.length) return '';
  const max = Math.max(1, ...points.flatMap((point: any) => [point.expected, point.optimistic, point.pessimistic]));
  return `<svg class="projection-chart" viewBox="0 0 320 170" role="img" aria-label="${esc(t('projection'))}">
    <path d="M8 8V158H312" fill="none" stroke="#496079" />${[
      ['optimistic', '#91bdff'], ['pessimistic', '#e8bb90'], ['expected', '#7de2cb']
    ].map(([key, color]) => `<polyline fill="none" stroke="${color}" stroke-width="2.5" points="${points.map((point: any, index: number) =>
      `${8 + index / Math.max(1, points.length - 1) * 304},${158 - Math.max(0, point[key]) / max * 145}`).join(' ')}" />`).join('')}</svg>
    <div class="chart-legend">${['expected', 'optimistic', 'pessimistic'].map(key =>
      `<span class="${key}">${esc(t(key))}</span>`).join('')}</div>`;
}

function projectionMarkup(): string {
  if (!response) return `<p class="muted">${esc(t('projectionEmpty'))}</p>`;
  const currency = /^[A-Z]{3}$/.test(response.currency || '') ? response.currency : 'USD';
  const money = (value: unknown) => Number.isFinite(value) ? formatCurrencyValue(value as number, currency) : '—';
  return `<div class="metrics-grid"><div class="metric"><span>${esc(t('invested'))}</span>
    <strong>${esc(money(response.totalInvested))}</strong></div>${['expected', 'optimistic', 'pessimistic'].map(key => {
    const scenario = response.scenarios?.[key];
    return `<div class="metric ${key}"><span>${esc(t(key))}</span><strong>${esc(money(scenario?.finalValue))}</strong>
      <p class="muted">${Number.isFinite(scenario?.totalReturn) ? esc(formatReturn(scenario.totalReturn)) : '—'}</p></div>`;
  }).join('')}</div>${graphMarkup()}<p class="snapshot">${esc(t('period', { months: String(response.horizonMonths) }))}
    ${lastSimulationAt ? ` · ${esc(dateText(lastSimulationAt))}` : ''}</p>
    <details><summary>${esc(t('positions'))}</summary>${(response.perTicker || []).map((item: any) =>
      `<div class="row breakdown-row"><strong>${esc(item.ticker)}</strong><span>${esc(money(item.monthlyAmount))}</span></div>`).join('')}</details>`;
}

function validSimulation(): boolean {
  return navigator.onLine && !simBusy && !scanning
    && isSimulationInputValid(session.selection, session.investments, getHorizonMonths(session.horizon));
}

function simulatorScreen(): string {
  if (!session.selection.length) return emptyScreen(t('emptySelection'));
  return `<a class="back-link" href="#/results">← ${esc(t('results'))}</a>
    <section class="screen-head"><p class="eyebrow">${esc(t('selection'))}</p><h1 tabindex="-1">${esc(t('simulator'))}</h1></section>
    <section class="panel">${session.selection.map(symbol => `<div class="amount-row"><div>
      <span class="amount-symbol">${esc(symbol)}</span><small class="muted">${esc(assetFor(symbol)?.name || '')}</small></div>
      <label>${esc(t('monthly'))}<input type="number" min="0" step="1" name="amount" data-symbol="${esc(symbol)}"
        aria-label="${esc(t('monthly'))} ${esc(symbol)}" value="${session.investments[symbol] ?? 100}" /></label>
      <button class="select-asset" data-toggle="${esc(symbol)}" aria-label="${esc(t('remove'))} ${esc(symbol)}">×</button></div>`).join('')}
    <div class="row total-row"><span>${esc(t('totalMonthly'))}</span><strong id="monthlyTotal">${getTotalMonthlyInvestment(session.selection, session.investments)}</strong></div>
    <label style="margin-top:20px">${esc(t('horizon'))}<select name="preset">${[12, 36, 60, 120].map(months =>
      `<option value="${months}" ${!session.horizon.useCustom && session.horizon.preset === months ? 'selected' : ''}>${months / 12} ${esc(t('years'))}</option>`).join('')}
      <option value="custom" ${session.horizon.useCustom ? 'selected' : ''}>${esc(t('custom'))}</option></select></label>
    <div class="custom-fields" ${session.horizon.useCustom ? '' : 'hidden'} id="customHorizon">
      <label>${esc(t('customValue'))}<input type="number" name="customValue" min="1" value="${session.horizon.customValue}" /></label>
      <label>${esc(t('horizon'))}<select name="customUnit"><option value="months">${esc(t('months'))}</option>
        <option value="years" ${session.horizon.customUnit === 'years' ? 'selected' : ''}>${esc(t('years'))}</option></select></label></div>
    </section><button class="primary full" data-action="calculate" ${validSimulation() ? '' : 'disabled'}>${esc(t(simBusy ? 'calculating' : 'calculate'))}</button>
    <p id="simStatus" class="status error" role="status">${esc(simError)}</p>
    <p id="projectionStale" class="status warning" ${response && signature() !== responseSignature ? '' : 'hidden'}>${esc(t('previous'))}</p>
    <section id="projection" class="panel" style="margin-top:20px"><h2>${esc(t('projection'))}</h2>${projectionMarkup()}</section>`;
}

function emptyScreen(message: string): string {
  return `<div class="empty"><h1 tabindex="-1">${esc(message)}</h1>
    <a class="primary" href="#/results">${esc(t('results'))}</a></div>`;
}

function render(focus = false): void {
  const path = route();
  let content = '';
  if (!ready) content = `<div class="empty"><h1 tabindex="-1">${esc(t('loading'))}</h1></div>`;
  else if (path === 'scan') content = scanScreen();
  else if (path === 'results') content = resultScreen();
  else if (path === 'simulator') content = simulatorScreen();
  else if (path.startsWith('asset/')) {
    try { content = detailScreen(decodeURIComponent(path.slice(6))); } catch { content = emptyScreen(t('unknown')); }
  } else if (path === 'portfolios') content = portfolios.render();
  else if (path === 'alerts') content = alerts.render();
  else if (path.startsWith('position/')) {
    try {
      const parts = path.split('/');
      content = parts.length === 3 ? portfolios.render(decodeURIComponent(parts[2]), decodeURIComponent(parts[1])) : emptyScreen(t('notFound'));
    } catch { content = emptyScreen(t('notFound')); }
  } else content = emptyScreen(t('notFound'));
  const active = path.startsWith('position/') ? 'portfolios'
    : path.startsWith('asset/') || path === 'simulator' ? 'results' : path;
  app.setAttribute('aria-busy', String(!ready));
  document.documentElement.lang = i18n.getCurrentLanguage();
  document.title = `Global Quant Scanner · ${t(path === 'simulator' ? 'simulator' : 'touch')}`;
  app.innerHTML = `<div class="app-shell"><header class="topbar"><a href="#/scan" class="brand" aria-label="Global Quant Scanner">
    <span class="brand-mark" aria-hidden="true">Q</span><span>GLOBAL<br>QUANT SCANNER</span></a><div class="top-actions">
    <a class="desktop-link" href="./">${esc(t('desktop'))} ↗</a><select name="language" aria-label="${esc(t('language'))}">
      <option value="es" ${i18n.getCurrentLanguage() === 'es' ? 'selected' : ''}>ES</option>
      <option value="en" ${i18n.getCurrentLanguage() === 'en' ? 'selected' : ''}>EN</option></select></div></header>
    ${statusMarkup()}<main id="screen">${content}</main><footer>${esc(t('touch'))} · Global Quant Scanner</footer></div>
    ${session.selection.length && path !== 'simulator' && ready ? `<aside class="selection-dock" aria-label="${esc(t('selection'))}">
      <div><strong>${session.selection.length}/4</strong> <small>${esc(t('selected'))}</small></div>
      <a class="primary" href="#/simulator">${esc(t('simulate', { count: String(session.selection.length) }))} →</a></aside>` : ''}
    <nav class="bottom-nav" aria-label="${esc(t('touch'))}">${[
      ['scan', '⌁'], ['results', '▤'], ['portfolios', '◫'], ['alerts', '◎']
    ].map(([key, icon]) => `<a href="#/${key}" ${active === key ? 'aria-current="page"' : ''}>
      <span class="nav-icon" aria-hidden="true">${icon}</span>${esc(t(key))}</a>`).join('')}</nav>`;
  document.getElementById('resultFilters')?.addEventListener('toggle', event => {
    filtersOpen = (event.currentTarget as HTMLDetailsElement).open;
  });
  if (focus) app.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
}

function updateSimulationControls(): void {
  const button = app.querySelector<HTMLButtonElement>('[data-action="calculate"]');
  if (button) {
    button.disabled = !validSimulation();
    button.textContent = t(simBusy ? 'calculating' : 'calculate');
  }
  const error = document.getElementById('simStatus');
  if (error) error.textContent = simError;
  const total = document.getElementById('monthlyTotal');
  if (total) total.textContent = String(getTotalMonthlyInvestment(session.selection, session.investments));
  const stale = document.getElementById('projectionStale');
  if (stale) stale.hidden = !response || signature() === responseSignature;
}

async function startScan(confirmed = false): Promise<void> {
  if (!ready || scanning || !navigator.onLine) return;
  if (session.market === 'all' && !confirmed) {
    app.querySelector<HTMLDialogElement>('#scanConfirmation')?.showModal();
    return;
  }
  app.querySelector<HTMLDialogElement>('#scanConfirmation')?.close();
  scanning = true; scanError = false; partial = null; notice = ''; progress = t('running');
  invalidateProjection();
  const strategy = session.strategy;
  const markets = MARKET_OPTIONS.filter(market => session.market === 'all' || market.key === session.market);
  const loadHistory = (ticker: string, suffix: string) => fetchPriceHistory(ticker, suffix, { cache: priceCache }).catch(() => []);
  render();
  try {
    const scan = await runMarketScan(markets.map(market => ({ ...market, name: i18n.t(`markets.${market.key}`) })),
      (STRATEGY_PROFILES as Record<string, any>)[strategy], {
        loadBenchmark: suffix => loadBenchmark(suffix, loadHistory),
        analyzeStock: (stock, suffix, config, rocs, volatility) => analyzeStock(stock, suffix, config, rocs, volatility, loadHistory),
        loadUniverse: async file => {
          const fetched = await fetch(new URL(file, document.baseURI));
          if (!fetched.ok) throw new Error(t('failed'));
          const universe = await fetched.json();
          if (!Array.isArray(universe)) throw new Error(t('failed'));
          return universe;
        },
        onProgress(event) {
          if (event.phase === 'market_started') progress = event.market.name || '';
          else if (event.phase === 'analyzing') progress = `${event.current}/${event.total} · ✓ ${event.analyzed} · ✕ ${event.filtered}`;
          else progress = i18n.t(`status.${event.phase}`);
          updateStatus();
        },
        onPartialResults(items) {
          partial = items;
          if (route() === 'results') render();
        }
      });
    let finalResults = scan.results;
    let finalRegime: { min_score: number } | null = null;
    if (markets.length === 1) {
      progress = t('advanced'); updateStatus();
      const enriched = await enrichScanResults({ currentResults: finalResults, benchmarkData: scan.benchmark,
        strategyKey: strategy, mlEnabled: true, performanceTracker: null, currentRegime: null,
        mlRegimePrediction: null, mlAnomalies: [], mlRecommendations: [] }, { loadYahooData: loadHistory });
      finalResults = enriched.currentResults;
      finalRegime = enriched.currentRegime?.strategyAdjustment || null;
    }
    results = finalResults;
    scanRegime = finalRegime;
    scanStrategy = strategy;
    scanBenchmark = (MARKET_BENCHMARKS as Record<string, string>)[markets.length === 1 ? markets[0].suffix : ''] || '^GSPC';
    partial = null;
    session.selection = session.selection.filter(symbol => results.some(asset => getAssetSymbol(asset) === symbol));
    lastScanAt = Date.now();
    const market = markets.length === 1 ? { file: markets[0].file, suffix: markets[0].suffix }
      : { file: 'ALL_MARKETS', suffix: '' };
    try { await dbStore.saveLastScan({ results, market, strategy, timestamp: lastScanAt, regimeAdjustment: scanRegime }); }
    catch { notice = t('notSaved'); }
    progress = i18n.t('status.scan_complete', { count: String(results.length) });
    persistDraft();
    try { await notifyStrongSignals(results, strategy); } catch { notice ||= t('notificationsFailed'); }
    location.hash = '/results';
  } catch {
    partial = null;
    scanError = true;
    progress = t('failed');
  } finally {
    scanning = false;
    render();
  }
}

async function calculate(): Promise<void> {
  if (!validSimulation()) return;
  const version = requests.start();
  const input = request();
  simBusy = true; simError = ''; render();
  try {
    const payload = await requestSimulation(input);
    if (!requests.isCurrent(version)) return;
    if (!isSimulationProjection(payload)) throw new Error(t('invalidResponse'));
    response = payload;
    responseSignature = JSON.stringify(input);
    lastSimulationAt = Date.now();
    try { await dbStore.saveLastSimulation({ request: input, response, timestamp: lastSimulationAt }); }
    catch { notice = t('notSaved'); }
  } catch (error) {
    if (requests.isCurrent(version)) simError = error instanceof Error ? error.message : t('failed');
  } finally {
    if (requests.isCurrent(version)) { simBusy = false; render(); }
  }
}

app.addEventListener('submit', event => {
  event.preventDefault();
  const id = (event.target as HTMLElement).id;
  if (id === 'scanForm') void startScan();
  else if (id === 'alertSettingsForm') void alerts.save();
  else if (id === 'portfolioBuildForm' || id === 'portfolioSaveForm') void portfolios.submit(id);
});

app.addEventListener('click', event => {
  const target = event.target as HTMLElement;
  if (target.closest('[data-position-link]')) { operations.portfolioScroll = window.scrollY; persistOperations(); }
  if (target.closest('[data-result-link]')) {
    session.resultsScroll = window.scrollY; persistDraft();
  }
  const toggle = target.closest<HTMLButtonElement>('[data-toggle]');
  if (toggle && !toggle.disabled) {
    const symbol = toggle.dataset.toggle!;
    if (selected(symbol)) {
      session.selection = session.selection.filter(item => item !== symbol);
      delete session.investments[symbol];
    } else if (session.selection.length < 4) {
      session.selection = canonicalSelection([...session.selection, symbol]);
      session.investments[symbol] ??= 100;
    }
    invalidateProjection(); persistDraft(); render();
    app.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach(button => {
      if (button.dataset.toggle === symbol) button.focus({ preventScroll: true });
    });
  }
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action && (portfolios.click(action) || alerts.click(action))) return;
  if (action === 'calculate') void calculate();
  else if (action === 'cancel-scan') app.querySelector<HTMLDialogElement>('#scanConfirmation')?.close();
  else if (action === 'confirm-scan') void startScan(true);
  else if (action === 'reset-filters') {
    session.filter = { query: '', signal: 'all', minScore: 0, volume: 'all' }; persistDraft(); render();
  }
});

function editInput(event: Event): void {
  const input = event.target as HTMLInputElement | HTMLSelectElement;
  const { name, value } = input;
  if (name === 'language' && event.type === 'change') { i18n.setLanguage(value); return; }
  if (input.tagName === 'SELECT' || input.type === 'checkbox' ? event.type === 'change' : event.type === 'input') {
    if (portfolios.input(input) || alerts.input(input)) return;
  } else if (name.startsWith('portfolio-') || name.startsWith('alert-') || ['savedPortfolio', 'alertStrategy'].includes(name)) return;
  if (['query', 'minScore'].includes(name) && event.type !== 'input') return;
  if (['market', 'strategy', 'viewKey', 'signal', 'volume', 'preset', 'customUnit'].includes(name)
    && event.type !== 'change') return;
  if (name === 'amount' && event.type !== 'input') return;
  if (name === 'customValue' && event.type !== 'input') return;
  if (name === 'market' && !scanning) session.market = value;
  else if (name === 'strategy' && !scanning) session.strategy = value;
  else if (name === 'query') session.filter.query = value;
  else if (name === 'minScore') session.filter.minScore = Math.max(0, Math.min(100, Number(value) || 0));
  else if (name === 'viewKey') session.viewKey = value;
  else if (name === 'signal') session.filter.signal = value;
  else if (name === 'volume') session.filter.volume = value;
  else if (name === 'amount') {
    const amount = Number(value);
    session.investments[input.dataset.symbol!] = Number.isFinite(amount) && amount >= 0 ? amount : 0;
    invalidateProjection();
  } else if (name === 'preset') {
    session.horizon.useCustom = value === 'custom';
    if (value !== 'custom') session.horizon.preset = Number(value);
    invalidateProjection();
    const custom = document.getElementById('customHorizon');
    if (custom) custom.hidden = !session.horizon.useCustom;
  } else if (name === 'customValue') {
    session.horizon.customValue = Number(value); invalidateProjection();
  } else if (name === 'customUnit') {
    session.horizon.customUnit = value as 'years' | 'months'; invalidateProjection();
  } else return;
  persistDraft(); updateSimulationControls();
  if (['query', 'minScore', 'viewKey', 'signal', 'volume'].includes(name)) {
    const cards = document.getElementById('assetCards');
    if (cards) cards.innerHTML = cardsMarkup();
    const count = document.getElementById('resultCount');
    if (count) count.textContent = t('found', { shown: String(filteredResults().length), total: String(available().length) });
  }
}
app.addEventListener('input', editInput);
app.addEventListener('change', editInput);
window.addEventListener('hashchange', () => {
  const returning = route() === 'results' && previousRoute.startsWith('asset/');
  const returningPortfolio = route() === 'portfolios' && previousRoute.startsWith('position/');
  previousRoute = route();
  render(true);
  enterOperations();
  window.scrollTo(0, returning ? session.resultsScroll : returningPortfolio ? operations.portfolioScroll : 0);
});
window.addEventListener('languageChanged', () => render());
window.addEventListener('online', () => render());
window.addEventListener('offline', () => { invalidateProjection(); render(); });

async function bootstrap(): Promise<void> {
  render();
  void registerAppServiceWorker(new URL('.', document.baseURI).pathname);
  try {
    const saved = await loadLastScanReview();
    if (saved) {
      results = saved.results;
      scanStrategy = saved.strategy && Object.hasOwn(STRATEGY_PROFILES, saved.strategy) ? saved.strategy : 'balanced';
      scanRegime = saved.regimeAdjustment || null;
      scanBenchmark = (MARKET_BENCHMARKS as Record<string, string>)[String(saved.market?.suffix || '')] || '^GSPC';
      lastScanAt = saved.timestamp;
      if (!session.hasDraft) {
        session.market = saved.market?.file === 'ALL_MARKETS' ? 'all'
          : MARKET_OPTIONS.find(market => market.file === saved.market?.file)?.key || 'spain';
        if (saved.strategy && saved.strategy in STRATEGY_PROFILES) session.strategy = saved.strategy;
      }
    }
  } catch { notice = t('restoreFailed'); }
  try {
    const saved = await loadLastSimulationReview(results, dbStore, 'symbol');
    if (saved && isSimulationProjection(saved.response)) {
      response = saved.response;
      lastSimulationAt = saved.timestamp;
      const horizon = { preset: 60, useCustom: false, customValue: 18, customUnit: 'months' as const, ...saved.horizon };
      responseSignature = JSON.stringify(buildSimulationRequest(saved.selection, saved.tickerInvestments,
        getHorizonMonths(horizon), results, 'symbol'));
      if (!session.hasDraft) {
        session.selection = canonicalSelection(saved.selection);
        session.investments = saved.tickerInvestments;
        Object.assign(session.horizon, saved.horizon);
      }
    } else if (saved) {
      notice = t('restoreFailed');
    }
  } catch { notice = t('restoreFailed'); }
  ready = true;
  previousRoute = route();
  render();
  enterOperations();
}

void bootstrap();
