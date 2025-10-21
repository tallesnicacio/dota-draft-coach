import express from 'express';
import { DraftAnalyzer } from '../services/draftAnalyzer.js';
import { OpenDotaAdapter } from '../adapters/OpenDotaAdapter.js';
import { cacheManager } from '../cache/CacheManager.js';
import pino from 'pino';

const router = express.Router();
const logger = pino({ name: 'draft-routes' });
const draftAnalyzer = new DraftAnalyzer();
const adapter = new OpenDotaAdapter();

/**
 * POST /api/draft/analyze
 * Analisa draft atual e retorna sugestões de picks e bans
 *
 * Body:
 * {
 *   allyPicks: number[],      // IDs dos heróis aliados pickados
 *   enemyPicks: number[],     // IDs dos heróis inimigos pickados
 *   allyBans: number[],       // IDs dos heróis que seu time baniu
 *   enemyBans: number[],      // IDs dos heróis que time inimigo baniu
 *   patch?: string,           // Patch para análise (default: 7.39e)
 *   mmr?: number              // MMR para análise (default: 3000)
 * }
 */
router.post('/analyze', async (req, res) => {
  try {
    const {
      allyPicks = [],
      enemyPicks = [],
      allyBans = [],
      enemyBans = [],
      patch = '7.39e',
      mmr = 3000,
    } = req.body;

    logger.info('Draft analysis requested', {
      allyPicks,
      enemyPicks,
      allyBans,
      enemyBans,
      patch,
      mmr,
    });

    // Validar input
    if (!Array.isArray(allyPicks) || !Array.isArray(enemyPicks)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'allyPicks and enemyPicks must be arrays',
      });
    }

    // Buscar dados de todos os heróis relevantes
    const allHeroIds = [
      ...new Set([...allyPicks, ...enemyPicks, ...allyBans, ...enemyBans]),
    ];

    // Buscar lista de todos os heróis para sugestões (com cache)
    const cacheKey = 'heroes:all';
    let allHeroes = cacheManager.get(cacheKey);
    if (!allHeroes) {
      allHeroes = await adapter.getHeroes();
      cacheManager.set(cacheKey, allHeroes, 86400); // Cache por 24h
    }

    // Criar mapa com dados de matchup para cada herói
    const heroesData = new Map();

    // Para cada herói, buscar dados completos incluindo matchups
    for (const hero of allHeroes) {
      try {
        const heroCacheKey = cacheManager.generateKey(hero.id, patch, mmr);
        let heroData = cacheManager.get(heroCacheKey);

        if (!heroData) {
          heroData = await adapter.getHeroData(hero.id, patch, mmr);
          cacheManager.set(heroCacheKey, heroData);
        }

        heroesData.set(hero.id, {
          heroId: hero.id,
          heroName: hero.displayName || hero.localized_name || hero.name,
          winRate: heroData.winRate || 0.50,
          matchups: heroData.matchups?.counters || [],
          roles: hero.roles || [],
        });
      } catch (error) {
        // Se falhar em buscar dados de um herói, usar dados base
        logger.warn({ heroId: hero.id, error }, 'Failed to fetch hero data');
        heroesData.set(hero.id, {
          heroId: hero.id,
          heroName: hero.displayName || hero.localized_name || hero.name,
          winRate: 0.50,
          matchups: [],
          roles: hero.roles || [],
        });
      }
    }

    // Executar análise
    const analysis = await draftAnalyzer.analyzeDraft(
      allyPicks,
      enemyPicks,
      allyBans,
      enemyBans,
      heroesData
    );

    logger.info('Draft analysis completed', {
      picksCount: analysis.suggestedPicks.length,
      bansCount: analysis.suggestedBans.length,
      missingRoles: analysis.teamComposition.missingRoles,
    });

    res.json(analysis);
  } catch (error) {
    logger.error({ error }, 'Error analyzing draft');
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/draft/health
 * Health check para o draft analyzer
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'draft-analyzer',
    timestamp: new Date().toISOString(),
  });
});

export default router;
