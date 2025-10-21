export interface Hero {
  id: string;
  name: string;
  displayName: string;
  image: string;
  primaryAttribute: 'str' | 'agi' | 'int' | 'universal';
}

export interface ItemBuild {
  starting: string[];
  early: string[];
  mid: string[];
  situational: string[];
}

export interface SkillOrder {
  id: string;
  name: string;
  sequence: string[];
  talents: number[];
  image: string;
  displayName: string;
}

export interface HeroSkill {
  key: string;          // Q, W, E, R
  name: string;         // Nome da skill
  description: string;  // Descrição
  image: string;        // URL da imagem
}

export interface Matchup {
  hero: string;
  heroImage: string;
  winRateDelta: number;
  note: string;
}

export interface Synergy {
  hero: string;
  heroImage: string;
  note: string;
}

export interface HeroBuild {
  hero: string;
  heroImage: string;
  patch: string;
  mmrBucket: string;
  coreBuild: ItemBuild;
  skillOrder: SkillOrder;
  matchups: {
    countersToMe: Matchup[];
    goodVs: Matchup[];
    synergies: Synergy[];
  };
  confidence: number;
  sampleSize: number;
  lastUpdated: string;
}

export type MMRBucket = 'Herald-Crusader' | 'Archon-Legend' | 'Ancient-Divine' | 'Immortal';
export type Patch = '7.39e' | '7.39d' | '7.39c' | '7.39b' | '7.39a' | '7.39' | '7.38' | '7.37';

export interface Timer {
  id: string;
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  active: boolean;
  /** Whether this timer was started automatically via Live Mode */
  automatic: boolean;
  /** Source of the timer */
  source:
    | 'manual'
    | 'live-power-rune'
    | 'live-water-rune'
    | 'live-bounty-rune'
    | 'live-tormentor'
    | 'live-outpost'
    | 'live-stack'
    | 'live-pull'
    | 'live-lotus'
    | 'live-ward'
    | 'live-roshan'
    | 'live-scan'
    | 'live-glyph';
}

// ============================================================================
// Live Mode Types (Game State Integration)
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
  name: string;
  displayName: string;
  level: number;
  canCast: boolean;
  passive: boolean;
  abilityActive: boolean;
  cooldown: number;
  ultimate: boolean;
}

export interface LiveItem {
  name: string;
  displayName: string;
  slot: number;
  canCast: boolean;
  cooldown: number;
  passive: boolean;
  charges: number;
}

export interface DraftHints {
  allies: string[];
  enemies: string[];
  hasHeavyMagic: boolean;
  hasHeavyPhysical: boolean;
  hasDisables: boolean;
  hasSilences: boolean;
  hasInvis: boolean;
  hasIllusions: boolean;
  hasSummons: boolean;
  needsBKB: boolean;
  needsDispel: boolean;
  needsDetection: boolean;
}

export type LiveStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type LiveReliability = 'high' | 'medium' | 'low' | 'unknown';
