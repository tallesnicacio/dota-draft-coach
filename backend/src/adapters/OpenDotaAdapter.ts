import axios, { AxiosInstance } from 'axios';
import {
  HeroData,
  OpenDotaHero,
  CoreBuild,
  SkillOrder,
  Matchups,
  Indicators,
  ItemRecommendation,
  HeroMatchup,
  TalentChoice,
} from '../types/index.js';
import { calculateConfidence, daysSinceUpdate, calculateItemPriority } from '../utils/confidence.js';
import { getItemName, ITEM_TAGS } from '../utils/items.js';

export class OpenDotaAdapter {
  private client: AxiosInstance;
  private baseURL: string;
  private apiKey?: string;
  private retryDelay = 1000;
  private maxRetries = 3;

  constructor() {
    this.baseURL = process.env.ORIGEM_OPEN_DOTA || 'https://api.opendota.com';
    this.apiKey = process.env.OPEN_DOTA_API_KEY;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      params: this.apiKey ? { api_key: this.apiKey } : {},
    });
  }

  /**
   * Fetch com retry e exponential backoff
   */
  private async fetchWithRetry<T>(url: string, retries = 0): Promise<T> {
    try {
      const response = await this.client.get<T>(url);
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        // Rate limit ou erro de servidor: retry com backoff
        if ((status === 429 || (status && status >= 500)) && retries < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retries);
          console.log(`Retrying ${url} after ${delay}ms (attempt ${retries + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.fetchWithRetry<T>(url, retries + 1);
        }
      }
      throw error;
    }
  }

  /**
   * Busca lista de heróis
   */
  async getHeroes(): Promise<OpenDotaHero[]> {
    return this.fetchWithRetry<OpenDotaHero[]>('/api/heroes');
  }

  /**
   * Busca dados completos de um herói e normaliza para o schema interno
   */
  async getHeroData(heroId: number, patch: string, mmr: number): Promise<HeroData> {
    // Buscar dados em paralelo
    const [heroes, heroStats] = await Promise.all([
      this.getHeroes(),
      this.fetchWithRetry<any>(`/api/heroes/${heroId}/itemPopularity`),
    ]);

    const hero = heroes.find(h => h.id === heroId);
    if (!hero) {
      throw new Error(`Hero ${heroId} not found`);
    }

    // Normalizar dados
    const coreBuild = this.extractCoreBuild(heroStats);
    const skillOrder = this.extractSkillOrder(hero);
    const matchups = await this.extractMatchups(heroId);
    const indicators = this.calculateIndicators(heroStats, patch);

    return {
      hero: hero.localized_name,
      heroId: hero.id,
      patch,
      mmr,
      coreBuild,
      skillOrder,
      matchups,
      indicators,
    };
  }

  /**
   * Extrai build de itens das estatísticas
   */
  private extractCoreBuild(stats: any): CoreBuild {
    const starting: ItemRecommendation[] = [];
    const early: ItemRecommendation[] = [];
    const mid: ItemRecommendation[] = [];
    const situational: ItemRecommendation[] = [];
    const luxury: ItemRecommendation[] = [];

    // Starting items
    if (stats.start_game_items) {
      const items = Object.entries(stats.start_game_items)
        .map(([itemId, count]: [string, any]) => ({
          itemId: parseInt(itemId),
          itemName: getItemName(parseInt(itemId)),
          priority: calculateItemPriority(0.5, count / 1000),
          pickRate: count / 1000,
        }))
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 6);
      starting.push(...items);
    }

    // Early game items
    if (stats.early_game_items) {
      const items = Object.entries(stats.early_game_items)
        .map(([itemId, count]: [string, any]) => ({
          itemId: parseInt(itemId),
          itemName: getItemName(parseInt(itemId)),
          priority: calculateItemPriority(0.52, count / 1000),
          pickRate: count / 1000,
        }))
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);
      early.push(...items);
    }

    // Mid game items
    if (stats.mid_game_items) {
      const items = Object.entries(stats.mid_game_items)
        .map(([itemId, count]: [string, any]) => ({
          itemId: parseInt(itemId),
          itemName: getItemName(parseInt(itemId)),
          priority: calculateItemPriority(0.53, count / 1000),
          pickRate: count / 1000,
        }))
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);
      mid.push(...items);
    }

    // Late game = luxury
    if (stats.late_game_items) {
      const items = Object.entries(stats.late_game_items)
        .map(([itemId, count]: [string, any]) => ({
          itemId: parseInt(itemId),
          itemName: getItemName(parseInt(itemId)),
          priority: calculateItemPriority(0.54, count / 1000),
          pickRate: count / 1000,
        }))
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);
      luxury.push(...items);
    }

    return { starting, early, mid, situational, luxury };
  }

  /**
   * Extrai ordem de skills (simplificado por enquanto)
   */
  private extractSkillOrder(hero: OpenDotaHero): SkillOrder {
    // Ordem genérica baseada em tipo de herói
    // Em produção, buscar de /api/heroes/{id}/matches com agregação
    const levels = [1, 1, 2, 2, 2, 3, 2, 1, 1, 4, 3, 3, 3, 4, 4];

    const talents: TalentChoice[] = [
      { level: 10, option: 'left', description: 'Talent de nível 10', pickRate: 0.6 },
      { level: 15, option: 'right', description: 'Talent de nível 15', pickRate: 0.55 },
      { level: 20, option: 'left', description: 'Talent de nível 20', pickRate: 0.52 },
      { level: 25, option: 'right', description: 'Talent de nível 25', pickRate: 0.58 },
    ];

    return {
      levels,
      talents,
      reasoning: 'Ordem padrão para ' + hero.roles.join(', '),
    };
  }

  /**
   * Extrai matchups (counters e sinergias)
   */
  private async extractMatchups(heroId: number): Promise<Matchups> {
    try {
      const matchupData = await this.fetchWithRetry<any>(`/api/heroes/${heroId}/matchups`);

      const allMatchups: HeroMatchup[] = matchupData.map((m: any) => ({
        heroId: m.hero_id,
        heroName: `Hero ${m.hero_id}`,
        advantage: (m.wins / m.games_played - 0.5) * 20, // Normalizar para -10 a +10
        sampleSize: m.games_played,
      }));

      // Ordenar e separar
      const sorted = allMatchups.sort((a, b) => a.advantage - b.advantage);

      return {
        countersToMe: sorted.slice(0, 5).map(m => ({
          ...m,
          reasoning: `${Math.abs(m.advantage).toFixed(1)}% desvantagem`,
        })),
        goodVs: sorted.slice(-5).reverse().map(m => ({
          ...m,
          reasoning: `${m.advantage.toFixed(1)}% vantagem`,
        })),
        synergies: [], // Requer análise de pares de heróis, não disponível facilmente
      };
    } catch (error) {
      console.error('Erro ao buscar matchups:', error);
      return { countersToMe: [], goodVs: [], synergies: [] };
    }
  }

  /**
   * Calcula indicadores de confiança
   */
  private calculateIndicators(stats: any, patch: string): Indicators {
    // Estimativas baseadas nos dados disponíveis
    const sampleSize = stats.games_played || 5000;
    const winRate = stats.win_rate || 0.50;
    const popularity = stats.pick_rate || 0.05;
    const lastUpdated = new Date().toISOString();
    const daysSince = daysSinceUpdate(lastUpdated);

    const confidence = calculateConfidence(
      winRate,
      popularity,
      sampleSize,
      daysSince
    );

    return {
      winRate,
      popularity,
      sampleSize,
      lastUpdated,
      confidence,
    };
  }
}
