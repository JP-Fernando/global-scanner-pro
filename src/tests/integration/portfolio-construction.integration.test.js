/**
 * Integration tests: Allocation → Risk Engine → Governance
 *
 * Verifies the portfolio construction pipeline from allocation through risk
 * analysis and governance compliance checks.
 */

import { describe, it, expect } from 'vitest';
import {
  allocateCapital,
  calculateCapitalRecommendations,
} from '../../allocation/allocation.js';
import {
  generateRiskReport,
  calculateCorrelationMatrix,
  calculatePortfolioVaR,
  runStressTest,
} from '../../analytics/risk_engine.js';
import {
  validateCompliance,
  applyComplianceCorrections,
  generateGovernanceReport,
  INVESTMENT_RULES,
} from '../../analytics/governance.js';
import { buildScoredAssets, buildPriceMatrix } from './helpers.js';

// ---------------------------------------------------------------------------
// 1. Allocation → Risk report
// ---------------------------------------------------------------------------

describe('Allocation → Risk report', () => {
  it('generates a complete risk report from allocated assets with price history', () => {
    const scored = buildScoredAssets(4);
    const { allocation } = allocateCapital(scored, 'equal_weight');

    // Attach price data (needed by risk engine)
    const priceMatrix = buildPriceMatrix(allocation.map(a => a.ticker), 100);
    const portfolioWithPrices = allocation.map((pos, i) => ({
      ...pos,
      prices: priceMatrix[i].prices, // [{date, close}]
    }));

    const report = generateRiskReport(portfolioWithPrices, 100000);

    // VaR section
    expect(report.portfolioVaR).toBeDefined();
    expect(parseFloat(report.portfolioVaR.diversifiedVaR)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(report.portfolioVaR.undiversifiedVaR)).toBeGreaterThanOrEqual(0);

    // Diversification benefit: diversified VaR should be <= undiversified VaR
    expect(parseFloat(report.portfolioVaR.diversifiedVaR))
      .toBeLessThanOrEqual(parseFloat(report.portfolioVaR.undiversifiedVaR) + 0.01);

    // Correlation data
    expect(report.correlationData).toBeDefined();
    expect(report.correlationData.matrix).toHaveLength(4);

    // Stress tests
    expect(report.stressTests).toBeDefined();
    expect(report.stressTests.length).toBeGreaterThan(0);

    // Risk metrics
    expect(report.riskMetrics).toBeDefined();
    expect(report.riskMetrics.riskiestAsset.ticker).toBeTruthy();
  });

  it('correlation matrix is symmetric', () => {
    const scored = buildScoredAssets(3);
    const { allocation } = allocateCapital(scored, 'equal_weight');
    const priceMatrix = buildPriceMatrix(allocation.map(a => a.ticker), 100);
    const portfolioWithPrices = allocation.map((pos, i) => ({
      ...pos,
      prices: priceMatrix[i].prices,
    }));

    const corrData = calculateCorrelationMatrix(portfolioWithPrices);
    const matrix = corrData.matrix;

    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix.length; j++) {
        expect(matrix[i].values[j]).toBeCloseTo(matrix[j].values[i], 1);
      }
      // Diagonal should be 1.0
      expect(matrix[i].values[i]).toBeCloseTo(1.0, 1);
    }
  });

  it('stress test losses are proportional to market drop', () => {
    const scored = buildScoredAssets(3);
    const { allocation } = allocateCapital(scored, 'equal_weight');
    const totalCapital = 100000;

    const recs = calculateCapitalRecommendations(allocation, totalCapital);
    const stressResults = runStressTest(recs, totalCapital);

    // Should have multiple scenarios
    expect(stressResults.length).toBeGreaterThanOrEqual(2);

    // Larger drops should produce larger losses
    for (let i = 1; i < stressResults.length; i++) {
      expect(parseFloat(stressResults[i].estimatedLoss))
        .toBeGreaterThanOrEqual(parseFloat(stressResults[i - 1].estimatedLoss));
    }

    // Remaining capital should always be positive for standard scenarios
    for (const s of stressResults) {
      expect(parseFloat(s.remainingCapital)).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Allocation → Governance compliance
// ---------------------------------------------------------------------------

describe('Allocation → Governance compliance', () => {
  it('equal-weight allocation of 10 assets passes compliance', () => {
    const assets = buildScoredAssets(10);
    const { allocation } = allocateCapital(assets, 'equal_weight');

    const compliance = validateCompliance(allocation, INVESTMENT_RULES);
    expect(compliance.compliant).toBe(true);
    expect(compliance.violations).toHaveLength(0);
  });

  it('detects over-concentrated positions', () => {
    // Create a 2-asset portfolio where one has weight > 15%
    const assets = buildScoredAssets(2);
    const { allocation } = allocateCapital(assets, 'equal_weight');
    // Each is 50%, way above max_position_weight of 15%

    const compliance = validateCompliance(allocation, INVESTMENT_RULES);
    expect(compliance.compliant).toBe(false);
    expect(compliance.violations.some(v => v.type === 'MAX_POSITION')).toBe(true);
  });

  it('detects top-3 concentration violations', () => {
    const assets = buildScoredAssets(3);
    const { allocation } = allocateCapital(assets, 'equal_weight');
    // 3 assets at ~33% each → 100% top 3, above 40% limit

    const compliance = validateCompliance(allocation, INVESTMENT_RULES);
    expect(compliance.violations.some(v => v.type === 'TOP3_CONCENTRATION')).toBe(true);
  });

  it('applies automatic corrections (cap weights, re-normalise)', () => {
    // 10 assets — only first two exceed the 15% limit
    const portfolio = [
      { ticker: 'A', weight: 0.30, volatility: 20 },
      { ticker: 'B', weight: 0.20, volatility: 25 },
      { ticker: 'C', weight: 0.10, volatility: 30 },
      { ticker: 'D', weight: 0.08, volatility: 22 },
      { ticker: 'E', weight: 0.07, volatility: 18 },
      { ticker: 'F', weight: 0.06, volatility: 24 },
      { ticker: 'G', weight: 0.05, volatility: 26 },
      { ticker: 'H', weight: 0.05, volatility: 19 },
      { ticker: 'I', weight: 0.05, volatility: 21 },
      { ticker: 'J', weight: 0.04, volatility: 23 },
    ];

    const result = applyComplianceCorrections(portfolio, INVESTMENT_RULES);

    // Corrections should have been applied (A and B were above 15%)
    expect(result.corrections.length).toBeGreaterThan(0);

    // Weights should re-normalise to ~1.0
    const totalWeight = result.portfolio.reduce((s, a) => s + a.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 2);

    // After correction+renormalization, previously over-limit assets should be reduced
    const correctedA = result.portfolio.find(a => a.ticker === 'A');
    expect(correctedA.weight).toBeLessThan(0.30); // Reduced from original 30%
  });

  it('generates a complete governance report', () => {
    const assets = buildScoredAssets(5);
    const { allocation } = allocateCapital(assets, 'equal_weight');

    const report = generateGovernanceReport(allocation, 'balanced', INVESTMENT_RULES);

    expect(report.timestamp).toBeTruthy();
    expect(report.strategy.name).toBeTruthy();
    expect(report.compliance).toBeDefined();
    expect(report.portfolio_summary.n_assets).toBe(5);
    expect(parseFloat(report.portfolio_summary.total_weight)).toBeCloseTo(1.0, 2);
    expect(report.rules_applied).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Allocation methods comparison
// ---------------------------------------------------------------------------

describe('Allocation methods comparison', () => {
  const assets = buildScoredAssets(5);

  it('all 5 methods produce valid allocations with different profiles', () => {
    const methods = ['equal_weight', 'score_weighted', 'erc', 'volatility_target', 'hybrid'];
    const results = methods.map(m => allocateCapital(assets, m));

    for (const r of results) {
      const wSum = r.allocation.reduce((s, a) => s + a.weight, 0);
      expect(wSum).toBeCloseTo(1.0, 4);
    }

    // Equal weight should have all weights equal
    const ew = results[0].allocation;
    const ewWeight = ew[0].weight;
    for (const pos of ew) {
      expect(pos.weight).toBeCloseTo(ewWeight, 4);
    }

    // Score-weighted should differ from equal-weight (assets have different scores)
    const sw = results[1].allocation;
    expect(sw[0].weight).not.toBeCloseTo(sw[sw.length - 1].weight, 2);
  });

  it('ERC underweights high-vol assets, overweights low-vol assets', () => {
    const result = allocateCapital(assets, 'erc');
    // buildScoredAssets gives increasing volatility: [22, 24, 26, 30, 35]
    // ERC should give more weight to lower-vol assets
    expect(result.allocation[0].weight).toBeGreaterThan(result.allocation[4].weight);
  });

  it('portfolio risk varies across methods', () => {
    const methods = ['equal_weight', 'erc', 'volatility_target'];
    const risks = methods.map(m => {
      const { portfolioRisk } = allocateCapital(assets, m);
      return parseFloat(portfolioRisk.portfolioVolatility);
    });

    // They should not all be identical
    const allSame = risks.every(r => Math.abs(r - risks[0]) < 0.01);
    expect(allSame).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Capital recommendations
// ---------------------------------------------------------------------------

describe('Capital recommendations', () => {
  it('sum of recommended_capital equals totalCapital', () => {
    const assets = buildScoredAssets(4);
    const { allocation } = allocateCapital(assets, 'hybrid');
    const totalCapital = 50000;
    const recs = calculateCapitalRecommendations(allocation, totalCapital);

    const sumCapital = recs.reduce((s, r) => s + parseFloat(r.recommended_capital), 0);
    expect(sumCapital).toBeCloseTo(totalCapital, 0);
  });

  it('recommendations preserve allocation fields', () => {
    const assets = buildScoredAssets(3);
    const { allocation } = allocateCapital(assets, 'equal_weight');
    const recs = calculateCapitalRecommendations(allocation, 30000);

    for (const rec of recs) {
      expect(rec.ticker).toBeTruthy();
      expect(rec.weight).toBeGreaterThan(0);
      expect(rec.score).toBeDefined();
      expect(rec.recommended_capital).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Risk metrics consistency
// ---------------------------------------------------------------------------

describe('Risk metrics consistency', () => {
  it('VaR with date-aligned price data produces valid metrics', () => {
    const scored = buildScoredAssets(3);
    const { allocation } = allocateCapital(scored, 'equal_weight');
    const priceMatrix = buildPriceMatrix(allocation.map(a => a.ticker), 100);

    const portfolioWithPrices = allocation.map((pos, i) => ({
      ...pos,
      prices: priceMatrix[i].prices,
    }));

    const varResult = calculatePortfolioVaR(portfolioWithPrices, 100000);
    expect(varResult).toBeDefined();
    expect(parseFloat(varResult.portfolioVolatility)).toBeGreaterThan(0);
    expect(varResult.observations).toBeGreaterThan(0);
  });

  it('diversification benefit is between 0% and 100%', () => {
    const scored = buildScoredAssets(4);
    const { allocation } = allocateCapital(scored, 'equal_weight');
    const priceMatrix = buildPriceMatrix(allocation.map(a => a.ticker), 100);

    const portfolioWithPrices = allocation.map((pos, i) => ({
      ...pos,
      prices: priceMatrix[i].prices,
    }));

    const varResult = calculatePortfolioVaR(portfolioWithPrices, 100000);
    const divBenefit = parseFloat(varResult.diversificationBenefit);
    expect(divBenefit).toBeGreaterThanOrEqual(0);
    expect(divBenefit).toBeLessThanOrEqual(100);
  });
});
