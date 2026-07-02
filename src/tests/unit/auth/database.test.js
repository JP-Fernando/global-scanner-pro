import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, closeDb } from '../../../config/database.js';

describe('config/database', () => {
  beforeEach(() => {
    closeDb();
  });

  it('lazily creates a SQLite connection and is idempotent', () => {
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });

  it('creates the auth and user-data persistence tables', () => {
    const db = getDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((row) => row.name);

    expect(tables).toContain('users');
    expect(tables).toContain('refresh_tokens');
    expect(tables).toContain('password_resets');
    expect(tables).toContain('user_preferences');
    expect(tables).toContain('portfolios');
    expect(tables).toContain('portfolio_positions');
    expect(tables).toContain('portfolio_snapshots');
    expect(tables).toContain('portfolio_rebalances');
    expect(tables).toContain('alert_settings');
    expect(tables).toContain('alert_events');
    expect(tables).toContain('alert_deliveries');
  });

  it('running migrations twice does not throw (idempotent DDL)', () => {
    const db = getDb();
    expect(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE
        );
      `);
    }).not.toThrow();
  });

  it('enforces foreign key constraints', () => {
    const db = getDb();
    const fkStatus = db.pragma('foreign_keys', { simple: true });
    expect(fkStatus).toBe(1);
  });

  it('closeDb() resets the singleton so getDb() creates a fresh connection', () => {
    const db1 = getDb();
    closeDb();
    const db2 = getDb();
    expect(db1).not.toBe(db2);
  });
});
