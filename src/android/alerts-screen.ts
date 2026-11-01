import { STRATEGY_PROFILES } from '../core/config.js';
import { getAlertLogs } from '../alerts/alert-manager.js';
import { createDefaultAlertSettings, getAlertSettings, saveAlertSettings, buildAlertSettingsUpdate,
  type AlertSettingsRecord } from '../shared/frontend/alert-settings.js';
import { RequestCoordinator } from '../shared/frontend/request-coordinator.js';
import type { OperationsSession, AlertDraft } from './operations-session.js';
import { text as t, escapeHtml as esc, strategyText, dateText } from './operations-ui.js';

export class AlertsScreen {
  private records = new Map<string, AlertSettingsRecord>();
  private logs: any[] = [];
  private loaded = '';
  private loading = false;
  private saving = false;
  private message = '';
  private error = false;
  private requests = new RequestCoordinator();
  constructor(private state: OperationsSession, private redraw: () => void, private persist: () => void) {}

  get isReady(): boolean { return this.loaded === this.state.alertStrategy && !this.loading; }
  get isWorking(): boolean { return this.loading || this.saving; }
  async enter(force = false): Promise<void> {
    const strategy = this.state.alertStrategy;
    if (!force && this.loaded === strategy) return;
    if (this.saving) return;
    const token = this.requests.start();
    this.loaded = strategy; this.loading = true; this.error = false; this.message = ''; this.logs = [];
    this.draft(strategy); this.redraw();
    try {
      const record = await getAlertSettings(strategy);
      if (!this.requests.isCurrent(token)) return;
      this.records.set(strategy, record);
      if (!this.state.alerts[strategy]?.dirty) this.state.alerts[strategy] = this.fromRecord(record);
      this.persist();
      const logs = await getAlertLogs({ strategy, limit: 20 });
      if (this.requests.isCurrent(token)) this.logs = logs;
    } catch {
      if (this.requests.isCurrent(token)) { this.error = true; this.message = t('alertReadFailed'); }
    } finally {
      if (this.requests.isCurrent(token)) { this.loading = false; this.redraw(); }
    }
  }
  private fromRecord(record: AlertSettingsRecord): AlertDraft {
    return { thresholds: { ...record.thresholds }, channels: { ...record.channels }, notifyOn: { ...record.notifyOn }, dirty: false };
  }
  private draft(strategy = this.state.alertStrategy): AlertDraft {
    return this.state.alerts[strategy] ??= this.fromRecord(createDefaultAlertSettings(strategy));
  }
  render(): string {
    const draft = this.draft();
    return `<section class="screen-head"><h1 tabindex="-1">${esc(t('alerts'))}</h1></section>
      <label>${esc(t('alertStrategy'))}<select name="alertStrategy" ${this.saving ? 'disabled' : ''}>
      ${Object.keys(STRATEGY_PROFILES).map(key => `<option value="${key}" ${key === this.state.alertStrategy ? 'selected' : ''}>${esc(strategyText(key))}</option>`).join('')}</select></label>
      <p id="alertStatus" role="status" class="status ${this.error ? 'error' : ''}">${esc(this.message)}</p>
      ${this.loading ? `<p>${esc(t('loading'))}</p>` : ''}
      <section class="panel"><form id="alertSettingsForm"><fieldset ${this.saving ? 'disabled' : ''}>
      <legend>${esc(t('alertThresholds'))}</legend><div class="form-grid">
      ${(['volatility_pct', 'drawdown_pct', 'score'] as const).map(key => `<label>${esc(t(key))}<input type="number" step="any" required
        name="alert-threshold-${key}" value="${Number.isFinite(draft.thresholds[key]) ? draft.thresholds[key] : ''}"></label>`).join('')}</div>
      <h2>${esc(t('alertChannels'))}</h2><div class="form-grid">
      ${(['email', 'webhook', 'slack', 'teams', 'zapier'] as const).map(key => `<label>${esc(t(key))}<input type="${key === 'email' ? 'email' : 'url'}"
        name="alert-channel-${key}" value="${esc(draft.channels[key])}"></label>`).join('')}</div>
      <h2>${esc(t('alertEvents'))}</h2>
      ${(['strongSignals', 'rebalances', 'riskEvents'] as const).map(key => `<label class="check-label"><input type="checkbox"
        name="alert-notify-${key}" ${draft.notifyOn[key] ? 'checked' : ''}>${esc(t(key))}</label>`).join('')}
      <p class="muted">${esc(t('settingsOnly'))}</p><button class="primary full" ${this.loading || this.saving ? 'disabled' : ''}>
      ${esc(t(this.saving ? 'savingChanges' : 'saveAlertSettings'))}</button></fieldset></form>
      <button class="secondary full" data-action="alerts-reload" ${this.loading || this.saving ? 'disabled' : ''}>${esc(t('reloadAlerts'))}</button></section>
      <details id="alertHistory"><summary>${esc(t('alertHistory'))}</summary>${this.logs.length ? this.logs.map(log => `<article class="position-card">
        <strong>${esc(log.title)}</strong><p>${esc(log.message)}</p><small>${esc(dateText(log.created_at))}</small></article>`).join('')
        : `<p>${esc(t('noAlertHistory'))}</p>`}</details>`;
  }
  input(input: HTMLInputElement | HTMLSelectElement): boolean {
    if (input.name === 'alertStrategy') {
      if (this.saving || !Object.hasOwn(STRATEGY_PROFILES, input.value)) return true;
      this.state.alertStrategy = input.value; this.persist(); void this.enter(); return true;
    }
    if (!input.name.startsWith('alert-')) return false;
    if (this.saving) return true;
    const draft = this.draft(), name = input.name;
    if (name.startsWith('alert-threshold-')) {
      const key = name.slice(16) as keyof AlertDraft['thresholds'];
      // Keep invalid/empty DOM edits until validation; do not turn a blank into zero.
      draft.thresholds[key] = input.value.trim() ? Number(input.value) : NaN;
    } else if (name.startsWith('alert-channel-')) {
      draft.channels[name.slice(14) as keyof AlertDraft['channels']] = input.value;
    } else if (name.startsWith('alert-notify-')) {
      draft.notifyOn[name.slice(13) as keyof AlertDraft['notifyOn']] = (input as HTMLInputElement).checked;
    }
    draft.dirty = true; this.persist();
    const status = document.getElementById('alertStatus'); if (status) status.textContent = t('unsavedChanges');
    return true;
  }
  click(action: string): boolean {
    if (action !== 'alerts-reload') return false;
    void this.enter(true); return true;
  }
  async save(): Promise<void> {
    if (this.saving || this.loading) return;
    const strategy = this.state.alertStrategy, draft = this.draft();
    if (!Object.values(draft.thresholds).every(Number.isFinite)) {
      this.error = true; this.message = t('invalidThresholds'); this.redraw(); return;
    }
    this.saving = true; this.error = false; this.message = ''; this.redraw();
    try {
      const record = this.records.get(strategy) || createDefaultAlertSettings(strategy);
      const saved = await saveAlertSettings(buildAlertSettingsUpdate(record, draft));
      this.records.set(strategy, saved); this.state.alerts[strategy] = this.fromRecord(saved);
      this.persist(); this.message = t('alertSettingsSaved');
    } catch { this.error = true; this.message = t('operationSaveFailed'); }
    finally { this.saving = false; this.redraw(); }
  }
}
