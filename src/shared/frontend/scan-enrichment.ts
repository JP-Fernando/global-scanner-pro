/** Optional post-scan enrichment, independent of frontend state and rendering. */
import * as regime from '../../analytics/market_regime.js';
import { PerformanceTracker, loadPerformanceTracker, adjustScoresBatch } from '../../ml/adaptive-scoring.js';
import { extractRegimeFeatures } from '../../ml/regime-prediction.js';
import { detectAllAnomalies as detectMLAnomalies, getAnomalySummary }
  from '../../ml/anomaly-detection.js';
import { generateRecommendations } from '../../ml/recommendation-engine.js';
import { fetchPriceHistory } from './market-data-client.js';
import type { PriceBar } from './market-data-client.js';

export type ScanEnrichmentStage = 'initializing_tracker' | 'detecting_regime' |
  'predicting_regime' | 'adaptive_scoring' | 'detecting_anomalies' | 'recommendations';

export type ScanEnrichmentState = {
  currentResults: any[];
  benchmarkData: any;
  strategyKey: string;
  mlEnabled: boolean;
  performanceTracker: PerformanceTracker | null;
  currentRegime: any;
  mlRegimePrediction: any;
  mlAnomalies: any[];
  mlRecommendations: any[];
};

type EnrichmentDependencies = {
  loadYahooData?: (ticker: string, suffix: string) => Promise<PriceBar[] | null>;
  onStage?: (stage: ScanEnrichmentStage) => void;
  onRegime?: (value: any) => void;
  onAdjustedResults?: (results: any[]) => void;
};

export async function enrichScanResults(
  state: ScanEnrichmentState,
  { loadYahooData = fetchPriceHistory, onStage = () => {}, onRegime = () => {},
    onAdjustedResults = () => {} }: EnrichmentDependencies = {}
) {
  let { currentResults, performanceTracker, currentRegime, mlRegimePrediction,
    mlAnomalies, mlRecommendations } = state;
  const { benchmarkData, strategyKey, mlEnabled } = state;
  const stateUpdates: Record<string, any> = {};
  // 1. Initialize Performance Tracker (if not already loaded)
  if (!performanceTracker && mlEnabled) {
    try {
      onStage('initializing_tracker');
      performanceTracker = await loadPerformanceTracker();
      console.log('✅ ML Performance Tracker loaded');
    } catch (e) {
      console.warn('Performance Tracker initialization failed, creating new:', (e as Error).message);
      performanceTracker = new PerformanceTracker();
    }
  }

  // 2. Detección de régimen (rule-based + ML)
  if (benchmarkData && benchmarkData.symbol) {
    try {
      onStage('detecting_regime');
      const benchmarkFullData = await loadYahooData(benchmarkData.symbol, '');
      if (!benchmarkFullData || benchmarkFullData.length === 0) {
        console.warn('No se pudieron cargar datos completos del benchmark para régimen');
      } else {
        const benchmarkPrices = benchmarkFullData.map((d: any) => ({ date: d.date, close: d.close }));
        if (benchmarkPrices.length >= 200) {
          // Rule-based regime detection
          currentRegime = regime.detectMarketRegime(benchmarkPrices as any, currentResults);
          stateUpdates.regime = currentRegime;

          // ML-based regime prediction (enhanced)
          if (mlEnabled) {
            try {
              onStage('predicting_regime');
              const regimeFeatures = extractRegimeFeatures(benchmarkPrices as any);

              // Note: This requires a trained model. For now, we'll use rule-based
              // In production, you would load a trained model and use predictRegimeML()
              mlRegimePrediction = {
                regime: currentRegime.regime,
                confidence: 0.75,
                method: 'rule-based',
                features: regimeFeatures,
                timestamp: Date.now()
              };

              console.log('🤖 ML Regime Prediction:', mlRegimePrediction);
            } catch (e) {
              console.warn('ML Regime prediction failed:', (e as Error).message);
            }
          }

          onRegime(currentRegime);
          console.log('📊 Régimen detectado:', currentRegime);
        }
      }
    } catch (e) {
      console.error('Regime detection error:', e);
    }
  }

  // 3. ML Adaptive Score Adjustment
  if (mlEnabled && performanceTracker && currentRegime) {
    try {
      onStage('adaptive_scoring');

      // Adjust scores based on historical performance
      currentResults = adjustScoresBatch(
        currentResults,
        strategyKey,
        currentRegime.regime,
        performanceTracker
      );

      // Let the caller persist adjusted results at the existing pipeline checkpoint
      onAdjustedResults(currentResults);

      console.log('✅ ML Adaptive scoring applied to', currentResults.length, 'assets');
    } catch (e) {
      console.warn('ML Adaptive scoring failed:', (e as Error).message);
    }
  }

  // 4. ML Anomaly Detection
  if (mlEnabled && currentResults.length > 0) {
    try {
      onStage('detecting_anomalies');

      mlAnomalies = detectMLAnomalies(currentResults, null);
      const anomalySummary = getAnomalySummary(mlAnomalies);

      console.log('🔍 ML Anomalies detected:', anomalySummary);

      // Return updates separately so each frontend can apply its own state
      stateUpdates.mlAnomalies = mlAnomalies;
      stateUpdates.mlAnomalySummary = anomalySummary;
    } catch (e) {
      console.warn('ML Anomaly detection failed:', (e as Error).message);
    }
  }

  // 5. ML Recommendations Generation
  if (mlEnabled && currentResults.length > 0) {
    try {
      onStage('recommendations');

      // Create portfolio-like structure for recommendations
      const mockPortfolio = {
        positions: {},
        sector_exposure: {}
      };

      const marketData = {
        volatility: benchmarkData?.volatility || 20,
        regime_prediction: mlRegimePrediction || { regime: currentRegime?.regime || 'neutral' },

        assets: currentResults.slice(0, 20), // Top 20 for recommendations
        anomalies: mlAnomalies
      };

      mlRecommendations = generateRecommendations(mockPortfolio, marketData, {});

      console.log('💡 ML Recommendations generated:', mlRecommendations.length);
      stateUpdates.mlRecommendations = mlRecommendations;
    } catch (e) {
      console.warn('ML Recommendations generation failed:', (e as Error).message);
    }
  }
  return { currentResults, performanceTracker, currentRegime, mlRegimePrediction,
    mlAnomalies, mlRecommendations, stateUpdates };
}
