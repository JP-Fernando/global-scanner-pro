// =====================================================
// CONFIGURACIÓN DE ESTRATEGIAS Y PARÁMETROS
// =====================================================

export const STRATEGY_PROFILES = {
  momentum_aggressive: {
    name: "Momentum Agresivo",
    description: "Favorece activos con fuerte impulso reciente",
    weights: {
      trend: 0.25,
      momentum: 0.45,
      risk: 0.15,
      liquidity: 0.15
    },
    indicators: {
      ema_short: 20,
      ema_medium: 50,
      ema_long: 200,
      rsi_period: 14,
      atr_period: 14,
      bb_period: 20,
      adx_period: 14,
      williams_period: 14,
      roc_short: 126,  // 6 meses
      roc_long: 252    // 12 meses
    },
    filters: {
      min_volume_20d: 5000,
      min_volume_60d: 2000,
      max_atr_pct: 25.0,
      min_days_history: 126,
      max_drawdown_52w: 85  // %
    },
    signals: {
      strong_buy: 80,
      buy: 65,
      hold_upper: 45,
      hold_lower: 35,
      sell: 35
    }
  },

  trend_conservative: {
    name: "Trend-Following Conservador",
    description: "Prioriza tendencias estables y baja volatilidad",
    weights: {
      trend: 0.45,
      momentum: 0.20,
      risk: 0.25,
      liquidity: 0.10
    },
    indicators: {
      ema_short: 20,
      ema_medium: 50,
      ema_long: 200,
      rsi_period: 14,
      atr_period: 14,
      bb_period: 20,
      adx_period: 14,
      williams_period: 14,
      roc_short: 126,
      roc_long: 252
    },
    filters: {
      min_volume_20d: 5000,
      min_volume_60d: 3000,
      max_atr_pct: 10.0,
      min_days_history: 300,
      max_drawdown_52w: 60
    },
    signals: {
      strong_buy: 75,
      buy: 60,
      hold_upper: 50,
      hold_lower: 40,
      sell: 40
    }
  },

  balanced: {
    name: "Equilibrado",
    description: "Balance entre crecimiento y estabilidad",
    weights: {
      trend: 0.30,
      momentum: 0.30,
      risk: 0.25,
      liquidity: 0.15
    },
    indicators: {
      ema_short: 20,
      ema_medium: 50,
      ema_long: 200,
      rsi_period: 14,
      atr_period: 14,
      bb_period: 20,
      adx_period: 14,
      williams_period: 14,
      roc_short: 126,
      roc_long: 252
    },
    filters: {
      min_volume_20d: 5000,
      min_volume_60d: 2000,
      max_atr_pct: 25.0,
      min_days_history: 150,
      max_drawdown_52w: 85
    },
    signals: {
      strong_buy: 78,
      buy: 62,
      hold_upper: 48,
      hold_lower: 38,
      sell: 38
    }
  },

  sector_rotation: {
    name: "Rotación Sectorial",
    description: "Optimizado para rotación entre sectores",
    weights: {
      trend: 0.20,
      momentum: 0.40,
      risk: 0.20,
      liquidity: 0.20
    },
    indicators: {
      ema_short: 20,
      ema_medium: 50,
      ema_long: 200,
      rsi_period: 14,
      atr_period: 14,
      bb_period: 20,
      adx_period: 14,
      williams_period: 14,
      roc_short: 63,   // 3 meses
      roc_long: 189    // 9 meses
    },
    filters: {
      min_volume_20d: 20000,
      min_volume_60d: 15000,
      max_atr_pct: 13.0,
      min_days_history: 250,
      max_drawdown_52w: 70
    },
    signals: {
      strong_buy: 82,
      buy: 68,
      hold_upper: 50,
      hold_lower: 40,
      sell: 40
    }
  }
};

// Benchmarks por mercado para cálculo de alpha
export const MARKET_BENCHMARKS = {
  '.MC': '^IBEX',      // IBEX 35
  '.PA': '^FCHI',      // CAC 40
  '.DE': '^GDAXI',     // DAX
  '.L': '^FTSE',       // FTSE 100
  '.MI': 'FTSEMIB.MI', // FTSE MIB
  '': '^GSPC',         // S&P 500
  '.SA': '^BVSP',      // Bovespa
  '.MX': '^MXX',       // IPC Mexico
  '.TO': '^GSPTSE',    // S&P/TSX
  '.T': '^N225',       // Nikkei 225
  '.HK': '^HSI',       // Hang Seng
  '.SS': '000001.SS',  // SSE Composite
  '.SZ': '399001.SZ',  // SZSE Component
  '.KS': '^KS11'       // KOSPI
};

export default { STRATEGY_PROFILES, MARKET_BENCHMARKS };
