/**
 * GSI API Route
 *
 * Handles incoming Game State Integration (GSI) payloads from Dota 2 client.
 * Processes, validates, deduplicates, and will broadcast to WebSocket clients.
 */

import { Router, Request, Response } from 'express';
import { GsiAdapter } from '../gsi/GsiAdapter.js';
import { SessionManager } from '../gsi/SessionManager.js';
import { AIRecommendationEngine } from '../services/AIRecommendationEngine.js';
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

      // Broadcast to WebSocket clients if not a duplicate
      let wsBroadcastCount = 0;
      if (result.broadcast) {
        // Import wsServer dynamically to avoid circular dependency
        const { wsServer } = await import('../server.js');
        wsBroadcastCount = wsServer.broadcastSnapshot(snapshot);
      }

      // Auto-trigger AI recommendations based on game state
      let aiRecommendations = null;
      let aiError = null;
      let aiBroadcastCount = 0;
      try {
        // Only call AI for non-duplicate snapshots
        if (!result.deduplicated) {
          const aiEngine = AIRecommendationEngine.getInstance();
          const recommendations = await aiEngine.getRecommendations(snapshot);

          // Check if we got any recommendations
          if (recommendations.draftAnalysis || recommendations.itemRecommendation) {
            aiRecommendations = recommendations;

            // Broadcast AI recommendations via WebSocket
            if (result.broadcast && matchId) {
              const { wsServer } = await import('../server.js');

              // Broadcast to clients subscribed to this matchId
              aiBroadcastCount = wsServer.broadcastRecommendations(matchId, {
                draftAnalysis: recommendations.draftAnalysis,
                itemRecommendation: recommendations.itemRecommendation,
                hero: recommendations.context.myHero?.localized_name,
                timestamp: recommendations.timestamp,
              });
            }

            gsiLogger.info(
              {
                matchId,
                hasDraftAnalysis: !!recommendations.draftAnalysis,
                hasItemRecommendation: !!recommendations.itemRecommendation,
                hero: recommendations.context.myHero?.localized_name,
                aiBroadcastCount,
              },
              'AI recommendations generated and broadcasted'
            );
          }
        }
      } catch (error) {
        // Don't fail GSI processing if AI fails
        aiError = error instanceof Error ? error.message : String(error);
        gsiLogger.warn(
          {
            matchId,
            error: aiError,
          },
          'Failed to generate AI recommendations (non-fatal)'
        );
      }

      gsiLogger.info(
        {
          matchId,
          sessionId: result.sessionId,
          heroName,
          gameTime,
          broadcast: result.broadcast,
          wsBroadcastCount,
          aiRecommendations: aiRecommendations ? 'generated' : aiError ? 'failed' : 'skipped',
          processingTime: Date.now() - startTime,
        },
        'GSI snapshot processed'
      );

      // Return success
      res.status(200).json({
        success: true,
        sessionId: result.sessionId,
        broadcast: result.broadcast,
        wsBroadcastCount,
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

/**
 * GET /ws/stats
 *
 * Returns WebSocket statistics (connections, rooms, etc.)
 * Useful for monitoring and debugging
 */
router.get('/ws/stats', async (req: Request, res: Response) => {
  try {
    // Import wsServer dynamically
    const { wsServer } = await import('../server.js');
    const stats = wsServer.getStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get WebSocket stats',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /recommendations
 *
 * Manually request AI recommendations for a LiveSnapshot
 * Useful for on-demand recommendations or testing
 *
 * Request body: LiveSnapshot (from GSI or constructed)
 * Response: AI recommendations (draft analysis, item recommendations)
 */
router.post('/recommendations', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const snapshot = req.body as any; // Should be LiveSnapshot

    if (!snapshot || !snapshot.matchId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Snapshot with matchId is required',
        code: 'INVALID_SNAPSHOT',
      });
    }

    gsiLogger.info(
      {
        matchId: snapshot.matchId,
        hero: snapshot.hero?.name,
      },
      'Manual recommendation request received'
    );

    // Get AI recommendations
    const aiEngine = AIRecommendationEngine.getInstance();
    const recommendations = await aiEngine.forceRecommendation(snapshot); // Bypass rate limiting

    // Optionally broadcast to WebSocket clients
    const broadcast = req.query.broadcast === 'true';
    let broadcastCount = 0;

    if (broadcast && snapshot.matchId) {
      const { wsServer } = await import('../server.js');
      broadcastCount = wsServer.broadcastRecommendations(snapshot.matchId, {
        draftAnalysis: recommendations.draftAnalysis,
        itemRecommendation: recommendations.itemRecommendation,
        hero: recommendations.context.myHero?.localized_name,
        timestamp: recommendations.timestamp,
      });
    }

    const duration = Date.now() - startTime;

    gsiLogger.info(
      {
        matchId: snapshot.matchId,
        hasDraftAnalysis: !!recommendations.draftAnalysis,
        hasItemRecommendation: !!recommendations.itemRecommendation,
        broadcast,
        broadcastCount,
        durationMs: duration,
      },
      'Manual recommendations generated'
    );

    // Return recommendations
    res.json({
      success: true,
      recommendations: {
        draftAnalysis: recommendations.draftAnalysis,
        itemRecommendation: recommendations.itemRecommendation,
        context: {
          hero: recommendations.context.myHero?.localized_name,
          gameTime: recommendations.context.gameTime,
          gold: recommendations.context.availableGold,
          gameState: recommendations.context.gameState,
        },
      },
      broadcast: {
        enabled: broadcast,
        sentCount: broadcastCount,
      },
      timestamp: recommendations.timestamp,
      processingTimeMs: duration,
    });
  } catch (error) {
    gsiLogger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to generate manual recommendations'
    );

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate recommendations',
      code: 'RECOMMENDATION_ERROR',
    });
  }
});

export default router;
