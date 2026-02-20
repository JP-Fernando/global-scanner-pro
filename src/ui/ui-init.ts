// =====================================================
// UI INITIALIZATION - Phase 6 Integration
// =====================================================

import { tooltipManager } from './tooltip-manager.js';
import { helpPanel } from './help-panel.js';
import { accessibilityManager } from './accessibility-manager.js';
import { performanceOptimizer, debounce, throttle } from './performance-optimizer.js';

/**
 * UIInitializer - Inicializa y coordina todos los componentes de UI mejorados
 *
 * Responsabilidades:
 * - Inicializar tooltips, help panel, accessibility
 * - Aplicar optimizaciones de rendimiento
 * - Coordinar interacciones entre componentes
 * - Gestionar estado global de UI
 */
export class UIInitializer {
  initialized: boolean;
  components: Record<string, any>;

  constructor() {
    this.initialized = false;
    this.components = {
      tooltips: null,
      helpPanel: null,
      accessibility: null,
      performance: null
    };

    this.init();
  }

  async init() {
    if (this.initialized) return;

    console.log('[UI] Initializing Phase 6 improvements...');

    try {
      // 1. Load CSS enhancements
      await this.loadEnhancedStyles();

      // 2. Initialize core components
      this.components.tooltips = tooltipManager;
      this.components.helpPanel = helpPanel;
      this.components.accessibility = accessibilityManager;
      this.components.performance = performanceOptimizer;

      // 3. Setup UI enhancements
      this.setupTooltipsOnControls();
      this.setupHelpContexts();
      this.optimizeEventHandlers();
      this.setupKeyboardShortcuts();

      // 4. Performance monitoring (development only)
      if (window.location.hostname === 'localhost') {
        this.components.performance.monitorLongTasks();
      }

      this.initialized = true;
      console.log('[UI] Phase 6 improvements initialized successfully ✓');

      // Announce to screen readers
      this.components.accessibility.announce('User interface enhancements loaded', 'polite');
    } catch (error) {
      console.error('[UI] Error initializing improvements:', error);
    }
  }

  /**
   * Carga los estilos CSS mejorados
   */
  loadEnhancedStyles() {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'src/ui/ui-enhancements.css';
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  /**
   * Configura tooltips en controles principales
   */
  setupTooltipsOnControls() {
    // Market selector
    const marketSelect = document.getElementById('market-selector') ||
                        document.querySelector('select[name="market"]');
    if (marketSelect) {
      this.components.tooltips.add(marketSelect, 'market_selector', { type: 'i18n' });
    }

    // Strategy selector
    const strategySelect = document.getElementById('strategy-selector') ||
                          document.querySelector('select[name="strategy"]');
    if (strategySelect) {
      this.components.tooltips.add(strategySelect, 'strategy_selector', { type: 'i18n' });
    }

    // Allocation method
    const allocationSelect = document.getElementById('allocation-selector') ||
                            document.querySelector('select[name="allocation"]');
    if (allocationSelect) {
      this.components.tooltips.add(allocationSelect, 'allocation_method', { type: 'i18n' });
    }

    // Risk profile
    const riskSelect = document.getElementById('risk-selector') ||
                      document.querySelector('select[name="risk"]');
    if (riskSelect) {
      this.components.tooltips.add(riskSelect, 'risk_profile', { type: 'i18n' });
    }

    // Run scan button
    const runButton = document.getElementById('run-scan') ||
                     document.querySelector('button[data-action="scan"]');
    if (runButton) {
      this.components.tooltips.add(runButton, 'run_scan', { type: 'i18n' });
    }

    // Table headers
    this.setupTableHeaderTooltips();
  }

  /**
   * Configura tooltips en headers de tabla
   */
  setupTableHeaderTooltips() {
    const headerMappings: Record<string, string> = {
      'Quant Score': 'quant_score',
      'Score': 'quant_score',
      'Signal': 'signal',
      'Señal': 'signal',
      'Trend': 'trend_score',
      'Tendencia': 'trend_score',
      'Momentum': 'momentum_score',
      'Risk': 'risk_score',
      'Riesgo': 'risk_score',
      'Liquidity': 'liquidity_score',
      'Liquidez': 'liquidity_score',
      'Sharpe': 'sharpe_ratio',
      'Max DD': 'max_drawdown',
      'VaR 95%': 'var_95',
      'CVaR 95%': 'cvar_95'
    };

    document.querySelectorAll('th').forEach(th => {
      const text = (th.textContent || '').trim();
      const tooltipKey = headerMappings[text];
      if (tooltipKey) {
        this.components.tooltips.add(th, tooltipKey, { type: 'i18n' });
      }
    });
  }

  /**
   * Configura contextos del panel de ayuda
   */
  setupHelpContexts() {
    // Marcar secciones con data-help-context
    const sections = [
      { selector: '.controls', context: 'scanner' },
      { selector: '.table-container', context: 'scanner' },
      { selector: '#portfolio-dashboard', context: 'portfolio' },
      { selector: '#attribution-dashboard', context: 'attribution' },
      { selector: '.governance-panel', context: 'governance' }
    ];

    sections.forEach(({ selector, context }) => {
      const element = document.querySelector(selector);
      if (element) {
        element.setAttribute('data-help-context', context);
      }
    });
  }

  /**
   * Optimiza event handlers con debouncing/throttling
   */
  optimizeEventHandlers() {
    // Search inputs - debounce
    document.querySelectorAll('input[type="search"], input[data-search]').forEach(input => {
      const htmlInput = input as HTMLInputElement;
      const originalHandler = htmlInput.oninput;
      if (originalHandler) {
        htmlInput.oninput = debounce(originalHandler as any, 300) as any;
      }
    });

    // Scroll events - throttle
    document.querySelectorAll('.scrollable, [data-scroll]').forEach(container => {
      const htmlContainer = container as HTMLElement;
      const originalHandler = htmlContainer.onscroll;
      if (originalHandler) {
        htmlContainer.onscroll = throttle(originalHandler as any, 100) as any;
      }
    });

    // Window resize - debounce
    const originalResize = window.onresize;
    if (originalResize) {
      window.onresize = debounce(originalResize as any, 200) as any;
    }
  }

  /**
   * Configura atajos de teclado personalizados
   */
  setupKeyboardShortcuts() {
    // Ctrl+Enter para ejecutar escaneo
    this.components.accessibility.registerShortcut('ctrl+enter', () => {
      const runButton = document.getElementById('run-scan') ||
                       document.querySelector('button[data-action="scan"]');
      if (runButton) runButton.click();
    }, 'Run scan');

    // Ctrl+B para construir cartera
    this.components.accessibility.registerShortcut('ctrl+b', () => {
      const buildButton = document.getElementById('build-portfolio') ||
                         document.querySelector('button[data-action="build"]');
      if (buildButton) buildButton.click();
    }, 'Build portfolio');

    // Ctrl+E para exportar
    this.components.accessibility.registerShortcut('ctrl+e', () => {
      const exportButton = document.getElementById('export-csv') ||
                          document.querySelector('button[data-action="export"]');
      if (exportButton) exportButton.click();
    }, 'Export CSV');
  }

  /**
   * Actualiza UI cuando cambia el idioma
   */
  onLanguageChange() {
    // Refrescar tooltips
    this.components.tooltips.refresh();

    // Refrescar panel de ayuda
    if (this.components.helpPanel.isOpen) {
      this.components.helpPanel.updateContent();
    }

    // Refrescar accesibilidad
    this.components.accessibility.refresh();
  }

  /**
   * Cleanup cuando la página se descarga
   */
  destroy() {
    Object.values(this.components).forEach(component => {
      if (component && typeof component.destroy === 'function') {
        component.destroy();
      }
    });

    this.initialized = false;
  }

  /**
   * API pública: Obtener componente
   */
  getComponent(name: string) {
    return this.components[name];
  }

  /**
   * API pública: Mostrar notificación accesible
   */
  notify(message: string, type = 'info') {
    // Screen reader announcement
    const priority = type === 'error' ? 'assertive' : 'polite';
    this.components.accessibility.announce(message, priority);

    // Visual notification (if toast component exists)
    if ((window as any).showToast) {
      (window as any).showToast(message, type);
    }
  }

  /**
   * API pública: Obtener métricas de rendimiento
   */
  getPerformanceMetrics() {
    return this.components.performance.getPerformanceMetrics();
  }
}

// =====================================================
// AUTO-INITIALIZATION
// =====================================================

let uiInitializer: UIInitializer | null = null;

// Initialize cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    uiInitializer = new UIInitializer();
  });
} else {
  // DOM ya está listo
  uiInitializer = new UIInitializer();
}

// Cleanup antes de descargar página
window.addEventListener('beforeunload', () => {
  if (uiInitializer) {
    uiInitializer.destroy();
  }
});

// Exportar instancia
export default uiInitializer;
export { uiInitializer, debounce, throttle };
