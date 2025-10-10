/**
 * RoomManager - Manages WebSocket rooms (lobbies) by matchId
 *
 * This manager:
 * - Creates/retrieves rooms per matchId
 * - Manages client subscriptions to rooms
 * - Broadcasts messages to all clients in a room
 * - Cleans up empty/inactive rooms
 */

import type { Room, AuthenticatedWebSocket } from './types.js';
import { wsLogger } from '../utils/logger.js';

export interface RoomManagerOptions {
  /** Room TTL in ms (default: 10 minutes) */
  roomTTL?: number;
  /** Cleanup interval in ms (default: 5 minutes) */
  cleanupInterval?: number;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private clientRooms: Map<string, string> = new Map(); // clientId → matchId
  private roomTTL: number;
  private cleanupInterval: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: RoomManagerOptions = {}) {
    this.roomTTL = options.roomTTL ?? 10 * 60 * 1000; // 10 minutes
    this.cleanupInterval = options.cleanupInterval ?? 5 * 60 * 1000; // 5 minutes

    this.startCleanup();
  }

  /**
   * Get or create a room for a matchId
   */
  getOrCreateRoom(matchId: string): Room {
    let room = this.rooms.get(matchId);

    if (!room) {
      room = {
        matchId,
        clients: new Set(),
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };
      this.rooms.set(matchId, room);

      wsLogger.info({ matchId, roomCount: this.rooms.size }, 'Room created');
    }

    return room;
  }

  /**
   * Subscribe a client to a room
   */
  subscribe(clientId: string, matchId: string): void {
    // Unsubscribe from previous room if any
    this.unsubscribe(clientId);

    // Get or create room
    const room = this.getOrCreateRoom(matchId);

    // Add client to room
    room.clients.add(clientId);
    room.lastActivity = Date.now();

    // Track client's room
    this.clientRooms.set(clientId, matchId);

    wsLogger.info(
      {
        clientId,
        matchId,
        clientCount: room.clients.size,
      },
      'Client subscribed to room'
    );
  }

  /**
   * Unsubscribe a client from their current room
   */
  unsubscribe(clientId: string): void {
    const matchId = this.clientRooms.get(clientId);

    if (!matchId) {
      return; // Not subscribed to any room
    }

    const room = this.rooms.get(matchId);

    if (room) {
      room.clients.delete(clientId);
      room.lastActivity = Date.now();

      wsLogger.info(
        {
          clientId,
          matchId,
          clientCount: room.clients.size,
        },
        'Client unsubscribed from room'
      );

      // Clean up empty room
      if (room.clients.size === 0) {
        this.rooms.delete(matchId);
        wsLogger.info({ matchId }, 'Room deleted (empty)');
      }
    }

    this.clientRooms.delete(clientId);
  }

  /**
   * Get the room a client is subscribed to
   */
  getClientRoom(clientId: string): Room | undefined {
    const matchId = this.clientRooms.get(clientId);
    return matchId ? this.rooms.get(matchId) : undefined;
  }

  /**
   * Get all clients in a room
   */
  getRoomClients(matchId: string): string[] {
    const room = this.rooms.get(matchId);
    return room ? Array.from(room.clients) : [];
  }

  /**
   * Broadcast a message to all clients in a room
   */
  broadcast(
    matchId: string,
    message: string,
    clients: Map<string, AuthenticatedWebSocket>,
    excludeClientId?: string
  ): number {
    const room = this.rooms.get(matchId);

    if (!room) {
      return 0; // Room doesn't exist
    }

    let sentCount = 0;

    for (const clientId of room.clients) {
      if (excludeClientId && clientId === excludeClientId) {
        continue; // Skip excluded client
      }

      const ws = clients.get(clientId);

      if (ws && ws.readyState === ws.OPEN) {
        try {
          ws.send(message);
          sentCount++;
        } catch (error) {
          wsLogger.error(
            {
              clientId,
              matchId,
              error: error instanceof Error ? error.message : String(error),
            },
            'Failed to send message to client'
          );
        }
      }
    }

    room.lastActivity = Date.now();

    wsLogger.debug(
      {
        matchId,
        totalClients: room.clients.size,
        sentCount,
      },
      'Broadcast message to room'
    );

    return sentCount;
  }

  /**
   * Get room statistics
   */
  getStats() {
    const roomStats = Array.from(this.rooms.values()).map((room) => ({
      matchId: room.matchId,
      clientCount: room.clients.size,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
      age: Date.now() - room.createdAt,
      inactive: Date.now() - room.lastActivity,
    }));

    return {
      totalRooms: this.rooms.size,
      totalClients: this.clientRooms.size,
      rooms: roomStats,
    };
  }

  /**
   * Clean up empty and inactive rooms
   */
  cleanupRooms(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [matchId, room] of this.rooms.entries()) {
      const inactive = now - room.lastActivity;

      // Delete if empty or inactive beyond TTL
      if (room.clients.size === 0 || inactive > this.roomTTL) {
        this.rooms.delete(matchId);

        // Remove all client mappings for this room
        for (const [clientId, roomMatchId] of this.clientRooms.entries()) {
          if (roomMatchId === matchId) {
            this.clientRooms.delete(clientId);
          }
        }

        cleaned++;

        wsLogger.info(
          {
            matchId,
            reason: room.clients.size === 0 ? 'empty' : 'inactive',
            inactive,
          },
          'Room cleaned up'
        );
      }
    }

    if (cleaned > 0) {
      wsLogger.info({ cleaned, remaining: this.rooms.size }, 'Room cleanup completed');
    }

    return cleaned;
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupRooms();
    }, this.cleanupInterval);

    wsLogger.debug(
      { cleanupInterval: this.cleanupInterval, roomTTL: this.roomTTL },
      'Room cleanup started'
    );
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      wsLogger.debug('Room cleanup stopped');
    }
  }

  /**
   * Clear all rooms (for testing)
   */
  clear(): void {
    this.rooms.clear();
    this.clientRooms.clear();
    wsLogger.debug('All rooms cleared');
  }

  /**
   * Destroy the manager (stop cleanup and clear)
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
    wsLogger.debug('RoomManager destroyed');
  }
}
