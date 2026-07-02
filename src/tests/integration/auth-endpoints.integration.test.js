import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { closeDb } from '../../config/database.js';
import { authRouter } from '../../auth/auth-router.js';
import { errorHandler } from '../../middleware/error-handler.js';
import * as UserModel from '../../auth/user-model.js';

/** Mirrors the private hashToken() in auth-service.ts (sha256 hex digest) */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function callRouter(router, { method = 'POST', url, body, authorization }) {
  return new Promise((resolve, reject) => {
    const headers = {};

    const req = {
      method,
      url,
      body,
      headers: {
        'content-type': 'application/json',
        ...(authorization ? { authorization } : {})
      },
      get(name) {
        return this.headers[String(name).toLowerCase()];
      }
    };

    const res = {
      statusCode: 200,
      setHeader(name, value) {
        headers[String(name).toLowerCase()] = value;
      },
      getHeader(name) {
        return headers[String(name).toLowerCase()];
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, body: payload, headers });
        return this;
      },
      send(payload) {
        resolve({ status: this.statusCode, body: payload, headers });
        return this;
      }
    };

    router.handle(req, res, (err) => {
      if (err) {
        // Mirror production: uncaught route errors are formatted by the global error handler
        try {
          errorHandler(err, req, res, () => {});
        } catch (handlerErr) {
          reject(handlerErr);
        }
      } else {
        reject(new Error(`Unhandled request: ${method} ${url}`));
      }
    });
  });
}

async function registerUser(email = 'user@example.com', password = 'password123') {
  return callRouter(authRouter, {
    url: '/register',
    body: { email, password }
  });
}

describe('Auth endpoints', () => {
  beforeEach(() => {
    closeDb();
  });

  describe('POST /register', () => {
    it('returns 201 with user profile and token pair', async () => {
      const response = await registerUser();
      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('user@example.com');
      expect(response.body.accessToken).toBeTruthy();
      expect(response.body.refreshToken).toBeTruthy();
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('returns 400 for an invalid email', async () => {
      const response = await callRouter(authRouter, {
        url: '/register',
        body: { email: 'not-an-email', password: 'password123' }
      });
      expect(response.status).toBe(400);
    });

    it('returns 400 for a password shorter than 8 characters', async () => {
      const response = await callRouter(authRouter, {
        url: '/register',
        body: { email: 'short@example.com', password: 'short' }
      });
      expect(response.status).toBe(400);
    });

    it('returns 409 for a duplicate email', async () => {
      await registerUser('dupe@example.com');
      const response = await registerUser('dupe@example.com');
      expect(response.status).toBe(409);
    });
  });

  describe('POST /login', () => {
    it('returns 200 with a token pair for correct credentials', async () => {
      await registerUser('login@example.com', 'password123');
      const response = await callRouter(authRouter, {
        url: '/login',
        body: { email: 'login@example.com', password: 'password123' }
      });
      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeTruthy();
    });

    it('returns 401 for an incorrect password', async () => {
      await registerUser('login2@example.com', 'password123');
      const response = await callRouter(authRouter, {
        url: '/login',
        body: { email: 'login2@example.com', password: 'wrongpassword' }
      });
      expect(response.status).toBe(401);
    });

    it('returns 400 when body fields are missing', async () => {
      const response = await callRouter(authRouter, { url: '/login', body: {} });
      expect(response.status).toBe(400);
    });
  });

  describe('POST /refresh', () => {
    it('returns 200 with a new token pair', async () => {
      const registered = await registerUser('refresh@example.com', 'password123');
      const response = await callRouter(authRouter, {
        url: '/refresh',
        body: { refreshToken: registered.body.refreshToken }
      });
      expect(response.status).toBe(200);
      expect(response.body.refreshToken).not.toBe(registered.body.refreshToken);
    });

    it('returns 401 for an invalid refresh token', async () => {
      const response = await callRouter(authRouter, {
        url: '/refresh',
        body: { refreshToken: 'not-a-real-token' }
      });
      expect(response.status).toBe(401);
    });
  });

  describe('POST /logout', () => {
    it('returns 204 and invalidates the refresh token', async () => {
      const registered = await registerUser('logout@example.com', 'password123');
      const response = await callRouter(authRouter, {
        url: '/logout',
        body: { refreshToken: registered.body.refreshToken }
      });
      expect(response.status).toBe(204);

      const refreshAttempt = await callRouter(authRouter, {
        url: '/refresh',
        body: { refreshToken: registered.body.refreshToken }
      });
      expect(refreshAttempt.status).toBe(401);
    });
  });

  describe('POST /forgot-password', () => {
    it('always returns 202, even for an unregistered email', async () => {
      const response = await callRouter(authRouter, {
        url: '/forgot-password',
        body: { email: 'unregistered@example.com' }
      });
      expect(response.status).toBe(202);
    });

    it('returns 400 for an invalid email format', async () => {
      const response = await callRouter(authRouter, {
        url: '/forgot-password',
        body: { email: 'not-an-email' }
      });
      expect(response.status).toBe(400);
    });
  });

  describe('POST /reset-password', () => {
    it('returns 401 for an invalid/unknown token', async () => {
      const response = await callRouter(authRouter, {
        url: '/reset-password',
        body: { token: 'not-a-real-token', password: 'newpassword123' }
      });
      expect(response.status).toBe(401);
    });

    it('returns 400 for a password shorter than 8 characters', async () => {
      const response = await callRouter(authRouter, {
        url: '/reset-password',
        body: { token: 'whatever', password: 'short' }
      });
      expect(response.status).toBe(400);
    });

    it('returns 200 and lets the user log in with the new password', async () => {
      const registered = await registerUser('resetflow@example.com', 'oldpassword1');
      const rawToken = 'integration-known-raw-token';
      UserModel.createPasswordReset(
        registered.body.user.id,
        hashToken(rawToken),
        new Date(Date.now() + 60 * 60 * 1000)
      );

      const response = await callRouter(authRouter, {
        url: '/reset-password',
        body: { token: rawToken, password: 'newpassword2' }
      });
      expect(response.status).toBe(200);

      const loginResponse = await callRouter(authRouter, {
        url: '/login',
        body: { email: 'resetflow@example.com', password: 'newpassword2' }
      });
      expect(loginResponse.status).toBe(200);
    });
  });

  describe('GET /me', () => {
    it('returns 401 without an Authorization header', async () => {
      const response = await callRouter(authRouter, { method: 'GET', url: '/me' });
      expect(response.status).toBe(401);
    });

    it('returns the authenticated user profile with a valid access token', async () => {
      const registered = await registerUser('me@example.com', 'password123');
      const response = await callRouter(authRouter, {
        method: 'GET',
        url: '/me',
        authorization: `Bearer ${registered.body.accessToken}`
      });
      expect(response.status).toBe(200);
      expect(response.body.email).toBe('me@example.com');
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('returns 401 for a malformed Bearer token', async () => {
      const response = await callRouter(authRouter, {
        method: 'GET',
        url: '/me',
        authorization: 'Bearer not-a-real-token'
      });
      expect(response.status).toBe(401);
    });

    it('returns 404 if the user vanishes between requireAuth and the handler (defensive check)', async () => {
      const registered = await registerUser('vanishing@example.com', 'password123');

      // requireAuth() and the /me handler both call findUserById once each per request.
      // Let the first call (inside requireAuth) succeed normally, and force only the
      // second call (the handler's own lookup) to miss, exercising the 404 branch.
      const realFindUserById = UserModel.findUserById;
      let callCount = 0;
      vi.spyOn(UserModel, 'findUserById').mockImplementation((id) => {
        callCount += 1;
        return callCount === 1 ? realFindUserById(id) : undefined;
      });

      const response = await callRouter(authRouter, {
        method: 'GET',
        url: '/me',
        authorization: `Bearer ${registered.body.accessToken}`
      });

      expect(response.status).toBe(404);
      vi.restoreAllMocks();
    });
  });
});
