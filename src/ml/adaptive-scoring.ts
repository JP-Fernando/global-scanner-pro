// =====================================================
// ADAPTIVE SCORING SYSTEM
// =====================================================

/**
 * Adaptive Score Adjustment
 *
 * Dynamically adjusts quantitative scores based on:
 * - Historical signal performance (hit rate)
 * - Tracking error analysis
 * - Regime-specific performance
 * - Signal decay by age
 *
 * Methodology:
 * - Analyses performance of each strategy/profile historically
 * - Applies adaptive multipliers based on success rate
 * - Adjusts for current market regime
 * - Penalises obsolete signals
 */

import _i18n from '../i18n/i18n.js';
import { calculateCorrelation } from './ml-engine.js';

// =====================================================
// TYPES
// =====================================================

interface AdaptiveScoringConfig {
  lookback_periods: {
    short: number;
    medium: number;
    long: number;
  };
  hit_rate_thresholds: {
    excellent: number;
    good: number;
    neutral: number;
    poor: number;
  };
  multipliers: {
    excellent: number;
    good: number;
    neutral: number;
    poor: number;
    very_poor: number;
  };
  decay_config: {
    enabled: boolean;
    half_life_days: number;
    min_multiplier: number;
  };
  min_samples_for_adjustment: number;
}

interface RecordFilter {
  strategy?: string;
  regime?: string;
  minTimestamp?: number;
  maxTimestamp?: number;
}

interface HitRateResult {
  hitRate: number;
  sampleSize: number;
  insufficient: boolean;
}

interface ScoreCorrelationResult {
  correlation: number;
  sampleSize?: number;
  insufficient: boolean;
}

interface PerformanceSummary {
  hitRate: number;
  avgReturn: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  sampleSize: number;
}

interface AdaptiveMultiplierResult {
  multiplier: number;
  reason: string;
  hitRate: number | null;
  confidence: string;
  category?: string;
}

interface ScoreAdjustmentResult {
  baseScore: number;
  adjustedScore: number;
  multipliers: {
    performance: number;
    decay: number;
    combined: number;
  };
  metadata: {
    strategy: string;
    regime: string;
    hitRate: number | null;
    confidence: string;
    signalAge: number;
  };
}

interface BatchAsset {
  quant_score: number;
  signal_timestamp?: number;
  [key: string]: unknown;
}

interface AdjustedBatchAsset extends BatchAsset {
  quant_score_original: number;
  adaptive_adjustment: ScoreAdjustmentResult;
}

interface RegimeAnalysisEntry extends PerformanceSummary {
  multiplierRecommendation: string;
}

interface StrategyRecommendation {
  type: string;
  message: string;
}

interface StrategyPerformanceReport {
  strategy: string;
  overall: PerformanceSummary;
  byRegime: Record<string, RegimeAnalysisEntry>;
  scoreCorrelation: ScoreCorrelationResult;
  timestamp: number;
  recommendations: StrategyRecommendation[];
}

interface PerformanceTrackerJSON {
  records: PerformanceRecord[];
  recordCount: number;
}

// =====================================================
// CONFIGURATION
// =====================================================

export const ADAPTIVE_SCORING_CONFIG: AdaptiveScoringConfig = {
  // Historical lookback for performance analysis
  lookback_periods: {
    short: 20,   // 1 month
    medium: 60,  // 3 months
    long: 120    // 6 months
  },

  // Performance thresholds
  hit_rate_thresholds: {
    excellent: 0.70,  // >70% hit rate
    good: 0.60,       // 60-70%
    neutral: 0.50,    // 50-60%
    poor: 0.40        // <40%
  },

  // Score multipliers based on historical performance
  multipliers: {
    excellent: 1.25,
    good: 1.10,
    neutral: 1.00,
    poor: 0.85,
    very_poor: 0.70
  },

  // Signal decay
  decay_config: {
    enabled: true,
    half_life_days: 10,  // Signal loses 50% weight after 10 days
    min_multiplier: 0.5   // Minimum multiplier (50%)
  },

  // Minimum samples for reliable adjustment
  min_samples_for_adjustment: 10
};

// =====================================================
// PERFORMANCE TRACKING
// =====================================================

/**
 * Performance record structure
 */
export class PerformanceRecord {
  assetId: string;
  timestamp: number;
  score: number;
  actualReturn: number;
  regime: string;
  strategy: string;
  hit: boolean;

  constructor(
    assetId: string,
    timestamp: number,
    score: number,
    actualReturn: number,
    regime: string,
    strategy: string
  ) {
    this.assetId = assetId;
    this.timestamp = timestamp;
    this.score = score;
    this.actualReturn = actualReturn;
    this.regime = regime;
    this.strategy = strategy;
    this.hit = actualReturn > 0; // Simple definition: positive return
  }
}

/**
 * Performance tracker
 */
export class PerformanceTracker {
  records: PerformanceRecord[];

  constructor() {
    this.records = [];
  }

  /**
   * Add performance record
   */
  addRecord(record: PerformanceRecord): void {
    this.records.push(record);

    // Keep only recent records (last 6 months)
    const sixMonthsAgo: number = Date.now() - (180 * 24 * 60 * 60 * 1000);
    this.records = this.records.filter((r: PerformanceRecord): boolean => r.timestamp >= sixMonthsAgo);
  }

  /**
   * Get records by filter
   */
  getRecords(filter: RecordFilter = {}): PerformanceRecord[] {
    return this.records.filter((record: PerformanceRecord): boolean => {
      if (filter.strategy && record.strategy !== filter.strategy) return false;
      if (filter.regime && record.regime !== filter.regime) return false;
      if (filter.minTimestamp && record.timestamp < filter.minTimestamp) return false;
      if (filter.maxTimestamp && record.timestamp > filter.maxTimestamp) return false;

      return true;
    });
  }

  /**
   * Calculate hit rate
   */
  calculateHitRate(filter: RecordFilter = {}): HitRateResult {
    const records: PerformanceRecord[] = this.getRecords(filter);

    if (records.length === 0) {
      return { hitRate: 0.5, sampleSize: 0, insufficient: true };
    }

    const hits: number = records.filter((r: PerformanceRecord): boolean => r.hit).length;
    const hitRate: number = hits / records.length;

    return {
      hitRate,
      sampleSize: records.length,
      insufficient: records.length < ADAPTIVE_SCORING_CONFIG.min_samples_for_adjustment
    };
  }

  /**
   * Calculate correlation between scores and returns
   */
  calculateScoreCorrelation(filter: RecordFilter = {}): ScoreCorrelationResult {
    const records: PerformanceRecord[] = this.getRecords(filter);

    if (records.length < 10) {
      return { correlation: 0, insufficient: true };
    }

    const scores: number[] = records.map((r: PerformanceRecord): number => r.score);
    const returns: number[] = records.map((r: PerformanceRecord): number => r.actualReturn);

    const correlation: number = calculateCorrelation(scores, returns);

    return {
      correlation,
      sampleSize: records.length,
      insufficient: records.length < ADAPTIVE_SCORING_CONFIG.min_samples_for_adjustment
    };
  }

  /**
   * Get performance summary
   */
  getSummary(filter: RecordFilter = {}): PerformanceSummary {
    const records: PerformanceRecord[] = this.getRecords(filter);

    if (records.length === 0) {
      return {
        hitRate: 0.5,
        avgReturn: 0,
        winRate: 0.5,
        avgWin: 0,
        avgLoss: 0,
        sampleSize: 0
      };
    }

    const hits: PerformanceRecord[] = records.filter((r: PerformanceRecord): boolean => r.hit);
    const losses: PerformanceRecord[] = records.filter((r: PerformanceRecord): boolean => !r.hit);

    const avgReturn: number = records.reduce((sum: number, r: PerformanceRecord): number => sum + r.actualReturn, 0) / records.length;
    const avgWin: number = hits.length > 0
      ? hits.reduce((sum: number, r: PerformanceRecord): number => sum + r.actualReturn, 0) / hits.length
      : 0;
    const avgLoss: number = losses.length > 0
      ? losses.reduce((sum: number, r: PerformanceRecord): number => sum + r.actualReturn, 0) / losses.length
      : 0;

    return {
      hitRate: hits.length / records.length,
      avgReturn,
      winRate: hits.length / records.length,
      avgWin,
      avgLoss,
      sampleSize: records.length
    };
  }

  /**
   * Export to JSON
   */
  toJSON(): PerformanceTrackerJSON {
    return {
      records: this.records,
      recordCount: this.records.length
    };
  }

  /**
   * Import from JSON
   */
  static fromJSON(data: PerformanceTrackerJSON): PerformanceTracker {
    const tracker: PerformanceTracker = new PerformanceTracker();
    tracker.records = data.records || [];
    return tracker;
  }
}

// =====================================================
// SCORE ADJUSTMENT LOGIC
// =====================================================

/**
 * Calculate adaptive multiplier based on historical performance
 */
export function calculateAdaptiveMultiplier(
  performanceTracker: PerformanceTracker,
  strategy: string,
  regime: string,
  config: AdaptiveScoringConfig = ADAPTIVE_SCORING_CONFIG
): AdaptiveMultiplierResult {
  // Get performance for this strategy/regime combination
  const now: number = Date.now();
  const lookback: number = config.lookback_periods.medium;
  const minTimestamp: number = now - (lookback * 24 * 60 * 60 * 1000);

  const filter: RecordFilter = {
    strategy,
    regime,
    minTimestamp
  };

  const { hitRate, insufficient } = performanceTracker.calculateHitRate(filter);

  // If insufficient data, return neutral multiplier
  if (insufficient) {
    return {
      multiplier: config.multipliers.neutral,
      reason: 'insufficient_data',
      hitRate: null,
      confidence: 'low'
    };
  }

  // Determine multiplier based on hit rate
  let multiplier: number;
  let category: string;

  if (hitRate >= config.hit_rate_thresholds.excellent) {
    multiplier = config.multipliers.excellent;
    category = 'excellent';
  } else if (hitRate >= config.hit_rate_thresholds.good) {
    multiplier = config.multipliers.good;
    category = 'good';
  } else if (hitRate >= config.hit_rate_thresholds.neutral) {
    multiplier = config.multipliers.neutral;
    category = 'neutral';
  } else if (hitRate >= config.hit_rate_thresholds.poor) {
    multiplier = config.multipliers.poor;
    category = 'poor';
  } else {
    multiplier = config.multipliers.very_poor;
    category = 'very_poor';
  }

  return {
    multiplier,
    category,
    hitRate,
    confidence: 'high',
    reason: 'historical_performance'
  };
}

/**
 * Calculate signal decay multiplier based on age
 */
export function calculateSignalDecay(
  signalTimestamp: number,
  currentTimestamp: number,
  config: AdaptiveScoringConfig = ADAPTIVE_SCORING_CONFIG
): number {
  if (!config.decay_config.enabled) {
    return 1.0;
  }

  const ageInMs: number = currentTimestamp - signalTimestamp;
  const ageInDays: number = ageInMs / (24 * 60 * 60 * 1000);

  if (ageInDays <= 0) {
    return 1.0;
  }

  // Exponential decay: multiplier = 0.5^(age / half_life)
  const halfLife: number = config.decay_config.half_life_days;
  const decayMultiplier: number = Math.pow(0.5, ageInDays / halfLife);

  // Apply minimum floor
  return Math.max(decayMultiplier, config.decay_config.min_multiplier);
}

/**
 * Apply adaptive adjustment to a score
 */
export function adjustScoreAdaptively(
  baseScore: number,
  strategy: string,
  regime: string,
  signalTimestamp: number,
  performanceTracker: PerformanceTracker,
  config: AdaptiveScoringConfig = ADAPTIVE_SCORING_CONFIG
): ScoreAdjustmentResult {
  // 1. Calculate performance-based multiplier
  const { multiplier: perfMultiplier, hitRate, confidence } = calculateAdaptiveMultiplier(
    performanceTracker,
    strategy,
    regime,
    config
  );

  // 2. Calculate decay multiplier
  const decayMultiplier: number = calculateSignalDecay(signalTimestamp, Date.now(), config);

  // 3. Combined multiplier
  const combinedMultiplier: number = perfMultiplier * decayMultiplier;

  // 4. Adjusted score
  const adjustedScore: number = baseScore * combinedMultiplier;

  return {
    baseScore,
    adjustedScore,
    multipliers: {
      performance: perfMultiplier,
      decay: decayMultiplier,
      combined: combinedMultiplier
    },
    metadata: {
      strategy,
      regime,
      hitRate,
      confidence,
      signalAge: (Date.now() - signalTimestamp) / (24 * 60 * 60 * 1000)
    }
  };
}

// =====================================================
// BATCH SCORE ADJUSTMENT
// =====================================================

/**
 * Adjust scores for a batch of assets
 */
export function adjustScoresBatch(
  assets: BatchAsset[],
  strategy: string,
  regime: string,
  performanceTracker: PerformanceTracker,
  config: AdaptiveScoringConfig = ADAPTIVE_SCORING_CONFIG
): AdjustedBatchAsset[] {
  return assets.map((asset: BatchAsset): AdjustedBatchAsset => {
    const { quant_score, signal_timestamp } = asset;

    const adjustment: ScoreAdjustmentResult = adjustScoreAdaptively(
      quant_score,
      strategy,
      regime,
      signal_timestamp || Date.now(),
      performanceTracker,
      config
    );

    return {
      ...asset,
      quant_score_original: quant_score,
      quant_score: adjustment.adjustedScore,
      adaptive_adjustment: adjustment
    };
  });
}

// =====================================================
// REGIME-SPECIFIC PERFORMANCE ANALYSIS
// =====================================================

/**
 * Analyze performance by regime
 */
export function analyzePerformanceByRegime(
  performanceTracker: PerformanceTracker,
  strategy: string
): Record<string, RegimeAnalysisEntry> {
  const regimes: string[] = ['risk_on', 'neutral', 'risk_off'];
  const analysis: Record<string, RegimeAnalysisEntry> = {};

  regimes.forEach((regime: string): void => {
    const summary: PerformanceSummary = performanceTracker.getSummary({ strategy, regime });

    analysis[regime] = {
      ...summary,
      multiplierRecommendation: summary.hitRate >= 0.6 ? 'increase' : summary.hitRate < 0.45 ? 'decrease' : 'maintain'
    };
  });

  return analysis;
}

/**
 * Get strategy performance report
 */
export function getStrategyPerformanceReport(
  performanceTracker: PerformanceTracker,
  strategy: string
): StrategyPerformanceReport {
  const overall: PerformanceSummary = performanceTracker.getSummary({ strategy });
  const byRegime: Record<string, RegimeAnalysisEntry> = analyzePerformanceByRegime(performanceTracker, strategy);

  const scoreCorrelation: ScoreCorrelationResult = performanceTracker.calculateScoreCorrelation({ strategy });

  return {
    strategy,
    overall,
    byRegime,
    scoreCorrelation,
    timestamp: Date.now(),
    recommendations: generateRecommendations(overall, byRegime, scoreCorrelation)
  };
}

/**
 * Generate recommendations based on performance
 */
function generateRecommendations(
  overall: PerformanceSummary,
  byRegime: Record<string, RegimeAnalysisEntry>,
  scoreCorrelation: ScoreCorrelationResult
): StrategyRecommendation[] {
  const recommendations: StrategyRecommendation[] = [];

  // Overall performance
  if (overall.hitRate < 0.45) {
    recommendations.push({
      type: 'warning',
      message: `Overall hit rate (${(overall.hitRate * 100).toFixed(1)}%) is below 45%. Consider reviewing strategy parameters.`
    });
  } else if (overall.hitRate > 0.65) {
    recommendations.push({
      type: 'success',
      message: `Excellent overall hit rate (${(overall.hitRate * 100).toFixed(1)}%). Strategy performing well.`
    });
  }

  // Regime-specific
  Object.entries(byRegime).forEach(([regime, stats]: [string, RegimeAnalysisEntry]): void => {
    if (stats.hitRate < 0.40 && stats.sampleSize >= 10) {
      recommendations.push({
        type: 'warning',
        message: `Poor performance in ${regime} regime (${(stats.hitRate * 100).toFixed(1)}%). Consider adjusting strategy for this regime.`
      });
    }
  });

  // Score correlation
  if (!scoreCorrelation.insufficient && Math.abs(scoreCorrelation.correlation) < 0.2) {
    recommendations.push({
      type: 'warning',
      message: `Low correlation (${scoreCorrelation.correlation.toFixed(2)}) between scores and returns. Scores may not be predictive.`
    });
  }

  // Sample size
  if (overall.sampleSize < 20) {
    recommendations.push({
      type: 'info',
      message: `Limited sample size (${overall.sampleSize}). Collect more data for reliable analysis.`
    });
  }

  return recommendations;
}

// =====================================================
// PERSISTENCE (IndexedDB Integration)
// =====================================================

/**
 * Save performance tracker to storage
 */
export async function savePerformanceTracker(
  tracker: PerformanceTracker,
  storeName: string = 'adaptive_scoring'
): Promise<{ success: boolean; error?: string }> {
  try {
    const data: PerformanceTrackerJSON = tracker.toJSON();
    localStorage.setItem(storeName, JSON.stringify(data));
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to save performance tracker:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Load performance tracker from storage
 */
export async function loadPerformanceTracker(
  storeName: string = 'adaptive_scoring'
): Promise<PerformanceTracker> {
  try {
    const data: string | null = localStorage.getItem(storeName);

    if (!data) {
      return new PerformanceTracker();
    }

    return PerformanceTracker.fromJSON(JSON.parse(data));
  } catch (error: unknown) {
    console.error('Failed to load performance tracker:', error);
    return new PerformanceTracker();
  }
}

// =====================================================
// EXPORTS
// =====================================================

export default {
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
};
