/**
 * OpenAIService - AI-powered analysis and recommendations using GPT-4 Turbo
 *
 * Provides intelligent draft analysis and item recommendations based on:
 * - Current game state (GSI data)
 * - Static Dota 2 data (heroes, items, abilities)
 * - Real-time context (gold, time, enemy composition)
 *
 * Uses GPT-4 Turbo with JSON mode for structured responses.
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import type { LiveSnapshot } from '../gsi/types.js';
import type { StaticHero, StaticItem } from '../types/staticData.js';

// ============================================
// TYPES
// ============================================

export interface DraftAnalysisRequest {
  myHero?: StaticHero | null;
  enemyHeroes: StaticHero[];
  allyHeroes: StaticHero[];
  gameMode?: string;
}

export interface DraftAnalysisResponse {
  strengths: string[];
  weaknesses: string[];
  itemPriorities: {
    item: string;
    reason: string;
    priority: 'critical' | 'high' | 'medium' | 'situational';
  }[];
  skillBuildSuggestion: string;
  playStyleTips: string[];
  threats: {
    hero: string;
    threat: string;
    counterplay: string;
  }[];
}

export interface ItemRecommendationRequest {
  snapshot: LiveSnapshot;
  myHero: StaticHero;
  enemyHeroes: StaticHero[];
  allyHeroes: StaticHero[];
  currentItems: StaticItem[];
  availableGold: number;
  gameTime: number;
}

export interface ItemRecommendationResponse {
  nextItem: {
    name: string;
    cost: number;
    reason: string;
    priority: 'core' | 'luxury' | 'situational';
  };
  alternatives: {
    name: string;
    cost: number;
    reason: string;
  }[];
  sellRecommendations: {
    item: string;
    reason: string;
  }[];
}

// ============================================
// SERVICE
// ============================================

export class OpenAIService {
  private static instance: OpenAIService | null = null;
  private client: OpenAI;
  private model: string = 'gpt-4-turbo-preview'; // Can use gpt-4-0125-preview or gpt-4-1106-preview

  private constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
    });

    logger.info({ model: this.model }, 'OpenAIService initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(apiKey?: string): OpenAIService {
    if (!OpenAIService.instance) {
      const key = apiKey || process.env.OPENAI_API_KEY;
      if (!key) {
        throw new Error('OPENAI_API_KEY not provided');
      }
      OpenAIService.instance = new OpenAIService(key);
    }
    return OpenAIService.instance;
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    OpenAIService.instance = null;
  }

  // ============================================
  // DRAFT ANALYSIS
  // ============================================

  /**
   * Analyze draft composition and provide strategic recommendations
   */
  public async analyzeDraft(request: DraftAnalysisRequest): Promise<DraftAnalysisResponse> {
    const startTime = Date.now();

    try {
      logger.info(
        {
          myHero: request.myHero?.localized_name,
          enemyCount: request.enemyHeroes.length,
          allyCount: request.allyHeroes.length,
        },
        'Analyzing draft with AI'
      );

      const prompt = this.buildDraftAnalysisPrompt(request);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a professional Dota 2 analyst with deep knowledge of hero matchups, item builds, and game strategy.
Analyze the draft composition and provide actionable recommendations in JSON format.
Be specific, practical, and focus on winning the game.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('Empty response from OpenAI');
      }

      const analysis: DraftAnalysisResponse = JSON.parse(response);

      const duration = Date.now() - startTime;
      logger.info(
        {
          hero: request.myHero?.localized_name,
          durationMs: duration,
          tokensUsed: completion.usage?.total_tokens,
        },
        'Draft analysis completed'
      );

      return analysis;
    } catch (error) {
      logger.error({ error, request }, 'Failed to analyze draft');
      throw new Error(`Draft analysis failed: ${error}`);
    }
  }

  /**
   * Build prompt for draft analysis
   */
  private buildDraftAnalysisPrompt(request: DraftAnalysisRequest): string {
    const { myHero, enemyHeroes, allyHeroes } = request;

    const myHeroName = myHero?.localized_name || 'Unknown';
    const enemyNames = enemyHeroes.map((h) => h.localized_name).join(', ');
    const allyNames = allyHeroes.map((h) => h.localized_name).join(', ');

    return `
Analyze this Dota 2 draft:

**My Hero**: ${myHeroName}
**Enemy Team**: ${enemyNames || 'Not picked yet'}
**Ally Team**: ${allyNames || 'Not picked yet'}

Provide a comprehensive analysis in the following JSON format:

{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "itemPriorities": [
    {
      "item": "Item Name",
      "reason": "Why this item is important against this draft",
      "priority": "critical" | "high" | "medium" | "situational"
    }
  ],
  "skillBuildSuggestion": "Brief skill build recommendation (e.g., 'Max Q first for lane dominance, get E at level 4 for escape')",
  "playStyleTips": ["tip 1", "tip 2", "tip 3"],
  "threats": [
    {
      "hero": "Enemy Hero Name",
      "threat": "What makes them dangerous",
      "counterplay": "How to play around them"
    }
  ]
}

Focus on:
- Item priorities that counter enemy composition
- Specific threats from enemy heroes
- Playstyle adjustments needed
- Practical tips for winning
`.trim();
  }

  // ============================================
  // ITEM RECOMMENDATIONS
  // ============================================

  /**
   * Recommend next item purchase based on current game state
   */
  public async recommendItems(
    request: ItemRecommendationRequest
  ): Promise<ItemRecommendationResponse> {
    const startTime = Date.now();

    try {
      logger.info(
        {
          hero: request.myHero.localized_name,
          gold: request.availableGold,
          gameTime: Math.floor(request.gameTime / 60),
          currentItemsCount: request.currentItems.length,
        },
        'Getting item recommendations from AI'
      );

      const prompt = this.buildItemRecommendationPrompt(request);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a professional Dota 2 coach specializing in item builds and game sense.
Recommend the next item to purchase based on current game state, gold available, and enemy composition.
Provide practical, game-winning recommendations in JSON format.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 1500,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('Empty response from OpenAI');
      }

      const recommendation: ItemRecommendationResponse = JSON.parse(response);

      const duration = Date.now() - startTime;
      logger.info(
        {
          hero: request.myHero.localized_name,
          recommendedItem: recommendation.nextItem.name,
          durationMs: duration,
          tokensUsed: completion.usage?.total_tokens,
        },
        'Item recommendation completed'
      );

      return recommendation;
    } catch (error) {
      logger.error({ error, request }, 'Failed to recommend items');
      throw new Error(`Item recommendation failed: ${error}`);
    }
  }

  /**
   * Build prompt for item recommendations
   */
  private buildItemRecommendationPrompt(request: ItemRecommendationRequest): string {
    const {
      myHero,
      enemyHeroes,
      allyHeroes,
      currentItems,
      availableGold,
      gameTime,
      snapshot,
    } = request;

    const currentItemNames = currentItems.map((i) => i.dname).join(', ');
    const enemyNames = enemyHeroes.map((h) => h.localized_name).join(', ');
    const allyNames = allyHeroes.map((h) => h.localized_name).join(', ');
    const gameTimeMinutes = Math.floor(gameTime / 60);

    // Extract player stats from snapshot
    const kda = snapshot.player
      ? `${snapshot.player.kills}/${snapshot.player.deaths}/${snapshot.player.assists}`
      : 'N/A';

    return `
Current game situation:

**Hero**: ${myHero.localized_name}
**Game Time**: ${gameTimeMinutes} minutes
**Available Gold**: ${availableGold}
**Current Items**: ${currentItemNames || 'None'}
**KDA**: ${kda}
**Enemy Team**: ${enemyNames}
**Ally Team**: ${allyNames}

Recommend the next item to purchase in the following JSON format:

{
  "nextItem": {
    "name": "Item Name",
    "cost": 1234,
    "reason": "Detailed explanation of why this item is the best choice right now",
    "priority": "core" | "luxury" | "situational"
  },
  "alternatives": [
    {
      "name": "Alternative Item Name",
      "cost": 1234,
      "reason": "When to consider this instead"
    }
  ],
  "sellRecommendations": [
    {
      "item": "Item to sell",
      "reason": "Why you should sell this now"
    }
  ]
}

Consider:
- Current gold available (recommend affordable items or components)
- Game time (early/mid/late game appropriate items)
- Enemy composition (defensive items if needed)
- Current items (don't recommend duplicates, suggest upgrades)
- Hero role (carry items for carries, support items for supports)
`.trim();
  }

  // ============================================
  // UTILITY
  // ============================================

  /**
   * Test connection to OpenAI API
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say "OK" if you can read this.' }],
        max_tokens: 10,
      });

      return response.choices[0].message.content?.includes('OK') || false;
    } catch (error) {
      logger.error({ error }, 'OpenAI connection test failed');
      return false;
    }
  }
}

// Export singleton getter
export const getOpenAI = () => OpenAIService.getInstance();
