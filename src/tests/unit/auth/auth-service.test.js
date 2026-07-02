import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { closeDb } from '../../../config/database.js';
import { config } from '../../../config/environment.js';
import * as AuthService from '../../../auth/auth-service.js';
import * as UserModel from '../../../auth/user-model.js';

/** Mirrors the private hashToken() in auth-service.ts (sha256 hex digest) */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

describe('auth/auth-service', () => {
  beforeEach(() => {
    closeDb();
  });

  describe('register', () => {
    it('creates a user and returns a token pair', async () => {
      const result = await AuthService.register('new@example.com', 'password123');
      expect(result.user.email).toBe('new@example.com');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user).not.toHaveProperty('password_hash');
    });

    it('promotes the first registered user to admin', async () => {
      const result = await AuthService.register('first@example.com', 'password123', 'viewer');
      expect(result.user.role).toBe('admin');
    });

    it('rejects duplicate email registration', async () => {
      await AuthService.register('dupe@example.com', 'password123');
      await expect(AuthService.register('dupe@example.com', 'password456'))
        .rejects.toMatchObject({ statusCode: 409 });
    });

    it('hashes the password (never stores it in plain text)', async () => {
      await AuthService.register('hashed@example.com', 'plaintextpassword');
      const stored = UserModel.findUserByEmail('hashed@example.com');
      expect(stored.password_hash).not.toBe('plaintextpassword');
      expect(stored.password_hash.startsWith('$2b$')).toBe(true);
    });

    it('issues an access token whose payload matches the user', async () => {
      const result = await AuthService.register('payload@example.com', 'password123');
      const decoded = jwt.verify(result.accessToken, config.auth.jwtSecret);
      expect(decoded.email).toBe('payload@example.com');
      expect(decoded.sub).toBe(result.user.id);
    });
  });

  describe('login', () => {
    it('logs in with correct credentials', async () => {
      await AuthService.register('login@example.com', 'correcthorse');
      const result = await AuthService.login('login@example.com', 'correcthorse');
      expect(result.user.email).toBe('login@example.com');
      expect(result.accessToken).toBeTruthy();
    });

    it('is case-insensitive on email', async () => {
      await AuthService.register('CaseLogin@example.com', 'correcthorse');
      const result = await AuthService.login('caselogin@example.com', 'correcthorse');
      expect(result.user.email.toLowerCase()).toBe('caselogin@example.com');
    });

    it('rejects an incorrect password', async () => {
      await AuthService.register('wrongpass@example.com', 'correcthorse');
      await expect(AuthService.login('wrongpass@example.com', 'wrongpassword'))
        .rejects.toMatchObject({ statusCode: 401 });
    });

    it('rejects a non-existent email with the same error as a wrong password', async () => {
      await expect(AuthService.login('doesnotexist@example.com', 'anything'))
        .rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' });
    });
  });

  describe('logout', () => {
    it('invalidates a refresh token', async () => {
      const { refreshToken } = await AuthService.register('logout@example.com', 'password123');
      await AuthService.logout(refreshToken);
      // Using it again for refresh should now fail
      await expect(AuthService.refreshTokens(refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    });

    it('rejects an unknown refresh token', async () => {
      const fakeToken = jwt.sign({ sub: 'x', email: 'x@example.com', role: 'viewer' }, config.auth.jwtSecret);
      await expect(AuthService.logout(fakeToken)).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('refreshTokens', () => {
    it('rotates tokens: old refresh token becomes invalid, new one works', async () => {
      const { refreshToken } = await AuthService.register('rotate@example.com', 'password123');
      const rotated = await AuthService.refreshTokens(refreshToken);

      expect(rotated.accessToken).toBeTruthy();
      expect(rotated.refreshToken).not.toBe(refreshToken);

      await expect(AuthService.refreshTokens(refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    });

    it('rejects a malformed/invalid JWT', async () => {
      await expect(AuthService.refreshTokens('not-a-real-jwt')).rejects.toMatchObject({ statusCode: 401 });
    });

    it('picks up role changes since the token was issued', async () => {
      const { user, refreshToken } = await AuthService.register('rolechange@example.com', 'password123');
      UserModel.updateUserRole(user.id, 'analyst');

      const rotated = await AuthService.refreshTokens(refreshToken);
      const decoded = jwt.verify(rotated.accessToken, config.auth.jwtSecret);
      expect(decoded.role).toBe('analyst');
    });

    it('rejects if the user account no longer exists (defensive check)', async () => {
      const { refreshToken } = await AuthService.register('ghost2@example.com', 'password123');
      vi.spyOn(UserModel, 'findUserById').mockReturnValueOnce(undefined);

      await expect(AuthService.refreshTokens(refreshToken)).rejects.toMatchObject({ statusCode: 401 });
      vi.restoreAllMocks();
    });
  });

  describe('forgotPassword / resetPassword', () => {
    it('silently returns for an unknown email (prevents enumeration)', async () => {
      await expect(AuthService.forgotPassword('unknown@example.com')).resolves.toBeUndefined();
    });

    it('sends a reset email via nodemailer when SMTP is configured', async () => {
      await AuthService.register('smtp@example.com', 'password123');

      const sendMail = vi.fn().mockResolvedValue(undefined);
      const nodemailer = (await import('nodemailer')).default;
      const createTransportSpy = vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail });

      const originalSmtp = config.smtp;
      config.smtp = {
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: { user: 'test@example.com', pass: 'secret' }
      };

      try {
        await AuthService.forgotPassword('smtp@example.com');
        expect(createTransportSpy).toHaveBeenCalledOnce();
        expect(sendMail).toHaveBeenCalledOnce();
        expect(sendMail.mock.calls[0][0].to).toBe('smtp@example.com');
      } finally {
        config.smtp = originalSmtp;
        createTransportSpy.mockRestore();
      }
    });

    it('rejects an unknown/invalid reset token', async () => {
      await expect(AuthService.resetPassword('not-a-real-token', 'newpassword123'))
        .rejects.toMatchObject({ statusCode: 401 });
    });

    it('completes a full reset cycle: new password works, old refresh tokens are revoked', async () => {
      const { user, refreshToken } = await AuthService.register('forgot@example.com', 'oldpassword');

      // Simulate what forgotPassword() does internally, but with a raw token we control
      // so the test can complete the cycle without needing SMTP or log-scraping.
      const rawToken = 'a-known-raw-reset-token';
      UserModel.createPasswordReset(user.id, hashToken(rawToken), new Date(Date.now() + 60 * 60 * 1000));

      await AuthService.resetPassword(rawToken, 'newpassword456');

      // The reset token cannot be reused
      await expect(AuthService.resetPassword(rawToken, 'anotherpassword'))
        .rejects.toMatchObject({ statusCode: 401 });

      // Old sessions are invalidated by a completed reset
      await expect(AuthService.refreshTokens(refreshToken)).rejects.toMatchObject({ statusCode: 401 });

      // Login works with the new password, not the old one
      await expect(AuthService.login('forgot@example.com', 'oldpassword'))
        .rejects.toMatchObject({ statusCode: 401 });
      const loggedIn = await AuthService.login('forgot@example.com', 'newpassword456');
      expect(loggedIn.user.email).toBe('forgot@example.com');
    });
  });
});
