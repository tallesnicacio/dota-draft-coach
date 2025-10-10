/**
 * RoomManager tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RoomManager } from '../RoomManager.js';
import { WebSocket } from 'ws';
import type { AuthenticatedWebSocket } from '../types.js';

describe('RoomManager', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager({
      roomTTL: 10000, // 10s for testing
      cleanupInterval: 60000, // 1min (won't trigger during tests)
    });
  });

  afterEach(() => {
    roomManager.destroy();
  });

  describe('Room creation', () => {
    it('should create a room when getOrCreateRoom is called', () => {
      const room = roomManager.getOrCreateRoom('match123');

      expect(room).toBeDefined();
      expect(room.matchId).toBe('match123');
      expect(room.clients.size).toBe(0);
    });

    it('should return existing room if already created', () => {
      const room1 = roomManager.getOrCreateRoom('match123');
      const room2 = roomManager.getOrCreateRoom('match123');

      expect(room1).toBe(room2); // Same reference
    });
  });

  describe('Client subscription', () => {
    it('should subscribe a client to a room', () => {
      roomManager.subscribe('client1', 'match123');

      const room = roomManager.getOrCreateRoom('match123');
      expect(room.clients.has('client1')).toBe(true);
      expect(room.clients.size).toBe(1);
    });

    it('should subscribe multiple clients to the same room', () => {
      roomManager.subscribe('client1', 'match123');
      roomManager.subscribe('client2', 'match123');
      roomManager.subscribe('client3', 'match123');

      const room = roomManager.getOrCreateRoom('match123');
      expect(room.clients.size).toBe(3);
    });

    it('should move client to new room when re-subscribing', () => {
      roomManager.subscribe('client1', 'match123');
      roomManager.subscribe('client1', 'match456');

      const room1 = roomManager.getOrCreateRoom('match123');
      const room2 = roomManager.getOrCreateRoom('match456');

      expect(room1.clients.has('client1')).toBe(false);
      expect(room2.clients.has('client1')).toBe(true);
    });
  });

  describe('Client unsubscription', () => {
    it('should unsubscribe a client from a room', () => {
      roomManager.subscribe('client1', 'match123');
      roomManager.unsubscribe('client1');

      const room = roomManager.getOrCreateRoom('match123');
      expect(room.clients.has('client1')).toBe(false);
    });

    it('should handle unsubscribe of non-subscribed client', () => {
      expect(() => roomManager.unsubscribe('client999')).not.toThrow();
    });

    it('should delete room when last client unsubscribes', () => {
      roomManager.subscribe('client1', 'match123');
      roomManager.unsubscribe('client1');

      const stats = roomManager.getStats();
      expect(stats.totalRooms).toBe(0);
    });
  });

  describe('Room queries', () => {
    it('should get client room', () => {
      roomManager.subscribe('client1', 'match123');

      const room = roomManager.getClientRoom('client1');
      expect(room).toBeDefined();
      expect(room?.matchId).toBe('match123');
    });

    it('should return undefined for unsubscribed client', () => {
      const room = roomManager.getClientRoom('client999');
      expect(room).toBeUndefined();
    });

    it('should get all clients in a room', () => {
      roomManager.subscribe('client1', 'match123');
      roomManager.subscribe('client2', 'match123');
      roomManager.subscribe('client3', 'match123');

      const clients = roomManager.getRoomClients('match123');
      expect(clients.length).toBe(3);
      expect(clients).toContain('client1');
      expect(clients).toContain('client2');
      expect(clients).toContain('client3');
    });

    it('should return empty array for non-existent room', () => {
      const clients = roomManager.getRoomClients('match999');
      expect(clients).toEqual([]);
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast message to all clients in room', () => {
      // Mock WebSocket clients
      const mockClients = new Map<string, AuthenticatedWebSocket>();

      const createMockWs = (clientId: string): AuthenticatedWebSocket => {
        const ws = {
          clientId,
          matchId: null,
          isAuthenticated: true,
          lastPing: Date.now(),
          isAlive: true,
          readyState: 1, // OPEN
          OPEN: 1,
          send: vitest.fn(),
        } as unknown as AuthenticatedWebSocket;
        return ws;
      };

      const ws1 = createMockWs('client1');
      const ws2 = createMockWs('client2');
      const ws3 = createMockWs('client3');

      mockClients.set('client1', ws1);
      mockClients.set('client2', ws2);
      mockClients.set('client3', ws3);

      roomManager.subscribe('client1', 'match123');
      roomManager.subscribe('client2', 'match123');
      roomManager.subscribe('client3', 'match123');

      const sentCount = roomManager.broadcast('match123', 'test message', mockClients);

      expect(sentCount).toBe(3);
      expect(ws1.send).toHaveBeenCalledWith('test message');
      expect(ws2.send).toHaveBeenCalledWith('test message');
      expect(ws3.send).toHaveBeenCalledWith('test message');
    });

    it('should exclude client from broadcast if specified', () => {
      const mockClients = new Map<string, AuthenticatedWebSocket>();

      const createMockWs = (clientId: string): AuthenticatedWebSocket => {
        const ws = {
          clientId,
          readyState: 1,
          OPEN: 1,
          send: vitest.fn(),
        } as unknown as AuthenticatedWebSocket;
        return ws;
      };

      const ws1 = createMockWs('client1');
      const ws2 = createMockWs('client2');

      mockClients.set('client1', ws1);
      mockClients.set('client2', ws2);

      roomManager.subscribe('client1', 'match123');
      roomManager.subscribe('client2', 'match123');

      const sentCount = roomManager.broadcast(
        'match123',
        'test message',
        mockClients,
        'client1' // Exclude client1
      );

      expect(sentCount).toBe(1);
      expect(ws1.send).not.toHaveBeenCalled();
      expect(ws2.send).toHaveBeenCalledWith('test message');
    });

    it('should return 0 for non-existent room', () => {
      const mockClients = new Map();
      const sentCount = roomManager.broadcast('match999', 'test', mockClients);

      expect(sentCount).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should return accurate stats', () => {
      roomManager.subscribe('client1', 'match123');
      roomManager.subscribe('client2', 'match123');
      roomManager.subscribe('client3', 'match456');

      const stats = roomManager.getStats();

      expect(stats.totalRooms).toBe(2);
      expect(stats.totalClients).toBe(3);
      expect(stats.rooms.length).toBe(2);
    });
  });

  describe('Room cleanup', () => {
    it('should clean up empty rooms', () => {
      roomManager.subscribe('client1', 'match123');
      roomManager.unsubscribe('client1');

      const cleaned = roomManager.cleanupRooms();
      const stats = roomManager.getStats();

      expect(stats.totalRooms).toBe(0);
    });

    it('should clean up inactive rooms beyond TTL', async () => {
      // Create room manager with short TTL
      const rm = new RoomManager({
        roomTTL: 100, // 100ms
        cleanupInterval: 60000,
      });

      rm.subscribe('client1', 'match123');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      const cleaned = rm.cleanupRooms();
      expect(cleaned).toBeGreaterThan(0);

      rm.destroy();
    });
  });
});
