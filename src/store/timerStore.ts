import { create } from 'zustand';
import { GameTimer, NotificationSettings, RoshanTimer } from '@/types/timers';

interface TimerState {
  gameStartTime: number | null;
  currentTime: number;
  isRunning: boolean;
  timers: GameTimer[];
  notificationSettings: NotificationSettings;
  roshanTimer: RoshanTimer;
  
  // Actions
  startGame: () => void;
  pauseGame: () => void;
  resetGame: () => void;
  updateCurrentTime: (time: number) => void;
  toggleTimer: (id: string) => void;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  setRoshanDeath: (deathTime: number) => void;
  clearRoshanTimer: () => void;
}

const createInitialTimers = (): GameTimer[] => [
  // Power Runes (spawnam no 6:00, depois a cada 2 minutos)
  { id: 'power_rune', type: 'power_rune', label: 'Power Rune', nextSpawn: 360, interval: 120, enabled: true, notifyBefore: 30, category: 'runes' },
  
  // Water Runes (spawnam no 2:00, depois a cada 2 minutos)
  { id: 'water_rune', type: 'water_rune', label: 'Water Rune', nextSpawn: 120, interval: 120, enabled: true, notifyBefore: 30, category: 'runes' },
  
  // Wisdom Runes (spawnam no 7:00, depois a cada 7 minutos)
  { id: 'wisdom_rune', type: 'wisdom_rune', label: 'Wisdom Rune', nextSpawn: 420, interval: 420, enabled: true, notifyBefore: 30, category: 'runes' },
  
  // Neutral Items (tiers)
  { id: 'neutral_t1', type: 'neutral_items', label: 'Neutral Tier 1', nextSpawn: 420, enabled: true, notifyBefore: 60, category: 'neutral' },
  { id: 'neutral_t2', type: 'neutral_items', label: 'Neutral Tier 2', nextSpawn: 1020, enabled: true, notifyBefore: 60, category: 'neutral' },
  { id: 'neutral_t3', type: 'neutral_items', label: 'Neutral Tier 3', nextSpawn: 1620, enabled: true, notifyBefore: 60, category: 'neutral' },
  { id: 'neutral_t4', type: 'neutral_items', label: 'Neutral Tier 4', nextSpawn: 2220, enabled: true, notifyBefore: 60, category: 'neutral' },
  { id: 'neutral_t5', type: 'neutral_items', label: 'Neutral Tier 5', nextSpawn: 3600, enabled: true, notifyBefore: 60, category: 'neutral' },
  
  // Tormentor (spawn no 20:00, depois a cada 10 minutos)
  { id: 'tormentor', type: 'tormentor', label: 'Tormentor', nextSpawn: 1200, interval: 600, enabled: true, notifyBefore: 60, category: 'objectives' },
  
  // Stack timing (a cada minuto em X:53)
  { id: 'stack', type: 'stack', label: 'Stack Timing', nextSpawn: 53, interval: 60, enabled: true, notifyBefore: 5, category: 'farming' },
  
  // Pull timing (X:15 e X:45)
  { id: 'pull', type: 'pull', label: 'Pull Timing', nextSpawn: 15, interval: 30, enabled: true, notifyBefore: 3, category: 'farming' },
  
  // Day/Night cycle (dia começa em 0:00, noite em 5:00, depois ciclos de 5 min)
  { id: 'day_night', type: 'day_night', label: 'Ciclo Dia/Noite', nextSpawn: 300, interval: 300, enabled: true, notifyBefore: 10, category: 'cycle' },
];

export const useTimerStore = create<TimerState>((set, get) => ({
  gameStartTime: null,
  currentTime: 0,
  isRunning: false,
  timers: createInitialTimers(),
  notificationSettings: {
    enabled: true,
    sound: true,
    vibrate: true,
    advanceWarning: 30,
  },
  roshanTimer: {
    deathTime: null,
    minRespawn: null,
    maxRespawn: null,
    aegisExpiry: null,
  },
  
  startGame: () => {
    const now = Date.now();
    set({ 
      gameStartTime: now, 
      isRunning: true,
      timers: createInitialTimers(),
      roshanTimer: {
        deathTime: null,
        minRespawn: null,
        maxRespawn: null,
        aegisExpiry: null,
      }
    });
  },
  
  pauseGame: () => set({ isRunning: false }),
  
  resetGame: () => set({ 
    gameStartTime: null, 
    currentTime: 0, 
    isRunning: false,
    timers: createInitialTimers(),
    roshanTimer: {
      deathTime: null,
      minRespawn: null,
      maxRespawn: null,
      aegisExpiry: null,
    }
  }),
  
  updateCurrentTime: (time) => set({ currentTime: time }),
  
  toggleTimer: (id) => set((state) => ({
    timers: state.timers.map(timer => 
      timer.id === id ? { ...timer, enabled: !timer.enabled } : timer
    )
  })),
  
  setNotificationSettings: (settings) => set((state) => ({
    notificationSettings: { ...state.notificationSettings, ...settings }
  })),
  
  setRoshanDeath: (deathTime) => set({
    roshanTimer: {
      deathTime,
      minRespawn: deathTime + 480, // 8 minutos
      maxRespawn: deathTime + 660, // 11 minutos
      aegisExpiry: deathTime + 300, // 5 minutos
    }
  }),
  
  clearRoshanTimer: () => set({
    roshanTimer: {
      deathTime: null,
      minRespawn: null,
      maxRespawn: null,
      aegisExpiry: null,
    }
  }),
}));
