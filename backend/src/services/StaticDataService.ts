/**
 * StaticDataService - Loads and manages static Dota 2 data
 *
 * Singleton service that loads heroes, items, abilities from JSON files
 * and provides efficient access methods with caching.
 *
 * Usage:
 *   const data = StaticDataService.getInstance();
 *   await data.load();
 *   const hero = data.getHeroById(1); // Anti-Mage
 *   const item = data.getItemByKey('blink'); // Blink Dagger
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import type {
  StaticData,
  HeroesData,
  ItemsData,
  AbilitiesData,
  HeroAbilitiesData,
  ItemIdsData,
  StaticHero,
  StaticItem,
  StaticAbility,
} from '../types/staticData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StaticDataService {
  private static instance: StaticDataService | null = null;

  private data: StaticData | null = null;
  private loaded = false;
  private loading = false;

  // Default patch version (can be overridden)
  private patchVersion: string;
  private dataPath: string;

  private constructor(patchVersion: string = '7.39e') {
    this.patchVersion = patchVersion;
    this.dataPath = path.join(__dirname, '../../data', `patch-${patchVersion}`);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(patchVersion?: string): StaticDataService {
    if (!StaticDataService.instance) {
      StaticDataService.instance = new StaticDataService(patchVersion);
    }
    return StaticDataService.instance;
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    StaticDataService.instance = null;
  }

  /**
   * Load all static data from JSON files
   */
  public async load(): Promise<void> {
    if (this.loaded) {
      logger.info('Static data already loaded');
      return;
    }

    if (this.loading) {
      logger.info('Static data is already loading, waiting...');
      // Wait for loading to complete
      while (this.loading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    this.loading = true;

    try {
      logger.info({ patch: this.patchVersion, path: this.dataPath }, 'Loading static data...');

      const startTime = Date.now();

      // Load all JSON files in parallel
      const [heroes, items, abilities, heroAbilities, itemIds] = await Promise.all([
        this.loadJSON<HeroesData>('heroes.json'),
        this.loadJSON<ItemsData>('items.json'),
        this.loadJSON<AbilitiesData>('abilities.json'),
        this.loadJSON<HeroAbilitiesData>('hero_abilities.json'),
        this.loadJSON<ItemIdsData>('item_ids.json'),
      ]);

      // Store data
      this.data = {
        heroes,
        items,
        abilities,
        heroAbilities,
        itemIds,
        patchVersion: this.patchVersion,
      };

      const loadTime = Date.now() - startTime;

      logger.info(
        {
          patch: this.patchVersion,
          heroCount: Object.keys(heroes).length,
          itemCount: Object.keys(items).length,
          abilityCount: Object.keys(abilities).length,
          loadTimeMs: loadTime,
        },
        'Static data loaded successfully'
      );

      this.loaded = true;
    } catch (error) {
      logger.error({ error, patch: this.patchVersion }, 'Failed to load static data');
      throw new Error(`Failed to load static data: ${error}`);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Helper to load a JSON file
   */
  private async loadJSON<T>(filename: string): Promise<T> {
    const filePath = path.join(this.dataPath, filename);
    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      logger.error({ error, filePath }, `Failed to load ${filename}`);
      throw new Error(`Failed to load ${filename}: ${error}`);
    }
  }

  /**
   * Ensure data is loaded
   */
  private ensureLoaded(): void {
    if (!this.loaded || !this.data) {
      throw new Error('Static data not loaded. Call load() first.');
    }
  }

  // ============================================
  // HERO METHODS
  // ============================================

  /**
   * Get all heroes
   */
  public getHeroes(): HeroesData {
    this.ensureLoaded();
    return this.data!.heroes;
  }

  /**
   * Get hero by ID
   */
  public getHeroById(id: number): StaticHero | null {
    this.ensureLoaded();
    return this.data!.heroes[id.toString()] || null;
  }

  /**
   * Get hero by name (e.g., "npc_dota_hero_antimage")
   */
  public getHeroByName(name: string): StaticHero | null {
    this.ensureLoaded();
    const heroes = Object.values(this.data!.heroes);
    return heroes.find((hero) => hero.name === name) || null;
  }

  /**
   * Get hero by localized name (e.g., "Anti-Mage")
   */
  public getHeroByLocalizedName(localizedName: string): StaticHero | null {
    this.ensureLoaded();
    const heroes = Object.values(this.data!.heroes);
    return (
      heroes.find(
        (hero) => hero.localized_name?.toLowerCase() === localizedName.toLowerCase()
      ) || null
    );
  }

  /**
   * Get heroes by role
   */
  public getHeroesByRole(role: string): StaticHero[] {
    this.ensureLoaded();
    const heroes = Object.values(this.data!.heroes);
    return heroes.filter((hero) => hero.roles?.includes(role as any));
  }

  /**
   * Get heroes by attribute
   */
  public getHeroesByAttribute(attr: 'str' | 'agi' | 'int' | 'all'): StaticHero[] {
    this.ensureLoaded();
    const heroes = Object.values(this.data!.heroes);
    return heroes.filter((hero) => hero.primary_attr === attr);
  }

  // ============================================
  // ITEM METHODS
  // ============================================

  /**
   * Get all items
   */
  public getItems(): ItemsData {
    this.ensureLoaded();
    return this.data!.items;
  }

  /**
   * Get item by key (e.g., "blink")
   */
  public getItemByKey(key: string): StaticItem | null {
    this.ensureLoaded();
    return this.data!.items[key] || null;
  }

  /**
   * Get item by ID
   */
  public getItemById(id: number): StaticItem | null {
    this.ensureLoaded();
    const itemKey = this.data!.itemIds[id.toString()];
    if (!itemKey) return null;
    return this.getItemByKey(itemKey);
  }

  /**
   * Get item by display name (e.g., "Blink Dagger")
   */
  public getItemByDisplayName(displayName: string): StaticItem | null {
    this.ensureLoaded();
    const items = Object.values(this.data!.items);
    return items.find((item) => item.dname?.toLowerCase() === displayName.toLowerCase()) || null;
  }

  /**
   * Get items by quality (tier)
   */
  public getItemsByQuality(quality: string): StaticItem[] {
    this.ensureLoaded();
    const items = Object.values(this.data!.items);
    return items.filter((item) => item.qual === quality);
  }

  /**
   * Get items by cost range
   */
  public getItemsByCostRange(minCost: number, maxCost: number): StaticItem[] {
    this.ensureLoaded();
    const items = Object.values(this.data!.items);
    return items.filter((item) => item.cost >= minCost && item.cost <= maxCost);
  }

  // ============================================
  // ABILITY METHODS
  // ============================================

  /**
   * Get all abilities
   */
  public getAbilities(): AbilitiesData {
    this.ensureLoaded();
    return this.data!.abilities;
  }

  /**
   * Get ability by key (e.g., "antimage_mana_break")
   */
  public getAbilityByKey(key: string): StaticAbility | null {
    this.ensureLoaded();
    return this.data!.abilities[key] || null;
  }

  /**
   * Get hero abilities (abilities + talents)
   */
  public getHeroAbilities(heroName: string): string[] | null {
    this.ensureLoaded();
    const heroAbilities = this.data!.heroAbilities[heroName];
    return heroAbilities?.abilities || null;
  }

  /**
   * Get hero talents
   */
  public getHeroTalents(heroName: string): { name: string; level: number }[] | null {
    this.ensureLoaded();
    const heroAbilities = this.data!.heroAbilities[heroName];
    return heroAbilities?.talents || null;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get patch version
   */
  public getPatchVersion(): string {
    return this.patchVersion;
  }

  /**
   * Check if data is loaded
   */
  public isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get full static data object
   */
  public getData(): StaticData | null {
    return this.data;
  }

  /**
   * Search heroes by partial name
   */
  public searchHeroes(query: string): StaticHero[] {
    this.ensureLoaded();
    const lowerQuery = query.toLowerCase();
    const heroes = Object.values(this.data!.heroes);

    return heroes.filter(
      (hero) =>
        hero.localized_name?.toLowerCase().includes(lowerQuery) ||
        hero.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Search items by partial name
   */
  public searchItems(query: string): StaticItem[] {
    this.ensureLoaded();
    const lowerQuery = query.toLowerCase();
    const items = Object.values(this.data!.items);

    return items.filter((item) => item.dname?.toLowerCase().includes(lowerQuery));
  }
}

// Export singleton instance getter
export const getStaticData = () => StaticDataService.getInstance();
