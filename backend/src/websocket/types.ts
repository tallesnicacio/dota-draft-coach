/**
 * WebSocket Types
 *
 * Defines types for WebSocket connections, rooms, and messages
 */

import type WebSocket from 'ws';
import type { LiveSnapshot } from '../gsi/types.js';

// ============================================================================
// Connection Types
// ============================================================================

export interface AuthenticatedWebSocket extends WebSocket {
  /** Unique client ID */
  clientId: string;
  /** Match ID this client is subscribed to (null if not subscribed) */
  matchId: string | null;
  /** Whether this client is authenticated */
  isAuthenticated: boolean;
  /** Timestamp of last ping received */
  lastPing: number;
  /** Whether the client is still alive (responded to ping) */
  isAlive: boolean;
}

// ============================================================================
// Room Types
// ============================================================================

export interface Room {
  /** Match ID for this room */
  matchId: string;
  /** Set of client IDs in this room */
  clients: Set<string>;
  /** Timestamp when room was created */
  createdAt: number;
  /** Timestamp of last activity */
  lastActivity: number;
}

// ============================================================================
// Message Types (Client → Server)
// ============================================================================

export type ClientMessage =
  | AuthMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | PingMessage;

export interface AuthMessage {
  type: 'auth';
  token: string;
}

export interface SubscribeMessage {
  type: 'subscribe';
  matchId: string;
}

export interface UnsubscribeMessage {
  type: 'unsubscribe';
}

export interface PingMessage {
  type: 'ping';
}

// ============================================================================
// Message Types (Server → Client)
// ============================================================================

export type ServerMessage =
  | AuthResponseMessage
  | SubscribeResponseMessage
  | SnapshotMessage
  | PongMessage
  | ErrorMessage;

export interface AuthResponseMessage {
  type: 'auth_response';
  success: boolean;
  clientId?: string;
  error?: string;
}

export interface SubscribeResponseMessage {
  type: 'subscribe_response';
  success: boolean;
  matchId?: string;
  error?: string;
}

export interface SnapshotMessage {
  type: 'snapshot';
  data: LiveSnapshot;
}

export interface PongMessage {
  type: 'pong';
  timestamp: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  code?: string;
}

// ============================================================================
// WebSocket Server Options
// ============================================================================

export interface WebSocketServerOptions {
  /** Port to listen on (default: from env or 3002) */
  port?: number;
  /** Heartbeat interval in ms (default: 30000 = 30s) */
  heartbeatInterval?: number;
  /** Client timeout in ms (default: 60000 = 60s) */
  clientTimeout?: number;
  /** Room cleanup interval in ms (default: 300000 = 5min) */
  roomCleanupInterval?: number;
  /** Room TTL in ms (default: 600000 = 10min) */
  roomTTL?: number;
}
