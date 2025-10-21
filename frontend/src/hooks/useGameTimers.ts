import { useEffect, useRef } from 'react';
import { useLiveStore, selectGameTime, selectIsInGame } from '@/store/liveStore';
import { useBuildStore } from '@/store/buildStore';
import { Timer } from '@/types/dota';
import { getActiveGameEvents, formatGameTime } from '@/utils/gameTimers';

/**
 * useGameTimers - Automatic timer system based on game time
 *
 * Completely automatic - no manual intervention needed.
 * Calculates and displays timers based on Dota 2 game time.
 *
 * Events tracked:
 * - Bounty Runes: 0:00, 3:00, 6:00, 9:00... (every 3 min)
 * - Power Runes: 7:00, 14:00, 21:00... (every 7 min)
 * - Water Runes: 2:00, 4:00, 6:00... (every 2 min)
 * - Tormentor: 20:00, 30:00, 40:00... (every 10 min starting at 20)
 * - Lotus Pool: 7:00, 10:00, 13:00... (every 3 min)
 * - Outpost XP: 10:00, 15:00, 20:00... (every 5 min)
 * - Stack Camp: X:53 every minute
 *
 * Usage:
 * ```tsx
 * useGameTimers(); // In App.tsx or main component
 * ```
 */
export function useGameTimers() {
  const snapshot = useLiveStore((state) => state.snapshot);
  const isInGame = useLiveStore(selectIsInGame);
  const addTimer = useBuildStore((state) => state.addTimer);
  const removeTimer = useBuildStore((state) => state.removeTimer);
  const timers = useBuildStore((state) => state.timers);

  // Track active game timers by event type
  const activeTimerIds = useRef<Map<string, string>>(new Map());
  const lastGameTime = useRef<number>(-1);

  useEffect(() => {
    if (!isInGame || !snapshot?.map) {
      // Clear all automatic timers when not in game
      const autoTimerIds = Array.from(activeTimerIds.current.values());
      autoTimerIds.forEach((id) => removeTimer(id));
      activeTimerIds.current.clear();
      lastGameTime.current = -1;
      return;
    }

    const gameTime = snapshot.map.gameTime;

    // Only update when game time changes (avoid excessive updates)
    if (gameTime === lastGameTime.current) {
      return;
    }
    lastGameTime.current = gameTime;

    // Get all events that should be shown right now
    const activeEvents = getActiveGameEvents(gameTime);

    // Track which event types are currently active
    const currentEventTypes = new Set(activeEvents.map((e) => e.type));

    // Remove timers for events that are no longer active
    for (const [eventType, timerId] of activeTimerIds.current.entries()) {
      if (!currentEventTypes.has(eventType)) {
        removeTimer(timerId);
        activeTimerIds.current.delete(eventType);
      }
    }

    // Add/update timers for active events
    for (const event of activeEvents) {
      const existingTimerId = activeTimerIds.current.get(event.type);

      // Check if timer already exists and is still valid
      const existingTimer = existingTimerId
        ? timers.find((t) => t.id === existingTimerId)
        : null;

      // Only create new timer if:
      // 1. No existing timer for this event type, OR
      // 2. Existing timer has finished
      if (!existingTimer || !existingTimer.active) {
        // Remove old timer if exists
        if (existingTimerId) {
          removeTimer(existingTimerId);
        }

        // Create new timer
        const now = Date.now();
        const durationMs = event.duration * 1000;

        const newTimer: Timer = {
          id: `game-${event.type}-${event.spawnTime}`,
          name: event.name,
          duration: event.duration,
          startTime: now,
          endTime: now + durationMs,
          active: true,
          automatic: true,
          source: `live-${event.type}` as Timer['source'],
        };

        addTimer(newTimer);
        activeTimerIds.current.set(event.type, newTimer.id);

        console.log('[GameTimers] Timer created:', {
          event: event.name,
          spawnTime: formatGameTime(event.spawnTime),
          duration: event.duration,
          currentGameTime: formatGameTime(gameTime),
        });
      }
    }
  }, [snapshot, isInGame, addTimer, removeTimer, timers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const autoTimerIds = Array.from(activeTimerIds.current.values());
      autoTimerIds.forEach((id) => removeTimer(id));
      activeTimerIds.current.clear();
    };
  }, [removeTimer]);
}
