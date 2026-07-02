/**
 * SQLite Database Initialisation
 *
 * Provides a lazy-singleton better-sqlite3 connection with WAL mode,
 * foreign key enforcement, and idempotent DDL migrations.
 *
 * @module config/database
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from './environment.js';
import { log } from '../utils/logger.js';

let db: Database.Database | null = null;

/**
 * Returns (and lazily initialises) the SQLite database connection.
 * Idempotent — safe to call multiple times.
 */
export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = config.auth.databasePath;

  // ':memory:' has no directory to create (used by tests)
  if (dbPath !== ':memory:') {
    const dbDir = path.dirname(dbPath);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance (no-op for :memory:)
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }

  // Enforce foreign key constraints
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  log.info('SQLite database initialised', { path: dbPath });

  return db;
}

/**
 * Runs all DDL migrations. Idempotent (CREATE TABLE IF NOT EXISTS).
 */
function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'viewer'
                    CHECK (role IN ('admin','analyst','viewer')),
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT NOT NULL UNIQUE,
      expires_at  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT NOT NULL UNIQUE,
      expires_at  TEXT NOT NULL,
      used        INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id           TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      locale            TEXT NOT NULL DEFAULT 'es',
      timezone          TEXT NOT NULL DEFAULT 'UTC',
      theme             TEXT NOT NULL DEFAULT 'system'
                        CHECK (theme IN ('light','dark','system')),
      scanner_defaults  TEXT NOT NULL DEFAULT '{}',
      dashboard_layout  TEXT NOT NULL DEFAULT '{}',
      alert_defaults    TEXT NOT NULL DEFAULT '{}',
      created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS portfolios (
      id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name              TEXT NOT NULL,
      description       TEXT NOT NULL DEFAULT '',
      benchmark         TEXT NOT NULL DEFAULT '^GSPC',
      strategy          TEXT NOT NULL DEFAULT 'balanced',
      allocation_method TEXT NOT NULL DEFAULT 'equal_weight',
      initial_capital   REAL NOT NULL DEFAULT 0,
      current_value     REAL NOT NULL DEFAULT 0,
      total_return      REAL NOT NULL DEFAULT 0,
      total_return_pct  REAL NOT NULL DEFAULT 0,
      status            TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','closed','archived')),
      last_rebalance_at TEXT,
      source            TEXT NOT NULL DEFAULT 'server'
                        CHECK (source IN ('server','imported','local_migrated')),
      version           INTEGER NOT NULL DEFAULT 1,
      created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS portfolio_positions (
      id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      portfolio_id   TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      ticker         TEXT NOT NULL,
      name           TEXT NOT NULL DEFAULT '',
      sector         TEXT NOT NULL DEFAULT 'Unknown',
      entry_date     TEXT,
      entry_price    REAL NOT NULL DEFAULT 0,
      quantity       REAL NOT NULL DEFAULT 0,
      target_weight  REAL NOT NULL DEFAULT 0,
      current_weight REAL NOT NULL DEFAULT 0,
      score          REAL NOT NULL DEFAULT 0,
      volatility     REAL NOT NULL DEFAULT 0,
      metadata_json  TEXT NOT NULL DEFAULT '{}',
      created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      UNIQUE (portfolio_id, ticker)
    );

    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
      id                 TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      portfolio_id       TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      snapshot_date      TEXT NOT NULL,
      positions_json     TEXT NOT NULL DEFAULT '[]',
      total_value        REAL NOT NULL DEFAULT 0,
      daily_return       REAL NOT NULL DEFAULT 0,
      cumulative_return  REAL NOT NULL DEFAULT 0,
      benchmark_value    REAL,
      benchmark_return   REAL,
      created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      UNIQUE (portfolio_id, snapshot_date)
    );

    CREATE TABLE IF NOT EXISTS portfolio_rebalances (
      id                    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      portfolio_id          TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      reason                TEXT NOT NULL,
      before_positions_json TEXT NOT NULL DEFAULT '[]',
      after_positions_json  TEXT NOT NULL DEFAULT '[]',
      changes_json          TEXT NOT NULL DEFAULT '[]',
      total_value           REAL NOT NULL DEFAULT 0,
      created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS alert_settings (
      id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      strategy       TEXT NOT NULL,
      thresholds_json TEXT NOT NULL DEFAULT '{}',
      channels_json   TEXT NOT NULL DEFAULT '{}',
      notify_on_json  TEXT NOT NULL DEFAULT '{}',
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      UNIQUE (user_id, strategy)
    );

    CREATE TABLE IF NOT EXISTS alert_events (
      id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      portfolio_id    TEXT REFERENCES portfolios(id) ON DELETE SET NULL,
      strategy        TEXT NOT NULL,
      type            TEXT NOT NULL,
      severity        TEXT NOT NULL DEFAULT 'info'
                      CHECK (severity IN ('info','warning','error','critical')),
      title           TEXT NOT NULL,
      message         TEXT NOT NULL,
      metadata_json   TEXT NOT NULL DEFAULT '{}',
      dedupe_key      TEXT,
      delivery_status TEXT NOT NULL DEFAULT 'pending'
                      CHECK (delivery_status IN ('pending','delivered','partial','queued','failed','skipped')),
      delivered_at    TEXT,
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS alert_deliveries (
      id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      alert_event_id TEXT NOT NULL REFERENCES alert_events(id) ON DELETE CASCADE,
      channel        TEXT NOT NULL,
      status         TEXT NOT NULL
                     CHECK (status IN ('delivered','failed','queued')),
      status_code    INTEGER,
      response       TEXT NOT NULL DEFAULT '',
      delivered_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_rt_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_rt_expires  ON refresh_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_pr_user_id  ON password_resets(user_id);
    CREATE INDEX IF NOT EXISTS idx_pr_expires  ON password_resets(expires_at);
    CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
    CREATE INDEX IF NOT EXISTS idx_portfolios_status ON portfolios(status);
    CREATE INDEX IF NOT EXISTS idx_portfolio_positions_portfolio_id ON portfolio_positions(portfolio_id);
    CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_portfolio_date ON portfolio_snapshots(portfolio_id, snapshot_date);
    CREATE INDEX IF NOT EXISTS idx_portfolio_rebalances_portfolio_id ON portfolio_rebalances(portfolio_id);
    CREATE INDEX IF NOT EXISTS idx_alert_settings_user_strategy ON alert_settings(user_id, strategy);
    CREATE INDEX IF NOT EXISTS idx_alert_events_user_created ON alert_events(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_alert_events_portfolio_id ON alert_events(portfolio_id);
    CREATE INDEX IF NOT EXISTS idx_alert_events_dedupe_key ON alert_events(dedupe_key);
    CREATE INDEX IF NOT EXISTS idx_alert_deliveries_event_id ON alert_deliveries(alert_event_id);
  `);
}

/**
 * Gracefully closes the database connection.
 * Call during application shutdown, or between test files to force
 * re-initialisation against a fresh `:memory:` database.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    log.info('SQLite database connection closed');
  }
}
