import { create } from 'zustand';
import { Hero, HeroBuild, MMRBucket, Patch } from '@/types/dota';

interface BuildState {
  selectedHero: Hero | null;
  allies: Hero[];
  enemies: Hero[];
  currentBuild: HeroBuild | null;
  patch: Patch;
  mmrBucket: MMRBucket;
  
  setSelectedHero: (hero: Hero | null) => void;
  addAlly: (hero: Hero) => void;
  removeAlly: (heroId: string) => void;
  addEnemy: (hero: Hero) => void;
  removeEnemy: (heroId: string) => void;
  setPatch: (patch: Patch) => void;
  setMMRBucket: (mmr: MMRBucket) => void;
  setCurrentBuild: (build: HeroBuild | null) => void;
  clearDraft: () => void;
}

export const useBuildStore = create<BuildState>((set) => ({
  selectedHero: null,
  allies: [],
  enemies: [],
  currentBuild: null,
  patch: '7.39e',
  mmrBucket: 'Ancient-Divine',
  
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
}));
