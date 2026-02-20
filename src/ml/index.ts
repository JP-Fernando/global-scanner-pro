// =====================================================
// ML MODULE - CENTRAL EXPORTS
// =====================================================

/**
 * Machine Learning Module
 *
 * Provides advanced ML capabilities for quantitative trading:
 * - Factor weighting optimization with Random Forest & Regression
 * - Adaptive score adjustment based on historical performance
 * - Market regime prediction with classification models
 * - AI-powered recommendation engine
 * - Anomaly & pattern detection with unsupervised learning
 */

// Core ML algorithms
export {
  LinearRegression,
  RandomForestRegressor,
  DecisionTree,
  KMeans,
  normalizeArray,
  standardizeArray,
  calculateCorrelation,
  calculateR2,
  calculateMAE,
  calculateRMSE,
  trainTestSplit,
  kFoldSplit
} from './ml-engine.js';

// Factor weighting
export {
  FACTOR_WEIGHTS_CONFIG,
  extractFactorFeatures,
  prepareTrainingData,
  trainFactorWeightingModel,
  optimizeFactorWeights,
  trainAndOptimizeFactorWeights
} from './factor-weighting.js';

// Adaptive scoring
export {
  ADAPTIVE_SCORING_CONFIG,
  PerformanceRecord,
  PerformanceTracker,
  calculateAdaptiveMultiplier,
  calculateSignalDecay,
  adjustScoreAdaptively,
  adjustScoresBatch,
  analyzePerformanceByRegime,
  getStrategyPerformanceReport,
  savePerformanceTracker,
  loadPerformanceTracker
} from './adaptive-scoring.js';

// Regime prediction
export {
  REGIME_PREDICTION_CONFIG,
  RandomForestClassifier,
  extractRegimeFeatures,
  prepareRegimeTrainingData,
  trainRegimeClassifier,
  predictRegime
} from './regime-prediction.js';

// Recommendation engine
export {
  RECOMMENDATION_TYPES,
  RECOMMENDATION_PRIORITY,
  generateRecommendations,
  filterByPriority,
  groupByType,
  analyzeAssetML
} from './recommendation-engine.js';

// Anomaly detection
export {
  ANOMALY_DETECTION_CONFIG,
  calculateZScores,
  detectZScoreAnomalies,
  detectClusterAnomalies,
  detectCorrelationAnomalies,
  detectPriceScoreDivergence,
  detectVolumeAnomalies,
  detectAllAnomalies,
  getAnomalySummary
} from './anomaly-detection.js';

// Default export with all modules
export default {
  mlEngine: () => import('./ml-engine.js'),
  factorWeighting: () => import('./factor-weighting.js'),
  adaptiveScoring: () => import('./adaptive-scoring.js'),
  regimePrediction: () => import('./regime-prediction.js'),
  recommendationEngine: () => import('./recommendation-engine.js'),
  anomalyDetection: () => import('./anomaly-detection.js')
};
