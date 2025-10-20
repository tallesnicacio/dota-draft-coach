/**
 * Recommendation Fusion Service Tests
 */

import { describe, it, expect } from 'vitest';
import { mergeLiveWithRecommendations, calculateItemEfficiency } from '../recommendationFusion';
import type { HeroBuild, LiveSnapshot } from '@/types/dota';

describe('Recommendation Fusion', () => {
  const mockBaseBuild: HeroBuild = {
    hero: 'Templar Assassin',
    heroImage: 'ta.png',
    patch: '7.39e',
    mmrBucket: 'Ancient-Divine',
    coreBuild: {
      starting: ['Iron Branch', 'Tango'],
      early: ['Power Treads', 'Dragon Lance'],
      mid: ['Blink Dagger', 'Desolator'],
      situational: ['Black King Bar', 'Butterfly'],
    },
    skillOrder: {
      id: '1',
      name: 'ta_skills',
      sequence: ['Q', 'W', 'Q', 'E', 'Q', 'R', 'Q', 'E', 'E', 'E'],
      talents: [10, 15, 20, 25],
      image: 'ta.png',
      displayName: 'Templar Assassin',
    },
    matchups: {
      countersToMe: [],
      goodVs: [],
      synergies: [],
    },
    confidence: 0.8,
    sampleSize: 5000,
    lastUpdated: new Date().toISOString(),
  };

  describe('mergeLiveWithRecommendations', () => {
    it('should return base build when no live data', () => {
      const result = mergeLiveWithRecommendations(mockBaseBuild, null);

      expect(result).toBeDefined();
      expect(result.coreBuild.ownedItems).toEqual([]);
      expect(result.coreBuild.nextItem).toBeNull();
      expect(result.coreBuild.goldNeeded).toBe(0);
    });

    it('should identify owned items from live snapshot', () => {
      const liveSnapshot: LiveSnapshot = {
        t: Date.now(),
        matchId: 'match123',
        player: {
          steamId: '123',
          accountId: '456',
          name: 'TestPlayer',
          activity: 'playing',
          teamName: 'radiant',
          kills: 5,
          deaths: 2,
          assists: 8,
          lastHits: 100,
          denies: 10,
          gold: 1500,
          goldReliable: 500,
          goldUnreliable: 1000,
          gpm: 450,
          xpm: 550,
        },
        map: {
          clockTime: 600,
          gameTime: 580,
          daytime: true,
          gameState: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
          paused: false,
          winTeam: 'none',
          wardPurchaseCooldown: 0,
        },
        hero: {
          id: 46,
          name: 'npc_dota_hero_templar_assassin',
          displayName: 'Templar Assassin',
          level: 10,
          xp: 12000,
          alive: true,
          respawnSeconds: 0,
          buybackCost: 300,
          buybackCooldown: 0,
          health: 800,
          maxHealth: 1200,
          healthPercent: 0.67,
          mana: 400,
          maxMana: 600,
          manaPercent: 0.67,
          position: { x: 0, y: 0 },
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
        abilities: [
          { name: 'refraction', displayName: 'Refraction', level: 4, canCast: true, passive: false, abilityActive: false, cooldown: 0, ultimate: false },
          { name: 'meld', displayName: 'Meld', level: 2, canCast: true, passive: false, abilityActive: false, cooldown: 0, ultimate: false },
          { name: 'psi_blades', displayName: 'Psi Blades', level: 3, canCast: false, passive: true, abilityActive: false, cooldown: 0, ultimate: false },
          { name: 'psionic_trap', displayName: 'Psionic Trap', level: 1, canCast: true, passive: false, abilityActive: false, cooldown: 0, ultimate: true },
        ],
        items: [
          { name: 'power_treads', displayName: 'Power Treads', slot: 0, canCast: true, cooldown: 0, passive: false, charges: 0 },
          { name: 'blink', displayName: 'Blink Dagger', slot: 1, canCast: true, cooldown: 0, passive: false, charges: 0 },
        ],
        draftHints: {
          allies: [],
          enemies: [],
          hasHeavyMagic: true,
          hasHeavyPhysical: false,
          hasDisables: true,
          hasSilences: false,
          hasInvis: false,
          hasIllusions: false,
          hasSummons: false,
          needsBKB: true,
          needsDispel: false,
          needsDetection: false,
        },
      };

      const result = mergeLiveWithRecommendations(mockBaseBuild, liveSnapshot);

      expect(result.coreBuild.ownedItems).toContain('Power Treads');
      expect(result.coreBuild.ownedItems).toContain('Blink Dagger');
      expect(result.coreBuild.currentGold).toBe(1500);
    });

    it('should determine next item to buy', () => {
      const liveSnapshot: LiveSnapshot = {
        t: Date.now(),
        matchId: 'match123',
        player: {
          steamId: '123',
          accountId: '456',
          name: 'TestPlayer',
          activity: 'playing',
          teamName: 'radiant',
          kills: 5,
          deaths: 2,
          assists: 8,
          lastHits: 100,
          denies: 10,
          gold: 1500,
          goldReliable: 500,
          goldUnreliable: 1000,
          gpm: 450,
          xpm: 550,
        },
        map: {
          clockTime: 600,
          gameTime: 580,
          daytime: true,
          gameState: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
          paused: false,
          winTeam: 'none',
          wardPurchaseCooldown: 0,
        },
        hero: {
          id: 46,
          name: 'npc_dota_hero_templar_assassin',
          displayName: 'Templar Assassin',
          level: 10,
          xp: 12000,
          alive: true,
          respawnSeconds: 0,
          buybackCost: 300,
          buybackCooldown: 0,
          health: 800,
          maxHealth: 1200,
          healthPercent: 0.67,
          mana: 400,
          maxMana: 600,
          manaPercent: 0.67,
          position: { x: 0, y: 0 },
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
        items: [
          { name: 'power_treads', displayName: 'Power Treads', slot: 0, canCast: true, cooldown: 0, passive: false, charges: 0 },
        ],
        draftHints: null,
      };

      const result = mergeLiveWithRecommendations(mockBaseBuild, liveSnapshot);

      // Next item should be from early game (Dragon Lance)
      expect(result.coreBuild.nextItem).toBe('Dragon Lance');
    });

    it('should calculate gold needed for next item', () => {
      const liveSnapshot: LiveSnapshot = {
        t: Date.now(),
        matchId: 'match123',
        player: {
          steamId: '123',
          accountId: '456',
          name: 'TestPlayer',
          activity: 'playing',
          teamName: 'radiant',
          kills: 0,
          deaths: 0,
          assists: 0,
          lastHits: 0,
          denies: 0,
          gold: 500,
          goldReliable: 500,
          goldUnreliable: 0,
          gpm: 0,
          xpm: 0,
        },
        map: {
          clockTime: 0,
          gameTime: 0,
          daytime: true,
          gameState: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
          paused: false,
          winTeam: 'none',
          wardPurchaseCooldown: 0,
        },
        hero: {
          id: 46,
          name: 'npc_dota_hero_templar_assassin',
          displayName: 'Templar Assassin',
          level: 1,
          xp: 0,
          alive: true,
          respawnSeconds: 0,
          buybackCost: 0,
          buybackCooldown: 0,
          health: 600,
          maxHealth: 600,
          healthPercent: 1.0,
          mana: 300,
          maxMana: 300,
          manaPercent: 1.0,
          position: { x: 0, y: 0 },
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
            '10_left': false,
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

      const result = mergeLiveWithRecommendations(mockBaseBuild, liveSnapshot);

      // Should calculate gold needed for first item
      expect(result.coreBuild.currentGold).toBe(500);
      expect(result.coreBuild.goldNeeded).toBeGreaterThanOrEqual(0);
    });

    it('should extract current skill levels', () => {
      const liveSnapshot: LiveSnapshot = {
        t: Date.now(),
        matchId: 'match123',
        player: {
          steamId: '123',
          accountId: '456',
          name: 'TestPlayer',
          activity: 'playing',
          teamName: 'radiant',
          kills: 0,
          deaths: 0,
          assists: 0,
          lastHits: 0,
          denies: 0,
          gold: 500,
          goldReliable: 500,
          goldUnreliable: 0,
          gpm: 0,
          xpm: 0,
        },
        map: {
          clockTime: 0,
          gameTime: 0,
          daytime: true,
          gameState: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
          paused: false,
          winTeam: 'none',
          wardPurchaseCooldown: 0,
        },
        hero: {
          id: 46,
          name: 'npc_dota_hero_templar_assassin',
          displayName: 'Templar Assassin',
          level: 5,
          xp: 5000,
          alive: true,
          respawnSeconds: 0,
          buybackCost: 100,
          buybackCooldown: 0,
          health: 700,
          maxHealth: 800,
          healthPercent: 0.875,
          mana: 350,
          maxMana: 400,
          manaPercent: 0.875,
          position: { x: 0, y: 0 },
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
            '10_left': false,
            '10_right': false,
            '15_left': false,
            '15_right': false,
            '20_left': false,
            '20_right': false,
            '25_left': false,
            '25_right': false,
          },
        },
        abilities: [
          { name: 'refraction', displayName: 'Refraction', level: 2, canCast: true, passive: false, abilityActive: false, cooldown: 0, ultimate: false },
          { name: 'meld', displayName: 'Meld', level: 1, canCast: true, passive: false, abilityActive: false, cooldown: 0, ultimate: false },
          { name: 'psi_blades', displayName: 'Psi Blades', level: 1, canCast: false, passive: true, abilityActive: false, cooldown: 0, ultimate: false },
          { name: 'psionic_trap', displayName: 'Psionic Trap', level: 1, canCast: true, passive: false, abilityActive: false, cooldown: 0, ultimate: true },
        ],
        items: [],
        draftHints: null,
      };

      const result = mergeLiveWithRecommendations(mockBaseBuild, liveSnapshot);

      expect(result.currentSkillLevels).toBeDefined();
      expect(result.currentSkillLevels?.q).toBe(2);
      expect(result.currentSkillLevels?.w).toBe(1);
      expect(result.currentSkillLevels?.e).toBe(1);
      expect(result.currentSkillLevels?.r).toBe(1);
    });
  });

  describe('calculateItemEfficiency', () => {
    it('should return high score for BKB when needsBKB', () => {
      const liveSnapshot: LiveSnapshot = {
        t: Date.now(),
        matchId: null,
        player: null,
        map: null,
        hero: {
          id: 46,
          name: 'ta',
          displayName: 'TA',
          level: 10,
          xp: 10000,
          alive: true,
          respawnSeconds: 0,
          buybackCost: 200,
          buybackCooldown: 0,
          health: 800,
          maxHealth: 1000,
          healthPercent: 0.8,
          mana: 500,
          maxMana: 600,
          manaPercent: 0.83,
          position: { x: 0, y: 0 },
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
            '10_left': false,
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
        draftHints: {
          allies: [],
          enemies: [],
          hasHeavyMagic: true,
          hasHeavyPhysical: false,
          hasDisables: true,
          hasSilences: true,
          hasInvis: false,
          hasIllusions: false,
          hasSummons: false,
          needsBKB: true,
          needsDispel: false,
          needsDetection: false,
        },
      };

      const score = calculateItemEfficiency('Black King Bar', liveSnapshot);
      expect(score).toBe(1.0);
    });

    it('should return low score for BKB when not needed', () => {
      const liveSnapshot: LiveSnapshot = {
        t: Date.now(),
        matchId: null,
        player: null,
        map: null,
        hero: {
          id: 46,
          name: 'ta',
          displayName: 'TA',
          level: 10,
          xp: 10000,
          alive: true,
          respawnSeconds: 0,
          buybackCost: 200,
          buybackCooldown: 0,
          health: 800,
          maxHealth: 1000,
          healthPercent: 0.8,
          mana: 500,
          maxMana: 600,
          manaPercent: 0.83,
          position: { x: 0, y: 0 },
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
            '10_left': false,
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
        draftHints: {
          allies: [],
          enemies: [],
          hasHeavyMagic: false,
          hasHeavyPhysical: true,
          hasDisables: false,
          hasSilences: false,
          hasInvis: false,
          hasIllusions: false,
          hasSummons: false,
          needsBKB: false,
          needsDispel: false,
          needsDetection: false,
        },
      };

      const score = calculateItemEfficiency('Black King Bar', liveSnapshot);
      expect(score).toBe(0.3);
    });
  });
});
