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
  sequence: string[];
  talents: number[];
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
export type Patch = '7.37' | '7.36' | '7.35';
