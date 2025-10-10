/**
 * SessionManager - Manages live game sessions with deduplication and TTL
 *
 * This manager:
 * - Creates/retrieves sessions per matchId + steamId
 * - Deduplicates identical snapshots using SHA256 hash
 * - Expires sessions after TTL of inactivity
 * - Provides metrics for observability
 */

import { GsiAdapter } from './GsiAdapter.js';
import type {
  LiveSession,
  LiveSnapshot,
  SessionUpdateResult,
  SessionMetrics,
} from './types.js';

export interface SessionManagerOptions {
  /** Session TTL in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Cleanup interval in milliseconds (default: 60 seconds) */
  cleanupInterval?: number;
}

export class SessionManager {
  private sessions: Map<string, LiveSession> = new Map();
  private ttl: number;
  private cleanupInterval: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  // Metrics
  private totalEvents = 0;
  private dedupHits = 0;

  constructor(options: SessionManagerOptions = {}) {
    this.ttl = options.ttl ?? 5 * 60 * 1000; // 5 minutes default
    this.cleanupInterval = options.cleanupInterval ?? 60 * 1000; // 60 seconds default

    // Start automatic cleanup
    this.startCleanup();
  }

  /**
   * Get or create a session
   */
  getOrCreateSession(matchId: string, steamId: string): LiveSession {
    const sessionId = this.buildSessionId(matchId, steamId);
    let session = this.sessions.get(sessionId);

    if (!session) {
      const now = Date.now();
      session = {
        sessionId,
        matchId,
        steamId,
        createdAt: now,
        lastUpdate: now,
        lastSnapshotHash: null,
        snapshotCount: 0,
      };
      this.sessions.set(sessionId, session);
    }

    return session;
  }

  /**
   * Update session with new snapshot
   * Returns whether to broadcast and dedup status
   */
  updateSession(snapshot: LiveSnapshot): SessionUpdateResult {
    // Extract matchId and steamId
    const matchId = snapshot.matchId;
    const steamId = snapshot.player?.steamId;

    if (!matchId || !steamId) {
      // Not enough data to create session, broadcast anyway
      return {
        broadcast: true,
        deduplicated: false,
        snapshotHash: '',
        sessionId: 'unknown',
      };
    }

    // Get or create session
    const session = this.getOrCreateSession(matchId, steamId);

    // Compute snapshot hash
    const snapshotHash = GsiAdapter.computeSnapshotHash(snapshot);

    // Check for deduplication
    const deduplicated = snapshotHash === session.lastSnapshotHash;

    // Update session
    session.lastUpdate = Date.now();
    session.lastSnapshotHash = snapshotHash;
    session.snapshotCount++;

    // Update metrics
    this.totalEvents++;
    if (deduplicated) {
      this.dedupHits++;
    }

    return {
      broadcast: !deduplicated,
      deduplicated,
      snapshotHash,
      sessionId: session.sessionId,
    };
  }

  /**
   * Get a specific session
   */
  getSession(sessionId: string): LiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get number of active sessions
   */
  getActiveSessions(): number {
    return this.sessions.size;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): LiveSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get metrics
   */
  getMetrics(): SessionMetrics {
    return {
      activeSessions: this.sessions.size,
      totalEvents: this.totalEvents,
      dedupHits: this.dedupHits,
      dedupRatio: this.totalEvents > 0 ? this.dedupHits / this.totalEvents : 0,
    };
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactive = now - session.lastUpdate;

      if (inactive > this.ttl) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      return; // Already started
    }

    this.cleanupTimer = setInterval(() => {
      const cleaned = this.cleanupExpiredSessions();
      if (cleaned > 0) {
        console.log(`[SessionManager] Cleaned up ${cleaned} expired sessions`);
      }
    }, this.cleanupInterval);

    // Don't keep process alive just for cleanup
    this.cleanupTimer.unref();
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Clear all sessions and metrics
   */
  clear(): void {
    this.sessions.clear();
    this.totalEvents = 0;
    this.dedupHits = 0;
  }

  /**
   * Destroy manager (cleanup resources)
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }

  /**
   * Build session ID from matchId and steamId
   */
  private buildSessionId(matchId: string, steamId: string): string {
    return `${matchId}:${steamId}`;
  }
}
