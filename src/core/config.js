// =====================================================
// STRATEGY AND PARAMETER CONFIGURATION
// =====================================================

import i18n from '../i18n/i18n.js';

// Backtesting Configuration
export const BACKTESTING_CONFIG = {
  INITIAL_CAPITAL: 10000,
  TRADING_DAYS_PER_YEAR: 252
};

export const STRATEGY_PROFILES = {
  momentum_aggressive: {
    get name() { return i18n.t('strategies.momentum_aggressive'); },
    get description() { return i18n.t('strategies.momentum_aggressive_desc'); },
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
      roc_short: 126,  // 6 months
      roc_long: 252    // 12 months
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
    get name() { return i18n.t('strategies.trend_conservative'); },
    get description() { return i18n.t('strategies.trend_conservative_desc'); },
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
    get name() { return i18n.t('strategies.balanced'); },
    get description() { return i18n.t('strategies.balanced_desc'); },
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
    get name() { return i18n.t('strategies.sector_rotation'); },
    get description() { return i18n.t('strategies.sector_rotation_desc'); },
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
      roc_short: 63,   // 3 months
      roc_long: 189    // 9 months
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

// Market benchmarks for alpha calculation
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

export default { BACKTESTING_CONFIG, STRATEGY_PROFILES, MARKET_BENCHMARKS };
