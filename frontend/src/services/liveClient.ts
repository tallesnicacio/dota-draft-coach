import { useLiveStore, AIRecommendations } from '@/store/liveStore';
import { LiveSnapshot } from '@/types/dota';

/**
 * LiveClient - WebSocket client for Dota 2 Game State Integration
 *
 * Connects to the backend WebSocket server to receive real-time game state updates.
 * Implements auto-reconnection with exponential backoff.
 *
 * Protocol:
 * - Client → Server: auth, subscribe, unsubscribe, ping
 * - Server → Client: auth_response, subscribe_response, snapshot, ai_recommendations, pong, error
 *
 * Usage:
 *   const client = LiveClient.getInstance();
 *   client.connect();
 *   client.subscribe('1234567890');
 */

// WebSocket message types
interface WSMessage {
  type: string;
  [key: string]: any;
}

interface AuthMessage extends WSMessage {
  type: 'auth';
  token: string;
}

interface SubscribeMessage extends WSMessage {
  type: 'subscribe';
  matchId: string;
}

interface SnapshotMessage extends WSMessage {
  type: 'snapshot';
  snapshot: LiveSnapshot;
}

interface AIRecommendationsMessage extends WSMessage {
  type: 'ai_recommendations';
  recommendations: AIRecommendations;
  matchId: string;
  timestamp: number;
}

interface AuthResponseMessage extends WSMessage {
  type: 'auth_response';
  success: boolean;
  clientId?: string;
  error?: string;
}

interface ErrorMessage extends WSMessage {
  type: 'error';
  message: string;
  code?: string;
}

export class LiveClient {
  private static instance: LiveClient | null = null;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: number | null = null;
  private pingInterval: number | null = null;
  private isConnecting = false;
  private isAuthenticated = false;
  private currentMatchId: string | null = null;

  // Configuration
  private readonly wsUrl: string;
  private readonly authToken: string;
  private readonly pingIntervalMs = 30000; // 30s
  private readonly baseReconnectDelay = 1000; // 1s
  private readonly maxReconnectDelay = 30000; // 30s

  private constructor() {
    // Detect environment (development vs production)
    const isDev = import.meta.env.DEV;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    // In development, use Vite proxy (/ws → ws://localhost:3001/ws)
    // In production, connect to same host as the page
    const wsHost = isDev ? window.location.host : window.location.host;

    this.wsUrl = `${wsProtocol}//${wsHost}/ws`;
    this.authToken = import.meta.env.VITE_WS_AUTH_TOKEN || '';

    console.log('[LiveClient] Initialized', {
      url: this.wsUrl,
      hasToken: !!this.authToken,
    });
  }

  public static getInstance(): LiveClient {
    if (!LiveClient.instance) {
      LiveClient.instance = new LiveClient();
    }
    return LiveClient.instance;
  }

  /**
   * Reset singleton instance (for testing only)
   * @internal
   */
  public static resetInstance(): void {
    if (LiveClient.instance) {
      LiveClient.instance.disconnect();
      LiveClient.instance = null;
    }
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[LiveClient] Already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('[LiveClient] Connection already in progress');
      return;
    }

    this.isConnecting = true;
    useLiveStore.getState().setStatus('connecting');
    useLiveStore.getState().setError(null);

    console.log('[LiveClient] Connecting to', this.wsUrl);

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onclose = (event) => this.handleClose(event);
      this.ws.onerror = (event) => this.handleError(event);
    } catch (error) {
      console.error('[LiveClient] Failed to create WebSocket', error);
      this.isConnecting = false;
      useLiveStore.getState().setError('Failed to create WebSocket connection');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    console.log('[LiveClient] Disconnecting');

    this.clearReconnectTimeout();
    this.clearPingInterval();
    this.isAuthenticated = false;
    this.currentMatchId = null;

    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }

    useLiveStore.getState().setStatus('disconnected');
  }

  /**
   * Subscribe to a specific match
   */
  public subscribe(matchId: string): void {
    if (!this.isAuthenticated) {
      console.warn('[LiveClient] Cannot subscribe: not authenticated');
      return;
    }

    console.log('[LiveClient] Subscribing to match', matchId);
    this.currentMatchId = matchId;

    const message: SubscribeMessage = {
      type: 'subscribe',
      matchId,
    };

    this.send(message);
  }

  /**
   * Unsubscribe from current match
   */
  public unsubscribe(): void {
    if (!this.currentMatchId) {
      return;
    }

    console.log('[LiveClient] Unsubscribing from match', this.currentMatchId);

    const message: WSMessage = {
      type: 'unsubscribe',
      matchId: this.currentMatchId,
    };

    this.send(message);
    this.currentMatchId = null;
  }

  /**
   * Get connection status
   */
  public getStatus(): {
    connected: boolean;
    authenticated: boolean;
    matchId: string | null;
  } {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      authenticated: this.isAuthenticated,
      matchId: this.currentMatchId,
    };
  }

  // Private methods

  private handleOpen(): void {
    console.log('[LiveClient] Connection opened');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    useLiveStore.getState().resetReconnectAttempts();

    // Authenticate
    this.authenticate();

    // Start heartbeat
    this.startPing();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WSMessage = JSON.parse(event.data);

      console.log('[LiveClient] Message received', message.type);

      switch (message.type) {
        case 'auth_response':
          this.handleAuthResponse(message as AuthResponseMessage);
          break;

        case 'subscribe_response':
          this.handleSubscribeResponse(message);
          break;

        case 'snapshot':
          this.handleSnapshot(message as SnapshotMessage);
          break;

        case 'ai_recommendations':
          this.handleAIRecommendations(message as AIRecommendationsMessage);
          break;

        case 'pong':
          // Heartbeat response
          break;

        case 'error':
          this.handleErrorMessage(message as ErrorMessage);
          break;

        default:
          console.warn('[LiveClient] Unknown message type', message.type);
      }
    } catch (error) {
      console.error('[LiveClient] Failed to parse message', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('[LiveClient] Connection closed', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });

    this.isConnecting = false;
    this.isAuthenticated = false;
    this.clearPingInterval();

    useLiveStore.getState().setStatus('disconnected');

    // Auto-reconnect if not a clean close
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    console.error('[LiveClient] WebSocket error', event);
    this.isConnecting = false;

    useLiveStore.getState().setError('WebSocket connection error');
  }

  private handleAuthResponse(message: AuthResponseMessage): void {
    if (message.success) {
      console.log('[LiveClient] Authentication successful', { clientId: message.clientId });
      this.isAuthenticated = true;
      useLiveStore.getState().setStatus('connected');
      useLiveStore.getState().setError(null);

      // Auto-subscribe to matchId "0" (Demo Hero mode) to receive initial snapshots
      // This allows the client to receive broadcasts even before entering a real match
      console.log('[LiveClient] Auto-subscribing to Demo Hero (matchId: 0)');
      this.subscribe('0');
    } else {
      console.error('[LiveClient] Authentication failed', message.error);
      useLiveStore.getState().setError(`Authentication failed: ${message.error || 'Unknown error'}`);
      this.disconnect();
    }
  }

  private handleSubscribeResponse(message: WSMessage): void {
    if (message.success) {
      console.log('[LiveClient] Subscribed to match', message.matchId);
    } else {
      console.error('[LiveClient] Subscription failed', message.error);
      useLiveStore.getState().setError(`Subscription failed: ${message.error || 'Unknown error'}`);
    }
  }

  private handleSnapshot(message: SnapshotMessage): void {
    const snapshot = message.snapshot;

    console.log('[LiveClient] Snapshot received', {
      matchId: snapshot.matchId,
      hero: snapshot.hero?.displayName,
      gameTime: snapshot.map?.gameTime,
    });

    // Update store
    useLiveStore.getState().updateSnapshot(snapshot);
    useLiveStore.getState().incrementPackets();

    // Auto-subscribe to new match if not subscribed
    if (snapshot.matchId && snapshot.matchId !== this.currentMatchId) {
      this.subscribe(snapshot.matchId);
    }
  }

  private handleAIRecommendations(message: AIRecommendationsMessage): void {
    const { recommendations, matchId } = message;

    console.log('[LiveClient] AI Recommendations received', {
      matchId,
      hero: recommendations.hero,
      hasDraftAnalysis: !!recommendations.draftAnalysis,
      hasItemRecommendation: !!recommendations.itemRecommendation,
    });

    // Update store with recommendations
    useLiveStore.getState().updateRecommendations(recommendations);
  }

  private handleErrorMessage(message: ErrorMessage): void {
    console.error('[LiveClient] Server error', message.message, message.code);
    useLiveStore.getState().setError(`Server error: ${message.message}`);
  }

  private authenticate(): void {
    console.log('[LiveClient] Authenticating');

    const message: AuthMessage = {
      type: 'auth',
      token: this.authToken,
    };

    this.send(message);
  }

  private startPing(): void {
    this.clearPingInterval();

    this.pingInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, this.pingIntervalMs);
  }

  private send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[LiveClient] Cannot send message: not connected');
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[LiveClient] Max reconnect attempts reached');
      useLiveStore.getState().setError('Failed to reconnect after multiple attempts');
      return;
    }

    this.clearReconnectTimeout();

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(`[LiveClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectAttempts++;
    useLiveStore.getState().incrementReconnectAttempts();

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private clearPingInterval(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Export singleton instance
export const liveClient = LiveClient.getInstance();
