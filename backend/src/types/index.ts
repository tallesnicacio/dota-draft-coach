// Schema interno normalizado
export interface HeroData {
  hero: string;
  heroId: number;
  patch: string;
  mmr: number;
  coreBuild: CoreBuild;
  skillOrder: SkillOrder;
  matchups: Matchups;
  indicators: Indicators;
}

export interface CoreBuild {
  starting: ItemRecommendation[];
  early: ItemRecommendation[];
  mid: ItemRecommendation[];
  situational: ItemRecommendation[];
  luxury: ItemRecommendation[];
}

export interface ItemRecommendation {
  itemId: number;
  itemName: string;
  priority: number;
  reasoning?: string;
  winRate?: number;
  pickRate?: number;
}

export interface SkillOrder {
  levels: number[];
  talents: TalentChoice[];
  reasoning?: string;
}

export interface TalentChoice {
  level: number;
  option: 'left' | 'right';
  description: string;
  pickRate?: number;
}

export interface Matchups {
  countersToMe: HeroMatchup[];
  goodVs: HeroMatchup[];
  synergies: HeroMatchup[];
}

export interface HeroMatchup {
  heroId: number;
  heroName: string;
  advantage: number; // -10 a +10
  reasoning?: string;
  sampleSize?: number;
}

export interface Indicators {
  winRate: number;
  popularity: number;
  sampleSize: number;
  lastUpdated: string;
  confidence: number; // 0 a 1
}

// Draft context para modificar recomendações
export interface DraftContext {
  allies: number[]; // hero IDs
  enemies: number[]; // hero IDs
}

// Resposta da API OpenDota (parcial, apenas o que precisamos)
export interface OpenDotaHero {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: 'str' | 'agi' | 'int' | 'all';
  attack_type: 'Melee' | 'Ranged';
  roles: string[];
}

export interface OpenDotaHeroStats {
  hero_id: number;
  '1_win': number;
  '1_pick': number;
  '2_win': number;
  '2_pick': number;
  // ... outros brackets de MMR
}

export interface OpenDotaMatchup {
  hero_id: number;
  games_played: number;
  wins: number;
}

export interface OpenDotaItemPopularity {
  start_game_items: { [itemId: string]: number };
  early_game_items: { [itemId: string]: number };
  mid_game_items: { [itemId: string]: number };
  late_game_items: { [itemId: string]: number };
}

// Configuração de peso para recomendação
export interface RecommendationWeights {
  winRate: number;      // w1: 0.40
  popularity: number;   // w2: 0.25
  sampleSize: number;   // w3: 0.20
  freshness: number;    // w4: 0.15
}

export const DEFAULT_WEIGHTS: RecommendationWeights = {
  winRate: 0.40,
  popularity: 0.25,
  sampleSize: 0.20,
  freshness: 0.15,
};
