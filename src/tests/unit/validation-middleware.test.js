/**
 * Validation Middleware Tests
 *
 * Tests for Express validation middleware including schema validation,
 * body size limits, and content type validation.
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  validate,
  validateMultiple,
  validateBodySize,
  validateContentType,
} from '../../middleware/validation.js';

// Helper to create mock request/response objects
const createMockReq = (overrides = {}) => ({
  query: {},
  body: {},
  params: {},
  headers: {},
  method: 'GET',
  ...overrides,
});

const createMockRes = () => {
  const res = {
    statusCode: 200,
    jsonData: null,
  };
  res.status = vi.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((data) => {
    res.jsonData = data;
    return res;
  });
  return res;
};

describe('Validation Middleware', () => {
  // -----------------------------------------------------------
  // validate() - Single source validation
  // -----------------------------------------------------------
  describe('validate()', () => {
    const testSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      age: z.coerce.number().min(0, 'Age must be positive'),
    });

    it('passes valid query data through', async () => {
      const req = createMockReq({
        query: { name: 'John', age: '25' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validate(testSchema, 'query');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.name).toBe('John');
      expect(req.query.age).toBe(25); // coerced to number
    });

    it('passes valid body data through', async () => {
      const req = createMockReq({
        body: { name: 'Jane', age: 30 },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validate(testSchema, 'body');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.name).toBe('Jane');
      expect(req.body.age).toBe(30);
    });

    it('returns 400 for missing required field', async () => {
      const req = createMockReq({
        query: { age: '25' }, // missing name
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validate(testSchema, 'query');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.jsonData.error).toBe('Validation failed');
      expect(res.jsonData.details).toBeDefined();
      expect(res.jsonData.details.some((d) => d.field === 'name')).toBe(true);
    });

    it('returns 400 for invalid field type', async () => {
      const req = createMockReq({
        query: { name: 'John', age: 'not-a-number' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validate(testSchema, 'query');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for constraint violation', async () => {
      const req = createMockReq({
        query: { name: '', age: '25' }, // empty name
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validate(testSchema, 'query');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.jsonData.details[0].field).toBe('name');
      expect(res.jsonData.details[0].message).toBeDefined();
    });

    it('validates params source correctly', async () => {
      const paramsSchema = z.object({
        id: z.string().uuid('Invalid UUID'),
      });

      const req = createMockReq({
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validate(paramsSchema, 'params');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('returns 500 for non-Zod errors', async () => {
      const badSchema = {
        parseAsync: () => Promise.reject(new Error('Unexpected error')),
      };

      const req = createMockReq({ query: { name: 'test' } });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validate(badSchema, 'query');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.jsonData.error).toBe('Internal server error during validation');
    });
  });

  // -----------------------------------------------------------
  // validateMultiple() - Multi-source validation
  // -----------------------------------------------------------
  describe('validateMultiple()', () => {
    const paramsSchema = z.object({
      id: z.string().min(1),
    });

    const bodySchema = z.object({
      title: z.string().min(1),
      content: z.string().optional(),
    });

    it('validates multiple sources successfully', async () => {
      const req = createMockReq({
        params: { id: 'abc123' },
        body: { title: 'Test Title', content: 'Test Content' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateMultiple({
        params: paramsSchema,
        body: bodySchema,
      });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.params.id).toBe('abc123');
      expect(req.body.title).toBe('Test Title');
    });

    it('returns combined errors from multiple sources', async () => {
      const req = createMockReq({
        params: { id: '' }, // invalid
        body: { title: '' }, // invalid
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateMultiple({
        params: paramsSchema,
        body: bodySchema,
      });
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.jsonData.details.length).toBeGreaterThanOrEqual(2);
      expect(res.jsonData.details.some((d) => d.source === 'params')).toBe(true);
      expect(res.jsonData.details.some((d) => d.source === 'body')).toBe(true);
    });

    it('skips undefined schemas', async () => {
      const req = createMockReq({
        params: { id: 'abc123' },
        body: { anything: 'goes' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateMultiple({
        params: paramsSchema,
        body: undefined, // no validation for body
      });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('returns 500 for non-Zod errors in any source', async () => {
      const badSchema = {
        parseAsync: () => Promise.reject(new Error('Unexpected')),
      };

      const req = createMockReq({
        params: { id: 'abc123' },
        body: { title: 'Test' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateMultiple({
        params: paramsSchema,
        body: badSchema,
      });
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // -----------------------------------------------------------
  // validateBodySize()
  // -----------------------------------------------------------
  describe('validateBodySize()', () => {
    it('allows requests under size limit', () => {
      const req = createMockReq({
        headers: { 'content-length': '500' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateBodySize(1024);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('blocks requests over size limit', () => {
      const req = createMockReq({
        headers: { 'content-length': '2048' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateBodySize(1024);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.jsonData.error).toBe('Payload too large');
      expect(res.jsonData.maxSize).toBe(1024);
      expect(res.jsonData.receivedSize).toBe(2048);
    });

    it('allows requests without content-length header', () => {
      const req = createMockReq({
        headers: {},
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateBodySize(1024);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('uses default 1MB limit if not specified', () => {
      const req = createMockReq({
        headers: { 'content-length': '500000' }, // 500KB
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateBodySize(); // default 1MB
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------
  // validateContentType()
  // -----------------------------------------------------------
  describe('validateContentType()', () => {
    it('allows valid content type', () => {
      const req = createMockReq({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateContentType(['application/json']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows content type with charset', () => {
      const req = createMockReq({
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateContentType(['application/json']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('skips validation for GET requests', () => {
      const req = createMockReq({
        method: 'GET',
        headers: {}, // no content-type
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateContentType(['application/json']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('skips validation for DELETE requests', () => {
      const req = createMockReq({
        method: 'DELETE',
        headers: {},
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateContentType(['application/json']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('skips validation for HEAD requests', () => {
      const req = createMockReq({
        method: 'HEAD',
        headers: {},
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateContentType(['application/json']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('returns 400 when content-type is missing for POST', () => {
      const req = createMockReq({
        method: 'POST',
        headers: {},
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateContentType(['application/json']);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.jsonData.error).toBe('Content-Type header is required');
    });

    it('returns 415 for unsupported content type', () => {
      const req = createMockReq({
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateContentType(['application/json']);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(415);
      expect(res.jsonData.error).toBe('Unsupported Media Type');
      expect(res.jsonData.receivedType).toBe('text/plain');
    });

    it('supports multiple allowed types', () => {
      const req = createMockReq({
        method: 'POST',
        headers: { 'content-type': 'application/xml' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateContentType([
        'application/json',
        'application/xml',
      ]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('is case-insensitive for content type matching', () => {
      const req = createMockReq({
        method: 'POST',
        headers: { 'content-type': 'APPLICATION/JSON' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = validateContentType(['application/json']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
