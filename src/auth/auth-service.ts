/**
 * Authentication Service
 *
 * Handles all authentication business logic:
 * register, login, logout, token refresh, password reset.
 *
 * @module auth/auth-service
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { config } from '../config/environment.js';
import * as UserModel from './user-model.js';
import type { User, UserRole, PublicUser } from './user-model.js';
import { log } from '../utils/logger.js';
import { AuthenticationError, ConflictError } from '../middleware/error-handler.js';

const BCRYPT_ROUNDS = 12;

// Dummy hash used for constant-time comparison when user not found
const DUMMY_HASH = '$2b$12$invalidhashpaddinginvalidhashpaddinginvalidhashpadding.';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends TokenPair {
  user: PublicUser;
}

interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

interface RefreshTokenPayload extends TokenPayload {
  jti: string;
}

// ── Token helpers ─────────────────────────────────────────────────────────────

function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    { sub: payload.sub, email: payload.email, role: payload.role },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  );
}

function signRefreshToken(payload: TokenPayload): string {
  // jti (JWT ID) is a random nonce ensuring each refresh token is unique
  // even if two tokens are issued within the same second for the same user
  return jwt.sign(
    { sub: payload.sub, email: payload.email, role: payload.role, jti: crypto.randomBytes(16).toString('hex') },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'] }
  );
}

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateSecureToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/** Issues an access+refresh token pair and stores the refresh token hash in DB */
async function issueTokenPair(user: User): Promise<TokenPair> {
  const payload: TokenPayload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const rawRefreshToken = signRefreshToken(payload);
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  UserModel.createRefreshToken(user.id, tokenHash, expiresAt);

  return { accessToken, refreshToken: rawRefreshToken };
}

// ── Email ─────────────────────────────────────────────────────────────────────

async function sendPasswordResetEmail(email: string, rawToken: string): Promise<void> {
  if (!config.smtp) return;

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port ?? 587,
    secure: config.smtp.secure ?? false,
    auth: config.smtp.auth.user ? {
      user: config.smtp.auth.user,
      pass: config.smtp.auth.pass
    } : undefined
  });

  const resetUrl = `${config.auth.appUrl}/reset-password?token=${rawToken}`;

  await transporter.sendMail({
    from: config.smtp.auth.user ?? 'noreply@globalquantscanner.com',
    to: email,
    subject: 'Password Reset — Global Quant Scanner Pro',
    text: `You requested a password reset.\n\nClick the link below (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset your password</a> (valid for 1 hour)</p><p>If you did not request this, ignore this email.</p>`
  });
}

// ── Auth operations ──────────────────────────────────────────────────────────

/**
 * Register a new user account.
 * The first user ever registered is automatically promoted to 'admin'.
 * Throws ConflictError if email is already taken.
 */
export async function register(email: string, password: string, role: UserRole = 'viewer'): Promise<AuthResult> {
  const normalised = email.toLowerCase().trim();
  const existing = UserModel.findUserByEmail(normalised);
  if (existing) {
    throw new ConflictError('Email address is already registered');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = UserModel.createUser(normalised, passwordHash, role);
  log.info('User registered', { userId: user.id, role: user.role });

  const tokens = await issueTokenPair(user);
  return { user: UserModel.toPublicUser(user), ...tokens };
}

/**
 * Validate credentials and return a token pair.
 * Uses constant-time comparison to prevent timing attacks.
 * Throws AuthenticationError on invalid credentials.
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  const normalised = email.toLowerCase().trim();
  const user = UserModel.findUserByEmail(normalised);

  // Always call bcrypt.compare — prevents timing attacks revealing whether email exists
  const hashToCompare = user?.password_hash ?? DUMMY_HASH;
  const valid = await bcrypt.compare(password, hashToCompare);

  if (!user || !valid) {
    throw new AuthenticationError('Invalid email or password');
  }

  log.info('User logged in', { userId: user.id });
  const tokens = await issueTokenPair(user);
  return { user: UserModel.toPublicUser(user), ...tokens };
}

/**
 * Invalidate a refresh token (server-side logout).
 */
export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  const stored = UserModel.findRefreshToken(tokenHash);
  if (!stored) {
    throw new AuthenticationError('Refresh token not found or already invalidated');
  }
  UserModel.deleteRefreshToken(tokenHash);
  log.info('User logged out', { userId: stored.user_id });
}

/**
 * Rotate tokens: validate old refresh token, issue new access+refresh pair.
 * The old refresh token is deleted (prevents replay attacks).
 */
export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  // Verify JWT signature and expiry first
  let payload: RefreshTokenPayload;
  try {
    payload = jwt.verify(refreshToken, config.auth.jwtSecret) as RefreshTokenPayload;
  } catch {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  // Check the token hash exists in DB (wasn't revoked or rotated)
  const tokenHash = hashToken(refreshToken);
  const stored = UserModel.findRefreshToken(tokenHash);
  if (!stored || new Date(stored.expires_at) < new Date()) {
    throw new AuthenticationError('Refresh token not found or expired');
  }

  // Delete old token (rotation)
  UserModel.deleteRefreshToken(tokenHash);

  // Re-fetch user to pick up any role changes since last login
  const user = UserModel.findUserById(payload.sub);
  if (!user) {
    throw new AuthenticationError('User account not found');
  }

  return issueTokenPair(user);
}

/**
 * Initiate password reset flow.
 * Always returns void — never reveals whether the email is registered.
 */
export async function forgotPassword(email: string): Promise<void> {
  const normalised = email.toLowerCase().trim();
  const user = UserModel.findUserByEmail(normalised);

  // Silent return when user not found — prevents user enumeration
  if (!user) {
    log.debug('forgotPassword: email not found, silently ignoring', { email: normalised });
    return;
  }

  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  UserModel.createPasswordReset(user.id, tokenHash, expiresAt);

  if (config.smtp) {
    await sendPasswordResetEmail(user.email, rawToken);
    log.info('Password reset email sent', { userId: user.id });
  } else {
    // Development fallback: log that a reset was requested (never log the token itself)
    log.warn('SMTP not configured — password reset token generated but not emailed (DEV ONLY)', {
      userId: user.id
    });
  }
}

/**
 * Complete password reset.
 * Throws AuthenticationError if token is invalid, expired, or already used.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);
  const reset = UserModel.findValidPasswordReset(tokenHash);
  if (!reset) {
    throw new AuthenticationError('Password reset token is invalid, expired, or already used');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Update password (direct DB update — user-model intentionally doesn't expose updatePassword
  // to keep it minimal; we use a raw statement here via getDb)
  const { getDb } = await import('../config/database.js');
  getDb().prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = ?
  `).run(passwordHash, reset.user_id);

  // Invalidate the reset token
  UserModel.markPasswordResetUsed(reset.id);

  // Invalidate all existing refresh tokens for the user (force re-login everywhere)
  UserModel.deleteAllUserRefreshTokens(reset.user_id);

  log.info('Password reset completed', { userId: reset.user_id });
}
