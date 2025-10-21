/**
 * GsiAdapter - Normalizes Dota 2 GSI payloads to internal LiveSnapshot format
 *
 * This adapter:
 * - Validates GSI payloads
 * - Removes Dota-specific prefixes (npc_dota_hero_, item_)
 * - Converts timestamps (seconds → milliseconds)
 * - Maps slot-based data to arrays
 * - Calculates draft hints for recommendations
 */

import crypto from 'crypto';
import type {
  GsiPayload,
  LiveSnapshot,
  LivePlayer,
  LiveMap,
  LiveHero,
  LiveAbility,
  LiveItem,
  DraftHints,
  GsiAbility,
  GsiItem,
} from './types.js';
import { AuthError, ValidationError } from './types.js';

export class GsiAdapter {
  /**
   * Normalize a GSI payload to LiveSnapshot format
   * @throws {AuthError} if auth token is missing
   * @throws {ValidationError} if payload is invalid
   */
  static normalize(payload: GsiPayload, expectedToken?: string): LiveSnapshot {
    // Validate auth token (allow empty token in dev mode)
    if (payload.auth?.token === undefined) {
      throw new AuthError('Missing auth field');
    }

    if (expectedToken && expectedToken !== '' && payload.auth.token !== expectedToken) {
      throw new AuthError('Invalid auth token');
    }

    // Validate provider
    if (!payload.provider) {
      throw new ValidationError('Missing provider field');
    }

    if (payload.provider.appid !== 570) {
      throw new ValidationError(`Invalid appid: expected 570 (Dota 2), got ${payload.provider.appid}`);
    }

    // Convert timestamp to milliseconds
    const timestamp = payload.provider.timestamp * 1000;

    // Build snapshot
    const snapshot: LiveSnapshot = {
      t: timestamp,
      matchId: payload.map?.matchid || null,
      player: payload.player ? this.normalizePlayer(payload.player) : null,
      map: payload.map ? this.normalizeMap(payload.map) : null,
      hero: payload.hero ? this.normalizeHero(payload.hero) : null,
      abilities: payload.abilities ? this.normalizeAbilities(payload.abilities) : [],
      items: payload.items ? this.normalizeItems(payload.items) : [],
      draftHints: null, // Will be calculated below if draft data exists
    };

    // Calculate draft hints if we have draft data
    if (payload.draft && payload.player?.team_name) {
      snapshot.draftHints = this.calculateDraftHints(payload.draft, payload.player.team_name);
    }

    return snapshot;
  }

  /**
   * Normalize player data
   */
  private static normalizePlayer(player: NonNullable<GsiPayload['player']>): LivePlayer {
    return {
      steamId: player.steamid || '',
      accountId: player.accountid || '',
      name: player.name || '',
      activity: player.activity || 'unknown',
      teamName: player.team_name || 'radiant',
      kills: player.kills || 0,
      deaths: player.deaths || 0,
      assists: player.assists || 0,
      lastHits: player.last_hits || 0,
      denies: player.denies || 0,
      gold: player.gold || 0,
      goldReliable: player.gold_reliable || 0,
      goldUnreliable: player.gold_unreliable || 0,
      gpm: player.gpm || 0,
      xpm: player.xpm || 0,
    };
  }

  /**
   * Normalize map data
   */
  private static normalizeMap(map: NonNullable<GsiPayload['map']>): LiveMap {
    return {
      clockTime: map.clock_time || 0,
      gameTime: map.game_time || 0,
      daytime: map.daytime ?? true,
      gameState: map.game_state || 'DOTA_GAMERULES_STATE_INIT',
      paused: map.paused ?? false,
      winTeam: this.normalizeWinTeam(map.win_team),
      wardPurchaseCooldown: map.ward_purchase_cooldown || 0,
    };
  }

  /**
   * Normalize win_team field
   */
  private static normalizeWinTeam(winTeam?: string): 'none' | 'radiant' | 'dire' {
    if (winTeam === 'radiant' || winTeam === 'dire') {
      return winTeam;
    }
    return 'none';
  }

  /**
   * Normalize hero data
   */
  private static normalizeHero(hero: NonNullable<GsiPayload['hero']>): LiveHero {
    return {
      id: hero.id || 0,
      name: this.removeHeroPrefix(hero.name || ''),
      displayName: this.getHeroDisplayName(hero.id || 0),
      level: hero.level || 1,
      xp: hero.xp || 0,
      alive: hero.alive ?? true,
      respawnSeconds: hero.respawn_seconds || 0,
      buybackCost: hero.buyback_cost || 0,
      buybackCooldown: hero.buyback_cooldown || 0,
      health: hero.health || 0,
      maxHealth: hero.max_health || 0,
      healthPercent: hero.health_percent || 0,
      mana: hero.mana || 0,
      maxMana: hero.max_mana || 0,
      manaPercent: hero.mana_percent || 0,
      position: {
        x: hero.xpos || 0,
        y: hero.ypos || 0,
      },
      statuses: {
        silenced: hero.silenced ?? false,
        stunned: hero.stunned ?? false,
        disarmed: hero.disarmed ?? false,
        magicImmune: hero.magicimmune ?? false,
        hexed: hero.hexed ?? false,
        muted: hero.muted ?? false,
        broken: hero.break ?? false,
        smoked: hero.smoked ?? false,
        hasDebuff: hero.has_debuff ?? false,
      },
      talents: {
        '10_left': hero.talent_1 ?? false,
        '10_right': hero.talent_2 ?? false,
        '15_left': hero.talent_3 ?? false,
        '15_right': hero.talent_4 ?? false,
        '20_left': hero.talent_5 ?? false,
        '20_right': hero.talent_6 ?? false,
        '25_left': hero.talent_7 ?? false,
        '25_right': hero.talent_8 ?? false,
      },
    };
  }

  /**
   * Remove "npc_dota_hero_" prefix from hero name
   */
  private static removeHeroPrefix(name: string): string {
    return name.replace(/^npc_dota_hero_/, '');
  }

  /**
   * Get display name from hero ID
   * TODO: Import hero constants for proper mapping
   */
  private static getHeroDisplayName(heroId: number): string {
    // For now, return a placeholder
    // In future phases, we'll import hero constants
    return `Hero ${heroId}`;
  }

  /**
   * Normalize abilities from slot-based to array format
   */
  private static normalizeAbilities(abilities: Record<string, GsiAbility>): LiveAbility[] {
    const result: LiveAbility[] = [];

    // Extract ability0-ability5
    for (let i = 0; i <= 5; i++) {
      const key = `ability${i}`;
      const ability = abilities[key];

      if (!ability || ability.name === 'empty') {
        continue;
      }

      result.push({
        slot: i,
        id: this.getAbilityId(ability.name), // Placeholder for now
        name: ability.name,
        level: ability.level,
        canCast: ability.can_cast ?? false,
        passive: ability.passive ?? false,
        active: ability.ability_active ?? false,
        cooldown: ability.cooldown || 0,
        ultimate: ability.ultimate ?? false,
        charges: ability.charges,
        maxCharges: ability.max_charges,
      });
    }

    return result;
  }

  /**
   * Get ability ID from name
   * TODO: Import ability constants for proper mapping
   */
  private static getAbilityId(name: string): number {
    // Placeholder - will be implemented with constants
    return 0;
  }

  /**
   * Normalize items from slot-based to array format
   */
  private static normalizeItems(items: Record<string, GsiItem>): LiveItem[] {
    const result: LiveItem[] = [];

    // Inventory slots (0-5)
    for (let i = 0; i <= 5; i++) {
      const key = `slot${i}`;
      const item = items[key];

      if (item && item.name !== 'empty') {
        result.push(this.createLiveItem(item, i, 'inventory'));
      }
    }

    // Stash slots (0-5)
    for (let i = 0; i <= 5; i++) {
      const key = `stash${i}`;
      const item = items[key];

      if (item && item.name !== 'empty') {
        result.push(this.createLiveItem(item, i, 'stash'));
      }
    }

    // Teleport slot
    if (items.teleport0 && items.teleport0.name !== 'empty') {
      result.push(this.createLiveItem(items.teleport0, 0, 'teleport'));
    }

    // Neutral slot
    if (items.neutral0 && items.neutral0.name !== 'empty') {
      result.push(this.createLiveItem(items.neutral0, 0, 'neutral'));
    }

    return result;
  }

  /**
   * Create a LiveItem from GsiItem
   */
  private static createLiveItem(
    item: GsiItem,
    slot: number,
    location: LiveItem['location']
  ): LiveItem {
    const name = this.removeItemPrefix(item.name);

    return {
      slot,
      id: this.getItemId(name), // Placeholder for now
      name,
      displayName: this.getItemDisplayName(name),
      canCast: item.can_cast ?? false,
      cooldown: item.cooldown || 0,
      passive: item.passive ?? false,
      charges: item.charges || 0,
      location,
    };
  }

  /**
   * Remove "item_" prefix from item name
   */
  private static removeItemPrefix(name: string): string {
    return name.replace(/^item_/, '');
  }

  /**
   * Get item ID from name
   * TODO: Import item constants for proper mapping
   */
  private static getItemId(name: string): number {
    // Placeholder - will be implemented with constants
    return 0;
  }

  /**
   * Get display name from item name
   * TODO: Import item constants for proper mapping
   */
  private static getItemDisplayName(name: string): string {
    // Convert snake_case to Title Case
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Calculate draft hints from draft data
   */
  private static calculateDraftHints(
    draft: NonNullable<GsiPayload['draft']>,
    playerTeam: 'radiant' | 'dire'
  ): DraftHints {
    // team2 = radiant, team3 = dire
    const allyTeamKey = playerTeam === 'radiant' ? 'team2' : 'team3';
    const enemyTeamKey = playerTeam === 'radiant' ? 'team3' : 'team2';

    const enemyHeroes = this.extractHeroIds(draft[enemyTeamKey]);
    const allyHeroes = this.extractHeroIds(draft[allyTeamKey]);

    // TODO: Implement actual hero ability analysis
    // For now, return placeholder data
    const enemySilences = 0;
    const enemyStuns = 0;
    const enemyBreaks = 0;
    const enemyDispels = 0;
    const enemyInvisibility = 0;

    return {
      enemyHeroes,
      allyHeroes,
      enemySilences,
      enemyStuns,
      enemyBreaks,
      enemyDispels,
      enemyInvisibility,
      needBkb: enemySilences + enemyStuns >= 3,
      needLinken: false, // TODO: Implement targeted disable detection
      needMkb: false, // TODO: Implement evasion detection
    };
  }

  /**
   * Extract hero IDs from team draft data
   */
  private static extractHeroIds(team: any): number[] {
    if (!team) return [];

    const ids: number[] = [];

    for (let i = 0; i <= 4; i++) {
      const idKey = `pick${i}_id`;
      const id = team[idKey];

      if (id && id !== 0) {
        ids.push(id);
      }
    }

    return ids;
  }

  /**
   * Compute SHA256 hash of a snapshot for deduplication
   */
  static computeSnapshotHash(snapshot: LiveSnapshot): string {
    // Create a stable string representation
    const stable = JSON.stringify(snapshot, Object.keys(snapshot).sort());
    return crypto.createHash('sha256').update(stable).digest('hex');
  }

  /**
   * Check if a payload is just a heartbeat (no game data)
   */
  static isHeartbeat(payload: GsiPayload): boolean {
    return !payload.map?.matchid;
  }
}
