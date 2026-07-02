import { describe, it, expect, beforeEach } from 'vitest';
import { closeDb } from '../../../config/database.js';
import * as UserModel from '../../../auth/user-model.js';

describe('auth/user-model', () => {
  beforeEach(() => {
    closeDb();
  });

  describe('createUser', () => {
    it('creates a user with the requested role', () => {
      // First user is always promoted to admin, so create a throwaway one first
      UserModel.createUser('first@example.com', 'hash0', 'viewer');
      const user = UserModel.createUser('viewer@example.com', 'hash1', 'viewer');
      expect(user.email).toBe('viewer@example.com');
      expect(user.role).toBe('viewer');
      expect(user.email_verified).toBe(false);
      expect(user.id).toBeTruthy();
    });

    it('promotes the first-ever user to admin regardless of requested role', () => {
      const user = UserModel.createUser('bootstrap@example.com', 'hash', 'viewer');
      expect(user.role).toBe('admin');
    });

    it('does not promote the second user', () => {
      UserModel.createUser('admin@example.com', 'hash0', 'viewer');
      const second = UserModel.createUser('second@example.com', 'hash1', 'analyst');
      expect(second.role).toBe('analyst');
    });
  });

  describe('findUserByEmail / findUserById', () => {
    it('finds a user by email case-insensitively', () => {
      const created = UserModel.createUser('Case@Example.com', 'hash');
      const found = UserModel.findUserByEmail('case@example.com');
      expect(found?.id).toBe(created.id);
    });

    it('returns undefined for unknown email', () => {
      expect(UserModel.findUserByEmail('missing@example.com')).toBeUndefined();
    });

    it('finds a user by id', () => {
      const created = UserModel.createUser('byid@example.com', 'hash');
      const found = UserModel.findUserById(created.id);
      expect(found?.email).toBe('byid@example.com');
    });

    it('returns undefined for unknown id', () => {
      expect(UserModel.findUserById('does-not-exist')).toBeUndefined();
    });
  });

  describe('updateUserRole / markEmailVerified', () => {
    it('updates a role', () => {
      UserModel.createUser('first@example.com', 'hash0');
      const user = UserModel.createUser('promote@example.com', 'hash', 'viewer');
      UserModel.updateUserRole(user.id, 'analyst');
      expect(UserModel.findUserById(user.id)?.role).toBe('analyst');
    });

    it('marks the email as verified', () => {
      const user = UserModel.createUser('verify@example.com', 'hash');
      expect(UserModel.findUserById(user.id)?.email_verified).toBe(false);
      UserModel.markEmailVerified(user.id);
      expect(UserModel.findUserById(user.id)?.email_verified).toBe(true);
    });
  });

  describe('toPublicUser', () => {
    it('strips the password hash', () => {
      const user = UserModel.createUser('public@example.com', 'super-secret-hash');
      const publicUser = UserModel.toPublicUser(user);
      expect(publicUser).not.toHaveProperty('password_hash');
      expect(publicUser.email).toBe('public@example.com');
    });
  });

  describe('refresh tokens', () => {
    it('creates, finds, and deletes a refresh token', () => {
      const user = UserModel.createUser('rt@example.com', 'hash');
      const expiresAt = new Date(Date.now() + 60_000);
      const created = UserModel.createRefreshToken(user.id, 'tokenhash123', expiresAt);
      expect(created.user_id).toBe(user.id);

      const found = UserModel.findRefreshToken('tokenhash123');
      expect(found?.id).toBe(created.id);

      UserModel.deleteRefreshToken('tokenhash123');
      expect(UserModel.findRefreshToken('tokenhash123')).toBeUndefined();
    });

    it('deletes all refresh tokens for a user', () => {
      const user = UserModel.createUser('rtall@example.com', 'hash');
      UserModel.createRefreshToken(user.id, 'hashA', new Date(Date.now() + 60_000));
      UserModel.createRefreshToken(user.id, 'hashB', new Date(Date.now() + 60_000));

      UserModel.deleteAllUserRefreshTokens(user.id);

      expect(UserModel.findRefreshToken('hashA')).toBeUndefined();
      expect(UserModel.findRefreshToken('hashB')).toBeUndefined();
    });

    it('purges only expired refresh tokens', () => {
      const user = UserModel.createUser('rtpurge@example.com', 'hash');
      UserModel.createRefreshToken(user.id, 'expired', new Date(Date.now() - 60_000));
      UserModel.createRefreshToken(user.id, 'valid', new Date(Date.now() + 60_000));

      UserModel.purgeExpiredRefreshTokens();

      expect(UserModel.findRefreshToken('expired')).toBeUndefined();
      expect(UserModel.findRefreshToken('valid')).toBeDefined();
    });
  });

  describe('password resets', () => {
    it('creates and finds a valid password reset', () => {
      const user = UserModel.createUser('reset@example.com', 'hash');
      const expiresAt = new Date(Date.now() + 60_000);
      UserModel.createPasswordReset(user.id, 'resethash', expiresAt);

      const found = UserModel.findValidPasswordReset('resethash');
      expect(found?.user_id).toBe(user.id);
      expect(found?.used).toBe(false);
    });

    it('does not return an expired reset', () => {
      const user = UserModel.createUser('expiredreset@example.com', 'hash');
      UserModel.createPasswordReset(user.id, 'expiredhash', new Date(Date.now() - 60_000));

      expect(UserModel.findValidPasswordReset('expiredhash')).toBeUndefined();
    });

    it('does not return a used reset', () => {
      const user = UserModel.createUser('usedreset@example.com', 'hash');
      const reset = UserModel.createPasswordReset(user.id, 'usedhash', new Date(Date.now() + 60_000));

      UserModel.markPasswordResetUsed(reset.id);

      expect(UserModel.findValidPasswordReset('usedhash')).toBeUndefined();
    });

    it('purges only expired password resets', () => {
      const user = UserModel.createUser('purgereset@example.com', 'hash');
      UserModel.createPasswordReset(user.id, 'expiredp', new Date(Date.now() - 60_000));
      UserModel.createPasswordReset(user.id, 'validp', new Date(Date.now() + 60_000));

      UserModel.purgeExpiredPasswordResets();

      expect(UserModel.findValidPasswordReset('validp')).toBeDefined();
    });
  });
});
