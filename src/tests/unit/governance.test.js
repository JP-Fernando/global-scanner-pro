/**
 * Governance & Compliance Engine Tests
 *
 * Tests for investment rules validation, compliance corrections,
 * risk profiles, and governance report generation.
 */

import { describe, it, expect } from 'vitest';
import {
  INVESTMENT_RULES,
  RISK_PROFILES,
  STRATEGY_DOCUMENTATION,
  validateCompliance,
  applyComplianceCorrections,
  generateGovernanceReport,
} from '../../analytics/governance.js';

// ---------- helpers ----------

const buildPortfolio = (overrides = []) => {
  const defaults = [
    { ticker: 'AAPL', weight: 0.10, volatility: 20, details: { liquidity: { avgVol20: '100000' } } },
    { ticker: 'GOOG', weight: 0.10, volatility: 18, details: { liquidity: { avgVol20: '80000' } } },
    { ticker: 'MSFT', weight: 0.10, volatility: 22, details: { liquidity: { avgVol20: '90000' } } },
    { ticker: 'AMZN', weight: 0.10, volatility: 25, details: { liquidity: { avgVol20: '70000' } } },
    { ticker: 'META', weight: 0.10, volatility: 28, details: { liquidity: { avgVol20: '60000' } } },
    { ticker: 'TSLA', weight: 0.10, volatility: 35, details: { liquidity: { avgVol20: '120000' } } },
    { ticker: 'NVDA', weight: 0.10, volatility: 30, details: { liquidity: { avgVol20: '110000' } } },
    { ticker: 'JPM', weight: 0.10, volatility: 19, details: { liquidity: { avgVol20: '95000' } } },
    { ticker: 'V', weight: 0.10, volatility: 16, details: { liquidity: { avgVol20: '85000' } } },
    { ticker: 'JNJ', weight: 0.10, volatility: 14, details: { liquidity: { avgVol20: '75000' } } },
  ];

  return overrides.length > 0 ? overrides : defaults;
};

describe('Governance & Compliance Engine', () => {
  // ---------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------
  describe('INVESTMENT_RULES', () => {
    it('defines concentration limits', () => {
      expect(INVESTMENT_RULES.max_position_weight).toBe(0.15);
      expect(INVESTMENT_RULES.min_position_weight).toBe(0.02);
      expect(INVESTMENT_RULES.max_sector_weight).toBe(0.30);
      expect(INVESTMENT_RULES.max_country_weight).toBe(0.40);
      expect(INVESTMENT_RULES.max_top3_concentration).toBe(0.40);
    });

    it('defines liquidity requirements', () => {
      expect(INVESTMENT_RULES.min_daily_volume).toBe(50000);
    });

    it('defines risk control limits', () => {
      expect(INVESTMENT_RULES.max_portfolio_volatility).toBe(25);
      expect(INVESTMENT_RULES.max_portfolio_drawdown).toBe(35);
      expect(INVESTMENT_RULES.max_pairwise_correlation).toBe(0.85);
    });

    it('defines exclusion rules', () => {
      expect(INVESTMENT_RULES.exclusions.outliers).toBe(true);
      expect(INVESTMENT_RULES.exclusions.penny_stocks).toBe(true);
      expect(INVESTMENT_RULES.exclusions.low_liquidity).toBe(true);
      expect(INVESTMENT_RULES.exclusions.high_risk).toBe(true);
    });
  });

  describe('RISK_PROFILES', () => {
    it('defines conservative, moderate, and aggressive profiles', () => {
      expect(RISK_PROFILES.conservative).toBeDefined();
      expect(RISK_PROFILES.moderate).toBeDefined();
      expect(RISK_PROFILES.aggressive).toBeDefined();
    });

    it('conservative has stricter limits than aggressive', () => {
      expect(RISK_PROFILES.conservative.rules.max_position_weight)
        .toBeLessThan(RISK_PROFILES.aggressive.rules.max_position_weight);
      expect(RISK_PROFILES.conservative.rules.max_portfolio_volatility)
        .toBeLessThan(RISK_PROFILES.aggressive.rules.max_portfolio_volatility);
    });
  });

  describe('STRATEGY_DOCUMENTATION', () => {
    it('documents all four strategies', () => {
      expect(STRATEGY_DOCUMENTATION.momentum_aggressive).toBeDefined();
      expect(STRATEGY_DOCUMENTATION.trend_conservative).toBeDefined();
      expect(STRATEGY_DOCUMENTATION.balanced).toBeDefined();
      expect(STRATEGY_DOCUMENTATION.sector_rotation).toBeDefined();
    });

    it('each strategy has required fields', () => {
      for (const key of Object.keys(STRATEGY_DOCUMENTATION)) {
        const doc = STRATEGY_DOCUMENTATION[key];
        expect(doc.name).toBeTypeOf('string');
        expect(doc.objective).toBeTypeOf('string');
        expect(doc.horizon).toBeTypeOf('string');
        expect(doc.characteristics).toBeInstanceOf(Array);
        expect(doc.risks).toBeInstanceOf(Array);
      }
    });
  });

  // ---------------------------------------------------------------
  // validateCompliance
  // ---------------------------------------------------------------
  describe('validateCompliance', () => {
    it('marks compliant portfolio as compliant', () => {
      const portfolio = buildPortfolio();
      const result = validateCompliance(portfolio);

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.summary.total_issues).toBeGreaterThanOrEqual(0);
    });

    it('detects MAX_POSITION violation', () => {
      const portfolio = buildPortfolio([
        { ticker: 'AAPL', weight: 0.50, volatility: 20, details: { liquidity: { avgVol20: '100000' } } },
        { ticker: 'GOOG', weight: 0.50, volatility: 20, details: { liquidity: { avgVol20: '100000' } } },
      ]);

      const result = validateCompliance(portfolio);

      expect(result.compliant).toBe(false);
      const positionViolations = result.violations.filter(v => v.type === 'MAX_POSITION');
      expect(positionViolations.length).toBeGreaterThan(0);
    });

    it('detects MIN_POSITION warning', () => {
      const portfolio = buildPortfolio([
        { ticker: 'AAPL', weight: 0.01, volatility: 20, details: { liquidity: { avgVol20: '100000' } } },
        { ticker: 'GOOG', weight: 0.99, volatility: 20, details: { liquidity: { avgVol20: '100000' } } },
      ]);

      const result = validateCompliance(portfolio);
      const minWarnings = result.warnings.filter(w => w.type === 'MIN_POSITION');
      expect(minWarnings.length).toBeGreaterThan(0);
    });

    it('detects TOP3_CONCENTRATION violation', () => {
      const portfolio = buildPortfolio([
        { ticker: 'A', weight: 0.15, volatility: 20, details: { liquidity: { avgVol20: '100000' } } },
        { ticker: 'B', weight: 0.15, volatility: 20, details: { liquidity: { avgVol20: '100000' } } },
        { ticker: 'C', weight: 0.15, volatility: 20, details: { liquidity: { avgVol20: '100000' } } },
        { ticker: 'D', weight: 0.10, volatility: 20, details: { liquidity: { avgVol20: '100000' } } },
        { ticker: 'E', weight: 0.10, volatility: 20, details: { liquidity: { avgVol20: '100000' } } },
        { ticker: 'F', weight: 0.10, volatility: 20, details: { liquidity: { avgVol20: '100000' } } },
        { ticker: 'G', weight: 0.10, volatility: 20, details: { liquidity: { avgVol20: '100000' } } },
        { ticker: 'H', weight: 0.15, volatility: 20, details: { liquidity: { avgVol20: '100000' } } },
      ]);

      const result = validateCompliance(portfolio);
      const top3Violations = result.violations.filter(v => v.type === 'TOP3_CONCENTRATION');
      expect(top3Violations.length).toBeGreaterThan(0);
    });

    it('detects PORTFOLIO_VOLATILITY violation', () => {
      const portfolio = [
        { ticker: 'A', weight: 0.10, volatility: 20, portfolio_vol: 30, details: { liquidity: { avgVol20: '100000' } } },
      ];

      const result = validateCompliance(portfolio);
      const volViolations = result.violations.filter(v => v.type === 'PORTFOLIO_VOLATILITY');
      expect(volViolations.length).toBeGreaterThan(0);
    });

    it('detects LOW_LIQUIDITY warning', () => {
      const portfolio = [
        { ticker: 'A', weight: 0.10, volatility: 20, details: { liquidity: { avgVol20: '1000' } } },
      ];

      const result = validateCompliance(portfolio);
      const liquidityWarnings = result.warnings.filter(w => w.type === 'LOW_LIQUIDITY');
      expect(liquidityWarnings.length).toBeGreaterThan(0);
    });

    it('detects HIGH_RISK violation for extreme volatility', () => {
      const portfolio = [
        { ticker: 'VOLATILE', weight: 0.10, volatility: 55, details: { liquidity: { avgVol20: '100000' } } },
      ];

      const result = validateCompliance(portfolio);
      const riskViolations = result.violations.filter(v => v.type === 'HIGH_RISK');
      expect(riskViolations.length).toBeGreaterThan(0);
    });

    it('uses custom rules when provided', () => {
      const strictRules = { ...INVESTMENT_RULES, max_position_weight: 0.05 };
      const portfolio = buildPortfolio();
      const result = validateCompliance(portfolio, strictRules);

      const positionViolations = result.violations.filter(v => v.type === 'MAX_POSITION');
      expect(positionViolations.length).toBeGreaterThan(0);
    });

    it('summary counts match violations and warnings', () => {
      const portfolio = [
        { ticker: 'A', weight: 0.50, volatility: 55, details: { liquidity: { avgVol20: '1000' } } },
        { ticker: 'B', weight: 0.01, volatility: 20, details: { liquidity: { avgVol20: '100000' } } },
      ];

      const result = validateCompliance(portfolio);
      expect(result.summary.total_issues).toBe(
        result.violations.length + result.warnings.length
      );
    });
  });

  // ---------------------------------------------------------------
  // applyComplianceCorrections
  // ---------------------------------------------------------------
  describe('applyComplianceCorrections', () => {
    it('generates corrections for overweight positions', () => {
      const portfolio = [
        { ticker: 'A', weight: 0.50, weight_pct: '50.00' },
        { ticker: 'B', weight: 0.30, weight_pct: '30.00' },
        { ticker: 'C', weight: 0.10, weight_pct: '10.00' },
        { ticker: 'D', weight: 0.10, weight_pct: '10.00' },
      ];

      const result = applyComplianceCorrections(portfolio);
      // Should have generated corrections for assets exceeding max_position_weight
      const weightCorrections = result.corrections.filter(c => c.from && c.to);
      expect(weightCorrections.length).toBeGreaterThan(0);
      // After correction and renormalization, weights should sum to 1
      const total = result.portfolio.reduce((sum, a) => sum + a.weight, 0);
      expect(total).toBeCloseTo(1, 2);
    });

    it('removes assets below min_position_weight', () => {
      const portfolio = [
        { ticker: 'A', weight: 0.01, weight_pct: '1.00' },
        { ticker: 'B', weight: 0.10, weight_pct: '10.00' },
        { ticker: 'C', weight: 0.89, weight_pct: '89.00' },
      ];

      const result = applyComplianceCorrections(portfolio);
      expect(result.removed).toBe(1);
      expect(result.portfolio.find(a => a.ticker === 'A')).toBeUndefined();
    });

    it('renormalises weights to sum to 1', () => {
      const portfolio = [
        { ticker: 'A', weight: 0.50, weight_pct: '50.00' },
        { ticker: 'B', weight: 0.50, weight_pct: '50.00' },
      ];

      const result = applyComplianceCorrections(portfolio);
      const total = result.portfolio.reduce((sum, a) => sum + a.weight, 0);
      expect(total).toBeCloseTo(1, 2);
    });

    it('returns corrections log', () => {
      const portfolio = [
        { ticker: 'A', weight: 0.50, weight_pct: '50.00' },
        { ticker: 'B', weight: 0.50, weight_pct: '50.00' },
      ];

      const result = applyComplianceCorrections(portfolio);
      expect(result.corrections).toBeInstanceOf(Array);
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it('does not modify already-compliant portfolio', () => {
      const portfolio = [
        { ticker: 'A', weight: 0.10, weight_pct: '10.00' },
        { ticker: 'B', weight: 0.10, weight_pct: '10.00' },
        { ticker: 'C', weight: 0.10, weight_pct: '10.00' },
        { ticker: 'D', weight: 0.10, weight_pct: '10.00' },
        { ticker: 'E', weight: 0.10, weight_pct: '10.00' },
        { ticker: 'F', weight: 0.10, weight_pct: '10.00' },
        { ticker: 'G', weight: 0.10, weight_pct: '10.00' },
        { ticker: 'H', weight: 0.10, weight_pct: '10.00' },
        { ticker: 'I', weight: 0.10, weight_pct: '10.00' },
        { ticker: 'J', weight: 0.10, weight_pct: '10.00' },
      ];

      const result = applyComplianceCorrections(portfolio);
      expect(result.removed).toBe(0);
      expect(result.portfolio).toHaveLength(10);
    });
  });

  // ---------------------------------------------------------------
  // generateGovernanceReport
  // ---------------------------------------------------------------
  describe('generateGovernanceReport', () => {
    it('generates report with compliance data', () => {
      const portfolio = buildPortfolio();
      const report = generateGovernanceReport(portfolio, 'balanced');

      expect(report.timestamp).toBeTypeOf('string');
      expect(report.strategy.name).toBeTypeOf('string');
      expect(report.compliance).toBeDefined();
      expect(report.compliance.compliant).toBe(true);
    });

    it('includes portfolio summary', () => {
      const portfolio = buildPortfolio();
      const report = generateGovernanceReport(portfolio, 'momentum_aggressive');

      expect(report.portfolio_summary.n_assets).toBe(10);
      expect(parseFloat(report.portfolio_summary.total_weight)).toBeCloseTo(1, 2);
    });

    it('includes rules applied', () => {
      const portfolio = buildPortfolio();
      const report = generateGovernanceReport(portfolio, 'balanced');

      expect(report.rules_applied.max_position_weight).toBe(0.15);
      expect(report.rules_applied.max_portfolio_volatility).toBe(25);
      expect(report.rules_applied.min_daily_volume).toBe(50000);
    });

    it('handles unknown strategy gracefully', () => {
      const portfolio = buildPortfolio();
      const report = generateGovernanceReport(portfolio, 'unknown_strategy');

      expect(report.strategy.name).toBe('unknown_strategy');
      expect(report.strategy.profile).toBe('Unknown');
    });
  });
});
