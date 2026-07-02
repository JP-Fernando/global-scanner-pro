/**
 * Authentication & Authorisation Middleware
 *
 * requireAuth()  — verifies JWT Bearer token, attaches req.user
 * requireRole()  — checks that the authenticated user has one of the allowed roles
 *
 * @module auth/auth-middleware
 */

import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { config } from '../config/environment.js';
import { findUserById } from './user-model.js';
import type { UserRole } from './user-model.js';
import { AuthenticationError, AuthorizationError } from '../middleware/error-handler.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

/**
 * requireAuth middleware.
 *
 * Reads the Bearer token from the Authorization header,
 * verifies its JWT signature and expiry, fetches the user from the DB,
 * and attaches `{ id, email, role }` to `req.user`.
 *
 * Throws AuthenticationError (401) on any failure.
 */
export function requireAuth(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Missing or malformed Authorization header (expected: Bearer <token>)');
      }

      const token = authHeader.slice(7).trim();
      if (!token) {
        throw new AuthenticationError('Bearer token is empty');
      }

      let payload: AccessTokenPayload;
      try {
        payload = jwt.verify(token, config.auth.jwtSecret) as AccessTokenPayload;
      } catch {
        throw new AuthenticationError('Access token is invalid or has expired');
      }

      // Re-fetch from DB so role changes take effect without requiring re-login
      const user = findUserById(payload.sub);
      if (!user) {
        throw new AuthenticationError('User account no longer exists');
      }

      req.user = { id: user.id, email: user.email, role: user.role };
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * requireRole middleware factory.
 *
 * Must be placed AFTER requireAuth() in the middleware chain.
 * Throws AuthorizationError (403) if the user's role is not in the allowed list.
 *
 * @param roles - One or more roles that are permitted to access the route.
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError('Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AuthorizationError(
        `Your role '${req.user.role}' is not authorised for this resource. ` +
        `Required role(s): ${roles.join(', ')}`
      ));
      return;
    }
    next();
  };
}
