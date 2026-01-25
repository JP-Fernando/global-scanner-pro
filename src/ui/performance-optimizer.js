// =====================================================
// PERFORMANCE OPTIMIZER
// =====================================================

/**
 * PerformanceOptimizer - Sistema de optimización de rendimiento
 *
 * Features:
 * - Debouncing & Throttling
 * - Lazy loading de imágenes y componentes
 * - Virtual scrolling para tablas grandes
 * - Request animation frame optimization
 * - Intersection Observer para lazy loading
 * - Web Workers para cálculos pesados
 * - Memoization de funciones costosas
 */
export class PerformanceOptimizer {
  constructor() {
    this.cache = new Map();
    this.observers = new Map();
    this.rafCallbacks = new Set();
    this.workers = new Map();

    this.init();
  }

  init() {
    this.setupIntersectionObserver();
    this.setupRequestAnimationFrame();
    this.optimizeEventListeners();
  }

  // =====================================================
  // DEBOUNCING & THROTTLING
  // =====================================================

  /**
   * Debounce: Ejecuta la función solo después de que pasen 'wait' ms sin llamadas
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle: Ejecuta la función máximo una vez cada 'wait' ms
   */
  throttle(func, wait = 100) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, wait);
      }
    };
  }

  /**
   * Leading throttle: Ejecuta inmediatamente, luego espera
   */
  throttleLead(func, wait = 100) {
    let timeout;
    return function executedFunction(...args) {
      if (!timeout) {
        func(...args);
        timeout = setTimeout(() => {
          timeout = null;
        }, wait);
      }
    };
  }

  // =====================================================
  // LAZY LOADING
  // =====================================================

  setupIntersectionObserver() {
    // Observer for lazy loading images
    this.observers.set('lazyImage', new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src');
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              this.observers.get('lazyImage').unobserve(img);
            }
          }
        });
      },
      { rootMargin: '50px' }
    ));

    // Observer for lazy loading components
    this.observers.set('lazyComponent', new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const component = entry.target;
            const loader = component.getAttribute('data-lazy-load');
            if (loader) {
              this.loadComponent(component, loader);
              this.observers.get('lazyComponent').unobserve(component);
            }
          }
        });
      },
      { rootMargin: '100px' }
    ));

    // Observe existing elements
    this.observeLazyElements();
  }

  observeLazyElements() {
    // Images
    document.querySelectorAll('img[data-src]').forEach(img => {
      this.observers.get('lazyImage').observe(img);
    });

    // Components
    document.querySelectorAll('[data-lazy-load]').forEach(component => {
      this.observers.get('lazyComponent').observe(component);
    });
  }

  async loadComponent(element, componentPath) {
    try {
      element.innerHTML = '<div class="loading-skeleton"></div>';

      const module = await import(componentPath);
      const content = module.default ? module.default() : '';

      element.innerHTML = content;
      element.classList.add('lazy-loaded');
    } catch (error) {
      console.error('Error loading component:', error);
      element.innerHTML = '<div class="load-error">Error loading content</div>';
    }
  }

  // =====================================================
  // VIRTUAL SCROLLING
  // =====================================================

  /**
   * Virtual scrolling para tablas grandes
   * Solo renderiza las filas visibles en viewport
   */
  createVirtualScroller(container, items, rowHeight, renderRow) {
    const viewportHeight = container.clientHeight;
    const totalHeight = items.length * rowHeight;

    const scrollContainer = document.createElement('div');
    scrollContainer.style.height = `${totalHeight}px`;
    scrollContainer.style.position = 'relative';

    const viewport = document.createElement('div');
    viewport.style.position = 'absolute';
    viewport.style.top = '0';
    viewport.style.left = '0';
    viewport.style.right = '0';

    scrollContainer.appendChild(viewport);
    container.appendChild(scrollContainer);

    let _lastScrollTop = 0;

    const updateVisibleRows = this.throttle(() => {
      const scrollTop = container.scrollTop;
      const startIndex = Math.floor(scrollTop / rowHeight);
      const endIndex = Math.min(
        items.length,
        Math.ceil((scrollTop + viewportHeight) / rowHeight)
      );

      // Clear viewport
      viewport.innerHTML = '';

      // Render visible rows
      for (let i = startIndex; i < endIndex; i++) {
        const row = renderRow(items[i], i);
        row.style.position = 'absolute';
        row.style.top = `${i * rowHeight}px`;
        row.style.height = `${rowHeight}px`;
        viewport.appendChild(row);
      }

      _lastScrollTop = scrollTop;
    }, 50);

    container.addEventListener('scroll', updateVisibleRows, { passive: true });

    // Initial render
    updateVisibleRows();

    return {
      update: (newItems) => {
        items = newItems; // eslint-disable-line no-param-reassign
        scrollContainer.style.height = `${newItems.length * rowHeight}px`;
        updateVisibleRows();
      },
      destroy: () => {
        container.removeEventListener('scroll', updateVisibleRows);
        scrollContainer.remove();
      }
    };
  }

  // =====================================================
  // REQUEST ANIMATION FRAME OPTIMIZATION
  // =====================================================

  setupRequestAnimationFrame() {
    let rafId;

    const processCallbacks = () => {
      this.rafCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('RAF callback error:', error);
        }
      });

      if (this.rafCallbacks.size > 0) {
        rafId = requestAnimationFrame(processCallbacks);
      }
    };

    this.scheduleRAF = (callback) => {
      this.rafCallbacks.add(callback);

      if (!rafId) {
        rafId = requestAnimationFrame(processCallbacks);
      }

      return () => this.rafCallbacks.delete(callback);
    };
  }

  /**
   * Batch DOM writes usando RAF
   */
  batchDOMWrites(writes) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        writes.forEach(write => write());
        resolve();
      });
    });
  }

  /**
   * Read/Write separation para evitar layout thrashing
   */
  async optimizeDOMOperations(reads, writes) {
    // All reads first
    const readResults = reads.map(read => read());

    // Then all writes in RAF
    await this.batchDOMWrites(writes);

    return readResults;
  }

  // =====================================================
  // MEMOIZATION
  // =====================================================

  /**
   * Memoiza resultados de funciones costosas
   */
  memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
    const cache = new Map();

    return (...args) => {
      const key = keyGenerator(...args);

      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = fn(...args);
      cache.set(key, result);

      // Limit cache size
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      return result;
    };
  }

  /**
   * Cache con TTL (Time To Live)
   */
  memoizeWithTTL(fn, ttl = 60000, keyGenerator = (...args) => JSON.stringify(args)) {
    const cache = new Map();

    return (...args) => {
      const key = keyGenerator(...args);
      const cached = cache.get(key);

      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.value;
      }

      const result = fn(...args);
      cache.set(key, {
        value: result,
        timestamp: Date.now()
      });

      return result;
    };
  }

  // =====================================================
  // EVENT LISTENER OPTIMIZATION
  // =====================================================

  optimizeEventListeners() {
    // Event delegation for dynamic elements
    this.delegateEvent = (parent, selector, event, handler) => {
      parent.addEventListener(event, (e) => {
        if (e.target.matches(selector)) {
          handler(e);
        }
      });
    };

    // Passive listeners for scroll/touch
    this.addPassiveListener = (element, event, handler) => {
      element.addEventListener(event, handler, { passive: true });
    };
  }

  /**
   * Batch multiple event handlers
   */
  batchEventHandlers(handlers, delay = 16) {
    let pending = [];
    let timeout;

    return (event) => {
      pending.push(event);

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const events = [...pending];
        pending = [];

        handlers.forEach(handler => {
          handler(events);
        });
      }, delay);
    };
  }

  // =====================================================
  // WEB WORKERS
  // =====================================================

  /**
   * Crea un web worker para cálculos pesados
   */
  createWorker(workerFunction) {
    const blob = new Blob(
      [`self.onmessage = ${workerFunction.toString()}`],
      { type: 'application/javascript' }
    );

    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    const workerId = Math.random().toString(36).substr(2, 9);
    this.workers.set(workerId, { worker, url: workerUrl });

    return {
      postMessage: (data) => {
        return new Promise((resolve, reject) => {
          worker.onmessage = (e) => resolve(e.data);
          worker.onerror = (e) => reject(e);
          worker.postMessage(data);
        });
      },
      terminate: () => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        this.workers.delete(workerId);
      }
    };
  }

  /**
   * Worker para cálculos de cartera
   */
  createPortfolioWorker() {
    return this.createWorker((e) => {
      const { type, data } = e.data;

      if (type === 'calculate_weights') {
        // Simulate heavy calculation
        const weights = data.assets.map(asset => ({
          ticker: asset.ticker,
          weight: asset.score / data.totalScore
        }));

        self.postMessage({ type: 'weights_calculated', weights });
      }

      if (type === 'calculate_correlation') {
        // Correlation matrix calculation
        // ... heavy computation
        self.postMessage({ type: 'correlation_calculated', matrix: [] });
      }
    });
  }

  // =====================================================
  // IMAGE OPTIMIZATION
  // =====================================================

  /**
   * Carga progresiva de imágenes (blur-up)
   */
  progressiveImageLoad(img, lowResSrc, highResSrc) {
    // Load low-res first
    const lowRes = new Image();
    lowRes.src = lowResSrc;
    lowRes.onload = () => {
      img.src = lowResSrc;
      img.classList.add('blur');

      // Then load high-res
      const highRes = new Image();
      highRes.src = highResSrc;
      highRes.onload = () => {
        img.src = highResSrc;
        img.classList.remove('blur');
        img.classList.add('loaded');
      };
    };
  }

  // =====================================================
  // CODE SPLITTING
  // =====================================================

  /**
   * Dynamic import with retry
   */
  async loadModule(modulePath, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await import(modulePath);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  /**
   * Preload critical modules
   */
  preloadModule(modulePath) {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = modulePath;
    document.head.appendChild(link);
  }

  // =====================================================
  // PERFORMANCE MONITORING
  // =====================================================

  /**
   * Measure performance of a function
   */
  measurePerformance(fn, label) {
    return (...args) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();

      console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);

      return result;
    };
  }

  /**
   * Monitor long tasks
   */
  monitorLongTasks() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`, entry);
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');

    return {
      // Navigation timing
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,

      // Paint timing
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,

      // Resource timing
      resources: performance.getEntriesByType('resource').length,

      // Memory (if available)
      memory: performance.memory ? {
        used: `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)  }MB`,
        total: `${(performance.memory.totalJSHeapSize / 1048576).toFixed(2)  }MB`
      } : null
    };
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  destroy() {
    // Clear observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Clear RAF callbacks
    this.rafCallbacks.clear();

    // Terminate workers
    this.workers.forEach(({ worker, url }) => {
      worker.terminate();
      URL.revokeObjectURL(url);
    });
    this.workers.clear();

    // Clear cache
    this.cache.clear();
  }
}

// Instancia global
export const performanceOptimizer = new PerformanceOptimizer();

// Utility exports
export const debounce = performanceOptimizer.debounce.bind(performanceOptimizer);
export const throttle = performanceOptimizer.throttle.bind(performanceOptimizer);
export const memoize = performanceOptimizer.memoize.bind(performanceOptimizer);
