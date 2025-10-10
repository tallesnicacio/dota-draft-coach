import { describe, it, expect } from 'vitest';
import { RecommendationEngine } from '../RecommendationEngine.js';
import { HeroData, DraftContext } from '../../types/index.js';

describe('RecommendationEngine', () => {
  const engine = new RecommendationEngine();

  const mockHeroData: HeroData = {
    hero: 'Templar Assassin',
    heroId: 46,
    patch: '7.39e',
    mmr: 3000,
    coreBuild: {
      starting: [],
      early: [
        { itemId: 1, itemName: 'Blink Dagger', priority: 0.7, pickRate: 0.8 },
      ],
      mid: [
        { itemId: 63, itemName: 'Black King Bar', priority: 0.6, pickRate: 0.5 },
      ],
      situational: [],
      luxury: [],
    },
    skillOrder: {
      levels: [1, 2, 1, 2, 1, 3, 1, 2, 2, 4],
      talents: [],
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
      lastUpdated: new Date().toISOString(),
      confidence: 0.75,
    },
  };

  describe('adjustRecommendations', () => {
    it('deve retornar hero data com build modificado', () => {
      const context: DraftContext = {
        allies: [1, 2],
        enemies: [5, 11, 106],
      };

      const result = engine.adjustRecommendations(mockHeroData, context);

      expect(result.hero).toBe(mockHeroData.hero);
      expect(result.coreBuild).toBeDefined();
      expect(result.coreBuild.situational.length).toBeGreaterThan(0);
    });

    it('deve aumentar prioridade de BKB contra muito magic', () => {
      const context: DraftContext = {
        allies: [],
        enemies: [1, 2, 3, 4], // Muitos inimigos = muito magic (heurística)
      };

      const result = engine.adjustRecommendations(mockHeroData, context);
      const bkb = result.coreBuild.mid.find(item => item.itemName === 'Black King Bar');

      // BKB deve ter prioridade aumentada ou estar em situational
      const hasBKBPriority = bkb && bkb.priority > 0.6;
      const hasBKBSituational = result.coreBuild.situational.some(
        item => item.itemName === 'Black King Bar'
      );

      expect(hasBKBPriority || hasBKBSituational).toBe(true);
    });

    it('deve gerar itens situacionais baseado em context', () => {
      const context: DraftContext = {
        allies: [1, 2],
        enemies: [5, 11], // Heróis com silences
      };

      const result = engine.adjustRecommendations(mockHeroData, context);

      expect(result.coreBuild.situational.length).toBeGreaterThan(0);
      // Deve recomendar Linken's ou BKB para counters silences
      const hasDefensiveItem = result.coreBuild.situational.some(
        item => item.itemName.includes('Sphere') || item.itemName.includes('King Bar')
      );
      expect(hasDefensiveItem).toBe(true);
    });
  });

  describe('generateExplanation', () => {
    it('deve gerar explicação com informações básicas', () => {
      const context: DraftContext = { allies: [], enemies: [] };
      const explanation = engine.generateExplanation(mockHeroData, context);

      expect(explanation).toContain('Templar Assassin');
      expect(explanation).toContain('7.39e');
      expect(explanation).toContain('3000');
    });

    it('deve mencionar ajustes de draft se houver context', () => {
      const context: DraftContext = { allies: [1, 2], enemies: [3, 4, 5] };
      const explanation = engine.generateExplanation(mockHeroData, context);

      expect(explanation).toContain('inimigos');
      expect(explanation).toContain('aliados');
    });
  });
});
