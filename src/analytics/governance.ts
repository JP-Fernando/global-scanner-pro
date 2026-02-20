// =====================================================
// GOVERNANCE & COMPLIANCE ENGINE
// =====================================================

import i18n from '../i18n/i18n.js';

// =====================================================
// TYPES
// =====================================================

interface ExclusionRules {
  outliers: boolean;
  penny_stocks: boolean;
  low_liquidity: boolean;
  high_risk: boolean;
}

interface InvestmentRules {
  max_position_weight: number;
  min_position_weight: number;
  max_sector_weight: number;
  max_country_weight: number;
  max_top3_concentration: number;
  min_daily_volume: number;
  min_market_cap: number | null;
  max_pairwise_correlation: number;
  max_portfolio_volatility: number;
  max_portfolio_drawdown: number;
  rebalance_threshold: number;
  exclusions: ExclusionRules;
  min_score_threshold?: number;
}

interface PortfolioAsset {
  ticker: string;
  name?: string;
  weight: number;
  weight_pct?: string;
  price?: number;
  volatility?: number | string;
  portfolio_vol?: number | string;
  sector?: number | string;
  details?: {
    trend?: Record<string, unknown>;
    liquidity?: {
      avgVol20?: number | string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface ComplianceViolation {
  type: string;
  severity: string;
  asset?: string;
  value: string;
  limit: string | number;
  message: string;
}

interface ComplianceWarning {
  type: string;
  severity: string;
  asset?: string;
  value: string;
  limit: string | number;
  message: string;
}

interface ComplianceResult {
  compliant: boolean;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  summary: {
    total_issues: number;
    critical: number;
    warnings: number;
  };
}

interface CorrectionEntry {
  asset?: string;
  action: string;
  from?: string;
  to?: string;
  reason?: string;
}

interface CorrectionResult {
  portfolio: PortfolioAsset[];
  corrections: CorrectionEntry[];
  removed: number;
}

interface RiskProfile {
  name: string;
  description: string;
  rules: InvestmentRules;
  investor_type: string;
}

interface StrategyDocumentation {
  name: string;
  objective: string;
  horizon: string;
  expected_return: string;
  expected_volatility: string;
  max_drawdown: string;
  sharpe_target: string;
  investor_profile: string;
  risk_tolerance: string;
  rebalance_frequency: string;
  min_capital: string;
  benchmark: string;
  characteristics: string[];
  ideal_conditions: string[];
  risks: string[];
}

interface GovernanceReport {
  timestamp: string;
  strategy: {
    name: string;
    profile: string;
    objective: string;
  };
  compliance: ComplianceResult;
  portfolio_summary: {
    n_assets: number;
    total_weight: string;
    max_position: string;
    min_position: string;
    top3_concentration: string;
  };
  rules_applied: {
    max_position_weight: number;
    max_portfolio_volatility: number;
    min_daily_volume: number;
  };
}

// =====================================================
// INVESTMENT RULES
// =====================================================

export const INVESTMENT_RULES: InvestmentRules = {
  // Concentration limits
  max_position_weight: 0.15,        // 15% maximum per asset
  min_position_weight: 0.02,        // 2% minimum (avoid micro-positions)
  max_sector_weight: 0.30,          // 30% maximum per sector
  max_country_weight: 0.40,         // 40% maximum per country
  max_top3_concentration: 0.40,     // Top 3 positions cannot sum more than 40%

  // Mandatory liquidity
  min_daily_volume: 50000,          // Minimum daily volume
  min_market_cap: null,             // Minimum capitalisation (null = do not apply)

  // Correlation control
  max_pairwise_correlation: 0.85,   // No two assets with correlation > 0.85

  // Aggregate risk control
  max_portfolio_volatility: 25,     // Maximum portfolio volatility (%)
  max_portfolio_drawdown: 35,       // Estimated maximum drawdown (%)

  // Rebalancing
  rebalance_threshold: 0.05,        // Rebalance if an asset deviates > 5%

  // Automatic exclusions
  exclusions: {
    outliers: true,                 // Exclude statistical outliers
    penny_stocks: true,             // Exclude shares < $5 (if available)
    low_liquidity: true,            // Exclude if volume < min_daily_volume
    high_risk: true                 // Exclude if volatility > 50%
  }
};

// =====================================================
// CUSTOMISED RISK PROFILES
// =====================================================

export const RISK_PROFILES: Record<string, RiskProfile> = {
  conservative: {
    name: i18n.t('governance_module.risk_profile_conservative'),
    description: i18n.t('governance_module.risk_profile_conservative_desc'),
    rules: {
      ...INVESTMENT_RULES,
      max_position_weight: 0.10,
      max_portfolio_volatility: 15,
      max_portfolio_drawdown: 20,
      min_score_threshold: 70
    },
    investor_type: i18n.t('governance_module.investor_type_conservative')
  },

  moderate: {
    name: i18n.t('governance_module.risk_profile_moderate'),
    description: i18n.t('governance_module.risk_profile_moderate_desc'),
    rules: {
      ...INVESTMENT_RULES,
      max_position_weight: 0.15,
      max_portfolio_volatility: 20,
      max_portfolio_drawdown: 30,
      min_score_threshold: 60
    },
    investor_type: i18n.t('governance_module.investor_type_moderate')
  },

  aggressive: {
    name: i18n.t('governance_module.risk_profile_aggressive'),
    description: i18n.t('governance_module.risk_profile_aggressive_desc'),
    rules: {
      ...INVESTMENT_RULES,
      max_position_weight: 0.20,
      max_portfolio_volatility: 30,
      max_portfolio_drawdown: 45,
      min_score_threshold: 50
    },
    investor_type: i18n.t('governance_module.investor_type_aggressive')
  }
};

// =====================================================
// STRATEGY DOCUMENTATION
// =====================================================

export const STRATEGY_DOCUMENTATION: Record<string, StrategyDocumentation> = {
  momentum_aggressive: {
    name: i18n.t('governance_module.strategy_momentum_aggressive'),
    objective: i18n.t('governance_module.objective_momentum_aggressive'),
    horizon: "3-12 meses",
    expected_return: "15-25% anual",
    expected_volatility: "18-25%",
    max_drawdown: "25-35%",
    sharpe_target: "> 1.0",
    investor_profile: i18n.t('governance_module.risk_profile_aggressive'),
    risk_tolerance: i18n.t('governance_module.risk_tolerance_high'),
    rebalance_frequency: i18n.t('governance_module.rebalance_monthly'),
    min_capital: "€10,000",
    benchmark: "Índice + 5%",

    characteristics: [
      i18n.t('governance_module.char_high_turnover'),
      i18n.t('governance_module.char_sensitive_regime'),
      i18n.t('governance_module.char_active_monitoring'),
      i18n.t('governance_module.char_high_tax_impact')
    ],

    ideal_conditions: [
      i18n.t('governance_module.ideal_bull_trend'),
      i18n.t('governance_module.ideal_low_volatility'),
      i18n.t('governance_module.ideal_high_breadth')
    ],

    risks: [
      i18n.t('governance_module.risk_sharp_reversals'),
      i18n.t('governance_module.risk_whipsaws'),
      i18n.t('governance_module.risk_high_transaction_costs')
    ]
  },

  trend_conservative: {
    name: i18n.t('governance_module.strategy_trend_conservative'),
    objective: i18n.t('governance_module.objective_trend_conservative'),
    horizon: "12-36 meses",
    expected_return: "8-15% anual",
    expected_volatility: "10-15%",
    max_drawdown: "15-25%",
    sharpe_target: "> 1.2",
    investor_profile: i18n.t('governance_module.risk_profile_conservative'),
    risk_tolerance: i18n.t('governance_module.risk_tolerance_low'),
    rebalance_frequency: i18n.t('governance_module.rebalance_quarterly'),
    min_capital: "€20,000",
    benchmark: "Índice + 2%",

    characteristics: [
      i18n.t('governance_module.char_low_turnover'),
      i18n.t('governance_module.char_high_stability'),
      i18n.t('governance_module.char_low_market_noise'),
      i18n.t('governance_module.char_tax_efficient')
    ],

    ideal_conditions: [
      i18n.t('governance_module.ideal_clear_trend'),
      i18n.t('governance_module.ideal_controlled_volatility'),
      i18n.t('governance_module.ideal_expansive_cycle')
    ],

    risks: [
      i18n.t('governance_module.risk_sideways_underperformance'),
      i18n.t('governance_module.risk_late_entry'),
      i18n.t('governance_module.risk_late_exit')
    ]
  },

  balanced: {
    name: i18n.t('governance_module.strategy_balanced'),
    objective: i18n.t('governance_module.objective_balanced'),
    horizon: "6-24 meses",
    expected_return: "10-18% anual",
    expected_volatility: "12-18%",
    max_drawdown: "20-30%",
    sharpe_target: "> 1.0",
    investor_profile: i18n.t('governance_module.risk_profile_moderate'),
    risk_tolerance: i18n.t('governance_module.risk_tolerance_medium'),
    rebalance_frequency: i18n.t('governance_module.rebalance_bimonthly'),
    min_capital: "€15,000",
    benchmark: "Índice + 3%",

    characteristics: [
      i18n.t('governance_module.char_factor_diversification'),
      i18n.t('governance_module.char_regime_adaptability'),
      i18n.t('governance_module.char_moderate_turnover'),
      i18n.t('governance_module.char_optimal_cost_benefit')
    ],

    ideal_conditions: [
      i18n.t('governance_module.ideal_any_regime'),
      i18n.t('governance_module.ideal_simplify_decisions'),
      i18n.t('governance_module.ideal_medium_horizons')
    ],

    risks: [
      i18n.t('governance_module.risk_no_maximize_rallies'),
      i18n.t('governance_module.risk_no_avoid_drawdowns')
    ]
  },

  sector_rotation: {
    name: i18n.t('governance_module.strategy_sector_rotation'),
    objective: i18n.t('governance_module.objective_sector_rotation'),
    horizon: "3-9 meses",
    expected_return: "12-22% anual",
    expected_volatility: "15-22%",
    max_drawdown: "20-32%",
    sharpe_target: "> 0.9",
    investor_profile: i18n.t('governance_module.investor_profile_moderate_aggressive'),
    risk_tolerance: i18n.t('governance_module.risk_tolerance_medium_high'),
    rebalance_frequency: i18n.t('governance_module.rebalance_monthly'),
    min_capital: "€25,000",
    benchmark: "Índice + 4%",

    characteristics: [
      i18n.t('governance_module.char_sector_concentration'),
      i18n.t('governance_module.char_requires_macro'),
      i18n.t('governance_module.char_high_liquidity'),
      i18n.t('governance_module.char_cycle_sensitive')
    ],

    ideal_conditions: [
      i18n.t('governance_module.ideal_cycle_changes'),
      i18n.t('governance_module.ideal_sector_divergence'),
      i18n.t('governance_module.ideal_macro_catalysts')
    ],

    risks: [
      i18n.t('governance_module.risk_high_sector_concentration'),
      i18n.t('governance_module.risk_critical_rotation_timing'),
      i18n.t('governance_module.risk_higher_complexity')
    ]
  }
};

// =====================================================
// COMPLIANCE VALIDATION
// =====================================================

export const validateCompliance = (
  portfolio: PortfolioAsset[],
  rules: InvestmentRules = INVESTMENT_RULES
): ComplianceResult => {
  const violations: ComplianceViolation[] = [];
  const warnings: ComplianceWarning[] = [];

  // 1. Validate concentration by asset
  portfolio.forEach((asset: PortfolioAsset) => {
    if (asset.weight > rules.max_position_weight) {
      violations.push({
        type: 'MAX_POSITION',
        severity: 'HIGH',
        asset: asset.ticker,
        value: `${(asset.weight * 100).toFixed(2)  }%`,
        limit: `${rules.max_position_weight * 100  }%`,
        message: i18n.t('governance_module.violation_max_position', { ticker: asset.ticker })
      });
    }

    if (asset.weight < rules.min_position_weight) {
      warnings.push({
        type: 'MIN_POSITION',
        severity: 'LOW',
        asset: asset.ticker,
        value: `${(asset.weight * 100).toFixed(2)  }%`,
        limit: `${rules.min_position_weight * 100  }%`,
        message: i18n.t('governance_module.warning_min_position', { ticker: asset.ticker })
      });
    }
  });

  // 2. Validate top 3 concentration
  const sortedByWeight = [...portfolio].sort((a: PortfolioAsset, b: PortfolioAsset) => b.weight - a.weight);
  const top3Weight = sortedByWeight.slice(0, 3).reduce((sum: number, a: PortfolioAsset) => sum + a.weight, 0);

  if (top3Weight > rules.max_top3_concentration) {
    violations.push({
      type: 'TOP3_CONCENTRATION',
      severity: 'MEDIUM',
      value: `${(top3Weight * 100).toFixed(2)  }%`,
      limit: `${rules.max_top3_concentration * 100  }%`,
      message: i18n.t('governance_module.violation_top3_concentration')
    });
  }

  // 3. Validate correlations (if available)
  // This would require the correlation matrix, we make it optional

  // 4. Validate portfolio volatility
  const portfolioVol: number = parseFloat(String(portfolio[0]?.portfolio_vol || 20));
  if (portfolioVol > rules.max_portfolio_volatility) {
    violations.push({
      type: 'PORTFOLIO_VOLATILITY',
      severity: 'HIGH',
      value: `${portfolioVol.toFixed(2)  }%`,
      limit: `${rules.max_portfolio_volatility  }%`,
      message: i18n.t('governance_module.violation_portfolio_volatility')
    });
  }

  // 5. Validate liquidity
  portfolio.forEach((asset: PortfolioAsset) => {
    const avgVol: number = parseFloat(String(asset.details?.liquidity?.avgVol20 || 0));
    if (rules.exclusions.low_liquidity && avgVol < rules.min_daily_volume) {
      warnings.push({
        type: 'LOW_LIQUIDITY',
        severity: 'MEDIUM',
        asset: asset.ticker,
        value: avgVol.toFixed(0),
        limit: rules.min_daily_volume,
        message: i18n.t('governance_module.warning_low_liquidity', { ticker: asset.ticker })
      });
    }
  });

  // 6. Validate risk outliers
  portfolio.forEach((asset: PortfolioAsset) => {
    const vol: number = parseFloat(String(asset.volatility || 20));
    if (rules.exclusions.high_risk && vol > 50) {
      violations.push({
        type: 'HIGH_RISK',
        severity: 'HIGH',
        asset: asset.ticker,
        value: `${vol.toFixed(2)  }%`,
        limit: '50%',
        message: i18n.t('governance_module.warning_extreme_volatility', { ticker: asset.ticker })
      });
    }
  });

  return {
    compliant: violations.length === 0,
    violations,
    warnings,
    summary: {
      total_issues: violations.length + warnings.length,
      critical: violations.filter((v: ComplianceViolation) => v.severity === 'HIGH').length,
      warnings: warnings.length
    }
  };
};

// =====================================================
// APPLY AUTOMATIC CORRECTIONS
// =====================================================

export const applyComplianceCorrections = (
  portfolio: PortfolioAsset[],
  rules: InvestmentRules = INVESTMENT_RULES
): CorrectionResult => {
  let correctedPortfolio: PortfolioAsset[] = [...portfolio];
  const corrections: CorrectionEntry[] = [];

  // 1. Correct weights exceeding maximum
  correctedPortfolio = correctedPortfolio.map((asset: PortfolioAsset): PortfolioAsset => {
    if (asset.weight > rules.max_position_weight) {
      corrections.push({
        asset: asset.ticker,
        action: i18n.t('governance_module.action_reduce_weight'),
        from: `${(asset.weight * 100).toFixed(2)  }%`,
        to: `${rules.max_position_weight * 100  }%`
      });

      return {
        ...asset,
        weight: rules.max_position_weight,
        weight_pct: (rules.max_position_weight * 100).toFixed(2)
      };
    }
    return asset;
  });

  // 2. Remove assets below minimum
  const beforeLength: number = correctedPortfolio.length;
  correctedPortfolio = correctedPortfolio.filter((asset: PortfolioAsset): boolean => {
    if (asset.weight < rules.min_position_weight) {
      corrections.push({
        asset: asset.ticker,
        action: i18n.t('governance_module.action_remove'),
        reason: i18n.t('governance_module.reason_weight_below_minimum')
      });
      return false;
    }
    return true;
  });

  // 3. Re-normalise weights
  const totalWeight: number = correctedPortfolio.reduce((sum: number, a: PortfolioAsset) => sum + a.weight, 0);
  if (Math.abs(totalWeight - 1.0) > 0.001) {
    correctedPortfolio = correctedPortfolio.map((asset: PortfolioAsset): PortfolioAsset => ({
      ...asset,
      weight: asset.weight / totalWeight,
      weight_pct: ((asset.weight / totalWeight) * 100).toFixed(2)
    }));

    corrections.push({
      action: i18n.t('governance_module.action_renormalize'),
      reason: i18n.t('governance_module.reason_adjust_weights')
    });
  }

  return {
    portfolio: correctedPortfolio,
    corrections,
    removed: beforeLength - correctedPortfolio.length
  };
};

// =====================================================
// GENERATE GOVERNANCE REPORT
// =====================================================

export const generateGovernanceReport = (
  portfolio: PortfolioAsset[],
  strategy: string,
  rules: InvestmentRules = INVESTMENT_RULES
): GovernanceReport => {
  const compliance: ComplianceResult = validateCompliance(portfolio, rules);
  const strategyDoc: Partial<StrategyDocumentation> = STRATEGY_DOCUMENTATION[strategy] || {};

  return {
    timestamp: new Date().toISOString(),
    strategy: {
      name: strategyDoc.name || strategy,
      profile: strategyDoc.investor_profile || 'Unknown',
      objective: strategyDoc.objective || 'N/A'
    },
    compliance,
    portfolio_summary: {
      n_assets: portfolio.length,
      total_weight: portfolio.reduce((sum: number, a: PortfolioAsset) => sum + a.weight, 0).toFixed(4),
      max_position: Math.max(...portfolio.map((a: PortfolioAsset) => a.weight)).toFixed(4),
      min_position: Math.min(...portfolio.map((a: PortfolioAsset) => a.weight)).toFixed(4),
      top3_concentration: portfolio
        .sort((a: PortfolioAsset, b: PortfolioAsset) => b.weight - a.weight)
        .slice(0, 3)
        .reduce((sum: number, a: PortfolioAsset) => sum + a.weight, 0)
        .toFixed(4)
    },
    rules_applied: {
      max_position_weight: rules.max_position_weight,
      max_portfolio_volatility: rules.max_portfolio_volatility,
      min_daily_volume: rules.min_daily_volume
    }
  };
};

export default {
  INVESTMENT_RULES,
  RISK_PROFILES,
  STRATEGY_DOCUMENTATION,
  validateCompliance,
  applyComplianceCorrections,
  generateGovernanceReport
};
