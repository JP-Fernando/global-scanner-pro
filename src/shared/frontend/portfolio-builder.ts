/**
 * Portfolio construction pipeline shared by the desktop and Android frontends:
 * regime adjustment → allocation → governance corrections → risk/governance reports.
 * No DOM access; callers read their own inputs and render the result.
 */

import { buildSelectionKeyIndex, getAssetSymbol } from './asset-identity.js';
import * as allocation from '../../allocation/allocation.js';
import * as risk from '../../analytics/risk_engine.js';
import * as governance from '../../analytics/governance.js';

export const PORTFOLIO_METHOD_KEYS = Object.keys(allocation.ALLOCATION_METHODS);
export const PORTFOLIO_RISK_KEYS = Object.keys(governance.RISK_PROFILES);

export type PortfolioBuildOptions = {
  method: string;
  topN: number;
  totalCapital: number;
  riskProfile: string;
  strategy: string | null;
  /** Regime strategy adjustment to apply to scores, or null to skip. */
  regimeAdjustment?: { min_score: number } | null;
};

export type PortfolioBuildIssue =
  | { code: 'no_results' }
  | { code: 'not_enough_assets'; available: number };

export type PortfolioBuildResult = {
  portfolio: any;
  /** Governance violations found before automatic corrections (empty if compliant). */
  violations: any[];
  /** Automatic corrections applied to reach compliance (empty if none were needed). */
  corrections: any[];
};

/** Minimum price history required for an asset to take part in the risk report. */
export const MIN_RISK_PRICE_POINTS = 30;
export const MIN_PORTFOLIO_SCAN_ASSETS = 3;

export function canBuildPortfolio(results: any[]): boolean {
  return results.filter(result => Array.isArray(result.pricesWithDates)
    && result.pricesWithDates.length >= MIN_RISK_PRICE_POINTS).length
    >= MIN_PORTFOLIO_SCAN_ASSETS;
}

/** Adapt the builder model to the portfolio manager's persistence contract. */
export function buildPortfolioSaveRequest(portfolio: any, strategy = 'balanced', benchmark = '^GSPC') {
  return {
    assets: portfolio.allocation.map((asset: any) => ({
      ...asset,
      ticker: asset.yahooSymbol || asset.ticker
    })),
    options: {
      strategy,
      benchmark,
      allocation_method: portfolio.method,
      initial_capital: portfolio.totalCapital,
      ...(portfolio.construction_report ? { construction_report: portfolio.construction_report } : {})
    }
  };
}

export function validatePortfolioRequest(
  scanResults: any[],
  topN: number
): PortfolioBuildIssue | null {
  if (!scanResults.length) return { code: 'no_results' };
  if (topN > scanResults.length) {
    return { code: 'not_enough_assets', available: scanResults.length };
  }
  return null;
}

/** Shared input validation for presentation adapters. */
export function validatePortfolioInputs(results: any[], options: PortfolioBuildOptions): string | null {
  if (!Number.isInteger(options.topN) || options.topN < 1) return 'invalid_count';
  const issue = validatePortfolioRequest(results, options.topN);
  if (issue) return issue.code;
  if (!Number.isFinite(options.totalCapital) || options.totalCapital <= 0) return 'invalid_capital';
  if (!PORTFOLIO_METHOD_KEYS.includes(options.method)) return 'invalid_method';
  if (!PORTFOLIO_RISK_KEYS.includes(options.riskProfile)) return 'invalid_risk';
  return null;
}

/** Shifts scores by the regime adjustment (clamped 0–100) and re-sorts by score. */
export function applyRegimeAdjustment(assets: any[], adjustment: { min_score: number }): any[] {
  return assets
    .map((asset: any) => ({
      ...asset,
      scoreTotal: Math.max(0, Math.min(100, asset.scoreTotal + adjustment.min_score))
    }))
    .sort((a: any, b: any) => b.scoreTotal - a.scoreTotal);
}

/** Attaches price history and risk details from the original scan result to each position. */
export function enrichAllocationWithScanData(allocated: any[], scanResults: any[]): any[] {
  return allocated.map(asset => {
    const original = scanResults.find((r: any) => r.ticker === asset.ticker);
    return {
      ...asset,
      price: original?.price,
      yahooSymbol: original?.yahooSymbol,
      sectorRaw: original?.sectorRaw,
      scoreTotal: asset.score,
      prices: original?.pricesWithDates || [],
      volatility: asset.volatility || original?.details?.risk?.volatility || '20',
      details: original?.details
    };
  });
}

export function buildPortfolioModel(
  scanResults: any[],
  options: PortfolioBuildOptions
): PortfolioBuildResult {
  const issue = validatePortfolioInputs(scanResults, options);
  if (issue) throw new Error(issue);
  // Allocation/governance use ticker keys: qualify display collisions before the pipeline.
  const keys = buildSelectionKeyIndex(scanResults);
  const identifiedResults = scanResults.map(asset => ({ ...asset,
    ticker: keys.get(getAssetSymbol(asset)) || asset.ticker,
    yahooSymbol: getAssetSymbol(asset) || asset.yahooSymbol }));
  const { method, topN, totalCapital, riskProfile, strategy, regimeAdjustment } = options;

  let selectedAssets = identifiedResults.slice(0, topN);
  if (regimeAdjustment) {
    selectedAssets = applyRegimeAdjustment(selectedAssets, regimeAdjustment);
  }

  const portfolioData = allocation.allocateCapital(selectedAssets, method);
  let withCapital: any[] = allocation.calculateCapitalRecommendations(
    portfolioData.allocation,
    totalCapital
  );

  const selectedRules =
    governance.RISK_PROFILES[riskProfile]?.rules || governance.INVESTMENT_RULES;
  const complianceCheck = governance.validateCompliance(withCapital, selectedRules);

  let corrections: any[] = [];
  if (!complianceCheck.compliant) {
    const correctionResult = governance.applyComplianceCorrections(withCapital, selectedRules);
    corrections = correctionResult.corrections;
    // Recalculate capital after corrections changed the weights
    withCapital = allocation.calculateCapitalRecommendations(
      correctionResult.portfolio as any,
      totalCapital
    );
  }

  const enrichedAllocation = enrichAllocationWithScanData(withCapital, identifiedResults);

  // Assets without enough history are excluded from the risk report (degraded mode)
  const invalidAssets = enrichedAllocation.filter(
    a => !Array.isArray(a.prices) || a.prices.length < MIN_RISK_PRICE_POINTS
  );
  const degradedRisk = invalidAssets.length > 0;
  const riskAllocation = degradedRisk
    ? enrichedAllocation.filter(a => !invalidAssets.includes(a))
    : enrichedAllocation;

  const riskReport = risk.generateRiskReport(riskAllocation, totalCapital);
  // UI meta-information (not quantitative)
  (riskReport as any).meta = {
    degraded: degradedRisk,
    excludedAssets: invalidAssets.map(a => a.ticker)
  };

  const governanceReport = governance.generateGovernanceReport(
    enrichedAllocation,
    strategy as string,
    selectedRules
  );

  return {
    portfolio: {
      ...portfolioData,
      allocation: enrichedAllocation,
      totalCapital,
      riskReport,
      governanceReport,
      complianceCheck,
      construction_report: { risk_profile: riskProfile, regime_adjustment: regimeAdjustment || null,
        corrections, violations: complianceCheck.compliant ? [] : complianceCheck.violations,
        risk_excluded_assets: invalidAssets.map(asset => asset.yahooSymbol || asset.ticker) }
    },
    violations: complianceCheck.compliant ? [] : complianceCheck.violations,
    corrections
  };
}
