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
    .transform(val => val.toUpperCase()),

  from: z.string()
    .regex(/^\d+$/, 'From timestamp must be a valid number')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, 'From timestamp must be positive')
    .refine(val => val <= Date.now() / 1000, 'From timestamp cannot be in the future'),

  to: z.string()
    .regex(/^\d+$/, 'To timestamp must be a valid number')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, 'To timestamp must be positive')
    .refine(val => val <= Date.now() / 1000, 'To timestamp cannot be in the future')
}).refine(
  data => data.to > data.from,
  { message: 'To timestamp must be after From timestamp' }
);

/**
 * Schema for health check endpoint
 * Currently no parameters required, but schema included for consistency
 */
export const healthCheckSchema = z.object({}).optional();

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
      .transform(val => parseInt(val, 10))
      .refine(val => val > 0, 'Page must be positive')
      .default('1'),

    limit: z.string()
      .regex(/^\d+$/, 'Limit must be a number')
      .transform(val => parseInt(val, 10))
      .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
      .default('20')
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
};

/**
 * Sanitization functions to prevent XSS attacks
 */
export const sanitize = {
  /**
   * Sanitize string input by escaping HTML special characters
   * @param {string} str - Input string to sanitize
   * @returns {string} Sanitized string
   */
  string: (str) => {
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
  object: (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
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
  sql: (str) => {
    if (typeof str !== 'string') return str;

    return str
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }
};
