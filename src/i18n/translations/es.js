// =====================================================
// SPANISH (EUROPEAN) TRANSLATIONS
// =====================================================

export default {
  // Language name
  language: {
    name: 'Español',
    code: 'es'
  },

  // App info
  app: {
    title: 'Global Quant Scanner Pro',
    subtitle: 'Sistema cuantitativo avanzado con análisis multi-factor y benchmarking'
  },

  // Markets
  markets: {
    label: '📍 Mercado',
    all: '🌍 Todos los Mercados',
    regions: {
      europe: '🇪🇺 Europa',
      americas: '🌎 América',
      asia: '🌏 Asia'
    },
    spain: 'España (BME)',
    usa: 'Estados Unidos (NYSE/NASDAQ)',
    france: 'Francia (Euronext Paris)',
    germany: 'Alemania (XETRA)',
    uk: 'Reino Unido (LSE)',
    italy: 'Italia (Borsa Italiana)',
    netherlands: 'Países Bajos (Euronext Amsterdam)',
    belgium: 'Bélgica (Euronext Brussels)',
    portugal: 'Portugal (Euronext Lisbon)',
    switzerland: 'Suiza (SIX)',
    brazil: 'Brasil (B3)',
    mexico: 'México (BMV)',
    canada: 'Canadá (TSX)',
    japan: 'Japón (TSE)',
    hongkong: 'Hong Kong (HKEX)',
    china_shanghai: 'China (SSE)',
    china_shenzhen: 'China (SZSE)',
    southkorea: 'Corea del Sur (KRX)'
  },

  // Strategy profiles
  strategies: {
    label: '🎯 Estrategia',
    balanced: 'Equilibrado',
    balanced_desc: 'Equilibrio entre crecimiento y estabilidad',
    momentum_aggressive: 'Momentum Agresivo',
    momentum_aggressive_desc: 'Favorece activos con fuerte momentum reciente',
    trend_conservative: 'Seguimiento de Tendencia Conservador',
    trend_conservative_desc: 'Prioriza tendencias estables y baja volatilidad',
    sector_rotation: 'Rotación Sectorial',
    sector_rotation_desc: 'Optimizado para rotación entre sectores'
  },

  // Allocation methods
  allocation: {
    label: '💼 Método de Asignación',
    equal_weight: 'Peso Igual',
    equal_weight_desc: 'Peso igual para todos los activos seleccionados',
    score_weighted: 'Ponderado por Score',
    score_weighted_desc: 'Peso proporcional al Quant Score de cada activo',
    erc: 'Contribución de Riesgo Igual (ERC)',
    erc_desc: 'Cada activo contribuye por igual al riesgo total',
    volatility_target: 'Volatilidad Objetivo',
    volatility_target_desc: 'Ajusta pesos para alcanzar volatilidad objetivo',
    hybrid: 'Híbrido (ERC + Score)',
    hybrid_desc: 'Combina diversificación de riesgo con calidad de señal'
  },

  // Risk profiles
  risk: {
    label: '⚖️ Perfil de Riesgo',
    conservative: 'Conservador',
    conservative_desc: 'Minimiza riesgo, límites estrictos',
    moderate: 'Moderado',
    moderate_desc: 'Equilibrio riesgo-retorno',
    aggressive: 'Agresivo',
    aggressive_desc: 'Tolera mayor riesgo para mayor retorno potencial'
  },

  // Buttons
  buttons: {
    runScan: '🚀 Ejecutar Análisis',
    buildPortfolio: '📊 Construir Cartera',
    runBacktest: '⏮️ Ejecutar Backtesting',
    exportCSV: '📥 Exportar CSV',
    close: 'Cerrar',
    expand: 'Expandir',
    collapse: 'Contraer'
  },

  // Status messages
  status: {
    initializing: '⏳ Iniciando escaneo...',
    loading_universe: '📦 Cargando universo de activos...',
    loading_benchmark: '📊 Cargando benchmark de mercado...',
    analyzing: '🔍 Analizando {current} de {total} activos...',
    filtering: '🧪 Aplicando filtros...',
    calculating: '🧮 Calculando puntuaciones...',
    complete: '✅ Análisis completado en {time}s',
    error: '❌ Error: {message}',
    loading_backtest: '📦 Cargando universo para backtesting...',
    running_backtest: '⏳ Ejecutando simulación histórica...',
    backtest_complete: '✅ Backtesting completado: {samples} rebalanceos',
    building_portfolio: '📊 Construyendo cartera...',
    portfolio_complete: '✅ Cartera construida con {assets} activos',
    scanning: '⏳ Escaneando...',
    scan_complete: '✅ Escaneo completado. {count} activos encontrados.',
    detecting_regime: '🔍 Detectando régimen de mercado...',
    preparing_backtest: '⏳ Preparando backtest...',
    backtest_strategy: '🧪 Backtest {strategy}...',
    backtest_completed: '✅ Backtest completado',
    downloading_historical: '🔎 Descargando históricos {current}–{end} de {total}',
    scanning_market: '🌍 Escaneando mercado {current} de {total}: {market}...',
    all_markets_complete: '✅ Escaneo de todos los mercados completado. {count} activos encontrados en total.'
  },

  // Filters
  filters: {
    info: '✅ {approved} aprobados | ❌ {filtered} filtrados',
    total_analyzed: 'Total analizado: {count}',
    by_reason: 'Filtrados por motivo',
    insufficient_history: 'Historia insuficiente',
    low_volume: 'Volumen bajo',
    high_volatility: 'Alta volatilidad',
    deep_drawdown: 'Drawdown profundo'
  },

  // Views
  views: {
    label: '📈 Vista',
    overall: 'General',
    short_term: 'Corto Plazo (6M)',
    medium_term: 'Medio Plazo (18M)',
    long_term: 'Largo Plazo (4A)'
  },

  // Table headers
  table: {
    rank: '#',
    ticker: 'Ticker',
    name: 'Nombre',
    sector: 'Sector',
    score: 'Score',
    signal: 'Señal',
    trend: 'Tendencia',
    momentum: 'Momentum',
    risk: 'Riesgo',
    liquidity: 'Liquidez',
    price: 'Precio',
    change: 'Cambio %',
    volume: 'Volumen',
    marketCap: 'Cap. Mercado',
    actions: 'Acciones'
  },

  // Signals
  signals: {
    strong_buy: 'COMPRA FUERTE',
    buy: 'COMPRA',
    hold_upper: 'MANTENER+',
    hold: 'MANTENER',
    sell: 'VENTA'
  },

  // Sectors
  sectors: {
    summary: 'Resumen por Sectores',
    energy: 'Energía',
    materials: 'Materiales',
    industrials: 'Industriales',
    consumer_discretionary: 'Consumo Discrecional',
    consumer_staples: 'Consumo Básico',
    healthcare: 'Salud',
    financials: 'Financiero',
    technology: 'Tecnología',
    communication: 'Comunicación',
    utilities: 'Utilities',
    real_estate: 'Inmobiliario'
  },

  // Portfolio
  portfolio: {
    title: 'Cartera Construida',
    summary: 'Resumen de Cartera',
    method: 'Método',
    total_assets: 'Activos Totales',
    date: 'Fecha',
    allocation_table: 'Asignación de Capital',
    weight: 'Peso',
    recommended_capital: 'Capital Recomendado',
    portfolio_risk: 'Riesgo de Cartera',
    volatility: 'Volatilidad',
    diversification_ratio: 'Ratio de Diversificación',
    effective_assets: 'N° Efectivo de Activos',
    concentration: 'Concentración',
    estimated_max_dd: 'Max DD Estimado',
    marginal_risk: 'Riesgo Marginal por Activo'
  },

  // Backtesting
  backtest: {
    title: 'Resultados del Backtesting',
    strategy: 'Estrategia',
    period: 'Periodo',
    difference: 'Diferencia',
    rebalances: 'Rebalanceos',
    initial_capital: 'Capital Inicial',
    final_capital: 'Capital Final',
    performance: 'Rendimiento',
    cagr: 'CAGR',
    volatility: 'Volatilidad',
    sharpe: 'Ratio Sharpe',
    calmar: 'Ratio Calmar',
    risk: 'Riesgo',
    max_drawdown: 'Max Drawdown',
    avg_recovery_days: 'Días Recuperación Promedio',
    num_drawdowns: 'Número de Drawdowns',
    longest_drawdown: 'Drawdown Más Largo',
    trading: 'Trading',
    win_rate: 'Tasa de Acierto',
    profit_factor: 'Factor de Beneficio',
    avg_win: 'Ganancia Promedio',
    avg_loss: 'Pérdida Promedio',
    avg_turnover: 'Rotación Promedio',
    total_costs: 'Costes Totales',
    tax_drag: 'Impacto Fiscal Estimado',
    benchmark: 'vs Benchmark',
    alpha: 'Alpha',
    beta: 'Beta',
    info_ratio: 'Ratio de Información',
    tracking_error: 'Tracking Error',
    equity_curve: 'Curva de Patrimonio',
    period_label: 'Periodo',
    portfolio_value: 'Valor Cartera',
    benchmark_value: 'Valor Benchmark'
  },

  // Market regime
  regime: {
    title: 'Régimen de Mercado',
    current: 'Régimen Actual',
    bull_market: 'Mercado Alcista',
    bear_market: 'Mercado Bajista',
    high_volatility: 'Alta Volatilidad',
    low_volatility: 'Baja Volatilidad',
    details: 'Detalles del Régimen',
    description: 'Descripción',
    characteristics: 'Características'
  },

  // Risk dashboard
  risk_dashboard: {
    title: 'Panel de Riesgo',
    var: 'VaR (95%)',
    cvar: 'CVaR (95%)',
    beta: 'Beta',
    correlation: 'Correlación con Benchmark',
    volatility: 'Volatilidad Anualizada',
    drawdown: 'Drawdown Actual'
  },

  // Anomalies
  anomalies: {
    title: 'Anomalías Detectadas',
    none: 'No se detectaron anomalías',
    view_details: 'Ver Detalles'
  },

  // Errors
  errors: {
    yahoo_load_failed: 'Error cargando {{symbol}}:',
    analyze_stock_failed: 'Error analizando {{ticker}} - {{name}}:',
    universe_load_failed: 'Error al cargar el universo de activos',
    benchmark_load_failed: 'Error al cargar datos del benchmark',
    insufficient_data: 'Datos insuficientes para el análisis',
    no_assets_passed: 'Ningún activo pasó los filtros',
    portfolio_build_failed: 'Error al construir la cartera',
    min_assets_required: 'Se requieren al menos {min} activos para construir cartera',
    backtest_failed: 'Error al ejecutar el backtesting',
    invalid_config: 'Configuración inválida',
    api_error: 'Error de API: {message}',
    scan_failed: '❌ Error crítico durante el escaneo.',
    insufficient_assets_portfolio: 'No hay suficientes activos con histórico para construir cartera',
    no_historical_data: '⚠️ No se pudieron cargar datos históricos para el universo',
    select_market_first: 'Selecciona un mercado antes de ejecutar el backtest',
    no_benchmark_market: 'No se definió mercado para este benchmark',
    insufficient_benchmark_data: 'Datos de benchmark insuficientes',
    benchmark_calculation_failed: 'Error calculando métricas de benchmark:',
    backtest_error: 'Error de backtest',
    regime_full_benchmark_load_failed: 'No se pudieron cargar datos completos del benchmark para régimen',
  },

  // Detail modal
  modal: {
    title: 'Detalles del Activo',
    basic_info: 'Información Básica',
    scores: 'Puntuaciones',
    trend_details: 'Detalles de Tendencia',
    momentum_details: 'Detalles de Momentum',
    risk_details: 'Detalles de Riesgo',
    liquidity_details: 'Detalles de Liquidez',
    price_vs_ema: 'Precio vs EMAs',
    roc: 'ROC (Rate of Change)',
    rsi: 'RSI',
    atr: 'ATR %',
    volatility: 'Volatilidad',
    volume_avg: 'Volumen Promedio',
    volume_ratio: 'Ratio de Volumen',
    regime_analysis: 'Análisis de Régimen de Mercado',
    confidence: 'Confianza',
    trend: 'Tendencia',
    momentum: 'Momentum',
    composite_score: 'Score Compuesto',
    market_breadth: 'Amplitud de Mercado',
    benchmark_signals: 'Señales del Benchmark',
    vol_description: 'Volatilidad',
    bullish_assets: 'Activos alcistas',
    percentage: 'Porcentaje',
    description: 'Clasificación',
    strategy_adjustments: "Ajustes de Estrategia Recomendados",
    momentum_weight: "Peso Momentum",
    risk_penalty: "Penalización Riesgo",
    min_score_adjustment: "Ajuste Score Mínimo",
    points: "puntos",
    increase: "(aumentar)",
    reduce: "(reducir)",
    maintain: "(mantener)",
    stricter: "(más estricto)",
    more_permissive: "(más permisivo)",
    normal: "(normal)"
  },

   
  rsi: {
    overbought: 'Sobrecompra: riesgo de corrección',
    healthy_bullish: 'Tendencia alcista saludable',
    oversold: 'Sobreventa: posible rebote',
    weakness: 'Debilidad: bajo interés comprador',
    neutral: 'Régimen neutral / consolidación'
  },

  // Settings
  settings: {
    language: 'Idioma',
    theme: 'Tema',
    preferences: 'Preferencias'
  },

  // Footer
  footer: {
    version: 'Versión {version}',
    rights: 'Todos los derechos reservados'
  },

  // Table headers
  table: {
    rank: 'Rank',
    ticker: 'Ticker',
    name: 'Nombre',
    score: 'Score',
    volume: 'Volumen',
    signal: 'Señal',
    weight: 'Peso %',
    capital: 'Capital €',
    no_classification: 'No clasificado',
    waiting_data: 'Esperando datos de análisis...',
    unusual_volume: 'Volumen inusual (Z-Score: {zscore})'
  },

  // Info messages
  info: {
    select_strategy_market: 'Selecciona una estrategia y mercado para comenzar',
    scan_complete: '✅ Análisis completado para {strategy} en {market}.',
    waiting_scan: 'Esperando escaneo...',
    system_ready: '🎯 Sistema listo. Configura parámetros y ejecuta el análisis.'
  },

  // Regime indicator
  regime_indicator: {
    market_regime: 'Régimen de Mercado',
    confidence: 'Confianza',
    trend: 'Tendencia',
    volatility: 'Volatilidad',
    breadth: 'Amplitud',
    view_details: 'Ver Detalles',
    interpretation: {
      risk_on:
        'El mercado está en modo alcista con baja volatilidad. Este es un entorno favorable para estrategias de momentum y growth. Se recomienda aumentar la exposición a activos con fuerte impulso y reducir las restricciones por riesgo.',

      risk_off:
        'El mercado está en modo defensivo con alta volatilidad o tendencia bajista. Se recomienda aumentar la calidad de los activos seleccionados, reducir exposición a momentum extremo y priorizar estabilidad. Considera aumentar cash o activos defensivos.',

      neutral:
        'El mercado no muestra una tendencia clara. Este entorno favorece estrategias equilibradas y diversificación. Mantén pesos balanceados entre factores y evita sobre-concentración en momentum o value.',

      unknown: 'Régimen no identificado.'
    }
  
  },

  // Portfolio section
  portfolio_section: {
    title: '💼 Construcción de Cartera',
    allocation_method: 'Método de Asignación',
    top_n_assets: 'Top N Activos',
    total_capital: 'Capital Total (€)',
    build_button: '📊 Construir Cartera',
    risk_profile: 'Perfil de Riesgo',
    regime_adjustment: 'Aplicar ajustes automáticos según régimen de mercado',
    regime_adjustment_desc: 'Ajusta scores y filtros según condiciones actuales del mercado',
    summary_title: '📊 Resumen de Cartera',
    portfolio_volatility: 'Volatilidad Cartera',
    diversification_ratio: 'Ratio Diversificación',
    effective_n_assets: 'Nº Efectivo Activos',
    estimated_max_dd: 'Max DD Estimado',
    advanced_risk_title: '🧩 Análisis Avanzado de Riesgo',
    degraded_warning: '⚠️ Análisis de riesgo realizado con universo reducido.',
    excluded_assets: 'Activos excluidos',
    var_title: '📉 Value at Risk (VaR 95%)',
    max_loss_expected: 'Pérdida máxima esperada en el 95% de días',
    undiversified: 'Sin diversificar',
    diversification_benefit: 'Beneficio diversificación',
    riskiest_asset_title: '⚠️ Activo Más Arriesgado',
    portfolio_weight: 'Peso en cartera',
    concentration_risk: 'Riesgo concentración',
    correlation_matrix: '🔥 Matriz de Correlaciones',
    avg_correlation: 'Correlación promedio',
    max_correlation: 'Máxima',
    diversification_score: 'Score diversificación',
    stress_test_title: '🌪️ Stress Test',
    scenario: 'Escenario',
    market: 'Mercado',
    your_loss: 'Tu Pérdida',
    portfolio_pct: '% Cartera',
    remaining_capital: 'Capital Restante',
    allocation_table_title: '📋 Detalle de Asignación',
    weight_chart_title: '📊 Distribución de Pesos'
  },

  // Backtest section
  backtest_section: {
    title: '🧪 Backtesting de Estrategias',
    top_n_assets: 'Top N Activos',
    rebalance_days: 'Rebalanceo (días)',
    allocation_method: 'Método de Asignación',
    initial_capital: 'Capital Inicial',
    run_button: '📈 Ejecutar Backtest',
    status_waiting: 'Selecciona un mercado y ejecuta el backtest para comparar estrategias.',
    no_results: 'No hay resultados suficientes para mostrar el backtest.',
    results_title: '📈 Resultados del Backtesting',
    rebalance_every: 'Rebalanceo cada {days} días',
    strategies_evaluated: '{count} estrategias evaluadas',
    avg_sharpe: 'Sharpe Ratio Promedio',
    avg_cagr: 'CAGR Promedio',
    best_strategy: 'Mejor Estrategia',
    total_rebalances: 'Rebalances Totales',
    action_performance: '🏆 Rendimiento',
    action_detail: '📊 Detalle',
    action_risk: '⚠️ Riesgo',
    action_trading: '💰 Trading',
    action_equity: '📈 Equity',
    action_drawdown: '📉 Drawdown',
    action_export: 'Exportar',
    comparative_report: 'Informe comparativo',
    interpretation: '💡 Interpretación',
    max_dd_meaning: '• <strong>Max DD:</strong> Pérdida máxima desde el pico anterior',
    avg_recovery_meaning: '• <strong>Recup. Promedio:</strong> Tiempo medio para recuperar drawdowns',
    outperformed_benchmark: 'La estrategia <strong style="color: #10b981;">superó al benchmark</strong> en ${formatNumber(outperformance)}%. Esto indica que la selección activa de activos añadió valor respecto a mantener el índice.',
    underperformed_benchmark: 'La estrategia <strong style="color: #f87171;">quedó por debajo del benchmark</strong> en ${formatNumber(Math.abs(outperformance))}%. Considera revisar los parámetros o usar gestión pasiva.'
  },

  // View modes
  view_modes: {
    total_score: '📊 Score Total',
    short_term: '⚡ Corto Plazo (6m)',
    medium_term: '📈 Medio Plazo (18m)',
    long_term: '🎯 Largo Plazo (4a)',
    trend: '📉 Tendencia',
    momentum: '🚀 Momentum',
    risk: '⚠️ Riesgo',
    liquidity: '💧 Liquidez'
  },

  // Governance report
  governance: {
    title: '🏛️ Reporte de Gobernanza',
    status_compliant: 'COMPLIANT',
    status_with_alerts: 'CON ALERTAS',
    strategy_title: 'ESTRATEGIA',
    profile_label: 'Perfil',
    portfolio_summary_title: 'RESUMEN DE CARTERA',
    assets_label: 'Activos',
    max_position_label: 'Posición máx',
    top3_concentration_label: 'Top 3',
    violations_title: '⚠️ Violaciones Detectadas',
    violations_count: 'Violaciones Detectadas ({count})',
    portfolio_label: 'Cartera',
    value_label: 'Valor',
    limit_label: 'Límite',
    auto_corrections_applied: '✅ Se han aplicado correcciones automáticas para cumplir las reglas',
    warnings_title: 'ℹ️ Advertencias',
    warnings_count: 'Advertencias ({count})',
    classification_title: '📊 Clasificación'
  },

  // Backtest performance comparison
  backtest_performance: {
    comparison_title: '🏆 Comparativa de Rendimiento',
    strategy: 'Estrategia',
    total_return: 'Retorno total',
    cagr: 'CAGR',
    sharpe: 'Sharpe',
    max_dd: 'Max DD',
    win_rate: 'Win Rate',
    alpha: 'Alpha',
    beta: 'Beta'
  },

  // Stress test scenarios
  stress_scenarios: {
    minor_correction: 'Corrección Menor',
    minor_correction_desc: 'Caída típica mensual',
    moderate_correction: 'Corrección Moderada',
    moderate_correction_desc: 'Corrección trimestral',
    market_crash: 'Crash de Mercado',
    market_crash_desc: 'Crisis tipo COVID-19',
    systemic_crisis: 'Crisis Sistémica',
    systemic_crisis_desc: 'Crisis tipo 2008'
  },

  // Backtesting detailed sections
  backtest_detailed: {
    detailed_metrics_title: '📊 Métricas Detalladas',
    risk_analysis_title: '⚠️ Análisis de Riesgo',
    trading_metrics_title: '💰 Métricas de Trading',
    drawdown_analysis_title: '📉 Análisis de Drawdowns Profundo',
    strategy: 'Estrategia',
    volatility: 'Volatilidad',
    alpha: 'Alpha',
    beta: 'Beta',
    info_ratio: 'Info Ratio',
    tracking_error: 'Tracking Error',
    max_dd: 'Max DD',
    num_drawdowns: 'Nº Drawdowns',
    avg_recovery: 'Recup. Promedio',
    longest_dd: 'DD Más Largo',
    annual_vol: 'Vol. Anual',
    days: 'días',
    win_rate: 'Win Rate',
    profit_factor: 'Profit Factor',
    avg_win: 'Avg Win',
    avg_loss: 'Avg Loss',
    turnover: 'Turnover',
    costs: 'Costos',
    notes: '📌 Notas:',
    win_rate_note: '• <strong>Win Rate:</strong> % de periodos con retorno positivo',
    profit_factor_note: '• <strong>Profit Factor:</strong> Ratio ganancias/pérdidas (>1.5 es excelente)',
    turnover_note: '• <strong>Turnover:</strong> % de cartera rotado en cada rebalanceo',
    costs_note: '• <strong>Costos:</strong> Comisiones + slippage estimados (0.15% por operación)',
    avg_dd: 'DD Promedio',
    total_dds: 'Total DDs',
    worst_recovery: 'Peor Recup.',
    time_in_drawdown: 'Tiempo en drawdown',
    of_time: '% del tiempo'
  },

  // Governance warnings
  governance_warnings: {
    low_liquidity: '{ticker} tiene baja liquidez',
    extreme_volatility: '{ticker} tiene volatilidad extrema',
    high_correlation: 'Alta correlación entre {ticker1} y {ticker2}',
    excessive_concentration: 'Concentración excesiva en {sector}',
    concentration_risk: 'Riesgo concentración'
  },

  // Risk levels
  risk_levels: {
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
    na: 'N/A'
  },

  // Details
  details: {
    main_scores_title: "Scores Principales",
    total: "Total",
    trend: "Tendencia",
    momentum: "Momentum",
    risk: "Riesgo",
    liquidity: "Liquidez",

    time_analysis_title: "Análisis Temporal",
    short_term_6m: "Corto Plazo (6m)",
    medium_term_18m: "Medio Plazo (18m)",
    long_term_4y: "Largo Plazo (4a)",

    trend_analysis_title: "Análisis de Tendencia",
    position_score: "Score posición",
    consistency_score: "Score consistencia",
    adx_score: "Score ADX",
    ema50: "EMA50",
    ema200: "EMA200",

    momentum_analysis_title: "Análisis de Momentum",
    roc_6m: "ROC 6 meses",
    roc_12m: "ROC 12 meses",
    alpha_6m: "Alpha 6m",
    alpha_12m: "Alpha 12m",
    rsi: "RSI",

    risk_analysis_title: "Análisis de Riesgo",
    atr_pct: "ATR%",
    annual_volatility: "Volatilidad anual",
    relative_volatility: "Volatilidad relativa",
    max_drawdown_52w: "Max Drawdown 52w",

    anomalies_title: "Detección de Anomalías",
    anomalies_penalty_text: "Este activo presenta comportamiento inusual y ha recibido una penalización de -{{points}} puntos.",
    anomaly_type: "Tipo",
    anomaly_volume_zscore: "Z-Score Volumen",
    anomaly_sector_ratio: "Ratio vs Sector",
    anomaly_return_1d: "Retorno 1d",
    anomaly_normal_lt: "Normal < {{value}}",
    anomaly_normal_approx: "Normal ~{{value}}",

    liquidity_analysis_title: "Análisis de Liquidez",
    avg_vol_20d: "Vol. medio 20d",
    avg_vol_60d: "Vol. medio 60d",
    volume_ratio: "Ratio volumen",

    signal: "Señal",
    confidence: "Confianza"
  },

  // Governance module
  governance_module: {
    // Risk profile names
    risk_profile_conservative: "Conservador",
    risk_profile_moderate: "Moderado",
    risk_profile_aggressive: "Agresivo",

    // Risk profile descriptions
    risk_profile_conservative_desc: "Minimizar riesgo, priorizar estabilidad",
    risk_profile_moderate_desc: "Balance entre crecimiento y estabilidad",
    risk_profile_aggressive_desc: "Maximizar crecimiento, aceptar volatilidad",

    // Investor types
    investor_type_conservative: "Inversores con baja tolerancia al riesgo, cerca de jubilación",
    investor_type_moderate: "Inversores con horizonte medio (5-10 años)",
    investor_type_aggressive: "Inversores jóvenes con horizonte largo (10+ años)",

    // Strategy names
    strategy_momentum_aggressive: "Momentum Agresivo",
    strategy_trend_conservative: "Seguimiento de Tendencia Conservador",
    strategy_balanced: "Equilibrado",
    strategy_sector_rotation: "Rotación Sectorial",

    // Strategy objectives
    objective_momentum_aggressive: "Capturar tendencias de corto plazo con rotación activa",
    objective_trend_conservative: "Seguir tendencias estructurales con baja volatilidad",
    objective_balanced: "Balance óptimo entre crecimiento y estabilidad",
    objective_sector_rotation: "Rotar capital hacia sectores con momentum relativo",

    // Strategy characteristics
    char_high_turnover: "Alto turnover de cartera",
    char_sensitive_regime: "Sensible a cambios de régimen",
    char_active_monitoring: "Requiere seguimiento activo",
    char_high_tax_impact: "Mayor impacto fiscal por rotación",
    char_low_turnover: "Bajo turnover de cartera",
    char_high_stability: "Alta estabilidad",
    char_low_market_noise: "Menor sensibilidad a ruido de mercado",
    char_tax_efficient: "Eficiencia fiscal",
    char_factor_diversification: "Diversificación entre factores",
    char_regime_adaptability: "Adaptabilidad a diferentes regímenes",
    char_moderate_turnover: "Turnover moderado",
    char_optimal_cost_benefit: "Balance costo-beneficio óptimo",
    char_sector_concentration: "Concentración sectorial temporal",
    char_requires_macro: "Requiere análisis macro",
    char_high_liquidity: "Alta liquidez necesaria",
    char_cycle_sensitive: "Sensible a ciclos económicos",

    // Ideal conditions
    ideal_bull_trend: "Mercados en tendencia alcista (Risk-On)",
    ideal_low_volatility: "Baja volatilidad general",
    ideal_high_breadth: "Alta amplitud de mercado (>60% activos alcistas)",
    ideal_clear_trend: "Mercados en tendencia clara y sostenida",
    ideal_controlled_volatility: "Volatilidad controlada",
    ideal_expansive_cycle: "Ciclo económico expansivo",
    ideal_any_regime: "Cualquier régimen de mercado",
    ideal_simplify_decisions: "Inversores que buscan simplificar decisiones",
    ideal_medium_horizons: "Horizontes de inversión medios",
    ideal_cycle_changes: "Cambios claros en ciclo económico",
    ideal_sector_divergence: "Divergencia sectorial marcada",
    ideal_macro_catalysts: "Catalizadores macro identificables",

    // Strategy risks
    risk_sharp_reversals: "Reversiones bruscas en cambios de régimen",
    risk_whipsaws: "Whipsaws en mercados laterales",
    risk_high_transaction_costs: "Costos de transacción elevados",
    risk_sideways_underperformance: "Underperformance en mercados laterales",
    risk_late_entry: "Entrada tardía en nuevas tendencias",
    risk_late_exit: "Salida tardía al cambiar régimen",
    risk_no_maximize_rallies: "Puede no maximizar ganancias en rallies",
    risk_no_avoid_drawdowns: "No evita completamente drawdowns moderados",
    risk_high_sector_concentration: "Concentración sectorial elevada",
    risk_critical_rotation_timing: "Timing de rotación crítico",
    risk_higher_complexity: "Mayor complejidad de gestión",

    // Compliance violation messages
    violation_max_position: "{{ticker}} excede el peso máximo permitido",
    violation_top3_concentration: "Top 3 posiciones demasiado concentradas",
    violation_portfolio_volatility: "Volatilidad de cartera excede el límite",

    // Warning messages
    warning_min_position: "{{ticker}} tiene peso muy bajo (ineficiente)",
    warning_low_liquidity: "{{ticker}} tiene baja liquidez",
    warning_extreme_volatility: "{{ticker}} tiene volatilidad extrema",

    // Correction actions
    action_reduce_weight: "REDUCIR_PESO",
    action_remove: "ELIMINAR",
    action_renormalize: "RENORMALIZAR",

    // Correction reasons
    reason_weight_below_minimum: "Peso inferior al mínimo",
    reason_adjust_weights: "Ajuste de pesos para sumar 100%",

    // Strategy properties
    horizon: "Horizonte",
    expected_return: "Retorno Esperado",
    expected_volatility: "Volatilidad Esperada",
    max_drawdown: "Drawdown Máximo",
    sharpe_target: "Sharpe Objetivo",
    investor_profile: "Perfil Inversor",
    risk_tolerance: "Tolerancia al Riesgo",
    rebalance_frequency: "Frecuencia Rebalanceo",
    min_capital: "Capital Mínimo",
    benchmark: "Benchmark",

    // Risk tolerance levels
    risk_tolerance_high: "Alta",
    risk_tolerance_low: "Baja",
    risk_tolerance_medium: "Media",
    risk_tolerance_medium_high: "Media-Alta",

    // Investor profile types
    investor_profile_moderate_aggressive: "Moderado-Agresivo",

    // Rebalance frequencies
    rebalance_monthly: "Mensual",
    rebalance_quarterly: "Trimestral",
    rebalance_bimonthly: "Bimensual"
  },

  // Risk engine module
  risk_engine: {
    // Calculation methods
    method_parametric: "Paramétrico (Matriz de Covarianza)",
    method_historical: "Histórico",

    // Error messages
    error_insufficient_data: "Datos insuficientes para el análisis",
    error_min_assets: "Se requieren al menos 2 activos para análisis matricial",
    error_var_calculation: "Error en cálculo de VaR",
    error_cvar_calculation: "Error calculando CVaR",
    error_correlation_matrix: "Error generando matriz de correlaciones",
    error_invalid_covariance: "Matriz de covarianza inválida",
    error_risk_report: "Error generando reporte de riesgo",

    // Console warnings
    warning_invalid_data_pct: "{{pct}}% de datos inválidos detectados",
    warning_no_timestamps: "No hay timestamps disponibles, usando alineación por longitud (menos preciso)",
    warning_insufficient_common_dates: "Insuficientes fechas comunes ({{count}}). Mínimo: 30",
    warning_alignment_verified: "Alineación por fecha: {{count}} observaciones comunes",
    warning_non_symmetric_matrix: "Matriz no simétrica en ({{i}},{{j}}): diff={{diff}}",
    warning_negative_variances: "Varianzas negativas en diagonal",
    warning_nearly_identical: "Activos casi idénticos detectados",
    warning_autocorrelation_detected: "Autocorrelación detectada: ρ={{rho}}, ajustando escalado",
    warning_shrinkage_applied: "Shrinkage aplicado: δ={{delta}} (T={{T}}, N={{N}})"
  },

  // Market regime module
  market_regime: {
    // Regime names
    risk_on_name: "Risk-On",
    neutral_name: "Neutral",
    risk_off_name: "Risk-Off",

    // Regime descriptions
    risk_on_desc: "Mercado alcista, baja volatilidad, amplitud fuerte",
    neutral_desc: "Mercado lateral, sin tendencia clara",
    risk_off_desc: "Mercado bajista o alta volatilidad",

    // Trend descriptions
    trend_bullish: "Alcista",
    trend_bearish: "Bajista",
    trend_sideways: "Lateral",

    // Volatility descriptions
    vol_low: "Baja",
    vol_high: "Alta",
    vol_normal: "Normal",

    // Momentum descriptions
    momentum_positive: "Positivo",
    momentum_negative: "Negativo",
    momentum_neutral: "Neutral",

    // Breadth descriptions
    breadth_strong: "Fuerte (>60% activos alcistas)",
    breadth_weak: "Débil (<40% activos alcistas)",
    breadth_normal: "Normal (40-60%)",
    breadth_no_data: "Sin datos de amplitud",
    breadth_no_valid: "Sin datos válidos",

    // Error messages
    error_calculating_trend: "Error calculando tendencia",
    error_calculating_volatility: "Error calculando volatilidad",
    error_calculating_momentum: "Error calculando momentum",

    // Reason messages
    reason_insufficient_data: "Datos insuficientes para análisis de régimen"
  },

  // Portfolio Dashboard
  portfolio_dashboard: {
    title: '📊 Dashboard de Portfolio Tracking',
    select_portfolio: 'Seleccionar Portfolio',
    no_portfolio: '-- Crear nuevo portfolio --',
    save_portfolio: '💾 Guardar Portfolio',
    delete_portfolio: '🗑️ Eliminar',
    refresh: '🔄 Actualizar',
    attribution_button: '📈 Análisis de Atribución',
    attribution_title: '📈 Análisis de Atribución',
    attribution_export_pdf: '📄 Exportar PDF',
    attribution_export_excel: '📊 Exportar Excel',
    
    // Summary cards
    total_value: 'Valor Total',
    total_return: 'Retorno Total',
    sharpe_ratio: 'Sharpe Ratio',
    max_drawdown: 'Max Drawdown',
    volatility: 'Volatilidad',
    beta: 'Beta',

    // Tabs
    tab_equity: 'Curva de Equity',
    tab_drawdown: 'Drawdown',
    tab_benchmark: 'vs Benchmark',
    tab_allocation: 'Asignación',

    // Chart labels
    portfolio_value: 'Valor del Portfolio',
    drawdown: 'Drawdown',
    portfolio: 'Portfolio',
    benchmark: 'Benchmark',

    // Positions table
    positions_title: '📋 Posiciones Actuales',
    ticker: 'Ticker',
    name: 'Nombre',
    quantity: 'Cantidad',
    entry_price: 'Precio Entrada',
    current_price: 'Precio Actual',
    value: 'Valor',
    weight: 'Peso %',
    pnl: 'P&L',
    pnl_pct: 'P&L %',
    no_positions: 'No hay posiciones para mostrar',

    // Risk metrics
    risk_metrics_title: '⚠️ Métricas de Riesgo Detalladas',
    var_title: 'Value at Risk (VaR)',
    var_description: '95% confianza, 1 día',
    cvar_title: 'Conditional VaR (CVaR)',
    cvar_description: 'Expected Shortfall',
    sortino_title: 'Sortino Ratio',
    sortino_description: 'Ajustado por riesgo a la baja',
    calmar_title: 'Calmar Ratio',
    calmar_description: 'Retorno / Max DD',

    // Rebalancing
    rebalance_history_title: '🔄 Histórico de Rebalanceos',
    no_rebalances: 'No hay rebalanceos registrados',
    changes: 'cambios',
    reason: 'Motivo',

    // Alerts
    alerts_title: '⚠️ Alertas y Desviaciones',
    alert_large_drawdown: 'Drawdown significativo detectado: {{dd}}%',
    alert_volatility: 'Umbral de volatilidad excedido: {{volatility}}%',
    alert_concentration: 'Alta concentración en {{ticker}}: {{weight}}%',
    alert_underperformance: 'Underperformance vs benchmark: {{excess}}%',

    alerts_config_title: '📨 Configuración de Alertas',
    alerts_config_description: 'Define umbrales por estrategia y canales de envío.',
    alerts_volatility_threshold: 'Volatilidad (%)',
    alerts_drawdown_threshold: 'Drawdown (%)',
    alerts_score_threshold: 'Score mínimo',
    alerts_email_label: 'Email',
    alerts_webhook_label: 'Webhook',
    alerts_slack_label: 'Slack',
    alerts_teams_label: 'Teams',
    alerts_zapier_label: 'Zapier',
    alerts_notify_signals: 'Notificar señales fuertes',
    alerts_notify_rebalances: 'Notificar rebalanceos',
    alerts_notify_risk: 'Notificar eventos de riesgo',
    alerts_save_settings: '💾 Guardar configuración',
    alerts_settings_saved: 'Configuración de alertas guardada.',
    alerts_log_title: '📬 Historial de alertas',
    alerts_log_empty: 'No hay alertas recientes',
    alerts_log_status: 'Estado de entrega',
    alerts_clear_log: '🗑️ Limpiar Historial',
    alerts_clear_confirm: '¿Estás seguro de que deseas eliminar todas las alertas del historial?',
    alerts_log_cleared: 'Historial de alertas limpiado correctamente',
    alerts_clear_error: 'Error al limpiar el historial de alertas',

    // Messages
    enter_name: 'Ingresa un nombre para el portfolio:',
    no_portfolio_built: 'Primero construye un portfolio usando el constructor de carteras',
    saved_success: 'Portfolio guardado exitosamente',
    deleted_success: 'Portfolio eliminado',
    confirm_delete: '¿Estás seguro de eliminar el portfolio "{{name}}"?',

    // Errors
    error_loading: 'Error al cargar el portfolio',
    error_refreshing: 'Error al actualizar los datos',
    error_saving: 'Error al guardar el portfolio',
    error_deleting: 'Error al eliminar el portfolio'
  },

    // Alerts
  alerts: {
      strong_signals_title: '🔥 Señales fuertes detectadas',
      strong_signals_message: 'Top señales para {{strategy}}: {{signals}}',
      rebalance_title: '🔄 Rebalanceo ejecutado',
      rebalance_message: '{{portfolio}} rebalanceado. Motivo: {{reason}}. Cambios: {{changes}}',
      rebalance_no_changes: 'Sin cambios de posición',
      volatility_title: '⚠️ Umbral de volatilidad excedido',
      volatility_message: 'Volatilidad anualizada en {{volatility}}% (umbral {{threshold}}%).',
      drawdown_title: '⚠️ Umbral de drawdown excedido',
      drawdown_message: 'Drawdown máximo en {{drawdown}}% (umbral {{threshold}}%).',
      concentration_title: '⚠️ Riesgo de concentración detectado',
      concentration_message: 'Alta concentración en {{ticker}}: {{weight}}%',
      underperformance_title: 'ℹ️ Underperformance vs benchmark',
      underperformance_message: 'Exceso de retorno {{excess}}% vs benchmark.',
      delivery_opened_client: 'Cliente de email abierto',
      status_delivered: 'Entregado',
      status_failed: 'Fallido',
      status_partial: 'Parcialmente entregado',
      status_queued: 'En cola',
      status_skipped: 'Omitido'
    },


  // =====================================================
  // SUITE DE TESTS (Español Europeo)
  // =====================================================
  test: {
    // Test environment
    environment_initialized: 'Entorno de tests inicializado (Inglés Británico)',

    // Test status
    pass: 'CORRECTO',
    fail: 'FALLO',
    error: 'ERROR',
    expected: 'esperado',
    got: 'obtenido',
    diff: 'diferencia',

    // Test suite header
    suite_title: 'SUITE DE TESTS - GLOBAL SCANNER',

    // Test categories
    testing_sma: 'Probando SMA',
    testing_ema: 'Probando EMA',
    testing_rsi: 'Probando RSI',
    testing_atr: 'Probando ATR',
    testing_bollinger_bands: 'Probando Bandas de Bollinger',
    testing_adx: 'Probando ADX',
    testing_williams_r: 'Probando Williams %R',
    testing_roc: 'Probando ROC',
    testing_volatility: 'Probando Volatilidad',
    testing_max_drawdown: 'Probando Drawdown Máximo',
    testing_days_above_ema: 'Probando Días sobre EMA',
    testing_volume_ratio: 'Probando Ratio de Volumen',
    testing_validation: 'Probando Validación',
    testing_backtesting_engine: 'Probando Motor de Backtesting',
    testing_walk_forward: 'Probando Backtest Walk-Forward',
    testing_risk_engine: 'Probando Métricas del Risk Engine',
    testing_risk_edge_cases: 'Probando Casos Límite del Risk Engine',
    testing_correlation_symmetry: 'Probando Simetría de Matriz de Correlación',
    testing_shrinkage: 'Probando Activación de Shrinkage',

    // Test descriptions
    basic_sma: 'Cálculo básico de SMA',
    basic_ema_range: 'EMA básico dentro del rango esperado',
    ema_insufficient_data: 'EMA devuelve null con datos insuficientes',
    high_rsi_uptrend: 'RSI alto en tendencia alcista',
    low_rsi_downtrend: 'RSI bajo en tendencia bajista',
    neutral_rsi_sideways: 'RSI neutral en tendencia lateral',
    atr_reasonable_range: 'ATR en un rango razonable',
    atr_pct_reasonable_range: 'ATR% en un rango razonable',
    bb_upper_middle: 'BB superior > medio',
    bb_middle_lower: 'BB medio > inferior',
    bb_bandwidth_positive: 'Ancho de banda BB es positivo',
    bb_percent_b_range: 'BB %B en rango [0,1]',
    high_adx_trend: 'ADX alto en tendencia fuerte',
    low_adx_sideways: 'ADX bajo en mercado lateral',
    williams_r_high: 'Williams %R alto en máximos',
    williams_r_low: 'Williams %R bajo en mínimos',
    correct_roc: 'ROC correcto',
    low_volatility_stable: 'Baja volatilidad en serie estable',
    high_volatility_volatile: 'Alta volatilidad en serie volátil',
    correct_max_drawdown: 'Drawdown máximo correcto',
    high_days_above_ema: 'Muchos días sobre EMA en tendencia alcista',
    volume_ratio_rising: 'Ratio de Volumen > 1 con volumen creciente',
    rejects_empty_array: 'Rechaza array vacío',
    rejects_nan: 'Rechaza valores NaN',
    rejects_null: 'Rechaza valores null',
    rejects_insufficient_length: 'Rechaza longitud insuficiente',
    backtest_returns_metrics: 'Backtest devuelve métricas',
    backtest_produces_rebalances: 'Backtest produce rebalanceos',
    calmar_ratio_computed: 'Ratio de Calmar calculado',
    tax_drag_computed: 'Arrastre fiscal calculado',
    walk_forward_produces_windows: 'Walk-forward produce ventanas',
    in_sample_metrics: 'Métricas in-sample calculadas',
    out_sample_metrics: 'Métricas out-sample calculadas',
    portfolio_var_computed: 'VaR de cartera calculado',
    portfolio_cvar_computed: 'CVaR de cartera calculado',
    correlation_matrix_rows: 'Matriz de correlación tiene {{n}} filas',
    correlation_matrix_cols: 'Matriz de correlación tiene {{n}} columnas',
    single_asset_error: 'Activo único dispara error como se esperaba',
    single_asset_rejected: 'Activo único rechazado correctamente',
    insufficient_data_rejected: 'Debería rechazar datos insuficientes',
    insufficient_data_error: 'Error de datos insuficientes activado',
    correlation_symmetric: 'Matriz de correlación simétrica en ({{i}},{{j}})',
    diagonal_equals_one: 'Elemento diagonal {{i}} igual a 1.0',
    small_sample_detected: 'Muestra pequeña detectada',
    var_computed_small_sample: 'VaR calculado a pesar de muestra pequeña',

    // Stress testing
    testing_sector_stress: 'Probando Tests de Estrés Sectorial',
    testing_currency_stress: 'Probando Tests de Estrés de Divisa',
    testing_geopolitical_stress: 'Probando Tests de Estrés Geopolítico',
    testing_liquidity_stress: 'Probando Tests de Estrés de Liquidez',
    testing_multifactor_stress: 'Probando Tests de Estrés Multi-Factor',
    testing_stress_edge_cases: 'Probando Casos Límite de Stress Testing',

    // Results summary
    results: 'RESULTADOS',
    passed: 'correctos',
    failed: 'fallidos'
  },

  // Attribution Analysis
  attribution: {
    // Dashboard
    performance_attribution_analysis: 'Análisis de Atribución de Rendimiento',
    loading_attribution_analysis: 'Cargando análisis de atribución...',

    // Tabs
    allocation_vs_selection: 'Asignación vs Selección',
    factor_contribution: 'Contribución por Factor',
    asset_contribution: 'Contribución por Activo',
    period_attribution: 'Atribución Temporal',

    // Summary
    portfolio_return: 'Rendimiento del Portafolio',
    benchmark_return: 'Rendimiento del Benchmark',
    excess_return: 'Rendimiento Excedente',
    analysis_period: 'Periodo de Análisis',
    days: 'días',

    // Brinson Attribution
    brinson_fachler_attribution: 'Modelo Brinson-Fachler',
    brinson_description: 'Descompone el rendimiento activo en efectos de asignación sectorial y selección de activos',
    allocation_effect: 'Efecto de Asignación',
    selection_effect: 'Efecto de Selección',
    interaction_effect: 'Efecto de Interacción',
    total_active_return: 'Rendimiento Activo Total',
    interpretation: 'Interpretación',

    allocation_effect_by_sector: 'Efecto de Asignación por Sector',
    selection_effect_by_sector: 'Efecto de Selección por Sector',

    sector: 'Sector',
    portfolio_weight: 'Peso Portafolio',
    benchmark_weight: 'Peso Benchmark',
    difference: 'Diferencia',
    contribution: 'Contribución',
    return: 'Rendimiento',

    // Factor Attribution
    factor_contribution_analysis: 'Análisis de Contribución por Factor',
    factor_description: 'Identifica qué factores (Trend, Momentum, Risk, Liquidity) impulsaron el rendimiento',
    factor_data_not_available: 'Datos de factores no disponibles para este portafolio',

    trend: 'Tendencia',
    momentum: 'Momentum',
    risk: 'Riesgo',
    liquidity: 'Liquidez',

    top_trend_contributors: 'Principales Contribuyentes - Tendencia',
    top_momentum_contributors: 'Principales Contribuyentes - Momentum',
    top_risk_contributors: 'Principales Contribuyentes - Riesgo',
    top_liquidity_contributors: 'Principales Contribuyentes - Liquidez',

    factor_score: 'Score Factor',

    // Asset Contribution
    individual_asset_contribution: 'Contribución Individual por Activo',
    asset_contribution_description: 'Muestra cuánto contribuyó cada activo al rendimiento total del portafolio',
    top_contributors: 'Principales Contribuyentes',
    top_detractors: 'Principales Detractores',

    ticker: 'Ticker',
    name: 'Nombre',
    weight: 'Peso',

    // Period Attribution
    period_based_attribution: 'Atribución por Periodos',
    period_attribution_description: 'Desglosa el rendimiento por periodos temporales (mensual, trimestral, anual)',
    monthly_attribution: 'Atribución Mensual',
    quarterly_attribution: 'Atribución Trimestral',
    yearly_attribution: 'Atribución Anual',

    period: 'Periodo',

    // Market Events
    event_attribution: 'Atribución por Eventos de Mercado',
    event_attribution_description: 'Evalúa el rendimiento del portafolio durante eventos clave del mercado.',
    event_name: 'Evento',
    event_description: 'Descripción',
    start_date: 'Fecha Inicio',
    end_date: 'Fecha Fin',
    relative_performance: 'Rendimiento Relativo',
    outperformed: 'Superó',
    underperformed: 'Quedó por debajo',
    total_events: 'Total de eventos',
    avg_excess_return: 'Exceso medio',
    max_drawdown: 'Máx Drawdown',

    // Common
    error: 'Error',
    no_data: 'No hay datos disponibles'
  },

  // =====================================================
  // PHASE 6: UX IMPROVEMENTS
  // =====================================================

  // Help Panel
  help: {
    panel_title: 'Ayuda y Documentación',
    toggle: 'Alternar panel de ayuda',
    search_placeholder: 'Buscar en la ayuda...',
    search: 'Buscar ayuda',
    context: 'Contexto',
    quick_links: 'Enlaces Rápidos',
    beginner_guide: 'Guía de Principiantes',
    strategies: 'Estrategias',
    portfolio: 'Gestión de Cartera',
    governance: 'Gobernanza',
    loading: 'Cargando...',
    load_error: 'Error al cargar documentación',
    no_results: 'No se encontraron resultados',
    search_results: 'Resultados de búsqueda',
    goto_context: 'Ir al contexto',

    // Contexts
    contexts: {
      general: 'General',
      scanner: 'Escáner de Mercado',
      portfolio: 'Gestión de Cartera',
      governance: 'Gobernanza',
      attribution: 'Análisis de Atribución'
    },

    // General
    general: {
      welcome: 'Bienvenido',
      welcome_text: 'Global Quant Scanner Pro es un sistema cuantitativo avanzado para análisis multi-factor de mercados globales.',
      getting_started: 'Primeros Pasos',
      getting_started_text: '1. Selecciona un mercado\n2. Elige una estrategia\n3. Configura el método de asignación\n4. Ejecuta el análisis'
    },

    // Scanner
    scanner: {
      market_selection: 'Selección de Mercado',
      market_selection_text: 'Elige entre 14 mercados globales o analiza todos simultáneamente. Cada mercado incluye acciones líquidas de alta capitalización.',
      strategy_profiles: 'Perfiles de Estrategia',
      strategy_profiles_text: 'Cada estrategia pondera diferentes factores: Trend, Momentum, Risk y Liquidity. Momentum Agresivo favorece impulso reciente, Trend Conservador prioriza estabilidad.',
      scoring: 'Sistema de Puntuación',
      scoring_text: 'Score 0-100 basado en análisis multi-factor. >70 = Compra Fuerte, 60-70 = Compra, 40-60 = Mantener, <40 = Vender.'
    },

    // Portfolio
    portfolio: {
      allocation: 'Métodos de Asignación',
      allocation_text: 'Equal Weight (pesos iguales), Score-Weighted (proporcional al score), ERC (igual contribución de riesgo), Volatility Target (objetivo de volatilidad), Hybrid (combina ERC y score).',
      risk_metrics: 'Métricas de Riesgo',
      risk_metrics_text: 'VaR (Value at Risk al 95%), CVaR (pérdida esperada en cola), Sharpe (retorno ajustado por riesgo), Sortino (penaliza solo volatilidad a la baja), Max Drawdown (pérdida máxima desde pico).',
      rebalancing: 'Rebalanceo',
      rebalancing_text: 'Rebalanceo automático cuando las desviaciones de peso superan el threshold configurado (5% por defecto). Considera costos de transacción.'
    },

    // Governance
    governance: {
      limits: 'Límites de Posición',
      limits_text: 'Máximo 15% por activo, 30% por sector, 40% por país. Top 3 posiciones no pueden superar 40% combinadas. Estos límites se ajustan dinámicamente según condiciones de mercado.',
      risk_profiles: 'Perfiles de Riesgo',
      risk_profiles_text: 'Conservador (máx 10% posición, 15% volatilidad), Moderado (máx 15% posición, 20% volatilidad), Agresivo (máx 20% posición, 30% volatilidad).',
      compliance: 'Compliance',
      compliance_text: 'Validación automática de reglas de inversión. Correcciones automáticas de posiciones sobredimensionadas. Reportes de gobernanza completos.'
    },

    // Attribution
    attribution: {
      brinson: 'Análisis Brinson',
      brinson_text: 'Descomposición del exceso de retorno en: Allocation Effect (decisión de asignación sectorial), Selection Effect (elección de activos dentro de sectores), Interaction Effect (combinación de ambos).',
      factor: 'Atribución por Factor',
      factor_text: 'Contribución de cada factor de riesgo (Trend, Momentum, Risk, Liquidity) al rendimiento total del portafolio.'
    }
  },

  // Tooltips
  tooltips: {
    market_selector: 'Selecciona el mercado a analizar. "Todos los Mercados" ejecuta análisis global.',
    strategy_selector: 'Elige el perfil de estrategia que define la ponderación de factores.',
    allocation_method: 'Método para distribuir capital entre activos seleccionados.',
    risk_profile: 'Perfil de riesgo que define límites de concentración y volatilidad.',
    run_scan: 'Ejecuta el análisis cuantitativo con la configuración actual.',
    quant_score: 'Puntuación 0-100 basada en análisis multi-factor (Trend, Momentum, Risk, Liquidity).',
    signal: 'Señal de trading basada en score y umbrales configurados.',
    trend_score: 'Score de tendencia basado en medias móviles y ADX.',
    momentum_score: 'Score de momentum basado en RSI, ROC y Williams %R.',
    risk_score: 'Score de riesgo inverso basado en volatilidad, ATR y drawdown.',
    liquidity_score: 'Score de liquidez basado en volumen promedio.',
    sharpe_ratio: 'Ratio de Sharpe: retorno ajustado por riesgo. >1.0 es bueno, >2.0 es excelente.',
    max_drawdown: 'Máxima pérdida desde pico histórico.',
    var_95: 'Value at Risk al 95%: pérdida máxima esperada en 95% de los casos.',
    cvar_95: 'Conditional VaR: pérdida esperada cuando VaR es excedido.'
  },

  // Accessibility
  a11y: {
    main_header: 'Encabezado principal',
    main_content: 'Contenido principal',
    language_navigation: 'Selección de idioma',
    help_panel: 'Panel de ayuda',
    results_table: 'Tabla de resultados de escaneo',
    skip_to_content: 'Saltar al contenido principal',
    external_link: 'abre en nueva pestaña',
    data_table: 'Tabla de datos',
    required: 'requerido'
  },

  // Dynamic Governance
  dynamic_governance: {
    rec_extreme_vol: 'Volatilidad extrema detectada. Límites de posición significativamente reducidos. Considere reducir exposición global.',
    rec_high_vol: 'Régimen de alta volatilidad. Límites de posición ajustados. Monitoree drawdowns de cerca.',
    rec_extreme_corr: 'Correlación extrema detectada (riesgo de crowding). Beneficios de diversificación limitados. Reduzca concentración.',
    rec_high_corr: 'Régimen de alta correlación. Límites sectoriales ajustados para mejorar diversificación.',
    rec_high_stress: 'Condiciones de alto stress. Requisitos de liquidez incrementados. Considere posicionamiento defensivo.',
    rec_moderate_stress: 'Stress moderado detectado. Monitoree liquidez y umbrales de rebalanceo.',
    rec_favorable: 'Condiciones de mercado favorables. Límites ligeramente relajados para capturar oportunidades.'
  }

};
