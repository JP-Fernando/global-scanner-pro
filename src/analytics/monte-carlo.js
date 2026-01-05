/**
 * =====================================================
 * MONTE CARLO SIMULATION MODULE
 * =====================================================
 *
 * Simulates portfolio performance under random market conditions.
 * Includes:
 * - Monte Carlo simulation for portfolio returns
 * - Historical scenario replay
 * - Value at Risk (VaR) via simulation
 * - Probability distributions for outcomes
 */

import i18n from '../i18n/i18n.js';

// =====================================================
// MONTE CARLO SIMULATION
// =====================================================

/**
 * Generate random normal distribution sample (Box-Muller transform)
 * @param {number} mean - Mean of distribution
 * @param {number} stdDev - Standard deviation
 * @returns {number} Random sample
 */
const randomNormal = (mean = 0, stdDev = 1) => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
};

/**
 * Calculate portfolio statistics from historical data
 * @param {Array} positions - Portfolio positions with historical prices
 * @returns {Object} Portfolio statistics
 */
const calculatePortfolioStats = (positions) => {
  const returns = [];

  // Calculate daily portfolio returns
  const maxLength = Math.max(...positions.map(p => p.prices?.length || 0));

  for (let i = 1; i < maxLength; i++) {
    let portfolioReturn = 0;
    let totalWeight = 0;

    positions.forEach(position => {
      if (position.prices && position.prices[i] && position.prices[i-1]) {
        const assetReturn = (position.prices[i].close - position.prices[i-1].close) /
                          position.prices[i-1].close;
        const weight = parseFloat(position.weight || position.current_weight || 0);
        portfolioReturn += assetReturn * weight;
        totalWeight += weight;
      }
    });

    if (totalWeight > 0) {
      returns.push(portfolioReturn / totalWeight);
    }
  }

  // Calculate statistics
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
                   (returns.length - 1);
  const stdDev = Math.sqrt(variance);

  return {
    dailyMean: mean,
    dailyStdDev: stdDev,
    annualizedReturn: mean * 252,
    annualizedVolatility: stdDev * Math.sqrt(252),
    observations: returns.length
  };
};

/**
 * Run Monte Carlo simulation for portfolio
 * @param {Array} positions - Portfolio positions
 * @param {number} initialCapital - Starting capital
 * @param {Object} options - Simulation parameters
 * @returns {Object} Simulation results
 */
export const runMonteCarloSimulation = (positions, initialCapital, options = {}) => {
  const {
    numSimulations = 10000,
    timeHorizonDays = 252, // 1 year
    confidenceLevel = 0.95,
    randomSeed = null
  } = options;

  // Calculate portfolio statistics
  const stats = calculatePortfolioStats(positions);

  if (!stats.dailyMean || !stats.dailyStdDev) {
    return {
      error: 'Insufficient historical data for simulation'
    };
  }

  // Run simulations
  const simulations = [];
  const finalValues = [];

  for (let sim = 0; sim < numSimulations; sim++) {
    const path = [initialCapital];
    let value = initialCapital;

    for (let day = 0; day < timeHorizonDays; day++) {
      const dailyReturn = randomNormal(stats.dailyMean, stats.dailyStdDev);
      value *= (1 + dailyReturn);
      path.push(value);
    }

    simulations.push(path);
    finalValues.push(value);
  }

  // Sort final values for percentile calculations
  finalValues.sort((a, b) => a - b);

  // Calculate percentiles
  const getPercentile = (arr, p) => {
    const index = Math.floor(arr.length * p);
    return arr[index];
  };

  const median = getPercentile(finalValues, 0.50);
  const percentile5 = getPercentile(finalValues, 0.05);
  const percentile95 = getPercentile(finalValues, 0.95);
  const percentile25 = getPercentile(finalValues, 0.25);
  const percentile75 = getPercentile(finalValues, 0.75);

  // Calculate VaR and CVaR
  const varIndex = Math.floor((1 - confidenceLevel) * finalValues.length);
  const var95 = initialCapital - finalValues[varIndex];
  const cvar95 = initialCapital - (finalValues.slice(0, varIndex + 1).reduce((a, b) => a + b, 0) /
                                   (varIndex + 1));

  // Calculate probability of loss
  const lossCount = finalValues.filter(v => v < initialCapital).length;
  const probabilityOfLoss = lossCount / numSimulations;

  // Calculate expected value
  const expectedValue = finalValues.reduce((sum, v) => sum + v, 0) / numSimulations;

  return {
    parameters: {
      numSimulations,
      timeHorizonDays,
      confidenceLevel,
      initialCapital: initialCapital.toFixed(2)
    },
    statistics: {
      dailyMean: (stats.dailyMean * 100).toFixed(4) + '%',
      dailyStdDev: (stats.dailyStdDev * 100).toFixed(4) + '%',
      annualizedReturn: (stats.annualizedReturn * 100).toFixed(2) + '%',
      annualizedVolatility: (stats.annualizedVolatility * 100).toFixed(2) + '%',
      observations: stats.observations
    },
    results: {
      expectedValue: expectedValue.toFixed(2),
      expectedReturn: ((expectedValue / initialCapital - 1) * 100).toFixed(2) + '%',
      median: median.toFixed(2),
      percentile5: percentile5.toFixed(2),
      percentile25: percentile25.toFixed(2),
      percentile75: percentile75.toFixed(2),
      percentile95: percentile95.toFixed(2),
      probabilityOfLoss: (probabilityOfLoss * 100).toFixed(2) + '%',
      var95: var95.toFixed(2),
      var95Pct: (var95 / initialCapital * 100).toFixed(2) + '%',
      cvar95: cvar95.toFixed(2),
      cvar95Pct: (cvar95 / initialCapital * 100).toFixed(2) + '%'
    },
    distribution: {
      min: finalValues[0].toFixed(2),
      max: finalValues[finalValues.length - 1].toFixed(2),
      range: (finalValues[finalValues.length - 1] - finalValues[0]).toFixed(2)
    },
    paths: simulations.slice(0, 100), // Return first 100 paths for visualization
    finalValues: finalValues
  };
};

/**
 * Run historical scenario simulation
 * Replays historical crisis periods on current portfolio
 * @param {Array} positions - Portfolio positions
 * @param {number} initialCapital - Starting capital
 * @param {Array} scenarios - Historical scenarios to replay
 * @returns {Object} Scenario results
 */
export const runHistoricalScenarios = (positions, initialCapital, scenarios) => {
  const results = [];

  scenarios.forEach(scenario => {
    const { name, description, startDate, endDate, shocks } = scenario;

    let totalImpact = 0;
    const positionImpacts = [];

    positions.forEach(position => {
      const weight = parseFloat(position.weight || position.current_weight || 0);
      const positionValue = initialCapital * weight;

      // Apply sector-specific shock if available
      const sector = position.sector || 999;
      const shock = shocks.sectors?.[sector] || shocks.market || 0;

      const impact = positionValue * shock;
      totalImpact += impact;

      positionImpacts.push({
        ticker: position.ticker,
        name: position.name,
        sector,
        currentValue: positionValue.toFixed(2),
        shock: (shock * 100).toFixed(1) + '%',
        impact: impact.toFixed(2),
        newValue: (positionValue + impact).toFixed(2)
      });
    });

    results.push({
      scenario: name,
      description,
      period: `${startDate} to ${endDate}`,
      totalImpact: totalImpact.toFixed(2),
      impactPct: (totalImpact / initialCapital * 100).toFixed(2) + '%',
      newPortfolioValue: (initialCapital + totalImpact).toFixed(2),
      positionImpacts: positionImpacts.sort((a, b) => parseFloat(a.impact) - parseFloat(b.impact))
    });
  });

  return {
    summary: {
      scenariosAnalyzed: results.length,
      worstCase: results.reduce((worst, r) =>
        parseFloat(r.totalImpact) < parseFloat(worst.totalImpact) ? r : worst
      , results[0]),
      avgImpact: (results.reduce((sum, r) => sum + parseFloat(r.totalImpact), 0) /
                  results.length).toFixed(2)
    },
    scenarios: results
  };
};

/**
 * Pre-defined historical crisis scenarios
 */
export const HISTORICAL_SCENARIOS = [
  {
    name: 'Dot-com Bubble (2000-2002)',
    description: 'Technology stock crash',
    startDate: '2000-03-10',
    endDate: '2002-10-09',
    shocks: {
      market: -0.49,
      sectors: {
        800: -0.78, // Technology
        900: -0.72, // Communications
        400: -0.43  // Consumer Discretionary
      }
    }
  },
  {
    name: 'Global Financial Crisis (2007-2009)',
    description: 'Subprime mortgage crisis and banking collapse',
    startDate: '2007-10-09',
    endDate: '2009-03-09',
    shocks: {
      market: -0.57,
      sectors: {
        700: -0.83, // Financials
        300: -0.67, // Industrials
        100: -0.62, // Energy
        400: -0.59  // Consumer Discretionary
      }
    }
  },
  {
    name: 'COVID-19 Crash (Feb-Mar 2020)',
    description: 'Global pandemic market crash',
    startDate: '2020-02-19',
    endDate: '2020-03-23',
    shocks: {
      market: -0.34,
      sectors: {
        100: -0.51, // Energy
        400: -0.44, // Consumer Discretionary
        300: -0.39, // Industrials
        700: -0.38, // Financials
        600: 0.05,  // Healthcare (benefit)
        800: -0.12  // Technology (less affected)
      }
    }
  },
  {
    name: 'European Debt Crisis (2011-2012)',
    description: 'Sovereign debt crisis in Europe',
    startDate: '2011-05-02',
    endDate: '2012-06-01',
    shocks: {
      market: -0.19,
      sectors: {
        700: -0.32, // Financials
        300: -0.24, // Industrials
        500: -0.14  // Consumer Staples
      }
    }
  },
  {
    name: 'Flash Crash (May 2010)',
    description: 'Rapid market crash and recovery',
    startDate: '2010-05-06',
    endDate: '2010-05-06',
    shocks: {
      market: -0.09,
      sectors: {
        700: -0.15, // Financials
        800: -0.12, // Technology
        300: -0.11  // Industrials
      }
    }
  }
];

// =====================================================
// EXPORTS
// =====================================================

export default {
  runMonteCarloSimulation,
  runHistoricalScenarios,
  HISTORICAL_SCENARIOS
};
