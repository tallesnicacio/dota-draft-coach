import { HeroData, DraftContext, ItemRecommendation, CoreBuild } from '../types/index.js';
import { ITEM_TAGS } from '../utils/items.js';

export class RecommendationEngine {
  /**
   * Ajusta recomendações de itens baseado no draft context
   */
  adjustRecommendations(heroData: HeroData, context: DraftContext): HeroData {
    const modifiedBuild = this.modifyBuildForDraft(heroData.coreBuild, context);

    return {
      ...heroData,
      coreBuild: modifiedBuild,
    };
  }

  /**
   * Modifica a build baseado em aliados e inimigos
   */
  private modifyBuildForDraft(build: CoreBuild, context: DraftContext): CoreBuild {
    // Analisar composição inimiga
    const enemyAnalysis = this.analyzeEnemyComposition(context.enemies);
    const allyAnalysis = this.analyzeAllyComposition(context.allies);

    // Aplicar modificadores a cada fase
    return {
      starting: build.starting,
      early: this.applyContextToItems(build.early, enemyAnalysis, allyAnalysis),
      mid: this.applyContextToItems(build.mid, enemyAnalysis, allyAnalysis),
      situational: this.generateSituationalItems(enemyAnalysis, allyAnalysis),
      luxury: this.applyContextToItems(build.luxury, enemyAnalysis, allyAnalysis),
    };
  }

  /**
   * Analisa composição inimiga e identifica necessidades
   */
  private analyzeEnemyComposition(enemies: number[]) {
    // Heurísticas simplificadas baseadas em IDs comuns
    // Em produção, buscar dados reais dos heróis
    return {
      hasHeavyMagic: enemies.length > 2, // Simplificado
      hasHeavyPhysical: enemies.length > 1,
      hasSilences: enemies.some(id => [11, 5, 106].includes(id)), // Anti-Mage, Bloodseeker, Silencer
      hasStuns: enemies.length > 2,
      needsArmorReduction: enemies.some(id => [1, 8, 23].includes(id)), // Tanques
    };
  }

  /**
   * Analisa composição aliada
   */
  private analyzeAllyComposition(allies: number[]) {
    return {
      hasPhysicalDamage: allies.length > 1,
      hasMagicDamage: allies.length > 1,
      needsInitiation: allies.length < 3,
    };
  }

  /**
   * Aplica contexto aos itens, ajustando prioridades
   */
  private applyContextToItems(
    items: ItemRecommendation[],
    enemyAnalysis: any,
    allyAnalysis: any
  ): ItemRecommendation[] {
    return items.map(item => {
      let priorityBonus = 0;
      let reasoning = item.reasoning || '';
      const tags = ITEM_TAGS[item.itemName.toLowerCase().replace(/['\s]/g, '_')] || {};

      // BKB contra muito magic
      if (tags.magicImmunity && enemyAnalysis.hasHeavyMagic) {
        priorityBonus += 0.15;
        reasoning = 'Priorizado: inimigos com muito dano mágico';
      }

      // Silence contra inimigos com silences/stuns
      if (tags.silence && enemyAnalysis.hasSilences) {
        priorityBonus += 0.10;
        reasoning = 'Importante: neutralizar silences inimigos';
      }

      // Mobility para engajamento
      if (tags.mobility && allyAnalysis.needsInitiation) {
        priorityBonus += 0.08;
        reasoning = 'Útil: time precisa de iniciação';
      }

      return {
        ...item,
        priority: Math.min(1, item.priority + priorityBonus),
        reasoning,
      };
    }).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Gera itens situacionais baseado no contexto
   */
  private generateSituationalItems(
    enemyAnalysis: any,
    allyAnalysis: any
  ): ItemRecommendation[] {
    const situational: ItemRecommendation[] = [];

    if (enemyAnalysis.hasHeavyMagic) {
      situational.push({
        itemId: 63,
        itemName: 'Black King Bar',
        priority: 0.9,
        reasoning: 'Essencial contra composição mágica pesada',
      });
    }

    if (enemyAnalysis.hasSilences) {
      situational.push({
        itemId: 110,
        itemName: "Linken's Sphere",
        priority: 0.85,
        reasoning: 'Proteção contra silences/stuns direcionados',
      });
    }

    if (enemyAnalysis.needsArmorReduction) {
      situational.push({
        itemId: 134,
        itemName: 'Silver Edge',
        priority: 0.8,
        reasoning: 'Redução de armadura e break passivos',
      });
    }

    if (allyAnalysis.hasPhysicalDamage) {
      situational.push({
        itemId: 143,
        itemName: 'Aeon Disk',
        priority: 0.75,
        reasoning: 'Sinergia com dano físico do time',
      });
    }

    return situational.slice(0, 5);
  }

  /**
   * Gera explicação textual das recomendações
   */
  generateExplanation(heroData: HeroData, context: DraftContext): string {
    const parts: string[] = [];

    parts.push(`Build para ${heroData.hero} (Patch ${heroData.patch}, ~${heroData.mmr} MMR)`);
    parts.push(`Confiança: ${(heroData.indicators.confidence * 100).toFixed(0)}%`);

    if (context.enemies.length > 0) {
      parts.push(`\nAjustes para ${context.enemies.length} inimigos selecionados.`);
    }

    if (context.allies.length > 0) {
      parts.push(`Considerando ${context.allies.length} aliados no time.`);
    }

    return parts.join(' ');
  }
}

export const recommendationEngine = new RecommendationEngine();
