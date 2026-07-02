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

    CREATE INDEX IF NOT EXISTS idx_rt_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_rt_expires  ON refresh_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_pr_user_id  ON password_resets(user_id);
    CREATE INDEX IF NOT EXISTS idx_pr_expires  ON password_resets(expires_at);
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
