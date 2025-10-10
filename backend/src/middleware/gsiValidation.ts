/**
 * GSI Validation Middleware
 *
 * Validates GSI payloads using Zod schemas.
 * Ensures incoming data matches expected format before processing.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { gsiPayloadSchema } from './gsiSchemas.js';

/**
 * Validates Content-Type header
 *
 * GSI payloads must be sent as application/json
 *
 * @returns 415 Unsupported Media Type if Content-Type is not application/json
 */
export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  const contentType = req.headers['content-type'];

  if (!contentType || !contentType.includes('application/json')) {
    res.status(415).json({
      error: 'Unsupported Media Type',
      message: 'Content-Type must be application/json',
      code: 'INVALID_CONTENT_TYPE',
      received: contentType || 'none',
    });
    return;
  }

  next();
}

/**
 * Validates GSI payload structure using Zod schema
 *
 * @returns 422 Unprocessable Entity if payload is malformed
 */
export function validateGsiPayload(req: Request, res: Response, next: NextFunction): void {
  try {
    // Validate payload against schema
    const validatedPayload = gsiPayloadSchema.parse(req.body);

    // Replace body with validated (and potentially transformed) payload
    req.body = validatedPayload;

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      // Format Zod errors into a readable response
      const errors = error.errors?.map((err) => ({
        path: err.path?.join('.') || 'unknown',
        message: err.message || 'Validation error',
        code: err.code || 'UNKNOWN',
      })) || [];

      res.status(422).json({
        error: 'Unprocessable Entity',
        message: 'GSI payload validation failed',
        code: 'VALIDATION_ERROR',
        errors,
      });
      return;
    }

    // Unknown error - pass to error handler
    next(error);
  }
}

/**
 * Combined validation middleware
 *
 * Validates both Content-Type and payload structure.
 * Use this as a single middleware instead of chaining both.
 */
export function validateGsiRequest(req: Request, res: Response, next: NextFunction): void {
  // First validate Content-Type
  validateContentType(req, res, (err) => {
    if (err) {
      next(err);
      return;
    }

    // Then validate payload
    validateGsiPayload(req, res, next);
  });
}
