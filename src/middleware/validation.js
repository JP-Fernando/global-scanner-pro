/**
 * Validation Middleware
 *
 * This module provides Express middleware for validating request data
 * against Zod schemas to prevent injection attacks and ensure data integrity.
 *
 * @module middleware/validation
 */

import { ZodError } from 'zod';

/**
 * Creates a validation middleware for Express routes
 *
 * @param {Object} schema - Zod schema to validate against
 * @param {string} [source='query'] - Source of data to validate ('query', 'body', 'params')
 * @returns {Function} Express middleware function
 *
 * @example
 * app.get('/api/users', validate(userSchema, 'query'), (req, res) => {
 *   // req.query is now validated and type-safe
 * });
 */
export function validate(schema, source = 'query') {
  return async (req, res, next) => {
    try {
      // Get the data source to validate
      const dataToValidate = req[source];

      // Validate the data against the schema
      const validatedData = await schema.parseAsync(dataToValidate);

      // Replace the original data with validated and transformed data
      req[source] = validatedData;

      // Proceed to next middleware
      next();
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
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
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Validates multiple sources (query, body, params) simultaneously
 *
 * @param {Object} schemas - Object with schemas for different sources
 * @param {Object} [schemas.query] - Schema for query parameters
 * @param {Object} [schemas.body] - Schema for request body
 * @param {Object} [schemas.params] - Schema for route parameters
 * @returns {Function} Express middleware function
 *
 * @example
 * app.post('/api/users/:id', validateMultiple({
 *   params: paramsSchema,
 *   body: bodySchema
 * }), (req, res) => {
 *   // Both req.params and req.body are validated
 * });
 */
export function validateMultiple(schemas) {
  return async (req, res, next) => {
    try {
      const errors = [];

      // Validate each source
      for (const [source, schema] of Object.entries(schemas)) {
        if (!schema) continue;

        try {
          const validatedData = await schema.parseAsync(req[source]);
          req[source] = validatedData;
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...error.errors.map(err => ({
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
    } catch (error) {
      return res.status(500).json({
        error: 'Internal server error during validation',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Validates request body size to prevent DoS attacks
 *
 * @param {number} maxSizeBytes - Maximum allowed size in bytes
 * @returns {Function} Express middleware function
 */
export function validateBodySize(maxSizeBytes = 1024 * 1024) { // Default 1MB
  return (req, res, next) => {
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
 * @param {Array<string>} allowedTypes - Array of allowed content types
 * @returns {Function} Express middleware function
 */
export function validateContentType(allowedTypes = ['application/json']) {
  return (req, res, next) => {
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
