export const BENCHMARK_SECTOR_WEIGHTS = {
  '^GSPC': {
    as_of: '2024-12-31',
    weights: {
      100: 0.035,  // Energy
      200: 0.022,  // Materials
      300: 0.086,  // Industrials
      400: 0.109,  // Consumer Discretionary
      500: 0.058,  // Consumer Staples
      600: 0.122,  // Health Care
      700: 0.133,  // Financials
      800: 0.289,  // Information Technology
      900: 0.088,  // Communication Services
      1000: 0.026, // Utilities
      1100: 0.032, // Real Estate
      999: 0.000   // Unknown
    }
  },
  '^NDX': {
    as_of: '2024-12-31',
    weights: {
      100: 0.004,  // Energy
      200: 0.002,  // Materials
      300: 0.045,  // Industrials
      400: 0.138,  // Consumer Discretionary
      500: 0.033,  // Consumer Staples
      600: 0.067,  // Health Care
      700: 0.062,  // Financials
      800: 0.536,  // Information Technology
      900: 0.095,  // Communication Services
      1000: 0.006, // Utilities
      1100: 0.012, // Real Estate
      999: 0.000   // Unknown
    }
  }
};

export const getBenchmarkSectorWeights = (
  benchmark: string
): Record<number, number> | null => {
  const data = BENCHMARK_SECTOR_WEIGHTS as Record<string, { weights: Record<number, number> }>;
  return data[benchmark]?.weights || null;
};