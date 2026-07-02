import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { closeDb } from '../../../config/database.js';
import { config } from '../../../config/environment.js';
import { requireAuth, requireRole } from '../../../auth/auth-middleware.js';
import * as UserModel from '../../../auth/user-model.js';

function mockReq(authorizationHeader) {
  return {
    headers: authorizationHeader ? { authorization: authorizationHeader } : {}
  };
}

function callMiddleware(middleware, req) {
  return new Promise((resolve) => {
    middleware(req, {}, (err) => resolve(err));
  });
}

describe('auth/auth-middleware', () => {
  beforeEach(() => {
    closeDb();
  });

  describe('requireAuth', () => {
    it('rejects a missing Authorization header', async () => {
      const err = await callMiddleware(requireAuth(), mockReq(undefined));
      expect(err).toMatchObject({ statusCode: 401 });
    });

    it('rejects a malformed Authorization header (no Bearer prefix)', async () => {
      const err = await callMiddleware(requireAuth(), mockReq('sometoken'));
      expect(err).toMatchObject({ statusCode: 401 });
    });

    it('rejects an empty Bearer token', async () => {
      const err = await callMiddleware(requireAuth(), mockReq('Bearer '));
      expect(err).toMatchObject({ statusCode: 401 });
    });

    it('rejects an invalid/malformed JWT', async () => {
      const err = await callMiddleware(requireAuth(), mockReq('Bearer not-a-real-jwt'));
      expect(err).toMatchObject({ statusCode: 401 });
    });

    it('rejects a valid JWT for a user that no longer exists', async () => {
      const token = jwt.sign({ sub: 'ghost-id', email: 'ghost@example.com', role: 'viewer' }, config.auth.jwtSecret);
      const err = await callMiddleware(requireAuth(), mockReq(`Bearer ${token}`));
      expect(err).toMatchObject({ statusCode: 401 });
    });

    it('attaches req.user and calls next() with no error for a valid token', async () => {
      const user = UserModel.createUser('mw@example.com', 'hash', 'viewer');
      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        config.auth.jwtSecret,
        { expiresIn: '15m' }
      );

      const req = mockReq(`Bearer ${token}`);
      const err = await callMiddleware(requireAuth(), req);

      expect(err).toBeUndefined();
      expect(req.user).toEqual({ id: user.id, email: user.email, role: user.role });
    });

    it('rejects an expired token', async () => {
      const user = UserModel.createUser('expired@example.com', 'hash', 'viewer');
      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        config.auth.jwtSecret,
        { expiresIn: -10 } // already expired
      );

      const err = await callMiddleware(requireAuth(), mockReq(`Bearer ${token}`));
      expect(err).toMatchObject({ statusCode: 401 });
    });
  });

  describe('requireRole', () => {
    it('rejects when req.user is not set', () => {
      const middleware = requireRole('admin');
      let captured;
      middleware({}, {}, (err) => { captured = err; });
      expect(captured).toMatchObject({ statusCode: 401 });
    });

    it('rejects a user whose role is not in the allowed list', () => {
      const middleware = requireRole('admin', 'analyst');
      let captured;
      middleware({ user: { id: '1', email: 'v@example.com', role: 'viewer' } }, {}, (err) => { captured = err; });
      expect(captured).toMatchObject({ statusCode: 403 });
    });

    it('calls next() with no error for an allowed role', () => {
      const middleware = requireRole('admin', 'analyst');
      let captured = 'not-called';
      middleware({ user: { id: '1', email: 'a@example.com', role: 'analyst' } }, {}, (err) => { captured = err; });
      expect(captured).toBeUndefined();
    });
  });
});
