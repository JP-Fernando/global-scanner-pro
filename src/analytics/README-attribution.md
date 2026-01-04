# Attribution Analysis Module

## Quick Start

```javascript
import { attributionAnalyzer } from './attribution-analysis.js';
import { performanceTracker } from '../portfolio/performance-tracker.js';
import { portfolioManager } from '../portfolio/portfolio-manager.js';

// Load portfolio
const portfolio = await portfolioManager.loadPortfolio(portfolioId);

// Get portfolio returns
const portfolioReturns = await performanceTracker.calculateEquityCurve(portfolio);

// Get benchmark returns
const benchmark = '^GSPC';
const fromDate = portfolioReturns[0].date;
const toDate = portfolioReturns[portfolioReturns.length - 1].date;
const benchmarkPrices = await performanceTracker.loadPriceData(benchmark, fromDate, toDate);
const benchmarkReturns = benchmarkPrices.map(p => ({ date: p.date, value: p.price }));

// Calculate attribution
const attribution = attributionAnalyzer.calculateAttribution(
  portfolio,
  portfolioReturns,
  benchmarkReturns
);

console.log(attribution);
```

## Features

- **Brinson-Fachler Attribution**: Decomposes active return into allocation, selection, and interaction effects
- **Factor Attribution**: Identifies contribution from Trend, Momentum, Risk, and Liquidity factors
- **Asset Contribution**: Shows individual asset impact on portfolio return
- **Period Attribution**: Breaks down performance by month, quarter, and year
- **Event Attribution**: Analyzes performance during specific market events

## API Reference

### `calculateAttribution(portfolio, portfolioReturns, benchmarkReturns, factorScores)`

Main attribution analysis function.

**Parameters:**
- `portfolio` (Object): Portfolio object with positions
- `portfolioReturns` (Array): Historical returns `[{date, value, positions}]`
- `benchmarkReturns` (Array): Benchmark returns `[{date, value}]`
- `factorScores` (Object, optional): Factor scores by ticker

**Returns:** Object with attribution analysis

### `calculateEventAttribution(portfolioReturns, benchmarkReturns, events)`

Analyzes performance during specific market events.

**Parameters:**
- `portfolioReturns` (Array): Portfolio returns
- `benchmarkReturns` (Array): Benchmark returns
- `events` (Array): Event definitions `[{name, start_date, end_date, description}]`

**Returns:** Object with event-based attribution

## Dashboard Integration

```javascript
import { AttributionDashboard } from '../dashboard/attribution-dashboard.js';

const dashboard = new AttributionDashboard('attribution-container');
await dashboard.initialize(portfolio);
```

## Documentation

See [docs/attribution-analysis.md](../../docs/attribution-analysis.md) for complete documentation.
