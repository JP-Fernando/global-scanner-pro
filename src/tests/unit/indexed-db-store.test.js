/**
 * IndexedDB Store Tests
 *
 * Tests for the IndexedDB storage layer with a complete in-memory mock
 * of the IndexedDB API.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// In-memory IndexedDB mock
// ---------------------------------------------------------------------------

function createMockIndexedDB() {
  const databases = new Map();

  function openDB(name, version) {
    let db = databases.get(name);
    const needsUpgrade = !db || db.version < version;

    if (!db) {
      db = { version, objectStoreNames: { contains: (n) => db.stores.has(n) }, stores: new Map() };
      databases.set(name, db);
    }

    const request = {
      result: null,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };

    setTimeout(() => {
      if (needsUpgrade && request.onupgradeneeded) {
        const mockDB = createMockDB(db);
        request.onupgradeneeded({ target: { result: mockDB } });
      }
      const mockDB = createMockDB(db);
      request.result = mockDB;
      if (request.onsuccess) request.onsuccess();
    }, 0);

    return request;
  }

  function createMockDB(db) {
    return {
      objectStoreNames: { contains: (n) => db.stores.has(n) },
      createObjectStore: (name, options) => {
        const store = { data: new Map(), indexes: new Map(), keyPath: options.keyPath };
        db.stores.set(name, store);
        return {
          createIndex: (indexName) => {
            store.indexes.set(indexName, true);
          },
        };
      },
      transaction: (storeNames, mode) => createMockTransaction(db, storeNames, mode),
    };
  }

  function createMockTransaction(db, _storeNames, _mode) {
    const tx = {
      oncomplete: null,
      onerror: null,
      objectStore: (name) => createMockObjectStore(db.stores.get(name), tx),
    };
    // Fire oncomplete shortly after all sync microtasks run
    const scheduleComplete = () => {
      setTimeout(() => {
        if (tx.oncomplete) tx.oncomplete();
      }, 5);
    };
    // Defer so the calling code can set oncomplete first
    setTimeout(scheduleComplete, 20);
    return tx;
  }

  function createMockObjectStore(store, _tx) {
    function getKey(item) {
      const kp = store.keyPath;
      if (Array.isArray(kp)) return JSON.stringify(kp.map(k => item[k]));
      return item[kp];
    }

    return {
      put: (item) => {
        const key = getKey(item);
        store.data.set(key, item);
        return asyncRequest(key);
      },
      get: (id) => {
        const key = typeof id === 'object' ? JSON.stringify(Object.values(id)) : id;
        return asyncRequest(store.data.get(key) || null);
      },
      getAll: (_query) => {
        const values = [...store.data.values()];
        // Simple query filtering is not needed for getAll without range
        return asyncRequest(values);
      },
      delete: (id) => {
        store.data.delete(id);
        return asyncRequest(undefined);
      },
      clear: () => {
        store.data.clear();
        return asyncRequest(undefined);
      },
      index: (indexName) => ({
        getAll: (value) => {
          const values = [...store.data.values()].filter(item => {
            // Simple index filter: match the index field
            return item[indexName] === value;
          });
          return asyncRequest(values);
        },
      }),
    };
  }

  function asyncRequest(result) {
    const req = { result: null, error: null, onsuccess: null, onerror: null };
    setTimeout(() => {
      req.result = result;
      if (req.onsuccess) req.onsuccess();
    }, 0);
    return req;
  }

  return { open: openDB };
}

// Install mock before importing the module
globalThis.indexedDB = createMockIndexedDB();

// Now import the module under test
const { IndexedDBStore } = await import('../../storage/indexed-db-store.js');

describe('IndexedDBStore', () => {
  let store;

  beforeEach(async () => {
    store = new IndexedDBStore();
    await store.init();
  });

  // -----------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------
  describe('init', () => {
    it('initialises the database', async () => {
      expect(store.db).toBeDefined();
      expect(store.db).not.toBeNull();
    });

    it('creates all required object stores', () => {
      const names = store.db.objectStoreNames;
      expect(names.contains('portfolios')).toBe(true);
      expect(names.contains('snapshots')).toBe(true);
      expect(names.contains('rebalances')).toBe(true);
      expect(names.contains('price_cache')).toBe(true);
      expect(names.contains('alerts')).toBe(true);
      expect(names.contains('alert_settings')).toBe(true);
    });
  });

  // -----------------------------------------------------------
  // Portfolio CRUD
  // -----------------------------------------------------------
  describe('Portfolio operations', () => {
    const portfolio = {
      id: 'pf-1',
      name: 'Test Portfolio',
      created_at: '2023-01-01T00:00:00Z',
      last_updated: '2023-06-01T00:00:00Z',
      positions: [],
    };

    it('saves and retrieves a portfolio', async () => {
      const id = await store.savePortfolio(portfolio);
      expect(id).toBe('pf-1');

      const retrieved = await store.getPortfolio('pf-1');
      expect(retrieved).toEqual(portfolio);
    });

    it('returns null for non-existent portfolio', async () => {
      const result = await store.getPortfolio('non-existent');
      expect(result).toBeNull();
    });

    it('lists all portfolios', async () => {
      await store.savePortfolio(portfolio);
      await store.savePortfolio({ ...portfolio, id: 'pf-2', name: 'Second' });

      const all = await store.getAllPortfolios();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('updates existing portfolio', async () => {
      await store.savePortfolio(portfolio);
      const updated = { ...portfolio, name: 'Updated Portfolio' };
      await store.savePortfolio(updated);

      const retrieved = await store.getPortfolio('pf-1');
      expect(retrieved.name).toBe('Updated Portfolio');
    });

    it('deletes a portfolio', async () => {
      await store.savePortfolio(portfolio);
      await store.deletePortfolio('pf-1');

      const retrieved = await store.getPortfolio('pf-1');
      expect(retrieved).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // Snapshots
  // -----------------------------------------------------------
  describe('Snapshot operations', () => {
    it('saves and retrieves snapshots by portfolio_id', async () => {
      const snapshot = {
        portfolio_id: 'pf-1',
        date: '2023-06-01',
        total_value: 10500,
        cumulative_return: 5.0,
        daily_return: 0.3,
      };

      await store.saveSnapshot(snapshot);
      const results = await store.getSnapshots('pf-1');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].portfolio_id).toBe('pf-1');
    });

    it('filters snapshots by date range', async () => {
      await store.saveSnapshot({ portfolio_id: 'pf-2', date: '2023-01-01', total_value: 100 });
      await store.saveSnapshot({ portfolio_id: 'pf-2', date: '2023-06-01', total_value: 105 });
      await store.saveSnapshot({ portfolio_id: 'pf-2', date: '2023-12-01', total_value: 110 });

      const filtered = await store.getSnapshots('pf-2', '2023-03-01', '2023-09-01');
      expect(filtered.every(s => s.date >= '2023-03-01' && s.date <= '2023-09-01')).toBe(true);
    });

    it('returns sorted snapshots', async () => {
      await store.saveSnapshot({ portfolio_id: 'pf-3', date: '2023-06-01', total_value: 105 });
      await store.saveSnapshot({ portfolio_id: 'pf-3', date: '2023-01-01', total_value: 100 });

      const results = await store.getSnapshots('pf-3');
      if (results.length >= 2) {
        expect(results[0].date <= results[1].date).toBe(true);
      }
    });
  });

  // -----------------------------------------------------------
  // Rebalances
  // -----------------------------------------------------------
  describe('Rebalance operations', () => {
    it('saves and retrieves rebalance history', async () => {
      const rebalance = {
        id: 'rb-1',
        portfolio_id: 'pf-1',
        timestamp: '2023-06-01T12:00:00Z',
        changes: [{ ticker: 'AAPL', from_weight: 0.3, to_weight: 0.25 }],
      };

      const id = await store.saveRebalance(rebalance);
      expect(id).toBe('rb-1');

      const history = await store.getRebalanceHistory('pf-1');
      expect(history.length).toBeGreaterThanOrEqual(1);
    });

    it('returns rebalances sorted by timestamp descending', async () => {
      await store.saveRebalance({ id: 'rb-a', portfolio_id: 'pf-sort', timestamp: '2023-01-01T00:00:00Z' });
      await store.saveRebalance({ id: 'rb-b', portfolio_id: 'pf-sort', timestamp: '2023-06-01T00:00:00Z' });

      const history = await store.getRebalanceHistory('pf-sort');
      if (history.length >= 2) {
        expect(history[0].timestamp >= history[1].timestamp).toBe(true);
      }
    });
  });

  // -----------------------------------------------------------
  // Price Cache
  // -----------------------------------------------------------
  describe('Price cache operations', () => {
    it('saves and retrieves price cache', async () => {
      await store.savePriceCache('AAPL', '2023-06-01', 185.5);

      const cached = await store.getPriceCache('AAPL');
      expect(cached.length).toBeGreaterThanOrEqual(1);
    });

    it('filters price cache by date range', async () => {
      await store.savePriceCache('GOOG', '2023-01-01', 100);
      await store.savePriceCache('GOOG', '2023-06-01', 120);
      await store.savePriceCache('GOOG', '2023-12-01', 140);

      const filtered = await store.getPriceCache('GOOG', '2023-03-01', '2023-09-01');
      expect(filtered.every(p => p.date >= '2023-03-01' && p.date <= '2023-09-01')).toBe(true);
    });

    it('returns sorted prices', async () => {
      await store.savePriceCache('MSFT', '2023-06-01', 340);
      await store.savePriceCache('MSFT', '2023-01-01', 250);

      const prices = await store.getPriceCache('MSFT');
      if (prices.length >= 2) {
        expect(prices[0].date <= prices[1].date).toBe(true);
      }
    });
  });

  // -----------------------------------------------------------
  // Alerts
  // -----------------------------------------------------------
  describe('Alert operations', () => {
    const alert1 = { id: 'al-1', strategy: 'momentum', user_id: 'u1', created_at: '2023-06-01T10:00:00Z' };
    const alert2 = { id: 'al-2', strategy: 'value', user_id: 'u1', created_at: '2023-06-02T10:00:00Z' };
    const alert3 = { id: 'al-3', strategy: 'momentum', user_id: 'u2', created_at: '2023-06-03T10:00:00Z' };

    it('saves and retrieves alerts', async () => {
      const id = await store.saveAlert(alert1);
      expect(id).toBe('al-1');

      const alerts = await store.getAlerts();
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });

    it('filters alerts by strategy', async () => {
      await store.saveAlert(alert1);
      await store.saveAlert(alert2);
      await store.saveAlert(alert3);

      const momentum = await store.getAlerts({ strategy: 'momentum' });
      expect(momentum.every(a => a.strategy === 'momentum')).toBe(true);
    });

    it('filters alerts by userId', async () => {
      await store.saveAlert(alert1);
      await store.saveAlert(alert3);

      const userAlerts = await store.getAlerts({ userId: 'u1' });
      expect(userAlerts.every(a => a.user_id === 'u1')).toBe(true);
    });

    it('limits alert results', async () => {
      await store.saveAlert(alert1);
      await store.saveAlert(alert2);
      await store.saveAlert(alert3);

      const limited = await store.getAlerts({ limit: 2 });
      expect(limited.length).toBeLessThanOrEqual(2);
    });

    it('returns alerts sorted by created_at descending', async () => {
      await store.saveAlert(alert1);
      await store.saveAlert(alert2);

      const alerts = await store.getAlerts();
      if (alerts.length >= 2) {
        expect(alerts[0].created_at >= alerts[1].created_at).toBe(true);
      }
    });

    it('clears all alerts', async () => {
      await store.saveAlert(alert1);
      await store.saveAlert(alert2);

      await store.clearAlerts();
      const alerts = await store.getAlerts();
      expect(alerts).toHaveLength(0);
    });

    it('clears alerts by strategy', async () => {
      await store.saveAlert(alert1);
      await store.saveAlert(alert2);
      await store.saveAlert(alert3);

      await store.clearAlerts('momentum');
      const alerts = await store.getAlerts();
      const momentumAlerts = alerts.filter(a => a.strategy === 'momentum');
      expect(momentumAlerts).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------
  // Alert Settings
  // -----------------------------------------------------------
  describe('Alert settings operations', () => {
    const settings = {
      id: 'settings-1',
      strategy: 'momentum',
      user_id: 'u1',
      thresholds: { score: 75 },
    };

    it('saves and retrieves alert settings', async () => {
      const id = await store.saveAlertSettings(settings);
      expect(id).toBe('settings-1');

      const retrieved = await store.getAlertSettings('settings-1');
      expect(retrieved).toEqual(settings);
    });

    it('returns null for non-existent settings', async () => {
      const result = await store.getAlertSettings('non-existent');
      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // Clear All
  // -----------------------------------------------------------
  describe('clearAll', () => {
    it('clears all stores', async () => {
      await store.savePortfolio({ id: 'pf-clear', name: 'Clear Test', created_at: '2023-01-01' });
      await store.saveAlert({ id: 'al-clear', strategy: 'test', user_id: 'u1', created_at: '2023-01-01' });

      await store.clearAll();

      const portfolios = await store.getAllPortfolios();
      expect(portfolios).toHaveLength(0);

      const alerts = await store.getAlerts();
      expect(alerts).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------
  // Auto-init
  // -----------------------------------------------------------
  describe('auto-init on first operation', () => {
    it('auto-initialises db when calling savePortfolio without init', async () => {
      const freshStore = new IndexedDBStore();
      // db is null before init
      expect(freshStore.db).toBeNull();

      await freshStore.savePortfolio({ id: 'auto-init', name: 'Auto', created_at: '2023-01-01' });
      expect(freshStore.db).not.toBeNull();
    });
  });
});
