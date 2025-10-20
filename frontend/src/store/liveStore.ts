import { create } from 'zustand';
import { LiveSnapshot, LiveStatus, LiveReliability } from '@/types/dota';

/**
 * LiveStore - State management for Live Mode (Game State Integration)
 *
 * This store manages the real-time game state received from the Dota 2 client
 * via the Game State Integration (GSI) system through a WebSocket connection.
 *
 * State flow:
 * 1. LiveClient connects to WebSocket server
 * 2. Client receives snapshots via WS
 * 3. LiveClient calls updateSnapshot()
 * 4. UI components react to state changes
 */

export interface LiveState {
  // Connection state
  enabled: boolean;
  status: LiveStatus;
  error: string | null;

  // Game state
  snapshot: LiveSnapshot | null;
  matchId: string | null;
  lastUpdate: number | null;

  // Connection quality
  reliability: LiveReliability;
  packetsReceived: number;
  duplicatePackets: number;
  reconnectAttempts: number;

  // Actions
  setEnabled: (enabled: boolean) => void;
  setStatus: (status: LiveStatus) => void;
  setError: (error: string | null) => void;
  updateSnapshot: (snapshot: LiveSnapshot) => void;
  incrementPackets: () => void;
  incrementDuplicates: () => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  reset: () => void;
}

const initialState = {
  enabled: false,
  status: 'disconnected' as LiveStatus,
  error: null,
  snapshot: null,
  matchId: null,
  lastUpdate: null,
  reliability: 'unknown' as LiveReliability,
  packetsReceived: 0,
  duplicatePackets: 0,
  reconnectAttempts: 0,
};

export const useLiveStore = create<LiveState>((set, get) => ({
  ...initialState,

  setEnabled: (enabled) => {
    set({ enabled });
    if (!enabled) {
      // When disabling, reset to initial state
      set(initialState);
    }
  },

  setStatus: (status) => set({ status }),

  setError: (error) => set({ error, status: error ? 'error' : get().status }),

  updateSnapshot: (snapshot) => {
    const now = Date.now();
    const state = get();

    // Calculate reliability based on packet timing
    let reliability: LiveReliability = 'unknown';
    if (state.lastUpdate) {
      const timeSinceLastUpdate = now - state.lastUpdate;
      if (timeSinceLastUpdate < 2000) {
        reliability = 'high'; // Updates more frequent than 2s
      } else if (timeSinceLastUpdate < 5000) {
        reliability = 'medium'; // Updates between 2-5s
      } else {
        reliability = 'low'; // Updates less frequent than 5s
      }
    }

    set({
      snapshot,
      matchId: snapshot.matchId,
      lastUpdate: now,
      reliability,
      status: 'connected',
      error: null,
    });
  },

  incrementPackets: () => set((state) => ({
    packetsReceived: state.packetsReceived + 1,
  })),

  incrementDuplicates: () => set((state) => ({
    duplicatePackets: state.duplicatePackets + 1,
  })),

  incrementReconnectAttempts: () => set((state) => ({
    reconnectAttempts: state.reconnectAttempts + 1,
  })),

  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),

  reset: () => set(initialState),
}));

/**
 * Selectors for common state access patterns
 */

export const selectIsConnected = (state: LiveState) => state.status === 'connected';
export const selectIsInGame = (state: LiveState) => !!state.snapshot?.matchId;
export const selectCurrentHero = (state: LiveState) => state.snapshot?.hero;
export const selectCurrentGold = (state: LiveState) => state.snapshot?.player?.gold || 0;
export const selectGameTime = (state: LiveState) => state.snapshot?.map?.gameTime || 0;
export const selectConnectionQuality = (state: LiveState) => ({
  reliability: state.reliability,
  packetsReceived: state.packetsReceived,
  duplicates: state.duplicatePackets,
  reconnectAttempts: state.reconnectAttempts,
  deduplicationRate:
    state.packetsReceived > 0
      ? (state.duplicatePackets / state.packetsReceived) * 100
      : 0,
});
