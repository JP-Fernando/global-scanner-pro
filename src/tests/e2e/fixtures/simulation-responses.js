/** Deterministic response for UI tests; the numerical engine has its own tests. */
export function buildSimulationResponse(request) {
  const totalMonthlyInvestment = Object.values(request.tickerInvestments)
    .reduce((sum, amount) => sum + amount, 0);
  const totalInvested = totalMonthlyInvestment * request.horizonMonths;
  const scenariosFor = invested => ({
    expected: { finalValue: invested * 1.1, totalReturn: 0.1 },
    optimistic: { finalValue: invested * 1.2, totalReturn: 0.2 },
    pessimistic: { finalValue: invested * 0.9, totalReturn: -0.1 },
  });
  const scenarios = scenariosFor(totalInvested);
  return {
    currency: 'USD', totalInvested, totalMonthlyInvestment,
    horizonMonths: request.horizonMonths, scenarios,
    perTicker: request.tickers.map(ticker => {
      const monthlyAmount = request.tickerInvestments[ticker];
      const tickerTotalInvested = monthlyAmount * request.horizonMonths;
      return { ticker, monthlyAmount, tickerTotalInvested,
        scenarios: scenariosFor(tickerTotalInvested),
        historicalMonthlyReturn: 0.01, historicalMonthlyVolatility: 0.05, dataYears: 4 };
    }),
    monthlyProjection: [{ month: request.horizonMonths,
      expected: scenarios.expected.finalValue, optimistic: scenarios.optimistic.finalValue,
      pessimistic: scenarios.pessimistic.finalValue }],
  };
}
