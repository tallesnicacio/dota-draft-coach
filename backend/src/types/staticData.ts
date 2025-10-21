/**
 * Types for Static Dota 2 Data
 *
 * Based on dotaconstants (https://github.com/odota/dotaconstants)
 * Data structure for heroes, items, and abilities loaded from JSON files.
 */

// ============================================
// HERO TYPES
// ============================================

export type HeroAttribute = 'str' | 'agi' | 'int' | 'all';
export type AttackType = 'Melee' | 'Ranged';
export type HeroRole =
  | 'Carry'
  | 'Support'
  | 'Nuker'
  | 'Disabler'
  | 'Jungler'
  | 'Durable'
  | 'Escape'
  | 'Pusher'
  | 'Initiator';

export interface StaticHero {
  id: number;
  name: string; // e.g., "npc_dota_hero_antimage"
  localized_name: string; // e.g., "Anti-Mage"
  primary_attr: HeroAttribute;
  attack_type: AttackType;
  roles: HeroRole[];

  // Images
  img: string;
  icon: string;

  // Base stats
  base_health: number;
  base_health_regen?: number;
  base_mana: number;
  base_mana_regen?: number;
  base_armor: number;
  base_mr: number; // Magic resistance
  base_attack_min: number;
  base_attack_max: number;
  base_str: number;
  base_agi: number;
  base_int: number;

  // Stat gains
  str_gain: number;
  agi_gain: number;
  int_gain: number;

  // Additional stats
  attack_range?: number;
  projectile_speed?: number;
  attack_rate?: number;
  base_attack_time?: number;
  attack_point?: number;
  move_speed?: number;

  // Complexity
  complexity?: number;

  // Legs (for movement type)
  legs?: number;

  // Turbo stats
  turbo_picks?: number;
  turbo_wins?: number;

  // Hero number
  hero_id?: number;

  // Pro stats
  pro_ban?: number;
  pro_win?: number;
  pro_pick?: number;

  // Pub stats
  '1_pick'?: number;
  '1_win'?: number;
  '2_pick'?: number;
  '2_win'?: number;
  '3_pick'?: number;
  '3_win'?: number;
  '4_pick'?: number;
  '4_win'?: number;
  '5_pick'?: number;
  '5_win'?: number;
  '6_pick'?: number;
  '6_win'?: number;
  '7_pick'?: number;
  '7_win'?: number;
  '8_pick'?: number;
  '8_win'?: number;
}

export interface HeroesData {
  [heroId: string]: StaticHero;
}

// ============================================
// ITEM TYPES
// ============================================

export type ItemQuality =
  | 'component'
  | 'common'
  | 'rare'
  | 'epic'
  | 'artifact'
  | 'secret_shop'
  | 'consumable';

export interface ItemAbility {
  type: 'active' | 'passive' | 'aura' | 'toggle';
  title: string;
  description: string;
}

export interface ItemAttribute {
  key: string;
  value: string | number;
  display?: string;
}

export interface StaticItem {
  id: number;
  name?: string; // Internal name (key in the object)
  img: string;
  dname: string; // Display name
  qual: ItemQuality;
  cost: number;

  // Behavior and targeting
  behavior?: string | string[];
  target_team?: string;
  target_type?: string;

  // Descriptions
  desc?: string;
  notes?: string;
  lore?: string;

  // Abilities
  abilities?: ItemAbility[];
  hint?: string[];

  // Attributes (bonuses)
  attrib?: ItemAttribute[];

  // Components and upgrades
  components?: string[] | null;
  created?: boolean;

  // Cooldown and mana
  mc?: number | boolean; // Mana cost
  cd?: number | boolean; // Cooldown

  // Charges
  charges?: number;

  // Tier
  tier?: number;
}

export interface ItemsData {
  [itemKey: string]: StaticItem;
}

// ============================================
// ABILITY TYPES
// ============================================

export type AbilityBehavior =
  | 'DOTA_ABILITY_BEHAVIOR_UNIT_TARGET'
  | 'DOTA_ABILITY_BEHAVIOR_POINT'
  | 'DOTA_ABILITY_BEHAVIOR_NO_TARGET'
  | 'DOTA_ABILITY_BEHAVIOR_PASSIVE'
  | 'DOTA_ABILITY_BEHAVIOR_CHANNELLED'
  | 'DOTA_ABILITY_BEHAVIOR_TOGGLE'
  | 'DOTA_ABILITY_BEHAVIOR_AURA'
  | 'DOTA_ABILITY_BEHAVIOR_AUTOCAST'
  | 'DOTA_ABILITY_BEHAVIOR_AOE'
  | 'DOTA_ABILITY_BEHAVIOR_HIDDEN';

export interface AbilityAttribute {
  key: string;
  header?: string;
  value: string | number | (string | number)[];
  footer?: string;
  generated?: boolean;
}

export interface StaticAbility {
  dname: string; // Display name
  desc?: string; // Description
  lore?: string; // Lore text
  notes?: string[]; // Notes
  dmg_type?: string; // Damage type
  bkbpierce?: string; // BKB pierce type
  img?: string; // Image path

  // Behavior
  behavior?: AbilityBehavior | AbilityBehavior[] | string;
  target_team?: string;
  target_type?: string;

  // Stats
  mc?: number | number[] | boolean; // Mana cost
  cd?: number | number[] | boolean; // Cooldown

  // Attributes (per level)
  attrib?: AbilityAttribute[];

  // Special attributes
  cmb?: string[]; // Can be used by
  hurl?: string; // Projectile
}

export interface AbilitiesData {
  [abilityKey: string]: StaticAbility;
}

// ============================================
// HERO ABILITIES MAPPING
// ============================================

export interface HeroAbilities {
  abilities: string[]; // Ability keys
  talents: { name: string; level: number }[];
}

export interface HeroAbilitiesData {
  [heroName: string]: HeroAbilities;
}

// ============================================
// ITEM IDS MAPPING
// ============================================

export interface ItemIdsData {
  [itemId: string]: string; // id -> item key
}

// ============================================
// COMPLETE STATIC DATA
// ============================================

export interface StaticData {
  heroes: HeroesData;
  items: ItemsData;
  abilities: AbilitiesData;
  heroAbilities: HeroAbilitiesData;
  itemIds: ItemIdsData;
  patchVersion: string;
}
