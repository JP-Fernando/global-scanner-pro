// =====================================================
// HELP PANEL - Contextual Documentation Panel
// =====================================================

import { i18n } from '../i18n/i18n.js';

/**
 * HelpPanel - Panel lateral de ayuda contextual con búsqueda y navegación
 *
 * Features:
 * - Panel colapsable/expandible
 * - Contenido contextual según sección activa
 * - Búsqueda de documentación
 * - Navegación por categorías
 * - Links a documentación completa
 * - Ejemplos interactivos
 */
export class HelpPanel {
  constructor() {
    this.isOpen = false;
    this.currentContext = 'general';
    this.panelElement = null;
    this.searchIndex = null;

    this.init();
  }

  init() {
    this.createPanelElement();
    this.buildSearchIndex();
    this.attachEventListeners();
    this.loadFromLocalStorage();
  }

  /**
   * Crea la estructura del panel de ayuda
   */
  createPanelElement() {
    const panel = document.createElement('div');
    panel.className = 'qsp-help-panel';
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', i18n.t('help.panel_title'));

    panel.innerHTML = `
      <div class="help-panel-header">
        <div class="help-panel-title">
          <span class="help-icon">📚</span>
          <h3>${i18n.t('help.panel_title') || 'Ayuda'}</h3>
        </div>
        <button class="help-panel-toggle" aria-label="${i18n.t('help.toggle') || 'Toggle help'}">
          <span class="toggle-icon">▶</span>
        </button>
      </div>

      <div class="help-panel-content">
        <!-- Search bar -->
        <div class="help-search">
          <input
            type="text"
            class="help-search-input"
            placeholder="${i18n.t('help.search_placeholder') || 'Buscar en la ayuda...'}"
            aria-label="${i18n.t('help.search') || 'Search help'}"
          />
          <span class="help-search-icon">🔍</span>
        </div>

        <!-- Context indicator -->
        <div class="help-context-indicator">
          <span class="context-label">${i18n.t('help.context') || 'Contexto'}:</span>
          <span class="context-value" id="help-context-value">General</span>
        </div>

        <!-- Content area -->
        <div class="help-content-area" id="help-content-area">
          <!-- Contenido dinámico -->
        </div>

        <!-- Quick links -->
        <div class="help-quick-links">
          <h4>${i18n.t('help.quick_links') || 'Enlaces Rápidos'}</h4>
          <div class="quick-links-grid">
            <a href="docs/guia-principiantes.md" class="quick-link" data-doc="beginner">
              📖 ${i18n.t('help.beginner_guide') || 'Guía de Principiantes'}
            </a>
            <a href="docs/estrategias.md" class="quick-link" data-doc="strategies">
              🎯 ${i18n.t('help.strategies') || 'Estrategias'}
            </a>
            <a href="docs/cartera-riesgo.md" class="quick-link" data-doc="portfolio">
              💼 ${i18n.t('help.portfolio') || 'Gestión de Cartera'}
            </a>
            <a href="docs/gobernanza.md" class="quick-link" data-doc="governance">
              ⚖️ ${i18n.t('help.governance') || 'Gobernanza'}
            </a>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.panelElement = panel;
  }

  /**
   * Adjunta event listeners
   */
  attachEventListeners() {
    // Toggle panel
    const toggleBtn = this.panelElement.querySelector('.help-panel-toggle');
    toggleBtn.addEventListener('click', () => this.toggle());

    // Search input
    const searchInput = this.panelElement.querySelector('.help-search-input');
    searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

    // Quick links
    const quickLinks = this.panelElement.querySelectorAll('.quick-link');
    quickLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const docType = link.getAttribute('data-doc');
        this.loadDocumentation(docType);
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // F1 para abrir/cerrar ayuda
      if (e.key === 'F1') {
        e.preventDefault();
        this.toggle();
      }
      // Ctrl+Shift+H también abre/cierra
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        this.toggle();
      }
    });

    // Detectar cambios de contexto en la UI
    this.observeContextChanges();
  }

  /**
   * Abre/cierra el panel
   */
  toggle() {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.panelElement.classList.add('help-panel-open');
      this.panelElement.querySelector('.toggle-icon').textContent = '◀';
      this.updateContent();
    } else {
      this.panelElement.classList.remove('help-panel-open');
      this.panelElement.querySelector('.toggle-icon').textContent = '▶';
    }

    // Guardar preferencia
    localStorage.setItem('qsp-help-panel-open', this.isOpen);
  }

  /**
   * Actualiza contenido según contexto actual
   */
  updateContent() {
    const contentArea = document.getElementById('help-content-area');
    const contextValue = document.getElementById('help-context-value');

    const content = this.getContextualContent(this.currentContext);
    contextValue.textContent = content.title;
    contentArea.innerHTML = this.renderContent(content);
  }

  /**
   * Obtiene contenido contextual según la sección activa
   */
  getContextualContent(context) {
    const helpContent = {
      general: {
        title: i18n.t('help.contexts.general') || 'General',
        sections: [
          {
            title: i18n.t('help.general.welcome') || 'Bienvenido',
            content: i18n.t('help.general.welcome_text') || 'Este es un sistema cuantitativo avanzado para análisis de mercados.',
            icon: '👋'
          },
          {
            title: i18n.t('help.general.getting_started') || 'Primeros Pasos',
            content: i18n.t('help.general.getting_started_text') || '1. Selecciona un mercado\n2. Elige una estrategia\n3. Ejecuta el análisis',
            icon: '🚀'
          }
        ]
      },
      scanner: {
        title: i18n.t('help.contexts.scanner') || 'Escáner de Mercado',
        sections: [
          {
            title: i18n.t('help.scanner.market_selection') || 'Selección de Mercado',
            content: i18n.t('help.scanner.market_selection_text') || 'Elige entre 14 mercados globales o analiza todos simultáneamente.',
            icon: '🌍'
          },
          {
            title: i18n.t('help.scanner.strategy_profiles') || 'Perfiles de Estrategia',
            content: i18n.t('help.scanner.strategy_profiles_text') || 'Cada estrategia pondera diferentes factores (trend, momentum, risk).',
            icon: '🎯'
          },
          {
            title: i18n.t('help.scanner.scoring') || 'Sistema de Puntuación',
            content: i18n.t('help.scanner.scoring_text') || 'Score 0-100 basado en análisis multi-factor de tendencia, momentum y riesgo.',
            icon: '📊'
          }
        ]
      },
      portfolio: {
        title: i18n.t('help.contexts.portfolio') || 'Gestión de Cartera',
        sections: [
          {
            title: i18n.t('help.portfolio.allocation') || 'Métodos de Asignación',
            content: i18n.t('help.portfolio.allocation_text') || 'Equal Weight, Score-Weighted, ERC, Volatility Target, Hybrid.',
            icon: '💼'
          },
          {
            title: i18n.t('help.portfolio.risk_metrics') || 'Métricas de Riesgo',
            content: i18n.t('help.portfolio.risk_metrics_text') || 'VaR, CVaR, Sharpe, Sortino, Max Drawdown, correlaciones.',
            icon: '📉'
          },
          {
            title: i18n.t('help.portfolio.rebalancing') || 'Rebalanceo',
            content: i18n.t('help.portfolio.rebalancing_text') || 'Automático cuando las desviaciones superan el threshold configurado.',
            icon: '⚖️'
          }
        ]
      },
      governance: {
        title: i18n.t('help.contexts.governance') || 'Gobernanza',
        sections: [
          {
            title: i18n.t('help.governance.limits') || 'Límites de Posición',
            content: i18n.t('help.governance.limits_text') || 'Máx. 15% por activo, 30% por sector, 40% por país.',
            icon: '🚧'
          },
          {
            title: i18n.t('help.governance.risk_profiles') || 'Perfiles de Riesgo',
            content: i18n.t('help.governance.risk_profiles_text') || 'Conservador, Moderado, Agresivo con límites adaptados.',
            icon: '⚠️'
          },
          {
            title: i18n.t('help.governance.compliance') || 'Compliance',
            content: i18n.t('help.governance.compliance_text') || 'Validación automática de reglas y correcciones.',
            icon: '✅'
          }
        ]
      },
      attribution: {
        title: i18n.t('help.contexts.attribution') || 'Análisis de Atribución',
        sections: [
          {
            title: i18n.t('help.attribution.brinson') || 'Análisis Brinson',
            content: i18n.t('help.attribution.brinson_text') || 'Descomposición: allocation effect + selection effect + interaction.',
            icon: '🔬'
          },
          {
            title: i18n.t('help.attribution.factor') || 'Atribución por Factor',
            content: i18n.t('help.attribution.factor_text') || 'Contribución de cada factor de riesgo al rendimiento.',
            icon: '📈'
          }
        ]
      }
    };

    return helpContent[context] || helpContent.general;
  }

  /**
   * Renderiza el contenido HTML
   */
  renderContent(content) {
    let html = '';

    content.sections.forEach(section => {
      html += `
        <div class="help-section">
          <div class="help-section-header">
            <span class="help-section-icon">${section.icon}</span>
            <h4 class="help-section-title">${section.title}</h4>
          </div>
          <div class="help-section-content">
            ${section.content.split('\n').map(line => `<p>${line}</p>`).join('')}
          </div>
        </div>
      `;
    });

    return html;
  }

  /**
   * Maneja búsqueda en la ayuda
   */
  handleSearch(query) {
    if (!query || query.length < 2) {
      this.updateContent();
      return;
    }

    const results = this.searchInHelp(query.toLowerCase());
    this.displaySearchResults(results);
  }

  /**
   * Busca en el índice de ayuda
   */
  searchInHelp(query) {
    const results = [];

    Object.keys(this.searchIndex).forEach(context => {
      const content = this.searchIndex[context];
      content.sections.forEach(section => {
        const titleMatch = section.title.toLowerCase().includes(query);
        const contentMatch = section.content.toLowerCase().includes(query);

        if (titleMatch || contentMatch) {
          results.push({
            context,
            section,
            relevance: titleMatch ? 2 : 1
          });
        }
      });
    });

    // Ordenar por relevancia
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Muestra resultados de búsqueda
   */
  displaySearchResults(results) {
    const contentArea = document.getElementById('help-content-area');

    if (results.length === 0) {
      contentArea.innerHTML = `
        <div class="help-no-results">
          <span class="no-results-icon">🔍</span>
          <p>${i18n.t('help.no_results') || 'No se encontraron resultados'}</p>
        </div>
      `;
      return;
    }

    let html = `<div class="help-search-results">`;
    html += `<h4>${i18n.t('help.search_results') || 'Resultados de búsqueda'} (${results.length})</h4>`;

    results.forEach(result => {
      html += `
        <div class="help-search-result" data-context="${result.context}">
          <div class="help-section-header">
            <span class="help-section-icon">${result.section.icon}</span>
            <h5 class="help-section-title">${result.section.title}</h5>
          </div>
          <p class="help-section-content">${result.section.content.substring(0, 150)}...</p>
          <button class="goto-context-btn" data-context="${result.context}">
            ${i18n.t('help.goto_context') || 'Ir al contexto'} →
          </button>
        </div>
      `;
    });

    html += '</div>';
    contentArea.innerHTML = html;

    // Event listeners para botones "ir al contexto"
    contentArea.querySelectorAll('.goto-context-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const context = btn.getAttribute('data-context');
        this.setContext(context);
      });
    });
  }

  /**
   * Construye índice de búsqueda
   */
  buildSearchIndex() {
    this.searchIndex = {
      general: this.getContextualContent('general'),
      scanner: this.getContextualContent('scanner'),
      portfolio: this.getContextualContent('portfolio'),
      governance: this.getContextualContent('governance'),
      attribution: this.getContextualContent('attribution')
    };
  }

  /**
   * Cambia el contexto activo
   */
  setContext(context) {
    this.currentContext = context;
    this.updateContent();
  }

  /**
   * Observa cambios en la UI para actualizar contexto
   */
  observeContextChanges() {
    // Detectar qué sección está visible
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const context = entry.target.getAttribute('data-help-context');
          if (context && context !== this.currentContext) {
            this.setContext(context);
          }
        }
      });
    }, { threshold: 0.5 });

    // Observar secciones principales
    document.querySelectorAll('[data-help-context]').forEach(el => {
      observer.observe(el);
    });
  }

  /**
   * Carga documentación desde archivo
   */
  async loadDocumentation(docType) {
    const contentArea = document.getElementById('help-content-area');
    contentArea.innerHTML = `<div class="help-loading">⏳ ${i18n.t('help.loading') || 'Cargando...'}</div>`;

    try {
      const docPath = this.getDocPath(docType);
      const response = await fetch(docPath);
      const markdown = await response.text();

      // Convertir markdown a HTML (simple)
      const html = this.markdownToHtml(markdown);
      contentArea.innerHTML = html;
    } catch {
      contentArea.innerHTML = `
        <div class="help-error">
          ❌ ${i18n.t('help.load_error') || 'Error al cargar documentación'}
        </div>
      `;
    }
  }

  /**
   * Obtiene ruta del documento
   */
  getDocPath(docType) {
    const paths = {
      beginner: 'docs/guia-principiantes.md',
      strategies: 'docs/estrategias.md',
      portfolio: 'docs/cartera-riesgo.md',
      governance: 'docs/gobernanza.md',
      attribution: 'docs/attribution-analysis.md',
      stress: 'docs/stress-testing.md'
    };
    return paths[docType] || 'docs/README.md';
  }

  /**
   * Convierte markdown a HTML (básico)
   */
  markdownToHtml(markdown) {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Carga preferencias desde localStorage
   */
  loadFromLocalStorage() {
    const savedState = localStorage.getItem('qsp-help-panel-open');
    if (savedState === 'true') {
      this.toggle();
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.panelElement) {
      this.panelElement.remove();
    }
  }
}

// Instancia global
export const helpPanel = new HelpPanel();
