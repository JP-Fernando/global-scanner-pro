/**
 * Portfolio construction pipeline shared by the desktop and Android frontends:
 * regime adjustment → allocation → governance corrections → risk/governance reports.
 * No DOM access; callers read their own inputs and render the result.
 */

import * as allocation from '../../allocation/allocation.js';
import * as risk from '../../analytics/risk_engine.js';
import * as governance from '../../analytics/governance.js';

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
  const { method, topN, totalCapital, riskProfile, strategy, regimeAdjustment } = options;

  let selectedAssets = scanResults.slice(0, topN);
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

  const enrichedAllocation = enrichAllocationWithScanData(withCapital, scanResults);

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
      complianceCheck
    },
    violations: complianceCheck.compliant ? [] : complianceCheck.violations,
    corrections
  };
}
