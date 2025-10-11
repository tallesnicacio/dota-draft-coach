/**
 * WebSocket Server for Live Mode
 *
 * Handles WebSocket connections for real-time game state updates.
 * Features:
 * - Connection authentication
 * - Room-based broadcasting (by matchId)
 * - Heartbeat/ping-pong for connection health
 * - Automatic cleanup of dead connections
 */

import { WebSocketServer, WebSocket, RawData } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { Server as HTTPServer } from 'http';
import { RoomManager } from './RoomManager.js';
import { wsLogger } from '../utils/logger.js';
import type {
  AuthenticatedWebSocket,
  ClientMessage,
  ServerMessage,
  WebSocketServerOptions,
} from './types.js';
import type { LiveSnapshot } from '../gsi/types.js';

export class LiveWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket> = new Map();
  private roomManager: RoomManager;
  private heartbeatInterval: number;
  private clientTimeout: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(httpServer: HTTPServer, options: WebSocketServerOptions = {}) {
    this.heartbeatInterval = options.heartbeatInterval ?? 30000; // 30s
    this.clientTimeout = options.clientTimeout ?? 60000; // 60s

    // Create WebSocket server attached to HTTP server
    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws',
    });

    // Create room manager
    this.roomManager = new RoomManager({
      roomTTL: options.roomTTL,
      cleanupInterval: options.roomCleanupInterval,
    });

    // Setup connection handler
    this.wss.on('connection', this.handleConnection.bind(this));

    // Start heartbeat
    this.startHeartbeat();

    wsLogger.info(
      {
        path: '/ws',
        heartbeatInterval: this.heartbeatInterval,
        clientTimeout: this.clientTimeout,
      },
      'WebSocket server started'
    );
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    // Generate unique client ID
    const clientId = uuidv4();

    // Extend WebSocket with our custom properties
    const authWs = ws as AuthenticatedWebSocket;
    authWs.clientId = clientId;
    authWs.matchId = null;
    authWs.isAuthenticated = false;
    authWs.lastPing = Date.now();
    authWs.isAlive = true;

    // Store client
    this.clients.set(clientId, authWs);

    wsLogger.info(
      {
        clientId,
        totalClients: this.clients.size,
      },
      'Client connected'
    );

    // Setup event handlers
    authWs.on('message', (data) => this.handleMessage(authWs, data));
    authWs.on('pong', () => this.handlePong(authWs));
    authWs.on('close', () => this.handleClose(authWs));
    authWs.on('error', (error) => this.handleError(authWs, error));

    // Send initial message (not authenticated yet)
    this.sendMessage(authWs, {
      type: 'auth_response',
      success: false,
      error: 'Not authenticated. Send auth message with token.',
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(ws: AuthenticatedWebSocket, data: RawData): void {
    try {
      const message: ClientMessage = JSON.parse(data.toString());

      wsLogger.debug(
        {
          clientId: ws.clientId,
          messageType: message.type,
        },
        'Message received from client'
      );

      switch (message.type) {
        case 'auth':
          this.handleAuth(ws, message.token);
          break;

        case 'subscribe':
          if (!ws.isAuthenticated) {
            this.sendError(ws, 'Not authenticated', 'AUTH_REQUIRED');
            return;
          }
          this.handleSubscribe(ws, message.matchId);
          break;

        case 'unsubscribe':
          if (!ws.isAuthenticated) {
            this.sendError(ws, 'Not authenticated', 'AUTH_REQUIRED');
            return;
          }
          this.handleUnsubscribe(ws);
          break;

        case 'ping':
          this.handleClientPing(ws);
          break;

        default:
          this.sendError(ws, 'Unknown message type', 'UNKNOWN_MESSAGE_TYPE');
      }
    } catch (error) {
      wsLogger.error(
        {
          clientId: ws.clientId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to parse client message'
      );
      this.sendError(ws, 'Invalid message format', 'INVALID_MESSAGE');
    }
  }

  /**
   * Handle authentication
   */
  private handleAuth(ws: AuthenticatedWebSocket, token: string): void {
    const expectedToken = process.env.WS_AUTH_TOKEN || process.env.GSI_AUTH_TOKEN;

    // If no token configured, allow all (dev mode)
    if (!expectedToken) {
      ws.isAuthenticated = true;
      this.sendMessage(ws, {
        type: 'auth_response',
        success: true,
        clientId: ws.clientId,
      });

      wsLogger.warn(
        { clientId: ws.clientId },
        'Client authenticated (no token configured)'
      );
      return;
    }

    // Validate token
    if (token === expectedToken) {
      ws.isAuthenticated = true;
      this.sendMessage(ws, {
        type: 'auth_response',
        success: true,
        clientId: ws.clientId,
      });

      wsLogger.info({ clientId: ws.clientId }, 'Client authenticated');
    } else {
      this.sendMessage(ws, {
        type: 'auth_response',
        success: false,
        error: 'Invalid token',
      });

      wsLogger.warn({ clientId: ws.clientId }, 'Authentication failed: invalid token');
    }
  }

  /**
   * Handle room subscription
   */
  private handleSubscribe(ws: AuthenticatedWebSocket, matchId: string): void {
    try {
      this.roomManager.subscribe(ws.clientId, matchId);
      ws.matchId = matchId;

      this.sendMessage(ws, {
        type: 'subscribe_response',
        success: true,
        matchId,
      });

      wsLogger.info({ clientId: ws.clientId, matchId }, 'Client subscribed to match');
    } catch (error) {
      this.sendMessage(ws, {
        type: 'subscribe_response',
        success: false,
        error: error instanceof Error ? error.message : 'Subscription failed',
      });

      wsLogger.error(
        {
          clientId: ws.clientId,
          matchId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Subscription failed'
      );
    }
  }

  /**
   * Handle room unsubscription
   */
  private handleUnsubscribe(ws: AuthenticatedWebSocket): void {
    this.roomManager.unsubscribe(ws.clientId);
    ws.matchId = null;

    wsLogger.info({ clientId: ws.clientId }, 'Client unsubscribed from match');
  }

  /**
   * Handle client ping
   */
  private handleClientPing(ws: AuthenticatedWebSocket): void {
    ws.lastPing = Date.now();
    ws.isAlive = true;

    this.sendMessage(ws, {
      type: 'pong',
      timestamp: Date.now(),
    });
  }

  /**
   * Handle pong response (from server ping)
   */
  private handlePong(ws: AuthenticatedWebSocket): void {
    ws.isAlive = true;
    ws.lastPing = Date.now();
  }

  /**
   * Handle connection close
   */
  private handleClose(ws: AuthenticatedWebSocket): void {
    this.roomManager.unsubscribe(ws.clientId);
    this.clients.delete(ws.clientId);

    wsLogger.info(
      {
        clientId: ws.clientId,
        totalClients: this.clients.size,
      },
      'Client disconnected'
    );
  }

  /**
   * Handle connection error
   */
  private handleError(ws: AuthenticatedWebSocket, error: Error): void {
    wsLogger.error(
      {
        clientId: ws.clientId,
        error: error.message,
      },
      'WebSocket error'
    );
  }

  /**
   * Send message to client
   */
  private sendMessage(ws: AuthenticatedWebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        wsLogger.error(
          {
            clientId: ws.clientId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Failed to send message'
        );
      }
    }
  }

  /**
   * Send error message to client
   */
  private sendError(ws: AuthenticatedWebSocket, message: string, code?: string): void {
    this.sendMessage(ws, {
      type: 'error',
      message,
      code,
    });
  }

  /**
   * Broadcast snapshot to all clients in a match
   */
  public broadcastSnapshot(snapshot: LiveSnapshot): number {
    if (!snapshot.matchId) {
      wsLogger.debug('Snapshot has no matchId, skipping broadcast');
      return 0;
    }

    const message = JSON.stringify({
      type: 'snapshot',
      data: snapshot,
    });

    const sentCount = this.roomManager.broadcast(
      snapshot.matchId,
      message,
      this.clients
    );

    wsLogger.debug(
      {
        matchId: snapshot.matchId,
        sentCount,
      },
      'Snapshot broadcasted'
    );

    return sentCount;
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();

      for (const [clientId, ws] of this.clients.entries()) {
        // Check if client is dead
        if (!ws.isAlive || now - ws.lastPing > this.clientTimeout) {
          wsLogger.info({ clientId }, 'Client timeout, terminating connection');
          ws.terminate();
          this.clients.delete(clientId);
          this.roomManager.unsubscribe(clientId);
          continue;
        }

        // Mark as potentially dead, will be revived by pong
        ws.isAlive = false;

        // Send ping
        try {
          ws.ping();
        } catch (error) {
          wsLogger.error(
            {
              clientId,
              error: error instanceof Error ? error.message : String(error),
            },
            'Failed to send ping'
          );
        }
      }
    }, this.heartbeatInterval);

    wsLogger.debug({ heartbeatInterval: this.heartbeatInterval }, 'Heartbeat started');
  }

  /**
   * Get server statistics
   */
  public getStats() {
    const roomStats = this.roomManager.getStats();

    return {
      clients: {
        total: this.clients.size,
        authenticated: Array.from(this.clients.values()).filter((ws) => ws.isAuthenticated)
          .length,
        subscribed: Array.from(this.clients.values()).filter((ws) => ws.matchId !== null)
          .length,
      },
      rooms: roomStats,
    };
  }

  /**
   * Shutdown the server
   */
  public shutdown(): void {
    wsLogger.info('Shutting down WebSocket server');

    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Close all connections
    for (const ws of this.clients.values()) {
      ws.close(1001, 'Server shutting down');
    }

    this.clients.clear();

    // Destroy room manager
    this.roomManager.destroy();

    // Close WebSocket server
    this.wss.close();

    wsLogger.info('WebSocket server shutdown complete');
  }
}
