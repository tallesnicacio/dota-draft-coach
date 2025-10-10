/**
 * GSI API Route
 *
 * Handles incoming Game State Integration (GSI) payloads from Dota 2 client.
 * Processes, validates, deduplicates, and will broadcast to WebSocket clients.
 */

import { Router, Request, Response } from 'express';
import { GsiAdapter } from '../gsi/GsiAdapter.js';
import { SessionManager } from '../gsi/SessionManager.js';
import { gsiAuth } from '../middleware/gsiAuth.js';
import { gsiRateLimiter } from '../middleware/gsiRateLimit.js';
import { validateContentType, validateGsiPayload } from '../middleware/gsiValidation.js';
import { gsiLogger } from '../utils/logger.js';
import type { GsiPayload } from '../gsi/types.js';

const router = Router();

// Initialize session manager
const sessionManager = new SessionManager();

/**
 * POST /gsi
 *
 * Receives GSI payload from Dota 2 client
 *
 * Middleware chain:
 * 1. Rate limiting (20 req/s)
 * 2. Content-Type validation (must be application/json)
 * 3. Authentication (token validation)
 * 4. Payload validation (Zod schema)
 *
 * Response codes:
 * - 200: Payload accepted and processed
 * - 204: Payload accepted but deduplicated (duplicate)
 * - 401: Unauthorized (missing/invalid token)
 * - 415: Unsupported Media Type (not application/json)
 * - 422: Unprocessable Entity (validation failed)
 * - 429: Too Many Requests (rate limit exceeded)
 * - 500: Internal Server Error
 */
router.post(
  '/gsi',
  gsiRateLimiter,
  validateContentType,
  gsiAuth,
  validateGsiPayload,
  async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const payload = req.body as GsiPayload;

      // Extract basic info for logging
      const matchId = payload.map?.matchid || 'unknown';
      const heroName = payload.hero?.name || 'unknown';
      const gameTime = payload.map?.game_time || 0;

      gsiLogger.debug(
        {
          matchId,
          heroName,
          gameTime,
          ip: req.ip,
        },
        'GSI payload received'
      );

      // Convert GSI payload to LiveSnapshot
      const snapshot = GsiAdapter.normalize(payload);

      // Store in session manager (handles deduplication)
      const result = sessionManager.updateSession(snapshot);

      // Log result
      if (result.deduplicated) {
        gsiLogger.debug(
          {
            matchId,
            sessionId: result.sessionId,
            snapshotHash: result.snapshotHash,
          },
          'Duplicate snapshot detected'
        );

        // Return 204 No Content for duplicates
        res.status(204).end();
        return;
      }

      gsiLogger.info(
        {
          matchId,
          sessionId: result.sessionId,
          heroName,
          gameTime,
          broadcast: result.broadcast,
          processingTime: Date.now() - startTime,
        },
        'GSI snapshot processed'
      );

      // TODO Phase 3: Broadcast to WebSocket clients
      // wsServer.broadcast({ type: 'snapshot', data: snapshot });

      // Return success
      res.status(200).json({
        success: true,
        sessionId: result.sessionId,
        broadcast: result.broadcast,
        timestamp: snapshot.t,
      });
    } catch (error) {
      gsiLogger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          ip: req.ip,
        },
        'Error processing GSI payload'
      );

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process GSI payload',
        code: 'PROCESSING_ERROR',
      });
    }
  }
);

/**
 * GET /gsi/stats
 *
 * Returns GSI statistics (sessions, dedup rate, etc.)
 * Useful for monitoring and debugging
 */
router.get('/gsi/stats', (req: Request, res: Response) => {
  const metrics = sessionManager.getMetrics();

  res.json({
    success: true,
    stats: {
      activeSessions: metrics.activeSessions,
      totalSnapshots: metrics.totalEvents,
      duplicateSnapshots: metrics.dedupHits,
      dedupRatio: metrics.dedupRatio,
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
