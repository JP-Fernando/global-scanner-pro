/**
 * IndexedDB Storage Layer for Portfolio Tracking
 * Provides persistence for portfolios, snapshots, and rebalancing history
 */

const DB_NAME = 'GlobalQuantScannerDB';
const DB_VERSION = 2;

export class IndexedDBStore {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize the database
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Portfolios store
        if (!db.objectStoreNames.contains('portfolios')) {
          const portfolioStore = db.createObjectStore('portfolios', { keyPath: 'id' });
          portfolioStore.createIndex('created_at', 'created_at', { unique: false });
          portfolioStore.createIndex('last_updated', 'last_updated', { unique: false });
          portfolioStore.createIndex('name', 'name', { unique: false });
        }

        // Daily snapshots for historical tracking
        if (!db.objectStoreNames.contains('snapshots')) {
          const snapshotStore = db.createObjectStore('snapshots', { keyPath: ['portfolio_id', 'date'] });
          snapshotStore.createIndex('portfolio_id', 'portfolio_id', { unique: false });
          snapshotStore.createIndex('date', 'date', { unique: false });
        }

        // Rebalancing history
        if (!db.objectStoreNames.contains('rebalances')) {
          const rebalanceStore = db.createObjectStore('rebalances', { keyPath: 'id' });
          rebalanceStore.createIndex('portfolio_id', 'portfolio_id', { unique: false });
          rebalanceStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Price cache for performance calculation
        if (!db.objectStoreNames.contains('price_cache')) {
          const priceStore = db.createObjectStore('price_cache', { keyPath: ['ticker', 'date'] });
          priceStore.createIndex('ticker', 'ticker', { unique: false });
          priceStore.createIndex('date', 'date', { unique: false });
        }
        
        // Alerts log
        if (!db.objectStoreNames.contains('alerts')) {
          const alertStore = db.createObjectStore('alerts', { keyPath: 'id' });
          alertStore.createIndex('created_at', 'created_at', { unique: false });
          alertStore.createIndex('strategy', 'strategy', { unique: false });
          alertStore.createIndex('user_id', 'user_id', { unique: false });
          alertStore.createIndex('delivery_status', 'delivery_status', { unique: false });
        }

        // Alert settings
        if (!db.objectStoreNames.contains('alert_settings')) {
          const settingsStore = db.createObjectStore('alert_settings', { keyPath: 'id' });
          settingsStore.createIndex('strategy', 'strategy', { unique: false });
          settingsStore.createIndex('user_id', 'user_id', { unique: false });
        }

      };
    });
  }

  /**
   * Save a portfolio
   * @param {Object} portfolio - Portfolio object
   * @returns {Promise<string>} Portfolio ID
   */
  async savePortfolio(portfolio) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['portfolios'], 'readwrite');
      const store = transaction.objectStore('portfolios');
      const request = store.put(portfolio);

      request.onsuccess = () => resolve(portfolio.id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a portfolio by ID
   * @param {string} id - Portfolio ID
   * @returns {Promise<Object|null>}
   */
  async getPortfolio(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['portfolios'], 'readonly');
      const store = transaction.objectStore('portfolios');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all portfolios
   * @returns {Promise<Array>}
   */
  async getAllPortfolios() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['portfolios'], 'readonly');
      const store = transaction.objectStore('portfolios');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a portfolio
   * @param {string} id - Portfolio ID
   * @returns {Promise<void>}
   */
  async deletePortfolio(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['portfolios'], 'readwrite');
      const store = transaction.objectStore('portfolios');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save a daily portfolio snapshot
   * @param {Object} snapshot - Snapshot object
   * @returns {Promise<void>}
   */
  async saveSnapshot(snapshot) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['snapshots'], 'readwrite');
      const store = transaction.objectStore('snapshots');
      const request = store.put(snapshot);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get snapshots for a portfolio within a date range
   * @param {string} portfolioId - Portfolio ID
   * @param {string} fromDate - Start date (ISO8601)
   * @param {string} toDate - End date (ISO8601)
   * @returns {Promise<Array>}
   */
  async getSnapshots(portfolioId, fromDate = null, toDate = null) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['snapshots'], 'readonly');
      const store = transaction.objectStore('snapshots');
      const index = store.index('portfolio_id');
      const request = index.getAll(portfolioId);

      request.onsuccess = () => {
        let snapshots = request.result || [];

        // Filter by date range if provided
        if (fromDate || toDate) {
          snapshots = snapshots.filter(s => {
            if (fromDate && s.date < fromDate) return false;
            if (toDate && s.date > toDate) return false;
            return true;
          });
        }

        // Sort by date
        snapshots.sort((a, b) => a.date.localeCompare(b.date));
        resolve(snapshots);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save a rebalancing event
   * @param {Object} rebalance - Rebalance object
   * @returns {Promise<string>} Rebalance ID
   */
  async saveRebalance(rebalance) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['rebalances'], 'readwrite');
      const store = transaction.objectStore('rebalances');
      const request = store.put(rebalance);

      request.onsuccess = () => resolve(rebalance.id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get rebalancing history for a portfolio
   * @param {string} portfolioId - Portfolio ID
   * @returns {Promise<Array>}
   */
  async getRebalanceHistory(portfolioId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['rebalances'], 'readonly');
      const store = transaction.objectStore('rebalances');
      const index = store.index('portfolio_id');
      const request = index.getAll(portfolioId);

      request.onsuccess = () => {
        const rebalances = request.result || [];
        // Sort by timestamp descending (most recent first)
        rebalances.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        resolve(rebalances);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save price data to cache
   * @param {string} ticker - Stock ticker
   * @param {string} date - Date (YYYY-MM-DD)
   * @param {number} price - Closing price
   * @returns {Promise<void>}
   */
  async savePriceCache(ticker, date, price) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['price_cache'], 'readwrite');
      const store = transaction.objectStore('price_cache');
      const request = store.put({ ticker, date, price });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cached price data for a ticker
   * @param {string} ticker - Stock ticker
   * @param {string} fromDate - Start date (YYYY-MM-DD)
   * @param {string} toDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>}
   */
  async getPriceCache(ticker, fromDate = null, toDate = null) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['price_cache'], 'readonly');
      const store = transaction.objectStore('price_cache');
      const index = store.index('ticker');
      const request = index.getAll(ticker);

      request.onsuccess = () => {
        let prices = request.result || [];

        // Filter by date range if provided
        if (fromDate || toDate) {
          prices = prices.filter(p => {
            if (fromDate && p.date < fromDate) return false;
            if (toDate && p.date > toDate) return false;
            return true;
          });
        }

        // Sort by date
        prices.sort((a, b) => a.date.localeCompare(b.date));
        resolve(prices);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data (use with caution)
   * @returns {Promise<void>}
   */
  async clearAll() {
    if (!this.db) await this.init();

    const stores = ['portfolios', 'snapshots', 'rebalances', 'price_cache', 'alerts', 'alert_settings'];
    const promises = stores.map(storeName => {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return Promise.all(promises);
  }

  /**
   * Save alert log
   * @param {Object} alert - Alert record
   * @returns {Promise<string>} Alert ID
   */
  async saveAlert(alert) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['alerts'], 'readwrite');
      const store = transaction.objectStore('alerts');
      const request = store.put(alert);

      request.onsuccess = () => resolve(alert.id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get alert logs
   * @param {Object} options
   * @param {string} options.strategy
   * @param {string} options.userId
   * @param {number} options.limit
   * @returns {Promise<Array>}
   */
  async getAlerts({ strategy = null, userId = null, limit = 50 } = {}) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['alerts'], 'readonly');
      const store = transaction.objectStore('alerts');
      const request = store.getAll();

      request.onsuccess = () => {
        let alerts = request.result || [];
        if (strategy) {
          alerts = alerts.filter(a => a.strategy === strategy);
        }
        if (userId) {
          alerts = alerts.filter(a => a.user_id === userId);
        }

        alerts.sort((a, b) => b.created_at.localeCompare(a.created_at));
        resolve(alerts.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear alerts by strategy
   * @param {string} strategy - Strategy key (optional, clears all if not provided)
   * @returns {Promise<number>} Number of deleted alerts
   */
  async clearAlerts(strategy = null) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['alerts'], 'readwrite');
      const store = transaction.objectStore('alerts');

      if (!strategy) {
        // Clear all alerts
        const request = store.clear();
        request.onsuccess = () => resolve(0); // Return 0 since we cleared all
        request.onerror = () => reject(request.error);
      } else {
        // Clear alerts for specific strategy
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const alerts = getAllRequest.result || [];
          const toDelete = alerts.filter(a => a.strategy === strategy);
          let deletedCount = 0;

          toDelete.forEach(alert => {
            const deleteRequest = store.delete(alert.id);
            deleteRequest.onsuccess = () => deletedCount++;
          });

          transaction.oncomplete = () => resolve(deletedCount);
        };

        getAllRequest.onerror = () => reject(getAllRequest.error);
      }

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Save alert settings
   * @param {Object} settings - Alert settings
   * @returns {Promise<string>} Settings ID
   */
  async saveAlertSettings(settings) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['alert_settings'], 'readwrite');
      const store = transaction.objectStore('alert_settings');
      const request = store.put(settings);

      request.onsuccess = () => resolve(settings.id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get alert settings by ID
   * @param {string} id - Settings ID
   * @returns {Promise<Object|null>}
   */
  async getAlertSettings(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['alert_settings'], 'readonly');
      const store = transaction.objectStore('alert_settings');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

}

// Singleton instance
export const dbStore = new IndexedDBStore();
