/**
 * Zod schemas for GSI payload validation
 *
 * Defines validation schemas for incoming GSI payloads from Dota 2 client.
 * Based on GsiPayload interface in gsi/types.ts
 */

import { z } from 'zod';

// ============================================================================
// Nested Object Schemas
// ============================================================================

export const gsiAuthSchema = z.object({
  token: z.string().min(1, 'Auth token is required'),
});

export const gsiProviderSchema = z.object({
  name: z.string(),
  appid: z.number(),
  version: z.number(),
  timestamp: z.number(),
});

export const gsiMapSchema = z
  .object({
    name: z.string().optional(),
    matchid: z.string().optional(),
    game_time: z.number().optional(),
    clock_time: z.number().optional(),
    daytime: z.boolean().optional(),
    nightstalker_night: z.boolean().optional(),
    game_state: z.string().optional(),
    paused: z.boolean().optional(),
    win_team: z.string().optional(),
    customgamename: z.string().optional(),
    ward_purchase_cooldown: z.number().optional(),
  })
  .optional();

export const gsiPlayerSchema = z
  .object({
    steamid: z.string().optional(),
    accountid: z.string().optional(),
    name: z.string().optional(),
    activity: z.string().optional(),
    kills: z.number().optional(),
    deaths: z.number().optional(),
    assists: z.number().optional(),
    last_hits: z.number().optional(),
    denies: z.number().optional(),
    kill_streak: z.number().optional(),
    commands_issued: z.number().optional(),
    kill_list: z.record(z.string(), z.number()).optional(),
    team_name: z.enum(['radiant', 'dire']).optional(),
    gold: z.number().optional(),
    gold_reliable: z.number().optional(),
    gold_unreliable: z.number().optional(),
    gold_from_hero_kills: z.number().optional(),
    gold_from_creep_kills: z.number().optional(),
    gold_from_income: z.number().optional(),
    gold_from_shared: z.number().optional(),
    gpm: z.number().optional(),
    xpm: z.number().optional(),
  })
  .optional();

export const gsiHeroSchema = z
  .object({
    xpos: z.number().optional(),
    ypos: z.number().optional(),
    id: z.number().optional(),
    name: z.string().optional(),
    level: z.number().optional(),
    xp: z.number().optional(),
    alive: z.boolean().optional(),
    respawn_seconds: z.number().optional(),
    buyback_cost: z.number().optional(),
    buyback_cooldown: z.number().optional(),
    health: z.number().optional(),
    max_health: z.number().optional(),
    health_percent: z.number().optional(),
    mana: z.number().optional(),
    max_mana: z.number().optional(),
    mana_percent: z.number().optional(),
    silenced: z.boolean().optional(),
    stunned: z.boolean().optional(),
    disarmed: z.boolean().optional(),
    magicimmune: z.boolean().optional(),
    hexed: z.boolean().optional(),
    muted: z.boolean().optional(),
    break: z.boolean().optional(),
    smoked: z.boolean().optional(),
    has_debuff: z.boolean().optional(),
    talent_1: z.boolean().optional(),
    talent_2: z.boolean().optional(),
    talent_3: z.boolean().optional(),
    talent_4: z.boolean().optional(),
    talent_5: z.boolean().optional(),
    talent_6: z.boolean().optional(),
    talent_7: z.boolean().optional(),
    talent_8: z.boolean().optional(),
  })
  .optional();

export const gsiAbilitySchema = z.object({
  name: z.string(),
  level: z.number(),
  can_cast: z.boolean().optional(),
  passive: z.boolean().optional(),
  ability_active: z.boolean().optional(),
  cooldown: z.number().optional(),
  ultimate: z.boolean().optional(),
  charges: z.number().optional(),
  max_charges: z.number().optional(),
});

export const gsiItemSchema = z.object({
  name: z.string(),
  purchaser: z.number().optional(),
  can_cast: z.boolean().optional(),
  cooldown: z.number().optional(),
  passive: z.boolean().optional(),
  charges: z.number().optional(),
});

export const gsiTeamDraftSchema = z
  .object({
    home_team: z.boolean().optional(),
    pick0_id: z.number().optional(),
    pick0_class: z.string().optional(),
    pick1_id: z.number().optional(),
    pick1_class: z.string().optional(),
    pick2_id: z.number().optional(),
    pick2_class: z.string().optional(),
    pick3_id: z.number().optional(),
    pick3_class: z.string().optional(),
    pick4_id: z.number().optional(),
    pick4_class: z.string().optional(),
  })
  .optional();

export const gsiDraftSchema = z
  .object({
    activeteam: z.number().optional(),
    pick: z.boolean().optional(),
    activeteam_time_remaining: z.number().optional(),
    radiant_bonus_time: z.number().optional(),
    dire_bonus_time: z.number().optional(),
    team2: gsiTeamDraftSchema,
    team3: gsiTeamDraftSchema,
  })
  .optional();

// ============================================================================
// Main GSI Payload Schema
// ============================================================================

export const gsiPayloadSchema = z.object({
  auth: gsiAuthSchema,
  provider: gsiProviderSchema,
  map: gsiMapSchema,
  player: gsiPlayerSchema,
  hero: gsiHeroSchema,
  abilities: z.record(z.string(), gsiAbilitySchema).optional(),
  items: z.record(z.string(), gsiItemSchema).optional(),
  draft: gsiDraftSchema,
});

export type GsiPayloadInput = z.infer<typeof gsiPayloadSchema>;
