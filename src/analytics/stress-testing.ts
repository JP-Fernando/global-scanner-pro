/**
 * =====================================================
 * MULTI-FACTOR STRESS TESTING MODULE
 * =====================================================
 *
 * Advanced stress testing framework for portfolio risk assessment.
 * Includes:
 * - Sector-specific stress scenarios
 * - Currency shock simulations
 * - Geopolitical risk scenarios
 * - Liquidity crisis simulations
 * - Combined multi-factor stress tests
 */

import _i18n from '../i18n/i18n.js';
import { SECTOR_TAXONOMY } from '../data/sectors.js';

// =====================================================
// LOCAL TYPES
// =====================================================

interface STPosition {
  ticker: string;
  name?: string;
  sector?: string | number;
  weight?: number | string;
  current_weight?: number | string;
  volatility?: number | string;
  volume?: number | string;
  entry_price?: number;
  current_price?: number;
  quantity?: number;
}

interface SectorStressScenario {
  id: string;
  name: string;
  description: string;
  sectorId: number;
  shockMagnitude: number;
  correlationIncrease: number;
  duration: string;
}

export interface CurrencyStressScenario {
  id: string;
  name: string;
  description: string;
  shockMagnitude: Record<string, number>;
  trigger: string;
}

export interface GeopoliticalStressScenario {
  id: string;
  name: string;
  description: string;
  marketShock: number;
  volatilityMultiplier: number;
  correlationTarget?: number;
  safehavenBenefit?: { sectors: number[]; boost: number };
  mostAffected?: number[];
  sectorShocks?: Record<number, number>;
  duration: string;
}

export interface LiquidityStressScenario {
  id: string;
  name: string;
  description: string;
  volumeReduction: number;
  bidAskSpreadMultiplier: number;
  priceImpact: number;
  recoveryDays: number;
  mostAffected?: number[];
  sectorPriceImpact?: Record<number, number>;
}

interface PositionImpact {
  ticker: string;
  name: string | undefined;
  sector: string;
  currentValue: string;
  shock: string;
  estimatedLoss: string;
  newValue: string;
}

interface CurrencyPositionImpact {
  ticker: string;
  name: string | undefined;
  currency: string;
  currentValue: string;
  fxShock: string;
  impact: string;
  newValue: string;
}

interface GeopoliticalPositionImpact {
  ticker: string;
  name: string | undefined;
  sector: string;
  currentValue: string;
  shock: string;
  estimatedLoss: string;
  newValue: string;
  volatilityBefore: string;
  volatilityAfter: string;
  volatilityIncrease: string;
}

interface LiquidationAnalysisItem {
  ticker: string;
  name: string | undefined;
  currentValue: string;
  normalVolume: string;
  stressedVolume: string;
  volumeReduction: string;
  bidAskSpread: string;
  daysToLiquidate: number;
  priceImpact: string;
  estimatedLoss: string;
  liquidationValue: string;
  liquidityRisk: string;
}

export interface CurrencyExposureItem {
  currency: string;
  value: string;
  pct: string;
}

export interface StressTestSummaryItem {
  category: string;
  scenario: string;
  totalLoss: string | number;
  lossPct?: string;
  impactPct?: string;
  newPortfolioValue?: string;
  liquidationValue?: string;
  avgDaysToLiquidate?: string;
  [key: string]: unknown;
}

interface StressRecommendation {
  severity: string;
  type: string;
  message: string;
  scenarios?: string[];
  avgLoss?: string;
  action?: string;
}

// =====================================================
// STRESS SCENARIO DEFINITIONS
// =====================================================

/**
 * Sector stress scenarios
 * Simulates sector-specific shocks
 */
const SECTOR_STRESS_SCENARIOS = [
  {
    id: 'tech_crash',
    name: 'Technology Sector Crash',
    description: 'Major correction in technology stocks (e.g., AI bubble burst)',
    sectorId: 800, // Information Technology
    shockMagnitude: -0.30,
    correlationIncrease: 0.25, // Other sectors also affected
    duration: 'days'
  },
  {
    id: 'financial_crisis',
    name: 'Financial Sector Crisis',
    description: 'Banking system stress (e.g., credit crunch, bank failures)',
    sectorId: 700, // Financials
    shockMagnitude: -0.40,
    correlationIncrease: 0.35,
    duration: 'days'
  },
  {
    id: 'energy_shock',
    name: 'Energy Price Shock',
    description: 'Oil price collapse or spike',
    sectorId: 100, // Energy
    shockMagnitude: -0.25,
    correlationIncrease: 0.15,
    duration: 'days'
  },
  {
    id: 'healthcare_regulatory',
    name: 'Healthcare Regulatory Shock',
    description: 'Major regulatory changes affecting pharma/biotech',
    sectorId: 600, // Healthcare
    shockMagnitude: -0.20,
    correlationIncrease: 0.10,
    duration: 'days'
  },
  {
    id: 'consumer_recession',
    name: 'Consumer Spending Collapse',
    description: 'Economic recession affecting consumer sectors',
    sectorId: 400, // Consumer Discretionary
    shockMagnitude: -0.35,
    correlationIncrease: 0.30,
    duration: 'days'
  }
];

/**
 * Currency stress scenarios
 * Simulates FX shocks for international portfolios
 */
const CURRENCY_STRESS_SCENARIOS = [
  {
    id: 'usd_surge',
    name: 'USD Surge',
    description: 'Strong US dollar appreciation (flight to safety)',
    shockMagnitude: {
      USD: 0.00,   // No change
      EUR: -0.10,  // Euro weakens 10%
      GBP: -0.08,
      JPY: -0.05,
      CNY: -0.12,
      OTHER: -0.08
    },
    trigger: 'Fed rate hike, geopolitical crisis'
  },
  {
    id: 'usd_collapse',
    name: 'USD Collapse',
    description: 'US dollar devaluation (loss of reserve currency status)',
    shockMagnitude: {
      USD: -0.15,
      EUR: 0.10,
      GBP: 0.08,
      JPY: 0.12,
      CNY: 0.15,
      OTHER: 0.10
    },
    trigger: 'Loss of confidence in US economy'
  },
  {
    id: 'emerging_market_crisis',
    name: 'Emerging Markets Currency Crisis',
    description: 'Widespread EM currency devaluation',
    shockMagnitude: {
      USD: 0.05,
      EUR: 0.03,
      GBP: 0.02,
      JPY: 0.04,
      CNY: -0.20,
      OTHER: -0.25  // Emerging markets
    },
    trigger: 'Capital flight from emerging markets'
  }
];

/**
 * Geopolitical stress scenarios
 */
const GEOPOLITICAL_STRESS_SCENARIOS = [
  {
    id: 'global_conflict',
    name: 'Global Military Conflict',
    description: 'Major geopolitical escalation (e.g., regional war)',
    marketShock: -0.25,
    volatilityMultiplier: 2.5,
    correlationTarget: 0.85,
    safehavenBenefit: {
      sectors: [1000], // Utilities
      boost: 0.10
    },
    duration: 'weeks'
  },
  {
    id: 'trade_war',
    name: 'Global Trade War',
    description: 'Escalating tariffs and trade restrictions',
    marketShock: -0.15,
    volatilityMultiplier: 1.8,
    correlationTarget: 0.75,
    mostAffected: [300, 800], // Industrials, Tech
    sectorShocks: {
      300: -0.25,
      800: -0.20
    },
    duration: 'months'
  },
  {
    id: 'cyber_attack',
    name: 'Large-Scale Cyber Attack',
    description: 'Critical infrastructure cyber attack',
    marketShock: -0.12,
    volatilityMultiplier: 2.0,
    mostAffected: [700, 800, 900], // Financials, Tech, Communications
    sectorShocks: {
      700: -0.30,
      800: -0.25,
      900: -0.20
    },
    duration: 'days'
  },
  {
    id: 'pandemic',
    name: 'Global Pandemic',
    description: 'Widespread health crisis (COVID-like event)',
    marketShock: -0.35,
    volatilityMultiplier: 3.0,
    correlationTarget: 0.90,
    sectorShocks: {
      400: -0.50, // Consumer Discretionary
      100: -0.40, // Energy
      300: -0.35, // Industrials
      600: 0.15,  // Healthcare (benefit)
      800: 0.10   // Tech (benefit from remote work)
    },
    duration: 'months'
  }
];

/**
 * Liquidity stress scenarios
 */
const LIQUIDITY_STRESS_SCENARIOS = [
  {
    id: 'market_freeze',
    name: 'Market Liquidity Freeze',
    description: 'Sudden liquidity crisis (e.g., flash crash)',
    volumeReduction: 0.70,  // 70% reduction in volume
    bidAskSpreadMultiplier: 5.0,
    priceImpact: -0.15,
    recoveryDays: 5
  },
  {
    id: 'credit_crunch',
    name: 'Credit Market Freeze',
    description: 'Interbank lending stops, credit markets seize',
    volumeReduction: 0.50,
    bidAskSpreadMultiplier: 3.0,
    priceImpact: -0.20,
    mostAffected: [700], // Financials
    sectorPriceImpact: {
      700: -0.40
    },
    recoveryDays: 30
  },
  {
    id: 'redemption_crisis',
    name: 'Forced Liquidation Crisis',
    description: 'Mass redemptions forcing fire sales',
    volumeReduction: 0.60,
    bidAskSpreadMultiplier: 4.0,
    priceImpact: -0.25,
    recoveryDays: 10
  }
];

// =====================================================
// STRESS TEST EXECUTION FUNCTIONS
// =====================================================

/**
 * Calculate sector weights in portfolio
 * @param {Array} portfolio - Portfolio positions
 * @returns {Object} Sector weights
 */
const calculateSectorWeights = (portfolio: STPosition[]): Record<string, number> => {
  const sectorWeights: Record<string, number> = {};
  let totalWeight = 0;

  portfolio.forEach((position: STPosition) => {
    const sector = position.sector || 999;
    const weight = parseFloat(String(position.current_weight || position.weight || 0));

    if (!sectorWeights[sector]) {
      sectorWeights[sector] = 0;
    }
    sectorWeights[sector] += weight;
    totalWeight += weight;
  });

  // Normalize if needed
  if (totalWeight > 0 && Math.abs(totalWeight - 1.0) > 0.01) {
    Object.keys(sectorWeights).forEach(sector => {
      sectorWeights[sector] /= totalWeight;
    });
  }

  return sectorWeights;
};

/**
 * Get sector name from ID
 */
const getSectorName = (sectorId: string | number): string => {
  const sector = SECTOR_TAXONOMY.find(s => s.sectorId === sectorId);
  return sector ? sector.name : 'Unknown';
};

/**
 * Run sector stress test
 * @param {Array} portfolio - Portfolio positions
 * @param {number} totalCapital - Total capital
 * @param {Object} scenario - Sector stress scenario
 * @returns {Object} Stress test results
 */
export const runSectorStressTest = (portfolio: STPosition[], totalCapital: number, scenario: SectorStressScenario) => {
  const sectorWeights = calculateSectorWeights(portfolio);
  const targetSectorWeight = sectorWeights[scenario.sectorId] || 0;

  let totalLoss = 0;
  const positionImpacts: PositionImpact[] = [];

  portfolio.forEach((position: STPosition) => {
    const positionSector = position.sector || 999;
    const positionWeight = parseFloat(String(position.current_weight || position.weight || 0));
    const positionValue = totalCapital * positionWeight;

    let shock = 0;

    if (positionSector === scenario.sectorId) {
      // Direct impact on stressed sector
      shock = scenario.shockMagnitude;
    } else {
      // Correlation spillover to other sectors
      shock = scenario.shockMagnitude * scenario.correlationIncrease;
    }

    const loss = positionValue * shock;
    totalLoss += loss;

    positionImpacts.push({
      ticker: position.ticker,
      name: position.name,
      sector: getSectorName(positionSector),
      currentValue: positionValue.toFixed(2),
      shock: `${(shock * 100).toFixed(1)  }%`,
      estimatedLoss: loss.toFixed(2),
      newValue: (positionValue + loss).toFixed(2)
    });
  });

  return {
    scenario: scenario.name,
    description: scenario.description,
    targetSector: getSectorName(scenario.sectorId),
    portfolioExposure: `${(targetSectorWeight * 100).toFixed(1)  }%`,
    shockMagnitude: `${(scenario.shockMagnitude * 100).toFixed(1)  }%`,
    totalLoss: Math.abs(totalLoss).toFixed(2),
    lossPct: `${(Math.abs(totalLoss) / totalCapital * 100).toFixed(2)  }%`,
    newPortfolioValue: (totalCapital + totalLoss).toFixed(2),
    positionImpacts: positionImpacts.sort((a, b) =>
      parseFloat(a.estimatedLoss) - parseFloat(b.estimatedLoss)
    ),
    worstHit: positionImpacts.reduce((worst, pos) =>
      parseFloat(pos.estimatedLoss) < parseFloat(worst.estimatedLoss) ? pos : worst
    , positionImpacts[0])
  };
};

/**
 * Calculate currency exposure breakdown
 */
const calculateCurrencyExposure = (positionImpacts: any[], totalCapital: number) => {
  const exposure: Record<string, number> = {};

  positionImpacts.forEach((pos: any) => {
    if (!exposure[pos.currency]) {
      exposure[pos.currency] = 0;
    }
    exposure[pos.currency] += parseFloat(pos.currentValue);
  });

  const result = Object.entries(exposure).map(([currency, value]) => ({
    currency,
    value: (value as number).toFixed(2),
    pct: `${((value as number) / totalCapital * 100).toFixed(1)}%`
  }));

  return result.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
};

/**
 * Run currency stress test
 * @param {Array} portfolio - Portfolio positions with country/currency info
 * @param {number} totalCapital - Total capital
 * @param {Object} scenario - Currency stress scenario
 * @returns {Object} Stress test results
 */
export const runCurrencyStressTest = (portfolio: any[], totalCapital: number, scenario: any) => {
  let totalImpact = 0;
  const positionImpacts: CurrencyPositionImpact[] = [];

  portfolio.forEach((position: any) => {
    const positionWeight = parseFloat(position.current_weight || position.weight || 0);
    const positionValue = totalCapital * positionWeight;

    // Determine currency from ticker suffix or country
    let currency = 'USD';
    if (position.ticker.endsWith('.L')) currency = 'GBP';
    else if (position.ticker.endsWith('.PA') || position.ticker.endsWith('.DE') ||
             position.ticker.endsWith('.MI')) currency = 'EUR';
    else if (position.ticker.endsWith('.T')) currency = 'JPY';
    else if (position.ticker.endsWith('.HK') || position.ticker.endsWith('.SS')) currency = 'CNY';

    const fxShock = scenario.shockMagnitude[currency] || scenario.shockMagnitude.OTHER || 0;
    const impact = positionValue * fxShock;
    totalImpact += impact;

    positionImpacts.push({
      ticker: position.ticker,
      name: position.name,
      currency,
      currentValue: positionValue.toFixed(2),
      fxShock: `${(fxShock * 100).toFixed(1)  }%`,
      impact: impact.toFixed(2),
      newValue: (positionValue + impact).toFixed(2)
    });
  });

  return {
    scenario: scenario.name,
    description: scenario.description,
    trigger: scenario.trigger,
    totalImpact: totalImpact.toFixed(2),
    impactPct: `${(totalImpact / totalCapital * 100).toFixed(2)  }%`,
    newPortfolioValue: (totalCapital + totalImpact).toFixed(2),
    positionImpacts: positionImpacts.sort((a, b) => parseFloat(a.impact) - parseFloat(b.impact)),
    currencyExposure: calculateCurrencyExposure(positionImpacts, totalCapital)
  };
};

/**
 * Run geopolitical stress test
 * @param {Array} portfolio - Portfolio positions
 * @param {number} totalCapital - Total capital
 * @param {Object} scenario - Geopolitical stress scenario
 * @returns {Object} Stress test results
 */
export const runGeopoliticalStressTest = (portfolio: any[], totalCapital: number, scenario: any) => {
  let totalLoss = 0;
  const positionImpacts: GeopoliticalPositionImpact[] = [];

  portfolio.forEach((position: any) => {
    const positionSector = position.sector || 999;
    const positionWeight = parseFloat(position.current_weight || position.weight || 0);
    const positionValue = totalCapital * positionWeight;
    const baseVolatility = parseFloat(position.volatility || 20);

    // Determine shock for this position
    let shock = scenario.marketShock;

    if (scenario.sectorShocks && scenario.sectorShocks[positionSector] !== undefined) {
      shock = scenario.sectorShocks[positionSector];
    }

    // Apply safe haven boost if applicable
    if (scenario.safehavenBenefit &&
        scenario.safehavenBenefit.sectors.includes(positionSector)) {
      shock += scenario.safehavenBenefit.boost;
    }

    const loss = positionValue * shock;
    const newVolatility = baseVolatility * scenario.volatilityMultiplier;

    totalLoss += loss;

    positionImpacts.push({
      ticker: position.ticker,
      name: position.name,
      sector: getSectorName(positionSector),
      currentValue: positionValue.toFixed(2),
      shock: `${(shock * 100).toFixed(1)  }%`,
      estimatedLoss: loss.toFixed(2),
      newValue: (positionValue + loss).toFixed(2),
      volatilityBefore: `${baseVolatility.toFixed(1)  }%`,
      volatilityAfter: `${newVolatility.toFixed(1)  }%`,
      volatilityIncrease: `${((newVolatility - baseVolatility) / baseVolatility * 100).toFixed(0)  }%`
    });
  });

  return {
    scenario: scenario.name,
    description: scenario.description,
    duration: scenario.duration,
    marketShock: `${(scenario.marketShock * 100).toFixed(1)  }%`,
    volatilityIncrease: `${((scenario.volatilityMultiplier - 1) * 100).toFixed(0)  }%`,
    correlationTarget: scenario.correlationTarget,
    totalLoss: Math.abs(totalLoss).toFixed(2),
    lossPct: `${(Math.abs(totalLoss) / totalCapital * 100).toFixed(2)  }%`,
    newPortfolioValue: (totalCapital + totalLoss).toFixed(2),
    positionImpacts: positionImpacts.sort((a, b) =>
      parseFloat(a.estimatedLoss) - parseFloat(b.estimatedLoss)
    ),
    topLosers: positionImpacts
      .sort((a, b) => parseFloat(a.estimatedLoss) - parseFloat(b.estimatedLoss))
      .slice(0, 5)
  };
};

/**
 * Run liquidity stress test
 * @param {Array} portfolio - Portfolio positions with volume data
 * @param {number} totalCapital - Total capital
 * @param {Object} scenario - Liquidity stress scenario
 * @returns {Object} Stress test results
 */
export const runLiquidityStressTest = (portfolio: any[], totalCapital: number, scenario: any) => {
  let totalImpact = 0;
  const liquidationAnalysis: LiquidationAnalysisItem[] = [];

  portfolio.forEach((position: any) => {
    const positionSector = position.sector || 999;
    const positionWeight = parseFloat(position.current_weight || position.weight || 0);
    const positionValue = totalCapital * positionWeight;
    const avgVolume = parseFloat(position.volume || 100000);

    // Calculate reduced volume
    const stressedVolume = avgVolume * (1 - scenario.volumeReduction);

    // Price impact from liquidity crisis
    let priceImpact = scenario.priceImpact;

    // Sector-specific impacts
    if (scenario.sectorPriceImpact && scenario.sectorPriceImpact[positionSector]) {
      priceImpact = scenario.sectorPriceImpact[positionSector];
    }

    // Calculate days to liquidate at stressed volume
    const entryPrice = position.entry_price || position.current_price || 100;
    const quantity = position.quantity || (positionValue / entryPrice);
    const daysToLiquidate = Math.ceil(quantity / stressedVolume);

    // Additional price impact from forced selling
    const additionalImpact = Math.min(-0.05, -0.01 * Math.log(daysToLiquidate));
    const totalPriceImpact = priceImpact + additionalImpact;

    const impact = positionValue * totalPriceImpact;
    totalImpact += impact;

    liquidationAnalysis.push({
      ticker: position.ticker,
      name: position.name,
      currentValue: positionValue.toFixed(2),
      normalVolume: avgVolume.toFixed(0),
      stressedVolume: stressedVolume.toFixed(0),
      volumeReduction: `${(scenario.volumeReduction * 100).toFixed(0)  }%`,
      bidAskSpread: `x${  scenario.bidAskSpreadMultiplier.toFixed(1)}`,
      daysToLiquidate,
      priceImpact: `${(totalPriceImpact * 100).toFixed(1)  }%`,
      estimatedLoss: impact.toFixed(2),
      liquidationValue: (positionValue + impact).toFixed(2),
      liquidityRisk: daysToLiquidate > 5 ? 'High' : daysToLiquidate > 2 ? 'Medium' : 'Low'
    });
  });

  return {
    scenario: scenario.name,
    description: scenario.description,
    volumeReduction: `${(scenario.volumeReduction * 100).toFixed(0)  }%`,
    spreadIncrease: `x${  scenario.bidAskSpreadMultiplier.toFixed(1)}`,
    recoveryPeriod: `${scenario.recoveryDays  } days`,
    totalImpact: Math.abs(totalImpact).toFixed(2),
    impactPct: `${(Math.abs(totalImpact) / totalCapital * 100).toFixed(2)  }%`,
    liquidationValue: (totalCapital + totalImpact).toFixed(2),
    liquidationAnalysis: liquidationAnalysis.sort((a, b) => b.daysToLiquidate - a.daysToLiquidate),
    highRiskPositions: liquidationAnalysis.filter(p => p.liquidityRisk === 'High'),
    avgDaysToLiquidate: (liquidationAnalysis.reduce((sum, p) => sum + p.daysToLiquidate, 0) /
                         liquidationAnalysis.length).toFixed(1)
  };
};

/**
 * Generate recommendations based on stress test results
 */
const generateStressTestRecommendations = (allTests: any[], totalCapital: number) => {
  const recommendations: StressRecommendation[] = [];

  // Find high-impact scenarios (> 15% loss)
  const highImpactTests = allTests.filter((test: any) => {
    const loss = parseFloat(test.totalLoss || 0);
    return (loss / totalCapital) > 0.15;
  });

  if (highImpactTests.length > 0) {
    recommendations.push({
      severity: 'High',
      type: 'Diversification',
      message: `Portfolio is vulnerable to ${highImpactTests.length} severe scenarios. ` +
        'Consider diversifying across sectors and geographies.',
      scenarios: highImpactTests.map((t: any) => t.scenario)
    });
  }

  // Check for sector concentration
  const sectorTests = allTests.filter((t: any) => t.category === 'Sector');
  const sumSectorLoss = sectorTests.reduce((sum: number, t: any) => sum + parseFloat(t.totalLoss || 0), 0);
  const avgSectorLoss = sumSectorLoss / sectorTests.length;

  if (avgSectorLoss / totalCapital > 0.12) {
    recommendations.push({
      severity: 'Medium',
      type: 'Sector Exposure',
      message: 'High sector concentration risk detected. ' +
        'Consider rebalancing to reduce single-sector dependency.',
      avgLoss: `${(avgSectorLoss / totalCapital * 100).toFixed(1)}%`
    });
  }

  // Check liquidity risk
  const liquidityTests = allTests.filter((t: any) => t.category === 'Liquidity');
  const highLiquidityRisk = liquidityTests.some((t: any) =>
    parseFloat(t.avgDaysToLiquidate || 0) > 5
  );

  if (highLiquidityRisk) {
    recommendations.push({
      severity: 'Medium',
      type: 'Liquidity Risk',
      message: 'Some positions may be difficult to liquidate quickly. ' +
        'Consider maintaining higher cash reserves or reducing illiquid positions.',
      action: 'Increase allocation to liquid assets'
    });
  }

  return recommendations;
};

/**
 * Run comprehensive multi-factor stress test
 * Combines multiple stress factors simultaneously
 * @param {Array} portfolio - Portfolio positions
 * @param {number} totalCapital - Total capital
 * @returns {Object} Comprehensive stress test results
 */
export const runMultiFactorStressTest = (portfolio: any[], totalCapital: number) => {
  // Run all stress test categories
  const sectorTests = SECTOR_STRESS_SCENARIOS.map(scenario =>
    runSectorStressTest(portfolio, totalCapital, scenario)
  );

  const currencyTests = CURRENCY_STRESS_SCENARIOS.map(scenario =>
    runCurrencyStressTest(portfolio, totalCapital, scenario)
  );

  const geopoliticalTests = GEOPOLITICAL_STRESS_SCENARIOS.map(scenario =>
    runGeopoliticalStressTest(portfolio, totalCapital, scenario)
  );

  const liquidityTests = LIQUIDITY_STRESS_SCENARIOS.map(scenario =>
    runLiquidityStressTest(portfolio, totalCapital, scenario)
  );

  // Calculate worst-case scenario (most severe loss)
  const allTests = [
    ...sectorTests.map(t => ({ ...t, category: 'Sector' })),
    ...currencyTests.map(t => ({ ...t, category: 'Currency', totalLoss: Math.abs(parseFloat(t.totalImpact)) })),
    ...geopoliticalTests.map(t => ({ ...t, category: 'Geopolitical' })),
    ...liquidityTests.map(t => ({ ...t, category: 'Liquidity', totalLoss: Math.abs(parseFloat(t.totalImpact)) }))
  ];

  const worstCase = allTests.reduce((worst, test) => {
    const loss = parseFloat(String(test.totalLoss || 0));
    return loss > parseFloat(String(worst.totalLoss || 0)) ? test : worst;
  }, allTests[0]);

  return {
    summary: {
      totalScenariosAnalyzed: allTests.length,
      categoriesAnalyzed: 4,
      worstCaseScenario: {
        name: worstCase.scenario,
        category: worstCase.category,
        loss: worstCase.totalLoss,
        lossPct: (worstCase as any).lossPct
      },
      portfolioValue: totalCapital.toFixed(2),
      worstCaseValue: (worstCase as any).newPortfolioValue || (worstCase as any).liquidationValue
    },
    sectorStressTests: sectorTests,
    currencyStressTests: currencyTests,
    geopoliticalStressTests: geopoliticalTests,
    liquidityStressTests: liquidityTests,
    recommendations: generateStressTestRecommendations(allTests, totalCapital)
  };
};

// =====================================================
// EXPORTS
// =====================================================

export default {
  runSectorStressTest,
  runCurrencyStressTest,
  runGeopoliticalStressTest,
  runLiquidityStressTest,
  runMultiFactorStressTest,
  SECTOR_STRESS_SCENARIOS,
  CURRENCY_STRESS_SCENARIOS,
  GEOPOLITICAL_STRESS_SCENARIOS,
  LIQUIDITY_STRESS_SCENARIOS
};
