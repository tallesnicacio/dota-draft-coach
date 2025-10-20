/**
 * Type definitions for Dota 2 Game State Integration (GSI)
 *
 * This file contains all types related to:
 * - GSI payloads (raw data from Dota 2 client)
 * - LiveSnapshot (normalized internal format)
 * - Session management
 */

// ============================================================================
// GSI Payload Types (Raw from Dota 2)
// ============================================================================

export interface GsiPayload {
  auth: {
    token: string;
  };
  provider: {
    name: string;
    appid: number;
    version: number;
    timestamp: number;
  };
  map?: {
    name?: string;
    matchid?: string;
    game_time?: number;
    clock_time?: number;
    daytime?: boolean;
    nightstalker_night?: boolean;
    game_state?: string;
    paused?: boolean;
    win_team?: string;
    customgamename?: string;
    ward_purchase_cooldown?: number;
  };
  player?: {
    steamid?: string;
    accountid?: string;
    name?: string;
    activity?: string;
    kills?: number;
    deaths?: number;
    assists?: number;
    last_hits?: number;
    denies?: number;
    kill_streak?: number;
    commands_issued?: number;
    kill_list?: Record<string, number>;
    team_name?: 'radiant' | 'dire';
    gold?: number;
    gold_reliable?: number;
    gold_unreliable?: number;
    gold_from_hero_kills?: number;
    gold_from_creep_kills?: number;
    gold_from_income?: number;
    gold_from_shared?: number;
    gpm?: number;
    xpm?: number;
  };
  hero?: {
    xpos?: number;
    ypos?: number;
    id?: number;
    name?: string;
    level?: number;
    xp?: number;
    alive?: boolean;
    respawn_seconds?: number;
    buyback_cost?: number;
    buyback_cooldown?: number;
    health?: number;
    max_health?: number;
    health_percent?: number;
    mana?: number;
    max_mana?: number;
    mana_percent?: number;
    silenced?: boolean;
    stunned?: boolean;
    disarmed?: boolean;
    magicimmune?: boolean;
    hexed?: boolean;
    muted?: boolean;
    break?: boolean;
    smoked?: boolean;
    has_debuff?: boolean;
    talent_1?: boolean;
    talent_2?: boolean;
    talent_3?: boolean;
    talent_4?: boolean;
    talent_5?: boolean;
    talent_6?: boolean;
    talent_7?: boolean;
    talent_8?: boolean;
  };
  abilities?: Record<string, GsiAbility>;
  items?: Record<string, GsiItem>;
  draft?: {
    activeteam?: number;
    pick?: boolean;
    activeteam_time_remaining?: number;
    radiant_bonus_time?: number;
    dire_bonus_time?: number;
    team2?: GsiTeamDraft;
    team3?: GsiTeamDraft;
  };
}

export interface GsiAbility {
  name: string;
  level: number;
  can_cast?: boolean;
  passive?: boolean;
  ability_active?: boolean;
  cooldown?: number;
  ultimate?: boolean;
  charges?: number;
  max_charges?: number;
}

export interface GsiItem {
  name: string;
  purchaser?: number;
  can_cast?: boolean;
  cooldown?: number;
  passive?: boolean;
  charges?: number;
}

export interface GsiTeamDraft {
  home_team?: boolean;
  pick0_id?: number;
  pick0_class?: string;
  pick1_id?: number;
  pick1_class?: string;
  pick2_id?: number;
  pick2_class?: string;
  pick3_id?: number;
  pick3_class?: string;
  pick4_id?: number;
  pick4_class?: string;
}

// ============================================================================
// LiveSnapshot Types (Normalized Internal Format)
// ============================================================================

export interface LiveSnapshot {
  /** Timestamp in milliseconds */
  t: number;
  /** Match ID (null if not in match) */
  matchId: string | null;
  /** Player information */
  player: LivePlayer | null;
  /** Map/game state */
  map: LiveMap | null;
  /** Hero state */
  hero: LiveHero | null;
  /** Abilities state */
  abilities: LiveAbility[];
  /** Items state */
  items: LiveItem[];
  /** Draft hints for recommendations */
  draftHints: DraftHints | null;
}

export interface LivePlayer {
  steamId: string;
  accountId: string;
  name: string;
  activity: string;
  teamName: 'radiant' | 'dire';
  kills: number;
  deaths: number;
  assists: number;
  lastHits: number;
  denies: number;
  gold: number;
  goldReliable: number;
  goldUnreliable: number;
  gpm: number;
  xpm: number;
}

export interface LiveMap {
  clockTime: number;
  gameTime: number;
  daytime: boolean;
  gameState: string;
  paused: boolean;
  winTeam: 'none' | 'radiant' | 'dire';
  wardPurchaseCooldown: number;
}

export interface LiveHero {
  id: number;
  name: string;
  displayName: string;
  level: number;
  xp: number;
  alive: boolean;
  respawnSeconds: number;
  buybackCost: number;
  buybackCooldown: number;
  health: number;
  maxHealth: number;
  healthPercent: number;
  mana: number;
  maxMana: number;
  manaPercent: number;
  position: {
    x: number;
    y: number;
  };
  statuses: {
    silenced: boolean;
    stunned: boolean;
    disarmed: boolean;
    magicImmune: boolean;
    hexed: boolean;
    muted: boolean;
    broken: boolean;
    smoked: boolean;
    hasDebuff: boolean;
  };
  talents: {
    '10_left': boolean;
    '10_right': boolean;
    '15_left': boolean;
    '15_right': boolean;
    '20_left': boolean;
    '20_right': boolean;
    '25_left': boolean;
    '25_right': boolean;
  };
}

export interface LiveAbility {
  slot: number;
  id: number;
  name: string;
  level: number;
  canCast: boolean;
  passive: boolean;
  active: boolean;
  cooldown: number;
  ultimate: boolean;
  charges?: number;
  maxCharges?: number;
}

export interface LiveItem {
  slot: number;
  id: number;
  name: string;
  displayName: string;
  canCast: boolean;
  cooldown: number;
  passive: boolean;
  charges: number;
  location: 'inventory' | 'stash' | 'teleport' | 'neutral';
}

export interface DraftHints {
  enemyHeroes: number[];
  allyHeroes: number[];
  enemySilences: number;
  enemyStuns: number;
  enemyBreaks: number;
  enemyDispels: number;
  enemyInvisibility: number;
  needBkb: boolean;
  needLinken: boolean;
  needMkb: boolean;
}

// ============================================================================
// Session Management Types
// ============================================================================

export interface LiveSession {
  /** Unique session ID (matchId:steamId) */
  sessionId: string;
  /** Match ID */
  matchId: string;
  /** Steam ID */
  steamId: string;
  /** Timestamp of session creation */
  createdAt: number;
  /** Timestamp of last update */
  lastUpdate: number;
  /** Hash of last snapshot (for deduplication) */
  lastSnapshotHash: string | null;
  /** Number of snapshots processed */
  snapshotCount: number;
}

export interface SessionUpdateResult {
  /** Whether to broadcast this snapshot via WS */
  broadcast: boolean;
  /** Whether this snapshot was deduplicated */
  deduplicated: boolean;
  /** Hash of the snapshot */
  snapshotHash: string;
  /** Session ID */
  sessionId: string;
}

export interface SessionMetrics {
  /** Number of active sessions */
  activeSessions: number;
  /** Total events processed */
  totalEvents: number;
  /** Number of deduplicated events */
  dedupHits: number;
  /** Deduplication ratio (0-1) */
  dedupRatio: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface GsiConfig {
  /** Auth token (must match .cfg file) */
  authToken: string;
  /** Port to listen on (default: 53000) */
  port: number;
  /** Session TTL in milliseconds (default: 5 minutes) */
  sessionTtl: number;
  /** Cleanup interval in milliseconds (default: 60 seconds) */
  cleanupInterval: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class GsiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'GsiError';
  }
}

export class AuthError extends GsiError {
  constructor(message = 'Invalid GSI auth token') {
    super(message, 'unauthorized', 401);
    this.name = 'AuthError';
  }
}

export class ValidationError extends GsiError {
  constructor(
    message: string,
    public details?: Array<{ field: string; issue: string }>
  ) {
    super(message, 'validation_error', 422);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends GsiError {
  constructor(
    message = 'Rate limit exceeded',
    public retryAfterSeconds = 1
  ) {
    super(message, 'rate_limit_exceeded', 429);
    this.name = 'RateLimitError';
  }
}
