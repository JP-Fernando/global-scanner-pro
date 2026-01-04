// =====================================================
// BRITISH ENGLISH TRANSLATIONS
// =====================================================

export default {
  // Language name
  language: {
    name: 'English (UK)',
    code: 'en'
  },

  // App info
  app: {
    title: 'Global Quant Scanner Pro',
    subtitle: 'Advanced quantitative system with multi-factor analysis and benchmarking'
  },

  // Markets
  markets: {
    label: '📍 Market',
    regions: {
      europe: '🇪🇺 Europe',
      americas: '🌎 Americas',
      asia: '🌏 Asia'
    },
    spain: 'Spain (BME)',
    usa: 'United States (NYSE/NASDAQ)',
    france: 'France (Euronext Paris)',
    germany: 'Germany (XETRA)',
    uk: 'United Kingdom (LSE)',
    italy: 'Italy (Borsa Italiana)',
    netherlands: 'Netherlands (Euronext Amsterdam)',
    belgium: 'Belgium (Euronext Brussels)',
    portugal: 'Portugal (Euronext Lisbon)',
    switzerland: 'Switzerland (SIX)',
    brazil: 'Brazil (B3)',
    mexico: 'Mexico (BMV)',
    canada: 'Canada (TSX)',
    japan: 'Japan (TSE)',
    hongkong: 'Hong Kong (HKEX)',
    china_shanghai: 'China (SSE)',
    china_shenzhen: 'China (SZSE)',
    southkorea: 'South Korea (KRX)'
  },

  // Strategy profiles
  strategies: {
    label: '🎯 Strategy',
    balanced: 'Balanced',
    balanced_desc: 'Balance between growth and stability',
    momentum_aggressive: 'Aggressive Momentum',
    momentum_aggressive_desc: 'Favours assets with strong recent momentum',
    trend_conservative: 'Conservative Trend-Following',
    trend_conservative_desc: 'Prioritises stable trends and low volatility',
    sector_rotation: 'Sector Rotation',
    sector_rotation_desc: 'Optimised for rotation between sectors'
  },

  // Allocation methods
  allocation: {
    label: '💼 Allocation Method',
    equal_weight: 'Equal Weight',
    equal_weight_desc: 'Equal weight for all selected assets',
    score_weighted: 'Score-Weighted',
    score_weighted_desc: 'Weight proportional to Quant Score of each asset',
    erc: 'Equal Risk Contribution (ERC)',
    erc_desc: 'Each asset contributes equally to total risk',
    volatility_target: 'Volatility Targeting',
    volatility_target_desc: 'Adjusts weights to reach target volatility',
    hybrid: 'Hybrid (ERC + Score)',
    hybrid_desc: 'Combines risk diversification with signal quality'
  },

  // Risk profiles
  risk: {
    label: '⚖️ Risk Profile',
    conservative: 'Conservative',
    conservative_desc: 'Minimises risk, strict limits',
    moderate: 'Moderate',
    moderate_desc: 'Risk-return balance',
    aggressive: 'Aggressive',
    aggressive_desc: 'Tolerates higher risk for greater potential return'
  },

  // Buttons
  buttons: {
    runScan: '🚀 Run Analysis',
    buildPortfolio: '📊 Build Portfolio',
    runBacktest: '⏮️ Run Backtesting',
    exportCSV: '📥 Export CSV',
    close: 'Close',
    expand: 'Expand',
    collapse: 'Collapse'
  },

  // Status messages
  status: {
    yahoo_load_failed: 'Error loading {{symbol}}:',
    analyze_stock_failed: 'Error analysing {{ticker}} - {{name}}:',
    initializing: '⏳ Initialising scan...',
    loading_universe: '📦 Loading asset universe...',
    loading_benchmark: '📊 Loading market benchmark...',
    analyzing: '🔍 Analysing {current} of {total} assets...',
    filtering: '🧪 Applying filters...',
    calculating: '🧮 Calculating scores...',
    complete: '✅ Analysis completed in {time}s',
    error: '❌ Error: {message}',
    loading_backtest: '📦 Loading universe for backtesting...',
    running_backtest: '⏳ Running historical simulation...',
    backtest_complete: '✅ Backtesting completed: {samples} rebalances',
    building_portfolio: '📊 Building portfolio...',
    portfolio_complete: '✅ Portfolio built with {assets} assets',
    scanning: '⏳ Scanning...',
    scan_complete: '✅ Scan completed. {count} assets found.',
    detecting_regime: '🔍 Detecting market regime...',
    preparing_backtest: '⏳ Preparing backtest...',
    backtest_strategy: '🧪 Backtest {strategy}...',
    backtest_completed: '✅ Backtest completed',
    downloading_historical: '🔎 Downloading historical {current}–{end} of {total}'
  },

  // Filters
  filters: {
    info: '✅ {approved} approved | ❌ {filtered} filtered',
    total_analyzed: 'Total analysed: {count}',
    by_reason: 'Filtered by reason',
    insufficient_history: 'Insufficient history',
    low_volume: 'Low volume',
    high_volatility: 'High volatility',
    deep_drawdown: 'Deep drawdown'
  },

  // Views
  views: {
    label: '📈 View',
    overall: 'Overall',
    short_term: 'Short Term (6M)',
    medium_term: 'Medium Term (18M)',
    long_term: 'Long Term (4Y)'
  },

  // Table headers
  table: {
    rank: '#',
    ticker: 'Ticker',
    name: 'Name',
    sector: 'Sector',
    score: 'Score',
    signal: 'Signal',
    trend: 'Trend',
    momentum: 'Momentum',
    composite_score: 'Composite Score',
    risk: 'Risk',
    liquidity: 'Liquidity',
    price: 'Price',
    change: 'Change %',
    volume: 'Volume',
    marketCap: 'Market Cap',
    actions: 'Actions'
  },

  // Signals
  signals: {
    strong_buy: 'STRONG BUY',
    buy: 'BUY',
    hold_upper: 'HOLD+',
    hold: 'HOLD',
    sell: 'SELL'
  },

  // Sectors
  sectors: {
    summary: 'Sector Summary',
    energy: 'Energy',
    materials: 'Materials',
    industrials: 'Industrials',
    consumer_discretionary: 'Consumer Discretionary',
    consumer_staples: 'Consumer Staples',
    healthcare: 'Healthcare',
    financials: 'Financials',
    technology: 'Technology',
    communication: 'Communication Services',
    utilities: 'Utilities',
    real_estate: 'Real Estate'
  },

  // Portfolio
  portfolio: {
    title: 'Portfolio Built',
    summary: 'Portfolio Summary',
    method: 'Method',
    total_assets: 'Total Assets',
    date: 'Date',
    allocation_table: 'Capital Allocation',
    weight: 'Weight',
    recommended_capital: 'Recommended Capital',
    portfolio_risk: 'Portfolio Risk',
    volatility: 'Volatility',
    diversification_ratio: 'Diversification Ratio',
    effective_assets: 'Effective Number of Assets',
    concentration: 'Concentration',
    estimated_max_dd: 'Estimated Max DD',
    marginal_risk: 'Marginal Risk by Asset'
  },

  // Backtesting
  backtest: {
    title: 'Backtesting Results',
    strategy: 'Strategy',
    period: 'Period',
    difference: 'Difference',
    rebalances: 'Rebalances',
    initial_capital: 'Initial Capital',
    final_capital: 'Final Capital',
    performance: 'Performance',
    cagr: 'CAGR',
    volatility: 'Volatility',
    sharpe: 'Sharpe Ratio',
    calmar: 'Calmar Ratio',
    risk: 'Risk',
    max_drawdown: 'Max Drawdown',
    avg_recovery_days: 'Average Recovery Days',
    num_drawdowns: 'Number of Drawdowns',
    longest_drawdown: 'Longest Drawdown',
    trading: 'Trading',
    win_rate: 'Win Rate',
    profit_factor: 'Profit Factor',
    avg_win: 'Average Win',
    avg_loss: 'Average Loss',
    avg_turnover: 'Average Turnover',
    total_costs: 'Total Costs',
    tax_drag: 'Estimated Tax Drag',
    benchmark: 'vs Benchmark',
    alpha: 'Alpha',
    beta: 'Beta',
    info_ratio: 'Information Ratio',
    tracking_error: 'Tracking Error',
    equity_curve: 'Equity Curve',
    period_label: 'Period',
    portfolio_value: 'Portfolio Value',
    benchmark_value: 'Benchmark Value'
  },

  // Market regime
  regime: {
    title: 'Market Regime',
    current: 'Current Regime',
    bull_market: 'Bull Market',
    bear_market: 'Bear Market',
    high_volatility: 'High Volatility',
    low_volatility: 'Low Volatility',
    details: 'Regime Details',
    description: 'Description',
    characteristics: 'Characteristics'
  },

  // Risk dashboard
  risk_dashboard: {
    title: 'Risk Dashboard',
    var: 'VaR (95%)',
    cvar: 'CVaR (95%)',
    beta: 'Beta',
    correlation: 'Benchmark Correlation',
    volatility: 'Annualised Volatility',
    drawdown: 'Current Drawdown'
  },

  // Anomalies
  anomalies: {
    title: 'Detected Anomalies',
    none: 'No anomalies detected',
    view_details: 'View Details'
  },

  // Errors
  errors: {
    universe_load_failed: 'Failed to load asset universe',
    benchmark_load_failed: 'Failed to load benchmark data',
    insufficient_data: 'Insufficient data for analysis',
    no_assets_passed: 'No assets passed the filters',
    portfolio_build_failed: 'Failed to build portfolio',
    min_assets_required: 'At least {min} assets are required to build portfolio',
    backtest_failed: 'Failed to run backtesting',
    invalid_config: 'Invalid configuration',
    api_error: 'API error: {message}',
    scan_failed: '❌ Critical error during scan.',
    insufficient_assets_portfolio: 'Not enough assets with historical data to build portfolio',
    no_historical_data: '⚠️ Could not load historical data for universe',
    select_market_first: 'Select a market before running backtest',
    no_benchmark_market: 'No benchmark defined for this market',
    insufficient_data: 'Insufficient benchmark data',
    benchmark_calculation_failed: 'Error calculating benchmark metrics:',
    backtest_error: 'Backtest error',
    regime_full_benchmark_load_failed: 'Full benchmark data could not be loaded for regime',

  },

  // Detail modal
  modal: {
    title: 'Asset Details',
    basic_info: 'Basic Information',
    scores: 'Scores',
    trend_details: 'Trend Details',
    momentum_details: 'Momentum Details',
    risk_details: 'Risk Details',
    liquidity_details: 'Liquidity Details',
    price_vs_ema: 'Price vs EMAs',
    roc: 'ROC (Rate of Change)',
    rsi: 'RSI',
    atr: 'ATR %',
    volatility: 'Volatility',
    volume_avg: 'Average Volume',
    volume_ratio: 'Volume Ratio',
    regime_analysis: 'Market Regime Analysis',
    confidence: 'Confidence',
    trend: 'Trend',
    momentum: 'Momentum',
    market_breadth: 'Market Breadth',
    benchmark_signals: 'Benchmark Signals',
    vol_description: 'Volatility',
    bullish_assets: 'Bullish assets',
    percentage: 'Percentage',
    description: 'Description',
    classification: "Classification",
    strategy_adjustments: "Recommended Strategy Adjustments",
    momentum_weight: "Momentum Weight",
    risk_penalty: "Risk Penalty",
    min_score_adjustment: "Minimum Score Adjustment",
    points: "points",
    increase: "(increase)",
    reduce: "(reduce)",
    maintain: "(maintain)",
    stricter: "(stricter)",
    more_permissive: "(more permissive)",
    normal: "(normal)"
  },


  rsi: {
    overbought: 'Overbought: correction risk',
    healthy_bullish: 'Healthy bullish trend',
    oversold: 'Oversold: possible bounce',
    weakness: 'Weakness: low buying interest',
    neutral: 'Neutral regime / consolidation'
  },

  // Settings
  settings: {
    language: 'Language',
    theme: 'Theme',
    preferences: 'Preferences'
  },

  // Footer
  footer: {
    version: 'Version {version}',
    rights: 'All rights reserved'
  },

  // Table headers
  table: {
    rank: 'Rank',
    ticker: 'Ticker',
    name: 'Name',
    score: 'Score',
    volume: 'Volume',
    signal: 'Signal',
    weight: 'Weight %',
    capital: 'Capital €',
    no_classification: 'Unclassified',
    waiting_data: 'Waiting for analysis data...',
    unusual_volume: 'Unusual volume (Z-Score: {zscore})'
  },

  // Info messages
  info: {
    select_strategy_market: 'Select a strategy and market to begin',
    scan_complete: '✅ Analysis complete for {strategy} in {market}.',
    waiting_scan: 'Awaiting scan...',
    system_ready: '🎯 System ready. Configure parameters and run analysis.'
  },

  // Regime indicator
  regime_indicator: {
    market_regime: 'Market Regime',
    confidence: 'Confidence',
    trend: 'Trend',
    volatility: 'Volatility',
    breadth: 'Breadth',
    view_details: 'View Details',
    interpretation: {
      risk_on:
        'The market is in a bullish, low-volatility regime. This environment is favorable for momentum and growth strategies. Increasing exposure to strong-momentum assets and relaxing risk constraints is recommended.',

      risk_off:
        'The market is in a defensive regime with high volatility or a downward trend. It is recommended to prioritize asset quality, reduce exposure to extreme momentum, and focus on stability. Consider increasing cash or defensive assets.',

      neutral:
        'The market shows no clear trend. This environment favors balanced strategies and diversification. Maintain balanced factor weights and avoid over-concentration in momentum or value.',

      unknown: 'Unidentified regime.'
    }
  },

  // Portfolio section
  portfolio_section: {
    title: '💼 Portfolio Construction',
    allocation_method: 'Allocation Method',
    top_n_assets: 'Top N Assets',
    total_capital: 'Total Capital (€)',
    build_button: '📊 Build Portfolio',
    risk_profile: 'Risk Profile',
    regime_adjustment: 'Apply automatic adjustments based on market regime',
    regime_adjustment_desc: 'Adjusts scores and filters according to current market conditions',
    summary_title: '📊 Portfolio Summary',
    portfolio_volatility: 'Portfolio Volatility',
    diversification_ratio: 'Diversification Ratio',
    effective_n_assets: 'Effective No. Assets',
    estimated_max_dd: 'Estimated Max DD',
    advanced_risk_title: '🧩 Advanced Risk Analysis',
    degraded_warning: '⚠️ Risk analysis performed with reduced universe.',
    excluded_assets: 'Excluded assets',
    var_title: '📉 Value at Risk (VaR 95%)',
    max_loss_expected: 'Maximum expected loss in 95% of days',
    undiversified: 'Undiversified',
    diversification_benefit: 'Diversification benefit',
    riskiest_asset_title: '⚠️ Riskiest Asset',
    portfolio_weight: 'Portfolio weight',
    concentration_risk: 'Concentration risk',
    correlation_matrix: '🔥 Correlation Matrix',
    avg_correlation: 'Average correlation',
    max_correlation: 'Maximum',
    diversification_score: 'Diversification score',
    stress_test_title: '🌪️ Stress Test',
    scenario: 'Scenario',
    market: 'Market',
    your_loss: 'Your Loss',
    portfolio_pct: '% Portfolio',
    remaining_capital: 'Remaining Capital',
    allocation_table_title: '📋 Allocation Details',
    weight_chart_title: '📊 Weight Distribution'
  },

  // Backtest section
  backtest_section: {
    title: '🧪 Strategy Backtesting',
    top_n_assets: 'Top N Assets',
    rebalance_days: 'Rebalance (days)',
    allocation_method: 'Allocation Method',
    initial_capital: 'Initial Capital',
    run_button: '📈 Run Backtest',
    status_waiting: 'Select a market and run backtest to compare strategies.',
    no_results: 'Insufficient results to display backtest.',
    results_title: '📈 Backtesting Results',
    rebalance_every: 'Rebalance every {days} days',
    strategies_evaluated: '{count} strategies evaluated',
    avg_sharpe: 'Average Sharpe Ratio',
    avg_cagr: 'Average CAGR',
    best_strategy: 'Best Strategy',
    total_rebalances: 'Total Rebalances',
    action_performance: '🏆 Performance',
    action_detail: '📊 Detail',
    action_risk: '⚠️ Risk',
    action_trading: '💰 Trading',
    action_equity: '📈 Equity',
    action_drawdown: '📉 Drawdown',
    action_export: '⬇️ Export CSV',
    interpretation: '💡 Interpretation',
    max_dd_meaning: '• <strong>Max DD:</strong> Maximum loss from previous peak',
    avg_recovery_meaning: '• <strong>Avg. Recovery:</strong> Average time to recover drawdowns',
    outperformed_benchmark: 'The strategy <strong style="color: #10b981;">outperformed the benchmark</strong> by ${formatNumber(outperformance)}%. This indicates that active asset selection added value over simply holding the index.',
    underperformed_benchmark: 'The strategy <strong style="color: #f87171;">underperformed the benchmark</strong> by ${formatNumber(Math.abs(outperformance))}%. Consider reviewing parameters or using passive management.'
  },

  // View modes
  view_modes: {
    total_score: '📊 Total Score',
    short_term: '⚡ Short Term (6m)',
    medium_term: '📈 Medium Term (18m)',
    long_term: '🎯 Long Term (4y)',
    trend: '📉 Trend',
    momentum: '🚀 Momentum',
    risk: '⚠️ Risk',
    liquidity: '💧 Liquidity'
  },

  // Governance report
  governance: {
    title: '🏛️ Governance Report',
    status_compliant: 'COMPLIANT',
    status_with_alerts: 'WITH ALERTS',
    strategy_title: 'STRATEGY',
    profile_label: 'Profile',
    portfolio_summary_title: 'PORTFOLIO SUMMARY',
    assets_label: 'Assets',
    max_position_label: 'Max position',
    top3_concentration_label: 'Top 3',
    violations_title: '⚠️ Detected Violations',
    violations_count: 'Detected Violations ({count})',
    portfolio_label: 'Portfolio',
    value_label: 'Value',
    limit_label: 'Limit',
    auto_corrections_applied: '✅ Automatic corrections have been applied to comply with rules',
    warnings_title: 'ℹ️ Warnings',
    warnings_count: 'Warnings ({count})',
    classification_title: '📊 Classification'
  },

  // Backtest performance comparison
  backtest_performance: {
    comparison_title: '🏆 Performance Comparison',
    strategy: 'Strategy',
    total_return: 'Total return',
    cagr: 'CAGR',
    sharpe: 'Sharpe',
    max_dd: 'Max DD',
    win_rate: 'Win Rate',
    alpha: 'Alpha',
    beta: 'Beta'
  },

  // Stress test scenarios
  stress_scenarios: {
    minor_correction: 'Minor Correction',
    minor_correction_desc: 'Typical monthly drop',
    moderate_correction: 'Moderate Correction',
    moderate_correction_desc: 'Quarterly correction',
    market_crash: 'Market Crash',
    market_crash_desc: 'COVID-19 type crisis',
    systemic_crisis: 'Systemic Crisis',
    systemic_crisis_desc: '2008-type crisis'
  },

  // Backtesting detailed sections
  backtest_detailed: {
    detailed_metrics_title: '📊 Detailed Metrics',
    risk_analysis_title: '⚠️ Risk Analysis',
    trading_metrics_title: '💰 Trading Metrics',
    drawdown_analysis_title: '📉 In-Depth Drawdown Analysis',
    strategy: 'Strategy',
    volatility: 'Volatility',
    alpha: 'Alpha',
    beta: 'Beta',
    info_ratio: 'Info Ratio',
    tracking_error: 'Tracking Error',
    max_dd: 'Max DD',
    num_drawdowns: 'No. Drawdowns',
    avg_recovery: 'Avg. Recovery',
    longest_dd: 'Longest DD',
    annual_vol: 'Annual Vol.',
    days: 'days',
    win_rate: 'Win Rate',
    profit_factor: 'Profit Factor',
    avg_win: 'Avg Win',
    avg_loss: 'Avg Loss',
    turnover: 'Turnover',
    costs: 'Costs',
    notes: '📌 Notes:',
    win_rate_note: '• <strong>Win Rate:</strong> % of periods with positive return',
    profit_factor_note: '• <strong>Profit Factor:</strong> Gains/losses ratio (>1.5 is excellent)',
    turnover_note: '• <strong>Turnover:</strong> % of portfolio rotated each rebalance',
    costs_note: '• <strong>Costs:</strong> Estimated commissions + slippage (0.15% per operation)',
    avg_dd: 'Avg DD',
    total_dds: 'Total DDs',
    worst_recovery: 'Worst Recov.',
    time_in_drawdown: 'Time in drawdown',
    of_time: '% of time'
  },

  // Governance warnings
  governance_warnings: {
    low_liquidity: '{ticker} has low liquidity',
    extreme_volatility: '{ticker} has extreme volatility',
    high_correlation: 'High correlation between {ticker1} and {ticker2}',
    excessive_concentration: 'Excessive concentration in {sector}',
    concentration_risk: 'Concentration risk'
  },

  // Risk levels
  risk_levels: {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    na: 'N/A'
  },

  // Details
  details: {
    main_scores_title: "Main Scores",
    total: "Total",
    trend: "Trend",
    momentum: "Momentum",
    risk: "Risk",
    liquidity: "Liquidity",

    time_analysis_title: "Timeframe Analysis",
    short_term_6m: "Short Term (6m)",
    medium_term_18m: "Medium Term (18m)",
    long_term_4y: "Long Term (4y)",

    trend_analysis_title: "Trend Analysis",
    position_score: "Position score",
    consistency_score: "Consistency score",
    adx_score: "ADX score",
    ema50: "EMA50",
    ema200: "EMA200",

    momentum_analysis_title: "Momentum Analysis",
    roc_6m: "6-month ROC",
    roc_12m: "12-month ROC",
    alpha_6m: "6m alpha",
    alpha_12m: "12m alpha",
    rsi: "RSI",

    risk_analysis_title: "Risk Analysis",
    atr_pct: "ATR%",
    annual_volatility: "Annual volatility",
    relative_volatility: "Relative volatility",
    max_drawdown_52w: "52-week max drawdown",

    anomalies_title: "Anomaly Detection",
    anomalies_penalty_text: "This asset shows unusual behavior and received a -{{points}} point penalty.",
    anomaly_type: "Type",
    anomaly_volume_zscore: "Volume Z-Score",
    anomaly_sector_ratio: "Sector-relative ratio",
    anomaly_return_1d: "1-day return",
    anomaly_normal_lt: "Normal < {{value}}",
    anomaly_normal_approx: "Normal ~{{value}}",

    liquidity_analysis_title: "Liquidity Analysis",
    avg_vol_20d: "20-day avg volume",
    avg_vol_60d: "60-day avg volume",
    volume_ratio: "Volume ratio",

    signal: "Signal",
    confidence: "Confidence"
  },

  // Governance module
  governance_module: {
    // Risk profile names
    risk_profile_conservative: "Conservative",
    risk_profile_moderate: "Moderate",
    risk_profile_aggressive: "Aggressive",

    // Risk profile descriptions
    risk_profile_conservative_desc: "Minimise risk, prioritise stability",
    risk_profile_moderate_desc: "Balance between growth and stability",
    risk_profile_aggressive_desc: "Maximise growth, accept volatility",

    // Investor types
    investor_type_conservative: "Investors with low risk tolerance, near retirement",
    investor_type_moderate: "Investors with medium horizon (5-10 years)",
    investor_type_aggressive: "Young investors with long horizon (10+ years)",

    // Strategy names
    strategy_momentum_aggressive: "Aggressive Momentum",
    strategy_trend_conservative: "Conservative Trend-Following",
    strategy_balanced: "Balanced",
    strategy_sector_rotation: "Sector Rotation",

    // Strategy objectives
    objective_momentum_aggressive: "Capture short-term trends with active rotation",
    objective_trend_conservative: "Follow structural trends with low volatility",
    objective_balanced: "Optimal balance between growth and stability",
    objective_sector_rotation: "Rotate capital towards sectors with relative momentum",

    // Strategy characteristics
    char_high_turnover: "High portfolio turnover",
    char_sensitive_regime: "Sensitive to regime changes",
    char_active_monitoring: "Requires active monitoring",
    char_high_tax_impact: "Higher tax impact from rotation",
    char_low_turnover: "Low portfolio turnover",
    char_high_stability: "High stability",
    char_low_market_noise: "Lower sensitivity to market noise",
    char_tax_efficient: "Tax efficient",
    char_factor_diversification: "Diversification between factors",
    char_regime_adaptability: "Adaptability to different regimes",
    char_moderate_turnover: "Moderate turnover",
    char_optimal_cost_benefit: "Optimal cost-benefit balance",
    char_sector_concentration: "Temporary sector concentration",
    char_requires_macro: "Requires macro analysis",
    char_high_liquidity: "High liquidity necessary",
    char_cycle_sensitive: "Sensitive to economic cycles",

    // Ideal conditions
    ideal_bull_trend: "Markets in upward trend (Risk-On)",
    ideal_low_volatility: "Low general volatility",
    ideal_high_breadth: "High market breadth (>60% bullish assets)",
    ideal_clear_trend: "Markets in clear and sustained trend",
    ideal_controlled_volatility: "Controlled volatility",
    ideal_expansive_cycle: "Expansive economic cycle",
    ideal_any_regime: "Any market regime",
    ideal_simplify_decisions: "Investors seeking to simplify decisions",
    ideal_medium_horizons: "Medium investment horizons",
    ideal_cycle_changes: "Clear changes in economic cycle",
    ideal_sector_divergence: "Marked sector divergence",
    ideal_macro_catalysts: "Identifiable macro catalysts",

    // Strategy risks
    risk_sharp_reversals: "Sharp reversals in regime changes",
    risk_whipsaws: "Whipsaws in sideways markets",
    risk_high_transaction_costs: "High transaction costs",
    risk_sideways_underperformance: "Underperformance in sideways markets",
    risk_late_entry: "Late entry into new trends",
    risk_late_exit: "Late exit when regime changes",
    risk_no_maximize_rallies: "May not maximise gains in rallies",
    risk_no_avoid_drawdowns: "Does not completely avoid moderate drawdowns",
    risk_high_sector_concentration: "High sector concentration",
    risk_critical_rotation_timing: "Critical rotation timing",
    risk_higher_complexity: "Higher management complexity",

    // Compliance violation messages
    violation_max_position: "{{ticker}} exceeds maximum permitted weight",
    violation_top3_concentration: "Top 3 positions excessively concentrated",
    violation_portfolio_volatility: "Portfolio volatility exceeds limit",

    // Warning messages
    warning_min_position: "{{ticker}} has very low weight (inefficient)",
    warning_low_liquidity: "{{ticker}} has low liquidity",
    warning_extreme_volatility: "{{ticker}} has extreme volatility",

    // Correction actions
    action_reduce_weight: "REDUCE_WEIGHT",
    action_remove: "REMOVE",
    action_renormalize: "RENORMALISE",

    // Correction reasons
    reason_weight_below_minimum: "Weight below minimum",
    reason_adjust_weights: "Adjust weights to sum 100%",

    // Strategy properties
    horizon: "Horizon",
    expected_return: "Expected Return",
    expected_volatility: "Expected Volatility",
    max_drawdown: "Max Drawdown",
    sharpe_target: "Sharpe Target",
    investor_profile: "Investor Profile",
    risk_tolerance: "Risk Tolerance",
    rebalance_frequency: "Rebalance Frequency",
    min_capital: "Minimum Capital",
    benchmark: "Benchmark",

    // Risk tolerance levels
    risk_tolerance_high: "High",
    risk_tolerance_low: "Low",
    risk_tolerance_medium: "Medium",
    risk_tolerance_medium_high: "Medium-High",

    // Investor profile types
    investor_profile_moderate_aggressive: "Moderate-Aggressive",

    // Rebalance frequencies
    rebalance_monthly: "Monthly",
    rebalance_quarterly: "Quarterly",
    rebalance_bimonthly: "Bimonthly"
  },

  // Risk engine module
  risk_engine: {
    // Calculation methods
    method_parametric: "Parametric (Covariance Matrix)",
    method_historical: "Historical",

    // Error messages
    error_insufficient_data: "Insufficient data for analysis",
    error_min_assets: "At least 2 assets required for matrix analysis",
    error_var_calculation: "Error in VaR calculation",
    error_cvar_calculation: "Error calculating CVaR",
    error_correlation_matrix: "Error generating correlation matrix",
    error_invalid_covariance: "Invalid covariance matrix",
    error_risk_report: "Error generating risk report",

    // Console warnings
    warning_invalid_data_pct: "{{pct}}% invalid data detected",
    warning_no_timestamps: "No timestamps available, using length-based alignment (less accurate)",
    warning_insufficient_common_dates: "Insufficient common dates ({{count}}). Minimum: 30",
    warning_alignment_verified: "Date-based alignment: {{count}} common observations",
    warning_non_symmetric_matrix: "Non-symmetric matrix at ({{i}},{{j}}): diff={{diff}}",
    warning_negative_variances: "Negative variances in diagonal",
    warning_nearly_identical: "Nearly identical assets detected",
    warning_autocorrelation_detected: "Autocorrelation detected: ρ={{rho}}, adjusting scaling",
    warning_shrinkage_applied: "Shrinkage applied: δ={{delta}} (T={{T}}, N={{N}})"
  },

  // Market regime module
  market_regime: {
    // Regime names
    risk_on_name: "Risk-On",
    neutral_name: "Neutral",
    risk_off_name: "Risk-Off",

    // Regime descriptions
    risk_on_desc: "Bullish market, low volatility, strong breadth",
    neutral_desc: "Sideways market, no clear trend",
    risk_off_desc: "Bearish market or high volatility",

    // Trend descriptions
    trend_bullish: "Bullish",
    trend_bearish: "Bearish",
    trend_sideways: "Sideways",

    // Volatility descriptions
    vol_low: "Low",
    vol_high: "High",
    vol_normal: "Normal",

    // Momentum descriptions
    momentum_positive: "Positive",
    momentum_negative: "Negative",
    momentum_neutral: "Neutral",

    // Breadth descriptions
    breadth_strong: "Strong (>60% bullish assets)",
    breadth_weak: "Weak (<40% bullish assets)",
    breadth_normal: "Normal (40-60%)",
    breadth_no_data: "No breadth data",
    breadth_no_valid: "No valid data",

    // Error messages
    error_calculating_trend: "Error calculating trend",
    error_calculating_volatility: "Error calculating volatility",
    error_calculating_momentum: "Error calculating momentum",

    // Reason messages
    reason_insufficient_data: "Insufficient data for regime analysis"
  },

  // Portfolio Dashboard
  portfolio_dashboard: {
    title: '📊 Portfolio Tracking Dashboard',
    select_portfolio: 'Select Portfolio',
    no_portfolio: '-- Create new portfolio --',
    save_portfolio: '💾 Save Portfolio',
    delete_portfolio: '🗑️ Delete',
    refresh: '🔄 Refresh',

    // Summary cards
    total_value: 'Total Value',
    total_return: 'Total Return',
    sharpe_ratio: 'Sharpe Ratio',
    max_drawdown: 'Max Drawdown',
    volatility: 'Volatility',
    beta: 'Beta',

    // Tabs
    tab_equity: 'Equity Curve',
    tab_drawdown: 'Drawdown',
    tab_benchmark: 'vs Benchmark',
    tab_allocation: 'Allocation',

    // Chart labels
    portfolio_value: 'Portfolio Value',
    drawdown: 'Drawdown',
    portfolio: 'Portfolio',
    benchmark: 'Benchmark',

    // Positions table
    positions_title: '📋 Current Positions',
    ticker: 'Ticker',
    name: 'Name',
    quantity: 'Quantity',
    entry_price: 'Entry Price',
    current_price: 'Current Price',
    value: 'Value',
    weight: 'Weight %',
    pnl: 'P&L',
    pnl_pct: 'P&L %',
    no_positions: 'No positions to display',

    // Risk metrics
    risk_metrics_title: '⚠️ Detailed Risk Metrics',
    var_title: 'Value at Risk (VaR)',
    var_description: '95% confidence, 1 day',
    cvar_title: 'Conditional VaR (CVaR)',
    cvar_description: 'Expected Shortfall',
    sortino_title: 'Sortino Ratio',
    sortino_description: 'Downside risk-adjusted',
    calmar_title: 'Calmar Ratio',
    calmar_description: 'Return / Max DD',

    // Rebalancing
    rebalance_history_title: '🔄 Rebalancing History',
    no_rebalances: 'No rebalances recorded',
    changes: 'changes',
    reason: 'Reason',

    // Alerts
    alerts_title: '⚠️ Alerts and Deviations',
    alert_large_drawdown: 'Significant drawdown detected: {{dd}}%',
    alert_concentration: 'High concentration in {{ticker}}: {{weight}}%',
    alert_underperformance: 'Underperformance vs benchmark: {{excess}}%',

    // Messages
    enter_name: 'Enter a name for the portfolio:',
    no_portfolio_built: 'First build a portfolio using the portfolio builder',
    saved_success: 'Portfolio saved successfully',
    deleted_success: 'Portfolio deleted',
    confirm_delete: 'Are you sure you want to delete portfolio "{{name}}"?',

    // Errors
    error_loading: 'Error loading portfolio',
    error_refreshing: 'Error refreshing data',
    error_saving: 'Error saving portfolio',
    error_deleting: 'Error deleting portfolio'
  },

  // =====================================================
  // TEST SUITE (British English)
  // =====================================================
  test: {
    // Test environment
    environment_initialized: 'Test environment initialised (British English)',

    // Test status
    pass: 'PASS',
    fail: 'FAIL',
    error: 'ERROR',
    expected: 'expected',
    got: 'got',
    diff: 'diff',

    // Test suite header
    suite_title: 'TEST SUITE - GLOBAL SCANNER',

    // Test categories
    testing_sma: 'Testing SMA',
    testing_ema: 'Testing EMA',
    testing_rsi: 'Testing RSI',
    testing_atr: 'Testing ATR',
    testing_bollinger_bands: 'Testing Bollinger Bands',
    testing_adx: 'Testing ADX',
    testing_williams_r: 'Testing Williams %R',
    testing_roc: 'Testing ROC',
    testing_volatility: 'Testing Volatility',
    testing_max_drawdown: 'Testing Max Drawdown',
    testing_days_above_ema: 'Testing Days Above EMA',
    testing_volume_ratio: 'Testing Volume Ratio',
    testing_validation: 'Testing Validation',
    testing_backtesting_engine: 'Testing Backtesting Engine',
    testing_walk_forward: 'Testing Walk-Forward Backtest',
    testing_risk_engine: 'Testing Risk Engine Metrics',
    testing_risk_edge_cases: 'Testing Risk Engine Edge Cases',
    testing_correlation_symmetry: 'Testing Correlation Matrix Symmetry',
    testing_shrinkage: 'Testing Shrinkage Activation',

    // Test descriptions
    basic_sma: 'Basic SMA calculation',
    basic_ema_range: 'Basic EMA within expected range',
    ema_insufficient_data: 'EMA returns null with insufficient data',
    high_rsi_uptrend: 'High RSI in uptrend',
    low_rsi_downtrend: 'Low RSI in downtrend',
    neutral_rsi_sideways: 'Neutral RSI in sideways trend',
    atr_reasonable_range: 'ATR in a reasonable range',
    atr_pct_reasonable_range: 'ATR% in a reasonable range',
    bb_upper_middle: 'BB upper > middle',
    bb_middle_lower: 'BB middle > lower',
    bb_bandwidth_positive: 'BB bandwidth is positive',
    bb_percent_b_range: 'BB %B in range [0,1]',
    high_adx_trend: 'High ADX in a strong trend',
    low_adx_sideways: 'Low ADX in a sideways market',
    williams_r_high: 'Williams %R high at highs',
    williams_r_low: 'Williams %R low at lows',
    correct_roc: 'Correct ROC',
    low_volatility_stable: 'Low volatility in a stable series',
    high_volatility_volatile: 'High volatility in a volatile series',
    correct_max_drawdown: 'Correct max drawdown',
    high_days_above_ema: 'High days above EMA in uptrend',
    volume_ratio_rising: 'Volume Ratio > 1 with rising volume',
    rejects_empty_array: 'Rejects empty array',
    rejects_nan: 'Rejects NaN values',
    rejects_null: 'Rejects null values',
    rejects_insufficient_length: 'Rejects insufficient length',
    backtest_returns_metrics: 'Backtest returns metrics',
    backtest_produces_rebalances: 'Backtest produces rebalances',
    calmar_ratio_computed: 'Calmar ratio computed',
    tax_drag_computed: 'Tax drag computed',
    walk_forward_produces_windows: 'Walk-forward produces windows',
    in_sample_metrics: 'In-sample metrics computed',
    out_sample_metrics: 'Out-sample metrics computed',
    portfolio_var_computed: 'Portfolio VaR computed',
    portfolio_cvar_computed: 'Portfolio CVaR computed',
    correlation_matrix_rows: 'Correlation matrix has {{n}} rows',
    correlation_matrix_cols: 'Correlation matrix has {{n}} columns',
    single_asset_error: 'Single asset triggers error as expected',
    single_asset_rejected: 'Single asset rejected properly',
    insufficient_data_rejected: 'Should reject insufficient data',
    insufficient_data_error: 'Insufficient data error triggered',
    correlation_symmetric: 'Correlation matrix symmetric at ({{i}},{{j}})',
    diagonal_equals_one: 'Diagonal element {{i}} equals 1.0',
    small_sample_detected: 'Small sample detected',
    var_computed_small_sample: 'VaR computed despite small sample',

    // Results summary
    results: 'RESULTS',
    passed: 'passed',
    failed: 'failed'
  }

};
