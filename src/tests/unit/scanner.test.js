/**
 * Scanner Module Tests
 *
 * Tests pure utility functions, the investment recommendation decision tree,
 * time-horizon recommendations, ML insights HTML generation, and data-loading
 * functions from core/scanner.js.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Provide minimal document/DOM mocks BEFORE scanner.js loads ──
vi.hoisted(() => {
  if (!globalThis.document) {
    globalThis.document = {
      getElementById: () => null,
      createElement: (tag) => ({
        tagName: tag,
        style: {},
        href: '',
        download: '',
        click: () => {},
        classList: { add: () => {}, remove: () => {} },
      }),
      addEventListener: () => {},
    };
  }
  if (!globalThis.Blob) {
    globalThis.Blob = class Blob {
      constructor(parts, opts) { this.parts = parts; this.type = opts?.type; }
    };
  }
  if (!globalThis.URL) {
    globalThis.URL = {};
  }
  if (!globalThis.URL.createObjectURL) {
    globalThis.URL.createObjectURL = () => 'blob:mock';
  }
  if (!globalThis.URL.revokeObjectURL) {
    globalThis.URL.revokeObjectURL = () => {};
  }
});

// ── Mock heavy dependencies that have side-effects or complex dep chains ──
vi.mock('../../dashboard/portfolio-dashboard.js', () => ({
  initDashboard: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../reports/index.js', () => ({
  exportBacktestToExcel: vi.fn(),
  exportScanResultsToExcel: vi.fn(),
  generateBacktestPDF: vi.fn(),
  generateComparativePDF: vi.fn(),
  generateComparativeExcel: vi.fn(),
}));

vi.mock('../../alerts/alert-manager.js', () => ({
  notifyStrongSignals: vi.fn(),
}));

vi.mock('../../ml/adaptive-scoring.js', () => ({
  adjustScoresBatch: vi.fn(),
  PerformanceTracker: vi.fn(),
  loadPerformanceTracker: vi.fn(),
  savePerformanceTracker: vi.fn(),
  PerformanceRecord: vi.fn(),
}));

vi.mock('../../ml/regime-prediction.js', () => ({
  predictRegime: vi.fn(),
  extractRegimeFeatures: vi.fn(),
}));

vi.mock('../../ml/recommendation-engine.js', () => ({
  generateRecommendations: vi.fn(),
  analyzeAssetML: vi.fn().mockReturnValue(null),
}));

vi.mock('../../ml/anomaly-detection.js', () => ({
  detectAllAnomalies: vi.fn().mockReturnValue([]),
  getAnomalySummary: vi.fn().mockReturnValue({}),
}));

// ── Import the module under test ──
import {
  formatPct,
  formatNumber,
  formatCapital,
  getMetricColor,
  getRSIDescription,
  getRegimeInterpretation,
  generateInvestmentRecommendation,
  generateTimeHorizonRecommendations,
  checkMLAnomaliesForTicker,
  generateMLInsightsHTML,
  analyzeStock,
  loadBenchmark,
  loadYahooData,
  exportBacktestToCSV,
  SECTOR_COLORS,
  SECTOR_NAMES,
  appState,
} from '../../core/scanner.js';

// ═══════════════════════════════════════════════════════════════
// FORMATTING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

describe('formatPct', () => {
  it('formats a positive percentage with + sign by default', () => {
    expect(formatPct(12.345)).toBe('+12.35%');
  });

  it('formats a negative percentage without + sign', () => {
    expect(formatPct(-5.6)).toBe('-5.60%');
  });

  it('formats zero as 0.00%', () => {
    expect(formatPct(0)).toBe('0.00%');
  });

  it('returns N/A for non-finite values', () => {
    expect(formatPct(NaN)).toBe('N/A');
    expect(formatPct(Infinity)).toBe('N/A');
    expect(formatPct(-Infinity)).toBe('N/A');
  });

  it('omits + sign when showSign is false', () => {
    expect(formatPct(12.5, { showSign: false })).toBe('12.50%');
  });
});

describe('formatNumber', () => {
  it('formats a number to 2 decimal places by default', () => {
    expect(formatNumber(3.14159)).toBe('3.14');
  });

  it('formats with custom decimal places', () => {
    expect(formatNumber(3.14159, 4)).toBe('3.1416');
  });

  it('formats integers', () => {
    expect(formatNumber(42, 0)).toBe('42');
  });

  it('returns N/A for non-finite values', () => {
    expect(formatNumber(NaN)).toBe('N/A');
    expect(formatNumber(Infinity)).toBe('N/A');
    expect(formatNumber(undefined)).toBe('N/A');
  });
});

describe('formatCapital', () => {
  it('formats a number using es-ES locale', () => {
    const result = formatCapital(1234567);
    // es-ES uses dots as thousand separators
    expect(result).toContain('1');
    expect(result).not.toBe('N/A');
  });

  it('formats zero', () => {
    expect(formatCapital(0)).toBe('0');
  });

  it('returns N/A for non-finite values', () => {
    expect(formatCapital(NaN)).toBe('N/A');
    expect(formatCapital(Infinity)).toBe('N/A');
  });

  it('formats negative numbers', () => {
    const result = formatCapital(-5000);
    expect(result).not.toBe('N/A');
  });
});

// ═══════════════════════════════════════════════════════════════
// getMetricColor
// ═══════════════════════════════════════════════════════════════

describe('getMetricColor', () => {
  const thresholds = { excellent: 80, good: 60, poor: 40 };

  it('returns green for excellent values', () => {
    expect(getMetricColor(90, thresholds)).toBe('#10b981');
    expect(getMetricColor(80, thresholds)).toBe('#10b981');
  });

  it('returns light green for good values', () => {
    expect(getMetricColor(70, thresholds)).toBe('#4ade80');
    expect(getMetricColor(60, thresholds)).toBe('#4ade80');
  });

  it('returns yellow for poor values', () => {
    expect(getMetricColor(50, thresholds)).toBe('#fbbf24');
    expect(getMetricColor(40, thresholds)).toBe('#fbbf24');
  });

  it('returns red for bad values', () => {
    expect(getMetricColor(30, thresholds)).toBe('#f87171');
    expect(getMetricColor(0, thresholds)).toBe('#f87171');
  });
});

// ═══════════════════════════════════════════════════════════════
// getRSIDescription
// ═══════════════════════════════════════════════════════════════

describe('getRSIDescription', () => {
  it('returns overbought for RSI >= 70', () => {
    const result = getRSIDescription(75);
    expect(result.color).toBe('#f87171');
    expect(result.icon).toBe('⚠️');
  });

  it('returns healthy bullish for RSI 60-69', () => {
    const result = getRSIDescription(65);
    expect(result.color).toBe('#fbbf24');
    expect(result.icon).toBe('📈');
  });

  it('returns oversold for RSI <= 30', () => {
    const result = getRSIDescription(25);
    expect(result.color).toBe('#4ade80');
    expect(result.icon).toBe('🎯');
  });

  it('returns weakness for RSI 31-40', () => {
    const result = getRSIDescription(35);
    expect(result.color).toBe('#60a5fa');
    expect(result.icon).toBe('📉');
  });

  it('returns neutral for RSI 41-59', () => {
    const result = getRSIDescription(50);
    expect(result.color).toBe('#94a3b8');
    expect(result.icon).toBe('⚖️');
  });

  it('returns overbought at exactly 70', () => {
    const result = getRSIDescription(70);
    expect(result.color).toBe('#f87171');
  });

  it('returns oversold at exactly 30', () => {
    const result = getRSIDescription(30);
    expect(result.color).toBe('#4ade80');
  });
});

// ═══════════════════════════════════════════════════════════════
// getRegimeInterpretation
// ═══════════════════════════════════════════════════════════════

describe('getRegimeInterpretation', () => {
  it('returns a string for a known regime type', () => {
    const result = getRegimeInterpretation('bull');
    expect(typeof result).toBe('string');
  });

  it('returns a string for unknown regime type', () => {
    const result = getRegimeInterpretation('nonexistent_regime');
    expect(typeof result).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

describe('SECTOR_COLORS', () => {
  it('has a colour for all standard GICS sectors', () => {
    const expectedIds = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 999];
    for (const id of expectedIds) {
      expect(SECTOR_COLORS[id]).toBeDefined();
      expect(SECTOR_COLORS[id]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('SECTOR_NAMES', () => {
  it('maps sector IDs to human-readable names', () => {
    expect(SECTOR_NAMES[100]).toBe('Energy');
    expect(SECTOR_NAMES[800]).toBe('Information Technology');
    expect(SECTOR_NAMES[999]).toBe('Others');
  });

  it('has entries for all standard sectors', () => {
    expect(Object.keys(SECTOR_NAMES).length).toBeGreaterThanOrEqual(12);
  });
});

describe('appState', () => {
  it('has expected default shape', () => {
    expect(appState).toHaveProperty('scanResults');
    expect(appState).toHaveProperty('portfolio');
    expect(appState).toHaveProperty('market');
    expect(appState).toHaveProperty('strategy');
    expect(appState).toHaveProperty('scanCompleted');
    expect(appState).toHaveProperty('mlEnabled');
  });

  it('starts with mlEnabled true', () => {
    expect(appState.mlEnabled).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// checkMLAnomaliesForTicker
// ═══════════════════════════════════════════════════════════════

describe('checkMLAnomaliesForTicker', () => {
  it('returns hasAnomalies false when no anomalies exist', () => {
    // Module-level mlAnomalies is [] by default
    const result = checkMLAnomaliesForTicker('AAPL');
    expect(result.hasAnomalies).toBe(false);
    expect(result.types).toEqual([]);
    expect(result.maxSeverity).toBeNull();
    expect(result.count).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// generateTimeHorizonRecommendations
// ═══════════════════════════════════════════════════════════════

describe('generateTimeHorizonRecommendations', () => {
  it('returns HTML containing all three time horizons', () => {
    const result = { scoreShort: 75, scoreMedium: 60, scoreLong: 45 };
    const html = generateTimeHorizonRecommendations(result);
    expect(html).toContain('75/100');
    expect(html).toContain('60/100');
    expect(html).toContain('45/100');
  });

  it('uses green color for high scores', () => {
    const result = { scoreShort: 85, scoreMedium: 85, scoreLong: 85 };
    const html = generateTimeHorizonRecommendations(result);
    expect(html).toContain('#10b981');
  });

  it('uses red color for low scores', () => {
    const result = { scoreShort: 30, scoreMedium: 30, scoreLong: 30 };
    const html = generateTimeHorizonRecommendations(result);
    expect(html).toContain('#ef4444');
  });

  it('defaults to 0 for missing scores', () => {
    const html = generateTimeHorizonRecommendations({});
    expect(html).toContain('0/100');
  });

  it('applies correct color thresholds', () => {
    const cases = [
      { score: 70, color: '#10b981' },
      { score: 60, color: '#3b82f6' },
      { score: 50, color: '#8b5cf6' },
      { score: 40, color: '#f59e0b' },
      { score: 30, color: '#ef4444' },
    ];
    for (const { score, color } of cases) {
      const html = generateTimeHorizonRecommendations({
        scoreShort: score, scoreMedium: 50, scoreLong: 50
      });
      expect(html).toContain(color);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// generateMLInsightsHTML
// ═══════════════════════════════════════════════════════════════

describe('generateMLInsightsHTML', () => {
  it('returns empty string for null input', () => {
    expect(generateMLInsightsHTML(null)).toBe('');
  });

  it('returns empty string for empty insights object', () => {
    expect(generateMLInsightsHTML({})).toBe('');
  });

  it('renders regime impact section when present', () => {
    const insights = {
      regimeImpact: {
        impact: 'favorable',
        regime: 'bull',
        previous_regime: 'neutral',
        confidence: 0.85,
        isDefensive: false,
        isAggressive: true,
      },
    };
    const html = generateMLInsightsHTML(insights);
    expect(html).toContain('#10b981'); // favorable color
  });

  it('renders momentum shift section when not stable', () => {
    const insights = {
      momentumShift: {
        shift: 'accelerating',
        strength: 'strong',
        percentile: 85,
        acceleration: 2.5,
      },
    };
    const html = generateMLInsightsHTML(insights);
    expect(html).toContain('#10b981'); // accelerating color
  });

  it('does NOT render momentum shift when shift is stable', () => {
    const insights = {
      momentumShift: { shift: 'stable' },
    };
    const html = generateMLInsightsHTML(insights);
    expect(html).toBe('');
  });

  it('renders ML signal section when present', () => {
    const insights = {
      mlSignal: {
        signal: 'STRONG_BUY',
        confidence: 0.92,
        mlScore: 88,
      },
    };
    const html = generateMLInsightsHTML(insights);
    expect(html).toContain('#10b981'); // STRONG_BUY color
  });

  it('renders risk score section when present', () => {
    const insights = {
      riskScore: {
        riskLevel: 'HIGH',
        riskScore: 75,
        relativeRiskPercentile: 80,
      },
    };
    const html = generateMLInsightsHTML(insights);
    expect(html).toContain('#f59e0b'); // HIGH risk color
  });

  it('renders all sections when all present', () => {
    const insights = {
      regimeImpact: {
        impact: 'unfavorable', regime: 'bear',
        previous_regime: 'neutral', confidence: 0.7,
        isDefensive: true, isAggressive: false,
      },
      momentumShift: {
        shift: 'decelerating', strength: 'moderate',
        percentile: 40, acceleration: -1.2,
      },
      mlSignal: {
        signal: 'SELL', confidence: 0.6, mlScore: 35,
      },
      riskScore: {
        riskLevel: 'VERY_HIGH', riskScore: 90, relativeRiskPercentile: 95,
      },
    };
    const html = generateMLInsightsHTML(insights);
    // Should have the section title
    expect(html).toContain('🧠');
    // All four sections rendered
    expect(html).toContain('🌐'); // regime
    expect(html).toContain('⚡'); // momentum
    expect(html).toContain('🤖'); // ml signal
    expect(html).toContain('⚠️'); // risk
  });
});

// ═══════════════════════════════════════════════════════════════
// generateInvestmentRecommendation - DECISION TREE
// ═══════════════════════════════════════════════════════════════

describe('generateInvestmentRecommendation', () => {
  /**
   * Helper to build a stock analysis result with sensible defaults.
   * Overrides can target any property.
   */
  function makeResult(overrides = {}) {
    return {
      ticker: 'TEST',
      scoreTotal: 65,
      signal: { text: 'HOLD' },
      scoreTrend: 55,
      scoreMomentum: 55,
      scoreRisk: 55,
      scoreLiquidity: 55,
      scoreShort: 55,
      scoreMedium: 55,
      scoreLong: 55,
      hasAnomalies: false,
      anomalyPenalty: 0,
      anomalies: [],
      details: {
        trend: {},
        momentum: {
          rsi: '50',
          roc6m: '5',
          roc12m: '5',
          alpha6m: '0',
        },
        risk: {
          volatility: '20',
          maxDrawdown: '10',
        },
        liquidity: {},
      },
      ...overrides,
    };
  }

  it('returns critical anomaly warning when anomaly penalty is high', () => {
    const result = makeResult({
      hasAnomalies: true,
      anomalyPenalty: 20,
      anomalies: ['PUMP_RISK'],
    });
    const rec = generateInvestmentRecommendation(result);
    expect(rec.key).toBe('recommendation.critical_anomaly_warning');
    expect(rec.style.icon).toBe('⚠️');
    expect(rec.style.borderColor).toBe('#dc2626');
  });

  it('returns extreme volatility crisis when very high vol + deep drawdown', () => {
    const result = makeResult({
      details: {
        trend: {},
        momentum: { rsi: '50', roc6m: '5', roc12m: '5', alpha6m: '0' },
        risk: { volatility: '55', maxDrawdown: '35' },
        liquidity: {},
      },
    });
    const rec = generateInvestmentRecommendation(result);
    expect(rec.key).toBe('recommendation.extreme_volatility_crisis');
    expect(rec.style.icon).toBe('🚨');
  });

  it('returns undervalued opportunity when alpha is negative and score decent', () => {
    const result = makeResult({
      scoreTotal: 65,
      details: {
        trend: {},
        momentum: { rsi: '45', roc6m: '-8', roc12m: '2', alpha6m: '-10' },
        risk: { volatility: '20', maxDrawdown: '10' },
        liquidity: {},
      },
    });
    const rec = generateInvestmentRecommendation(result);
    expect(rec.key).toBe('recommendation.undervalued_opportunity');
    expect(rec.style.icon).toBe('📈');
  });

  it('returns overvalued warning when RSI > 70 and roc6m > 15', () => {
    const result = makeResult({
      scoreMomentum: 85,
      details: {
        trend: {},
        momentum: { rsi: '75', roc6m: '20', roc12m: '15', alpha6m: '5' },
        risk: { volatility: '20', maxDrawdown: '10' },
        liquidity: {},
      },
    });
    const rec = generateInvestmentRecommendation(result);
    expect(rec.key).toBe('recommendation.overvalued_warning');
    expect(rec.style.icon).toBe('⚠️');
  });

  it('returns strong momentum buy when momentum > 75 and roc6m > 10 and score > 70', () => {
    const result = makeResult({
      scoreTotal: 75,
      scoreMomentum: 80,
      details: {
        trend: {},
        momentum: { rsi: '60', roc6m: '15', roc12m: '10', alpha6m: '3' },
        risk: { volatility: '20', maxDrawdown: '10' },
        liquidity: {},
      },
    });
    const rec = generateInvestmentRecommendation(result);
    expect(rec.key).toBe('recommendation.strong_momentum_buy');
    expect(rec.style.icon).toBe('🚀');
  });

  it('returns high volatility moderate when vol > 35 but not deep drawdown', () => {
    const result = makeResult({
      scoreRisk: 55,
      details: {
        trend: {},
        momentum: { rsi: '50', roc6m: '5', roc12m: '5', alpha6m: '0' },
        risk: { volatility: '40', maxDrawdown: '20' },
        liquidity: {},
      },
    });
    const rec = generateInvestmentRecommendation(result);
    expect(rec.key).toBe('recommendation.high_volatility_moderate');
    expect(rec.style.icon).toBe('⚡');
  });

  it('returns stable quality when low volatility and score > 65', () => {
    const result = makeResult({
      scoreTotal: 70,
      details: {
        trend: {},
        momentum: { rsi: '50', roc6m: '5', roc12m: '5', alpha6m: '0' },
        risk: { volatility: '15', maxDrawdown: '8' },
        liquidity: {},
      },
    });
    const rec = generateInvestmentRecommendation(result);
    expect(rec.key).toBe('recommendation.stable_quality');
    expect(rec.style.icon).toBe('🛡️');
  });

  it('returns oversold bounce when RSI < 30 and score > 50', () => {
    const result = makeResult({
      scoreTotal: 55,
      scoreMomentum: 50,
      scoreTrend: 50,
      details: {
        trend: {},
        momentum: { rsi: '25', roc6m: '2', roc12m: '2', alpha6m: '0' },
        risk: { volatility: '25', maxDrawdown: '20' },
        liquidity: {},
      },
    });
    const rec = generateInvestmentRecommendation(result);
    expect(rec.key).toBe('recommendation.oversold_bounce');
    expect(rec.style.icon).toBe('📊');
  });

  it('returns bearish decline when trend < 40 and roc12m < -10', () => {
    const result = makeResult({
      scoreTrend: 30,
      scoreMomentum: 45,
      scoreTotal: 45,
      details: {
        trend: {},
        momentum: { rsi: '40', roc6m: '-5', roc12m: '-15', alpha6m: '-5' },
        risk: { volatility: '25', maxDrawdown: '20' },
        liquidity: {},
      },
    });
    const rec = generateInvestmentRecommendation(result);
    expect(rec.key).toBe('recommendation.bearish_decline');
    expect(rec.style.icon).toBe('📉');
  });

  it('returns weak momentum wait when momentum < 40', () => {
    const result = makeResult({
      scoreMomentum: 35,
      scoreTrend: 50,
      scoreTotal: 55,
      details: {
        trend: {},
        momentum: { rsi: '45', roc6m: '2', roc12m: '2', alpha6m: '0' },
        risk: { volatility: '25', maxDrawdown: '20' },
        liquidity: {},
      },
    });
    const rec = generateInvestmentRecommendation(result);
    expect(rec.key).toBe('recommendation.weak_momentum_wait');
    expect(rec.style.icon).toBe('⏸️');
  });

  it('returns bullish trend when trend > 70 and momentum > 60', () => {
    const result = makeResult({
      scoreTrend: 75,
      scoreMomentum: 65,
      scoreTotal: 65,
      details: {
        trend: {},
        momentum: { rsi: '55', roc6m: '8', roc12m: '8', alpha6m: '2' },
        risk: { volatility: '22', maxDrawdown: '12' },
        liquidity: {},
      },
    });
    const rec = generateInvestmentRecommendation(result);
    expect(rec.key).toBe('recommendation.bullish_trend');
    expect(rec.style.icon).toBe('✅');
  });

  it('returns good opportunity for high score with no special conditions', () => {
    const result = makeResult({
      scoreTotal: 75,
      scoreTrend: 60,
      scoreMomentum: 55,
      details: {
        trend: {},
        momentum: { rsi: '55', roc6m: '6', roc12m: '6', alpha6m: '1' },
        risk: { volatility: '22', maxDrawdown: '12' },
        liquidity: {},
      },
    });
    const rec = generateInvestmentRecommendation(result);
    expect(rec.key).toBe('recommendation.good_opportunity');
    expect(rec.style.icon).toBe('💼');
  });

  it('returns neutral hold for medium score with no triggers', () => {
    const result = makeResult({
      scoreTotal: 55,
      scoreTrend: 55,
      scoreMomentum: 55,
      details: {
        trend: {},
        momentum: { rsi: '50', roc6m: '3', roc12m: '3', alpha6m: '0' },
        risk: { volatility: '22', maxDrawdown: '15' },
        liquidity: {},
      },
    });
    const rec = generateInvestmentRecommendation(result);
    expect(rec.key).toBe('recommendation.neutral_hold');
    expect(rec.style.icon).toBe('⚖️');
  });

  it('returns avoid low score for score below 50', () => {
    const result = makeResult({
      scoreTotal: 40,
      scoreTrend: 50,
      scoreMomentum: 50,
      details: {
        trend: {},
        momentum: { rsi: '45', roc6m: '1', roc12m: '1', alpha6m: '0' },
        risk: { volatility: '22', maxDrawdown: '15' },
        liquidity: {},
      },
    });
    const rec = generateInvestmentRecommendation(result);
    expect(rec.key).toBe('recommendation.avoid_low_score');
    expect(rec.style.icon).toBe('❌');
  });

  it('includes mlInsights as null when no market data provided', () => {
    const result = makeResult();
    const rec = generateInvestmentRecommendation(result);
    expect(rec.mlInsights).toBeNull();
  });

  it('calls analyzeAssetML when options.marketData is provided', async () => {
    const { analyzeAssetML } = await import('../../ml/recommendation-engine.js');
    analyzeAssetML.mockReturnValue({ regimeImpact: null });

    const result = makeResult();
    generateInvestmentRecommendation(result, {
      marketData: { regime: 'bull' },
    });
    expect(analyzeAssetML).toHaveBeenCalled();
  });

  it('returns result structure with key, params, style, and mlInsights', () => {
    const result = makeResult();
    const rec = generateInvestmentRecommendation(result);
    expect(rec).toHaveProperty('key');
    expect(rec).toHaveProperty('params');
    expect(rec).toHaveProperty('style');
    expect(rec).toHaveProperty('mlInsights');
    expect(rec.style).toHaveProperty('borderColor');
    expect(rec.style).toHaveProperty('backgroundColor');
    expect(rec.style).toHaveProperty('icon');
  });
});

// ═══════════════════════════════════════════════════════════════
// loadYahooData
// ═══════════════════════════════════════════════════════════════

describe('loadYahooData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty array when fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const data = await loadYahooData('FAIL', '.US');
    expect(data).toEqual([]);
  });

  it('returns empty array when chart result is missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ chart: { result: null } }),
    });
    const data = await loadYahooData('NORESULT', '.X');
    expect(data).toEqual([]);
  });

  it('parses valid Yahoo Finance response', async () => {
    const now = Math.floor(Date.now() / 1000);
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          chart: {
            result: [
              {
                timestamp: [now - 86400, now],
                indicators: {
                  quote: [
                    {
                      close: [100, 105],
                      high: [102, 107],
                      low: [98, 103],
                      volume: [1000, 2000],
                    },
                  ],
                  adjclose: [{ adjclose: [100, 105] }],
                },
              },
            ],
          },
        }),
    });
    const data = await loadYahooData('VALID', '.TEST');
    expect(data).toHaveLength(2);
    expect(data[0]).toHaveProperty('close', 100);
    expect(data[0]).toHaveProperty('volume', 1000);
    expect(data[0]).toHaveProperty('high', 102);
    expect(data[0]).toHaveProperty('low', 98);
    expect(data[0]).toHaveProperty('date');
  });

  it('filters out null data points', async () => {
    const now = Math.floor(Date.now() / 1000);
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          chart: {
            result: [
              {
                timestamp: [now - 86400, now],
                indicators: {
                  quote: [
                    {
                      close: [null, 105],
                      high: [null, 107],
                      low: [null, 103],
                      volume: [null, 2000],
                    },
                  ],
                  adjclose: [{ adjclose: [null, 105] }],
                },
              },
            ],
          },
        }),
    });
    const data = await loadYahooData('PARTIAL', '.P');
    expect(data).toHaveLength(1);
    expect(data[0].close).toBe(105);
  });

  it('uses cached data on second call', async () => {
    const now = Math.floor(Date.now() / 1000);
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          chart: {
            result: [
              {
                timestamp: [now],
                indicators: {
                  quote: [{ close: [50], high: [55], low: [45], volume: [100] }],
                  adjclose: [{ adjclose: [50] }],
                },
              },
            ],
          },
        }),
    });
    // First call populates cache
    const data1 = await loadYahooData('CACHED', '.C');
    // Second call should use cache (no new fetch)
    const data2 = await loadYahooData('CACHED', '.C');
    expect(data1).toEqual(data2);
    // fetch should only be called once for this symbol
    const cachedCalls = globalThis.fetch.mock.calls.filter(c =>
      c[0].includes('CACHED.C')
    );
    expect(cachedCalls).toHaveLength(1);
  });

  it('handles ticker that already contains a dot (suffix not appended)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          chart: {
            result: [
              {
                timestamp: [Math.floor(Date.now() / 1000)],
                indicators: {
                  quote: [{ close: [200], high: [210], low: [190], volume: [500] }],
                  adjclose: [{ adjclose: [200] }],
                },
              },
            ],
          },
        }),
    });
    await loadYahooData('TEF.MC', '.MC');
    const url = globalThis.fetch.mock.calls[0][0];
    // Should use the full symbol as-is since it contains a dot
    expect(url).toContain('symbol=TEF.MC');
  });
});

// ═══════════════════════════════════════════════════════════════
// exportBacktestToCSV
// ═══════════════════════════════════════════════════════════════

describe('exportBacktestToCSV', () => {
  it('does nothing when results are empty', () => {
    // Should not throw
    expect(() => exportBacktestToCSV([])).not.toThrow();
    expect(() => exportBacktestToCSV(null)).not.toThrow();
    expect(() => exportBacktestToCSV(undefined)).not.toThrow();
  });

  it('creates and clicks a download link for valid results', () => {
    // Setup URL mock (jsdom doesn't provide createObjectURL)
    const revokeObjectURL = vi.fn();
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    globalThis.URL.createObjectURL = createObjectURL;
    globalThis.URL.revokeObjectURL = revokeObjectURL;

    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });

    exportBacktestToCSV([
      {
        strategyName: 'Test Strategy',
        initialCapital: 10000,
        metrics: {
          cagr: 12.5,
          sharpeRatio: 1.5,
          maxDrawdown: -15.3,
          winRate: 0.6,
          alpha: 3.2,
          beta: 0.9,
        },
      },
    ]);

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// analyzeStock
// ═══════════════════════════════════════════════════════════════

describe('analyzeStock', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns passed:false when loadYahooData returns empty', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));
    const result = await analyzeStock(
      { ticker: 'BAD', name: 'Bad Stock' },
      '.US',
      { filters: { min_days_history: 10 }, indicators: {}, weights: {}, signals: {} },
      null,
      null
    );
    expect(result.passed).toBe(false);
  });

  it('returns passed:false when insufficient history', async () => {
    const now = Math.floor(Date.now() / 1000);
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          chart: {
            result: [
              {
                timestamp: [now],
                indicators: {
                  quote: [{ close: [100], high: [105], low: [95], volume: [1000] }],
                  adjclose: [{ adjclose: [100] }],
                },
              },
            ],
          },
        }),
    });
    const result = await analyzeStock(
      { ticker: 'SHORT_HIST', name: 'Short History' },
      '.SH',
      { filters: { min_days_history: 100 }, indicators: {}, weights: {}, signals: {} },
      null,
      null
    );
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('Insufficient history');
  });
});

// ═══════════════════════════════════════════════════════════════
// loadBenchmark
// ═══════════════════════════════════════════════════════════════

describe('loadBenchmark', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null for unknown market suffix', async () => {
    const result = await loadBenchmark('.NONEXISTENT');
    expect(result).toBeNull();
  });

  it('returns null when benchmark data is insufficient', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          chart: {
            result: [
              {
                timestamp: [Math.floor(Date.now() / 1000)],
                indicators: {
                  quote: [{ close: [100], high: [105], low: [95], volume: [1000] }],
                  adjclose: [{ adjclose: [100] }],
                },
              },
            ],
          },
        }),
    });
    // Use a known suffix that maps to a benchmark
    const result = await loadBenchmark('.MC');
    expect(result).toBeNull(); // insufficient data (only 1 point, need 252)
  });
});
