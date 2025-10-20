/**
 * GSI Rate Limiting Middleware
 *
 * Limits the rate of GSI requests to prevent abuse and ensure server stability.
 * Default: 20 requests per second per IP (configurable via env)
 */

import rateLimit from 'express-rate-limit';

/**
 * Creates a rate limiter for GSI endpoint
 *
 * Configuration:
 * - GSI_RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 1000ms = 1s)
 * - GSI_RATE_LIMIT_MAX: Max requests per window (default: 20)
 *
 * Response on rate limit:
 * - Status: 429 Too Many Requests
 * - Headers: RateLimit-* headers
 */
export const gsiRateLimiter = rateLimit({
  // Time window (default: 1 second)
  windowMs: parseInt(process.env.GSI_RATE_LIMIT_WINDOW_MS || '1000', 10),

  // Max requests per window (default: 20 req/s)
  max: parseInt(process.env.GSI_RATE_LIMIT_MAX || '20', 10),

  // Message returned when rate limit exceeded
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please slow down your requests.',
    code: 'RATE_LIMIT_EXCEEDED',
  },

  // Standard headers
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers

  // Skip successful requests (optional - currently disabled)
  // skipSuccessfulRequests: false,

  // Skip failed requests (optional - currently disabled)
  // skipFailedRequests: false,

  // Custom handler (optional - use default)
  // handler: (req, res) => { ... }
});

/**
 * Creates a custom rate limiter with specific options
 *
 * @param windowMs - Time window in milliseconds
 * @param max - Max requests per window
 * @param keyGenerator - Function to generate rate limit key (default: IP)
 */
export function createCustomRateLimiter(
  windowMs: number,
  max: number,
  keyGenerator?: (req: any) => string
) {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Max ${max} requests per ${windowMs}ms.`,
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => req.ip || 'unknown'),
  });
}
