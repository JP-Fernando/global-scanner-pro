import i18n from '../i18n/i18n.js';
import { formatNumber } from '../shared/frontend/formatting.js';
export const text = (key: string) => i18n.t(`android.${key}`);
export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
export const numberText = (value: unknown, digits = 2) => typeof value === 'number' && Number.isFinite(value)
  ? formatNumber(value, digits) : '—';
export const strategyText = (key: string) => i18n.t(`strategies.${key}`);
export const dateText = (date: string) => Number.isFinite(Date.parse(date))
  ? /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date  }T12:00:00`).toLocaleDateString(i18n.getCurrentLanguage())
    : new Date(date).toLocaleString(i18n.getCurrentLanguage()) : '—';
export const fact = (label: string, value: unknown) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;

export function correctionsMarkup(corrections: unknown[]): string {
  return corrections.map(raw => {
    const item = raw as { asset?: string; action?: string; from?: string; to?: string; reason?: string };
    return `<li>${escapeHtml([item.asset, item.action, item.from && item.to ? `${item.from} → ${item.to}` : '', item.reason].filter(Boolean).join(' · '))}</li>`;
  }).join('') || '<li>—</li>';
}

/** Chart coordinates are presentation only; values and metrics come from the tracker. */
export function equityMarkup(points: { date: string; value: number }[]): string {
  const valid = points.filter(point => Number.isFinite(point.value));
  if (valid.length < 2) return '';
  const low = Math.min(...valid.map(point => point.value));
  const range = Math.max(1, Math.max(...valid.map(point => point.value)) - low);
  return `<svg class="projection-chart" viewBox="0 0 320 170" role="img" aria-label="${escapeHtml(text('equityHistory'))}"><polyline
    fill="none" stroke="#7de2cb" stroke-width="2.5" points="${valid.map((point, index) =>
      `${8 + index / (valid.length - 1) * 304},${158 - (point.value - low) / range * 145}`).join(' ')}" /></svg>`;
}
