/**
 * AIRecommendationEngine - Integrates static data + GSI + OpenAI
 *
 * This is the main recommendation engine that:
 * 1. Takes LiveSnapshot from GSI
 * 2. Enriches it with StaticDataService (hero/item data)
 * 3. Calls OpenAI for intelligent analysis
 * 4. Returns structured recommendations
 *
 * Usage:
 *   const engine = AIRecommendationEngine.getInstance();
 *   const recommendations = await engine.getRecommendations(snapshot);
 */

import { StaticDataService } from './StaticDataService.js';
import { OpenAIService } from './OpenAIService.js';
import { logger } from '../utils/logger.js';
import type { LiveSnapshot } from '../gsi/types.js';
import type { StaticHero, StaticItem } from '../types/staticData.js';
import type {
  DraftAnalysisRequest,
  DraftAnalysisResponse,
  ItemRecommendationRequest,
  ItemRecommendationResponse,
} from './OpenAIService.js';

// ============================================
// TYPES
// ============================================

export interface RecommendationContext {
  snapshot: LiveSnapshot;
  myHero: StaticHero | null;
  myHeroId: number | null;
  enemyHeroes: StaticHero[];
  allyHeroes: StaticHero[];
  currentItems: StaticItem[];
  availableGold: number;
  gameTime: number;
  gameState: string;
}

export interface Recommendations {
  draftAnalysis?: DraftAnalysisResponse;
  itemRecommendation?: ItemRecommendationResponse;
  context: RecommendationContext;
  timestamp: number;
}

// ============================================
// ENGINE
// ============================================

export class AIRecommendationEngine {
  private static instance: AIRecommendationEngine | null = null;
  private staticData: StaticDataService;
  private openai: OpenAIService;

  // Cache for recommendations (avoid calling AI too frequently)
  private lastRecommendationTime: number = 0;
  private minRecommendationInterval: number = 30000; // 30 seconds

  private constructor() {
    this.staticData = StaticDataService.getInstance();
    this.openai = OpenAIService.getInstance();

    logger.info('AIRecommendationEngine initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AIRecommendationEngine {
    if (!AIRecommendationEngine.instance) {
      AIRecommendationEngine.instance = new AIRecommendationEngine();
    }
    return AIRecommendationEngine.instance;
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    AIRecommendationEngine.instance = null;
  }

  // ============================================
  // MAIN RECOMMENDATION METHOD
  // ============================================

  /**
   * Get recommendations based on current game state (LiveSnapshot)
   */
  public async getRecommendations(snapshot: LiveSnapshot): Promise<Recommendations> {
    const startTime = Date.now();

    try {
      // Build context from snapshot
      const context = await this.buildContext(snapshot);

      logger.info(
        {
          hero: context.myHero?.localized_name,
          gameTime: Math.floor(context.gameTime / 60),
          gold: context.availableGold,
          gameState: context.gameState,
        },
        'Building recommendations'
      );

      // Decide what recommendations to generate based on game state
      let draftAnalysis: DraftAnalysisResponse | undefined;
      let itemRecommendation: ItemRecommendationResponse | undefined;

      // Generate draft analysis if in hero selection or early game
      if (this.shouldAnalyzeDraft(context)) {
        draftAnalysis = await this.getDraftAnalysis(context);
      }

      // Generate item recommendations if in active game
      if (this.shouldRecommendItems(context)) {
        itemRecommendation = await this.getItemRecommendation(context);
      }

      const duration = Date.now() - startTime;
      logger.info(
        {
          hero: context.myHero?.localized_name,
          hasDraftAnalysis: !!draftAnalysis,
          hasItemRecommendation: !!itemRecommendation,
          durationMs: duration,
        },
        'Recommendations generated'
      );

      // Update last recommendation time
      this.lastRecommendationTime = Date.now();

      return {
        draftAnalysis,
        itemRecommendation,
        context,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error({ error, snapshot }, 'Failed to generate recommendations');
      throw error;
    }
  }

  // ============================================
  // CONTEXT BUILDING
  // ============================================

  /**
   * Build recommendation context from LiveSnapshot
   */
  private async buildContext(snapshot: LiveSnapshot): Promise<RecommendationContext> {
    // Ensure static data is loaded
    if (!this.staticData.isLoaded()) {
      await this.staticData.load();
    }

    // Extract my hero ID from snapshot
    const myHeroId = snapshot.hero?.id || null;
    const myHero = myHeroId ? this.staticData.getHeroById(myHeroId) : null;

    // Extract enemy heroes from draft hints
    const enemyHeroIds = snapshot.draftHints?.enemyHeroes || [];
    const enemyHeroes = enemyHeroIds
      .map((id) => this.staticData.getHeroById(id))
      .filter((h): h is StaticHero => h !== null);

    // Extract ally heroes from draft hints
    const allyHeroIds = snapshot.draftHints?.allyHeroes || [];
    const allyHeroes = allyHeroIds
      .map((id) => this.staticData.getHeroById(id))
      .filter((h): h is StaticHero => h !== null);

    // Extract current items from snapshot
    const currentItemIds = snapshot.items?.map((item) => item.id) || [];
    const currentItems = currentItemIds
      .map((id) => this.staticData.getItemById(id))
      .filter((i): i is StaticItem => i !== null);

    // Extract game state
    const availableGold = snapshot.player?.gold || 0;
    const gameTime = snapshot.map?.gameTime || 0;
    const gameState = snapshot.map?.gameState || 'UNKNOWN';

    return {
      snapshot,
      myHero,
      myHeroId,
      enemyHeroes,
      allyHeroes,
      currentItems,
      availableGold,
      gameTime,
      gameState,
    };
  }

  // ============================================
  // DECISION LOGIC
  // ============================================

  /**
   * Should we analyze draft?
   * - During hero selection
   * - Early game (first 5 minutes)
   * - When draft composition changes
   */
  private shouldAnalyzeDraft(context: RecommendationContext): boolean {
    const { gameState, gameTime } = context;

    // During hero selection phase
    if (gameState.includes('HERO_SELECTION') || gameState.includes('STRATEGY_TIME')) {
      return true;
    }

    // Early game (first 5 minutes)
    if (gameTime > 0 && gameTime < 300) {
      return true;
    }

    return false;
  }

  /**
   * Should we recommend items?
   * - During active game (not hero selection)
   * - When player has gold
   * - Not too frequently (rate limiting)
   */
  private shouldRecommendItems(context: RecommendationContext): boolean {
    const { gameState, availableGold, myHero } = context;

    // Must have a hero
    if (!myHero) {
      return false;
    }

    // Must be in active game
    if (gameState.includes('HERO_SELECTION') || gameState.includes('STRATEGY_TIME')) {
      return false;
    }

    // Must be in playing state
    if (!gameState.includes('GAME_IN_PROGRESS') && !gameState.includes('PRE_GAME')) {
      return false;
    }

    // Must have meaningful gold (at least 500)
    if (availableGold < 500) {
      return false;
    }

    // Rate limiting: don't call AI too frequently
    const timeSinceLastRecommendation = Date.now() - this.lastRecommendationTime;
    if (timeSinceLastRecommendation < this.minRecommendationInterval) {
      logger.debug(
        { timeSinceLastRecommendation, minInterval: this.minRecommendationInterval },
        'Skipping item recommendation due to rate limiting'
      );
      return false;
    }

    return true;
  }

  // ============================================
  // AI CALLS
  // ============================================

  /**
   * Get draft analysis from OpenAI
   */
  private async getDraftAnalysis(
    context: RecommendationContext
  ): Promise<DraftAnalysisResponse> {
    const request: DraftAnalysisRequest = {
      myHero: context.myHero,
      enemyHeroes: context.enemyHeroes,
      allyHeroes: context.allyHeroes,
      gameMode: 'All Pick', // TODO: Extract from GSI
    };

    return this.openai.analyzeDraft(request);
  }

  /**
   * Get item recommendation from OpenAI
   */
  private async getItemRecommendation(
    context: RecommendationContext
  ): Promise<ItemRecommendationResponse> {
    if (!context.myHero) {
      throw new Error('Cannot recommend items without hero');
    }

    const request: ItemRecommendationRequest = {
      snapshot: context.snapshot,
      myHero: context.myHero,
      enemyHeroes: context.enemyHeroes,
      allyHeroes: context.allyHeroes,
      currentItems: context.currentItems,
      availableGold: context.availableGold,
      gameTime: context.gameTime,
    };

    return this.openai.recommendItems(request);
  }

  // ============================================
  // UTILITY
  // ============================================

  /**
   * Force a recommendation (bypass rate limiting)
   */
  public async forceRecommendation(snapshot: LiveSnapshot): Promise<Recommendations> {
    this.lastRecommendationTime = 0; // Reset rate limiter
    return this.getRecommendations(snapshot);
  }

  /**
   * Set minimum recommendation interval (for testing)
   */
  public setMinRecommendationInterval(ms: number): void {
    this.minRecommendationInterval = ms;
  }
}

// Export singleton getter
export const getAIEngine = () => AIRecommendationEngine.getInstance();
