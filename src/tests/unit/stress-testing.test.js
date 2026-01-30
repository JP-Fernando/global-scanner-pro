import { describe, it, expect } from 'vitest';
import {
  runSectorStressTest,
  runCurrencyStressTest,
  runGeopoliticalStressTest,
  runLiquidityStressTest,
  runMultiFactorStressTest,
} from '../../analytics/stress-testing.js';
import { buildStressTestPortfolio } from '../helpers.js';

describe('Stress Testing', () => {
  const portfolio = buildStressTestPortfolio();
  const totalCapital = 50000;

  // -----------------------------------------------------------
  // Sector stress
  // -----------------------------------------------------------
  describe('Sector Stress Test', () => {
    const techCrashScenario = {
      id: 'tech_crash',
      name: 'Technology Sector Crash',
      description: 'Major correction in technology stocks',
      sectorId: 800,
      shockMagnitude: -0.30,
      correlationIncrease: 0.25,
    };

    it('runs the scenario and analyses all positions', () => {
      const result = runSectorStressTest(portfolio, totalCapital, techCrashScenario);

      expect(result.scenario).toBe('Technology Sector Crash');
      expect(parseFloat(result.totalLoss)).toBeGreaterThan(0);
      expect(result.positionImpacts).toHaveLength(portfolio.length);
      expect(result.worstHit).toBeDefined();
    });

    it('shows negative impact on AAPL (tech sector)', () => {
      const result = runSectorStressTest(portfolio, totalCapital, techCrashScenario);
      const applImpact = result.positionImpacts.find((p) => p.ticker === 'AAPL');

      expect(applImpact).toBeDefined();
      expect(parseFloat(applImpact.estimatedLoss)).toBeLessThan(0);
    });
  });

  // -----------------------------------------------------------
  // Currency stress
  // -----------------------------------------------------------
  describe('Currency Stress Test', () => {
    it('analyses all positions and calculates currency exposure', () => {
      const usdSurgeScenario = {
        id: 'usd_surge',
        name: 'USD Surge',
        description: 'Strong US dollar appreciation',
        trigger: 'Fed rate hike',
        shockMagnitude: {
          USD: 0.00, EUR: -0.10, GBP: -0.08,
          JPY: -0.05, CNY: -0.12, OTHER: -0.08,
        },
      };

      const result = runCurrencyStressTest(portfolio, totalCapital, usdSurgeScenario);

      expect(result.scenario).toBe('USD Surge');
      expect(result.totalImpact).toBeDefined();
      expect(result.positionImpacts).toHaveLength(portfolio.length);
      expect(Array.isArray(result.currencyExposure)).toBe(true);
    });
  });

  // -----------------------------------------------------------
  // Geopolitical stress
  // -----------------------------------------------------------
  describe('Geopolitical Stress Test', () => {
    it('analyses pandemic scenario with position impacts and top losers', () => {
      const pandemicScenario = {
        id: 'pandemic',
        name: 'Global Pandemic',
        description: 'Widespread health crisis',
        marketShock: -0.35,
        volatilityMultiplier: 3.0,
        correlationTarget: 0.90,
        sectorShocks: { 400: -0.50, 100: -0.40, 300: -0.35, 600: 0.15, 800: 0.10 },
      };

      const result = runGeopoliticalStressTest(portfolio, totalCapital, pandemicScenario);

      expect(result.scenario).toBe('Global Pandemic');
      expect(parseFloat(result.totalLoss)).not.toBe(0);
      expect(result.positionImpacts).toHaveLength(portfolio.length);
      expect(result.topLosers).toBeDefined();
      expect(result.topLosers.length).toBeLessThanOrEqual(5);

      const jnjImpact = result.positionImpacts.find((p) => p.ticker === 'JNJ');
      expect(jnjImpact).toBeDefined();
    });
  });

  // -----------------------------------------------------------
  // Liquidity stress
  // -----------------------------------------------------------
  describe('Liquidity Stress Test', () => {
    it('analyses market freeze with liquidation metrics', () => {
      const marketFreezeScenario = {
        id: 'market_freeze',
        name: 'Market Liquidity Freeze',
        description: 'Sudden liquidity crisis',
        volumeReduction: 0.70,
        bidAskSpreadMultiplier: 5.0,
        priceImpact: -0.15,
        recoveryDays: 5,
      };

      const result = runLiquidityStressTest(portfolio, totalCapital, marketFreezeScenario);

      expect(result.scenario).toBe('Market Liquidity Freeze');
      expect(parseFloat(result.totalImpact)).not.toBe(0);
      expect(result.liquidationAnalysis).toHaveLength(portfolio.length);
      expect(result.avgDaysToLiquidate).toBeDefined();
      expect(result.highRiskPositions).toBeDefined();

      const firstPosition = result.liquidationAnalysis[0];
      expect(firstPosition.daysToLiquidate).toBeDefined();
      expect(firstPosition.liquidityRisk).toBeDefined();
    });
  });

  // -----------------------------------------------------------
  // Multi-factor stress
  // -----------------------------------------------------------
  describe('Multi-Factor Stress Test', () => {
    it('runs all 4 categories and produces summary', () => {
      const result = runMultiFactorStressTest(portfolio, totalCapital);

      expect(result.summary).toBeDefined();
      expect(result.summary.totalScenariosAnalyzed).toBeGreaterThan(0);
      expect(result.summary.categoriesAnalyzed).toBe(4);
      expect(result.summary.worstCaseScenario).toBeDefined();

      expect(Array.isArray(result.sectorStressTests)).toBe(true);
      expect(result.sectorStressTests.length).toBeGreaterThan(0);
      expect(Array.isArray(result.currencyStressTests)).toBe(true);
      expect(Array.isArray(result.geopoliticalStressTests)).toBe(true);
      expect(Array.isArray(result.liquidityStressTests)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  // -----------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------
  describe('Edge Cases', () => {
    it('handles a single-position portfolio', () => {
      const smallPortfolio = [{
        ticker: 'AAPL', name: 'Apple Inc.', sector: 800,
        current_weight: 1.0, weight: 1.0, volatility: 25,
        quantity: 100, entry_price: 150, volume: 80000000,
      }];

      const techCrash = {
        id: 'tech_crash',
        name: 'Technology Sector Crash',
        description: 'Major correction in technology stocks',
        sectorId: 800,
        shockMagnitude: -0.30,
        correlationIncrease: 0.25,
      };

      const result = runSectorStressTest(smallPortfolio, 10000, techCrash);

      expect(result.positionImpacts).toHaveLength(1);
      expect(parseFloat(result.portfolioExposure)).toBe(100.0);
    });
  });
});
