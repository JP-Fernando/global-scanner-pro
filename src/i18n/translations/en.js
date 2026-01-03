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
    select_market_first: 'Select a market before running backtest'
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
    vol_description: 'Volatility'
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
    view_details: 'View Details'
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
  }
};
