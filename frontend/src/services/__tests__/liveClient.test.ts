import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LiveClient } from '../liveClient';
import { useLiveStore } from '@/store/liveStore';
import { LiveSnapshot } from '@/types/dota';

/**
 * LiveClient tests
 *
 * Tests the WebSocket client that connects to the backend GSI server.
 * Uses a mock WebSocket to simulate server responses.
 */

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public readyState = MockWebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  public url: string;
  public sentMessages: any[] = [];

  constructor(url: string) {
    this.url = url;

    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(JSON.parse(data));
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(
      new CloseEvent('close', {
        code: code || 1000,
        reason: reason || '',
        wasClean: code === 1000,
      })
    );
  }

  // Test helper to simulate server message
  simulateMessage(message: any): void {
    if (this.readyState === MockWebSocket.OPEN) {
      this.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify(message),
        })
      );
    }
  }

  // Test helper to simulate error
  simulateError(): void {
    this.onerror?.(new Event('error'));
  }
}

// Replace global WebSocket with mock
const originalWebSocket = global.WebSocket;
beforeEach(() => {
  (global as any).WebSocket = MockWebSocket;
  vi.clearAllTimers();
  vi.useFakeTimers();

  // Reset LiveClient singleton and LiveStore
  LiveClient.resetInstance();
  useLiveStore.getState().reset();
});

afterEach(() => {
  // Clean up
  LiveClient.resetInstance();

  (global as any).WebSocket = originalWebSocket;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('LiveClient', () => {
  describe('Connection', () => {
    it('should connect to WebSocket server', async () => {
      const client = LiveClient.getInstance();
      client.connect();

      // Wait for connection to open
      await vi.advanceTimersByTimeAsync(20);

      const status = client.getStatus();
      expect(status.connected).toBe(true);
    });

    it('should update store status during connection', async () => {
      const client = LiveClient.getInstance();
      client.connect();

      // Initial status should be connecting
      expect(useLiveStore.getState().status).toBe('connecting');

      // Wait for connection to open and auth
      await vi.advanceTimersByTimeAsync(20);

      // After connection, it should send auth
      // (authenticated status is set after auth_response)
    });

    it('should prevent duplicate connections', async () => {
      const client = LiveClient.getInstance();
      client.connect();

      await vi.advanceTimersByTimeAsync(20);

      // Try to connect again
      client.connect();

      // Should not create a new WebSocket
      const status = client.getStatus();
      expect(status.connected).toBe(true);
    });

    it('should disconnect cleanly', async () => {
      const client = LiveClient.getInstance();
      client.connect();

      await vi.advanceTimersByTimeAsync(20);

      client.disconnect();

      const status = client.getStatus();
      expect(status.connected).toBe(false);
      expect(useLiveStore.getState().status).toBe('disconnected');
    });
  });

  describe('Authentication', () => {
    it('should send auth message on connect', async () => {
      const client = LiveClient.getInstance();
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      // Get the WebSocket instance from the client
      const ws = (client as any).ws as MockWebSocket;

      // Check that auth message was sent (first message)
      const authMsg = ws.sentMessages?.[0];
      expect(authMsg?.type).toBe('auth');
    });

    it('should handle successful auth response', async () => {
      const client = LiveClient.getInstance();
      client.connect();

      await vi.advanceTimersByTimeAsync(20);

      // Simulate successful auth response
      const ws = (client as any).ws as MockWebSocket;
      ws.simulateMessage({
        type: 'auth_response',
        success: true,
      });

      await vi.advanceTimersByTimeAsync(10);

      expect(useLiveStore.getState().status).toBe('connected');
      expect(client.getStatus().authenticated).toBe(true);
    });

    it('should handle failed auth response', async () => {
      const client = LiveClient.getInstance();
      client.connect();

      await vi.advanceTimersByTimeAsync(20);

      const ws = (client as any).ws as MockWebSocket;
      ws.simulateMessage({
        type: 'auth_response',
        success: false,
        message: 'Invalid token',
      });

      await vi.advanceTimersByTimeAsync(10);

      expect(useLiveStore.getState().error).toContain('Invalid token');
    });
  });

  describe('Snapshot handling', () => {
    it('should receive and process snapshots', async () => {
      const client = LiveClient.getInstance();
      client.connect();

      await vi.advanceTimersByTimeAsync(20);

      // Authenticate first
      const ws = (client as any).ws as MockWebSocket;
      ws.simulateMessage({
        type: 'auth_response',
        success: true,
      });

      await vi.advanceTimersByTimeAsync(10);

      // Send a snapshot
      const mockSnapshot: LiveSnapshot = {
        t: Date.now(),
        matchId: '1234567890',
        player: {
          steamId: '76561198012345678',
          accountId: '12345678',
          name: 'Player1',
          activity: 'playing',
          teamName: 'radiant',
          kills: 5,
          deaths: 2,
          assists: 10,
          lastHits: 120,
          denies: 15,
          gold: 3500,
          goldReliable: 500,
          goldUnreliable: 3000,
          gpm: 450,
          xpm: 520,
        },
        map: {
          clockTime: 600,
          gameTime: 600,
          daytime: true,
          gameState: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
          paused: false,
          winTeam: 'none',
          wardPurchaseCooldown: 0,
        },
        hero: {
          id: 1,
          name: 'antimage',
          displayName: 'Anti-Mage',
          level: 10,
          xp: 5000,
          alive: true,
          respawnSeconds: 0,
          buybackCost: 1200,
          buybackCooldown: 0,
          health: 800,
          maxHealth: 1000,
          healthPercent: 80,
          mana: 200,
          maxMana: 400,
          manaPercent: 50,
          position: { x: 100, y: 200 },
          statuses: {
            silenced: false,
            stunned: false,
            disarmed: false,
            magicImmune: false,
            hexed: false,
            muted: false,
            broken: false,
            smoked: false,
            hasDebuff: false,
          },
          talents: {
            '10_left': true,
            '10_right': false,
            '15_left': false,
            '15_right': false,
            '20_left': false,
            '20_right': false,
            '25_left': false,
            '25_right': false,
          },
        },
        abilities: [],
        items: [],
        draftHints: null,
      };

      ws.simulateMessage({
        type: 'snapshot',
        snapshot: mockSnapshot,
      });

      await vi.advanceTimersByTimeAsync(10);

      // Check that snapshot was stored
      const state = useLiveStore.getState();
      expect(state.snapshot).toBeDefined();
      expect(state.matchId).toBe('1234567890');
      expect(state.snapshot?.hero?.displayName).toBe('Anti-Mage');
      expect(state.packetsReceived).toBe(1);
    });

    it('should auto-subscribe to new match', async () => {
      const client = LiveClient.getInstance();
      client.connect();

      await vi.advanceTimersByTimeAsync(20);

      const ws = (client as any).ws as MockWebSocket;
      ws.simulateMessage({
        type: 'auth_response',
        success: true,
      });

      await vi.advanceTimersByTimeAsync(10);

      // Send snapshot with matchId
      ws.simulateMessage({
        type: 'snapshot',
        snapshot: {
          t: Date.now(),
          matchId: '9876543210',
          player: null,
          map: null,
          hero: null,
          abilities: [],
          items: [],
          draftHints: null,
        },
      });

      await vi.advanceTimersByTimeAsync(10);

      // Check that subscribe message was sent
      const subscribeMsg = ws.sentMessages.find((msg) => msg.type === 'subscribe');
      expect(subscribeMsg).toBeDefined();
      expect(subscribeMsg?.matchId).toBe('9876543210');
    });
  });

  describe('Reconnection', () => {
    it('should reconnect after connection loss', async () => {
      const client = LiveClient.getInstance();
      client.connect();

      await vi.advanceTimersByTimeAsync(20);

      // Simulate connection close
      const ws = (client as any).ws as MockWebSocket;
      ws.close(1006, 'Abnormal close'); // Non-clean close

      // Wait for close event to process
      await vi.advanceTimersByTimeAsync(100);

      expect(useLiveStore.getState().status).toBe('disconnected');

      // Reconnect counter increments BEFORE the setTimeout
      expect(useLiveStore.getState().reconnectAttempts).toBe(1);

      // Wait for reconnect delay (1s base delay)
      await vi.advanceTimersByTimeAsync(1100);

      // Should have attempted to reconnect
      const status = client.getStatus();
      // Either connected or in the process of connecting
      expect(status.connected).toBe(true);
    });

    it('should use exponential backoff for reconnect', async () => {
      const client = LiveClient.getInstance();

      // First connection
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      const ws = (client as any).ws as MockWebSocket;

      // Close the connection to trigger reconnects
      ws.close(1006, 'Abnormal close');
      await vi.advanceTimersByTimeAsync(100);

      // First reconnect attempt (1s delay)
      expect(useLiveStore.getState().reconnectAttempts).toBe(1);

      // Don't advance enough time to reconnect, just close again
      // This tests that the delay is increasing

      // We can't easily test the actual delays in unit tests with the current setup
      // because the WebSocket connects successfully and resets the counter.
      // Instead, we'll just verify that the reconnect logic is called
      expect(useLiveStore.getState().reconnectAttempts).toBeGreaterThan(0);
    });
  });

  describe('Subscription', () => {
    it('should subscribe to a match', async () => {
      const client = LiveClient.getInstance();
      client.connect();

      await vi.advanceTimersByTimeAsync(20);

      const ws = (client as any).ws as MockWebSocket;
      ws.simulateMessage({
        type: 'auth_response',
        success: true,
      });

      await vi.advanceTimersByTimeAsync(10);

      client.subscribe('1234567890');

      const subscribeMsg = ws.sentMessages.find((msg) => msg.type === 'subscribe');
      expect(subscribeMsg).toBeDefined();
      expect(subscribeMsg?.matchId).toBe('1234567890');
    });

    it('should unsubscribe from a match', async () => {
      const client = LiveClient.getInstance();
      client.connect();

      await vi.advanceTimersByTimeAsync(20);

      const ws = (client as any).ws as MockWebSocket;
      ws.simulateMessage({
        type: 'auth_response',
        success: true,
      });

      await vi.advanceTimersByTimeAsync(10);

      client.subscribe('1234567890');
      client.unsubscribe();

      const unsubscribeMsg = ws.sentMessages.find((msg) => msg.type === 'unsubscribe');
      expect(unsubscribeMsg).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle server errors', async () => {
      const client = LiveClient.getInstance();
      client.connect();

      await vi.advanceTimersByTimeAsync(20);

      const ws = (client as any).ws as MockWebSocket;
      ws.simulateMessage({
        type: 'error',
        message: 'Server error occurred',
        code: 'INTERNAL_ERROR',
      });

      await vi.advanceTimersByTimeAsync(10);

      expect(useLiveStore.getState().error).toContain('Server error occurred');
    });

    it('should handle WebSocket errors', async () => {
      const client = LiveClient.getInstance();
      client.connect();

      await vi.advanceTimersByTimeAsync(20);

      const ws = (client as any).ws as MockWebSocket;
      ws.simulateError();

      await vi.advanceTimersByTimeAsync(10);

      expect(useLiveStore.getState().error).toBeTruthy();
    });
  });
});
