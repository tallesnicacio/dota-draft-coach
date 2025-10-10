/**
 * GSI Authentication Middleware
 *
 * Validates auth tokens from incoming GSI requests.
 * Token must match the configured GSI_AUTH_TOKEN environment variable.
 */

import { Request, Response, NextFunction } from 'express';

export interface GsiAuthRequest extends Request {
  body: {
    auth?: {
      token?: string;
    };
  };
}

/**
 * Validates GSI auth token from request body
 *
 * Expected format:
 * {
 *   "auth": {
 *     "token": "your-secret-token"
 *   }
 * }
 *
 * @returns 401 if token missing or invalid
 */
export function gsiAuth(req: GsiAuthRequest, res: Response, next: NextFunction): void {
  const expectedToken = process.env.GSI_AUTH_TOKEN;

  // If no token configured, allow all requests (dev mode)
  if (!expectedToken) {
    console.warn('[GSI Auth] WARNING: GSI_AUTH_TOKEN not configured. Allowing all requests.');
    next();
    return;
  }

  // Extract token from request body
  const receivedToken = req.body?.auth?.token;

  // Check if token is present
  if (!receivedToken) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing auth token',
      code: 'AUTH_TOKEN_MISSING',
    });
    return;
  }

  // Validate token
  if (receivedToken !== expectedToken) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid auth token',
      code: 'AUTH_TOKEN_INVALID',
    });
    return;
  }

  // Token valid, proceed
  next();
}
