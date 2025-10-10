import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Hero, HeroBuild, MMRBucket, Patch, Timer } from '@/types/dota';

interface BuildState {
  selectedHero: Hero | null;
  allies: Hero[];
  enemies: Hero[];
  currentBuild: HeroBuild | null;
  patch: Patch;
  mmrBucket: MMRBucket;
  timers: Timer[];

  setSelectedHero: (hero: Hero | null) => void;
  addAlly: (hero: Hero) => void;
  removeAlly: (heroId: string) => void;
  addEnemy: (hero: Hero) => void;
  removeEnemy: (heroId: string) => void;
  setPatch: (patch: Patch) => void;
  setMMRBucket: (mmr: MMRBucket) => void;
  setCurrentBuild: (build: HeroBuild | null) => void;
  clearDraft: () => void;
  addTimer: (timer: Timer) => void;
  removeTimer: (timerId: string) => void;
  updateTimer: (timerId: string, updates: Partial<Timer>) => void;
}

export const useBuildStore = create<BuildState>()(
  persist(
    (set) => ({
      selectedHero: null,
      allies: [],
      enemies: [],
      currentBuild: null,
      patch: '7.39e',
      mmrBucket: 'Ancient-Divine',
      timers: [],

  setSelectedHero: (hero) => set({ selectedHero: hero }),

  addAlly: (hero) => set((state) => {
    if (state.allies.length >= 4) return state;
    if (state.allies.some(h => h.id === hero.id)) return state;
    return { allies: [...state.allies, hero] };
  }),

  removeAlly: (heroId) => set((state) => ({
    allies: state.allies.filter(h => h.id !== heroId)
  })),

  addEnemy: (hero) => set((state) => {
    if (state.enemies.length >= 5) return state;
    if (state.enemies.some(h => h.id === hero.id)) return state;
    return { enemies: [...state.enemies, hero] };
  }),

  removeEnemy: (heroId) => set((state) => ({
    enemies: state.enemies.filter(h => h.id !== heroId)
  })),

  setPatch: (patch) => set({ patch }),
  setMMRBucket: (mmr) => set({ mmrBucket: mmr }),
  setCurrentBuild: (build) => set({ currentBuild: build }),

  clearDraft: () => set({ allies: [], enemies: [] }),

  addTimer: (timer) => set((state) => ({
    timers: [...state.timers, timer]
  })),

  removeTimer: (timerId) => set((state) => ({
    timers: state.timers.filter(t => t.id !== timerId)
  })),

  updateTimer: (timerId, updates) => set((state) => ({
    timers: state.timers.map(t =>
      t.id === timerId ? { ...t, ...updates } : t
    )
  })),
    }),
    {
      name: 'dota2-coach-storage', // Nome da chave no localStorage
      partialize: (state) => ({
        // Persistir apenas timers, patch e mmrBucket
        // Não persistir selectedHero, allies, enemies, currentBuild
        timers: state.timers,
        patch: state.patch,
        mmrBucket: state.mmrBucket,
      }),
    }
  )
);
