import { describe, it, expect, beforeAll } from 'vitest';
import { attributionAnalyzer } from '../../analytics/attribution-analysis.js';
import { exportAttributionToExcel } from '../../reports/excel-exporter.js';
import { generateAttributionReport } from '../../reports/pdf-templates.js';
import { buildAttributionFixtures, setupReportMocks } from '../helpers.js';

beforeAll(() => {
  setupReportMocks();
});

describe('Attribution Analysis', () => {
  const { portfolio, portfolioReturns, benchmarkReturns } = buildAttributionFixtures();

  describe('calculateAttribution', () => {
    it('generates summary, Brinson allocation, asset contributions, and periods', () => {
      const attribution = attributionAnalyzer.calculateAttribution(
        portfolio,
        portfolioReturns,
        benchmarkReturns
      );

      expect(attribution.summary).toBeTruthy();
      expect(Array.isArray(attribution.brinson.allocation_effect.by_sector)).toBe(true);
      expect(attribution.assets.top_contributors.length).toBeGreaterThan(0);
      expect(Array.isArray(attribution.periods.monthly)).toBe(true);
    });
  });

  describe('Report Exports', () => {
    it('exports attribution to Excel and PDF without errors', () => {
      const attributionData = attributionAnalyzer.calculateAttribution(
        portfolio,
        portfolioReturns,
        benchmarkReturns
      );

      attributionData.events = attributionAnalyzer.calculateEventAttribution(
        portfolioReturns,
        benchmarkReturns,
        [{
          name: 'Test Event',
          start_date: '2023-01-01',
          end_date: '2023-01-03',
          description: 'Synthetic event for tests.',
        }]
      );

      // These should not throw
      expect(() => exportAttributionToExcel(portfolio, attributionData)).not.toThrow();
      expect(() => generateAttributionReport(portfolio, attributionData)).not.toThrow();
    });
  });
});
