import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiService } from '../api';
import { mockHeroes, mockBuild } from '@/test/mockData';

// Mock do fetch global
global.fetch = vi.fn();

describe('apiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getHeroes', () => {
    it('deve buscar heróis da API com sucesso', async () => {
      const mockResponse = [
        {
          id: 1,
          name: 'npc_dota_hero_antimage',
          localized_name: 'Anti-Mage',
          primary_attr: 'agi',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const heroes = await apiService.getHeroes();

      expect(fetch).toHaveBeenCalledWith('/api/heroes');
      expect(heroes).toHaveLength(1);
      expect(heroes[0].displayName).toBe('Anti-Mage');
      expect(heroes[0].primaryAttribute).toBe('agi');
    });

    it('deve salvar heróis no localStorage', async () => {
      const mockResponse = [
        {
          id: 1,
          name: 'npc_dota_hero_antimage',
          localized_name: 'Anti-Mage',
          primary_attr: 'agi',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiService.getHeroes();

      const cached = localStorage.getItem('dota2_heroes_cache');
      expect(cached).toBeTruthy();
      expect(JSON.parse(cached!)).toHaveLength(1);
    });

    it('deve usar cache quando disponível e válido', async () => {
      const cachedHeroes = JSON.stringify(mockHeroes);
      localStorage.setItem('dota2_heroes_cache', cachedHeroes);
      localStorage.setItem('dota2_heroes_cache_timestamp', Date.now().toString());

      const heroes = await apiService.getHeroes();

      expect(fetch).not.toHaveBeenCalled();
      expect(heroes).toHaveLength(3);
    });

    it('deve usar cache expirado em caso de erro na API', async () => {
      const cachedHeroes = JSON.stringify(mockHeroes);
      localStorage.setItem('dota2_heroes_cache', cachedHeroes);
      localStorage.setItem('dota2_heroes_cache_timestamp', '0'); // Expirado

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const heroes = await apiService.getHeroes();

      expect(heroes).toHaveLength(3);
      expect(heroes[0].displayName).toBe('Anti-Mage');
    });
  });

  describe('getHeroData', () => {
    it('deve buscar dados de build do herói', async () => {
      const mockBackendBuild = {
        hero: 'Anti-Mage',
        heroId: 1,
        patch: '7.39e',
        mmr: 4000,
        coreBuild: {
          starting: [{ itemId: 44, itemName: 'tango', priority: 0.9, pickRate: 0.95 }],
          early: [{ itemId: 63, itemName: 'power_treads', priority: 0.8, pickRate: 0.85 }],
          mid: [{ itemId: 147, itemName: 'manta', priority: 0.7, pickRate: 0.75 }],
          situational: [{ itemId: 139, itemName: 'butterfly', priority: 0.6, pickRate: 0.65 }],
        },
        skillOrder: {
          levels: [1, 2, 1, 3, 1, 4],
          talents: [{ level: 10, option: 'left', description: '+20 Attack Speed', pickRate: 0.6 }],
          reasoning: 'Max Q first for farming',
        },
        matchups: {
          countersToMe: [],
          goodVs: [],
          synergies: [],
        },
        indicators: {
          winRate: 0.52,
          popularity: 0.15,
          sampleSize: 5000,
          lastUpdated: '2025-01-09T12:00:00Z',
          confidence: 0.85,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendBuild,
      });

      const build = await apiService.getHeroData('1', '7.39e', 'Ancient-Divine');

      expect(fetch).toHaveBeenCalledWith('/api/heroes/1?patch=7.39e&mmr=4000');
      expect(build.hero).toBe('Anti-Mage');
      expect(build.coreBuild.starting).toContain('Tango');
      expect(build.skillOrder.sequence[0]).toBe('Q'); // level 1 = Q
      expect(build.confidence).toBe(0.85);
    });

    it('deve converter MMR bucket para valor numérico correto', async () => {
      const mockBackendBuild = {
        hero: 'Anti-Mage',
        heroId: 1,
        patch: '7.39e',
        mmr: 1000,
        coreBuild: { starting: [], early: [], mid: [], situational: [] },
        skillOrder: { levels: [], talents: [], reasoning: '' },
        matchups: { countersToMe: [], goodVs: [], synergies: [] },
        indicators: {
          winRate: 0.5,
          popularity: 0.1,
          sampleSize: 1000,
          lastUpdated: '2025-01-09T12:00:00Z',
          confidence: 0.7,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendBuild,
      });

      await apiService.getHeroData('1', '7.39e', 'Herald-Crusader');

      expect(fetch).toHaveBeenCalledWith('/api/heroes/1?patch=7.39e&mmr=1000');
    });
  });

  describe('getRecommendations', () => {
    it('deve enviar draft context ao buscar recomendações', async () => {
      const mockBackendBuild = {
        hero: 'Anti-Mage',
        heroId: 1,
        patch: '7.39e',
        mmr: 4000,
        coreBuild: { starting: [], early: [], mid: [], situational: [] },
        skillOrder: { levels: [], talents: [], reasoning: '' },
        matchups: { countersToMe: [], goodVs: [], synergies: [] },
        indicators: {
          winRate: 0.5,
          popularity: 0.1,
          sampleSize: 1000,
          lastUpdated: '2025-01-09T12:00:00Z',
          confidence: 0.7,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendBuild,
      });

      const allies = [mockHeroes[1]]; // Axe
      const enemies = [mockHeroes[2]]; // Crystal Maiden

      await apiService.getRecommendations('1', '7.39e', 'Ancient-Divine', allies, enemies);

      expect(fetch).toHaveBeenCalledWith(
        '/api/heroes/1/recommendations?patch=7.39e&mmr=4000',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            allies: [2],
            enemies: [3],
          }),
        })
      );
    });
  });

  describe('healthCheck', () => {
    it('deve retornar true quando backend está saudável', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      const isHealthy = await apiService.healthCheck();

      expect(fetch).toHaveBeenCalledWith('/health');
      expect(isHealthy).toBe(true);
    });

    it('deve retornar false quando backend está indisponível', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const isHealthy = await apiService.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });
});
