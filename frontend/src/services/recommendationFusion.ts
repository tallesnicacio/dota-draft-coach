/**
 * Recommendation Fusion Service
 *
 * Combines live game state with OpenDota recommendations to provide
 * context-aware item and skill suggestions.
 *
 * Key features:
 * - Highlight items already owned
 * - Calculate gold needed for next item
 * - Elevate item priorities based on game context
 * - Track skill build progress
 */

import type { HeroBuild, LiveSnapshot, ItemBuild } from '@/types/dota';
import { getItemInfo } from '@/constants/items';

export interface EnhancedItemBuild extends ItemBuild {
  /** Items the player currently owns */
  ownedItems: string[];
  /** Next recommended item to purchase */
  nextItem: string | null;
  /** Gold needed for next item */
  goldNeeded: number;
  /** Current gold available */
  currentGold: number;
}

export interface EnhancedBuild extends Omit<HeroBuild, 'coreBuild'> {
  coreBuild: EnhancedItemBuild;
  /** Current skill levels from live game */
  currentSkillLevels?: {
    q: number;
    w: number;
    e: number;
    r: number;
  };
  /** Recommended next skill to level */
  nextSkill?: string;
}

/**
 * Merges live game snapshot with static recommendations
 */
export function mergeLiveWithRecommendations(
  baseBuild: HeroBuild,
  liveSnapshot: LiveSnapshot | null
): EnhancedBuild {
  if (!liveSnapshot || !liveSnapshot.player || !liveSnapshot.hero) {
    // No live data - return base build with enhancements structure
    return {
      ...baseBuild,
      coreBuild: {
        ...baseBuild.coreBuild,
        ownedItems: [],
        nextItem: null,
        goldNeeded: 0,
        currentGold: 0,
      },
    };
  }

  // Extract owned items from live snapshot
  const ownedItemNames = liveSnapshot.items.map(item => item.displayName);

  // Combine all recommended items in priority order
  const allRecommendedItems = [
    ...baseBuild.coreBuild.early,
    ...baseBuild.coreBuild.mid,
    ...baseBuild.coreBuild.situational,
  ];

  // Find next item to buy (first recommended item not owned)
  const nextItem = allRecommendedItems.find(
    itemName => !ownedItemNames.includes(itemName)
  ) || null;

  // Calculate gold needed
  const currentGold = liveSnapshot.player.gold;
  let goldNeeded = 0;

  if (nextItem) {
    const itemInfo = getItemInfo(nextItem);
    if (itemInfo.cost) {
      goldNeeded = Math.max(0, itemInfo.cost - currentGold);
    }
  }

  // Adjust item priorities based on live context
  const enhancedCoreBuild = adjustItemPriorities(
    baseBuild.coreBuild,
    liveSnapshot
  );

  // Extract current skill levels
  const currentSkillLevels = extractSkillLevels(liveSnapshot);

  // Determine next skill to level
  const nextSkill = determineNextSkill(
    baseBuild.skillOrder.sequence,
    liveSnapshot.hero.level,
    currentSkillLevels
  );

  return {
    ...baseBuild,
    coreBuild: {
      ...enhancedCoreBuild,
      ownedItems: ownedItemNames,
      nextItem,
      goldNeeded,
      currentGold,
    },
    currentSkillLevels,
    nextSkill,
  };
}

/**
 * Adjusts item priorities based on live game context
 */
function adjustItemPriorities(
  coreBuild: ItemBuild,
  liveSnapshot: LiveSnapshot
): ItemBuild {
  const { draftHints, hero } = liveSnapshot;

  if (!draftHints || !hero) {
    return coreBuild;
  }

  // Create a copy to avoid mutations
  const adjusted = { ...coreBuild };

  // Priority boosts based on game context
  const priorityItems: { item: string; condition: boolean }[] = [
    { item: 'Black King Bar', condition: draftHints.needsBKB },
    { item: 'Lotus Orb', condition: draftHints.needsDispel },
    { item: 'Manta Style', condition: draftHints.needsDispel },
    { item: 'Gem of True Sight', condition: draftHints.needsDetection },
    { item: 'Dust of Appearance', condition: draftHints.needsDetection },
    { item: 'Sentry Ward', condition: draftHints.needsDetection },
    { item: 'Heart of Tarrasque', condition: hero.healthPercent < 0.4 },
    { item: 'Satanic', condition: hero.healthPercent < 0.4 },
    { item: 'Arcane Boots', condition: hero.manaPercent < 0.3 },
    { item: 'Soul Ring', condition: hero.manaPercent < 0.3 },
  ];

  // Move priority items to situational if not already there
  priorityItems.forEach(({ item, condition }) => {
    if (condition && !adjusted.situational.includes(item)) {
      // Only add if it's not in any other category
      const inOtherCategory = [
        ...adjusted.starting,
        ...adjusted.early,
        ...adjusted.mid,
      ].includes(item);

      if (!inOtherCategory) {
        adjusted.situational = [item, ...adjusted.situational];
      }
    }
  });

  return adjusted;
}

/**
 * Extracts current skill levels from live abilities
 */
function extractSkillLevels(liveSnapshot: LiveSnapshot): {
  q: number;
  w: number;
  e: number;
  r: number;
} {
  const { abilities } = liveSnapshot;

  if (!abilities || abilities.length === 0) {
    return { q: 0, w: 0, e: 0, r: 0 };
  }

  // Map abilities to QWER
  const skillMap: { [key: string]: number } = { q: 0, w: 0, e: 0, r: 0 };

  abilities.forEach((ability, index) => {
    if (index < 4) {
      // First 4 abilities map to QWER
      const key = ['q', 'w', 'e', 'r'][index];
      skillMap[key] = ability.level;
    }
  });

  return skillMap as { q: number; w: number; e: number; r: number };
}

/**
 * Determines next skill to level based on recommended sequence and current level
 */
function determineNextSkill(
  sequence: string[],
  heroLevel: number,
  currentLevels: { q: number; w: number; e: number; r: number }
): string | null {
  if (heroLevel >= sequence.length) {
    return null; // Max level reached
  }

  // Next skill according to build
  const nextSkillInSequence = sequence[heroLevel]?.toLowerCase();

  if (!nextSkillInSequence) {
    return null;
  }

  // Check if we're following the build
  const totalSkillPoints =
    currentLevels.q + currentLevels.w + currentLevels.e + currentLevels.r;

  if (totalSkillPoints < heroLevel) {
    // Have unspent skill points
    return nextSkillInSequence.toUpperCase();
  }

  return null;
}

/**
 * Calculates item efficiency score based on game state
 * Used for sorting situational items by relevance
 */
export function calculateItemEfficiency(
  itemName: string,
  liveSnapshot: LiveSnapshot | null
): number {
  if (!liveSnapshot?.draftHints || !liveSnapshot.hero) {
    return 0.5; // Neutral score
  }

  const { draftHints, hero } = liveSnapshot;
  let score = 0.5; // Base score

  // Item-specific scoring
  const scoringRules: { [key: string]: () => number } = {
    'Black King Bar': () => draftHints.needsBKB ? 1.0 : 0.3,
    'Lotus Orb': () => draftHints.needsDispel ? 0.9 : 0.4,
    'Manta Style': () => draftHints.needsDispel || draftHints.hasDisables ? 0.9 : 0.5,
    'Gem of True Sight': () => draftHints.needsDetection ? 1.0 : 0.2,
    'Heart of Tarrasque': () => hero.healthPercent < 0.5 ? 0.9 : 0.6,
    'Satanic': () => hero.healthPercent < 0.5 ? 0.95 : 0.6,
    'Blade Mail': () => draftHints.hasHeavyPhysical ? 0.8 : 0.5,
    'Assault Cuirass': () => draftHints.hasHeavyPhysical ? 0.85 : 0.6,
    'Pipe of Insight': () => draftHints.hasHeavyMagic ? 0.9 : 0.5,
    'Hood of Defiance': () => draftHints.hasHeavyMagic ? 0.8 : 0.4,
  };

  const rule = scoringRules[itemName];
  if (rule) {
    score = rule();
  }

  return score;
}
