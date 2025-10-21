/**
 * Game Timers Manager - Automatic timer calculation for Dota 2 events
 *
 * All timers are calculated based on game time, not real time.
 * Events happen at fixed intervals throughout the game.
 */

export interface GameEvent {
  /** Event type identifier */
  type: 'power-rune' | 'water-rune' | 'bounty-rune' | 'tormentor' | 'outpost' | 'stack' | 'pull' | 'lotus';
  /** Display name */
  name: string;
  /** Game time when event spawns (in seconds) */
  spawnTime: number;
  /** Time remaining until spawn (in seconds) */
  timeRemaining: number;
  /** Duration to show timer (in seconds) */
  duration: number;
  /** Is this the next occurrence of this event? */
  isNext: boolean;
}

export interface TimerConfig {
  type: string;
  name: string;
  /** First spawn time (in seconds) */
  firstSpawn: number;
  /** Interval between spawns (in seconds) */
  interval: number;
  /** Pre-notification time (in seconds) - when to start showing timer */
  preNotify: number;
  /** Icon/emoji for display */
  icon?: string;
}

/**
 * Dota 2 Event Timings (all in seconds)
 */
export const DOTA_EVENTS: TimerConfig[] = [
  {
    type: 'bounty-rune',
    name: 'Runa de Bounty',
    firstSpawn: 0, // 0:00
    interval: 180, // Every 3 minutes
    preNotify: 30, // Show 30s before
    icon: '💰',
  },
  {
    type: 'power-rune',
    name: 'Runa de Poder',
    firstSpawn: 420, // 7:00
    interval: 420, // Every 7 minutes
    preNotify: 60, // Show 1min before
    icon: '⚡',
  },
  {
    type: 'water-rune',
    name: 'Runa de Água',
    firstSpawn: 120, // 2:00
    interval: 120, // Every 2 minutes
    preNotify: 30,
    icon: '💧',
  },
  {
    type: 'tormentor',
    name: 'Tormentor',
    firstSpawn: 1200, // 20:00
    interval: 600, // Every 10 minutes (20:00, 30:00, 40:00...)
    preNotify: 60,
    icon: '👹',
  },
  {
    type: 'lotus',
    name: 'Lotus Pool',
    firstSpawn: 420, // 7:00
    interval: 180, // Every 3 minutes
    preNotify: 30,
    icon: '🪷',
  },
  {
    type: 'outpost',
    name: 'Outpost XP',
    firstSpawn: 600, // 10:00 (first capture possible)
    interval: 300, // Every 5 minutes
    preNotify: 30,
    icon: '🏰',
  },
  {
    type: 'stack',
    name: 'Stack de Camp',
    firstSpawn: 53, // 0:53
    interval: 60, // Every minute (X:53)
    preNotify: 10, // Show 10s before
    icon: '🏕️',
  },
];

/**
 * Calculate next occurrence of an event
 */
export function getNextEventTime(
  config: TimerConfig,
  currentGameTime: number
): number {
  const { firstSpawn, interval } = config;

  // If before first spawn, return first spawn
  if (currentGameTime < firstSpawn) {
    return firstSpawn;
  }

  // Calculate how many intervals have passed
  const timeSinceFirst = currentGameTime - firstSpawn;
  const intervalsPassed = Math.floor(timeSinceFirst / interval);

  // Next spawn is after the current interval
  return firstSpawn + (intervalsPassed + 1) * interval;
}

/**
 * Calculate all active game events based on current game time
 * Returns events that should be shown (within preNotify window or recently spawned)
 */
export function getActiveGameEvents(currentGameTime: number): GameEvent[] {
  const events: GameEvent[] = [];

  for (const config of DOTA_EVENTS) {
    const nextSpawnTime = getNextEventTime(config, currentGameTime);
    const timeRemaining = nextSpawnTime - currentGameTime;

    // Show timer if:
    // 1. Within pre-notification window (e.g., 30s before spawn)
    // 2. Just spawned (0-5s after spawn)
    const shouldShow =
      timeRemaining <= config.preNotify && timeRemaining >= -5;

    if (shouldShow) {
      events.push({
        type: config.type as any,
        name: `${config.icon} ${config.name}`,
        spawnTime: nextSpawnTime,
        timeRemaining: Math.max(0, timeRemaining),
        duration: timeRemaining > 0 ? timeRemaining : 5, // Show for 5s after spawn
        isNext: true,
      });
    }
  }

  return events;
}

/**
 * Get all upcoming events (next 5 minutes)
 */
export function getUpcomingEvents(
  currentGameTime: number,
  windowSeconds: number = 300
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const config of DOTA_EVENTS) {
    const nextSpawnTime = getNextEventTime(config, currentGameTime);
    const timeRemaining = nextSpawnTime - currentGameTime;

    if (timeRemaining > 0 && timeRemaining <= windowSeconds) {
      events.push({
        type: config.type as any,
        name: `${config.icon} ${config.name}`,
        spawnTime: nextSpawnTime,
        timeRemaining,
        duration: timeRemaining,
        isNext: true,
      });
    }
  }

  // Sort by time remaining (soonest first)
  return events.sort((a, b) => a.timeRemaining - b.timeRemaining);
}

/**
 * Format game time to MM:SS
 */
export function formatGameTime(seconds: number): string {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.floor(Math.abs(seconds) % 60);
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate when to show a timer (considering pre-notification)
 */
export function shouldShowTimer(
  config: TimerConfig,
  currentGameTime: number
): boolean {
  const nextSpawnTime = getNextEventTime(config, currentGameTime);
  const timeRemaining = nextSpawnTime - currentGameTime;

  // Show if within pre-notify window or just spawned
  return timeRemaining <= config.preNotify && timeRemaining >= -5;
}
