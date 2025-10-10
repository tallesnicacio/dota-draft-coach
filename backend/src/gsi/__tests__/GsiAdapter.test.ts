/**
 * Unit tests for GsiAdapter
 */

import { describe, it, expect } from 'vitest';
import { GsiAdapter } from '../GsiAdapter.js';
import { AuthError, ValidationError } from '../types.js';
import type { GsiPayload } from '../types.js';

// Load fixtures
import heartbeatFixture from '../__fixtures__/gsi-heartbeat.json';
import fullPayloadFixture from '../__fixtures__/gsi-payload-full.json';
import emptySlotsFixture from '../__fixtures__/gsi-empty-slots.json';

describe('GsiAdapter', () => {
  describe('normalize()', () => {
    it('should normalize minimal heartbeat payload', () => {
      const result = GsiAdapter.normalize(heartbeatFixture as GsiPayload);

      expect(result.t).toBe(1696950000000); // timestamp in ms
      expect(result.matchId).toBeNull();
      expect(result.player).toBeNull();
      expect(result.map).toBeNull();
      expect(result.hero).toBeNull();
      expect(result.abilities).toEqual([]);
      expect(result.items).toEqual([]);
      expect(result.draftHints).toBeNull();
    });

    it('should normalize full in-game payload', () => {
      const result = GsiAdapter.normalize(fullPayloadFixture as GsiPayload);

      // Timestamp
      expect(result.t).toBe(1696950123000);

      // Match ID
      expect(result.matchId).toBe('7890123456');

      // Player
      expect(result.player).toBeDefined();
      expect(result.player?.steamId).toBe('76561198012345678');
      expect(result.player?.gold).toBe(2450);
      expect(result.player?.kills).toBe(5);

      // Map
      expect(result.map).toBeDefined();
      expect(result.map?.clockTime).toBe(754);
      expect(result.map?.daytime).toBe(true);

      // Hero
      expect(result.hero).toBeDefined();
      expect(result.hero?.id).toBe(46);
      expect(result.hero?.name).toBe('templar_assassin'); // prefix removed
      expect(result.hero?.level).toBe(12);

      // Abilities (should filter out empty)
      expect(result.abilities).toBeDefined();
      expect(result.abilities.length).toBeGreaterThan(0);
      // Note: plus_high_five counts as ability4, so we get 5 abilities total

      // Items (5 inventory + 1 stash + 1 tp + 1 neutral = 8)
      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(8);

      // Draft hints
      // Player is radiant (team2), which has picks [1, 5]
      // Enemy is dire (team3), which has picks [46, 93]
      expect(result.draftHints).toBeDefined();
      expect(result.draftHints?.allyHeroes).toContain(1);
      expect(result.draftHints?.allyHeroes).toContain(5);
      expect(result.draftHints?.enemyHeroes).toContain(46);
      expect(result.draftHints?.enemyHeroes).toContain(93);
    });

    it('should convert timestamps from seconds to milliseconds', () => {
      const payload = {
        ...heartbeatFixture,
        provider: {
          ...heartbeatFixture.provider,
          timestamp: 1696950000,
        },
      } as GsiPayload;

      const result = GsiAdapter.normalize(payload);
      expect(result.t).toBe(1696950000000);
    });

    it('should remove npc_dota_hero_ prefix from hero name', () => {
      const result = GsiAdapter.normalize(fullPayloadFixture as GsiPayload);
      expect(result.hero?.name).toBe('templar_assassin');
      expect(result.hero?.name).not.toContain('npc_dota_hero_');
    });

    it('should remove item_ prefix from item names', () => {
      const result = GsiAdapter.normalize(fullPayloadFixture as GsiPayload);

      const blink = result.items.find((i) => i.name === 'blink');
      expect(blink).toBeDefined();
      expect(blink?.name).not.toContain('item_');

      const bkb = result.items.find((i) => i.name === 'black_king_bar');
      expect(bkb).toBeDefined();
      expect(bkb?.name).not.toContain('item_');
    });

    it('should handle empty items gracefully', () => {
      const result = GsiAdapter.normalize(emptySlotsFixture as GsiPayload);

      // Should only have 1 item (tpscroll in slot2)
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('tpscroll');
      expect(result.items[0].slot).toBe(2);
      expect(result.items[0].location).toBe('inventory');
    });

    it('should throw AuthError if auth token is missing', () => {
      const payload = {
        provider: { name: 'Dota 2', appid: 570, version: 53, timestamp: 1696950000 },
      } as GsiPayload;

      expect(() => GsiAdapter.normalize(payload)).toThrow(AuthError);
    });

    it('should throw AuthError if token does not match', () => {
      const payload = {
        ...heartbeatFixture,
        auth: { token: 'WRONG_TOKEN' },
      } as GsiPayload;

      expect(() => GsiAdapter.normalize(payload, 'EXPECTED_TOKEN')).toThrow(AuthError);
    });

    it('should throw ValidationError if provider is missing', () => {
      const payload = {
        auth: { token: 'TEST_TOKEN' },
      } as any;

      expect(() => GsiAdapter.normalize(payload)).toThrow(ValidationError);
    });

    it('should throw ValidationError if appid is not 570', () => {
      const payload = {
        auth: { token: 'TEST_TOKEN' },
        provider: {
          name: 'Not Dota',
          appid: 999,
          version: 1,
          timestamp: 1696950000,
        },
      } as GsiPayload;

      expect(() => GsiAdapter.normalize(payload)).toThrow(ValidationError);
      expect(() => GsiAdapter.normalize(payload)).toThrow(/Invalid appid/);
    });

    it('should map item locations correctly', () => {
      const result = GsiAdapter.normalize(fullPayloadFixture as GsiPayload);

      const inventoryItems = result.items.filter((i) => i.location === 'inventory');
      const stashItems = result.items.filter((i) => i.location === 'stash');
      const teleportItems = result.items.filter((i) => i.location === 'teleport');
      const neutralItems = result.items.filter((i) => i.location === 'neutral');

      expect(inventoryItems.length).toBe(5);
      expect(stashItems.length).toBe(1);
      expect(teleportItems.length).toBe(1);
      expect(neutralItems.length).toBe(1);
    });

    it('should map hero talents correctly', () => {
      const result = GsiAdapter.normalize(fullPayloadFixture as GsiPayload);

      expect(result.hero?.talents).toBeDefined();
      expect(result.hero?.talents['10_left']).toBe(false);
      expect(result.hero?.talents['15_left']).toBe(true); // talent_3 = true
    });

    it('should map hero statuses correctly', () => {
      const result = GsiAdapter.normalize(fullPayloadFixture as GsiPayload);

      expect(result.hero?.statuses).toBeDefined();
      expect(result.hero?.statuses.silenced).toBe(false);
      expect(result.hero?.statuses.stunned).toBe(false);
      expect(result.hero?.statuses.magicImmune).toBe(false);
    });
  });

  describe('computeSnapshotHash()', () => {
    it('should compute consistent hash for same snapshot', () => {
      const snapshot = GsiAdapter.normalize(fullPayloadFixture as GsiPayload);

      const hash1 = GsiAdapter.computeSnapshotHash(snapshot);
      const hash2 = GsiAdapter.computeSnapshotHash(snapshot);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
    });

    it('should compute different hash for different snapshots', () => {
      const snapshot1 = GsiAdapter.normalize(heartbeatFixture as GsiPayload);
      const snapshot2 = GsiAdapter.normalize(fullPayloadFixture as GsiPayload);

      const hash1 = GsiAdapter.computeSnapshotHash(snapshot1);
      const hash2 = GsiAdapter.computeSnapshotHash(snapshot2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('isHeartbeat()', () => {
    it('should return true for heartbeat payload', () => {
      expect(GsiAdapter.isHeartbeat(heartbeatFixture as GsiPayload)).toBe(true);
    });

    it('should return false for in-game payload', () => {
      expect(GsiAdapter.isHeartbeat(fullPayloadFixture as GsiPayload)).toBe(false);
    });
  });

  describe('normalizeAbilities()', () => {
    it('should filter out empty abilities', () => {
      const result = GsiAdapter.normalize(emptySlotsFixture as GsiPayload);

      // Should only have abilities that are not empty
      const emptyAbilities = result.abilities.filter((a) => a.name === 'empty');
      expect(emptyAbilities).toHaveLength(0);
    });

    it('should include ultimate flag', () => {
      const result = GsiAdapter.normalize(fullPayloadFixture as GsiPayload);

      const ultimate = result.abilities.find((a) => a.ultimate);
      expect(ultimate).toBeDefined();
      expect(ultimate?.name).toBe('templar_assassin_trap');
    });

    it('should include cooldown information', () => {
      const result = GsiAdapter.normalize(fullPayloadFixture as GsiPayload);

      const meld = result.abilities.find((a) => a.name === 'templar_assassin_meld');
      expect(meld).toBeDefined();
      expect(meld?.cooldown).toBe(3);
    });
  });

  describe('draft hints calculation', () => {
    it('should extract ally and enemy heroes', () => {
      const result = GsiAdapter.normalize(fullPayloadFixture as GsiPayload);

      // Player is radiant (team2 = [1, 5]), enemy is dire (team3 = [46, 93])
      expect(result.draftHints?.allyHeroes).toEqual([1, 5]);
      expect(result.draftHints?.enemyHeroes).toEqual([46, 93]);
    });

    it('should filter out zero hero IDs', () => {
      const result = GsiAdapter.normalize(fullPayloadFixture as GsiPayload);

      // Draft has pick2_id: 0 which should be filtered
      expect(result.draftHints?.allyHeroes).not.toContain(0);
      expect(result.draftHints?.enemyHeroes).not.toContain(0);
    });
  });
});
