/**
 * Validation Schemas Extended Tests
 *
 * Covers commonSchemas (pagination, uuid, email, isoDate, positiveNumber, percentage)
 * and sanitize.object nested handling.
 */

import { describe, it, expect } from 'vitest';
import {
  testRunnerSchema,
  commonSchemas,
  sanitize,
} from '../../security/validation-schemas.js';

describe('Validation Schemas - Extended', () => {
  // -----------------------------------------------------------
  // commonSchemas.pagination
  // -----------------------------------------------------------
  describe('commonSchemas.pagination', () => {
    it('parses valid pagination', () => {
      const result = commonSchemas.pagination.safeParse({ page: '2', limit: '50' });
      expect(result.success).toBe(true);
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    });

    it('uses default values', () => {
      const result = commonSchemas.pagination.safeParse({});
      expect(result.success).toBe(true);
      // Defaults are strings that get transformed to numbers
      expect(Number(result.data.page)).toBe(1);
      expect(Number(result.data.limit)).toBe(20);
    });

    it('rejects non-numeric page', () => {
      const result = commonSchemas.pagination.safeParse({ page: 'abc' });
      expect(result.success).toBe(false);
    });

    it('rejects page <= 0', () => {
      const result = commonSchemas.pagination.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });

    it('rejects non-numeric limit', () => {
      const result = commonSchemas.pagination.safeParse({ limit: 'abc' });
      expect(result.success).toBe(false);
    });

    it('rejects limit > 100', () => {
      const result = commonSchemas.pagination.safeParse({ limit: '101' });
      expect(result.success).toBe(false);
    });

    it('rejects limit <= 0', () => {
      const result = commonSchemas.pagination.safeParse({ limit: '0' });
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // commonSchemas.uuid
  // -----------------------------------------------------------
  describe('commonSchemas.uuid', () => {
    it('accepts valid UUID', () => {
      const result = commonSchemas.uuid.safeParse('550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = commonSchemas.uuid.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // commonSchemas.email
  // -----------------------------------------------------------
  describe('commonSchemas.email', () => {
    it('accepts valid email', () => {
      const result = commonSchemas.email.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = commonSchemas.email.safeParse('not-an-email');
      expect(result.success).toBe(false);
    });

    it('rejects email > 255 chars', () => {
      const longEmail = `${'a'.repeat(250)}@b.com`;
      const result = commonSchemas.email.safeParse(longEmail);
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // commonSchemas.isoDate
  // -----------------------------------------------------------
  describe('commonSchemas.isoDate', () => {
    it('accepts valid ISO date', () => {
      const result = commonSchemas.isoDate.safeParse('2023-06-15T10:30:00.000Z');
      expect(result.success).toBe(true);
    });

    it('rejects invalid date format', () => {
      const result = commonSchemas.isoDate.safeParse('June 15, 2023');
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // commonSchemas.positiveNumber
  // -----------------------------------------------------------
  describe('commonSchemas.positiveNumber', () => {
    it('accepts positive number', () => {
      const result = commonSchemas.positiveNumber.safeParse(42);
      expect(result.success).toBe(true);
    });

    it('rejects zero', () => {
      const result = commonSchemas.positiveNumber.safeParse(0);
      expect(result.success).toBe(false);
    });

    it('rejects negative number', () => {
      const result = commonSchemas.positiveNumber.safeParse(-5);
      expect(result.success).toBe(false);
    });

    it('rejects Infinity', () => {
      const result = commonSchemas.positiveNumber.safeParse(Infinity);
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // commonSchemas.percentage
  // -----------------------------------------------------------
  describe('commonSchemas.percentage', () => {
    it('accepts valid percentage', () => {
      const result = commonSchemas.percentage.safeParse(50);
      expect(result.success).toBe(true);
    });

    it('accepts boundary 0', () => {
      const result = commonSchemas.percentage.safeParse(0);
      expect(result.success).toBe(true);
    });

    it('accepts boundary 100', () => {
      const result = commonSchemas.percentage.safeParse(100);
      expect(result.success).toBe(true);
    });

    it('rejects > 100', () => {
      const result = commonSchemas.percentage.safeParse(101);
      expect(result.success).toBe(false);
    });

    it('rejects < 0', () => {
      const result = commonSchemas.percentage.safeParse(-1);
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // sanitize.object (nested)
  // -----------------------------------------------------------
  describe('sanitize.object - nested', () => {
    it('sanitizes nested objects recursively', () => {
      const input = {
        name: '<script>alert("xss")</script>',
        meta: {
          description: 'Test <b>bold</b>',
          count: 42,
        },
      };

      const result = sanitize.object(input);
      expect(result.name).not.toContain('<script>');
      expect(result.meta.description).not.toContain('<b>');
      expect(result.meta.count).toBe(42);
    });

    it('returns non-objects as-is', () => {
      expect(sanitize.object(null)).toBeNull();
      expect(sanitize.object(42)).toBe(42);
      expect(sanitize.object('string')).toBe('string');
    });

    it('handles empty object', () => {
      expect(sanitize.object({})).toEqual({});
    });

    it('preserves boolean and number values', () => {
      const input = { enabled: true, count: 5, name: 'test' };
      const result = sanitize.object(input);
      expect(result.enabled).toBe(true);
      expect(result.count).toBe(5);
      expect(result.name).toBe('test');
    });
  });

  // -----------------------------------------------------------
  // sanitize.sql
  // -----------------------------------------------------------
  describe('sanitize.sql', () => {
    it('escapes single quotes', () => {
      const result = sanitize.sql("Robert'; DROP TABLE users;--");
      expect(result).not.toContain("';");
      expect(result).not.toContain('--');
      expect(result).not.toContain(';');
    });

    it('removes SQL comment markers', () => {
      const result = sanitize.sql('SELECT /* comment */ * FROM users');
      expect(result).not.toContain('/*');
      expect(result).not.toContain('*/');
    });

    it('returns non-strings as-is', () => {
      expect(sanitize.sql(42)).toBe(42);
      expect(sanitize.sql(null)).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // testRunnerSchema
  // -----------------------------------------------------------
  describe('testRunnerSchema', () => {
    it('accepts empty object', () => {
      const result = testRunnerSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts valid filter', () => {
      const result = testRunnerSchema.safeParse({ filter: 'unit-tests' });
      expect(result.success).toBe(true);
    });

    it('rejects filter with invalid characters', () => {
      const result = testRunnerSchema.safeParse({ filter: '<script>' });
      expect(result.success).toBe(false);
    });

    it('rejects filter > 100 characters', () => {
      const result = testRunnerSchema.safeParse({ filter: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });
  });
});
