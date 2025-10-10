import { Router, Request, Response } from 'express';
import { OpenDotaAdapter } from '../adapters/OpenDotaAdapter.js';
import { recommendationEngine } from '../adapters/RecommendationEngine.js';
import { cacheManager } from '../cache/CacheManager.js';
import { DraftContext } from '../types/index.js';

const router = Router();
const adapter = new OpenDotaAdapter();

/**
 * GET /api/heroes
 * Lista todos os heróis disponíveis
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const cacheKey = 'heroes:all';
    let heroes = cacheManager.get(cacheKey);

    if (!heroes) {
      heroes = await adapter.getHeroes();
      cacheManager.set(cacheKey, heroes, 86400); // Cache por 24h
    }

    res.json(heroes);
  } catch (error: any) {
    console.error('Erro ao buscar heróis:', error);
    res.status(500).json({
      error: 'Falha ao buscar lista de heróis',
      message: error.message,
      cached: false,
    });
  }
});

/**
 * GET /api/heroes/:heroId
 * Busca dados completos de um herói com recomendações
 */
router.get('/:heroId', async (req: Request, res: Response) => {
  try {
    const heroId = parseInt(req.params.heroId);
    const patch = (req.query.patch as string) || process.env.PATCH_PADRAO || '7.39e';
    const mmr = parseInt((req.query.mmr as string) || process.env.MMR_PADRAO || '3000');

    const cacheKey = cacheManager.generateKey(heroId, patch, mmr);
    let heroData = cacheManager.get(cacheKey);
    let fromCache = true;

    if (!heroData) {
      heroData = await adapter.getHeroData(heroId, patch, mmr);
      cacheManager.set(cacheKey, heroData);
      fromCache = false;
    }

    res.json({
      ...heroData,
      _meta: {
        cached: fromCache,
        cacheKey,
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar dados do herói:', error);

    // Tentar servir cache mesmo que expirado
    const heroId = parseInt(req.params.heroId);
    const patch = (req.query.patch as string) || process.env.PATCH_PADRAO || '7.39e';
    const mmr = parseInt((req.query.mmr as string) || process.env.MMR_PADRAO || '3000');
    const cacheKey = cacheManager.generateKey(heroId, patch, mmr);
    const staleData = cacheManager.get(cacheKey);

    if (staleData) {
      res.status(200).json({
        ...staleData,
        _meta: {
          cached: true,
          stale: true,
          warning: 'Dados em cache. API indisponível.',
        },
      });
    } else {
      res.status(503).json({
        error: 'Serviço temporariamente indisponível',
        message: error.message,
      });
    }
  }
});

/**
 * POST /api/heroes/:heroId/recommendations
 * Ajusta recomendações baseado no draft context
 */
router.post('/:heroId/recommendations', async (req: Request, res: Response) => {
  try {
    const heroId = parseInt(req.params.heroId);
    const patch = (req.query.patch as string) || process.env.PATCH_PADRAO || '7.39e';
    const mmr = parseInt((req.query.mmr as string) || process.env.MMR_PADRAO || '3000');
    const context: DraftContext = req.body;

    // Validar context
    if (!context.allies || !context.enemies) {
      return res.status(400).json({
        error: 'Context inválido',
        message: 'Campos "allies" e "enemies" são obrigatórios',
      });
    }

    // Buscar dados base do herói
    const cacheKey = cacheManager.generateKey(heroId, patch, mmr);
    let heroData = cacheManager.get(cacheKey);

    if (!heroData) {
      heroData = await adapter.getHeroData(heroId, patch, mmr);
      cacheManager.set(cacheKey, heroData);
    }

    // Aplicar recomendações contextuais
    const adjustedData = recommendationEngine.adjustRecommendations(heroData, context);
    const explanation = recommendationEngine.generateExplanation(adjustedData, context);

    res.json({
      ...adjustedData,
      explanation,
      _meta: {
        draftContext: context,
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar recomendações:', error);
    res.status(500).json({
      error: 'Falha ao gerar recomendações',
      message: error.message,
    });
  }
});

/**
 * GET /api/cache/stats
 * Retorna estatísticas do cache
 */
router.get('/cache/stats', (req: Request, res: Response) => {
  const stats = cacheManager.getStats();
  res.json(stats);
});

export default router;
