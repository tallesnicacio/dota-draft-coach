/**
 * Unit tests for SessionManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../SessionManager.js';
import { GsiAdapter } from '../GsiAdapter.js';
import type { GsiPayload, LiveSnapshot } from '../types.js';

// Load fixtures
import fullPayloadFixture from '../__fixtures__/gsi-payload-full.json';

// Helper to create mock snapshot
function createMockSnapshot(overrides: Partial<LiveSnapshot> = {}): LiveSnapshot {
  const base = GsiAdapter.normalize(fullPayloadFixture as GsiPayload);
  return { ...base, ...overrides };
}

// Helper to sleep
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager({ ttl: 5 * 60 * 1000 }); // 5 min TTL
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('getOrCreateSession()', () => {
    it('should create new session if not exists', () => {
      const session = manager.getOrCreateSession('match123', 'steam456');

      expect(session.matchId).toBe('match123');
      expect(session.steamId).toBe('steam456');
      expect(session.sessionId).toBe('match123:steam456');
      expect(session.lastUpdate).toBeGreaterThan(0);
      expect(session.snapshotCount).toBe(0);
      expect(session.lastSnapshotHash).toBeNull();
    });

    it('should return existing session if already created', () => {
      const session1 = manager.getOrCreateSession('match123', 'steam456');
      const session2 = manager.getOrCreateSession('match123', 'steam456');

      expect(session1).toBe(session2); // Same reference
    });

    it('should create separate sessions for different match IDs', () => {
      const session1 = manager.getOrCreateSession('match123', 'steam456');
      const session2 = manager.getOrCreateSession('match789', 'steam456');

      expect(session1).not.toBe(session2);
      expect(session1.matchId).toBe('match123');
      expect(session2.matchId).toBe('match789');
    });

    it('should create separate sessions for different steam IDs', () => {
      const session1 = manager.getOrCreateSession('match123', 'steam456');
      const session2 = manager.getOrCreateSession('match123', 'steam789');

      expect(session1).not.toBe(session2);
      expect(session1.steamId).toBe('steam456');
      expect(session2.steamId).toBe('steam789');
    });
  });

  describe('updateSession()', () => {
    it('should update session with new snapshot', () => {
      const snapshot = createMockSnapshot({
        matchId: 'match123',
        player: {
          steamId: '76561198012345678',
          accountId: '12345678',
          name: 'Player',
          activity: 'playing',
          teamName: 'radiant',
          kills: 0,
          deaths: 0,
          assists: 0,
          lastHits: 0,
          denies: 0,
          gold: 0,
          goldReliable: 0,
          goldUnreliable: 0,
          gpm: 0,
          xpm: 0,
        },
      });

      const result = manager.updateSession(snapshot);

      expect(result.broadcast).toBe(true);
      expect(result.deduplicated).toBe(false);
      expect(result.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.sessionId).toBe('match123:76561198012345678');
    });

    it('should deduplicate identical snapshots', () => {
      const snapshot1 = createMockSnapshot({
        matchId: 'match123',
        player: {
          steamId: '76561198012345678',
          accountId: '12345678',
          name: 'Player',
          activity: 'playing',
          teamName: 'radiant',
          kills: 5,
          deaths: 2,
          assists: 8,
          lastHits: 87,
          denies: 12,
          gold: 2450,
          goldReliable: 1200,
          goldUnreliable: 1250,
          gpm: 512,
          xpm: 628,
        },
      });

      const snapshot2 = createMockSnapshot({
        matchId: 'match123',
        player: {
          steamId: '76561198012345678',
          accountId: '12345678',
          name: 'Player',
          activity: 'playing',
          teamName: 'radiant',
          kills: 5,
          deaths: 2,
          assists: 8,
          lastHits: 87,
          denies: 12,
          gold: 2450,
          goldReliable: 1200,
          goldUnreliable: 1250,
          gpm: 512,
          xpm: 628,
        },
      });

      const result1 = manager.updateSession(snapshot1);
      const result2 = manager.updateSession(snapshot2);

      expect(result1.broadcast).toBe(true);
      expect(result1.deduplicated).toBe(false);

      expect(result2.broadcast).toBe(false);
      expect(result2.deduplicated).toBe(true);
      expect(result2.snapshotHash).toBe(result1.snapshotHash);
    });

    it('should broadcast if snapshot changed', () => {
      // Create two separate snapshots with different timestamps
      const snapshot1 = createMockSnapshot({ matchId: 'match123', t: 1000 });
      const snapshot2 = createMockSnapshot({ matchId: 'match123', t: 2000 }); // Different timestamp

      const result1 = manager.updateSession(snapshot1);
      const result2 = manager.updateSession(snapshot2);

      expect(result1.broadcast).toBe(true);
      expect(result2.broadcast).toBe(true);
      expect(result2.deduplicated).toBe(false);
      expect(result2.snapshotHash).not.toBe(result1.snapshotHash);
    });

    it('should increment snapshot count', () => {
      const snapshot1 = createMockSnapshot({ matchId: 'match123' });
      const snapshot2 = createMockSnapshot({
        matchId: 'match123',
        hero: { ...snapshot1.hero!, level: 6 },
      });

      manager.updateSession(snapshot1);
      manager.updateSession(snapshot2);

      const session = manager.getOrCreateSession('match123', '76561198012345678');
      expect(session.snapshotCount).toBe(2);
    });

    it('should handle missing matchId gracefully', () => {
      const snapshot = createMockSnapshot({ matchId: null });

      const result = manager.updateSession(snapshot);

      expect(result.broadcast).toBe(true);
      expect(result.sessionId).toBe('unknown');
    });

    it('should handle missing player gracefully', () => {
      const snapshot = createMockSnapshot({ player: null });

      const result = manager.updateSession(snapshot);

      expect(result.broadcast).toBe(true);
      expect(result.sessionId).toBe('unknown');
    });
  });

  describe('getSession()', () => {
    it('should return undefined for non-existent session', () => {
      const session = manager.getSession('match123:steam456');
      expect(session).toBeUndefined();
    });

    it('should return session if exists', () => {
      manager.getOrCreateSession('match123', 'steam456');

      const session = manager.getSession('match123:steam456');
      expect(session).toBeDefined();
      expect(session?.matchId).toBe('match123');
    });
  });

  describe('deleteSession()', () => {
    it('should delete session', () => {
      manager.getOrCreateSession('match123', 'steam456');
      expect(manager.getActiveSessions()).toBe(1);

      const deleted = manager.deleteSession('match123:steam456');
      expect(deleted).toBe(true);
      expect(manager.getActiveSessions()).toBe(0);
    });

    it('should return false for non-existent session', () => {
      const deleted = manager.deleteSession('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('cleanupExpiredSessions()', () => {
    it('should remove sessions older than TTL', async () => {
      const shortTtlManager = new SessionManager({ ttl: 100 }); // 100ms TTL

      shortTtlManager.getOrCreateSession('match123', 'steam456');
      expect(shortTtlManager.getActiveSessions()).toBe(1);

      await sleep(150);
      const cleaned = shortTtlManager.cleanupExpiredSessions();

      expect(cleaned).toBe(1);
      expect(shortTtlManager.getActiveSessions()).toBe(0);

      shortTtlManager.destroy();
    });

    it('should keep active sessions', async () => {
      const shortTtlManager = new SessionManager({ ttl: 1000 }); // 1s TTL

      const snapshot = createMockSnapshot({ matchId: 'match123' });
      shortTtlManager.updateSession(snapshot); // Touch session

      await sleep(500);
      const cleaned = shortTtlManager.cleanupExpiredSessions();

      expect(cleaned).toBe(0);
      expect(shortTtlManager.getActiveSessions()).toBe(1);

      shortTtlManager.destroy();
    });
  });

  describe('getMetrics()', () => {
    it('should return metrics', () => {
      const snapshot1 = createMockSnapshot({ matchId: 'match123' });
      const snapshot2 = createMockSnapshot({ matchId: 'match123' }); // Duplicate

      manager.updateSession(snapshot1);
      manager.updateSession(snapshot2);

      const metrics = manager.getMetrics();

      expect(metrics.activeSessions).toBe(1);
      expect(metrics.totalEvents).toBe(2);
      expect(metrics.dedupHits).toBe(1);
      expect(metrics.dedupRatio).toBeCloseTo(0.5, 2);
    });

    it('should handle zero events', () => {
      const metrics = manager.getMetrics();

      expect(metrics.activeSessions).toBe(0);
      expect(metrics.totalEvents).toBe(0);
      expect(metrics.dedupHits).toBe(0);
      expect(metrics.dedupRatio).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should clear all sessions and metrics', () => {
      const snapshot = createMockSnapshot({ matchId: 'match123' });
      manager.updateSession(snapshot);

      expect(manager.getActiveSessions()).toBe(1);
      expect(manager.getMetrics().totalEvents).toBe(1);

      manager.clear();

      expect(manager.getActiveSessions()).toBe(0);
      expect(manager.getMetrics().totalEvents).toBe(0);
    });
  });

  describe('getAllSessions()', () => {
    it('should return all sessions', () => {
      manager.getOrCreateSession('match1', 'steam1');
      manager.getOrCreateSession('match2', 'steam2');
      manager.getOrCreateSession('match3', 'steam3');

      const all = manager.getAllSessions();
      expect(all).toHaveLength(3);
    });

    it('should return empty array if no sessions', () => {
      const all = manager.getAllSessions();
      expect(all).toEqual([]);
    });
  });
});
