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

// Augment Performance interface for Chrome-specific memory API
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

interface CacheEntry<T = unknown> {
  value: T;
  timestamp: number;
}

interface WorkerEntry {
  worker: Worker;
  url: string;
}

interface WorkerHandle {
  postMessage: (data: unknown) => Promise<unknown>;
  terminate: () => void;
}

interface VirtualScrollerHandle {
  update: (newItems: unknown[]) => void;
  destroy: () => void;
}

interface PerformanceMetricsResult {
  domContentLoaded: number | undefined;
  loadComplete: number | undefined;
  firstPaint: number | undefined;
  firstContentfulPaint: number | undefined;
  resources: number;
  memory: { used: string; total: string } | null;
}

export class PerformanceOptimizer {
  cache: Map<string, unknown>;
  observers: Map<string, IntersectionObserver>;
  rafCallbacks: Set<() => void>;
  workers: Map<string, WorkerEntry>;
  scheduleRAF!: (callback: () => void) => () => boolean;
  delegateEvent!: (
    parent: HTMLElement,
    selector: string,
    event: string,
    handler: (e: Event) => void
  ) => void;
  addPassiveListener!: (
    element: HTMLElement,
    event: string,
    handler: EventListener
  ) => void;

  constructor() {
    this.cache = new Map();
    this.observers = new Map();
    this.rafCallbacks = new Set();
    this.workers = new Map();

    this.init();
  }

  init(): void {
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
  debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number = 300
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return function executedFunction(...args: Parameters<T>): void {
      const later = (): void => {
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
  throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number = 100
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;
    return function executedFunction(...args: Parameters<T>): void {
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
  throttleLead<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number = 100
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function executedFunction(...args: Parameters<T>): void {
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

  setupIntersectionObserver(): void {
    // Observer for lazy loading images
    this.observers.set('lazyImage', new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry: IntersectionObserverEntry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.getAttribute('data-src');
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              this.observers.get('lazyImage')!.unobserve(img);
            }
          }
        });
      },
      { rootMargin: '50px' }
    ));

    // Observer for lazy loading components
    this.observers.set('lazyComponent', new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry: IntersectionObserverEntry) => {
          if (entry.isIntersecting) {
            const component = entry.target as HTMLElement;
            const loader = component.getAttribute('data-lazy-load');
            if (loader) {
              this.loadComponent(component, loader);
              this.observers.get('lazyComponent')!.unobserve(component);
            }
          }
        });
      },
      { rootMargin: '100px' }
    ));

    // Observe existing elements
    this.observeLazyElements();
  }

  observeLazyElements(): void {
    // Images
    document.querySelectorAll('img[data-src]').forEach((img: Element) => {
      this.observers.get('lazyImage')!.observe(img);
    });

    // Components
    document.querySelectorAll('[data-lazy-load]').forEach((component: Element) => {
      this.observers.get('lazyComponent')!.observe(component);
    });
  }

  async loadComponent(element: HTMLElement, componentPath: string): Promise<void> {
    try {
      element.innerHTML = '<div class="loading-skeleton"></div>';

      const module: { default?: () => string } = await import(componentPath);
      const content: string = module.default ? module.default() : '';

      element.innerHTML = content;
      element.classList.add('lazy-loaded');
    } catch (error: unknown) {
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
  createVirtualScroller(
    container: HTMLElement,
    items: unknown[],
    rowHeight: number,
    renderRow: (item: unknown, index: number) => HTMLElement
  ): VirtualScrollerHandle {
    const viewportHeight: number = container.clientHeight;
    const totalHeight: number = items.length * rowHeight;

    const scrollContainer: HTMLDivElement = document.createElement('div');
    scrollContainer.style.height = `${totalHeight}px`;
    scrollContainer.style.position = 'relative';

    const viewport: HTMLDivElement = document.createElement('div');
    viewport.style.position = 'absolute';
    viewport.style.top = '0';
    viewport.style.left = '0';
    viewport.style.right = '0';

    scrollContainer.appendChild(viewport);
    container.appendChild(scrollContainer);

    let _lastScrollTop: number = 0;

    const updateVisibleRows: (...args: unknown[]) => void = this.throttle(() => {
      const scrollTop: number = container.scrollTop;
      const startIndex: number = Math.floor(scrollTop / rowHeight);
      const endIndex: number = Math.min(
        items.length,
        Math.ceil((scrollTop + viewportHeight) / rowHeight)
      );

      // Clear viewport
      viewport.innerHTML = '';

      // Render visible rows
      for (let i = startIndex; i < endIndex; i++) {
        const row: HTMLElement = renderRow(items[i], i);
        row.style.position = 'absolute';
        row.style.top = `${i * rowHeight}px`;
        row.style.height = `${rowHeight}px`;
        viewport.appendChild(row);
      }

      _lastScrollTop = scrollTop;
    }, 50);

    container.addEventListener('scroll', updateVisibleRows as EventListener, { passive: true });

    // Initial render
    updateVisibleRows();

    return {
      update: (newItems: unknown[]): void => {
        items = newItems; // eslint-disable-line no-param-reassign
        scrollContainer.style.height = `${newItems.length * rowHeight}px`;
        updateVisibleRows();
      },
      destroy: (): void => {
        container.removeEventListener('scroll', updateVisibleRows as EventListener);
        scrollContainer.remove();
      }
    };
  }

  // =====================================================
  // REQUEST ANIMATION FRAME OPTIMIZATION
  // =====================================================

  setupRequestAnimationFrame(): void {
    let rafId: number | undefined;

    const processCallbacks = (): void => {
      this.rafCallbacks.forEach((callback: () => void) => {
        try {
          callback();
        } catch (error: unknown) {
          console.error('RAF callback error:', error);
        }
      });

      if (this.rafCallbacks.size > 0) {
        rafId = requestAnimationFrame(processCallbacks);
      }
    };

    this.scheduleRAF = (callback: () => void): (() => boolean) => {
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
  batchDOMWrites(writes: Array<() => void>): Promise<void> {
    return new Promise<void>((resolve: () => void) => {
      requestAnimationFrame(() => {
        writes.forEach((write: () => void) => write());
        resolve();
      });
    });
  }

  /**
   * Read/Write separation para evitar layout thrashing
   */
  async optimizeDOMOperations(
    reads: Array<() => unknown>,
    writes: Array<() => void>
  ): Promise<unknown[]> {
    // All reads first
    const readResults: unknown[] = reads.map((read: () => unknown) => read());

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
  memoize<T extends (...args: unknown[]) => unknown>(
    fn: T,
    keyGenerator: (...args: unknown[]) => string = (...args: unknown[]) => JSON.stringify(args)
  ): (...args: Parameters<T>) => ReturnType<T> {
    const cache = new Map<string, ReturnType<T>>();

    return (...args: Parameters<T>): ReturnType<T> => {
      const key: string = keyGenerator(...args);

      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const result = fn(...args) as ReturnType<T>;
      cache.set(key, result);

      // Limit cache size
      if (cache.size > 100) {
        const firstKey: string | undefined = cache.keys().next().value;
        if (firstKey !== undefined) {
          cache.delete(firstKey);
        }
      }

      return result;
    };
  }

  /**
   * Cache con TTL (Time To Live)
   */
  memoizeWithTTL<T extends (...args: unknown[]) => unknown>(
    fn: T,
    ttl: number = 60000,
    keyGenerator: (...args: unknown[]) => string = (...args: unknown[]) => JSON.stringify(args)
  ): (...args: Parameters<T>) => ReturnType<T> {
    const cache = new Map<string, CacheEntry<ReturnType<T>>>();

    return (...args: Parameters<T>): ReturnType<T> => {
      const key: string = keyGenerator(...args);
      const cached: CacheEntry<ReturnType<T>> | undefined = cache.get(key);

      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.value;
      }

      const result = fn(...args) as ReturnType<T>;
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

  optimizeEventListeners(): void {
    // Event delegation for dynamic elements
    this.delegateEvent = (
      parent: HTMLElement,
      selector: string,
      event: string,
      handler: (e: Event) => void
    ): void => {
      parent.addEventListener(event, (e: Event) => {
        if ((e.target as HTMLElement).matches(selector)) {
          handler(e);
        }
      });
    };

    // Passive listeners for scroll/touch
    this.addPassiveListener = (
      element: HTMLElement,
      event: string,
      handler: EventListener
    ): void => {
      element.addEventListener(event, handler, { passive: true });
    };
  }

  /**
   * Batch multiple event handlers
   */
  batchEventHandlers(
    handlers: Array<(events: Event[]) => void>,
    delay: number = 16
  ): (event: Event) => void {
    let pending: Event[] = [];
    let timeout: ReturnType<typeof setTimeout> | undefined;

    return (event: Event): void => {
      pending.push(event);

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const events: Event[] = [...pending];
        pending = [];

        handlers.forEach((handler: (events: Event[]) => void) => {
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
  createWorker(workerFunction: (e: MessageEvent) => void): WorkerHandle {
    const blob: Blob = new Blob(
      [`self.onmessage = ${workerFunction.toString()}`],
      { type: 'application/javascript' }
    );

    const workerUrl: string = URL.createObjectURL(blob);
    const worker: Worker = new Worker(workerUrl);

    const workerId: string = Math.random().toString(36).substr(2, 9);
    this.workers.set(workerId, { worker, url: workerUrl });

    return {
      postMessage: (data: unknown): Promise<unknown> => {
        return new Promise((resolve: (value: unknown) => void, reject: (reason: unknown) => void) => {
          worker.onmessage = (e: MessageEvent): void => resolve(e.data);
          worker.onerror = (e: ErrorEvent): void => reject(e);
          worker.postMessage(data);
        });
      },
      terminate: (): void => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        this.workers.delete(workerId);
      }
    };
  }

  /**
   * Worker para cálculos de cartera
   */
  createPortfolioWorker(): WorkerHandle {
    return this.createWorker((e: MessageEvent) => {
      const { type, data } = e.data as { type: string; data: { assets: Array<{ ticker: string; score: number }>; totalScore: number } };

      if (type === 'calculate_weights') {
        // Simulate heavy calculation
        const weights = data.assets.map((asset: { ticker: string; score: number }) => ({
          ticker: asset.ticker,
          weight: asset.score / data.totalScore
        }));

        (self as unknown as Worker).postMessage({ type: 'weights_calculated', weights });
      }

      if (type === 'calculate_correlation') {
        // Correlation matrix calculation
        // ... heavy computation
        (self as unknown as Worker).postMessage({ type: 'correlation_calculated', matrix: [] });
      }
    });
  }

  // =====================================================
  // IMAGE OPTIMIZATION
  // =====================================================

  /**
   * Carga progresiva de imágenes (blur-up)
   */
  progressiveImageLoad(img: HTMLImageElement, lowResSrc: string, highResSrc: string): void {
    // Load low-res first
    const lowRes: HTMLImageElement = new Image();
    lowRes.src = lowResSrc;
    lowRes.onload = (): void => {
      img.src = lowResSrc;
      img.classList.add('blur');

      // Then load high-res
      const highRes: HTMLImageElement = new Image();
      highRes.src = highResSrc;
      highRes.onload = (): void => {
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
  async loadModule(modulePath: string, retries: number = 3): Promise<unknown> {
    for (let i = 0; i < retries; i++) {
      try {
        return await import(modulePath);
      } catch (error: unknown) {
        if (i === retries - 1) throw error;
        await new Promise<void>((resolve: () => void) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  /**
   * Preload critical modules
   */
  preloadModule(modulePath: string): void {
    const link: HTMLLinkElement = document.createElement('link');
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
  measurePerformance<T extends (...args: unknown[]) => unknown>(
    fn: T,
    label: string
  ): (...args: Parameters<T>) => ReturnType<T> {
    return (...args: Parameters<T>): ReturnType<T> => {
      const start: number = performance.now();
      const result = fn(...args) as ReturnType<T>;
      const end: number = performance.now();

      console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);

      return result;
    };
  }

  /**
   * Monitor long tasks
   */
  monitorLongTasks(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list: PerformanceObserverEntryList) => {
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
  getPerformanceMetrics(): PerformanceMetricsResult {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const paint: PerformanceEntryList = performance.getEntriesByType('paint');
    const perfWithMemory = performance as PerformanceWithMemory;

    return {
      // Navigation timing
      domContentLoaded:
        navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : undefined,
      loadComplete: navigation ? navigation.loadEventEnd - navigation.loadEventStart : undefined,

      // Paint timing
      firstPaint: paint.find((p: PerformanceEntry) => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find((p: PerformanceEntry) => p.name === 'first-contentful-paint')?.startTime,

      // Resource timing
      resources: performance.getEntriesByType('resource').length,

      // Memory (if available)
      memory: perfWithMemory.memory ? {
        used: `${(perfWithMemory.memory.usedJSHeapSize / 1048576).toFixed(2)  }MB`,
        total: `${(perfWithMemory.memory.totalJSHeapSize / 1048576).toFixed(2)  }MB`
      } : null
    };
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  destroy(): void {
    // Clear observers
    this.observers.forEach((observer: IntersectionObserver) => observer.disconnect());
    this.observers.clear();

    // Clear RAF callbacks
    this.rafCallbacks.clear();

    // Terminate workers
    this.workers.forEach(({ worker, url }: WorkerEntry) => {
      worker.terminate();
      URL.revokeObjectURL(url);
    });
    this.workers.clear();

    // Clear cache
    this.cache.clear();
  }
}

// Instancia global
export const performanceOptimizer: PerformanceOptimizer = new PerformanceOptimizer();

// Utility exports
export const debounce = performanceOptimizer.debounce.bind(performanceOptimizer);
export const throttle = performanceOptimizer.throttle.bind(performanceOptimizer);
export const memoize = performanceOptimizer.memoize.bind(performanceOptimizer);
