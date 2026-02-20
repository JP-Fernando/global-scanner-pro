# Fase 6: Mejoras de Experiencia de Usuario

**Versión:** 1.0
**Fecha:** Enero 2026
**Estado:** ✅ Completado

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Tooltips Interactivos](#tooltips-interactivos)
3. [Panel de Ayuda Contextual](#panel-de-ayuda-contextual)
4. [Gobernanza Dinámica](#gobernanza-dinámica)
5. [Accesibilidad](#accesibilidad)
6. [Optimización de Rendimiento](#optimización-de-rendimiento)
7. [Mejoras Visuales](#mejoras-visuales)
8. [Guía de Uso](#guía-de-uso)
9. [API Reference](#api-reference)

---

## Resumen Ejecutivo

La Fase 6 introduce mejoras significativas en la experiencia de usuario, incluyendo:

### ✅ Funcionalidades Implementadas

1. **Sistema de Tooltips Interactivos**
   - Documentación contextual en todos los controles
   - Posicionamiento inteligente
   - Soporte multi-idioma
   - Accesible por teclado

2. **Panel de Ayuda Contextual**
   - Documentación en tiempo real
   - Búsqueda integrada
   - Navegación por contextos
   - Enlaces a documentación completa

3. **Gobernanza Dinámica**
   - Límites adaptativos según volatilidad
   - Ajuste automático por correlación
   - Detección de regímenes de mercado
   - Recomendaciones inteligentes

4. **Mejoras de Accesibilidad**
   - ARIA labels completos
   - Navegación por teclado
   - Skip links
   - Screen reader support
   - High contrast mode

5. **Optimizaciones de Rendimiento**
   - Debouncing/throttling
   - Lazy loading
   - Virtual scrolling
   - Web Workers
   - Memoization

6. **Mejoras Visuales**
   - Animaciones suaves
   - Transiciones mejoradas
   - Diseño responsivo
   - Estados de carga
   - Feedback visual

---

## Tooltips Interactivos

### Descripción

Sistema de tooltips que proporciona documentación contextual instantánea sobre cualquier elemento de la interfaz.

### Características

- **Posicionamiento Inteligente**: Se ajusta automáticamente para no salirse de la pantalla
- **Multi-idioma**: Integrado con el sistema i18n
- **Contenido Rico**: Soporta HTML, enlaces, ejemplos de código
- **Accesible**: Compatible con lectores de pantalla
- **Animaciones**: Transiciones suaves

### Uso Básico

```html
<!-- Tooltip simple -->
<button data-tooltip="run_scan" data-tooltip-type="i18n">
  Ejecutar Análisis
</button>

<!-- Tooltip con posición específica -->
<select
  data-tooltip="strategy_selector"
  data-tooltip-type="i18n"
  data-tooltip-position="bottom">
  <option>Balanced</option>
</select>

<!-- Tooltip con HTML personalizado -->
<div
  data-tooltip="<strong>Custom</strong> tooltip"
  data-tooltip-type="html">
  Hover me
</div>
```

### API Programática

```javascript
import { tooltipManager } from './src/ui/tooltip-manager.js';

// Agregar tooltip programáticamente
const element = document.getElementById('my-button');
tooltipManager.add(element, 'tooltip_key', {
  type: 'i18n',
  position: 'top'
});

// Remover tooltip
tooltipManager.remove(element);

// Refrescar tooltips después de actualizar DOM
tooltipManager.refresh();
```

### Tooltips Disponibles

| Key | Descripción |
|-----|-------------|
| `market_selector` | Explicación del selector de mercado |
| `strategy_selector` | Descripción de estrategias |
| `allocation_method` | Métodos de asignación de capital |
| `risk_profile` | Perfiles de riesgo |
| `quant_score` | Sistema de puntuación |
| `sharpe_ratio` | Ratio de Sharpe |
| `max_drawdown` | Máximo drawdown |
| `var_95` | Value at Risk |

---

## Panel de Ayuda Contextual

### Descripción

Panel lateral colapsable con documentación contextual, búsqueda integrada y enlaces a guías completas.

### Características

- **Contextual**: Muestra ayuda relevante según la sección activa
- **Búsqueda**: Encuentra información rápidamente
- **Navegación**: Enlaces a documentación detallada
- **Persistente**: Recuerda estado (abierto/cerrado)
- **Responsive**: Se adapta a diferentes tamaños de pantalla

### Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `F1` | Abrir/cerrar panel de ayuda |
| `Ctrl+Shift+H` | Abrir/cerrar panel de ayuda |
| `Esc` | Cerrar panel si está abierto |

### Contextos Disponibles

1. **General**: Información básica del sistema
2. **Scanner**: Ayuda sobre el escáner de mercado
3. **Portfolio**: Gestión de carteras
4. **Governance**: Reglas de gobernanza
5. **Attribution**: Análisis de atribución

### API

```javascript
import { helpPanel } from './src/ui/help-panel.js';

// Abrir/cerrar
helpPanel.toggle();

// Cambiar contexto
helpPanel.setContext('portfolio');

// Cargar documentación específica
helpPanel.loadDocumentation('strategies');

// Buscar
helpPanel.handleSearch('volatility');
```

---

## Gobernanza Dinámica

### Descripción

Sistema que ajusta automáticamente los límites de riesgo y concentración basándose en condiciones reales del mercado.

### Regímenes de Volatilidad

| Régimen | Threshold | Multiplicador | Acción |
|---------|-----------|---------------|--------|
| **Low Volatility** | < 15% | 1.2x | Límites relajados |
| **Normal** | 15-25% | 1.0x | Límites estándar |
| **High Volatility** | 25-35% | 0.8x | Límites reducidos |
| **Extreme Volatility** | > 35% | 0.6x | Límites muy reducidos |

### Regímenes de Correlación

| Régimen | Threshold | Multiplicador | Acción |
|---------|-----------|---------------|--------|
| **Low Correlation** | < 0.5 | 1.1x | Mayor concentración permitida |
| **Moderate** | 0.5-0.7 | 1.0x | Límites estándar |
| **High Correlation** | 0.7-0.85 | 0.85x | Diversificación forzada |
| **Extreme** | > 0.85 | 0.7x | Máxima diversificación |

### Uso

```javascript
import { calculateDynamicLimits } from './src/analytics/dynamic-governance.js';

// Calcular límites dinámicos
const marketConditions = {
  portfolioVolatility: 28,  // 28% volatilidad
  correlationMatrix: [...], // Matriz de correlaciones
  avgLiquidity: 80000,      // Liquidez promedio
  stressLevel: 0.6          // Nivel de stress (0-1)
};

const result = calculateDynamicLimits(marketConditions);

console.log(result.rules.max_position_weight);  // 0.12 (reducido desde 0.15)
console.log(result.metadata.regime.volatility); // "High Volatility"
console.log(result.metadata.recommendation);    // Recomendaciones
```

### Ajustes Aplicados

1. **Límites de Posición**: Reducidos en alta volatilidad/correlación
2. **Límites Sectoriales**: Ajustados por correlación
3. **Concentración Top 3**: Muy sensible a crowding risk
4. **Threshold de Rebalanceo**: Más frecuente en mercados volátiles
5. **Requisitos de Liquidez**: Aumentados en stress

### Recomendaciones Generadas

El sistema genera recomendaciones automáticas:

- 🔴 **CRITICAL**: Acción inmediata requerida
- 🟡 **WARNING**: Monitoreo cercano necesario
- 🔵 **INFO**: Información relevante

Ejemplo:
```
CRITICAL: Extreme volatility detected. Position limits significantly reduced.
Consider reducing overall exposure.
```

---

## Accesibilidad

### Características WCAG 2.1 AA

✅ **Perceivable**
- Contraste de color ≥ 4.5:1
- Texto escalable
- Alternativas de texto para contenido no textual

✅ **Operable**
- Navegación completa por teclado
- Sin trampas de teclado
- Tiempo suficiente para interactuar

✅ **Understandable**
- Labels claros y descriptivos
- Mensajes de error explicativos
- Navegación predecible

✅ **Robust**
- Marcado semántico válido
- ARIA labels completos
- Compatible con tecnologías asistivas

### ARIA Landmarks

```html
<header role="banner">...</header>
<nav role="navigation">...</nav>
<main role="main" id="main-content">...</main>
<aside role="complementary">...</aside>
```

### Navegación por Teclado

| Tecla | Acción |
|-------|--------|
| `Tab` | Navegar entre elementos |
| `Shift+Tab` | Navegar atrás |
| `Enter/Space` | Activar elemento |
| `Esc` | Cerrar modals/tooltips |
| `Arrow keys` | Navegar en listas/menús |
| `Home` | Ir al inicio |
| `End` | Ir al final |

### Screen Reader Support

- **Live Regions**: Anuncios automáticos de cambios
- **ARIA Descriptions**: Descripciones contextuales
- **Role Attributes**: Semántica clara
- **Status Messages**: Feedback de acciones

### Uso

```javascript
import { accessibilityManager } from './src/ui/accessibility-manager.js';

// Anunciar mensaje
accessibilityManager.announce('Portfolio created successfully', 'polite');

// Anuncio urgente
accessibilityManager.announce('Error: Invalid data', 'assertive');

// Registrar atajo de teclado
accessibilityManager.registerShortcut('ctrl+s', () => {
  savePortfolio();
}, 'Save portfolio');

// Refrescar ARIA labels
accessibilityManager.refresh();
```

---

## Optimización de Rendimiento

### Técnicas Implementadas

#### 1. Debouncing & Throttling

```javascript
import { debounce, throttle } from './src/ui/performance-optimizer.js';

// Debounce para búsqueda (espera a que el usuario deje de escribir)
const searchHandler = debounce((query) => {
  performSearch(query);
}, 300);

// Throttle para scroll (máximo una ejecución cada 100ms)
const scrollHandler = throttle(() => {
  updateVisibleItems();
}, 100);
```

#### 2. Lazy Loading

```html
<!-- Lazy load de imágenes -->
<img data-src="chart.png" alt="Chart" />

<!-- Lazy load de componentes -->
<div data-lazy-load="./components/heavy-component.js"></div>
```

#### 3. Virtual Scrolling

Para tablas con miles de filas:

```javascript
import { performanceOptimizer } from './src/ui/performance-optimizer.js';

const container = document.getElementById('results-table');
const items = [...1000s of rows...];

const scroller = performanceOptimizer.createVirtualScroller(
  container,
  items,
  50, // row height
  (item) => createRow(item) // render function
);
```

#### 4. Memoization

```javascript
import { memoize } from './src/ui/performance-optimizer.js';

// Memoizar cálculo costoso
const calculatePortfolioRisk = memoize((positions) => {
  // Heavy calculation...
  return risk;
});

// Memoización con TTL (cache por 60 segundos)
const fetchMarketData = memoizeWithTTL(
  async (ticker) => {
    const response = await fetch(`/api/data/${ticker}`);
    return response.json();
  },
  60000 // 60 seconds
);
```

#### 5. Web Workers

Para cálculos pesados sin bloquear la UI:

```javascript
const worker = performanceOptimizer.createPortfolioWorker();

const result = await worker.postMessage({
  type: 'calculate_weights',
  data: { assets, totalScore }
});

console.log(result.weights);
```

### Métricas de Performance

```javascript
import { uiInitializer } from './src/ui/ui-init.js';

const metrics = uiInitializer.getPerformanceMetrics();

console.log(metrics);
// {
//   domContentLoaded: 245ms,
//   loadComplete: 1850ms,
//   firstPaint: 320ms,
//   firstContentfulPaint: 450ms,
//   resources: 42,
//   memory: { used: "12.5MB", total: "50MB" }
// }
```

---

## Mejoras Visuales

### Animaciones

Todas las animaciones respetan `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

### Transiciones

- Tooltips: 200ms ease
- Panel de ayuda: 300ms cubic-bezier
- Botones: 300ms ease
- Hover effects: 200ms ease

### Estados de Carga

```html
<div class="loading-skeleton"></div>
```

Animación shimmer para indicar carga.

### Feedback Visual

- ✅ Success: Verde (#10b981)
- ⚠️ Warning: Amarillo (#fbbf24)
- ❌ Error: Rojo (#f87171)
- ℹ️ Info: Azul (#38bdf8)

---

## Guía de Uso

### Para Usuarios

1. **Tooltips**: Pasa el mouse sobre cualquier control para ver ayuda instantánea
2. **Panel de Ayuda**: Presiona `F1` para abrir el panel de ayuda
3. **Búsqueda**: Usa la barra de búsqueda en el panel de ayuda
4. **Teclado**: Navega completamente con el teclado si lo prefieres
5. **Accesibilidad**: Compatible con lectores de pantalla

### Para Desarrolladores

#### Agregar Tooltip a Nuevo Control

```html
<button
  data-tooltip="my_new_tooltip"
  data-tooltip-type="i18n">
  Mi Botón
</button>
```

Luego agregar la traducción en `src/i18n/translations/es.js`:

```javascript
tooltips: {
  my_new_tooltip: 'Descripción de mi botón'
}
```

#### Agregar Nueva Sección de Ayuda

En `src/ui/help-panel.js`, actualizar `getContextualContent()`:

```javascript
my_context: {
  title: 'Mi Contexto',
  sections: [
    {
      title: 'Sección 1',
      content: 'Descripción...',
      icon: '📊'
    }
  ]
}
```

#### Integrar Gobernanza Dinámica

```javascript
import { calculateDynamicLimits } from './src/analytics/dynamic-governance.js';

// En tu código de construcción de cartera:
const marketConditions = {
  portfolioVolatility: calculateVolatility(portfolio),
  correlationMatrix: calculateCorrelationMatrix(portfolio),
  avgLiquidity: calculateAvgLiquidity(portfolio),
  stressLevel: detectStressLevel()
};

const { rules, metadata } = calculateDynamicLimits(marketConditions);

// Usar rules.max_position_weight en lugar de INVESTMENT_RULES.max_position_weight
```

---

## API Reference

### TooltipManager

```javascript
class TooltipManager {
  add(element, content, options)    // Agregar tooltip
  remove(element)                    // Remover tooltip
  show(element)                      // Mostrar tooltip
  hide()                            // Ocultar tooltip
  refresh()                         // Refrescar todos
  destroy()                         // Cleanup
}
```

### HelpPanel

```javascript
class HelpPanel {
  toggle()                          // Abrir/cerrar
  setContext(context)               // Cambiar contexto
  loadDocumentation(docType)        // Cargar doc
  handleSearch(query)               // Buscar
  destroy()                         // Cleanup
}
```

### AccessibilityManager

```javascript
class AccessibilityManager {
  announce(message, priority)       // Anuncio SR
  registerShortcut(key, callback)   // Atajo
  showFieldError(field, message)    // Error
  clearFieldError(field)            // Limpiar error
  refresh()                         // Refrescar ARIA
  destroy()                         // Cleanup
}
```

### PerformanceOptimizer

```javascript
class PerformanceOptimizer {
  debounce(func, wait)              // Debouncing
  throttle(func, wait)              // Throttling
  memoize(fn, keyGenerator)         // Memoization
  createVirtualScroller(...)        // Virtual scroll
  createWorker(workerFunction)      // Web worker
  getPerformanceMetrics()           // Métricas
  destroy()                         // Cleanup
}
```

### DynamicGovernance

```javascript
// Functions
calculateDynamicLimits(marketConditions, baseRules)
adjustRiskProfile(baseProfile, marketConditions)
detectVolatilityRegime(portfolioVolatility)
detectCorrelationRegime(avgCorrelation)
stressTestDynamicLimits(baseRules)
monitorMarketConditions(currentConditions, historicalConditions)
```

---

## Testing

Ver pruebas en `src/tests/tests.js`:

```javascript
// Test de tooltips
testTooltipPositioning()

// Test de accesibilidad
testARIALabels()
testKeyboardNavigation()

// Test de gobernanza dinámica
testDynamicGovernanceVolatilityAdjustment()
testDynamicGovernanceCorrelationAdjustment()

// Test de performance
testDebouncingBehavior()
testThrottlingBehavior()
testMemoizationCache()
```

---

## Roadmap Futuro

### Mejoras Planificadas

- [ ] Modo oscuro/claro configurable
- [ ] Personalización de atajos de teclado
- [ ] Más contextos en panel de ayuda
- [ ] Tutorial interactivo (onboarding)
- [ ] Exportar configuración de UI
- [ ] Themes personalizables
- [ ] Voice commands (experimental)

---

## Changelog

### v1.0.0 (Enero 2026)

- ✅ Tooltips interactivos completos
- ✅ Panel de ayuda contextual
- ✅ Gobernanza dinámica
- ✅ Accesibilidad WCAG 2.1 AA
- ✅ Optimizaciones de performance
- ✅ Mejoras visuales y animaciones

---

## Soporte

Para preguntas o issues:
- GitHub: [Issues](https://github.com/JP-Fernando/global-scanner-pro/issues)
- Docs: [Documentación completa](./README.md)

---

**© 2026 Global Quant Scanner Pro - Fase 6: UX Improvements**
