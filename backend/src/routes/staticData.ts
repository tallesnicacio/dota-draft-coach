/**
 * Static Data API Route
 *
 * Serves static Dota 2 data (heroes, items, abilities) from local files.
 * This replaces the old OpenDota API endpoints with local data.
 */

import { Router, Request, Response } from 'express';
import { StaticDataService } from '../services/StaticDataService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Get StaticDataService instance
const staticData = StaticDataService.getInstance();

/**
 * GET /api/heroes
 *
 * Returns all heroes with basic information
 * Used for hero selection UI
 */
router.get('/heroes', (req: Request, res: Response) => {
  try {
    const heroesData = staticData.getHeroes();
    const heroes = Object.values(heroesData);

    // Transform to frontend format
    const heroesForFrontend = heroes.map((hero) => ({
      id: hero.id.toString(),
      displayName: hero.localized_name,
      name: hero.name,
      primaryAttr: hero.primary_attr,
      attackType: hero.attack_type,
      roles: hero.roles,
      image: `https://cdn.cloudflare.steamstatic.com${hero.img}`,
      icon: `https://cdn.cloudflare.steamstatic.com${hero.icon}`,
    }));

    res.json(heroesForFrontend);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to get heroes'
    );

    res.status(500).json({
      error: 'Failed to get heroes',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/heroes/:id
 *
 * Returns detailed information for a specific hero
 * Now returns static data only - no matchup stats from OpenDota
 */
router.get('/heroes/:id', (req: Request, res: Response) => {
  try {
    const heroId = parseInt(req.params.id, 10);
    const hero = staticData.getHeroById(heroId);

    if (!hero) {
      return res.status(404).json({
        error: 'Hero not found',
        message: `Hero with ID ${heroId} not found`,
      });
    }

    // Return basic hero information
    // Build recommendations will come from Live Mode + AI, not from static data
    res.json({
      id: hero.id.toString(),
      displayName: hero.localized_name,
      name: hero.name,
      primaryAttr: hero.primary_attr,
      attackType: hero.attack_type,
      roles: hero.roles,
      image: `https://cdn.cloudflare.steamstatic.com${hero.img}`,
      icon: `https://cdn.cloudflare.steamstatic.com${hero.icon}`,
      baseHealth: hero.base_health,
      baseMana: hero.base_mana,
      baseArmor: hero.base_armor,
      baseAttackMin: hero.base_attack_min,
      baseAttackMax: hero.base_attack_max,
      baseStr: hero.base_str,
      baseAgi: hero.base_agi,
      baseInt: hero.base_int,
      strGain: hero.str_gain,
      agiGain: hero.agi_gain,
      intGain: hero.int_gain,
      attackRange: hero.attack_range,
      moveSpeed: hero.move_speed,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        heroId: req.params.id,
      },
      'Failed to get hero details'
    );

    res.status(500).json({
      error: 'Failed to get hero details',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/items
 *
 * Returns all items
 */
router.get('/items', (req: Request, res: Response) => {
  try {
    const itemsData = staticData.getItems();
    const items = Object.values(itemsData);

    // Transform to frontend format
    const itemsForFrontend = items.map((item) => ({
      id: item.id.toString(),
      name: item.name,
      displayName: item.dname || item.name,
      cost: item.cost,
      image: `https://cdn.cloudflare.steamstatic.com${item.img}`,
      tier: item.tier,
      qual: item.qual,
    }));

    res.json(itemsForFrontend);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to get items'
    );

    res.status(500).json({
      error: 'Failed to get items',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
