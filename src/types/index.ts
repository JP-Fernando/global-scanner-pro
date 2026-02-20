/**
 * Global Quant Scanner Pro — Type Definitions
 *
 * Central type definitions for the entire application.
 * @module types
 */

// ============================================================
// Market Data
// ============================================================

/** OHLCV candle data point */
export interface Candle {
  o?: number;
  h: number;
  l: number;
  c: number;
  v?: number;
}

/** Price data point with date */
export interface PricePoint {
  date: string;
  price: number;
}

/** Historical price data from Yahoo Finance */
export interface YahooChartResult {
  chart: {
    result: Array<{
      meta: Record<string, unknown>;
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
        adjclose?: Array<{ adjclose: number[] }>;
      };
    }>;
    error: unknown;
  };
}

// ============================================================
// Scoring & Indicators
// ============================================================

/** Bollinger Bands result */
export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number;
}

/** Hard filter result */
export interface HardFilterResult {
  pass: boolean;
  reason?: string;
  warnings?: string[];
}

/** Signal information from scoring */
export interface Signal {
  signal: string;
  confidence: number;
  description?: string;
}

/** Scored asset with all computed metrics */
export interface ScoredAsset {
  ticker: string;
  name: string;
  sector?: string;
  sectorId?: number;
  quant_score: number;
  trend_score: number;
  momentum_score: number;
  risk_score: number;
  liquidity_score: number;
  final_score: number;
  signal?: string;
  signal_confidence?: number;
  roc_6m?: number;
  roc_12m?: number;
  rsi?: number;
  atr_pct?: number;
  volatility?: number;
  volume?: number;
  volume_ratio?: number;
  max_drawdown?: number;
  ema_20?: number;
  ema_50?: number;
  ema_200?: number;
  price?: number;
  adx?: number;
  williams_r?: number;
  bollinger_pctb?: number;
  consistency?: number;
  data_quality?: string;
  warnings?: string[];
  [key: string]: unknown;
}

// ============================================================
// Portfolio
// ============================================================

/** Position in a portfolio */
export interface Position {
  ticker: string;
  name?: string;
  quantity: number;
  entry_price: number;
  current_price?: number;
  weight?: number;
  target_weight?: number;
  sector?: string;
  sectorId?: number;
}

/** Portfolio definition */
export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  last_updated: string;
  positions: Position[];
  benchmark?: string;
  strategy?: string;
  allocation_method?: AllocationMethod;
  initial_capital?: number;
  current_value?: number;
  total_return?: number;
  total_return_pct?: number;
  status?: 'active' | 'archived';
  last_rebalance?: string;
  rebalanceHistory?: RebalanceEvent[];
}

/** Portfolio snapshot at a point in time */
export interface PortfolioSnapshot {
  portfolio_id: string;
  date: string;
  positions: Position[];
  total_value: number;
  daily_return?: number;
  cumulative_return?: number;
  benchmark_value?: number;
  benchmark_return?: number;
}

/** Equity curve data point */
export interface EquityPoint {
  date: string;
  value: number;
  return_pct?: number;
  daily_return_pct?: number;
}

/** Drawdown data point */
export interface DrawdownPoint {
  date: string;
  value: number;
  peak: number;
  drawdown_pct: number;
}

/** Rebalance event */
export interface RebalanceEvent {
  id: string;
  portfolio_id: string;
  timestamp: string;
  reason: string;
  before_positions: Position[];
  after_positions: Position[];
  changes: RebalanceChange[];
  total_value?: number;
}

/** Individual rebalance change */
export interface RebalanceChange {
  ticker: string;
  name?: string;
  before_weight: number;
  after_weight: number;
  diff: number;
  action: 'buy' | 'sell' | 'hold';
}

// ============================================================
// Allocation
// ============================================================

/** Allocation method names */
export type AllocationMethod =
  | 'equal_weight'
  | 'score_weighted'
  | 'erc'
  | 'volatility_target'
  | 'hybrid';

/** Allocated asset with weight */
export interface AllocatedAsset {
  ticker: string;
  name: string;
  weight: number;
  weight_pct: number;
  score: number;
  volatility: number;
  recommended_capital?: number;
}

/** Allocation configuration */
export interface AllocationConfig {
  max_position_weight?: number;
  min_position_weight?: number;
  target_volatility?: number;
  max_assets_in_portfolio?: number;
  min_assets_in_portfolio?: number;
}

/** Portfolio risk metrics */
export interface PortfolioRisk {
  portfolioVolatility: number;
  diversificationRatio: number;
  effectiveNAssets: number;
  concentration: number;
  estimatedMaxDD: number;
  marginalRisk: Array<{ ticker: string; marginalRisk: number }>;
}

/** Allocation result */
export interface AllocationResult {
  allocation: AllocatedAsset[];
  portfolioRisk: PortfolioRisk;
  method: AllocationMethod;
  nAssets: number;
  timestamp: string;
}

// ============================================================
// Risk Engine
// ============================================================

/** Value at Risk result */
export interface VaRResult {
  var95: number;
  var99?: number;
  method: string;
}

/** Correlation matrix result */
export interface CorrelationMatrixResult {
  matrix: number[][];
  tickers: string[];
  avgCorrelation: number;
}

/** Stress test scenario */
export interface StressScenario {
  name: string;
  description?: string;
  shocks: Record<string, number>;
}

/** Stress test result */
export interface StressTestResult {
  scenario: string;
  portfolioReturn: number;
  worstAsset: { ticker: string; return: number };
  bestAsset: { ticker: string; return: number };
}

/** Risk report */
export interface RiskReport {
  timestamp: string;
  var95: number;
  cvar95: number;
  diversifiedVaR: number;
  undiversifiedVaR: number;
  portfolio_volatility: number;
  diversification_ratio: number;
  concentration: number;
  correlationMatrix: CorrelationMatrixResult;
  stressTests: StressTestResult[];
  riskiestAsset?: { ticker: string; name: string; volatility: number; weight: number };
  concentrationRisk: string;
  diversificationScore: number;
}

// ============================================================
// ML Engine
// ============================================================

/** Train/test split result */
export interface TrainTestSplitResult {
  X_train: number[][];
  X_test: number[][];
  y_train: number[];
  y_test: number[];
}

/** K-fold split result */
export interface KFoldSplit {
  trainIndices: number[];
  testIndices: number[];
}

/** ML model training result */
export interface ModelTrainingResult {
  success: boolean;
  model?: unknown;
  modelType?: string;
  metrics?: {
    train: { r2: number; mae: number; rmse: number };
    test: { r2: number; mae: number; rmse: number };
  };
  cvScores?: number[];
  featureImportance?: number[];
  featureNames?: string[];
  trainingSize?: number;
  testSize?: number;
  error?: string;
}

/** Factor weights */
export interface FactorWeights {
  momentum: number;
  value: number;
  volatility: number;
  volume: number;
  quality: number;
}

/** Regime prediction result */
export interface RegimePrediction {
  regime: string;
  confidence: number;
  probabilities: { risk_off: number; neutral: number; risk_on: number };
  features?: Record<string, number>;
  timestamp: string;
  error?: string;
}

/** Anomaly detection result */
export interface AnomalyResult {
  type: string;
  subtype?: string;
  ticker?: string;
  name?: string;
  ticker1?: string;
  name1?: string;
  ticker2?: string;
  name2?: string;
  value?: number;
  zScore?: number;
  correlation?: number;
  quant_score?: number;
  price_change_60d?: number;
  divergence?: number;
  severity: 'extreme' | 'high' | 'moderate' | 'low';
  direction?: 'above' | 'below';
  message: string;
  timestamp: string;
  feature?: string;
  volume?: number;
}

/** Anomaly summary */
export interface AnomalySummary {
  total: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  top_anomalies: AnomalyResult[];
}

/** Adaptive scoring configuration */
export interface AdaptiveScoringConfig {
  lookback_periods: { short: number; medium: number; long: number };
  hit_rate_thresholds: {
    excellent: number; good: number; neutral: number; poor: number;
  };
  multipliers: {
    excellent: number; good: number; neutral: number;
    poor: number; very_poor: number;
  };
  decay_config: { enabled: boolean; half_life_days: number; min_multiplier: number };
  min_samples_for_adjustment: number;
}

/** Adaptive multiplier result */
export interface AdaptiveMultiplierResult {
  multiplier: number;
  category: string;
  hitRate: number;
  confidence: string;
  reason: string;
}

/** Recommendation types */
export type RecommendationType =
  | 'REBALANCE'
  | 'BUY_OPPORTUNITY'
  | 'SELL_ALERT'
  | 'RISK_WARNING'
  | 'DIVERSIFICATION'
  | 'MOMENTUM_SHIFT'
  | 'REGIME_CHANGE';

/** Recommendation priority */
export interface RecommendationPriority {
  level: number;
  label: string;
  color: string;
}

/** Recommendation item */
export interface Recommendation {
  type: RecommendationType;
  priority: RecommendationPriority;
  ticker?: string;
  name?: string;
  title: string;
  message: string;
  action: string;
  confidence: number;
  timestamp: string;
  [key: string]: unknown;
}

/** ML asset analysis result */
export interface AssetMLAnalysis {
  regimeImpact: unknown;
  momentumShift: {
    shift: string; strength: number; acceleration: number; percentile: number;
  };
  mlSignal: { signal: string; confidence: number; mlScore: number };
  riskScore: {
    riskLevel: string; riskScore: number;
    relativeRiskPercentile: number;
    volatility: number; maxDrawdown: number;
  };
}

// ============================================================
// Analytics
// ============================================================

/** Backtesting result */
export interface BacktestResult {
  strategy: string;
  totalReturn: number;
  cagr: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  volatility: number;
  winRate: number;
  profitFactor: number;
  alpha: number;
  beta: number;
  informationRatio?: number;
  trackingError?: number;
  equityCurve: number[];
  trades?: number;
  [key: string]: unknown;
}

/** Walk-forward test result */
export interface WalkForwardResult {
  startIndex: number;
  inSampleResult: BacktestResult;
  outSampleResult: BacktestResult;
}

/** Market regime information */
export interface MarketRegime {
  regime: 'risk_on' | 'neutral' | 'risk_off';
  confidence: number;
  reason: string;
}

/** Regime type definition */
export interface RegimeType {
  name: string;
  emoji: string;
  color: string;
  strategy_adjustment: Record<string, number>;
}

/** Governance compliance result */
export interface ComplianceResult {
  compliant: boolean;
  violations: ComplianceViolation[];
  warnings: string[];
}

/** Compliance violation */
export interface ComplianceViolation {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  details?: Record<string, unknown>;
}

/** Investment rules */
export interface InvestmentRules {
  max_position_weight: number;
  min_position_weight: number;
  max_sector_weight: number;
  max_country_weight: number;
  max_top3_concentration: number;
  min_daily_volume: number;
  min_market_cap: number | null;
  max_pairwise_correlation: number;
  max_portfolio_volatility: number;
  max_portfolio_drawdown: number;
  rebalance_threshold: number;
  exclusions: Record<string, boolean>;
}

/** Governance report */
export interface GovernanceReport {
  timestamp: string;
  strategy: { name: string; profile: string; objective: string };
  compliance: ComplianceResult;
  portfolio_summary: {
    n_assets: number;
    total_weight: number;
    max_position: number;
    min_position: number;
    top3_concentration: number;
  };
  rules_applied: Record<string, number | string>;
}

// ============================================================
// Alerts
// ============================================================

/** Alert settings */
export interface AlertSettings {
  strategy: string;
  user_id: string;
  thresholds: {
    volatility_pct: number;
    drawdown_pct: number;
    score: number;
  };
  channels: AlertChannel[];
  notifications: {
    strongSignals: boolean;
    rebalances: boolean;
    riskEvents: boolean;
  };
  throttle_minutes: number;
}

/** Alert channel configuration */
export interface AlertChannel {
  type: 'email' | 'webhook' | 'slack' | 'teams' | 'zapier';
  url: string;
  enabled: boolean;
}

/** Alert input for creation */
export interface AlertInput {
  type: string;
  title: string;
  message: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  strategy?: string;
  user_id?: string;
  ticker?: string;
  data?: Record<string, unknown>;
}

/** Alert record */
export interface AlertRecord {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  strategy: string;
  user_id: string;
  ticker?: string;
  data?: Record<string, unknown>;
  delivery_status: string;
  delivery_details: DeliveryDetail[];
  created_at: string;
}

/** Alert delivery detail */
export interface DeliveryDetail {
  channel: string;
  url: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

// ============================================================
// Reports
// ============================================================

/** Report data for generators */
export interface ReportData {
  title?: string;
  timestamp?: string;
  results?: ScoredAsset[];
  portfolio?: Portfolio;
  performance?: PerformanceMetrics;
  risk?: RiskReport;
  backtest?: BacktestResult | BacktestResult[];
  attribution?: AttributionData;
  [key: string]: unknown;
}

/** Performance metrics */
export interface PerformanceMetrics {
  total_return_pct: number;
  annualized_return_pct: number;
  annualized_volatility_pct: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
  max_drawdown: number;
  num_periods: number;
}

/** Attribution analysis data */
export interface AttributionData {
  allocation_effect: Record<string, number>;
  selection_effect: Record<string, number>;
  interaction_effect: Record<string, number>;
  total_effect: Record<string, number>;
  [key: string]: unknown;
}

// ============================================================
// Configuration
// ============================================================

/** Application configuration */
export interface AppConfig {
  server: {
    port: number;
    env: string;
  };
  security: {
    allowedOrigins: string[];
    rateLimitWindowMs: number;
    rateLimitMax: number;
    yahooRateLimitWindowMs: number;
    yahooRateLimitMax: number;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
  webhooks: {
    slack: string;
    teams: string;
    discord: string;
  };
  sentry: {
    dsn: string;
    environment: string;
  };
  features: {
    ml: boolean;
    alerts: boolean;
    portfolioOptimizer: boolean;
    stressTesting: boolean;
    attribution: boolean;
  };
  logging: {
    level: string;
    format: string;
  };
  performance: {
    cacheTtl: number;
    maxConcurrency: number;
    requestTimeout: number;
  };
  development: {
    debug: boolean;
  };
}

// ============================================================
// Storage (IndexedDB)
// ============================================================

/** IndexedDB store interface */
export interface IDBStore {
  init(): Promise<void>;
  savePortfolio(portfolio: Portfolio): Promise<void>;
  getPortfolio(id: string): Promise<Portfolio | undefined>;
  getAllPortfolios(): Promise<Portfolio[]>;
  deletePortfolio(id: string): Promise<void>;
  saveSnapshot(snapshot: PortfolioSnapshot): Promise<void>;
  getSnapshots(
    portfolioId: string, fromDate?: string, toDate?: string
  ): Promise<PortfolioSnapshot[]>;
  saveRebalance(rebalance: RebalanceEvent): Promise<void>;
  getRebalanceHistory(portfolioId: string): Promise<RebalanceEvent[]>;
  savePriceCache(
    ticker: string, date: string, data: unknown
  ): Promise<void>;
  getPriceCache(
    ticker: string, fromDate?: string, toDate?: string
  ): Promise<unknown[]>;
  saveAlert(alert: AlertRecord): Promise<void>;
  getAlerts(filter?: Record<string, unknown>): Promise<AlertRecord[]>;
  clearAlerts(strategy?: string): Promise<void>;
  saveAlertSettings(settings: AlertSettings): Promise<void>;
  getAlertSettings(
    strategy: string, userId?: string
  ): Promise<AlertSettings | undefined>;
  clearAll(): Promise<void>;
}

// ============================================================
// Middleware / Express
// ============================================================

import type { Request, Response, NextFunction } from 'express';

/** Express request with custom fields */
export interface AppRequest extends Request {
  id?: string;
  startTime?: number;
}

/** Express error response body */
export interface ErrorResponse {
  status: string;
  statusCode: number;
  message: string;
  code?: string;
  errors?: Array<{ field: string; message: string; code?: string }>;
  requestId?: string;
  timestamp?: string;
  stack?: string;
}

/** Validation source */
export type ValidationSource = 'query' | 'body' | 'params';

export type { Request, Response, NextFunction };

// ============================================================
// Sector Data
// ============================================================

/** Sector taxonomy entry */
export interface SectorEntry {
  name: string;
  aliases: string[];
  industries: string[];
}

/** Sector taxonomy map */
export type SectorTaxonomy = Record<number, SectorEntry>;

/** Sector statistics */
export interface SectorStats {
  count: number;
  avgVolume: number;
  avgRsi: number;
  avgScore: number;
  totalWeight: number;
}

// ============================================================
// I18n
// ============================================================

/** Translation dictionary */
export type TranslationDictionary = Record<string, string | Record<string, string>>;

/** Supported languages */
export type Language = 'en' | 'es';

// ============================================================
// Performance Testing
// ============================================================

/** Performance budget thresholds */
export interface PerformanceBudgets {
  api: {
    health: { p97_5: number; rps: number };
    yahoo: { p97_5: number };
  };
  computation: Record<string, number>;
  frontend: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    fcp: number;
    tti: number;
  };
}
