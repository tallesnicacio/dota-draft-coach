import { useEffect, useRef } from 'react';
import { useLiveStore } from '@/store/liveStore';
import { useBuildStore } from '@/store/buildStore';
import { Hero } from '@/types/dota';

/**
 * useAutoPicks - Automatic hero detection from Live Mode
 *
 * Detects:
 * - Selected hero (player's hero)
 * - Ally heroes (from draft data)
 * - Enemy heroes (from draft data)
 *
 * Automatically populates BuildStore with detected heroes.
 *
 * Usage:
 * ```tsx
 * useAutoPicks(heroes); // heroes from API
 * ```
 */
export function useAutoPicks(allHeroes: Hero[]) {
  const snapshot = useLiveStore((state) => state.snapshot);
  const isInGame = useLiveStore((state) => state.status === 'connected');

  const setSelectedHero = useBuildStore((state) => state.setSelectedHero);
  const addAlly = useBuildStore((state) => state.addAlly);
  const addEnemy = useBuildStore((state) => state.addEnemy);
  const selectedHero = useBuildStore((state) => state.selectedHero);
  const allies = useBuildStore((state) => state.allies);
  const enemies = useBuildStore((state) => state.enemies);

  // Track what we've already detected to avoid re-adding
  const detectedHeroId = useRef<number | null>(null);
  const detectedAllyIds = useRef<Set<number>>(new Set());
  const detectedEnemyIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!isInGame || !snapshot) {
      // Reset when leaving game
      detectedHeroId.current = null;
      detectedAllyIds.current.clear();
      detectedEnemyIds.current.clear();
      return;
    }

    // 1. DETECT PLAYER'S HERO
    if (snapshot.hero && snapshot.hero.id) {
      const heroId = snapshot.hero.id;

      // Only update if different from current
      if (heroId !== detectedHeroId.current) {
        const hero = findHeroById(allHeroes, heroId);

        if (hero && (!selectedHero || selectedHero.id !== hero.id)) {
          console.log('[AutoPicks] Selected hero detected:', hero.displayName);
          setSelectedHero(hero);
          detectedHeroId.current = heroId;
        }
      }
    }

    // 2. DETECT ALLIES & ENEMIES from draftHints
    if (snapshot.draftHints) {
      const { allyHeroes, enemyHeroes } = snapshot.draftHints;

      // Add allies
      for (const heroId of allyHeroes) {
        if (!detectedAllyIds.current.has(heroId)) {
          const hero = findHeroById(allHeroes, heroId);

          if (hero && !allies.some((a) => a.id === hero.id)) {
            console.log('[AutoPicks] Ally detected:', hero.displayName);
            addAlly(hero);
            detectedAllyIds.current.add(heroId);
          }
        }
      }

      // Add enemies
      for (const heroId of enemyHeroes) {
        if (!detectedEnemyIds.current.has(heroId)) {
          const hero = findHeroById(allHeroes, heroId);

          if (hero && !enemies.some((e) => e.id === hero.id)) {
            console.log('[AutoPicks] Enemy detected:', hero.displayName);
            addEnemy(hero);
            detectedEnemyIds.current.add(heroId);
          }
        }
      }
    }
  }, [
    snapshot,
    isInGame,
    allHeroes,
    setSelectedHero,
    addAlly,
    addEnemy,
    selectedHero,
    allies,
    enemies,
  ]);
}

/**
 * Find hero by OpenDota hero ID
 * OpenDota IDs are numeric (1-150), our Hero.id is string
 */
function findHeroById(heroes: Hero[], odotaId: number): Hero | null {
  // OpenDota hero IDs are numeric, but our Hero.id is string
  // We need to match by the numeric ID in the hero data

  // Strategy: Convert OpenDota ID to hero internal name
  // Example: id 1 = npc_dota_hero_antimage
  // But we store Hero.id as string, so we need a mapping

  // For now, search by numeric ID in hero.id (if it's a number string)
  const hero = heroes.find((h) => parseInt(h.id) === odotaId);

  if (hero) {
    return hero;
  }

  // Fallback: Log and return null
  console.warn('[AutoPicks] Hero not found for ID:', odotaId);
  return null;
}
