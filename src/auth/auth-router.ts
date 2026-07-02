/**
 * Auth Router
 *
 * Exposes all authentication endpoints under /api/v1/auth/.
 * Routes are intentionally public (no requireAuth on the router itself);
 * protection is applied per-route where needed (e.g. GET /me).
 *
 * @module auth/auth-router
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { validate } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth } from './auth-middleware.js';
import * as AuthService from './auth-service.js';
import * as UserModel from './user-model.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../security/validation-schemas.js';

export const authRouter: Router = Router();

/**
 * POST /api/v1/auth/register
 * Create a new user account. First user is automatically promoted to admin.
 * Returns 201 with user profile + token pair.
 */
authRouter.post('/register', validate(registerSchema, 'body'), asyncHandler(async (req: Request, res: Response) => {
  const { email, password, role } = req.body;
  const result = await AuthService.register(email, password, role);
  res.status(201).json(result);
}));

/**
 * POST /api/v1/auth/login
 * Exchange email+password for a token pair.
 * Returns 200 with user profile + access + refresh tokens.
 */
authRouter.post('/login', validate(loginSchema, 'body'), asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);
  res.status(200).json(result);
}));

/**
 * POST /api/v1/auth/logout
 * Invalidate the provided refresh token on the server.
 * Returns 204 No Content.
 */
authRouter.post('/logout', validate(refreshSchema, 'body'), asyncHandler(async (req: Request, res: Response) => {
  await AuthService.logout(req.body.refreshToken);
  res.status(204).send();
}));

/**
 * POST /api/v1/auth/refresh
 * Rotate tokens: exchange a valid refresh token for a new access+refresh pair.
 * Returns 200 with new token pair.
 */
authRouter.post('/refresh', validate(refreshSchema, 'body'), asyncHandler(async (req: Request, res: Response) => {
  const tokens = await AuthService.refreshTokens(req.body.refreshToken);
  res.status(200).json(tokens);
}));

/**
 * POST /api/v1/auth/forgot-password
 * Initiate password reset flow.
 * Always returns 202 — never reveals whether the email is registered.
 */
authRouter.post('/forgot-password', validate(forgotPasswordSchema, 'body'), asyncHandler(async (req: Request, res: Response) => {
  await AuthService.forgotPassword(req.body.email);
  res.status(202).json({
    message: 'If that email address is registered, a password reset link has been sent.'
  });
}));

/**
 * POST /api/v1/auth/reset-password
 * Complete password reset with token + new password.
 * Returns 200 on success.
 */
authRouter.post('/reset-password', validate(resetPasswordSchema, 'body'), asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  await AuthService.resetPassword(token, password);
  res.status(200).json({ message: 'Password reset successfully. Please log in with your new password.' });
}));

/**
 * GET /api/v1/auth/me
 * Return the authenticated user's profile.
 * Requires Bearer token.
 */
authRouter.get('/me', requireAuth(), asyncHandler(async (req: Request, res: Response) => {
  const user = UserModel.findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.status(200).json(UserModel.toPublicUser(user));
}));
