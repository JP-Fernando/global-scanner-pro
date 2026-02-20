/**
 * Validation Middleware
 *
 * This module provides Express middleware for validating request data
 * against Zod schemas to prevent injection attacks and ensure data integrity.
 *
 * @module middleware/validation
 */

import { ZodError, type ZodSchema } from 'zod';
import type { Request, Response, NextFunction } from 'express';

type ValidationSource = 'query' | 'body' | 'params';

/**
 * Creates a validation middleware for Express routes
 *
 * @param schema - Zod schema to validate against
 * @param source - Source of data to validate ('query', 'body', 'params')
 * @returns Express middleware function
 */
export function validate(schema: ZodSchema, source: ValidationSource = 'query') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the data source to validate
      const dataToValidate = req[source];

      // Validate the data against the schema
      const validatedData = await schema.parseAsync(dataToValidate);

      // Replace the original data with validated and transformed data
      (req as unknown as Record<string, unknown>)[source] = validatedData;

      // Proceed to next middleware
      next();
    } catch (error: unknown) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const errors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        });
      }

      // Handle other errors
      return res.status(500).json({
        error: 'Internal server error during validation',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Validates multiple sources (query, body, params) simultaneously
 *
 * @param schemas - Object with schemas for different sources
 * @returns Express middleware function
 */
export function validateMultiple(
  schemas: Partial<Record<ValidationSource, ZodSchema>>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: Array<{
        source: string; field: string; message: string; code: string;
      }> = [];

      // Validate each source
      for (const [source, schema] of Object.entries(schemas)) {
        if (!schema) continue;

        try {
          const validatedData = await (schema as ZodSchema)
            .parseAsync((req as unknown as Record<string, unknown>)[source]);
          (req as unknown as Record<string, unknown>)[source] = validatedData;
        } catch (error: unknown) {
          if (error instanceof ZodError) {
            errors.push(...error.issues.map(err => ({
              source,
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            })));
          } else {
            throw error;
          }
        }
      }

      // If there are validation errors, return them
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        });
      }

      // All validations passed
      next();
    } catch (error: unknown) {
      return res.status(500).json({
        error: 'Internal server error during validation',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Validates request body size to prevent DoS attacks
 *
 * @param maxSizeBytes - Maximum allowed size in bytes
 * @returns Express middleware function
 */
export function validateBodySize(maxSizeBytes = 1024 * 1024) { // Default 1MB
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];

    if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
      return res.status(413).json({
        error: 'Payload too large',
        maxSize: maxSizeBytes,
        receivedSize: parseInt(contentLength, 10),
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

/**
 * Validates content type for endpoints that accept JSON
 *
 * @param allowedTypes - Array of allowed content types
 * @returns Express middleware function
 */
export function validateContentType(allowedTypes = ['application/json']) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip validation for GET and DELETE requests (no body)
    if (['GET', 'DELETE', 'HEAD'].includes(req.method)) {
      return next();
    }

    const contentType = req.headers['content-type'];

    if (!contentType) {
      return res.status(400).json({
        error: 'Content-Type header is required',
        allowedTypes,
        timestamp: new Date().toISOString()
      });
    }

    const isAllowed = allowedTypes.some(type =>
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isAllowed) {
      return res.status(415).json({
        error: 'Unsupported Media Type',
        receivedType: contentType,
        allowedTypes,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}
