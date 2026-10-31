/** Sequential markets, concurrent batches, sector/anomaly enrichment and final scan model. */
import { getSectorId, calculateSectorStats } from '../../data/sectors.js';
import { detectAnomalies } from '../../data/anomalies.js';
import { analyzeStock, loadBenchmark } from './scan-analysis.js';

export type ScanMarket = { file: string; suffix: string; name?: string };
export type ScanProgress =
  | { phase: 'market_started'; market: ScanMarket; index: number; totalMarkets: number }
  | { phase: 'loading_benchmark' | 'loading_universe' }
  | { phase: 'analyzing'; current: number; total: number; analyzed: number; filtered: number };

type SectorStats = ReturnType<typeof calculateSectorStats>;
type ScanDependencies = {
  loadBenchmark?: typeof loadBenchmark;
  analyzeStock?: typeof analyzeStock;
  loadUniverse?: (file: string) => Promise<any[]>;
  pause?: (ms: number) => Promise<void>;
  onProgress?: (progress: ScanProgress) => void;
  onPartialResults?: (results: any[], stats: SectorStats) => void;
};

const BATCH_SIZE = 5;

export type ScanRunResult = {
  results: any[];
  sectorStats: SectorStats;
  analyzed: number;
  filtered: number;
  benchmark: Awaited<ReturnType<typeof loadBenchmark>>;
};

export async function runMarketScan(
  markets: ScanMarket[],
  config: any,
  dependencies: ScanDependencies = {}
): Promise<ScanRunResult> {
  const {
    loadBenchmark: readBenchmark = loadBenchmark,
    analyzeStock: analyze = analyzeStock,
    loadUniverse = async (file: string): Promise<any[]> => (await fetch(file)).json(),
    pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)),
    onProgress = () => {},
    onPartialResults = () => {}
  } = dependencies;
  const results: any[] = [];
  let totalAnalyzed = 0;
  let totalFiltered = 0;
  let benchmark: Awaited<ReturnType<typeof loadBenchmark>> = null;

  for (const [index, market] of markets.entries()) {
    onProgress({ phase: 'market_started', market, index, totalMarkets: markets.length });
    onProgress({ phase: 'loading_benchmark' });
    benchmark = await readBenchmark(market.suffix);
    onProgress({ phase: 'loading_universe' });
    const universe = await loadUniverse(market.file);
    let analyzed = 0;
    let filtered = 0;

    for (let i = 0; i < universe.length; i += BATCH_SIZE) {
      const batch = universe.slice(i, i + BATCH_SIZE);
      onProgress({ phase: 'analyzing', current: i + 1, total: universe.length, analyzed, filtered });
      const batchResults = await Promise.all(batch.map(stock =>
        analyze(stock, market.suffix, config, benchmark?.rocs, benchmark?.volatility)));

      batchResults.forEach((result, stockIndex) => {
        if (!result?.passed) {
          filtered++;
          return;
        }
        const stock = batch[stockIndex];
        const sectorRaw = stock.sector || stock.industry || 'Unknown';
        const anomaly = detectAnomalies(result, calculateSectorStats(results));
        results.push({
          ...result,
          vRatio: Number(result.vRatio) || 1.0,
          sectorId: getSectorId(sectorRaw),
          sectorRaw,
          marketSuffix: market.suffix,
          yahooSymbol: stock.ticker.includes('.') ? stock.ticker : `${stock.ticker}${market.suffix || ''}`,
          hasAnomalies: anomaly.hasAnomalies,
          anomalies: anomaly.anomalies,
          anomalyMetrics: anomaly.metrics || {}
        });
        analyzed++;
      });
      if (i % (BATCH_SIZE * 2) === 0) onPartialResults([...results], calculateSectorStats(results));
      await pause(50);
    }
    totalAnalyzed += analyzed;
    totalFiltered += filtered;
  }

  results.sort((a, b) => b.scoreTotal - a.scoreTotal);
  const sectorStats = calculateSectorStats(results);
  const finalResults = results.map(asset => {
    const anomaly = detectAnomalies(asset, sectorStats);
    const penalty = anomaly.hasAnomalies
      ? Math.min(15, Math.round(Number(anomaly.metrics?.volumeZScore || 0) * 3)) : 0;
    return {
      ...asset,
      anomalies: anomaly.anomalies,
      warnings: [...(asset.warnings || []), ...(anomaly.warnings || [])],
      hasAnomalies: anomaly.hasAnomalies,
      anomalyMetrics: anomaly.metrics,
      scoreTotal: anomaly.hasAnomalies ? Math.max(0, asset.scoreTotal - penalty) : asset.scoreTotal,
      anomalyPenalty: penalty
    };
  });
  return { results: finalResults, sectorStats, analyzed: totalAnalyzed, filtered: totalFiltered, benchmark };
}
