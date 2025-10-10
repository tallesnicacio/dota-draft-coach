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
}
