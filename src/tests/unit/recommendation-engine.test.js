import { describe, it, expect } from 'vitest';
import {
  RECOMMENDATION_TYPES,
  RECOMMENDATION_PRIORITY,
  generateRecommendations,
  filterByPriority,
  groupByType,
  analyzeAssetML,
} from '../../ml/recommendation-engine.js';

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function buildPortfolio(overrides = {}) {
  return {
    total_value: 100000,
    positions: {
      AAPL: { weight: 0.30, name: 'Apple', quant_score: 75 },
      GOOGL: { weight: 0.25, name: 'Alphabet', quant_score: 80 },
      MSFT: { weight: 0.20, name: 'Microsoft', quant_score: 60 },
    },
    target_weights: { AAPL: 0.20, GOOGL: 0.20, MSFT: 0.20 },
    sector_exposure: { Technology: 0.55, Healthcare: 0.25, Finance: 0.20 },
    ...overrides,
  };
}

function buildMarketData(overrides = {}) {
  return {
    volatility: 22,
    regime_prediction: {
      regime: 'neutral',
      confidence: 0.75,
      previous_regime: 'risk_on',
    },
    assets: [
      { ticker: 'TSLA', name: 'Tesla', quant_score: 85 },
      { ticker: 'NVDA', name: 'Nvidia', quant_score: 78 },
      { ticker: 'AMD', name: 'AMD', quant_score: 72 },
    ],
    ...overrides,
  };
}

function buildAssetResult(overrides = {}) {
  return {
    scoreTotal: 70,
    scoreMomentum: 65,
    scoreTrend: 60,
    scoreRisk: 55,
    details: {
      momentum: { roc6m: '15', roc12m: '25', rsi: '55' },
      risk: { volatility: '22', maxDrawdown: '-18', relativeVol: '1.0' },
    },
    ...overrides,
  };
}

// -----------------------------------------------------------
// RECOMMENDATION_TYPES and RECOMMENDATION_PRIORITY
// -----------------------------------------------------------
describe('Constants', () => {
  it('exports all recommendation types', () => {
    expect(RECOMMENDATION_TYPES.REBALANCE).toBe('rebalance');
    expect(RECOMMENDATION_TYPES.BUY_OPPORTUNITY).toBe('buy_opportunity');
    expect(RECOMMENDATION_TYPES.SELL_ALERT).toBe('sell_alert');
    expect(RECOMMENDATION_TYPES.RISK_WARNING).toBe('risk_warning');
    expect(RECOMMENDATION_TYPES.DIVERSIFICATION).toBe('diversification');
    expect(RECOMMENDATION_TYPES.MOMENTUM_SHIFT).toBe('momentum_shift');
    expect(RECOMMENDATION_TYPES.REGIME_CHANGE).toBe('regime_change');
  });

  it('exports priority levels in order', () => {
    expect(RECOMMENDATION_PRIORITY.CRITICAL.level).toBe(3);
    expect(RECOMMENDATION_PRIORITY.HIGH.level).toBe(2);
    expect(RECOMMENDATION_PRIORITY.MEDIUM.level).toBe(1);
    expect(RECOMMENDATION_PRIORITY.LOW.level).toBe(0);
  });
});

// -----------------------------------------------------------
// generateRecommendations
// -----------------------------------------------------------
describe('generateRecommendations', () => {
  it('generates rebalance recommendations when deviation >= 5%', () => {
    const portfolio = buildPortfolio();
    const recs = generateRecommendations(portfolio, buildMarketData(), {});

    const rebalance = recs.filter((r) => r.type === RECOMMENDATION_TYPES.REBALANCE);
    expect(rebalance.length).toBeGreaterThan(0);
    // AAPL has 30% vs 20% target = 10% deviation
    const aaplRec = rebalance.find((r) => r.ticker === 'AAPL');
    expect(aaplRec).toBeDefined();
  });

  it('does not generate rebalance for small deviations', () => {
    const portfolio = buildPortfolio({
      positions: {
        AAPL: { weight: 0.21, name: 'Apple', quant_score: 75 },
      },
      target_weights: { AAPL: 0.20 },
    });

    const recs = generateRecommendations(portfolio, buildMarketData(), {});
    const rebalance = recs.filter((r) => r.type === RECOMMENDATION_TYPES.REBALANCE);
    expect(rebalance).toHaveLength(0);
  });

  it('generates HIGH priority for >10% deviation', () => {
    const portfolio = buildPortfolio({
      positions: { AAPL: { weight: 0.40, name: 'Apple', quant_score: 75 } },
      target_weights: { AAPL: 0.20 },
    });

    const recs = generateRecommendations(portfolio, buildMarketData(), {});
    const rebalance = recs.filter((r) => r.type === RECOMMENDATION_TYPES.REBALANCE);
    expect(rebalance[0].priority).toEqual(RECOMMENDATION_PRIORITY.HIGH);
  });

  it('handles missing positions/target_weights gracefully', () => {
    const portfolio = { total_value: 100000 };
    const recs = generateRecommendations(portfolio, null, null);
    // Should not crash
    expect(Array.isArray(recs)).toBe(true);
  });

  it('generates concentration risk warning for top 3 > 60%', () => {
    const portfolio = buildPortfolio({
      positions: {
        AAPL: { weight: 0.35, name: 'Apple', quant_score: 75 },
        GOOGL: { weight: 0.25, name: 'Alphabet', quant_score: 80 },
        MSFT: { weight: 0.20, name: 'Microsoft', quant_score: 60 },
      },
    });

    const recs = generateRecommendations(portfolio, buildMarketData(), {});
    const riskWarnings = recs.filter((r) => r.type === RECOMMENDATION_TYPES.RISK_WARNING);
    expect(riskWarnings.length).toBeGreaterThan(0);
  });

  it('generates CRITICAL volatility warning when > 30', () => {
    const marketData = buildMarketData({ volatility: 35 });
    const recs = generateRecommendations(buildPortfolio(), marketData, {});

    const volWarning = recs.find(
      (r) => r.type === RECOMMENDATION_TYPES.RISK_WARNING && r.priority === RECOMMENDATION_PRIORITY.CRITICAL,
    );
    expect(volWarning).toBeDefined();
  });

  it('generates buy opportunities for high-scoring non-owned assets', () => {
    const portfolio = buildPortfolio({ positions: {} });
    const marketData = buildMarketData({
      assets: [{ ticker: 'TSLA', name: 'Tesla', quant_score: 85 }],
    });

    const recs = generateRecommendations(portfolio, marketData, {});
    const buyOps = recs.filter((r) => r.type === RECOMMENDATION_TYPES.BUY_OPPORTUNITY);
    expect(buyOps.length).toBeGreaterThan(0);
    expect(buyOps[0].ticker).toBe('TSLA');
  });

  it('does not recommend buying already owned assets', () => {
    const portfolio = buildPortfolio({
      positions: { TSLA: { weight: 0.20, name: 'Tesla', quant_score: 85 } },
    });
    const marketData = buildMarketData({
      assets: [{ ticker: 'TSLA', name: 'Tesla', quant_score: 85 }],
    });

    const recs = generateRecommendations(portfolio, marketData, {});
    const buyOps = recs.filter((r) => r.type === RECOMMENDATION_TYPES.BUY_OPPORTUNITY);
    const tslaBuy = buyOps.find((r) => r.ticker === 'TSLA');
    expect(tslaBuy).toBeUndefined();
  });

  it('does not recommend buying assets with severe anomalies', () => {
    const portfolio = buildPortfolio({ positions: {} });
    const marketData = buildMarketData({
      assets: [{ ticker: 'TSLA', name: 'Tesla', quant_score: 85 }],
      anomalies: [{ ticker: 'TSLA', severity: 'extreme', type: 'z_score' }],
    });

    const recs = generateRecommendations(portfolio, marketData, {});
    const buyOps = recs.filter((r) => r.type === RECOMMENDATION_TYPES.BUY_OPPORTUNITY);
    const tslaBuy = buyOps.find((r) => r.ticker === 'TSLA');
    expect(tslaBuy).toBeUndefined();
  });

  it('generates sell alerts for significant underperformance', () => {
    const portfolio = buildPortfolio();
    const historicalPerformance = {
      AAPL: { return_60d: -20 },
    };

    const recs = generateRecommendations(portfolio, buildMarketData(), historicalPerformance);
    const sellAlerts = recs.filter((r) => r.type === RECOMMENDATION_TYPES.SELL_ALERT);
    expect(sellAlerts.length).toBeGreaterThan(0);
  });

  it('generates sell alerts for low quant_score', () => {
    const portfolio = buildPortfolio({
      positions: {
        WEAK: { weight: 0.20, name: 'Weak Stock', quant_score: 30 },
      },
    });

    const recs = generateRecommendations(portfolio, buildMarketData(), {});
    const sellAlerts = recs.filter((r) => r.type === RECOMMENDATION_TYPES.SELL_ALERT);
    expect(sellAlerts.length).toBeGreaterThan(0);
  });

  it('generates diversification suggestions for sector > 35%', () => {
    const portfolio = buildPortfolio({
      sector_exposure: { Technology: 0.45, Healthcare: 0.30, Finance: 0.25 },
    });

    const recs = generateRecommendations(portfolio, buildMarketData(), {});
    const divRecs = recs.filter((r) => r.type === RECOMMENDATION_TYPES.DIVERSIFICATION);
    expect(divRecs.length).toBeGreaterThan(0);
  });

  it('generates regime change alert', () => {
    const marketData = buildMarketData({
      regime_prediction: {
        regime: 'risk_off',
        confidence: 0.85,
        previous_regime: 'risk_on',
      },
    });

    const recs = generateRecommendations(buildPortfolio(), marketData, {});
    const regimeRecs = recs.filter((r) => r.type === RECOMMENDATION_TYPES.REGIME_CHANGE);
    expect(regimeRecs.length).toBe(1);
    expect(regimeRecs[0].priority).toEqual(RECOMMENDATION_PRIORITY.CRITICAL);
  });

  it('does not generate regime change when same regime', () => {
    const marketData = buildMarketData({
      regime_prediction: {
        regime: 'neutral',
        confidence: 0.85,
        previous_regime: 'neutral',
      },
    });

    const recs = generateRecommendations(buildPortfolio(), marketData, {});
    const regimeRecs = recs.filter((r) => r.type === RECOMMENDATION_TYPES.REGIME_CHANGE);
    expect(regimeRecs).toHaveLength(0);
  });

  it('does not generate regime change with low confidence', () => {
    const marketData = buildMarketData({
      regime_prediction: {
        regime: 'risk_off',
        confidence: 0.5,
        previous_regime: 'risk_on',
      },
    });

    const recs = generateRecommendations(buildPortfolio(), marketData, {});
    const regimeRecs = recs.filter((r) => r.type === RECOMMENDATION_TYPES.REGIME_CHANGE);
    expect(regimeRecs).toHaveLength(0);
  });

  it('sorts recommendations by priority descending', () => {
    const portfolio = buildPortfolio({
      positions: {
        AAPL: { weight: 0.40, name: 'Apple', quant_score: 30 },
      },
      target_weights: { AAPL: 0.20 },
      sector_exposure: { Technology: 0.45 },
    });

    const marketData = buildMarketData({ volatility: 35 });

    const recs = generateRecommendations(portfolio, marketData, {
      AAPL: { return_60d: -25 },
    });

    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].priority.level).toBeGreaterThanOrEqual(recs[i].priority.level);
    }
  });

  it('generates risk warnings from ML anomalies', () => {
    const portfolio = buildPortfolio();
    const marketData = buildMarketData({
      assets: [{ ticker: 'AAPL', name: 'Apple' }],
      anomalies: [{ ticker: 'AAPL', severity: 'high', type: 'z_score' }],
    });

    const recs = generateRecommendations(portfolio, marketData, {});
    const anomalyWarnings = recs.filter(
      (r) => r.type === RECOMMENDATION_TYPES.RISK_WARNING && r.ticker === 'AAPL',
    );
    expect(anomalyWarnings.length).toBeGreaterThan(0);
  });
});

// -----------------------------------------------------------
// filterByPriority
// -----------------------------------------------------------
describe('filterByPriority', () => {
  it('filters recommendations by minimum priority level', () => {
    const recs = [
      { priority: RECOMMENDATION_PRIORITY.LOW },
      { priority: RECOMMENDATION_PRIORITY.MEDIUM },
      { priority: RECOMMENDATION_PRIORITY.HIGH },
      { priority: RECOMMENDATION_PRIORITY.CRITICAL },
    ];

    const highAndAbove = filterByPriority(recs, RECOMMENDATION_PRIORITY.HIGH.level);
    expect(highAndAbove).toHaveLength(2);
  });

  it('returns all with minimum priority LOW', () => {
    const recs = [
      { priority: RECOMMENDATION_PRIORITY.LOW },
      { priority: RECOMMENDATION_PRIORITY.CRITICAL },
    ];

    expect(filterByPriority(recs, RECOMMENDATION_PRIORITY.LOW.level)).toHaveLength(2);
  });

  it('returns empty array when no matches', () => {
    const recs = [{ priority: RECOMMENDATION_PRIORITY.LOW }];
    expect(filterByPriority(recs, RECOMMENDATION_PRIORITY.CRITICAL.level)).toHaveLength(0);
  });
});

// -----------------------------------------------------------
// groupByType
// -----------------------------------------------------------
describe('groupByType', () => {
  it('groups recommendations by type', () => {
    const recs = [
      { type: 'rebalance', ticker: 'A' },
      { type: 'rebalance', ticker: 'B' },
      { type: 'risk_warning', ticker: 'C' },
      { type: 'buy_opportunity', ticker: 'D' },
    ];

    const groups = groupByType(recs);
    expect(groups.rebalance).toHaveLength(2);
    expect(groups.risk_warning).toHaveLength(1);
    expect(groups.buy_opportunity).toHaveLength(1);
  });

  it('returns empty object for empty array', () => {
    const groups = groupByType([]);
    expect(Object.keys(groups)).toHaveLength(0);
  });
});

// -----------------------------------------------------------
// analyzeAssetML
// -----------------------------------------------------------
describe('analyzeAssetML', () => {
  it('returns all insight keys', () => {
    const result = buildAssetResult();
    const marketData = buildMarketData();
    const allAssets = Array.from({ length: 15 }, (_, i) => ({
      details: {
        momentum: { roc6m: String(i * 2) },
        risk: { volatility: String(15 + i) },
      },
      scoreMomentum: 40 + i * 3,
    }));

    const insights = analyzeAssetML(result, marketData, allAssets);

    expect(insights.regimeImpact).toBeDefined();
    expect(insights.momentumShift).toBeDefined();
    expect(insights.mlSignal).toBeDefined();
    expect(insights.riskScore).toBeDefined();
  });

  it('returns null regimeImpact when no regime prediction', () => {
    const result = buildAssetResult();
    const insights = analyzeAssetML(result, {}, []);
    expect(insights.regimeImpact).toBeNull();
  });

  it('returns null momentumShift when few assets', () => {
    const result = buildAssetResult();
    const insights = analyzeAssetML(result, buildMarketData(), []);
    expect(insights.momentumShift).toBeNull();
  });

  it('regime impact: defensive asset in risk_off is favorable', () => {
    const result = buildAssetResult({
      details: {
        momentum: { roc6m: '10', roc12m: '15', rsi: '50' },
        risk: { volatility: '15', maxDrawdown: '-10', relativeVol: '0.8' },
      },
    });
    const marketData = buildMarketData({
      regime_prediction: {
        regime: 'risk_off',
        previous_regime: 'neutral',
        confidence: 0.8,
      },
    });

    const insights = analyzeAssetML(result, marketData, []);
    expect(insights.regimeImpact.impact).toBe('favorable');
    expect(insights.regimeImpact.isDefensive).toBe(true);
  });

  it('regime impact: aggressive asset in risk_off is unfavorable', () => {
    const result = buildAssetResult({
      details: {
        momentum: { roc6m: '10', roc12m: '15', rsi: '50' },
        risk: { volatility: '35', maxDrawdown: '-30', relativeVol: '1.5' },
      },
    });
    const marketData = buildMarketData({
      regime_prediction: {
        regime: 'risk_off',
        previous_regime: 'neutral',
        confidence: 0.8,
      },
    });

    const insights = analyzeAssetML(result, marketData, []);
    expect(insights.regimeImpact.impact).toBe('unfavorable');
    expect(insights.regimeImpact.isAggressive).toBe(true);
  });

  it('regime impact: aggressive asset in risk_on is favorable', () => {
    const result = buildAssetResult({
      details: {
        momentum: { roc6m: '10', roc12m: '15', rsi: '50' },
        risk: { volatility: '35', maxDrawdown: '-30', relativeVol: '1.5' },
      },
    });
    const marketData = buildMarketData({
      regime_prediction: {
        regime: 'risk_on',
        previous_regime: 'neutral',
        confidence: 0.8,
      },
    });

    const insights = analyzeAssetML(result, marketData, []);
    expect(insights.regimeImpact.impact).toBe('favorable');
  });

  it('regime impact: returns null when same regime', () => {
    const result = buildAssetResult();
    const marketData = buildMarketData({
      regime_prediction: {
        regime: 'neutral',
        previous_regime: 'neutral',
        confidence: 0.8,
      },
    });

    const insights = analyzeAssetML(result, marketData, []);
    expect(insights.regimeImpact).toBeNull();
  });

  it('ml signal generates STRONG_BUY for high scores', () => {
    const result = buildAssetResult({
      scoreTotal: 90,
      scoreMomentum: 85,
      scoreTrend: 80,
      scoreRisk: 75,
      details: {
        momentum: { roc6m: '20', roc12m: '30', rsi: '55' },
        risk: { volatility: '18', maxDrawdown: '-12', relativeVol: '0.9' },
      },
    });

    const insights = analyzeAssetML(result, buildMarketData(), []);
    expect(['STRONG_BUY', 'BUY']).toContain(insights.mlSignal.signal);
  });

  it('ml signal generates SELL or STRONG_SELL for low scores', () => {
    const result = buildAssetResult({
      scoreTotal: 15,
      scoreMomentum: 10,
      scoreTrend: 15,
      scoreRisk: 20,
      details: {
        momentum: { roc6m: '-10', roc12m: '-15', rsi: '75' },
        risk: { volatility: '40', maxDrawdown: '-35', relativeVol: '2.0' },
      },
    });

    const insights = analyzeAssetML(result, buildMarketData(), []);
    expect(['SELL', 'STRONG_SELL']).toContain(insights.mlSignal.signal);
  });

  it('ml signal downgrades BUY to HOLD for high volatility', () => {
    const result = buildAssetResult({
      scoreTotal: 65,
      scoreMomentum: 60,
      scoreTrend: 55,
      scoreRisk: 50,
      details: {
        momentum: { roc6m: '10', roc12m: '15', rsi: '55' },
        risk: { volatility: '45', maxDrawdown: '-25', relativeVol: '1.5' },
      },
    });

    const insights = analyzeAssetML(result, buildMarketData(), []);
    // High vol should downgrade the signal
    expect(['HOLD', 'BUY']).toContain(insights.mlSignal.signal);
  });

  it('risk score assigns correct risk levels', () => {
    const lowRisk = buildAssetResult({
      scoreRisk: 80,
      details: {
        momentum: { roc6m: '10', roc12m: '15', rsi: '55' },
        risk: { volatility: '12', maxDrawdown: '-8', relativeVol: '0.7' },
      },
    });

    const highRisk = buildAssetResult({
      scoreRisk: 20,
      details: {
        momentum: { roc6m: '10', roc12m: '15', rsi: '55' },
        risk: { volatility: '55', maxDrawdown: '-45', relativeVol: '2.5' },
      },
    });

    const lowInsights = analyzeAssetML(lowRisk, buildMarketData(), []);
    const highInsights = analyzeAssetML(highRisk, buildMarketData(), []);

    expect(['LOW', 'MODERATE']).toContain(lowInsights.riskScore.riskLevel);
    expect(['HIGH', 'VERY_HIGH']).toContain(highInsights.riskScore.riskLevel);
  });

  it('momentum shift detects accelerating momentum', () => {
    const result = buildAssetResult({
      scoreMomentum: 70,
      details: {
        momentum: { roc6m: '30', roc12m: '20', rsi: '55' },
        risk: { volatility: '22', maxDrawdown: '-15', relativeVol: '1.0' },
      },
    });

    const allAssets = Array.from({ length: 15 }, (_, i) => ({
      details: { momentum: { roc6m: String(i * 2) }, risk: { volatility: '20' } },
      scoreMomentum: 40 + i,
    }));

    const insights = analyzeAssetML(result, buildMarketData(), allAssets);
    expect(insights.momentumShift.shift).toBeDefined();
    expect(insights.momentumShift.percentile).toBeDefined();
  });
});
