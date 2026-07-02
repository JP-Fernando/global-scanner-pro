/**
 * User Model — Data Access Layer
 *
 * All functions are synchronous (better-sqlite3 is synchronous by design).
 * No business logic lives here — only raw DB operations.
 *
 * @module auth/user-model
 */

import { getDb } from '../config/database.js';

export type UserRole = 'admin' | 'analyst' | 'viewer';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  email_verified: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  email_verified: boolean;
  created_at: string;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

interface PasswordResetRowRaw {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used: number;
  created_at: string;
}

export interface PasswordResetRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapUser(row: UserRow): User {
  return {
    ...row,
    role: row.role,
    email_verified: row.email_verified === 1
  };
}

function mapPasswordReset(row: PasswordResetRowRaw): PasswordResetRow {
  return {
    ...row,
    used: row.used === 1
  };
}

// ── Users ────────────────────────────────────────────────────────────────────

/**
 * Creates a new user. If the users table is empty the first user is
 * automatically promoted to 'admin' regardless of the requested role.
 */
export function createUser(email: string, passwordHash: string, role: UserRole = 'viewer'): User {
  const db = getDb();

  // Admin bootstrap: first user is always admin
  const countRow = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  const effectiveRole: UserRole = countRow.n === 0 ? 'admin' : role;

  const row = db.prepare(`
    INSERT INTO users (email, password_hash, role)
    VALUES (?, ?, ?)
    RETURNING *
  `).get(email, passwordHash, effectiveRole) as UserRow;

  return mapUser(row);
}

export function findUserByEmail(email: string): User | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email) as UserRow | undefined;
  return row ? mapUser(row) : undefined;
}

export function findUserById(id: string): User | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? mapUser(row) : undefined;
}

export function updateUserRole(userId: string, role: UserRole): void {
  const db = getDb();
  db.prepare(`
    UPDATE users SET role = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = ?
  `).run(role, userId);
}

export function markEmailVerified(userId: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE users SET email_verified = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = ?
  `).run(userId);
}

/** Returns a safe representation without password_hash */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    email_verified: user.email_verified,
    created_at: user.created_at
  };
}

// ── Refresh Tokens ───────────────────────────────────────────────────────────

export function createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): RefreshTokenRow {
  const db = getDb();
  return db.prepare(`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
    RETURNING *
  `).get(userId, tokenHash, expiresAt.toISOString()) as RefreshTokenRow;
}

export function findRefreshToken(tokenHash: string): RefreshTokenRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(tokenHash) as RefreshTokenRow | undefined;
}

export function deleteRefreshToken(tokenHash: string): void {
  const db = getDb();
  db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
}

export function deleteAllUserRefreshTokens(userId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
}

export function purgeExpiredRefreshTokens(): void {
  const db = getDb();
  db.prepare(`DELETE FROM refresh_tokens WHERE expires_at < strftime('%Y-%m-%dT%H:%M:%fZ','now')`).run();
}

// ── Password Resets ──────────────────────────────────────────────────────────

export function createPasswordReset(userId: string, tokenHash: string, expiresAt: Date): PasswordResetRow {
  const db = getDb();
  const row = db.prepare(`
    INSERT INTO password_resets (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
    RETURNING *
  `).get(userId, tokenHash, expiresAt.toISOString()) as PasswordResetRowRaw;
  return mapPasswordReset(row);
}

/** Returns only non-expired, unused reset records */
export function findValidPasswordReset(tokenHash: string): PasswordResetRow | undefined {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM password_resets
    WHERE token_hash = ?
      AND used = 0
      AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')
  `).get(tokenHash) as PasswordResetRowRaw | undefined;
  return row ? mapPasswordReset(row) : undefined;
}

export function markPasswordResetUsed(id: string): void {
  const db = getDb();
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(id);
}

export function purgeExpiredPasswordResets(): void {
  const db = getDb();
  db.prepare(`DELETE FROM password_resets WHERE expires_at < strftime('%Y-%m-%dT%H:%M:%fZ','now')`).run();
}
