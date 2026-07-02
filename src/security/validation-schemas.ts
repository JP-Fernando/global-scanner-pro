/**
 * Validation Schemas for API Endpoints
 *
 * This module defines Zod validation schemas for all API endpoints
 * to prevent injection attacks and ensure data integrity.
 *
 * @module security/validation-schemas
 */

import { z } from 'zod';

/**
 * Schema for Yahoo Finance API proxy endpoint
 * Validates symbol, from (timestamp), and to (timestamp) parameters
 */
export const yahooFinanceSchema = z.object({
  symbol: z.string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol must be 10 characters or less')
    .regex(/^[A-Z0-9.\-^=]+$/, 'Symbol contains invalid characters')
    .transform((val: string): string => val.toUpperCase()),

  from: z.string()
    .regex(/^\d+$/, 'From timestamp must be a valid number')
    .transform((val: string): number => parseInt(val, 10))
    .refine((val: number): boolean => val > 0, 'From timestamp must be positive')
    .refine((val: number): boolean => val <= Date.now() / 1000, 'From timestamp cannot be in the future'),

  to: z.string()
    .regex(/^\d+$/, 'To timestamp must be a valid number')
    .transform((val: string): number => parseInt(val, 10))
    .refine((val: number): boolean => val > 0, 'To timestamp must be positive')
    .refine((val: number): boolean => val <= Date.now() / 1000, 'To timestamp cannot be in the future')
}).refine(
  (data: { from: number; to: number; symbol: string }): boolean => data.to > data.from,
  { message: 'To timestamp must be after From timestamp' }
);

/** Inferred input type for the Yahoo Finance schema */
export type YahooFinanceInput = z.input<typeof yahooFinanceSchema>;

/** Inferred output type for the Yahoo Finance schema */
export type YahooFinanceOutput = z.output<typeof yahooFinanceSchema>;

/**
 * Schema for health check endpoint
 * Currently no parameters required, but schema included for consistency
 */
export const healthCheckSchema = z.object({}).optional();

/** Inferred type for the health check schema */
export type HealthCheckInput = z.infer<typeof healthCheckSchema>;

/**
 * Schema for test runner endpoint
 * Optional filter parameter to run specific tests
 */
export const testRunnerSchema = z.object({
  filter: z.string()
    .max(100, 'Filter must be 100 characters or less')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Filter contains invalid characters')
    .optional()
}).optional();

/** Inferred type for the test runner schema */
export type TestRunnerInput = z.infer<typeof testRunnerSchema>;

/**
 * Schema for investment simulation endpoint
 */
export const simulationRequestSchema = z.object({
  tickers: z.array(
    z.string()
      .min(1, 'Ticker cannot be empty')
      .max(10, 'Ticker must be 10 characters or less')
      .regex(/^[A-Z0-9.\-^=]+$/, 'Ticker contains invalid characters')
      .transform((val: string): string => val.toUpperCase())
  )
    .min(1, 'At least one ticker is required')
    .max(4, 'Maximum 4 tickers allowed'),

  tickerInvestments: z.record(
    z.string(),
    z.number()
      .min(0, 'Monthly amount must be non-negative')
      .finite('Monthly amount must be a finite number')
  ),

  horizonMonths: z.number()
    .int('horizonMonths must be an integer')
    .min(1, 'horizonMonths must be at least 1')
}).refine(
  (data) => data.tickers.every(t => Object.prototype.hasOwnProperty.call(data.tickerInvestments, t)),
  { message: 'tickerInvestments must contain an entry for every ticker' }
).refine(
  (data) => Object.values(data.tickerInvestments).reduce((sum, v) => sum + v, 0) > 0,
  { message: 'Total monthly investment must be greater than 0' }
);

/** Inferred input type for simulation schema */
export type SimulationRequestInput = z.input<typeof simulationRequestSchema>;
/** Inferred output type for simulation schema */
export type SimulationRequestOutput = z.output<typeof simulationRequestSchema>;

/**
 * Schema for POST /api/v1/auth/register
 */
export const registerSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be 255 characters or less'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or less'),

  role: z.enum(['admin', 'analyst', 'viewer']).optional()
});

/** Inferred type for the register schema */
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schema for POST /api/v1/auth/login
 */
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be 255 characters or less'),

  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password must be 128 characters or less')
});

/** Inferred type for the login schema */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema for POST /api/v1/auth/logout and POST /api/v1/auth/refresh
 */
export const refreshSchema = z.object({
  refreshToken: z.string()
    .min(1, 'refreshToken is required')
});

/** Inferred type for the refresh schema */
export type RefreshInput = z.infer<typeof refreshSchema>;

/**
 * Schema for POST /api/v1/auth/forgot-password
 */
export const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be 255 characters or less')
});

/** Inferred type for the forgot-password schema */
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Schema for POST /api/v1/auth/reset-password
 */
export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'token is required'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or less')
});

/** Inferred type for the reset-password schema */
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Common schemas for reuse across different endpoints
 */
export const commonSchemas = {
  /**
   * Pagination schema
   */
  pagination: z.object({
    page: z.string()
      .regex(/^\d+$/, 'Page must be a number')
      .transform((val: string): number => parseInt(val, 10))
      .refine((val: number): boolean => val > 0, 'Page must be positive')
      .default(1),

    limit: z.string()
      .regex(/^\d+$/, 'Limit must be a number')
      .transform((val: string): number => parseInt(val, 10))
      .refine((val: number): boolean => val > 0 && val <= 100, 'Limit must be between 1 and 100')
      .default(20)
  }),

  /**
   * UUID schema
   */
  uuid: z.string()
    .uuid('Invalid UUID format'),

  /**
   * Email schema
   */
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be 255 characters or less'),

  /**
   * ISO date schema
   */
  isoDate: z.string()
    .datetime('Invalid ISO date format'),

  /**
   * Positive number schema
   */
  positiveNumber: z.number()
    .positive('Must be a positive number')
    .finite('Must be a finite number'),

  /**
   * Percentage schema (0-100)
   */
  percentage: z.number()
    .min(0, 'Percentage must be at least 0')
    .max(100, 'Percentage must be at most 100')
} as const;

/** Inferred type for the pagination schema */
export type PaginationInput = z.input<typeof commonSchemas.pagination>;
export type PaginationOutput = z.output<typeof commonSchemas.pagination>;

/** Type for a sanitizable value (anything that can be passed to sanitize functions) */
type SanitizableValue = string | number | boolean | null | undefined | SanitizableObject;

/** Type for an object with sanitizable values */
interface SanitizableObject {
  [key: string]: SanitizableValue;
}

/**
 * Sanitization functions to prevent XSS attacks
 */
export const sanitize = {
  /**
   * Sanitize string input by escaping HTML special characters
   * @param {string} str - Input string to sanitize
   * @returns {string} Sanitized string
   */
  string: (str: unknown): string | unknown => {
    if (typeof str !== 'string') return str;

    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * Sanitize object by sanitizing all string values
   * @param {Object} obj - Object to sanitize
   * @returns {Object} Sanitized object
   */
  object: (obj: unknown): Record<string, unknown> | unknown => {
    if (typeof obj !== 'object' || obj === null) return obj;

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitize.string(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitize.object(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  },

  /**
   * Sanitize SQL input (basic protection, use parameterized queries instead)
   * @param {string} str - Input string to sanitize
   * @returns {string} Sanitized string
   */
  sql: (str: unknown): string | unknown => {
    if (typeof str !== 'string') return str;

    return str
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }
};
