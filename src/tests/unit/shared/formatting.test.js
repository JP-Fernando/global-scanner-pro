import { describe, expect, it } from 'vitest';

import {
  formatCapital,
  formatCurrencyValue,
  formatNumber,
  formatPct,
  formatReturn,
} from '../../../shared/frontend/formatting.js';

describe('formatting shared helpers', () => {
  it('formats percentages with optional sign', () => {
    expect(formatPct(12.345)).toBe('+12.35%');
    expect(formatPct(-3)).toBe('-3.00%');
    expect(formatPct(5, { showSign: false })).toBe('5.00%');
    expect(formatPct(NaN)).toBe('N/A');
  });

  it('formats numbers and capital, guarding non-finite values', () => {
    expect(formatNumber(1.23456, 3)).toBe('1.235');
    expect(formatNumber(Infinity)).toBe('N/A');
    expect(formatCapital(1234567)).toBe(new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(1234567));
    expect(formatCapital(undefined)).toBe('N/A');
  });

  it('formats currency without decimals', () => {
    expect(formatCurrencyValue(1234.6)).toBe('$1,235');
    expect(formatCurrencyValue(1000, 'EUR')).toBe('€1,000');
  });

  it('formats fractional returns', () => {
    expect(formatReturn(0.1234)).toBe('+12.3%');
    expect(formatReturn(-0.05)).toBe('-5.0%');
    expect(formatReturn(0)).toBe('0.0%');
  });
});
