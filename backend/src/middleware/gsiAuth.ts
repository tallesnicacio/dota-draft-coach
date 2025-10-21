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
  // ALWAYS allow requests in development mode (no GSI auth for local testing)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[GSI Auth] Development mode: Allowing all requests');
    next();
    return;
  }

  const expectedToken = process.env.GSI_AUTH_TOKEN;

  // If no token configured OR empty token, allow all requests (dev mode)
  if (!expectedToken || expectedToken === '') {
    console.warn('[GSI Auth] WARNING: GSI_AUTH_TOKEN not configured or empty. Allowing all requests.');
    next();
    return;
  }

  // Extract token from request body
  const receivedToken = req.body?.auth?.token;

  // If expected token is empty, also allow empty received tokens
  if (expectedToken === '' && (receivedToken === '' || !receivedToken)) {
    next();
    return;
  }

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
