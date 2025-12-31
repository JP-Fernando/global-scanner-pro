// =====================================================
// GOVERNANCE & COMPLIANCE ENGINE
// =====================================================

// =====================================================
// REGLAS DE INVERSIÓN (INVESTMENT RULES)
// =====================================================

export const INVESTMENT_RULES = {
  // Límites de concentración
  max_position_weight: 0.15,        // 15% máximo por activo
  min_position_weight: 0.02,        // 2% mínimo (evitar micro-posiciones)
  max_sector_weight: 0.30,          // 30% máximo por sector
  max_country_weight: 0.40,         // 40% máximo por país
  max_top3_concentration: 0.40,     // Top 3 posiciones no pueden sumar más de 40%

  // Liquidez obligatoria
  min_daily_volume: 50000,          // Volumen diario mínimo
  min_market_cap: null,             // Capitalización mínima (null = no aplicar)

  // Control de correlación
  max_pairwise_correlation: 0.85,   // No dos activos con correlación > 0.85

  // Control de riesgo agregado
  max_portfolio_volatility: 25,     // Volatilidad máxima de cartera (%)
  max_portfolio_drawdown: 35,       // Drawdown máximo estimado (%)

  // Rebalanceo
  rebalance_threshold: 0.05,        // Rebalancear si un activo se desvía > 5%

  // Exclusiones automáticas
  exclusions: {
    outliers: true,                 // Excluir outliers estadísticos
    penny_stocks: true,             // Excluir acciones < $5 (si disponible)
    low_liquidity: true,            // Excluir si volumen < min_daily_volume
    high_risk: true                 // Excluir si volatilidad > 50%
  }
};

// =====================================================
// PERFILES DE RIESGO PERSONALIZADOS
// =====================================================

export const RISK_PROFILES = {
  conservative: {
    name: "Conservador",
    description: "Minimizar riesgo, priorizar estabilidad",
    rules: {
      ...INVESTMENT_RULES,
      max_position_weight: 0.10,
      max_portfolio_volatility: 15,
      max_portfolio_drawdown: 20,
      min_score_threshold: 70
    },
    investor_type: "Inversores con baja tolerancia al riesgo, cerca de jubilación"
  },

  moderate: {
    name: "Moderado",
    description: "Balance entre crecimiento y estabilidad",
    rules: {
      ...INVESTMENT_RULES,
      max_position_weight: 0.15,
      max_portfolio_volatility: 20,
      max_portfolio_drawdown: 30,
      min_score_threshold: 60
    },
    investor_type: "Inversores con horizonte medio (5-10 años)"
  },

  aggressive: {
    name: "Agresivo",
    description: "Maximizar crecimiento, aceptar volatilidad",
    rules: {
      ...INVESTMENT_RULES,
      max_position_weight: 0.20,
      max_portfolio_volatility: 30,
      max_portfolio_drawdown: 45,
      min_score_threshold: 50
    },
    investor_type: "Inversores jóvenes con horizonte largo (10+ años)"
  }
};

// =====================================================
// DOCUMENTACIÓN DE ESTRATEGIAS
// =====================================================

export const STRATEGY_DOCUMENTATION = {
  momentum_aggressive: {
    name: "Momentum Agresivo",
    objective: "Capturar tendencias de corto plazo con rotación activa",
    horizon: "3-12 meses",
    expected_return: "15-25% anual",
    expected_volatility: "18-25%",
    max_drawdown: "25-35%",
    sharpe_target: "> 1.0",
    investor_profile: "Agresivo",
    risk_tolerance: "Alta",
    rebalance_frequency: "Mensual",
    min_capital: "€10,000",
    benchmark: "Índice + 5%",

    characteristics: [
      "Alto turnover de cartera",
      "Sensible a cambios de régimen",
      "Requiere seguimiento activo",
      "Mayor impacto fiscal por rotación"
    ],

    ideal_conditions: [
      "Mercados en tendencia alcista (Risk-On)",
      "Baja volatilidad general",
      "Alta amplitud de mercado (>60% activos alcistas)"
    ],

    risks: [
      "Reversiones bruscas en cambios de régimen",
      "Whipsaws en mercados laterales",
      "Costos de transacción elevados"
    ]
  },

  trend_conservative: {
    name: "Trend-Following Conservador",
    objective: "Seguir tendencias estructurales con baja volatilidad",
    horizon: "12-36 meses",
    expected_return: "8-15% anual",
    expected_volatility: "10-15%",
    max_drawdown: "15-25%",
    sharpe_target: "> 1.2",
    investor_profile: "Conservador",
    risk_tolerance: "Baja",
    rebalance_frequency: "Trimestral",
    min_capital: "€20,000",
    benchmark: "Índice + 2%",

    characteristics: [
      "Bajo turnover de cartera",
      "Alta estabilidad",
      "Menor sensibilidad a ruido de mercado",
      "Eficiencia fiscal"
    ],

    ideal_conditions: [
      "Mercados en tendencia clara y sostenida",
      "Volatilidad controlada",
      "Ciclo económico expansivo"
    ],

    risks: [
      "Underperformance en mercados laterales",
      "Entrada tardía en nuevas tendencias",
      "Salida tardía al cambiar régimen"
    ]
  },

  balanced: {
    name: "Equilibrado",
    objective: "Balance óptimo entre crecimiento y estabilidad",
    horizon: "6-24 meses",
    expected_return: "10-18% anual",
    expected_volatility: "12-18%",
    max_drawdown: "20-30%",
    sharpe_target: "> 1.0",
    investor_profile: "Moderado",
    risk_tolerance: "Media",
    rebalance_frequency: "Bimensual",
    min_capital: "€15,000",
    benchmark: "Índice + 3%",

    characteristics: [
      "Diversificación entre factores",
      "Adaptabilidad a diferentes regímenes",
      "Turnover moderado",
      "Balance costo-beneficio óptimo"
    ],

    ideal_conditions: [
      "Cualquier régimen de mercado",
      "Inversores que buscan simplificar decisiones",
      "Horizontes de inversión medios"
    ],

    risks: [
      "Puede no maximizar ganancias en rallies",
      "No evita completamente drawdowns moderados"
    ]
  },

  sector_rotation: {
    name: "Rotación Sectorial",
    objective: "Rotar capital hacia sectores con momentum relativo",
    horizon: "3-9 meses",
    expected_return: "12-22% anual",
    expected_volatility: "15-22%",
    max_drawdown: "20-32%",
    sharpe_target: "> 0.9",
    investor_profile: "Moderado-Agresivo",
    risk_tolerance: "Media-Alta",
    rebalance_frequency: "Mensual",
    min_capital: "€25,000",
    benchmark: "Índice + 4%",

    characteristics: [
      "Concentración sectorial temporal",
      "Requiere análisis macro",
      "Alta liquidez necesaria",
      "Sensible a ciclos económicos"
    ],

    ideal_conditions: [
      "Cambios claros en ciclo económico",
      "Divergencia sectorial marcada",
      "Catalizadores macro identificables"
    ],

    risks: [
      "Concentración sectorial elevada",
      "Timing de rotación crítico",
      "Mayor complejidad de gestión"
    ]
  }
};

// =====================================================
// VALIDACIÓN DE CUMPLIMIENTO (COMPLIANCE)
// =====================================================

export const validateCompliance = (portfolio, rules = INVESTMENT_RULES) => {
  const violations = [];
  const warnings = [];

  // 1. Validar concentración por activo
  portfolio.forEach(asset => {
    if (asset.weight > rules.max_position_weight) {
      violations.push({
        type: 'MAX_POSITION',
        severity: 'HIGH',
        asset: asset.ticker,
        value: (asset.weight * 100).toFixed(2) + '%',
        limit: (rules.max_position_weight * 100) + '%',
        message: `${asset.ticker} excede el peso máximo permitido`
      });
    }

    if (asset.weight < rules.min_position_weight) {
      warnings.push({
        type: 'MIN_POSITION',
        severity: 'LOW',
        asset: asset.ticker,
        value: (asset.weight * 100).toFixed(2) + '%',
        limit: (rules.min_position_weight * 100) + '%',
        message: `${asset.ticker} tiene peso muy bajo (ineficiente)`
      });
    }
  });

  // 2. Validar concentración top 3
  const sortedByWeight = [...portfolio].sort((a, b) => b.weight - a.weight);
  const top3Weight = sortedByWeight.slice(0, 3).reduce((sum, a) => sum + a.weight, 0);

  if (top3Weight > rules.max_top3_concentration) {
    violations.push({
      type: 'TOP3_CONCENTRATION',
      severity: 'MEDIUM',
      value: (top3Weight * 100).toFixed(2) + '%',
      limit: (rules.max_top3_concentration * 100) + '%',
      message: 'Top 3 posiciones demasiado concentradas'
    });
  }

  // 3. Validar correlaciones (si disponibles)
  // Esto requeriría la matriz de correlaciones, lo hacemos opcional

  // 4. Validar volatilidad de cartera
  const portfolioVol = parseFloat(portfolio[0]?.portfolio_vol || 20);
  if (portfolioVol > rules.max_portfolio_volatility) {
    violations.push({
      type: 'PORTFOLIO_VOLATILITY',
      severity: 'HIGH',
      value: portfolioVol.toFixed(2) + '%',
      limit: rules.max_portfolio_volatility + '%',
      message: 'Volatilidad de cartera excede el límite'
    });
  }

  // 5. Validar liquidez
  portfolio.forEach(asset => {
    const avgVol = parseFloat(asset.details?.liquidity?.avgVol20 || 0);
    if (rules.exclusions.low_liquidity && avgVol < rules.min_daily_volume) {
      warnings.push({
        type: 'LOW_LIQUIDITY',
        severity: 'MEDIUM',
        asset: asset.ticker,
        value: avgVol.toFixed(0),
        limit: rules.min_daily_volume,
        message: `${asset.ticker} tiene baja liquidez`
      });
    }
  });

  // 6. Validar outliers de riesgo
  portfolio.forEach(asset => {
    const vol = parseFloat(asset.volatility || 20);
    if (rules.exclusions.high_risk && vol > 50) {
      violations.push({
        type: 'HIGH_RISK',
        severity: 'HIGH',
        asset: asset.ticker,
        value: vol.toFixed(2) + '%',
        limit: '50%',
        message: `${asset.ticker} tiene volatilidad extrema`
      });
    }
  });

  return {
    compliant: violations.length === 0,
    violations,
    warnings,
    summary: {
      total_issues: violations.length + warnings.length,
      critical: violations.filter(v => v.severity === 'HIGH').length,
      warnings: warnings.length
    }
  };
};

// =====================================================
// APLICAR CORRECCIONES AUTOMÁTICAS
// =====================================================

export const applyComplianceCorrections = (portfolio, rules = INVESTMENT_RULES) => {
  let correctedPortfolio = [...portfolio];
  const corrections = [];

  // 1. Corregir pesos que exceden el máximo
  correctedPortfolio = correctedPortfolio.map(asset => {
    if (asset.weight > rules.max_position_weight) {
      corrections.push({
        asset: asset.ticker,
        action: 'REDUCE_WEIGHT',
        from: (asset.weight * 100).toFixed(2) + '%',
        to: (rules.max_position_weight * 100) + '%'
      });

      return {
        ...asset,
        weight: rules.max_position_weight,
        weight_pct: (rules.max_position_weight * 100).toFixed(2)
      };
    }
    return asset;
  });

  // 2. Eliminar activos por debajo del mínimo
  const beforeLength = correctedPortfolio.length;
  correctedPortfolio = correctedPortfolio.filter(asset => {
    if (asset.weight < rules.min_position_weight) {
      corrections.push({
        asset: asset.ticker,
        action: 'REMOVE',
        reason: 'Peso inferior al mínimo'
      });
      return false;
    }
    return true;
  });

  // 3. Re-normalizar pesos
  const totalWeight = correctedPortfolio.reduce((sum, a) => sum + a.weight, 0);
  if (Math.abs(totalWeight - 1.0) > 0.001) {
    correctedPortfolio = correctedPortfolio.map(asset => ({
      ...asset,
      weight: asset.weight / totalWeight,
      weight_pct: ((asset.weight / totalWeight) * 100).toFixed(2)
    }));

    corrections.push({
      action: 'RENORMALIZE',
      reason: 'Ajuste de pesos para sumar 100%'
    });
  }

  return {
    portfolio: correctedPortfolio,
    corrections,
    removed: beforeLength - correctedPortfolio.length
  };
};

// =====================================================
// GENERAR REPORTE DE GOBERNANZA
// =====================================================

export const generateGovernanceReport = (portfolio, strategy, rules = INVESTMENT_RULES) => {
  const compliance = validateCompliance(portfolio, rules);
  const strategyDoc = STRATEGY_DOCUMENTATION[strategy] || {};

  return {
    timestamp: new Date().toISOString(),
    strategy: {
      name: strategyDoc.name || strategy,
      profile: strategyDoc.investor_profile || 'Unknown',
      objective: strategyDoc.objective || 'N/A'
    },
    compliance,
    portfolio_summary: {
      n_assets: portfolio.length,
      total_weight: portfolio.reduce((sum, a) => sum + a.weight, 0).toFixed(4),
      max_position: Math.max(...portfolio.map(a => a.weight)).toFixed(4),
      min_position: Math.min(...portfolio.map(a => a.weight)).toFixed(4),
      top3_concentration: portfolio
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3)
        .reduce((sum, a) => sum + a.weight, 0)
        .toFixed(4)
    },
    rules_applied: {
      max_position_weight: rules.max_position_weight,
      max_portfolio_volatility: rules.max_portfolio_volatility,
      min_daily_volume: rules.min_daily_volume
    }
  };
};

export default {
  INVESTMENT_RULES,
  RISK_PROFILES,
  STRATEGY_DOCUMENTATION,
  validateCompliance,
  applyComplianceCorrections,
  generateGovernanceReport
};
