import { useEffect, useRef } from 'react';
import { useLiveStore, selectGameTime, selectIsInGame } from '@/store/liveStore';
import { useBuildStore } from '@/store/buildStore';
import { Timer } from '@/types/dota';
import { toast } from '@/components/ui/sonner';

/**
 * useAutoTimers - Hook for automatic timer detection based on Live Mode
 *
 * Monitors the LiveSnapshot and automatically creates timers for:
 * - Power runes (every 7 minutes)
 * - Ward purchase cooldown
 * - Future: Roshan, Glyph, Scan (when data available)
 *
 * Usage:
 * ```tsx
 * useAutoTimers(); // In a component that's always mounted (e.g., App.tsx)
 * ```
 */
export function useAutoTimers() {
  const snapshot = useLiveStore((state) => state.snapshot);
  const isInGame = useLiveStore(selectIsInGame);
  const addTimer = useBuildStore((state) => state.addTimer);
  const timers = useBuildStore((state) => state.timers);

  // Track last detected events to avoid duplicates
  const lastRuneMinute = useRef<number>(-1);
  const lastWardCooldownStart = useRef<number>(0);

  useEffect(() => {
    if (!isInGame || !snapshot) {
      // Reset tracking when not in game
      lastRuneMinute.current = -1;
      lastWardCooldownStart.current = 0;
      return;
    }

    const gameTime = snapshot.map?.gameTime || 0;
    const currentMinute = Math.floor(gameTime / 60);

    // 1. POWER RUNE TIMER (every 7 minutes: 0, 7, 14, 21, 28...)
    // Trigger when game time crosses a 7-minute boundary
    const runeInterval = 7; // minutes
    const currentRuneMinute = Math.floor(currentMinute / runeInterval) * runeInterval;

    if (currentRuneMinute > 0 && currentRuneMinute !== lastRuneMinute.current) {
      // Check if we're within 10 seconds of the rune spawn to avoid late triggers
      const secondsIntoInterval = gameTime % (runeInterval * 60);

      if (secondsIntoInterval <= 10) {
        // Check if timer already exists
        const existingTimer = timers.find(
          (t) => t.active && t.source === 'live-rune' &&
          Math.abs(t.startTime - Date.now()) < 30000 // Within last 30s
        );

        if (!existingTimer) {
          const now = Date.now();
          const runeDuration = runeInterval * 60; // 7 minutes in seconds

          const runeTimer: Timer = {
            id: `auto-rune-${now}`,
            name: 'Runa de Poder (Auto)',
            duration: runeDuration,
            startTime: now,
            endTime: now + runeDuration * 1000,
            active: true,
            automatic: true,
            source: 'live-rune',
          };

          addTimer(runeTimer);

          toast.success('Timer automático iniciado!', {
            description: `Runa de Poder - próxima em ${runeInterval} min`,
          });

          lastRuneMinute.current = currentRuneMinute;
        }
      }
    }

    // 2. WARD PURCHASE COOLDOWN TIMER
    // Trigger when ward cooldown starts (cooldown > 0 and wasn't previously active)
    const wardCooldown = snapshot.map?.wardPurchaseCooldown || 0;

    if (wardCooldown > 0 && lastWardCooldownStart.current === 0) {
      // Ward cooldown just started
      const existingTimer = timers.find(
        (t) => t.active && t.source === 'live-ward'
      );

      if (!existingTimer) {
        const now = Date.now();
        const wardDuration = Math.ceil(wardCooldown); // Cooldown in seconds

        const wardTimer: Timer = {
          id: `auto-ward-${now}`,
          name: 'Ward Cooldown (Auto)',
          duration: wardDuration,
          startTime: now,
          endTime: now + wardDuration * 1000,
          active: true,
          automatic: true,
          source: 'live-ward',
        };

        addTimer(wardTimer);

        toast.info('Timer automático iniciado!', {
          description: `Ward disponível em ${wardDuration}s`,
        });
      }

      lastWardCooldownStart.current = wardCooldown;
    } else if (wardCooldown === 0) {
      // Reset tracking when cooldown finishes
      lastWardCooldownStart.current = 0;
    }

    // TODO: Add more event detectors:
    // - Roshan death (detect Aegis in inventory)
    // - Glyph usage (requires additional GSI data or building state)
    // - Scan cooldown (requires additional GSI data)
    // - Tormentor spawn (10:00, 20:00)
    // - Outpost (every 5 minutes)

  }, [snapshot, isInGame, addTimer, timers]);
}
