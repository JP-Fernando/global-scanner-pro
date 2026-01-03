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
    downloading_historical: '🔎 Descargando históricos {current}–{end} de {total}'
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
    select_market_first: 'Selecciona un mercado antes de ejecutar el backtest'
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
    market_breadth: 'Amplitud de Mercado',
    benchmark_signals: 'Señales del Benchmark',
    vol_description: 'Volatilidad'
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
    view_details: 'Ver Detalles'
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
    action_export: '⬇️ Exportar CSV',
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
  }
};
