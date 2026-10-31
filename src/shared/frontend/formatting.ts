/**
 * Display formatting helpers shared by the desktop and Android frontends.
 * Pure functions only — no DOM, no i18n lookups.
 */

export function formatPct(value: any, { showSign = true } = {}): string {
  if (!Number.isFinite(value)) return 'N/A';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value: any, decimals = 2): string {
  if (!Number.isFinite(value)) return 'N/A';
  return value.toFixed(decimals);
}

export function formatCapital(value: any): string {
  if (!Number.isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCurrencyValue(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

/** Formats a fractional return (0.123 → "+12.3%"). */
export function formatReturn(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
}
